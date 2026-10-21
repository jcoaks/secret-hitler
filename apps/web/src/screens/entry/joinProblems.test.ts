import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../lib/api';
import {
  codeFormatProblem,
  isNameError,
  joinErrorProblem,
  nameProblem,
  problemCopy,
  requestProblem,
  roomInfoProblem,
} from './joinProblems';

const info = (over: Partial<Parameters<typeof roomInfoProblem>[0]> = {}) => ({
  code: 'KX7-QM2',
  status: 'lobby' as const,
  playerCount: 4,
  joinable: true,
  playerNames: ['Ana', 'Beto', 'Carla', 'Dani'],
  hostName: 'Ana',
  ...over,
});

describe('join problems', () => {
  it('tells incomplete codes from codes with bad characters', () => {
    expect(codeFormatProblem('KX7-Q')).toEqual({ kind: 'incomplete' });
    expect(codeFormatProblem('')).toEqual({ kind: 'incomplete' });
    expect(codeFormatProblem('KX0-QM1')).toEqual({ kind: 'invalid' });
  });

  it('maps room info to full / started', () => {
    expect(roomInfoProblem(info())).toBeNull();
    expect(roomInfoProblem(info({ playerCount: 10, joinable: false }))).toEqual({ kind: 'full' });
    expect(roomInfoProblem(info({ status: 'playing', joinable: false }))).toEqual({
      kind: 'started',
    });
    expect(roomInfoProblem(info({ status: 'ended', joinable: false }))).toEqual({
      kind: 'started',
    });
  });

  it('maps request failures', () => {
    expect(requestProblem(new ApiRequestError('room_not_found', 'x', 404))).toEqual({
      kind: 'not_found',
    });
    expect(requestProblem(new ApiRequestError('network', 'x', 0)).kind).toBe('network');
    expect(requestProblem(new ApiRequestError('boom', 'Fallo raro', 500))).toEqual({
      kind: 'network',
      message: 'Fallo raro',
    });
    expect(requestProblem(new Error('?')).kind).toBe('network');
  });

  it('maps server join errors', () => {
    expect(joinErrorProblem('room_full')).toEqual({ kind: 'full' });
    expect(joinErrorProblem('game_in_progress')).toEqual({ kind: 'started' });
    expect(joinErrorProblem('name_taken')).toBeNull();
    expect(isNameError('name_taken')).toBe(true);
    expect(isNameError('room_full')).toBe(false);
  });

  it('validates names after cleaning whitespace', () => {
    expect(nameProblem('  A  ')).not.toBeNull();
    expect(nameProblem('Ana')).toBeNull();
    expect(nameProblem('x'.repeat(21))).not.toBeNull();
  });

  it('has copy for every problem', () => {
    expect(problemCopy({ kind: 'not_found' }).title).toBe('No encontramos esa sala');
    expect(problemCopy({ kind: 'full' }).title).toBe('La mesa está completa');
    expect(problemCopy({ kind: 'started' }).title).toBe('La partida ya comenzó');
  });
});
