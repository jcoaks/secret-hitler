import type { RoomView } from '@sh/protocol';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { listNames } from '../../lib/names';
import { useRoomStore } from '../../store/room';

/** "1:15" */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Ticks every second while `active`, returning Date.now(). */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

/**
 * Remembers the host before the pause, to tell when the host is the one who
 * dropped (the server has already handed the role to the next seat).
 */
function usePreviousHost(room: RoomView | null): string | null {
  const lastHost = useRef<string | null>(null);
  const formerHost = useRef<string | null>(null);
  if (room) {
    const pausedIds = room.pause?.disconnectedIds ?? [];
    if (!room.pause) formerHost.current = null;
    if (
      lastHost.current &&
      room.hostId !== lastHost.current &&
      pausedIds.includes(lastHost.current)
    ) {
      formerHost.current = lastHost.current;
    }
    if (formerHost.current && !pausedIds.includes(formerHost.current)) formerHost.current = null;
    lastHost.current = room.hostId;
  }
  return formerHost.current;
}

/** Pause when someone drops (player or host), and your own lost connection. */
export function PauseOverlay() {
  const room = useRoomStore((s) => s.room);
  const status = useRoomStore((s) => s.status);
  const send = useRoomStore((s) => s.send);
  const formerHost = usePreviousHost(room);
  const offline = status === 'reconnecting' || (status === 'connecting' && room !== null);
  const pause = room?.pause ?? null;
  const now = useNow(Boolean(pause) && !offline);
  const [minimizedAt, setMinimizedAt] = useState<number | null>(null);

  if (!room) return null;

  if (offline) {
    return (
      <>
        <div
          role="alert"
          className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-orange-shadow px-6 py-3 text-[15px] text-white"
        >
          <span>
            <strong>Sin conexión.</strong> Reintentando…
          </span>
        </div>
        <Dialog open title="HAS PERDIDO LA CONEXIÓN">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="m-0 text-base text-text-2">
              La mesa te espera. Cuando vuelvas verás la partida tal como está, con tu rol y tus
              votos intactos.
            </p>
          </div>
        </Dialog>
      </>
    );
  }

  if (!pause) return null;

  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name ?? '¿?';
  const missing = pause.disconnectedIds.filter((id) => id !== room.you.id);
  if (missing.length === 0) return null;
  const names = missing.map(nameOf);
  const allLeft = missing.every((id) => room.players.find((p) => p.id === id)?.left);
  const first = names[0] ?? '';
  const plural = missing.length > 1;

  const hostDropped = formerHost !== null && missing.includes(formerHost);
  const newHost =
    room.hostId === room.you.id ? 'tú' : room.players.find((p) => p.id === room.hostId)?.name;

  const who = hostDropped && !plural ? `${first}, el anfitrión,` : listNames(names);
  const title = allLeft
    ? `${who} ${plural ? 'abandonaron' : 'abandonó'} la partida`
    : `${who} ${plural ? 'perdieron' : 'perdió'} la conexión`;

  const lines: string[] = [];
  if (hostDropped && newHost) {
    lines.push(
      newHost === 'tú'
        ? 'Ahora el anfitrión eres tú, mientras tanto.'
        : `${newHost} pasa a ser el anfitrión mientras tanto.`,
    );
  }
  lines.push(
    allLeft
      ? 'La partida no puede seguir sin todos. Si nadie vuelve, el anfitrión podrá terminarla.'
      : `La partida está en pausa hasta que ${plural ? 'vuelvan' : 'vuelva'}. ${
          plural ? 'Sus asientos y sus roles los esperan.' : 'Su asiento y su rol le esperan.'
        }`,
  );

  const total = Math.max(1, pause.hostCanEndAt - pause.since);
  const elapsed = Math.min(total, Math.max(0, now - pause.since));
  const canEnd = now >= pause.hostCanEndAt;
  const isHost = room.you.isHost;
  const minimized = minimizedAt === pause.since;

  if (minimized && isHost) {
    return (
      <div
        role="status"
        className="fixed inset-x-0 top-0 z-30 flex flex-wrap items-center justify-center gap-3 bg-ink px-6 py-2.5 text-sm text-white"
      >
        <span>Partida en pausa · esperando a {listNames(names)}</span>
        <Button variant="ghost" size="sm" onClick={() => setMinimizedAt(null)}>
          Ver opciones
        </Button>
      </div>
    );
  }

  return (
    <Dialog open title={title.toUpperCase()}>
      <div className="flex flex-col items-center gap-4 text-center">
        {lines.map((line) => (
          <p key={line} className="m-0 text-base text-text-2">
            {line}
          </p>
        ))}
        <div className="flex w-full flex-col gap-2">
          <div
            role="progressbar"
            aria-label="Tiempo de espera"
            aria-valuemin={0}
            aria-valuemax={Math.round(total / 1000)}
            aria-valuenow={Math.round(elapsed / 1000)}
            aria-valuetext={`${formatClock(elapsed)} de ${formatClock(total)}`}
            className="h-2 overflow-hidden rounded-full bg-white/15"
          >
            <div
              className="h-full bg-orange transition-[width] duration-1000 ease-linear"
              style={{ width: `${(elapsed / total) * 100}%` }}
            />
          </div>
          <div className="text-[13px] text-text-2" data-testid="pause-clock">
            Partida en pausa · {formatClock(elapsed)} de {formatClock(total)}
          </div>
        </div>
        <div aria-live="polite" className="w-full empty:hidden">
          {isHost && canEnd && (
            <div className="flex w-full flex-col gap-2">
              <div className="flex w-full flex-wrap gap-2.5">
                <Button
                  variant="liberal"
                  className="flex-[1_1_180px]"
                  onClick={() => setMinimizedAt(pause.since)}
                >
                  SEGUIR ESPERANDO
                </Button>
                <Button className="flex-[1_1_180px]" onClick={() => send({ type: 'end_game' })}>
                  TERMINAR LA PARTIDA
                </Button>
              </div>
              <p className="m-0 text-[13px] text-text-2">Solo el anfitrión ve estas opciones.</p>
            </div>
          )}
        </div>
        {!(isHost && canEnd) && (
          <p className="m-0 text-[13px] text-text-2">
            {isHost
              ? `Si no ${plural ? 'vuelven' : 'vuelve'}, podrás terminar la partida en ${formatClock(pause.hostCanEndAt - now)}.`
              : `Si no ${plural ? 'vuelven' : 'vuelve'}, el anfitrión podrá terminar la partida.`}
          </p>
        )}
      </div>
    </Dialog>
  );
}
