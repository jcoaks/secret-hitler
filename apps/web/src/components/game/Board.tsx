import type { PlayerView, Policy } from '@sh/engine';
import { motion } from 'motion/react';
import { art } from '../../lib/assets';
import { POWER_NAME } from '../../lib/text';

/** Card positions on the board art, from the original layout (percent of the board width). */
const SLOTS: Record<Policy, { first: number; step: number; count: number }> = {
  liberal: { first: 18.2, step: 13.54, count: 5 },
  fascist: { first: 11, step: 13.6, count: 6 },
};

function PolicyTrack({ policy, enacted }: { policy: Policy; enacted: number }) {
  const { first, step, count } = SLOTS[policy];
  return (
    <>
      {Array.from({ length: Math.min(enacted, count) }, (_, i) => (
        <motion.img
          // biome-ignore lint/suspicious/noArrayIndexKey: slots are fixed positions on the board
          key={i}
          src={art.boardPolicy[policy]}
          alt=""
          initial={{ opacity: 0, top: '10%' }}
          animate={{ opacity: 1, top: '30%' }}
          transition={{ opacity: { duration: 0.8 }, top: { delay: 0.8, duration: 0.3 } }}
          className="absolute w-[10%]"
          style={{ left: `${first + i * step}%` }}
        />
      ))}
    </>
  );
}

/** The liberal and fascist boards with their policies and the election tracker. */
export function Boards({ game }: { game: PlayerView }) {
  const nextPower = game.board.powers[game.enacted.fascist] ?? null;
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="relative">
        <img
          src={art.boardLiberal}
          alt={`Tablero liberal: ${game.enacted.liberal} de ${game.board.liberalToWin} políticas liberales.`}
          className="block w-full"
        />
        <PolicyTrack policy="liberal" enacted={game.enacted.liberal} />
        <motion.img
          src={art.boardTracker}
          alt={`Contador electoral: ${game.electionTracker} de ${game.maxFailedElections}.`}
          animate={{ left: `${34.2 + game.electionTracker * 9.16}%` }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="absolute top-[74%] w-[3.2%]"
        />
      </div>
      <div className="relative">
        <img
          src={art.boardFascist[game.board.id]}
          alt={`Tablero fascista: ${game.enacted.fascist} de ${game.board.fascistToWin} políticas fascistas.`}
          className="block w-full"
        />
        <PolicyTrack policy="fascist" enacted={game.enacted.fascist} />
      </div>
      <p className="m-0 text-center text-[13px] text-text-2">
        {game.vetoUnlocked ? 'Veto desbloqueado · ' : ''}
        {nextPower
          ? `La próxima política fascista activa: ${POWER_NAME[nextPower]}.`
          : game.enacted.fascist < game.board.fascistToWin - 1
            ? 'La próxima política fascista no activa ningún poder.'
            : 'Una política fascista más y ganan los fascistas.'}
        {game.enacted.fascist >= game.board.hitlerChancellorWinsFrom &&
          ' Si Hitler sale elegido canciller, ganan los fascistas.'}
      </p>
    </div>
  );
}

/** Draw or discard pile with its card count. */
export function Deck({ kind, count }: { kind: 'draw' | 'discard'; count: number }) {
  const label = kind === 'draw' ? 'Mazo de robo' : 'Descartes';
  return (
    <div
      className={`flex w-[min(22vw,96px)] flex-col items-center gap-1 sm:w-full ${kind === 'draw' ? 'justify-self-start' : 'justify-self-end'}`}
    >
      <div
        className="@container relative w-full"
        role="img"
        aria-label={`${label}: ${count} cartas`}
      >
        <img
          src={kind === 'draw' ? art.boardDraw : art.boardDiscard}
          alt=""
          className="block w-full"
        />
        {Array.from({ length: Math.min(count, 3) }, (_, i) => (
          <img
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed stack of card backs
            key={i}
            src={art.boardPolicyBack}
            alt=""
            className="absolute left-[16%] w-[69%] drop-shadow"
            style={{ top: `${9 - i * 2}%` }}
          />
        ))}
        {/* Below the stack of card backs, in the pile's free bottom strip. */}
        <span className="absolute inset-x-0 top-[78%] flex justify-center">
          <span className="min-w-[30cqw] rounded-full bg-ink/85 px-[6cqw] py-[1.5cqw] text-center font-display text-[17cqw] leading-none text-white shadow">
            {count}
          </span>
        </span>
      </div>
      <span className="text-center font-sans text-[12px] font-bold text-text-2">{label}</span>
    </div>
  );
}
