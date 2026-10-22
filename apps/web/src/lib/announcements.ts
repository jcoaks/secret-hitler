import type { ChronicleEntry, Party, PlayerId, PlayerView, Policy } from '@sh/engine';
import { knownRole } from './game';
import { POLICY_NAME, POWER_NAME } from './text';

export interface Announcement {
  title: string;
  text?: string;
  /** Ja!/Nein! shown on the player cards meanwhile. */
  votes?: Record<PlayerId, boolean>;
  policy?: Policy;
  /** Investigation result card, only for the investigator. */
  party?: Party;
  /** President and nominee shown as cards, with the roles the viewer knows. */
  government?: { presidentId: PlayerId; chancellorId: PlayerId };
  /** A line just for the viewer, e.g. that the nominee is a teammate. */
  hint?: string;
  /** Milliseconds on screen; without it the player has to dismiss it. */
  duration?: number;
}

/** Turns new chronicle entries into what the table sees, from the viewer's point of view. */
export function announcementsFor(
  entries: ChronicleEntry[],
  game: PlayerView,
  nameOf: (id: PlayerId) => string,
): Announcement[] {
  const you = game.you.id;
  const out: Announcement[] = [];
  for (const entry of entries) {
    switch (entry.type) {
      case 'election': {
        const yes = Object.values(entry.votes).filter(Boolean).length;
        const no = Object.keys(entry.votes).length - yes;
        out.push({
          title: entry.approved ? 'VOTACIÓN APROBADA' : 'VOTACIÓN RECHAZADA',
          text: entry.approved
            ? `${yes} a ${no}: ${nameOf(entry.presidentId)} y ${nameOf(entry.chancellorId)} forman gobierno.`
            : entry.tracker === 0
              ? `${yes} a ${no}. Tercer gobierno rechazado: el país cae en el caos.`
              : `${yes} a ${no}. El contador electoral avanza (${entry.tracker} de 3).`,
          votes: entry.votes,
          duration: 4500,
        });
        break;
      }
      case 'enacted':
        out.push({
          title: `POLÍTICA ${POLICY_NAME[entry.policy].toUpperCase()} APROBADA`,
          text: entry.chaos
            ? 'El pueblo, frustrado, aprueba la primera política del mazo. Se olvidan los límites de mandato.'
            : entry.power
              ? `Poder presidencial: ${POWER_NAME[entry.power]}.`
              : undefined,
          policy: entry.policy,
          duration: 3500,
        });
        break;
      case 'veto':
        out.push({
          title: 'AGENDA VETADA',
          text: `${nameOf(entry.presidentId)} y ${nameOf(entry.chancellorId)} descartaron ambas políticas. El contador electoral avanza.`,
          duration: 3500,
        });
        break;
      case 'veto_denied':
        out.push({
          title: 'VETO RECHAZADO',
          text: `${nameOf(entry.presidentId)} no aceptó el veto: el canciller debe aprobar una política.`,
          duration: 3000,
        });
        break;
      case 'investigate': {
        const result = game.you.investigations.find(
          (i) => i.round === entry.round && i.targetId === entry.targetId,
        );
        out.push(
          entry.presidentId === you && result
            ? {
                title: 'RESULTADOS DE LA INVESTIGACIÓN',
                text: `${nameOf(entry.targetId)} es del partido ${result.party === 'liberal' ? 'liberal' : 'fascista'}. Puedes contarlo… o mentir.`,
                party: result.party,
              }
            : {
                title: 'INVESTIGACIÓN',
                text: `${nameOf(entry.presidentId)} investigó a ${nameOf(entry.targetId)}.`,
                duration: 3000,
              },
        );
        break;
      }
      case 'peek':
        if (entry.presidentId !== you) {
          out.push({
            title: 'ESPIAR POLÍTICAS',
            text: `${nameOf(entry.presidentId)} vio las próximas tres políticas.`,
            duration: 3000,
          });
        }
        break;
      case 'special_election':
        out.push({
          title: 'ELECCIÓN ESPECIAL',
          text: `${nameOf(entry.presidentId)} eligió a ${nameOf(entry.targetId)} como próximo candidato a presidente.`,
          duration: 3500,
        });
        break;
      case 'execution':
        out.push(
          entry.targetId === you
            ? {
                title: 'HAS SIDO EJECUTADO',
                text: 'Los jugadores ejecutados no pueden hablar, votar ni postularse para cargos. No debes revelar tu identidad al grupo.',
              }
            : {
                title: 'EJECUCIÓN',
                text: `${nameOf(entry.presidentId)} ejecutó a ${nameOf(entry.targetId)}.${game.phase === 'game_over' ? '' : ' No era Hitler.'}`,
                duration: 3500,
              },
        );
        break;
      case 'reshuffle':
        out.push({
          title: 'SE BARAJA EL MAZO',
          text: 'Quedan menos de tres políticas: los descartes vuelven al mazo.',
          duration: 2500,
        });
        break;
    }
  }
  return out;
}

/** Identifies an open election, so its nomination is announced once. */
export function nominationKey(game: PlayerView): string | null {
  return game.phase === 'election' && game.chancellorId
    ? `${game.round}:${game.presidentId}:${game.chancellorId}`
    : null;
}

/** Who is up for a vote, before the ballot opens. Fascists are reminded who is on their team. */
export function nominationAnnouncement(
  game: PlayerView,
  nameOf: (id: PlayerId) => string,
): Announcement | null {
  const chancellorId = game.chancellorId;
  if (game.phase !== 'election' || !chancellorId) return null;
  const you = game.you.id;
  const president = nameOf(game.presidentId);
  const chancellor = nameOf(chancellorId);
  const hints: string[] = [];
  if (game.you.party === 'fascist') {
    for (const id of [game.presidentId, chancellorId]) {
      const role = id === you ? null : knownRole(game, id);
      if (role === 'hitler') hints.push(`${nameOf(id)} es Hitler.`);
      else if (role === 'fascist') hints.push(`${nameOf(id)} es fascista, de tu equipo.`);
    }
  }
  if (game.enacted.fascist >= game.board.hitlerChancellorWinsFrom) {
    hints.push(
      knownRole(game, chancellorId) === 'hitler'
        ? '¡Si sale elegido, ganan los fascistas!'
        : 'Ojo: si el canciller es Hitler y sale elegido, ganan los fascistas.',
    );
  }
  return {
    title: 'NOMINACIÓN',
    text:
      game.presidentId === you
        ? `Nominaste a ${chancellor} como canciller. Ahora vota toda la mesa.`
        : chancellorId === you
          ? `${president}, como presidente, te nomina como canciller. Ahora vota toda la mesa.`
          : `${president}, como presidente, nomina a ${chancellor} como canciller. Ahora vota toda la mesa.`,
    government: { presidentId: game.presidentId, chancellorId },
    hint: hints.length > 0 ? hints.join(' ') : undefined,
    duration: 4500,
  };
}

/** Shown once the envelope is closed: what happens next. */
export function openingAnnouncement(
  game: PlayerView,
  nameOf: (id: PlayerId) => string,
): Announcement {
  return {
    title: 'COMIENZA LA PARTIDA',
    text:
      game.presidentId === game.you.id
        ? 'Eres el primer presidente: nomina a un canciller y la mesa votará si forman gobierno.'
        : `${nameOf(game.presidentId)} es el primer presidente: nominará a un canciller y la mesa votará si forman gobierno.`,
    duration: 4000,
  };
}
