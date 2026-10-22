import type { PlayerView } from '@sh/engine';
import type { RoomView } from '@sh/protocol';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { PlayerCard } from '../../components/game/PlayerCard';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import {
  type Announcement,
  announcementsFor,
  nominationAnnouncement,
  nominationKey,
} from '../../lib/announcements';
import { art } from '../../lib/assets';
import { knownRole } from '../../lib/game';
import { useUiStore } from '../../store/ui';

/**
 * Queues what happened since the last view and shows it one announcement at a time. While
 * `paused` (the envelope is open) it keeps queueing but shows nothing.
 */
export function Announcements({
  room,
  game,
  paused = false,
}: {
  room: RoomView;
  game: PlayerView;
  paused?: boolean;
}) {
  const sync = useUiStore((s) => s.syncChronicle);
  const syncNomination = useUiStore((s) => s.syncNomination);
  const queued = useUiStore((s) => s.announcements[0] ?? null);
  const next = useUiStore((s) => s.nextAnnouncement);
  const current = paused ? null : queued;

  useEffect(() => {
    const nameOf = (id: string) => room.players.find((p) => p.id === id)?.name ?? '¿?';
    const first = useUiStore.getState().seenChronicle === null;
    sync(game.chronicle.length, () =>
      announcementsFor(
        game.chronicle.slice(useUiStore.getState().seenChronicle ?? 0),
        game,
        nameOf,
      ),
    );
    syncNomination(nominationKey(game), first, () => nominationAnnouncement(game, nameOf));
  }, [game, room.players, sync, syncNomination]);

  useEffect(() => {
    if (!current?.duration) return;
    const timer = window.setTimeout(next, current.duration);
    return () => window.clearTimeout(timer);
  }, [current, next]);

  if (current && !current.duration) {
    return <AcknowledgedAnnouncement announcement={current} onDone={next} />;
  }

  return (
    <AnimatePresence>
      {current && (
        <motion.button
          key={`${current.title}-${current.text}`}
          type="button"
          onClick={next}
          aria-live="assertive"
          initial={{ opacity: 0, scaleY: 0.4, y: '-50%' }}
          animate={{ opacity: 1, scaleY: 1, y: '-50%' }}
          exit={{ opacity: 0, scaleY: 0.4, y: '-50%' }}
          transition={{ duration: 0.35 }}
          className="fixed inset-x-0 top-1/2 z-40 flex cursor-pointer flex-col items-center gap-2 border-0 bg-ink/92 px-4 py-5 text-center text-white shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        >
          <span className="font-display text-[clamp(30px,6vw,56px)] leading-none tracking-wide">
            {current.title}
          </span>
          {current.policy && (
            <img src={art.policy[current.policy]} alt="" className="w-[clamp(70px,10vw,110px)]" />
          )}
          {current.text && (
            <span className="max-w-[720px] font-sans text-[clamp(14px,2vw,18px)] font-bold text-text-2">
              {current.text}
            </span>
          )}
          {current.government && (
            <Government room={room} game={game} government={current.government} />
          )}
          {current.hint && (
            <span className="max-w-[720px] font-sans text-[clamp(14px,2vw,17px)] font-bold text-orange-hover">
              {current.hint}
            </span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/** The proposed government as two cards, with whatever roles the viewer knows. */
function Government({
  room,
  game,
  government,
}: {
  room: RoomView;
  game: PlayerView;
  government: NonNullable<Announcement['government']>;
}) {
  const seat = (id: string) => room.players.find((p) => p.id === id);
  const card = (id: string, title: string, color: string) => (
    <span className="flex flex-col items-center gap-1">
      <span
        className={`rounded px-1.5 font-sans text-[11px] leading-5 font-bold tracking-wide text-white uppercase ${color}`}
      >
        {title}
      </span>
      <PlayerCard
        name={seat(id)?.name ?? '¿?'}
        portrait={seat(id)?.portrait ?? 1}
        role={knownRole(game, id)}
        isYou={id === game.you.id}
        bot={seat(id)?.bot}
        size="sm"
      />
    </span>
  );
  return (
    <span className="flex items-end gap-4">
      {card(government.presidentId, 'Presidente', 'bg-orange')}
      {card(government.chancellorId, 'Canciller', 'bg-liberal')}
    </span>
  );
}

function AcknowledgedAnnouncement({
  announcement,
  onDone,
}: {
  announcement: Announcement;
  onDone: () => void;
}) {
  return (
    <Dialog
      open
      alert
      title={announcement.title}
      onClose={onDone}
      actions={
        <Button size="lg" onClick={onDone}>
          ENTENDIDO
        </Button>
      }
    >
      {announcement.party && (
        <motion.img
          src={art.membership[announcement.party]}
          alt={`Afiliación: partido ${announcement.party === 'liberal' ? 'liberal' : 'fascista'}`}
          initial={{ rotateY: 90 }}
          animate={{ rotateY: 0 }}
          transition={{ duration: 0.6 }}
          className="w-[min(220px,max(140px,30vw),34dvh)]"
        />
      )}
      {announcement.text && <p className="m-0 text-[16px] text-text-2">{announcement.text}</p>}
    </Dialog>
  );
}
