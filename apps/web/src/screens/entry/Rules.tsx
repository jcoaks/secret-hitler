import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { art } from '../../lib/assets';
import { EntryShell } from './parts';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-[clamp(26px,4vw,34px)] text-orange-hover">{title}</h2>
      <div className="flex flex-col gap-2 text-[16px] leading-relaxed text-text-2 [&_strong]:text-white">
        {children}
      </div>
    </section>
  );
}

/** The rules, summarized from the official rulebook: the /reglas page and the in-game dialog. */
export function RulesContent() {
  return (
    <div className="flex flex-col gap-7 text-left">
      <Section title="Los equipos">
        <p className="m-0">
          Cada jugador recibe en secreto un rol: <strong>liberal</strong>, <strong>fascista</strong>{' '}
          o <strong>Hitler</strong>. Los liberales son mayoría, pero no saben quién es quién. Los
          fascistas se conocen entre sí y saben quién es Hitler. Con 5 o 6 jugadores, Hitler también
          conoce al fascista; con 7 o más, Hitler no sabe quiénes son.
        </p>
        <ul className="m-0 pl-5">
          <li>5 jugadores: 3 liberales, 1 fascista y Hitler.</li>
          <li>6: 4 liberales · 7: 4 liberales y 2 fascistas · 8: 5 y 2.</li>
          <li>9: 5 liberales y 3 fascistas · 10: 6 y 3. Siempre hay un Hitler.</li>
        </ul>
      </Section>

      <Section title="Cómo se gana">
        <p className="m-0">
          <strong>Liberales:</strong> aprobando cinco políticas liberales o ejecutando a Hitler.
        </p>
        <p className="m-0">
          <strong>Fascistas:</strong> aprobando seis políticas fascistas, o eligiendo a Hitler
          canciller cuando ya hay tres o más políticas fascistas aprobadas.
        </p>
      </Section>

      <Section title="La elección">
        <p className="m-0">
          La presidencia pasa en orden. El presidente nomina a un canciller y todos votan{' '}
          <strong>¡Ja!</strong> o <strong>Nein</strong>. Si gana el sí por mayoría, se forma
          gobierno; un empate rechaza.
        </p>
        <p className="m-0">
          No se puede nominar a quien fue presidente o canciller del último gobierno elegido (con
          solo cinco jugadores vivos, únicamente al último canciller).
        </p>
        <p className="m-0">
          Cada gobierno rechazado avanza el <strong>contador electoral</strong>. Al tercero, el país
          cae en el caos: se aprueba la primera política del mazo, sin poderes, y se olvidan los
          límites de mandato.
        </p>
      </Section>

      <Section title="La sesión legislativa">
        <div className="flex justify-center gap-3">
          <img src={art.policy.liberal} alt="Política liberal" className="w-24" />
          <img src={art.policy.fascist} alt="Política fascista" className="w-24" />
        </div>
        <p className="m-0">
          El presidente roba tres políticas, descarta una en secreto y pasa dos al canciller, que
          aprueba una. El mazo tiene 6 liberales y 11 fascistas; con menos de tres cartas, los
          descartes se barajan de nuevo. Cualquiera puede mentir sobre lo que vio.
        </p>
        <p className="m-0">
          Con cinco políticas fascistas se desbloquea el <strong>veto</strong>: si canciller y
          presidente están de acuerdo, se descartan ambas y avanza el contador electoral.
        </p>
      </Section>

      <Section title="Poderes presidenciales">
        <p className="m-0">
          Algunas políticas fascistas dan un poder al presidente, según el tablero (5–6, 7–8 o 9–10
          jugadores):
        </p>
        <ul className="m-0 pl-5">
          <li>
            <strong>Investigación:</strong> ves la afiliación de un jugador. Nadie se investiga dos
            veces.
          </li>
          <li>
            <strong>Espiar:</strong> ves las tres próximas políticas del mazo.
          </li>
          <li>
            <strong>Elección especial:</strong> eliges al próximo presidente; luego la presidencia
            vuelve a tu izquierda.
          </li>
          <li>
            <strong>Ejecución:</strong> eliminas a un jugador. Si era Hitler, ganan los liberales.
            Los ejecutados no hablan, no votan ni se postulan.
          </li>
        </ul>
      </Section>
    </div>
  );
}

/** /reglas */
export function RulesScreen() {
  return (
    <EntryShell>
      <article className="flex w-full max-w-[760px] flex-col gap-7 bg-bg-dark px-6 py-8 sm:px-10">
        <h1 className="m-0 text-center text-[clamp(34px,6vw,52px)] text-white">CÓMO SE JUEGA</h1>

        <RulesContent />

        <p className="m-0 text-center text-[13px] text-text-2">
          Reglamento completo:{' '}
          <a
            href="https://www.secrethitler.com/assets/Secret_Hitler_Rules.pdf"
            className="text-orange-hover"
          >
            secrethitler.com
          </a>
          .{' '}
          <Link to="/" className="text-orange-hover">
            Volver al inicio
          </Link>
        </p>
      </article>
    </EntryShell>
  );
}
