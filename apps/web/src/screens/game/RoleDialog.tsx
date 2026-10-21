import type { PlayerView } from '@sh/engine';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { art, roleCardUrl } from '../../lib/assets';
import { ROLE_GOALS, ROLE_NAME } from '../../lib/text';

/** The sealed envelope: the role card slides out once opened. */
function Envelope({ game, open }: { game: PlayerView; open: boolean }) {
  return (
    <div className="w-[clamp(150px,32vw,230px)]">
      {/* Room above the envelope for the card to slide into. */}
      <div
        style={{ paddingTop: open ? '36%' : '0%' }}
        className="transition-[padding] duration-500"
      />
      <div className="relative w-full" style={{ aspectRatio: '723 / 962' }}>
        <img src={art.envelopeBack} alt="" className="absolute inset-0 w-full" />
        <motion.img
          src={roleCardUrl(game.you.role, game.you.id)}
          alt={open ? `Tu rol: ${ROLE_NAME[game.you.role]}` : ''}
          initial={false}
          animate={{ y: open ? '-38%' : '4%' }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
          className="absolute left-[8%] w-[66%]"
        />
        <img
          src={art.envelopeFront}
          alt=""
          className="pointer-events-none absolute inset-0 w-full"
        />
      </div>
    </div>
  );
}

function RoleDetails({ game }: { game: PlayerView }) {
  const nameOf = (id: string) => game.players.find((p) => p.id === id)?.name ?? '¿?';
  const { role, knows } = game.you;
  const hitler = knows.find((k) => k.role === 'hitler');
  const fascists = knows.filter((k) => k.role === 'fascist');
  return (
    <div className="flex flex-col gap-3 text-left">
      <p
        className={`m-0 text-center font-display text-4xl ${role === 'liberal' ? 'text-liberal-hover' : 'text-orange-hover'}`}
      >
        {ROLE_NAME[role].toUpperCase()}
      </p>
      {role !== 'liberal' && (
        <p className="m-0 rounded-md bg-white/8 px-4 py-3 text-[15px] text-white">
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
      <ul className="m-0 flex flex-col gap-2 pl-5 text-[15px] leading-snug text-text-2">
        {ROLE_GOALS[role].map((goal) => (
          <li key={goal}>{goal}</li>
        ))}
      </ul>
    </div>
  );
}

/** Shown once at the start of the game: open the envelope to see your role. */
export function RoleIntro({ game, onDone }: { game: PlayerView; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open alert title="TU ROL SECRETO" width={620}>
      <Envelope game={game} open={open} />
      {open ? (
        <>
          <RoleDetails game={game} />
          <Button size="lg" onClick={onDone}>
            ENTENDIDO
          </Button>
        </>
      ) : (
        <>
          <p className="m-0 text-[15px] text-text-2">Asegúrate de que nadie más vea tu pantalla.</p>
          <Button size="lg" onClick={() => setOpen(true)}>
            ABRIR SOBRE
          </Button>
        </>
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
    <Dialog open={open} onClose={onClose} title="TU ROL" width={620}>
      <Envelope game={game} open />
      <RoleDetails game={game} />
      <Button size="lg" onClick={onClose}>
        CERRAR
      </Button>
    </Dialog>
  );
}
