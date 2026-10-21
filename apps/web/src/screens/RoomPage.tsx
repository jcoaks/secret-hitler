import { normalizeRoomCode } from '@sh/protocol';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/ui/Button';
import { NoticeToast } from '../components/ui/Toast';
import { seatToken } from '../lib/session';
import { type ClosedReason, useRoomStore } from '../store/room';
import { useUiStore } from '../store/ui';
import { JoinLinkScreen } from './entry/JoinLink';
import { LobbyScreen } from './entry/Lobby';
import { EntryShell, Loading, Panel } from './entry/parts';
import { GameScreen } from './GameScreen';
import { LeaveDialog } from './game/LeaveDialog';

/** /sala/:code — joins (by seat token or by name) and shows the lobby or the game. */
export function RoomPage() {
  const params = useParams();
  const rawCode = params.code ?? '';
  const code = normalizeRoomCode(rawCode);
  const store = useRoomStore();
  const navigate = useNavigate();
  const hasSeat = code ? seatToken.get(code) !== null : false;
  const status = store.room?.status;

  // Reconnect automatically when this browser already holds a seat in the room.
  useEffect(() => {
    if (code && hasSeat && store.code !== code) store.connect(code);
  }, [code, hasSeat, store.code, store.connect]);

  // Leaving the room on purpose goes back to the start.
  useEffect(() => {
    if (store.closedReason === 'left') {
      store.disconnect();
      navigate('/');
    }
  }, [store.closedReason, store.disconnect, navigate]);

  // Announcements belong to one game; the lobby starts the next one clean.
  useEffect(() => {
    if (status === 'lobby') useUiStore.getState().resetAnnouncements();
  }, [status]);

  useEffect(
    () => () => {
      useRoomStore.getState().disconnect();
      useUiStore.getState().resetAnnouncements();
    },
    [],
  );

  if (store.closedReason && store.closedReason !== 'left' && store.code === code && hasSeat) {
    return <ClosedScreen reason={store.closedReason} />;
  }

  const inThisRoom = code !== null && store.code === code;
  if (!code || !inThisRoom || (!store.room && !hasSeat)) {
    return <JoinLinkScreen code={rawCode} />;
  }

  if (!store.room) {
    return (
      <EntryShell>
        <Loading text="Entrando a la sala…" />
      </EntryShell>
    );
  }

  return (
    <>
      {store.room.status === 'lobby' ? <LobbyScreen /> : <GameScreen />}
      <LeaveDialog />
      <NoticeToast />
    </>
  );
}

const CLOSED_COPY: Record<Exclude<ClosedReason, null | 'left'>, { title: string; text: string }> = {
  kicked: { title: 'Te han sacado de la sala', text: 'El anfitrión te expulsó de la sala.' },
  replaced: {
    title: 'Abriste la partida en otra ventana',
    text: 'Solo puede haber una conexión por jugador. Sigue jugando en la otra ventana, o vuelve a entrar aquí.',
  },
  rejected: { title: 'No se pudo entrar', text: 'La sala ya no existe o tu asiento no es válido.' },
};

function ClosedScreen({ reason }: { reason: Exclude<ClosedReason, null | 'left'> }) {
  const copy = CLOSED_COPY[reason];
  const store = useRoomStore();
  const navigate = useNavigate();
  return (
    <EntryShell>
      <Panel className="max-w-[520px]">
        <h1 className="m-0 text-4xl text-white">{copy.title}</h1>
        <p className="m-0 text-text-2">{copy.text}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {reason === 'replaced' && store.code && (
            <Button onClick={() => store.code && store.connect(store.code)}>
              JUGAR EN ESTA VENTANA
            </Button>
          )}
          <Button
            variant="liberal"
            onClick={() => {
              store.disconnect();
              navigate('/');
            }}
          >
            VOLVER AL INICIO
          </Button>
        </div>
      </Panel>
    </EntryShell>
  );
}
