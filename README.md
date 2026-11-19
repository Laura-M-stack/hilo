# Hilo

Landing de demostración de una app ficticia que convierte la transcripción de una reunión en decisiones, tareas con responsable y fecha, y un resumen listo para copiar. Estética **aurora claro**: fondo casi blanco, gradientes suaves de cielo, menta y ámbar, y el botón principal en tinta oscura. Es parte de mi portfolio y no es un producto real.

**Sitio:** https://laura-m-stack.github.io/hilo/

## Qué incluye

- Demo funcional: se pega una transcripción con el formato «Nombre: lo que dijo» (o se usa la reunión de ejemplo) y aparecen decisiones, tareas, temas más mencionados y una frase de resumen.
- Tareas con casilla para marcarlas como listas, con responsable y fecha detectados del texto.
- Botón para copiar el resumen como Markdown.
- Todo se procesa en el navegador; el texto no se envía a ningún servidor.

## Cómo "entiende" el texto

No usa un modelo de IA: es un lector basado en reglas (`src/lib/summarize.ts`), y la propia página lo aclara. Reconoce, por ejemplo:

- Decisiones: «decidimos…», «acordamos…», «quedamos en…», «vamos a lanzar…».
- Tareas propias: «voy a…», «me encargo de…», «te mando…».
- Tareas de otra persona: «Marta se encarga de…», «Diego envía…», «Lucía, ¿puedes…?» (solo si esa persona habla en la transcripción).
- Tareas sin dueño: «hay que…», «tenemos que…».
- Fechas: «para el viernes», «mañana», «antes del 20 de noviembre», «la semana que viene», «a fin de mes».
- Ignora preguntas, negaciones («no voy a poder…») y frases hipotéticas («si quieres…»).

## Stack

React 19, Vite 7, TypeScript estricto, Tailwind CSS 4 y Vitest. La lógica del resumen son funciones puras sin dependencias.

## Estructura

```
src/
  lib/summarize.ts     Lectura de la transcripción, decisiones, tareas, fechas y Markdown
  lib/sample.ts        Reunión de ejemplo (ficticia)
  components/          Hero, Demo, Features, Logo, Icons
  App.tsx              Página
  index.css            Tokens (tema de Tailwind) y estilos propios
```

## Scripts

```powershell
npm install
npm run dev
npm test          # 42 pruebas del lector de reuniones
npm run check     # tsc
npm run build     # salida en dist/
```

## Decisiones

- **Sin acento de matiz propio.** El rosa y el violeta ya se usan en otros proyectos del portfolio; la aurora decora (cielo, menta, ámbar) y el botón principal es casi negro. Los tonos de texto son versiones oscuras de cada color para cumplir contraste AA.
- **Aurora solo en el hero.** El resto de la página es neutro; los gradientes reaparecen en los bordes de las tarjetas.
- **Movimiento mínimo.** Los blobs se desplazan muy lento con `transform` y se detienen con `prefers-reduced-motion`.
- **Una sola tipografía** (Plus Jakarta Sans, tres pesos) con `display=swap`.
- **Accesibilidad.** Foco visible, áreas táctiles de al menos 44 px, enlace para saltar a la demo y foco que pasa al título del resultado.
