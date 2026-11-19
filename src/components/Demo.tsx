import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { MAX_CHARS, plural, summarize, toMarkdown } from '../lib/summarize';
import type { Summary } from '../lib/summarize';
import { SAMPLE_TRANSCRIPT } from '../lib/sample';
import { CalendarIcon, CheckIcon, CopyIcon, UserIcon } from './Icons';

interface Props {
  /** Sube cada vez que se pide cargar la reunión de ejemplo desde fuera. */
  signal: number;
}

type CopyState = 'idle' | 'ok' | 'fail';

const fmt = new Intl.NumberFormat('es');

export function Demo({ signal }: Props) {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  const [copy, setCopy] = useState<CopyState>('idle');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusPending = useRef(false);
  const fieldId = useId();
  const helpId = useId();

  const run = (value: string) => {
    if (!value.trim()) {
      setSummary(null);
      setMessage('Pega una transcripción o usa la reunión de ejemplo.');
      return;
    }
    const result = summarize(value);
    if (result.isEmpty) {
      setSummary(null);
      setMessage('Necesito algo más de texto. Pega varias líneas con el formato «Nombre: lo que dijo».');
      return;
    }
    setMessage(null);
    setSummary(result);
    setDone(new Set());
    setCopy('idle');
    focusPending.current = true;
  };

  // Mueve el foco al título del resultado para que lectores de pantalla lo anuncien.
  useEffect(() => {
    if (focusPending.current && summary) {
      focusPending.current = false;
      headingRef.current?.focus();
    }
  }, [summary]);

  useEffect(() => {
    if (signal > 0) {
      setText(SAMPLE_TRANSCRIPT);
      run(SAMPLE_TRANSCRIPT);
    }
    // `run` solo usa setters y refs; se ejecuta únicamente cuando cambia la señal.
  }, [signal]);

  useEffect(() => {
    if (copy !== 'ok') return;
    const id = window.setTimeout(() => setCopy('idle'), 2500);
    return () => window.clearTimeout(id);
  }, [copy]);

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value);

  const toggle = (index: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const copyMarkdown = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(toMarkdown(summary));
      setCopy('ok');
    } catch {
      setCopy('fail');
    }
  };

  const clear = () => {
    setText('');
    setSummary(null);
    setMessage(null);
    setDone(new Set());
    setCopy('idle');
  };

  const over = text.length > MAX_CHARS;

  return (
    <section id="demo" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-16 sm:py-20" aria-labelledby="demo-title">
      <div className="mb-10 max-w-2xl">
        <h2 id="demo-title" className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
          Pega una reunión, recibe lo importante
        </h2>
        <p className="mt-4 text-lg text-ink-soft">
          Todo ocurre en tu navegador: el texto no se envía a ningún servidor.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5 sm:p-6 lg:self-start">
          <label htmlFor={fieldId} className="mb-2 block font-semibold">
            Transcripción
          </label>
          <textarea
            id={fieldId}
            className="field"
            value={text}
            onChange={onChange}
            aria-describedby={helpId}
            placeholder={'Marta: Buenos días a todos.\nDiego: Yo voy a subir la versión de prueba mañana.'}
            spellCheck={false}
          />
          <p id={helpId} className="mt-2 text-sm text-ink-soft">
            Una línea por turno, con el formato «Nombre: lo que dijo».{' '}
            <span className={over ? 'font-semibold text-amber-ink' : ''}>
              {fmt.format(text.length)} / {fmt.format(MAX_CHARS)} caracteres
              {over ? '. Se usarán solo los primeros 20.000.' : ''}
            </span>
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" onClick={() => run(text)}>
              Resumir reunión
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setText(SAMPLE_TRANSCRIPT);
                run(SAMPLE_TRANSCRIPT);
              }}
            >
              Usar ejemplo
            </button>
            <button type="button" className="btn btn-ghost" onClick={clear}>
              Limpiar
            </button>
          </div>

          <p className="mt-5 rounded-xl bg-[#f4f4fb] p-4 text-sm text-ink-soft">
            Esta demo lee el texto con reglas simples, no con un modelo de IA. Funciona mejor con frases como
            «decidimos…», «me encargo de…» o «Marta se encarga de…».
          </p>
        </div>

        <div className="card p-5 sm:p-6" role="region" aria-label="Resumen de la reunión">
          {summary ? (
            <Result
              summary={summary}
              done={done}
              onToggle={toggle}
              onCopy={copyMarkdown}
              copy={copy}
              headingRef={headingRef}
            />
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-start justify-center">
              <h3 className="text-xl font-bold tracking-[-0.02em]">Tu resumen aparecerá aquí</h3>
              <p className="mt-2 text-ink-soft" role={message ? 'status' : undefined}>
                {message ?? 'Verás las decisiones, las tareas con responsable y fecha, y los temas más mencionados.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

interface ResultProps {
  summary: Summary;
  done: ReadonlySet<number>;
  onToggle: (index: number) => void;
  onCopy: () => void;
  copy: CopyState;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

function Result({ summary, done, onToggle, onCopy, copy, headingRef }: ResultProps) {
  const finished = summary.tasks.filter((_, i) => done.has(i)).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-bold tracking-[-0.02em] outline-offset-4"
        >
          Resumen de la reunión
        </h3>
        <div className="flex flex-wrap gap-2">
          <span className="chip chip--plain">{plural(summary.participants.length, 'persona', 'personas')}</span>
          <span className="chip chip--plain">{fmt.format(summary.words)} palabras</span>
        </div>
      </div>

      <p className="mt-3 text-ink-soft">{summary.overview}</p>
      {summary.truncated ? (
        <p className="mt-2 text-sm font-semibold text-amber-ink">
          El texto era muy largo: se resumieron los primeros {fmt.format(MAX_CHARS)} caracteres.
        </p>
      ) : null}

      <h4 className="mb-3 mt-7 text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">
        Decisiones ({summary.decisions.length})
      </h4>
      {summary.decisions.length > 0 ? (
        <ul className="space-y-2.5">
          {summary.decisions.map((d) => (
            <li key={d} className="flex gap-3 rounded-xl bg-[#ecfdf5] p-3.5">
              <span className="mt-0.5 text-mint-ink">
                <CheckIcon size={18} />
              </span>
              <span className="font-semibold leading-snug">{d}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">No se detectaron decisiones.</p>
      )}

      <div className="mb-3 mt-7 flex items-baseline justify-between gap-3">
        <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">
          Tareas ({summary.tasks.length})
        </h4>
        {summary.tasks.length > 0 ? (
          <p className="text-sm text-ink-soft">
            {finished} de {summary.tasks.length} listas
          </p>
        ) : null}
      </div>
      {summary.tasks.length > 0 ? (
        <ul className="space-y-3">
          {summary.tasks.map((t, i) => {
            const checked = done.has(i);
            return (
              <li key={`${t.text}-${i}`} className="rounded-xl border border-line p-3.5">
                <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="task-check mt-0.5"
                    checked={checked}
                    onChange={() => onToggle(i)}
                  />
                  <span className={`font-semibold leading-snug ${checked ? 'text-ink-soft line-through' : ''}`}>
                    {t.text}
                  </span>
                </label>
                <div className="-mt-1.5 flex flex-wrap gap-2 pl-[34px]">
                  <span className={`chip ${t.owner ? 'chip--sky' : 'chip--plain'}`}>
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
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">No se detectaron tareas.</p>
      )}

      {summary.topics.length > 0 ? (
        <>
          <h4 className="mb-3 mt-7 text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">Temas</h4>
          <ul className="flex flex-wrap gap-2">
            {summary.topics.map((topic) => (
              <li key={topic} className="chip chip--plain">
                {topic}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-secondary" onClick={onCopy}>
          <CopyIcon size={18} />
          Copiar como Markdown
        </button>
        <span className="text-sm font-semibold text-ink-soft" role="status">
          {copy === 'ok' ? 'Copiado al portapapeles.' : ''}
          {copy === 'fail' ? 'No se pudo copiar. Selecciona el texto y cópialo a mano.' : ''}
        </span>
      </div>
    </div>
  );
}
