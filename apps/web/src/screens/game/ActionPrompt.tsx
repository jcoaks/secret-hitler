import type { PlayerId, PlayerView, Policy } from '@sh/engine';
import type { GameActionMessage } from '@sh/protocol';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { PlayerCard } from '../../components/game/PlayerCard';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useActions, useCanAct, useRoom } from '../../hooks';
import { art } from '../../lib/assets';
import { knownRole, mustAct } from '../../lib/game';
import { POLICY_NAME } from '../../lib/text';
import { useAnnouncing } from '../../store/ui';

/** The decision the viewer has to make right now, as the original's alert prompts. */
export function ActionPrompt() {
  const room = useRoom();
  const game = room.game;
  const announcing = useAnnouncing(game?.chronicle.length ?? 0);
  if (!game || announcing || !mustAct(game)) return null;
  // Remount per decision so selections never carry over.
  const key = `${game.round}-${game.phase}-${game.you.hand?.length ?? 0}`;
  return <Minimizable key={key} game={game} />;
}

const HideContext = createContext<() => void>(() => {});

/** The player can tuck a prompt away to look at the table, and bring it back. */
function Minimizable({ game }: { game: PlayerView }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) {
    return (
      <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
        <Button size="lg" onClick={() => setHidden(false)} className="shadow-xl">
          TU TURNO: DECIDIR
        </Button>
      </div>
    );
  }
  return (
    <HideContext.Provider value={() => setHidden(true)}>
      <Prompt game={game} />
    </HideContext.Provider>
  );
}

/** Every prompt's dialog, with a way to peek at the table behind it. */
function PromptDialog({
  title,
  width,
  children,
  actions,
}: {
  title: string;
  width: number;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const hide = useContext(HideContext);
  return (
    <Dialog
      open
      alert
      title={title}
      width={width}
      onClose={hide}
      actions={
        <>
          {actions}
          <Button variant="ghost" size="sm" onClick={hide}>
            Ver la mesa
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}

function Prompt({ game }: { game: PlayerView }) {
  switch (game.phase) {
    case 'nomination':
      return (
        <PlayerChoice
          game={game}
          title="NOMINA A UN CANCILLER"
          text="Elige a quién propones como canciller. Todos votarán tu gobierno."
          confirm="NOMINAR"
          eligible={game.eligibleChancellorIds}
          reason="Límite de mandato"
          action={(targetId) => ({ type: 'nominate', targetId })}
        />
      );
    case 'election':
      return <VotePrompt game={game} />;
    case 'legislative_president':
      return <PolicyPrompt game={game} mode="discard" />;
    case 'legislative_chancellor':
      return <PolicyPrompt game={game} mode="enact" />;
    case 'veto':
      return <VetoPrompt game={game} />;
    case 'peek':
      return <PeekPrompt game={game} />;
    case 'investigate':
      return (
        <PlayerChoice
          game={game}
          title="INVESTIGACIÓN"
          text="Elige a quién investigar. Verás su afiliación al partido (no su rol). Nadie puede ser investigado dos veces."
          confirm="INVESTIGAR"
          eligible={aliveOthers(game).filter((id) => !game.investigatedIds.includes(id))}
          reason="Ya investigado"
          action={(targetId) => ({ type: 'investigate', targetId })}
        />
      );
    case 'special_election':
      return (
        <PlayerChoice
          game={game}
          title="ELECCIÓN ESPECIAL"
          text="Elige al próximo candidato a presidente. Después, la presidencia vuelve a tu izquierda."
          confirm="ELEGIR"
          eligible={aliveOthers(game)}
          action={(targetId) => ({ type: 'special_election', targetId })}
        />
      );
    case 'execution':
      return (
        <PlayerChoice
          game={game}
          title="EJECUCIÓN"
          text="Debes ejecutar a un jugador. Si es Hitler, ganan los liberales."
          confirm="EJECUTAR"
          eligible={aliveOthers(game)}
          action={(targetId) => ({ type: 'execute', targetId })}
        />
      );
    default:
      return null;
  }
}

function aliveOthers(game: PlayerView): PlayerId[] {
  return game.players
    .map((p) => p.id)
    .filter((id) => id !== game.you.id && !game.deadIds.includes(id));
}

/** Sends an action once; the prompt stays disabled until the server's next view replaces it. */
function useSend() {
  const { act } = useActions();
  const canAct = useCanAct();
  const [sent, setSent] = useState(false);
  return {
    disabled: sent || !canAct,
    send(action: GameActionMessage) {
      if (act(action)) setSent(true);
    },
  };
}

function PlayerChoice({
  game,
  title,
  text,
  confirm,
  eligible,
  reason,
  action,
}: {
  game: PlayerView;
  title: string;
  text: string;
  confirm: string;
  eligible: PlayerId[];
  reason?: string;
  action: (targetId: PlayerId) => GameActionMessage;
}) {
  const room = useRoom();
  const { disabled, send } = useSend();
  const [selected, setSelected] = useState<PlayerId | null>(null);
  const others = game.players.filter((p) => p.id !== game.you.id);

  return (
    <PromptDialog
      title={title}
      width={760}
      actions={
        <Button
          size="lg"
          disabled={disabled || selected === null}
          onClick={() => selected && send(action(selected))}
        >
          {confirm}
        </Button>
      }
    >
      <p className="m-0 text-[16px] text-text-2">{text}</p>
      <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
        {others.map((player) => {
          const dead = game.deadIds.includes(player.id);
          const available = eligible.includes(player.id);
          return (
            <li key={player.id}>
              <PlayerCard
                name={player.name}
                portrait={room.players.find((p) => p.id === player.id)?.portrait ?? 1}
                role={knownRole(game, player.id)}
                dead={dead}
                unavailable={!dead && !available}
                unavailableReason={reason}
                selected={selected === player.id}
                onSelect={() => setSelected(player.id)}
                bot={room.players.find((p) => p.id === player.id)?.bot}
                size="sm"
              />
            </li>
          );
        })}
      </ul>
    </PromptDialog>
  );
}

function VotePrompt({ game }: { game: PlayerView }) {
  const room = useRoom();
  const { disabled, send } = useSend();
  const nameOf = (id: PlayerId | null) => room.players.find((p) => p.id === id)?.name ?? '';
  const vote = (approve: boolean) => send({ type: 'vote', approve });
  return (
    <PromptDialog title="VOTA EL GOBIERNO" width={640}>
      <p className="m-0 text-[17px] text-text-2">
        <strong className="text-orange-hover">{nameOf(game.presidentId)}</strong> como presidente y{' '}
        <strong className="text-liberal-hover">{nameOf(game.chancellorId)}</strong> como canciller.
      </p>
      {game.enacted.fascist >= game.board.hitlerChancellorWinsFrom && (
        <p className="m-0 text-[14px] font-bold text-orange-hover">
          Ya hay {game.enacted.fascist} políticas fascistas: si el canciller es Hitler, ganan los
          fascistas.
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-4">
        <VoteCard
          src={art.voteYes}
          label="¡Ja! (sí)"
          disabled={disabled}
          onClick={() => vote(true)}
        />
        <VoteCard
          src={art.voteNo}
          label="Nein (no)"
          disabled={disabled}
          onClick={() => vote(false)}
        />
      </div>
      <p className="m-0 text-[13px] text-text-2">
        Los votos se revelan cuando todos hayan votado. Un empate rechaza al gobierno.
      </p>
    </PromptDialog>
  );
}

function VoteCard(props: { src: string; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      aria-label={props.label}
      className="w-[min(220px,max(110px,24vw),30dvh)] cursor-pointer rounded-[14px] border-0 bg-transparent p-0 transition-transform hover:-translate-y-1 hover:shadow-[0_0_0_4px_var(--color-select)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <img src={props.src} alt="" className="block w-full" />
    </button>
  );
}

function PolicyCards({
  policies,
  selected,
  onSelect,
}: {
  policies: Policy[];
  selected?: number | null;
  onSelect?: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {policies.map((policy, index) => {
        const label = `Política ${POLICY_NAME[policy]}`;
        return onSelect ? (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: the hand is ordered by position
            key={index}
            type="button"
            aria-label={label}
            aria-pressed={selected === index}
            onClick={() => onSelect(index)}
            className={`w-[min(150px,max(84px,18vw),26dvh)] cursor-pointer rounded-[8%] border-0 bg-transparent p-0 transition-[transform,box-shadow] ${
              selected === index
                ? '-translate-y-2 shadow-[0_0_0_4px_var(--color-selected)]'
                : 'hover:-translate-y-1 hover:shadow-[0_0_0_4px_var(--color-select)]'
            }`}
          >
            <img src={art.policy[policy]} alt="" className="block w-full rounded-[6%]" />
          </button>
        ) : (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: the peek is ordered by position
            key={index}
            role="img"
            aria-label={label}
            className="w-[min(150px,max(84px,18vw),26dvh)]"
          >
            <img src={art.policy[policy]} alt="" className="block w-full rounded-[6%]" />
          </div>
        );
      })}
    </div>
  );
}

function PolicyPrompt({ game, mode }: { game: PlayerView; mode: 'discard' | 'enact' }) {
  const { disabled, send } = useSend();
  const [selected, setSelected] = useState<number | null>(null);
  const hand = game.you.hand ?? [];
  const canVeto = mode === 'enact' && game.vetoUnlocked && !game.vetoDenied;

  return (
    <PromptDialog
      title={mode === 'discard' ? 'SESIÓN LEGISLATIVA' : 'APRUEBA UNA POLÍTICA'}
      width={640}
      actions={
        <>
          <Button
            size="lg"
            disabled={disabled || selected === null}
            onClick={() => selected !== null && send({ type: mode, index: selected })}
          >
            {mode === 'discard' ? 'DESCARTAR' : 'APROBAR'}
          </Button>
          {canVeto && (
            <Button
              size="lg"
              variant="liberal"
              disabled={disabled}
              onClick={() => send({ type: 'propose_veto' })}
            >
              PROPONER VETO
            </Button>
          )}
        </>
      }
    >
      <p className="m-0 text-[16px] text-text-2">
        {mode === 'discard'
          ? 'Elige una política para DESCARTAR. Las otras dos pasan al canciller.'
          : 'Elige la política que se APRUEBA. La otra se descarta.'}
      </p>
      <PolicyCards policies={hand} selected={selected} onSelect={setSelected} />
      {mode === 'enact' && (
        <p className="m-0 text-[13px] text-text-2">
          {game.vetoDenied
            ? 'El presidente rechazó el veto: debes aprobar una política.'
            : game.vetoUnlocked
              ? 'Con el veto, si el presidente acepta, se descartan las dos y avanza el contador electoral.'
              : 'El poder de veto se desbloquea cuando hay 5 políticas fascistas.'}
        </p>
      )}
    </PromptDialog>
  );
}

function VetoPrompt({ game }: { game: PlayerView }) {
  const room = useRoom();
  const { disabled, send } = useSend();
  const chancellor = room.players.find((p) => p.id === game.chancellorId)?.name ?? 'El canciller';
  return (
    <PromptDialog
      title="PROPUESTA DE VETO"
      width={560}
      actions={
        <>
          <Button
            size="lg"
            variant="liberal"
            disabled={disabled}
            onClick={() => send({ type: 'answer_veto', accept: true })}
          >
            ACEPTAR VETO
          </Button>
          <Button
            size="lg"
            disabled={disabled}
            onClick={() => send({ type: 'answer_veto', accept: false })}
          >
            RECHAZAR
          </Button>
        </>
      }
    >
      <p className="m-0 text-[16px] text-text-2">
        {chancellor} quiere vetar esta agenda. Si aceptas, se descartan ambas políticas y el
        contador electoral avanza. Si no, deberá aprobar una.
      </p>
    </PromptDialog>
  );
}

function PeekPrompt({ game }: { game: PlayerView }) {
  const { disabled, send } = useSend();
  return (
    <PromptDialog
      title="ESPIAR POLÍTICAS"
      width={640}
      actions={
        <Button size="lg" disabled={disabled} onClick={() => send({ type: 'end_peek' })}>
          ENTENDIDO
        </Button>
      }
    >
      <p className="m-0 text-[16px] text-text-2">
        Estas son las próximas tres políticas del mazo, de izquierda a derecha. Solo tú las ves.
      </p>
      <PolicyCards policies={game.you.peek ?? []} />
    </PromptDialog>
  );
}
