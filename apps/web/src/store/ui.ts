import { create } from 'zustand';
import type { Announcement } from '../lib/announcements';

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
  nextAnnouncement: () => set({ announcements: get().announcements.slice(1) }),
  resetAnnouncements: () => set({ announcements: [], seenChronicle: null }),
}));

/** True while an announcement is on screen or about to be. */
export function useAnnouncing(chronicleLength: number): boolean {
  return useUiStore(
    (s) =>
      s.announcements.length > 0 || (s.seenChronicle !== null && s.seenChronicle < chronicleLength),
  );
}
