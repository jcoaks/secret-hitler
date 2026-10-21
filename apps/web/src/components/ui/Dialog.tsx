import { type ReactNode, useEffect, useId, useRef } from 'react';

/**
 * The original game's alert box: a black panel over a dark backdrop. Built on <dialog> for focus
 * trapping and Escape; `role="alertdialog"` for prompts that interrupt the game.
 *
 * Never taller than the window: the body scrolls if it must, and `actions` stay pinned at the
 * bottom so the button that answers the dialog is always in view.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  alert = false,
  width = 560,
}: {
  open: boolean;
  /** Without it, Escape does nothing: the player has to answer. */
  onClose?: () => void;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
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
      className="m-auto max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] flex-col overflow-hidden rounded-none border-0 bg-ink p-0 text-text shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop:bg-ink/80 open:flex open:animate-[dialog-in_0.35s_ease-out]"
      style={{ maxWidth: width }}
    >
      {open && (
        <>
          <div className="flex min-h-0 flex-col items-center gap-4 overflow-y-auto overscroll-contain px-5 pt-6 pb-5 text-center sm:px-8 sm:pt-7">
            <h2 id={titleId} className="m-0 text-[clamp(26px,4.5vw,40px)] leading-tight text-white">
              {title}
            </h2>
            {children}
          </div>
          {actions && (
            <div className="flex flex-none flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/10 px-5 pt-4 pb-5">
              {actions}
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
