import type { RoomInfo } from '@sh/protocol';
import { type InputHTMLAttributes, type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Header } from '../../components/ui/Header';
import { getRoomInfo } from '../../lib/api';
import { type JoinProblem, problemCopy, requestProblem } from './joinProblems';

/** Header plus a centered column on the warm grey background. */
export function EntryShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center gap-8 px-4 py-8 sm:py-12">{children}</main>
      <footer className="px-4 pb-6 text-center text-[12px] text-text-2">
        Basado en <em>Secret Hitler</em> de Goat, Wolf &amp; Cabbage (CC BY-NC-SA 4.0) y en{' '}
        <a
          href="https://github.com/ShrimpCryptid/Secret-Hitler-Online"
          className="text-orange-hover"
        >
          Secret Hitler Online
        </a>
        .
      </footer>
    </div>
  );
}

/** Dark card holding a form, like the original login panels. */
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`box-border flex w-full flex-col items-center gap-4 bg-bg-dark px-6 py-7 ${className}`}
    >
      {children}
    </section>
  );
}

export function TextInput({
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={`box-border w-full max-w-[360px] rounded-[5px] border-2 bg-white px-3 py-2.5 font-sans text-xl text-[#69645e] outline-none placeholder:text-text-2 focus:border-select ${invalid ? 'border-orange' : 'border-transparent'} ${props.className ?? ''}`}
    />
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="m-0 text-[15px] font-bold text-orange-hover">
      {children}
    </p>
  );
}

export type RoomInfoState =
  | { state: 'loading' }
  | { state: 'ready'; info: RoomInfo }
  | { state: 'error'; problem: JoinProblem };

export function useRoomInfo(code: string | null): { result: RoomInfoState; reload: () => void } {
  const [result, setResult] = useState<RoomInfoState>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the request
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    setResult({ state: 'loading' });
    getRoomInfo(code).then(
      (info) => {
        if (!cancelled) setResult({ state: 'ready', info });
      },
      (error: unknown) => {
        if (!cancelled) setResult({ state: 'error', problem: requestProblem(error) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [code, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { result, reload };
}

export function ProblemCard({ problem, onRetry }: { problem: JoinProblem; onRetry?: () => void }) {
  const copy = problemCopy(problem);
  return (
    <Panel className="max-w-[520px]">
      <h1 className="m-0 text-4xl text-white">{copy.title}</h1>
      <p className="m-0 text-base text-text-2">{copy.message}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {onRetry && <Button onClick={onRetry}>REINTENTAR</Button>}
        <Link to="/" className="no-underline">
          <Button variant="liberal">VOLVER AL INICIO</Button>
        </Link>
      </div>
    </Panel>
  );
}

export function Loading({ text }: { text: string }) {
  return (
    <div role="status" className="animate-pulse font-display text-3xl text-text-2">
      {text}
    </div>
  );
}
