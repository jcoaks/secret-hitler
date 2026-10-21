import raw from '../../../config/secret-hitler-rules.json';

export type Role = 'liberal' | 'fascist' | 'hitler';
export type Party = 'liberal' | 'fascist';
export type Policy = 'liberal' | 'fascist';
export type Power = 'investigate' | 'peek' | 'special_election' | 'execution';
export type BoardId = 'small' | 'medium' | 'large';

export interface PlayerCountRules {
  liberals: number;
  /** Fascists besides Hitler. */
  fascists: number;
  board: BoardId;
  hitlerKnowsFascists: boolean;
}

export interface RulesConfig {
  game: { minPlayers: number; maxPlayers: number };
  playerCounts: Record<string, PlayerCountRules>;
  /** `powers[n]` is the power unlocked by the (n+1)-th fascist policy. */
  boards: Record<BoardId, { powers: (Power | null)[] }>;
  deck: Record<Policy, number>;
  policies: {
    liberalToWin: number;
    fascistToWin: number;
    hitlerChancellorWinsFrom: number;
    vetoFrom: number;
  };
  election: { maxFailedElections: number; presidentTermLimitAboveAlive: number };
  legislative: { presidentDraws: number; reshuffleBelow: number };
  roleTips: Record<Role, string>;
  session: {
    playerNameLength: [number, number];
    uniquePlayerNames: boolean;
    joinAfterStart: boolean;
    reconnectSameSeat: boolean;
    disconnectPausesGame: boolean;
    hostCanEndAfterSeconds: number;
  };
}

export const rules = raw as unknown as RulesConfig;

export function partyOf(role: Role): Party {
  return role === 'liberal' ? 'liberal' : 'fascist';
}

export function countRules(playerCount: number): PlayerCountRules {
  const entry = rules.playerCounts[String(playerCount)];
  if (!entry) throw new RangeError(`No hay reglas para ${playerCount} jugadores`);
  return entry;
}

export function boardPowers(playerCount: number): (Power | null)[] {
  return rules.boards[countRules(playerCount).board].powers;
}
