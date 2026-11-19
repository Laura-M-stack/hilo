import { summarize } from '../lib/summarize';
import { SAMPLE_TRANSCRIPT } from '../lib/sample';
import { CalendarIcon, UserIcon } from './Icons';

interface Props {
  onTry: () => void;
}

// La tarjeta decorativa usa el resultado real de la reunión de ejemplo.
const preview = summarize(SAMPLE_TRANSCRIPT);

export function Hero({ onTry }: Props) {
  const decision = preview.decisions[0];
  const tasks = preview.tasks.slice(0, 3);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="aurora" aria-hidden="true">
        <span className="blob blob--sky" />
        <span className="blob blob--mint" />
        <span className="blob blob--amber" />
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 pb-24 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="chip chip--plain mb-6 bg-white/80">Resúmenes de reuniones</p>
          <h1
            id="hero-title"
            className="text-[2.5rem] font-bold leading-[1.05] tracking-[-0.03em] sm:text-6xl"
          >
            Las reuniones terminan. Los <span className="gradient-word">pendientes</span> no se pierden.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-soft">
            Pega la transcripción e Hilo separa lo que se decidió de lo que hay que hacer, con responsable y
            fecha para cada tarea.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button type="button" className="btn btn-primary" onClick={onTry}>
              Probar con una reunión de ejemplo
            </button>
            <a href="#como" className="inline-flex min-h-[44px] items-center font-semibold text-ink underline underline-offset-4">
              Ver cómo funciona
            </a>
          </div>
        </div>

        <div className="card p-6 sm:p-7" aria-hidden="true">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-soft">Reunión de producto</p>
            <span className="chip chip--mint">Resumen listo</span>
          </div>

          {decision ? (
            <div className="mb-5 rounded-xl bg-[#ecfdf5] p-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#065f46]">Decisión</p>
              <p className="font-semibold leading-snug">{decision}</p>
            </div>
          ) : null}

          <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Tareas</p>
          <ul className="space-y-3">
            {tasks.map((t) => (
              <li key={t.text} className="rounded-xl border border-line p-3.5">
                <p className="mb-2 font-semibold leading-snug">{t.text}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="chip chip--sky">
                    <UserIcon size={14} />
                    {t.owner ?? 'Sin responsable'}
                  </span>
                  {t.due ? (
                    <span className="chip chip--amber">
                      <CalendarIcon size={14} />
                      {t.due}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
