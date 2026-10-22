import { describe, expect, it } from 'vitest';
import { cleanName, MAX_MESSAGE_BYTES, normalizeRoomCode } from './index';
import { parseClientMessage } from './schema';

const parse = (value: unknown) => parseClientMessage(JSON.stringify(value));

describe('códigos de sala', () => {
  it('normaliza mayúsculas, guiones y espacios', () => {
    expect(normalizeRoomCode('kx7m')).toBe('KX7M');
    expect(normalizeRoomCode(' KX-7M ')).toBe('KX7M');
  });

  it('rechaza longitudes erróneas y caracteres ambiguos', () => {
    expect(normalizeRoomCode('KX7')).toBeNull();
    expect(normalizeRoomCode('KX7QM2')).toBeNull();
    expect(normalizeRoomCode('KX0M')).toBeNull();
    expect(normalizeRoomCode('KX1I')).toBeNull();
  });
});

describe('nombres', () => {
  it('limpia espacios y caracteres de control', () => {
    expect(cleanName('  Ana \u0000  María\n')).toBe('Ana María');
  });

  it('aplica la longitud tras limpiar', () => {
    expect(parse({ type: 'join', name: ' A ' }).ok).toBe(false);
    expect(parse({ type: 'join', name: 'x'.repeat(21) }).ok).toBe(false);
    const ok = parse({ type: 'join', name: '  Lucía  ' });
    expect(ok.ok && ok.message).toEqual({ type: 'join', name: 'Lucía' });
  });
});

describe('mensajes del cliente', () => {
  it('acepta acciones de juego válidas', () => {
    expect(parse({ type: 'action', action: { type: 'vote', approve: true } }).ok).toBe(true);
    expect(parse({ type: 'action', action: { type: 'nominate', targetId: 's2' } }).ok).toBe(true);
    expect(parse({ type: 'action', action: { type: 'enact', index: 1 } }).ok).toBe(true);
    expect(parse({ type: 'action', action: { type: 'end_peek' } }).ok).toBe(true);
    expect(parse({ type: 'set_portrait', portrait: 20 }).ok).toBe(true);
  });

  it('rechaza JSON inválido, tipos desconocidos y campos de más', () => {
    expect(parseClientMessage('{').ok).toBe(false);
    expect(parse({ type: 'hack' }).ok).toBe(false);
    expect(parse({ type: 'start', extra: 1 }).ok).toBe(false);
    expect(
      parse({ type: 'action', action: { type: 'vote', approve: true, playerId: 'x' } }).ok,
    ).toBe(false);
    expect(parse({ type: 'set_portrait', portrait: 21 }).ok).toBe(false);
    expect(parse({ type: 'action', action: { type: 'discard', index: 3 } }).ok).toBe(false);
    expect(parse({ type: 'action', action: { type: 'enact', index: 0.5 } }).ok).toBe(false);
  });

  it('exige tokens de asiento con formato correcto', () => {
    expect(parse({ type: 'join', seatToken: 'a'.repeat(32) }).ok).toBe(true);
    expect(parse({ type: 'join', seatToken: 'nope' }).ok).toBe(false);
  });

  it('rechaza mensajes demasiado grandes', () => {
    expect(parseClientMessage(' '.repeat(MAX_MESSAGE_BYTES + 1)).ok).toBe(false);
  });
});
