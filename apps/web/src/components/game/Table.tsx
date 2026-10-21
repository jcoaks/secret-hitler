import type { PlayerId, PlayerView } from '@sh/engine';
import type { RoomView } from '@sh/protocol';
import { badgeFor, knownRole, waitingOn } from '../../lib/game';
import { useUiStore } from '../../store/ui';
import { Boards, Deck } from './Board';
import { PlayerCard } from './PlayerCard';

/** Every seat in turn order, on the dark band of the original layout. */
export function PlayerRow({ room, game }: { room: RoomView; game: PlayerView }) {
  const revealedVotes = useUiStore((s) => s.announcements[0]?.votes ?? null);
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
  return (
    <section
      aria-label="Tablero"
      className="mx-auto flex w-full max-w-[1100px] flex-wrap items-start justify-between gap-x-[clamp(6px,1.5vw,20px)] gap-y-3 px-3 py-4 sm:flex-nowrap sm:justify-center"
    >
      <Deck kind="draw" count={game.drawCount} />
      {/* On phones the boards take the full width and the piles sit below them. */}
      <div className="order-first w-full sm:order-none">
        <Boards game={game} />
      </div>
      <Deck kind="discard" count={game.discardCount} />
    </section>
  );
}
