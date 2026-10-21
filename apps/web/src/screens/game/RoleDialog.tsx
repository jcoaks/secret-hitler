import type { PlayerView } from '@sh/engine';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { art, roleCardUrl } from '../../lib/assets';
import { ROLE_GOALS, ROLE_NAME } from '../../lib/text';

const CARD_WIDTH = 'w-[clamp(150px,38vw,220px)]';

/** The secret role card, whole. */
function RoleCard({ game }: { game: PlayerView }) {
  return (
    <motion.img
      layoutId="role-card"
      src={roleCardUrl(game.you.role, game.you.id)}
      alt={`Tu rol secreto: ${ROLE_NAME[game.you.role]}`}
      className={`${CARD_WIDTH} block rounded-[5%] shadow-[0_18px_40px_rgba(0,0,0,0.55)]`}
    />
  );
}

/** Card and what the role knows and needs, side by side on wide screens. */
function RoleSheet({ game }: { game: PlayerView }) {
  const nameOf = (id: string) => game.players.find((p) => p.id === id)?.name ?? '¿?';
  const { role, knows } = game.you;
  const hitler = knows.find((k) => k.role === 'hitler');
  const fascists = knows.filter((k) => k.role === 'fascist');
  const liberal = role === 'liberal';

  return (
    <div className="flex w-full flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-7">
      <RoleCard game={game} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex flex-1 flex-col gap-3 text-left"
      >
        <p
          className={`m-0 font-display text-[40px] leading-none ${liberal ? 'text-liberal-hover' : 'text-orange-hover'}`}
        >
          {ROLE_NAME[role].toUpperCase()}
        </p>
        <p className="m-0 text-[13px] font-bold tracking-wide text-text-2 uppercase">
          Partido {liberal ? 'liberal' : 'fascista'}
        </p>
        {!liberal && (
          <p className="m-0 border-l-4 border-orange bg-white/6 px-3 py-2.5 text-[15px] leading-snug text-white">
            {role === 'fascist' && hitler && (
              <>
                <strong>Hitler</strong> es {nameOf(hitler.playerId)}.{' '}
              </>
            )}
            {fascists.length > 0 ? (
              <>
                {fascists.length === 1 ? 'El otro fascista es ' : 'Los otros fascistas son '}
                <strong>{fascists.map((k) => nameOf(k.playerId)).join(', ')}</strong>.
              </>
            ) : role === 'fascist' ? (
              'No hay más fascistas: estás solo con Hitler.'
            ) : (
              'No sabes quiénes son los fascistas, pero ellos sí saben quién eres tú.'
            )}
          </p>
        )}
        <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-snug text-text-2 marker:text-muted">
          {ROLE_GOALS[role].map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

/** The sealed envelope; once opened, the card rises out of it. */
function Envelope({ game, opening }: { game: PlayerView; opening: boolean }) {
  return (
    // The top padding leaves room inside the dialog for the card to rise into.
    <div className="w-[clamp(120px,30vw,160px)] pt-[52%]">
      <div className="relative w-full" style={{ aspectRatio: '723 / 962' }}>
        <img src={art.envelopeBack} alt="" className="absolute inset-0 w-full" />
        {opening && (
          <motion.img
            layoutId="role-card"
            src={roleCardUrl(game.you.role, game.you.id)}
            alt=""
            initial={{ y: '10%' }}
            animate={{ y: '-52%' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute top-0 left-[6%] w-[70%] rounded-[5%]"
          />
        )}
        <img
          src={art.envelopeFront}
          alt=""
          className="pointer-events-none absolute inset-0 w-full"
        />
      </div>
    </div>
  );
}

/** Shown once at the start of the game: open the envelope to see your role. */
export function RoleIntro({ game, onDone }: { game: PlayerView; onDone: () => void }) {
  const [stage, setStage] = useState<'sealed' | 'opening' | 'open'>('sealed');

  return (
    <Dialog
      open
      alert
      title="TU ROL SECRETO"
      width={stage === 'open' ? 720 : 520}
      actions={
        stage === 'open' ? (
          <Button size="lg" onClick={onDone}>
            ENTENDIDO
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={stage === 'opening'}
            onClick={() => {
              setStage('opening');
              window.setTimeout(() => setStage('open'), 750);
            }}
          >
            ABRIR SOBRE
          </Button>
        )
      }
    >
      <AnimatePresence mode="popLayout">
        {stage === 'open' ? (
          <motion.div key="sheet" className="w-full">
            <RoleSheet game={game} />
          </motion.div>
        ) : (
          <motion.div key="envelope" exit={{ opacity: 0 }} className="flex flex-col items-center">
            <Envelope game={game} opening={stage === 'opening'} />
          </motion.div>
        )}
      </AnimatePresence>
      {stage !== 'open' && (
        <p className="m-0 text-[15px] text-text-2">Asegúrate de que nadie más vea tu pantalla.</p>
      )}
    </Dialog>
  );
}

/** "Tu rol" from the header, at any point of the game. */
export function RoleDialog({
  game,
  open,
  onClose,
}: {
  game: PlayerView;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="TU ROL"
      width={720}
      actions={
        <Button size="lg" onClick={onClose}>
          CERRAR
        </Button>
      }
    >
      <RoleSheet game={game} />
    </Dialog>
  );
}
