import { cleanName, formatRoomCode, normalizeRoomCode } from '@sh/protocol';
import { type FormEvent, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/ui/Button';
import { ApiRequestError, createRoom } from '../../lib/api';
import { lastName, seatToken } from '../../lib/session';
import { codeFormatProblem, NAME_HINT, nameProblem, problemCopy } from './joinProblems';
import { EntryShell, FieldError, Panel, TextInput } from './parts';

/** Start page: create a room or join one by code. */
export function HomeScreen() {
  const navigate = useNavigate();
  const ids = { name: useId(), code: useId(), nameError: useId(), codeError: useId() };

  const [name, setName] = useState(() => lastName.get());
  const [nameError, setNameError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    const problem = nameProblem(name);
    if (problem) return setNameError(problem);
    setNameError(null);
    setCreating(true);
    try {
      const clean = cleanName(name);
      lastName.set(clean);
      const created = await createRoom(clean);
      const normalized = normalizeRoomCode(created.code);
      if (!normalized) throw new Error('Código inesperado');
      seatToken.set(normalized, created.seatToken);
      navigate(`/sala/${formatRoomCode(normalized)}`);
    } catch (error) {
      setNameError(
        error instanceof ApiRequestError ? error.message : 'Algo salió mal, inténtalo de nuevo.',
      );
      setCreating(false);
    }
  }

  function onJoin(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeRoomCode(code);
    if (!normalized) return setCodeError(problemCopy(codeFormatProblem(code)).message);
    navigate(`/sala/${formatRoomCode(normalized)}`);
  }

  return (
    <EntryShell>
      <div className="grid w-full max-w-[1000px] gap-6 md:grid-cols-2">
        <Panel>
          <h2 className="m-0 text-[clamp(26px,4vw,34px)] text-white">CREAR UNA SALA</h2>
          <form onSubmit={onCreate} noValidate className="flex w-full flex-col items-center gap-3">
            <label htmlFor={ids.name} className="text-[15px] font-bold text-text-2">
              Tu nombre
            </label>
            <TextInput
              id={ids.name}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
              autoComplete="nickname"
              maxLength={40}
              placeholder="Nombre"
              invalid={nameError !== null}
              aria-describedby={nameError ? ids.nameError : undefined}
            />
            {nameError ? (
              <FieldError id={ids.nameError}>{nameError}</FieldError>
            ) : (
              <p className="m-0 text-[13px] text-text-2">{NAME_HINT}</p>
            )}
            <Button type="submit" size="lg" disabled={creating} className="mt-2">
              {creating ? 'CREANDO…' : 'CREAR SALA'}
            </Button>
          </form>
        </Panel>

        <Panel>
          <h2 className="m-0 text-[clamp(26px,4vw,34px)] text-white">UNIRSE A UNA PARTIDA</h2>
          <form onSubmit={onJoin} noValidate className="flex w-full flex-col items-center gap-3">
            <label htmlFor={ids.code} className="text-[15px] font-bold text-text-2">
              Código de sala
            </label>
            <TextInput
              id={ids.code}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setCodeError(null);
              }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={9}
              placeholder="KX7-QM2"
              className="text-center tracking-[0.12em]"
              invalid={codeError !== null}
              aria-describedby={codeError ? ids.codeError : undefined}
            />
            {codeError ? (
              <FieldError id={ids.codeError}>{codeError}</FieldError>
            ) : (
              <p className="m-0 text-[13px] text-text-2">
                Te lo pasa quien creó la sala, o usa su enlace.
              </p>
            )}
            <Button type="submit" size="lg" variant="liberal" className="mt-2">
              UNIRSE
            </Button>
          </form>
        </Panel>
      </div>

      <section className="flex max-w-[760px] flex-col items-center gap-3 text-center">
        <h2 className="m-0 text-[clamp(26px,4vw,34px)] text-white">¿Qué es Secret Hitler?</h2>
        <p className="m-0 text-[17px] leading-relaxed text-text-2">
          Un juego de deducción social para 5 a 10 jugadores. Los liberales deben descubrir y
          detener al Hitler secreto antes de que sea demasiado tarde; los fascistas, sembrar el caos
          y llevarlo al poder. Basado en el{' '}
          <a href="https://secrethitler.com" className="text-orange-hover">
            juego de mesa original
          </a>
          , para jugar en línea y en español.
        </p>
        <Link to="/reglas" className="font-display text-2xl text-orange-hover">
          Cómo se juega
        </Link>
      </section>
    </EntryShell>
  );
}
