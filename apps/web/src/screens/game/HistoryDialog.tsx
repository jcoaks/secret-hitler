import type { ChronicleEntry, PlayerId, PlayerView } from '@sh/engine';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { POLICY_NAME, POWER_NAME } from '../../lib/text';

/** One line of the game's public record. */
export function describeEntry(
  entry: ChronicleEntry,
  nameOf: (id: PlayerId) => string,
): { text: string; tone: 'liberal' | 'fascist' | 'neutral' } {
  switch (entry.type) {
    case 'election':
      return {
        text: `${nameOf(entry.presidentId)} nomina a ${nameOf(entry.chancellorId)}: ${entry.approved ? 'aprobado' : 'rechazado'}.`,
        tone: 'neutral',
      };
    case 'enacted':
      return {
        text: `${entry.chaos ? 'Caos: se aprueba' : 'Se aprueba'} una política ${POLICY_NAME[entry.policy]}${entry.power ? ` (${POWER_NAME[entry.power]})` : ''}.`,
        tone: entry.policy,
      };
    case 'veto':
      return {
        text: `${nameOf(entry.presidentId)} y ${nameOf(entry.chancellorId)} vetan la agenda.`,
        tone: 'neutral',
      };
    case 'veto_denied':
      return { text: `${nameOf(entry.presidentId)} rechaza el veto.`, tone: 'neutral' };
    case 'investigate':
      return {
        text: `${nameOf(entry.presidentId)} investiga a ${nameOf(entry.targetId)}.`,
        tone: 'neutral',
      };
    case 'peek':
      return {
        text: `${nameOf(entry.presidentId)} espía las próximas políticas.`,
        tone: 'neutral',
      };
    case 'special_election':
      return {
        text: `${nameOf(entry.presidentId)} convoca una elección especial: ${nameOf(entry.targetId)}.`,
        tone: 'neutral',
      };
    case 'execution':
      return {
        text: `${nameOf(entry.presidentId)} ejecuta a ${nameOf(entry.targetId)}.`,
        tone: 'fascist',
      };
    case 'reshuffle':
      return { text: 'Se barajan los descartes en el mazo.', tone: 'neutral' };
  }
}

/** Every government, vote and policy so far, newest first. */
export function HistoryDialog({
  game,
  open,
  onClose,
}: {
  game: PlayerView;
  open: boolean;
  onClose: () => void;
}) {
  const nameOf = (id: PlayerId) => game.players.find((p) => p.id === id)?.name ?? '¿?';
  const entries = game.chronicle.map((entry, index) => ({ entry, index })).reverse();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="HISTORIAL"
      width={680}
      actions={<Button onClick={onClose}>CERRAR</Button>}
    >
      {entries.length === 0 ? (
        <p className="m-0 text-text-2">Todavía no ha pasado nada.</p>
      ) : (
        <ol className="m-0 flex w-full list-none flex-col gap-2 p-0 text-left">
          {entries.map(({ entry, index }) => {
            const { text, tone } = describeEntry(entry, nameOf);
            return (
              <li
                key={index}
                className={`border-l-4 bg-white/6 px-3 py-2 text-[14px] ${
                  tone === 'liberal'
                    ? 'border-liberal'
                    : tone === 'fascist'
                      ? 'border-orange'
                      : 'border-white/20'
                }`}
              >
                <span className="mr-2 text-[12px] font-bold text-muted">Ronda {entry.round}</span>
                <span className="text-white">{text}</span>
                {entry.type === 'election' && (
                  <span className="mt-1 block text-[12px] text-text-2">
                    ¡Ja!:{' '}
                    {Object.keys(entry.votes)
                      .filter((id) => entry.votes[id])
                      .map(nameOf)
                      .join(', ') || 'nadie'}{' '}
                    · Nein:{' '}
                    {Object.keys(entry.votes)
                      .filter((id) => !entry.votes[id])
                      .map(nameOf)
                      .join(', ') || 'nadie'}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Dialog>
  );
}
