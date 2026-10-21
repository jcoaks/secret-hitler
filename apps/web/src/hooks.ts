import type { RoomView } from '@sh/protocol';
import { useRoomStore } from './store/room';

/** The current room. Only use inside screens rendered once the room has loaded. */
export function useRoom(): RoomView {
  const room = useRoomStore((s) => s.room);
  if (!room) throw new Error('useRoom() se usó antes de cargar la sala');
  return room;
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
