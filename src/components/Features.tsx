import { CalendarIcon, CheckIcon, LockIcon, UserIcon } from './Icons';

export function Features() {
  return (
    <section id="como" className="mx-auto max-w-6xl scroll-mt-6 px-5 pb-20 pt-4 sm:pb-24" aria-labelledby="como-title">
      <div className="mb-10 max-w-2xl">
        <h2 id="como-title" className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          Pensado para que nada quede en el aire
        </h2>
        <p className="mt-4 text-lg text-ink-soft">
          Después de una reunión, lo que importa cabe en una pantalla.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <article className="card p-6 md:col-span-2">
          <h3 className="text-xl font-bold tracking-[-0.02em]">Decisiones, separadas del ruido</h3>
          <p className="mt-2 text-ink-soft">
            Lo que se acordó queda aparte de la conversación, para que nadie tenga que adivinarlo.
          </p>
          <div className="mt-5 flex gap-3 rounded-xl bg-[#ecfdf5] p-3.5">
            <span className="mt-0.5 text-mint-ink">
              <CheckIcon size={18} />
            </span>
            <span className="font-semibold leading-snug">Mantener el onboarding en tres pasos</span>
          </div>
        </article>

        <article className="card p-6 md:col-span-2">
          <h3 className="text-xl font-bold tracking-[-0.02em]">Cada tarea con dueño y fecha</h3>
          <p className="mt-2 text-ink-soft">
            Detecta quién se comprometió y para cuándo, también cuando se dice con otras palabras.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="chip chip--sky">
              <UserIcon size={14} />
              Lucía
            </span>
            <span className="chip chip--amber">
              <CalendarIcon size={14} />
              Jueves
            </span>
            <span className="chip chip--amber">
              <CalendarIcon size={14} />
              Antes del 20 de noviembre
            </span>
            <span className="chip chip--plain">Sin responsable</span>
          </div>
        </article>

        <article className="card p-6 md:col-span-1">
          <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#075985]">
            <LockIcon size={20} />
          </span>
          <h3 className="text-lg font-bold tracking-[-0.02em]">Se queda en tu navegador</h3>
          <p className="mt-2 text-sm text-ink-soft">El texto no sale de tu dispositivo.</p>
        </article>

        <article className="card p-6 md:col-span-3">
          <h3 className="text-xl font-bold tracking-[-0.02em]">Listo para pegar donde trabajas</h3>
          <p className="mt-2 text-ink-soft">
            Copia el resumen como Markdown y llévalo a tu gestor de tareas, a un documento o a un correo.
          </p>
          <pre className="code-block mt-5" aria-label="Ejemplo de resumen en Markdown">
            {`## Tareas
- [ ] Preparar el texto de ese aviso (Responsable: Lucía · Fecha: Jueves)
- [ ] Subir la versión de prueba a TestFlight (Responsable: Diego · Fecha: Mañana)`}
          </pre>
        </article>
      </div>
    </section>
  );
}
