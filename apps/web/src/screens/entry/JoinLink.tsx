import { cleanName, normalizeRoomCode } from '@sh/protocol';
import { type FormEvent, useId, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { lastName, seatToken } from '../../lib/session';
import { useRoomStore } from '../../store/room';
import {
  codeFormatProblem,
  isNameError,
  type JoinProblem,
  joinErrorProblem,
  NAME_HINT,
  nameProblem,
  roomInfoProblem,
} from './joinProblems';
import {
  EntryShell,
  FieldError,
  Loading,
  Panel,
  ProblemCard,
  TextInput,
  useRoomInfo,
} from './parts';

/** /sala/:code without a seat here: asks for a name and sits at the table. */
export function JoinLinkScreen({ code: rawCode }: { code: string }) {
  const code = normalizeRoomCode(rawCode);
  const { result, reload } = useRoomInfo(code);
  const storeCode = useRoomStore((s) => s.code);
  const status = useRoomStore((s) => s.status);
  const joinError = useRoomStore((s) => s.joinError);
  const connect = useRoomStore((s) => s.connect);

  const [name, setName] = useState(() => lastName.get());
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const ids = { name: useId(), error: useId() };

  const ours = code !== null && storeCode === code;
  const ourJoinError = ours ? joinError : null;
  const pending = ours && status === 'connecting' && !ourJoinError && submitted !== null;

  let problem: JoinProblem | null = null;
  if (!code) problem = codeFormatProblem(rawCode);
  else if (ourJoinError) problem = joinErrorProblem(ourJoinError.code);

  // A seat is already held here: RoomPage is reconnecting to it.
  const hasSeat = code !== null && seatToken.get(code) !== null;
  if (!problem && hasSeat && !ourJoinError && (!ours || status === 'connecting')) {
    return (
      <EntryShell>
        <Loading text="Entrando a la sala…" />
      </EntryShell>
    );
  }

  if (!problem && result.state === 'error') problem = result.problem;
  if (!problem && result.state === 'ready') problem = roomInfoProblem(result.info);
  if (problem) {
    return (
      <EntryShell>
        <ProblemCard problem={problem} onRetry={problem.kind === 'network' ? reload : undefined} />
      </EntryShell>
    );
  }

  const serverNameError =
    ourJoinError && isNameError(ourJoinError.code) && submitted === name
      ? ourJoinError.message
      : null;
  const otherError = ourJoinError && !isNameError(ourJoinError.code) ? ourJoinError.message : null;
  const error = localError ?? serverNameError ?? otherError;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!code || pending) return;
    const issue = nameProblem(name);
    if (issue) return setLocalError(issue);
    const clean = cleanName(name);
    lastName.set(clean);
    setSubmitted(name);
    connect(code, { name: clean });
  }

  const info = result.state === 'ready' ? result.info : null;

  return (
    <EntryShell>
      <Panel className="max-w-[560px]">
        <h1 className="m-0 text-[clamp(30px,5vw,42px)] text-white">
          {info?.hostName ? `${info.hostName} te invita a jugar` : 'Te invitan a jugar'}
        </h1>
        <p className="m-0 text-[15px] text-text-2">
          Sala <strong className="tracking-[0.1em] text-white">{code ?? rawCode}</strong>
          {info && ` · ${info.playerCount} ${info.playerCount === 1 ? 'jugador' : 'jugadores'}`}
          {info && info.playerNames.length > 0 && `: ${info.playerNames.join(', ')}`}
        </p>
        <form onSubmit={onSubmit} noValidate className="flex w-full flex-col items-center gap-3">
          <label htmlFor={ids.name} className="text-[15px] font-bold text-text-2">
            Tu nombre
          </label>
          <TextInput
            id={ids.name}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setLocalError(null);
            }}
            autoComplete="nickname"
            maxLength={40}
            placeholder="Nombre"
            invalid={error !== null}
            aria-describedby={error ? ids.error : undefined}
          />
          {error ? (
            <FieldError id={ids.error}>{error}</FieldError>
          ) : (
            <p className="m-0 text-[13px] text-text-2">{NAME_HINT}</p>
          )}
          <Button type="submit" size="lg" disabled={pending} className="mt-2">
            {pending ? 'ENTRANDO…' : 'SENTARME A LA MESA'}
          </Button>
        </form>
      </Panel>
    </EntryShell>
  );
}
