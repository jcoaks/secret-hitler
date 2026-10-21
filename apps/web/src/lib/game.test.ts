import { applyAction, createGame, type GameState, seededRandom, viewFor } from '@sh/engine';
import { describe, expect, it } from 'vitest';
import { announcementsFor } from './announcements';
import { knownRole, mustAct, statusText, waitingOn } from './game';

const random = seededRandom(3);
const players = ['Ana', 'Beto', 'Carla', 'Dani', 'Eva'].map((name, i) => ({ id: `p${i}`, name }));
const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name ?? '';

function game(): GameState {
  const created = createGame({ players }, random);
  if (!created.ok) throw new Error(created.error.message);
  const state = created.value;
  state.roles = { p0: 'hitler', p1: 'fascist', p2: 'liberal', p3: 'liberal', p4: 'liberal' };
  state.presidentId = 'p0';
  state.rotationIndex = 0;
  return state;
}

function act(state: GameState, action: Parameters<typeof applyAction>[1]): GameState {
  const result = applyAction(state, action, random);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe('lo que ve cada jugador', () => {
  it('cada uno conoce su rol y los fascistas a su equipo', () => {
    const state = game();
    expect(knownRole(viewFor(state, 'p2'), 'p2')).toBe('liberal');
    expect(knownRole(viewFor(state, 'p2'), 'p0')).toBeNull();
    expect(knownRole(viewFor(state, 'p1'), 'p0')).toBe('hitler');
  });

  it('solo el presidente debe actuar al nominar, y todos los vivos al votar', () => {
    let state = game();
    expect(mustAct(viewFor(state, 'p0'))).toBe(true);
    expect(mustAct(viewFor(state, 'p3'))).toBe(false);
    expect(statusText(viewFor(state, 'p3'), nameOf)).toBe(
      'Esperando a que Ana nomine un canciller.',
    );
    state = act(state, { type: 'nominate', playerId: 'p0', targetId: 'p2' });
    state = act(state, { type: 'vote', playerId: 'p3', approve: true });
    const view = viewFor(state, 'p3');
    expect(mustAct(view)).toBe(false);
    expect(waitingOn(view)).toEqual(['p0', 'p1', 'p2', 'p4']);
    expect(statusText(view, nameOf)).toBe('Votaste ¡Ja!. Faltan 4 votos.');
  });
});

describe('anuncios', () => {
  it('revela los votos y la política aprobada', () => {
    let state = act(game(), { type: 'nominate', playerId: 'p0', targetId: 'p2' });
    for (const p of players)
      state = act(state, { type: 'vote', playerId: p.id, approve: p.id !== 'p4' });
    const list = announcementsFor(state.chronicle, viewFor(state, 'p3'), nameOf);
    expect(list[0]).toMatchObject({ title: 'VOTACIÓN APROBADA', votes: { p4: false } });
    expect(list[0]?.text).toContain('4 a 1');
  });

  it('solo el presidente que investiga ve la afiliación', () => {
    let state = game();
    state.phase = 'investigate';
    state = act(state, { type: 'investigate', playerId: 'p0', targetId: 'p2' });
    const president = announcementsFor(state.chronicle, viewFor(state, 'p0'), nameOf);
    const other = announcementsFor(state.chronicle, viewFor(state, 'p3'), nameOf);
    expect(president[0]).toMatchObject({ party: 'liberal' });
    expect(president[0]?.duration).toBeUndefined();
    expect(other[0]?.party).toBeUndefined();
    expect(other[0]?.text).toBe('Ana investigó a Carla.');
  });

  it('avisa al ejecutado de que ya no puede participar', () => {
    let state = game();
    state.phase = 'execution';
    state = act(state, { type: 'execute', playerId: 'p0', targetId: 'p3' });
    expect(announcementsFor(state.chronicle, viewFor(state, 'p3'), nameOf)[0]?.title).toBe(
      'HAS SIDO EJECUTADO',
    );
  });
});
