import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { useRoomStore } from '../../store/room';
import { useUiStore } from '../../store/ui';

/** Confirmation before leaving the room (from the header or the end screen). */
export function LeaveDialog() {
  const open = useUiStore((s) => s.dialog === 'leave');
  const close = useUiStore((s) => s.closeDialog);
  const room = useRoomStore((s) => s.room);
  if (!room) return null;

  const others = room.players.filter((p) => p.id !== room.you.id && !p.left).length;
  const copy =
    room.status === 'playing'
      ? {
          title: '¿Abandonar la partida?',
          text: `La partida no puede continuar sin ti: la mesa quedará en pausa para ${
            others === 1 ? 'el otro jugador' : `los otros ${others} jugadores`
          }. Si no vuelves, el anfitrión tendrá que terminar la partida.`,
          stay: 'Quedarme en la mesa',
          leave: 'Abandonar',
        }
      : room.status === 'ended'
        ? {
            title: '¿Salir de la sala?',
            text: 'La partida ya terminó. Si sales, dejarás tu asiento y los demás podrán jugar otra sin ti.',
            stay: 'Quedarme en la sala',
            leave: 'Salir de la sala',
          }
        : {
            title: '¿Salir de la sala?',
            text: 'Dejarás tu asiento en la sala de espera. Podrás volver a entrar con el código mientras la partida no haya empezado.',
            stay: 'Quedarme en la sala',
            leave: 'Salir',
          };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={copy.title}
      alert
      actions={
        <>
          <Button variant="liberal" onClick={close}>
            {copy.stay.toUpperCase()}
          </Button>
          <Button
            onClick={() => {
              useRoomStore.getState().leave();
              close();
            }}
          >
            {copy.leave.toUpperCase()}
          </Button>
        </>
      }
    >
      <p className="m-0 text-base text-text-2">{copy.text}</p>
    </Dialog>
  );
}
