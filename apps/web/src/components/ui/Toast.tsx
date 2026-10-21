import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useRoomStore } from '../../store/room';

/** The original snackbar: the latest server error, briefly, at the bottom of the screen. */
export function NoticeToast() {
  const notice = useRoomStore((s) => s.notice);
  const dismiss = useRoomStore((s) => s.dismissNotice);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(dismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [notice, dismiss]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="pointer-events-auto flex max-w-lg items-center gap-4 rounded-[10px] bg-ink px-5 py-3.5 text-[15px] shadow-lg"
            role="status"
          >
            <span>{notice.message}</span>
            <button
              type="button"
              onClick={dismiss}
              className="cursor-pointer border-0 bg-transparent font-bold text-orange-hover underline"
            >
              Cerrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
