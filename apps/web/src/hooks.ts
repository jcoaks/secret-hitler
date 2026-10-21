import type { PlayerView } from '@sh/engine';
import type { RoomView } from '@sh/protocol';
import { useRoomStore } from './store/room';

/** The current room. Only use inside screens rendered once the room has loaded. */
export function useRoom(): RoomView {
  const room = useRoomStore((s) => s.room);
  if (!room) throw new Error('useRoom() se usó antes de cargar la sala');
  return room;
}

/** The current game view. Only use inside in-game screens. */
export function useGame(): PlayerView {
  const game = useRoomStore((s) => s.room?.game);
  if (!game) throw new Error('useGame() se usó fuera de una partida');
  return game;
}

/** True when actions can be sent right now (connected, fresh view, not paused). */
export function useCanAct(): boolean {
  return useRoomStore((s) => s.status === 'open' && !s.room?.pause);
}

export function useActions() {
  const act = useRoomStore((s) => s.act);
  const send = useRoomStore((s) => s.send);
  return { act, send };
}

/** Display name for a player id: "Tú" for yourself. */
export function usePlayerName(): (id: string | null | undefined) => string {
  const players = useRoomStore((s) => s.room?.players);
  const you = useRoomStore((s) => s.room?.you.id);
  return (id) => {
    if (!id) return '';
    if (id === you) return 'Tú';
    return players?.find((p) => p.id === id)?.name ?? '¿?';
  };
}
