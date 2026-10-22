import type { PlayerView } from '@sh/engine';
import { create } from 'zustand';
import { type Announcement, nominationKey } from '../lib/announcements';

export type Dialog = 'leave' | 'history' | 'role' | 'rules' | null;

interface UiStore {
  dialog: Dialog;
  openDialog(dialog: Exclude<Dialog, null>): void;
  closeDialog(): void;

  /**
   * Announcements waiting to be shown, oldest first. Action prompts and the end screen wait for
   * them, like the original's animation queue.
   */
  announcements: Announcement[];
  /** Chronicle entries already turned into announcements; null until the first game view. */
  seenChronicle: number | null;
  /** Called with every game view: queues what happened since the last one. */
  syncChronicle(length: number, fresh: () => Announcement[]): void;
  /** The open election already announced (nominations are not in the chronicle). */
  seenNomination: string | null;
  /** Queues the nomination of a new election; `first` is the first game view (no news). */
  syncNomination(key: string | null, first: boolean, fresh: () => Announcement | null): void;
  /** Puts an announcement ahead of the queue. */
  announceFirst(announcement: Announcement): void;
  nextAnnouncement(): void;
  resetAnnouncements(): void;
}

/** Client-only UI state shared across screens. */
export const useUiStore = create<UiStore>((set, get) => ({
  dialog: null,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),

  announcements: [],
  seenChronicle: null,
  syncChronicle(length, fresh) {
    const seen = get().seenChronicle;
    // Joining or reconnecting mid-game: what already happened is history, not news.
    if (seen === null || length < seen) return set({ seenChronicle: length, announcements: [] });
    if (length === seen) return;
    set({ seenChronicle: length, announcements: [...get().announcements, ...fresh()] });
  },
  seenNomination: null,
  syncNomination(key, first, fresh) {
    if (key === null || key === get().seenNomination) return;
    const announcement = first ? null : fresh();
    set({
      seenNomination: key,
      announcements: announcement ? [...get().announcements, announcement] : get().announcements,
    });
  },
  announceFirst: (announcement) => set({ announcements: [announcement, ...get().announcements] }),
  nextAnnouncement: () => set({ announcements: get().announcements.slice(1) }),
  resetAnnouncements: () => set({ announcements: [], seenChronicle: null, seenNomination: null }),
}));

/** True while an announcement is on screen or about to be. */
export function useAnnouncing(game: PlayerView | null): boolean {
  const length = game?.chronicle.length ?? 0;
  const nomination = game ? nominationKey(game) : null;
  return useUiStore(
    (s) =>
      s.announcements.length > 0 ||
      (s.seenChronicle !== null &&
        (s.seenChronicle < length || (nomination !== null && s.seenNomination !== nomination))),
  );
}
