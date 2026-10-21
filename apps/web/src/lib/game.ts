import type { PlayerId, PlayerView, Role } from '@sh/engine';
import type { Badge } from '../components/game/PlayerCard';

/** The role (or, for an investigation, the party) the viewer knows for a player. */
export function knownRole(game: PlayerView, id: PlayerId): Role | null {
  if (game.roles) return game.roles[id] ?? null;
  if (id === game.you.id) return game.you.role;
  const known = game.you.knows.find((k) => k.playerId === id);
  if (known) return known.role;
  const investigated = game.you.investigations.find((i) => i.targetId === id);
  return investigated ? investigated.party : null;
}

/** Players the table is waiting on right now. */
export function waitingOn(game: PlayerView): PlayerId[] {
  switch (game.phase) {
    case 'election':
      return game.players
        .map((p) => p.id)
        .filter((id) => !game.deadIds.includes(id) && !game.votedPlayerIds.includes(id));
    case 'legislative_chancellor':
      return game.chancellorId ? [game.chancellorId] : [];
    case 'game_over':
      return [];
    default:
      return [game.presidentId];
  }
}

export function badgeFor(game: PlayerView, id: PlayerId): Badge | null {
  if (game.phase === 'game_over') return null;
  if (id === game.presidentId) return 'president';
  if (id === game.chancellorId) return game.phase === 'election' ? 'nominee' : 'chancellor';
  return null;
}

/** Whether the viewer has a decision to make in the current phase. */
export function mustAct(game: PlayerView): boolean {
  const me = game.you.id;
  if (!game.you.alive) return false;
  switch (game.phase) {
    case 'election':
      return !game.votedPlayerIds.includes(me);
    case 'legislative_president':
    case 'legislative_chancellor':
      return game.you.hand !== null;
    case 'game_over':
      return false;
    default:
      return game.presidentId === me;
  }
}

/** The status bar line, in the words of the original game. */
export function statusText(game: PlayerView, nameOf: (id: PlayerId | null) => string): string {
  const president = nameOf(game.presidentId);
  const chancellor = nameOf(game.chancellorId);
  const you = game.you.id;
  switch (game.phase) {
    case 'nomination':
      return game.presidentId === you
        ? 'Eres presidente: nomina a un canciller.'
        : `Esperando a que ${president} nomine un canciller.`;
    case 'election': {
      const pending = waitingOn(game).length;
      if (!game.you.alive) return `Votación: ${president} y ${chancellor} como gobierno.`;
      if (game.you.vote !== null) {
        return `Votaste ${game.you.vote ? '¡Ja!' : 'Nein'}. Faltan ${pending} ${pending === 1 ? 'voto' : 'votos'}.`;
      }
      return `Vota el gobierno de ${president} y ${chancellor}.`;
    }
    case 'legislative_president':
      return game.presidentId === you
        ? 'Elige una política para descartar.'
        : `Esperando a que ${president} descarte una política.`;
    case 'legislative_chancellor':
      return game.chancellorId === you
        ? 'Elige una política para aprobar.'
        : `Esperando a que ${chancellor} apruebe una política.`;
    case 'veto':
      return game.presidentId === you
        ? `${chancellor} propone vetar la agenda: decide.`
        : `${chancellor} propuso vetar la agenda. Esperando a que ${president} decida.`;
    case 'peek':
      return `Espiar: ${president} está viendo las próximas tres políticas.`;
    case 'investigate':
      return `Investigación: ${president} está eligiendo a quién investigar.`;
    case 'special_election':
      return `Elección especial: ${president} está eligiendo al próximo presidente.`;
    case 'execution':
      return `Ejecución: ${president} está eligiendo a quién ejecutar.`;
    case 'game_over':
      return 'La partida ha terminado.';
  }
}
