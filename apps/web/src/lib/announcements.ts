import type { ChronicleEntry, Party, PlayerId, PlayerView, Policy } from '@sh/engine';
import { POLICY_NAME, POWER_NAME } from './text';

export interface Announcement {
  title: string;
  text?: string;
  /** Ja!/Nein! shown on the player cards meanwhile. */
  votes?: Record<PlayerId, boolean>;
  policy?: Policy;
  /** Investigation result card, only for the investigator. */
  party?: Party;
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
