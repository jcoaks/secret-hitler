// What bots say at the table. Like human players, liberals mostly tell the truth and fascists lie
// to cover each other; everything is decided from the bot's own view and notes.
import { type BotNotes, beliefsFor } from './bot';
import type { Random } from './random';
import type { Policy } from './rules';
import type { ChronicleEntry, PlayerId } from './types';
import type { PlayerView } from './view';

function pick<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length)] as T;
}

/** "una liberal y una fascista", "dos fascistas"… */
function describeHand(cards: Policy[]): string {
  const fascists = cards.filter((c) => c === 'fascist').length;
  if (fascists === 0) return 'dos liberales';
  if (fascists === cards.length) return 'dos fascistas';
  return 'una liberal y una fascista';
}

const MIXED: Policy[] = ['liberal', 'fascist'];
const TWO_FASCISTS: Policy[] = ['fascist', 'fascist'];

/**
 * A line for `entry`, which just happened, from the bot whose view this is; null to stay quiet.
 * `involved` lines (claims about one's own hand or investigation) are always said; comments from
 * onlookers only sometimes, so the table is not flooded.
 */
export function botRemark(
  view: PlayerView,
  notes: BotNotes,
  entry: ChronicleEntry,
  government: { presidentId: PlayerId; chancellorId: PlayerId } | null,
  random: Random,
): { text: string; involved: boolean } | null {
  const me = view.you.id;
  const role = view.you.role;
  const liberal = role === 'liberal';
  const nameOf = (id: PlayerId) => view.players.find((p) => p.id === id)?.name ?? '¿?';
  const beliefs = beliefsFor(view, notes);
  const suspicion = (id: PlayerId) => {
    const known = beliefs.known.get(id);
    if (known) return known === 'liberal' ? 5 : -5;
    return beliefs.reputation.get(id) ?? 0;
  };
  // Fascists speak as if they were liberals; they never accuse their own team.
  const teammate = (id: PlayerId) =>
    !liberal && beliefs.known.has(id) && beliefs.known.get(id) !== 'liberal';

  switch (entry.type) {
    case 'enacted': {
      if (entry.chaos) {
        return random() < 0.3
          ? {
              text: pick(
                ['El caos nunca ayuda a nadie…', 'Teníamos que ponernos de acuerdo.'],
                random,
              ),
              involved: false,
            }
          : null;
      }
      if (!government || !view.you.alive) return null;
      const { presidentId, chancellorId } = government;
      const fascist = entry.policy === 'fascist';

      if (presidentId === me) {
        const passed = notes.passed[entry.round];
        if (!passed) return null;
        // A fascist who passed two fascists claims a mixed hand: the chancellor takes the blame.
        const claim = !liberal && fascist && !teammate(chancellorId) ? MIXED : passed;
        const text =
          claim === MIXED && fascist
            ? `Le pasé una liberal y una fascista a ${nameOf(chancellorId)}. Eligió la fascista.`
            : `Le pasé ${describeHand(claim)} a ${nameOf(chancellorId)}.`;
        return { text, involved: true };
      }

      if (chancellorId === me) {
        const received = notes.received?.[entry.round];
        if (!received) return null;
        // A fascist who chose the fascist claims there was no choice.
        const claim = !liberal && fascist ? TWO_FASCISTS : received;
        const text =
          describeHand(claim) === 'dos fascistas'
            ? pick(
                [
                  `Me llegaron dos fascistas. No tuve opción.`,
                  `${nameOf(presidentId)} me pasó dos fascistas, lo juro.`,
                ],
                random,
              )
            : `${nameOf(presidentId)} me pasó ${describeHand(claim)}.`;
        return { text, involved: true };
      }

      if (fascist && random() < 0.45) {
        const suspect = [presidentId, chancellorId]
          .filter((id) => !teammate(id))
          .sort((a, b) => suspicion(a) - suspicion(b))[0];
        if (!suspect || (liberal && suspicion(suspect) > -1)) return null;
        return {
          text: pick(
            [
              `No me fío de ${nameOf(suspect)}.`,
              `¿Otra fascista? ${nameOf(suspect)} tiene algo que explicar.`,
              `Yo vigilaría a ${nameOf(suspect)}.`,
            ],
            random,
          ),
          involved: false,
        };
      }
      if (!fascist && random() < 0.15) {
        return {
          text: pick(['Bien, así sí.', 'Eso es lo que necesitamos.'], random),
          involved: false,
        };
      }
      return null;
    }

    case 'election': {
      if (entry.votes[me] !== false || random() > 0.35) return null;
      const doubtful = [entry.presidentId, entry.chancellorId]
        .filter((id) => id !== me && !teammate(id))
        .sort((a, b) => suspicion(a) - suspicion(b))[0];
      if (!doubtful) return null;
      return {
        text: pick(
          [
            `No me convence ${nameOf(doubtful)}.`,
            `Voté Nein: ${nameOf(doubtful)} no me da confianza.`,
          ],
          random,
        ),
        involved: false,
      };
    }

    case 'investigate': {
      if (entry.presidentId !== me) return null;
      const result = view.you.investigations.find((i) => i.targetId === entry.targetId);
      if (!result) return null;
      let claim = result.party;
      if (!liberal) {
        // Cover a teammate; sometimes frame a liberal.
        if (teammate(entry.targetId)) claim = 'liberal';
        else if (random() < 0.5) claim = 'fascist';
      }
      return {
        text:
          claim === 'liberal'
            ? `Investigué a ${nameOf(entry.targetId)}: es liberal.`
            : `¡Investigué a ${nameOf(entry.targetId)} y es fascista!`,
        involved: true,
      };
    }

    case 'special_election':
      return entry.presidentId === me
        ? { text: `Confío en ${nameOf(entry.targetId)}. Que presida.`, involved: true }
        : null;

    case 'execution':
      if (entry.presidentId === me && view.phase !== 'game_over') {
        return {
          text: pick([`Lo siento, ${nameOf(entry.targetId)}.`, 'Era necesario.'], random),
          involved: true,
        };
      }
      return null;

    case 'veto':
      return entry.chancellorId === me
        ? { text: 'Nada bueno en esa mano. Mejor vetarla.', involved: true }
        : null;

    default:
      return null;
  }
}
