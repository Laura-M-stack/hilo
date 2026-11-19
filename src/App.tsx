import { useState } from 'react';
import { Demo } from './components/Demo';
import { Features } from './components/Features';
import { Hero } from './components/Hero';
import { Logo } from './components/Logo';

export default function App() {
  const [signal, setSignal] = useState(0);

  const tryExample = () => {
    setSignal((n) => n + 1);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('demo')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <>
      <a className="skip-link" href="#demo">
        Saltar a la demo
      </a>

      <p className="bg-ink px-5 py-2.5 text-center text-sm text-white">
        Proyecto de demostración: Hilo es un producto ficticio.
      </p>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <a href="#top" aria-label="Hilo, inicio" className="inline-flex min-h-[44px] items-center">
          <Logo />
        </a>
        <nav aria-label="Principal" className="flex items-center gap-1 text-sm font-semibold">
          <a href="#demo" className="inline-flex min-h-[44px] items-center px-3">
            Demo
          </a>
          <a href="#como" className="inline-flex min-h-[44px] items-center px-3">
            Cómo funciona
          </a>
        </nav>
      </header>

      <main id="top">
        <Hero onTry={tryExample} />
        <Demo signal={signal} />
        <Features />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>
            <strong className="text-ink">Hilo</strong> · Sitio de demostración. Hilo es un producto ficticio.
            Diseño y desarrollo: Laura Moyano.
          </p>
          <a
            href="https://github.com/Laura-M-stack/hilo"
            className="inline-flex min-h-[44px] items-center font-semibold text-ink underline underline-offset-4"
          >
            Ver el código
          </a>
        </div>
      </footer>
    </>
  );
}
