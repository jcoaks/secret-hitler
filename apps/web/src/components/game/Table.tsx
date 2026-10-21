import type { PlayerId, PlayerView } from '@sh/engine';
import type { ChatLine, RoomView } from '@sh/protocol';
import { useEffect, useRef, useState } from 'react';
import { badgeFor, knownRole, waitingOn } from '../../lib/game';
import { useAnnouncing, useUiStore } from '../../store/ui';

const SPEECH_MS = 5500;
const SPEECH_GAP_MS = 1100;

/**
 * Bot remarks as speech bubbles, one at a time, once the announcement of what they comment on
 * has played. Lines already said when the screen opens are not replayed.
 */
function useSpeech(chat: ChatLine[], announcing: boolean): Map<string, string> {
  const lastSeen = useRef<number | null>(null);
  const queue = useRef<ChatLine[]>([]);
  const [queued, setQueued] = useState(0);
  const [showing, setShowing] = useState<Map<string, ChatLine>>(new Map());

  useEffect(() => {
    const lastId = chat.at(-1)?.id ?? 0;
    if (lastSeen.current === null || lastId < lastSeen.current) {
      lastSeen.current = lastId;
      queue.current = [];
      return;
    }
    const seen = lastSeen.current;
    const fresh = chat.filter((line) => line.id > seen);
    if (fresh.length === 0) return;
    lastSeen.current = lastId;
    queue.current.push(...fresh);
    setQueued((n) => n + 1);
  }, [chat]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `queued` re-runs the queue
  useEffect(() => {
    if (announcing || queue.current.length === 0) return;
    const timer = window.setTimeout(() => {
      const line = queue.current.shift();
      if (!line) return;
      setShowing((current) => new Map(current).set(line.playerId, line));
      window.setTimeout(() => {
        setShowing((current) => {
          if (current.get(line.playerId)?.id !== line.id) return current;
          const next = new Map(current);
          next.delete(line.playerId);
          return next;
        });
      }, SPEECH_MS);
      setQueued((n) => n + 1);
    }, SPEECH_GAP_MS);
    return () => window.clearTimeout(timer);
  }, [announcing, queued]);

  return new Map([...showing].map(([id, line]) => [id, line.text]));
}

import { Boards, Deck } from './Board';
import { PlayerCard } from './PlayerCard';

/** Every seat in turn order, on the dark band of the original layout. */
export function PlayerRow({ room, game }: { room: RoomView; game: PlayerView }) {
  const revealedVotes = useUiStore((s) => s.announcements[0]?.votes ?? null);
  const announcing = useAnnouncing(game.chronicle.length);
  const speech = useSpeech(room.chat, announcing);
  const busy = new Set(revealedVotes ? [] : waitingOn(game));
  const seat = (id: PlayerId) => room.players.find((p) => p.id === id);

  return (
    <section aria-label="Jugadores" className="bg-bg-dark px-2 py-3">
      <ul className="m-0 flex list-none flex-wrap justify-center gap-x-2 gap-y-3 p-0">
        {game.players.map((player) => (
          <li key={player.id}>
            <PlayerCard
              name={player.name}
              portrait={seat(player.id)?.portrait ?? 1}
              role={knownRole(game, player.id)}
              vote={revealedVotes?.[player.id] ?? null}
              busy={busy.has(player.id)}
              dead={game.deadIds.includes(player.id)}
              offline={!seat(player.id)?.connected}
              isYou={player.id === game.you.id}
              badge={badgeFor(game, player.id)}
              speech={speech.get(player.id) ?? null}
              bot={seat(player.id)?.bot}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StatusBar({ children }: { children: string }) {
  return (
    <div
      aria-live="polite"
      className="flex min-h-11 items-center justify-center bg-ink px-4 py-2 text-center font-sans text-[clamp(14px,1.8vw,18px)] font-bold text-white"
    >
      {children}
    </div>
  );
}

/** Draw pile, the two boards and the discard pile. */
export function BoardArea({ game }: { game: PlayerView }) {
  // Proportional columns: each pile is 14.5% of the board's width, so the card on it (69% of the
  // pile) matches a policy on the board (10% of the board). On phones the piles go below.
  return (
    <section
      aria-label="Tablero"
      className="mx-auto grid w-full max-w-[1180px] grid-cols-2 items-start gap-x-[clamp(8px,1.5vw,20px)] gap-y-3 px-3 py-4 sm:grid-cols-[14.5fr_100fr_14.5fr]"
    >
      <Deck kind="draw" count={game.drawCount} />
      <div className="order-first col-span-2 sm:order-none sm:col-span-1">
        <Boards game={game} />
      </div>
      <Deck kind="discard" count={game.discardCount} />
    </section>
  );
}
