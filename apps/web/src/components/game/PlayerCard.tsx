import type { Role } from '@sh/engine';
import { AnimatePresence, motion } from 'motion/react';
import { art, portraitUrl } from '../../lib/assets';
import { ROLE_NAME } from '../../lib/text';

export type Badge = 'president' | 'chancellor' | 'nominee';

const BADGE_TEXT: Record<Badge, string> = {
  president: 'Presidente',
  chancellor: 'Canciller',
  nominee: 'Candidato',
};

export interface PlayerCardProps {
  name: string;
  portrait: number;
  /** Shown when known to the viewer. */
  role?: Role | null;
  /** Ja!/Nein! overlay during the vote reveal. */
  vote?: boolean | null;
  /** Waiting on this player. */
  busy?: boolean;
  dead?: boolean;
  offline?: boolean;
  isYou?: boolean;
  badge?: Badge | null;
  /** Chooseable in a prompt; `onSelect` makes the card a button. */
  onSelect?: () => void;
  selected?: boolean;
  /** Not chooseable in the current prompt (e.g. term limited). */
  unavailable?: boolean;
  unavailableReason?: string;
  /** A computer player: tagged on the portrait. */
  bot?: boolean;
  /** What the player is saying right now, shown in a speech bubble. */
  speech?: string | null;
  /** `sm` in prompts: smaller and without the badge row. */
  size?: 'md' | 'sm';
  className?: string;
}

/** A seat at the table, drawn like the original's player cards. */
export function PlayerCard({
  name,
  portrait,
  role = null,
  vote = null,
  busy = false,
  dead = false,
  offline = false,
  isYou = false,
  badge = null,
  onSelect,
  selected = false,
  unavailable = false,
  unavailableReason,
  size = 'md',
  speech = null,
  bot = false,
  className = '',
}: PlayerCardProps) {
  const dim = dead || unavailable;
  const label = [
    isYou ? `${name} (tú)` : name,
    bot && 'bot',
    badge && BADGE_TEXT[badge],
    role && ROLE_NAME[role],
    dead && 'ejecutado',
    offline && 'sin conexión',
    unavailable && unavailableReason,
  ]
    .filter(Boolean)
    .join(', ');

  const body = (
    <>
      <img
        src={unavailable ? art.playerBaseUnselectable : art.playerBase}
        alt=""
        className={`block w-full ${dim ? 'brightness-[0.4]' : ''}`}
      />
      <img
        src={portraitUrl(portrait)}
        alt=""
        className={`absolute top-[6.3%] left-[9%] w-[82%] rounded-[6%] ${dim ? 'brightness-[0.35]' : ''}`}
      />
      <span
        className={`absolute top-[63%] left-[8%] flex h-[13%] w-[84%] items-center justify-center overflow-hidden text-center font-sans ${size === 'sm' ? 'text-[11px]' : 'text-[clamp(10px,1.35vw,15px)]'} leading-tight font-bold break-words ${dim ? 'text-ink' : 'text-bg-dark'}`}
      >
        {name}
      </span>
      {role && (
        <span className="absolute top-[77%] left-[8%] flex w-[84%] items-center gap-[6%]">
          <img src={art.roleIcon[role]} alt="" className="w-[30%]" />
          <span
            className={`font-sans ${size === 'sm' ? 'text-[10px]' : 'text-[clamp(9px,1.2vw,14px)]'} font-bold ${role === 'liberal' ? 'text-liberal' : 'text-orange'} ${dim ? 'opacity-50' : ''}`}
          >
            {ROLE_NAME[role]}
          </span>
        </span>
      )}
      <AnimatePresence>
        {busy && !dead && (
          <motion.img
            key="busy"
            src={art.iconBusy}
            alt=""
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-[43%] left-[50%] w-[37.5%]"
          />
        )}
        {vote !== null && (
          <motion.img
            key="vote"
            src={vote ? art.iconJa : art.iconNein}
            alt=""
            initial={{ opacity: 0, y: -12, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            className="absolute top-[43%] left-[13.5%] w-[73%] drop-shadow-md"
          />
        )}
      </AnimatePresence>
      {(dead || (unavailable && unavailableReason)) && (
        <span
          className={`absolute inset-x-[6%] top-[22%] flex items-center justify-center text-center font-display leading-none text-text-2 ${size === 'sm' ? 'text-[13px]' : 'text-[clamp(14px,2.2vw,24px)]'}`}
        >
          {dead ? 'EJECUTADO' : unavailableReason?.toUpperCase()}
        </span>
      )}
      {bot && (
        <span className="absolute top-[3%] left-[3%] rounded bg-liberal-shadow px-1.5 py-0.5 font-sans text-[10px] font-bold tracking-wide text-white">
          BOT
        </span>
      )}
      {offline && !dead && (
        <span className="absolute top-[3%] right-[3%] rounded bg-ink/85 px-1.5 py-0.5 font-sans text-[10px] font-bold text-white">
          sin conexión
        </span>
      )}
    </>
  );

  const frame = `relative w-full rounded-[16%/10%] transition-[box-shadow,transform] duration-150 ${
    selected
      ? 'shadow-[0_0_0_4px_var(--color-selected)]'
      : onSelect
        ? 'hover:shadow-[0_0_0_4px_var(--color-select)]'
        : ''
  }`;

  return (
    <div
      className={`relative flex flex-col items-center gap-1 ${size === 'sm' ? 'w-[min(100px,max(64px,10vw),14dvh)]' : 'w-[clamp(72px,10.5vw,118px)]'} ${className}`}
    >
      <AnimatePresence>
        {speech && (
          <motion.div
            key={speech}
            role="status"
            aria-label={`${name} dice: ${speech}`}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="pointer-events-none absolute bottom-[calc(100%-26px)] left-1/2 z-20 w-max max-w-[min(230px,60vw)] -translate-x-1/2 rounded-2xl bg-white px-3 py-2 text-center font-sans text-[13px] leading-snug font-bold text-ink shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
          >
            {speech}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-white" />
          </motion.div>
        )}
      </AnimatePresence>
      {size === 'md' && (
        <span
          className={`h-5 rounded px-1.5 font-sans text-[11px] leading-5 font-bold tracking-wide uppercase ${
            badge === 'president'
              ? 'bg-orange text-white'
              : badge
                ? 'bg-liberal text-white'
                : isYou
                  ? 'text-text-2'
                  : 'invisible'
          }`}
        >
          {badge ? BADGE_TEXT[badge] : 'Tú'}
        </span>
      )}
      {onSelect && !unavailable && !dead ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={label}
          className={`${frame} cursor-pointer border-0 bg-transparent p-0 active:scale-[0.97]`}
        >
          {body}
        </button>
      ) : (
        <div role="img" aria-label={label} className={frame}>
          {body}
        </div>
      )}
    </div>
  );
}
