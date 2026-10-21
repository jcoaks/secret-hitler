import type { PlayerView } from '@sh/engine';
import type { RoomView } from '@sh/protocol';
import { motion } from 'motion/react';
import { useState } from 'react';
import { PlayerCard } from '../../components/game/PlayerCard';
import { Button } from '../../components/ui/Button';
import { useActions } from '../../hooks';
import { art } from '../../lib/assets';
import { WIN_TEXT } from '../../lib/text';
import { useUiStore } from '../../store/ui';

/** The victory banner with every role revealed. */
export function GameOver({ room, game }: { room: RoomView; game: PlayerView }) {
  const { send } = useActions();
  const openDialog = useUiStore((s) => s.openDialog);
  const [minimized, setMinimized] = useState(false);
  const winner = game.winner ?? 'liberal';
  const won = game.you.party === winner;

  if (minimized) {
    return (
      <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
        <Button size="lg" onClick={() => setMinimized(false)} className="shadow-xl">
          VER RESULTADO
        </Button>
      </div>
    );
  }

  return (
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-label={winner === 'liberal' ? 'Victoria liberal' : 'Victoria fascista'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 overflow-y-auto bg-ink/90 px-3 py-6"
    >
      <div className="mx-auto flex max-w-[900px] flex-col items-center gap-4 text-center">
        <img
          src={art.victory[winner].header}
          alt={winner === 'liberal' ? 'Victoria liberal' : 'Victoria fascista'}
          className="w-full max-w-[640px]"
        />
        <p className="m-0 font-display text-[clamp(26px,4.5vw,40px)] text-white">
          {game.winReason ? WIN_TEXT[game.winReason] : ''}
        </p>
        <p
          className={`m-0 text-[17px] font-bold ${won ? 'text-liberal-hover' : 'text-orange-hover'}`}
        >
          {won ? '¡Tu equipo gana!' : 'Tu equipo pierde.'}
        </p>
        <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
          {game.players.map((player) => (
            <li key={player.id}>
              <PlayerCard
                name={player.name}
                portrait={room.players.find((p) => p.id === player.id)?.portrait ?? 1}
                role={game.roles?.[player.id] ?? null}
                dead={game.deadIds.includes(player.id)}
                isYou={player.id === game.you.id}
              />
            </li>
          ))}
        </ul>
        <img src={art.victory[winner].footer} alt="" className="w-full max-w-[640px]" />
        <div className="flex flex-wrap justify-center gap-3">
          {room.you.isHost ? (
            <Button size="lg" onClick={() => send({ type: 'new_game' })}>
              VOLVER A LA SALA
            </Button>
          ) : (
            <p className="m-0 self-center text-[15px] text-text-2">
              El anfitrión puede llevar a todos de vuelta a la sala para otra partida.
            </p>
          )}
          <Button size="lg" variant="liberal" onClick={() => openDialog('history')}>
            HISTORIAL
          </Button>
          <Button variant="ghost" onClick={() => setMinimized(true)}>
            Ver el tablero
          </Button>
          <Button variant="ghost" onClick={() => openDialog('leave')}>
            Salir de la sala
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
