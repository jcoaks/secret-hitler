import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** The orange bar across the top of every screen. */
export function Header({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <header className="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 bg-orange px-3 py-2 sm:px-5">
      <div className="flex items-center gap-2 justify-self-start">{left}</div>
      <Link
        to="/"
        className="font-display text-[clamp(22px,6vw,44px)] leading-none tracking-wide whitespace-nowrap text-white no-underline"
      >
        SECRET HITLER
      </Link>
      <div className="flex items-center gap-1.5 justify-self-end sm:gap-2">{right}</div>
    </header>
  );
}

/** Small text button for the header bar. */
export function HeaderButton(props: { onClick: () => void; children: ReactNode; label?: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={props.label}
      className="cursor-pointer rounded-md border-2 border-white/60 bg-transparent px-1.5 py-1 font-sans text-[11px] sm:px-2.5 sm:text-[13px] font-bold text-white hover:bg-white/15"
    >
      {props.children}
    </button>
  );
}
