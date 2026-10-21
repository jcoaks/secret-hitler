import { type ReactNode, useEffect, useId, useRef } from 'react';

/**
 * The original game's alert box: a black panel over a dark backdrop. Built on <dialog> for focus
 * trapping and Escape; `role="alertdialog"` for prompts that interrupt the game.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  alert = false,
  width = 560,
}: {
  open: boolean;
  /** Without it, Escape does nothing: the player has to answer. */
  onClose?: () => void;
  title: ReactNode;
  children: ReactNode;
  alert?: boolean;
  width?: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      role={alert ? 'alertdialog' : undefined}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
      className="m-auto mt-[8vh] max-h-[86dvh] w-[calc(100%-32px)] overflow-y-auto rounded-none border-0 bg-ink p-0 text-text shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop:bg-ink/80 open:animate-[dialog-in_0.35s_ease-out]"
      style={{ maxWidth: width }}
    >
      {open && (
        <div className="flex flex-col items-center gap-4 px-6 py-7 text-center sm:px-8">
          <h2 id={titleId} className="m-0 text-[clamp(28px,5vw,40px)] leading-tight text-white">
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
