import { type Party, type PlayerView, partyOf } from '@sh/engine';
import type { ChatLine, RoomView } from '@sh/protocol';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { PlayerCard } from '../../components/game/PlayerCard';
import { Button } from '../../components/ui/Button';
import { useActions } from '../../hooks';
import { art } from '../../lib/assets';
import { WIN_TEXT } from '../../lib/text';
import { useUiStore } from '../../store/ui';

const BANNER_EDGE: Record<Party, string> = { liberal: '#62adbf', fascist: '#e46449' };

const FAREWELL_MS = 3800;

/** The bots' last words, one bubble at a time, round and round while the screen is open. */
function useFarewell(chat: ChatLine[]): ChatLine | null {
  const farewells = chat.filter((line) => line.final);
  const [index, setIndex] = useState(-1);
  const count = farewells.length;
  useEffect(() => {
    if (count === 0) return;
    const first = window.setTimeout(() => setIndex(0), 900);
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), FAREWELL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [count]);
  return index >= 0 ? (farewells[index % count] ?? null) : null;
}

const TEAM_TITLE: Record<Party, string> = { liberal: 'LIBERALES', fascist: 'FASCISTAS' };

function Team({
  party,
  room,
  game,
  speaking,
}: {
  party: Party;
  room: RoomView;
  game: PlayerView;
  speaking: ChatLine | null;
}) {
  const members = game.players.filter((p) => {
    const role = game.roles?.[p.id];
    return role !== undefined && partyOf(role) === party;
  });
  return (
    <section className="flex flex-col items-center gap-2">
      <h3
        className={`m-0 text-[22px] leading-none tracking-wide ${party === 'liberal' ? 'text-liberal-hover' : 'text-orange-hover'}`}
      >
        {TEAM_TITLE[party]}
      </h3>
      <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
        {members.map((player, i) => (
          <li key={player.id}>
            <PlayerCard
              name={player.name}
              portrait={room.players.find((p) => p.id === player.id)?.portrait ?? 1}
              role={game.roles?.[player.id] ?? null}
              dead={game.deadIds.includes(player.id)}
              isYou={player.id === game.you.id}
              bot={room.players.find((p) => p.id === player.id)?.bot}
              speech={speaking?.playerId === player.id ? speaking.text : null}
              speechAlign={
                members.length === 1
                  ? 'center'
                  : i === 0
                    ? 'start'
                    : i === members.length - 1
                      ? 'end'
                      : 'center'
              }
              size="sm"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The victory banner with both teams revealed. */
export function GameOver({ room, game }: { room: RoomView; game: PlayerView }) {
  const { send } = useActions();
  const openDialog = useUiStore((s) => s.openDialog);
  const [minimized, setMinimized] = useState(false);
  const winner = game.winner ?? 'liberal';
  const won = game.you.party === winner;
  const loser: Party = winner === 'liberal' ? 'fascist' : 'liberal';
  const speaking = useFarewell(room.chat);

  if (minimized) {
    return (
      <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
        <Button size="lg" onClick={() => setMinimized(false)} className="shadow-xl">
          VER RESULTADO
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/95 p-3 backdrop-blur-sm"
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={winner === 'liberal' ? 'Victoria liberal' : 'Victoria fascista'}
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex max-h-full w-full max-w-[860px] flex-col overflow-hidden bg-[#1d1a17] shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      >
        {/* The banner keeps its proportions; the band around it matches its edge. */}
        <div className="flex flex-none justify-center" style={{ background: BANNER_EDGE[winner] }}>
          <img
            src={art.victory[winner].header}
            alt={winner === 'liberal' ? 'Victoria liberal' : 'Victoria fascista'}
            className="block max-h-[18dvh] w-full max-w-[660px] object-contain"
          />
        </div>
        <div className="flex min-h-0 flex-col items-center gap-4 overflow-y-auto overscroll-contain px-4 pt-4 pb-5 text-center sm:px-8">
          <div className="flex flex-col items-center gap-2">
            <p className="m-0 font-display text-[clamp(24px,3.6vw,36px)] leading-tight text-white">
              {game.winReason ? WIN_TEXT[game.winReason] : ''}
            </p>
            <span
              className={`rounded px-3 py-1 font-sans text-[13px] font-bold tracking-wide text-white uppercase ${won ? 'bg-liberal' : 'bg-orange-shadow'}`}
            >
              {won ? 'Tu equipo gana' : 'Tu equipo pierde'}
            </span>
          </div>
          <div className="flex w-full flex-wrap items-start justify-center gap-x-10 gap-y-4">
            <Team party={winner} room={room} game={game} speaking={speaking} />
            <Team party={loser} room={room} game={game} speaking={speaking} />
          </div>
        </div>
        <footer className="flex flex-none flex-col-reverse items-center gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
          <div className="flex gap-6 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={() => setMinimized(true)}>
              Ver el tablero
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openDialog('leave')}>
              Salir de la sala
            </Button>
          </div>
          <div className="grid w-full grid-cols-2 items-center gap-3 sm:flex sm:w-auto sm:justify-end">
            <Button
              variant="liberal"
              className="px-3! text-lg! whitespace-nowrap sm:px-6! sm:text-[22px]!"
              onClick={() => openDialog('history')}
            >
              HISTORIAL
            </Button>
            {room.you.isHost ? (
              <Button
                className="px-3! text-lg! whitespace-nowrap sm:px-6! sm:text-[22px]!"
                onClick={() => send({ type: 'new_game' })}
              >
                NUEVA PARTIDA
              </Button>
            ) : (
              <span className="max-w-[220px] text-left text-[13px] text-text-2">
                El anfitrión puede empezar otra partida con la misma mesa.
              </span>
            )}
          </div>
        </footer>
      </motion.section>
    </motion.div>
  );
}
