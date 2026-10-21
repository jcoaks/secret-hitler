import { type Random, randomInt, shuffle } from './random';
import { countRules, type Policy, type Role, rules } from './rules';
import { fail, type GameState, ok, type Player, type Result } from './types';

export interface GameOptions {
  players: Player[];
}

export function roleList(playerCount: number): Role[] {
  const counts = countRules(playerCount);
  return [
    'hitler',
    ...Array<Role>(counts.fascists).fill('fascist'),
    ...Array<Role>(counts.liberals).fill('liberal'),
  ];
}

export function freshDeck(random: Random): Policy[] {
  return shuffle(
    [
      ...Array<Policy>(rules.deck.liberal).fill('liberal'),
      ...Array<Policy>(rules.deck.fascist).fill('fascist'),
    ],
    random,
  );
}

export function createGame(options: GameOptions, random: Random): Result<GameState> {
  const { players } = options;
  const { minPlayers, maxPlayers } = rules.game;
  if (players.length < minPlayers || players.length > maxPlayers) {
    return fail(
      'invalid_player_count',
      `Secret Hitler se juega con ${minPlayers} a ${maxPlayers} jugadores`,
    );
  }
  if (new Set(players.map((p) => p.id)).size !== players.length) {
    return fail('duplicate_player', 'Hay jugadores repetidos');
  }

  const dealt = shuffle(roleList(players.length), random);
  const roles: GameState['roles'] = {};
  players.forEach((player, i) => {
    roles[player.id] = dealt[i] as Role;
  });

  const rotationIndex = randomInt(random, players.length);
  return ok({
    players: players.map((p) => ({ ...p })),
    roles,
    deadIds: [],
    investigatedIds: [],
    phase: 'nomination',
    round: 1,
    rotationIndex,
    presidentId: (players[rotationIndex] as Player).id,
    chancellorId: null,
    lastElected: null,
    specialPresidentId: null,
    electionTracker: 0,
    votes: {},
    drawPile: freshDeck(random),
    discardPile: [],
    hand: [],
    vetoDenied: false,
    enacted: { liberal: 0, fascist: 0 },
    chronicle: [],
    investigations: [],
    winner: null,
    winReason: null,
  });
}
