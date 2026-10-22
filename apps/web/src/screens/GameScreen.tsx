import { useState } from 'react';
import { BoardArea, PlayerRow, StatusBar } from '../components/game/Table';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Header, HeaderButton } from '../components/ui/Header';
import { useRoom } from '../hooks';
import { statusText } from '../lib/game';
import { introSeen } from '../lib/session';
import { useAnnouncing, useUiStore } from '../store/ui';
import { RulesContent } from './entry/Rules';
import { ActionPrompt } from './game/ActionPrompt';
import { Announcements } from './game/Announcements';
import { GameOver } from './game/GameOver';
import { HistoryDialog } from './game/HistoryDialog';
import { PauseOverlay } from './game/PauseOverlay';
import { RoleDialog, RoleIntro } from './game/RoleDialog';

/** The table: players, status, boards, and whatever the current phase asks of the viewer. */
export function GameScreen() {
  const room = useRoom();
  const game = room.game;
  const dialog = useUiStore((s) => s.dialog);
  const openDialog = useUiStore((s) => s.openDialog);
  const closeDialog = useUiStore((s) => s.closeDialog);
  const announcing = useAnnouncing(game?.chronicle.length ?? 0);
  // The envelope opens once per game, unless the player rejoins after it started.
  const [introDone, setIntroDone] = useState(
    () => introSeen.get(room.code) || (game ? game.chronicle.length > 0 : true),
  );

  if (!game) {
    return (
      <div className="grid min-h-dvh place-items-center p-8 text-center text-text-2">
        Hay una partida en curso en esta sala. Espera a que termine para unirte.
      </div>
    );
  }

  const nameOf = (id: string | null) => room.players.find((p) => p.id === id)?.name ?? '';
  const over = game.phase === 'game_over';

  return (
    <div className="flex min-h-dvh flex-col">
      <Header
        left={
          <>
            <HeaderButton onClick={() => openDialog('role')}>Tu rol</HeaderButton>
            <HeaderButton onClick={() => openDialog('rules')} label="Reglas del juego">
              <span className="sm:hidden">?</span>
              <span className="hidden sm:inline">Reglas</span>
            </HeaderButton>
          </>
        }
        right={
          <>
            <HeaderButton onClick={() => openDialog('history')}>Historial</HeaderButton>
            <HeaderButton onClick={() => openDialog('leave')} label="Salir de la sala">
              Salir
            </HeaderButton>
          </>
        }
      />
      <PlayerRow room={room} game={game} />
      <StatusBar>{statusText(game, nameOf)}</StatusBar>
      {!game.you.alive && !over && (
        <p className="m-0 bg-orange-shadow px-4 py-2 text-center text-[14px] font-bold text-white">
          Has sido ejecutado: no puedes hablar, votar ni postularte. No reveles tu identidad.
        </p>
      )}
      <BoardArea game={game} />

      <Announcements room={room} game={game} />
      {introDone || over ? (
        <ActionPrompt />
      ) : (
        <RoleIntro
          game={game}
          onDone={() => {
            introSeen.set(room.code, true);
            setIntroDone(true);
          }}
        />
      )}
      {over && !announcing && <GameOver room={room} game={game} />}
      <RoleDialog game={game} open={dialog === 'role'} onClose={closeDialog} />
      <HistoryDialog
        game={game}
        chat={room.chat}
        open={dialog === 'history'}
        onClose={closeDialog}
      />
      <Dialog
        open={dialog === 'rules'}
        onClose={closeDialog}
        title="CÓMO SE JUEGA"
        width={760}
        actions={<Button onClick={closeDialog}>VOLVER A LA PARTIDA</Button>}
      >
        <RulesContent />
      </Dialog>
      <PauseOverlay />
    </div>
  );
}
