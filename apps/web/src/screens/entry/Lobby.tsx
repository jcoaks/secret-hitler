import { rules } from '@sh/engine';
import { PORTRAIT_COUNT, type RoomView } from '@sh/protocol';
import { useState } from 'react';
import { PlayerCard } from '../../components/game/PlayerCard';
import { Button } from '../../components/ui/Button';
import { Header, HeaderButton } from '../../components/ui/Header';
import { useActions, useRoom } from '../../hooks';
import { portraitUrl } from '../../lib/assets';
import { useUiStore } from '../../store/ui';

/** What the table still needs before the host can start. */
export function startHint(room: RoomView): string {
  const { minPlayers, maxPlayers } = rules.game;
  const count = room.players.length;
  if (count < minPlayers) {
    const missing = minPlayers - count;
    const fill = room.you.isHost ? ' Invita a alguien o añade bots.' : '';
    return `Faltan ${missing} ${missing === 1 ? 'jugador' : 'jugadores'}: se juega con ${minPlayers} a ${maxPlayers}.${fill}`;
  }
  const offline = room.players.filter((p) => !p.connected).length;
  if (offline > 0) return 'Esperando a que vuelvan los jugadores sin conexión.';
  const waiting = room.players.filter((p) => !p.ready).length;
  if (waiting > 0) {
    return `Esperando a que ${waiting === 1 ? 'un jugador esté listo' : `${waiting} jugadores estén listos`}.`;
  }
  return room.you.isHost
    ? '¡Todo listo! Empieza cuando quieras.'
    : 'Todo listo: el anfitrión puede empezar.';
}

/** The waiting room: share the code, pick a portrait, get ready. */
export function LobbyScreen() {
  const room = useRoom();
  const { send } = useActions();
  const openDialog = useUiStore((s) => s.openDialog);
  const me = room.players.find((p) => p.id === room.you.id);
  const takenBy = new Map(room.players.map((p) => [p.portrait, p.id]));
  const [copied, setCopied] = useState(false);

  const link = `${window.location.origin}/sala/${room.code}`;
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header right={<HeaderButton onClick={() => openDialog('leave')}>Salir</HeaderButton>} />
      <main className="flex flex-1 flex-col items-center gap-6 px-4 py-6">
        <section className="flex flex-col items-center gap-2 text-center">
          <h1 className="m-0 text-[clamp(28px,5vw,40px)] text-white">
            CÓDIGO DE SALA: <span className="tracking-[0.08em] text-orange-hover">{room.code}</span>
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="sm" variant="liberal" onClick={copyLink}>
              {copied ? '¡ENLACE COPIADO!' : 'COPIAR ENLACE'}
            </Button>
            <span className="text-[14px] text-text-2">
              Comparte el código o el enlace con tus amigos.
            </span>
          </div>
        </section>

        <section aria-label="Jugadores" className="w-full max-w-[980px] bg-bg-dark px-3 py-4">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <h2 className="m-0 text-center text-2xl text-white">
              JUGADORES ({room.players.length}/{rules.game.maxPlayers})
            </h2>
            {room.you.isHost && room.players.length < rules.game.maxPlayers && (
              <Button size="sm" variant="liberal" onClick={() => send({ type: 'add_bot' })}>
                + AÑADIR BOT
              </Button>
            )}
          </div>
          <ul className="m-0 flex list-none flex-wrap justify-center gap-3 p-0">
            {room.players.map((player) => (
              <li key={player.id} className="flex flex-col items-center gap-1.5">
                <PlayerCard
                  name={player.name}
                  portrait={player.portrait}
                  isYou={player.id === room.you.id}
                  offline={!player.connected}
                  bot={player.bot}
                />
                <span
                  className={`font-sans text-[12px] font-bold ${player.ready ? 'text-liberal-hover' : 'text-text-2'}`}
                >
                  {player.bot
                    ? 'Bot'
                    : `${player.id === room.hostId ? 'Anfitrión · ' : ''}${player.ready ? 'Listo' : 'Esperando'}`}
                </span>
                {room.you.isHost && player.id !== room.you.id && (
                  <button
                    type="button"
                    onClick={() => send({ type: 'kick', playerId: player.id })}
                    className="cursor-pointer border-0 bg-transparent font-sans text-[12px] font-bold text-orange-hover underline"
                    aria-label={`${player.bot ? 'Quitar' : 'Expulsar'} a ${player.name}`}
                  >
                    {player.bot ? 'Quitar' : 'Expulsar'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-label="Tu retrato"
          className="flex w-full max-w-[980px] flex-col items-center gap-3"
        >
          <h2 className="m-0 text-2xl text-white">ELIGE TU RETRATO</h2>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {Array.from({ length: PORTRAIT_COUNT }, (_, i) => i + 1).map((portrait) => {
              const owner = takenBy.get(portrait);
              const mine = owner === room.you.id;
              const taken = owner !== undefined && !mine;
              return (
                <button
                  key={portrait}
                  type="button"
                  disabled={taken || me?.ready}
                  aria-pressed={mine}
                  aria-label={`Retrato ${portrait}${taken ? ', ocupado' : ''}`}
                  onClick={() => send({ type: 'set_portrait', portrait })}
                  className={`w-[clamp(44px,8vw,64px)] cursor-pointer rounded-md border-0 bg-transparent p-0 transition-shadow disabled:cursor-not-allowed ${
                    mine
                      ? 'shadow-[0_0_0_4px_var(--color-selected)]'
                      : taken
                        ? 'opacity-30'
                        : 'hover:shadow-[0_0_0_3px_var(--color-select)]'
                  }`}
                >
                  <img src={portraitUrl(portrait)} alt="" className="block w-full rounded-md" />
                </button>
              );
            })}
          </div>
          {me?.ready && (
            <p className="m-0 text-[13px] text-text-2">
              Para cambiar de retrato, deja de estar listo.
            </p>
          )}
        </section>

        <section className="flex flex-col items-center gap-3 text-center">
          <p aria-live="polite" className="m-0 text-[16px] font-bold text-text-2">
            {startHint(room)}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              variant={me?.ready ? 'primary' : 'liberal'}
              onClick={() => send({ type: 'set_ready', ready: !me?.ready })}
            >
              {me?.ready ? 'NO ESTOY LISTO' : 'ESTOY LISTO'}
            </Button>
            {room.you.isHost && (
              <Button size="lg" disabled={!room.canStart} onClick={() => send({ type: 'start' })}>
                EMPEZAR PARTIDA
              </Button>
            )}
          </div>
          {!room.you.isHost && (
            <p className="m-0 text-[13px] text-text-2">
              Solo el anfitrión puede iniciar la partida.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
