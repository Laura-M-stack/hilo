// Resumidor de reuniones basado en reglas (sin IA ni red).
// Lee una transcripción con líneas "Nombre: texto" y separa decisiones, tareas
// (con responsable y fecha cuando se puede) y temas frecuentes.

export interface Task {
  text: string;
  owner: string | null;
  due: string | null;
}

export interface Summary {
  isEmpty: boolean;
  truncated: boolean;
  participants: string[];
  turns: number;
  words: number;
  readMinutes: number;
  overview: string;
  decisions: string[];
  tasks: Task[];
  topics: string[];
}

export const MAX_CHARS = 20000;

interface Turn {
  speaker: string | null;
  text: string;
}

const NOT_SPEAKERS = new Set([
  'agenda',
  'nota',
  'notas',
  'importante',
  'resumen',
  'tema',
  'temas',
  'objetivo',
  'acuerdos',
  'pendientes',
  'fecha',
  'asistentes',
  'ojo',
  'link',
  'enlace',
]);

const TURN_RE =
  /^\s*(?:[[(]?\d{1,2}:\d{2}(?::\d{2})?[\])]?\s*[-–]?\s*)?(\p{Lu}[\p{L}'.-]*(?:\s\p{Lu}[\p{L}'.-]*)?)\s*:\s*(\S.*)$/u;

/** Minúsculas y sin tildes. Conserva la longitud para poder cortar el texto original. */
export function norm(s: string): string {
  return s
    .normalize('NFC')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function listWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function parseTranscript(raw: string): Turn[] {
  const lines = raw
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const turns: Turn[] = [];
  for (const line of lines) {
    const m = TURN_RE.exec(line);
    const name = m?.[1];
    if (m && name && !NOT_SPEAKERS.has(norm(name))) {
      turns.push({ speaker: name, text: (m[2] ?? '').trim() });
    } else if (turns.length > 0) {
      const last = turns[turns.length - 1]!;
      last.text = `${last.text} ${line}`;
    } else {
      turns.push({ speaker: null, text: line });
    }
  }
  return turns;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------- fechas ----------

const WEEKDAY_LABEL: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};
const WEEKDAYS = Object.keys(WEEKDAY_LABEL);
const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

interface DueMatch {
  label: string;
  start: number;
  end: number;
}

/** Busca una fecha en la oración normalizada (sin tildes, en minúsculas). */
export function findDue(n: string): DueMatch | null {
  const months = MONTHS.join('|');
  const days = WEEKDAYS.join('|');
  const tries: Array<[RegExp, (m: RegExpExecArray) => string]> = [
    [
      new RegExp(`\\b(para el|antes del|hasta el|el)\\s+(\\d{1,2})\\s+de\\s+(${months})\\b`),
      (m) => `${m[1] === 'antes del' ? 'Antes del ' : ''}${m[2]} de ${m[3]}`,
    ],
    [
      new RegExp(`\\b(para el|antes del|hasta el|el|este|para este)\\s+(${days})\\b`),
      (m) => {
        const day = WEEKDAY_LABEL[m[2]!] ?? '';
        return m[1] === 'antes del' ? `Antes del ${day.toLowerCase()}` : day;
      },
    ],
    [new RegExp(`\\bpara\\s+(${days})\\b`), (m) => WEEKDAY_LABEL[m[1]!] ?? ''],
    [/(?<!\bla\s)(?<!\besta\s)(?<!\bde\s)\bmanana\b/, () => 'Mañana'],
    [/\bhoy\b/, () => 'Hoy'],
    [/\b(?:para\s+)?esta\s+semana\b/, () => 'Esta semana'],
    [
      /\b(?:para\s+)?(?:la\s+)?(?:semana\s+(?:proxima|que viene|siguiente)|proxima\s+semana)\b/,
      () => 'Próxima semana',
    ],
    [/\b(?:a\s+)?fin(?:es)?\s+(?:de|del)\s+mes\b/, () => 'Fin de mes'],
  ];
  for (const [re, label] of tries) {
    const m = re.exec(n);
    if (m) return { label: capitalize(label(m)), start: m.index, end: m.index + m[0].length };
  }
  return null;
}

// ---------- tareas ----------

const VERBS3: Record<string, string> = {
  envia: 'Enviar',
  manda: 'Enviar',
  prepara: 'Preparar',
  arma: 'Armar',
  revisa: 'Revisar',
  escribe: 'Escribir',
  redacta: 'Redactar',
  contacta: 'Contactar',
  agenda: 'Agendar',
  actualiza: 'Actualizar',
  publica: 'Publicar',
  presenta: 'Presentar',
  llama: 'Llamar a',
  define: 'Definir',
  termina: 'Terminar',
  entrega: 'Entregar',
  sube: 'Subir',
  confirma: 'Confirmar',
};

const INFINITIVE_RE = /^\p{L}+(?:ar|er|ir|arse|erse|irse)\b/u;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface RawTask {
  owner: string | null;
  /** Posición, dentro de la oración, donde empieza la acción. */
  start: number;
  /** Verbo a anteponer cuando la oración no trae el infinitivo ("te mando X" -> "Enviar X"). */
  prefix: string;
}

function matchTask(
  n: string,
  speaker: string | null,
  names: Map<string, string>,
): RawTask | null {
  const nameAlt = [...names.keys()].map(escapeRe).join('|');
  const at = (owner: string | null, m: RegExpExecArray, group: number, prefix = ''): RawTask => ({
    owner,
    start: m.indices?.[group]?.[0] ?? m.index,
    prefix,
  });

  if (nameAlt) {
    // "Lucía, ¿puedes preparar el texto?"
    const addressed = new RegExp(
      `(?:^|\\s)(${nameAlt}),\\s*¿?\\s*(?:puedes|podrias|podes)\\s+(.+?)\\??$`,
      'd',
    ).exec(n);
    if (addressed) return at(names.get(addressed[1]!) ?? null, addressed, 2);

    const selfOf = new RegExp(
      `\\b(${nameAlt})\\s+(?:se\\s+(?:encarga|ocupa|hace cargo)\\s+de|queda a cargo de)\\s+(.+)$`,
      'd',
    ).exec(n);
    if (selfOf) return at(names.get(selfOf[1]!) ?? null, selfOf, 2);

    const goes = new RegExp(`\\b(${nameAlt})\\s+(?:va a|tiene que|debe)\\s+(.+)$`, 'd').exec(n);
    if (goes) return at(names.get(goes[1]!) ?? null, goes, 2);

    const verbAlt = Object.keys(VERBS3).join('|');
    const verb = new RegExp(`\\b(${nameAlt})\\s+(${verbAlt})\\s+(.+)$`, 'd').exec(n);
    if (verb) return at(names.get(verb[1]!) ?? null, verb, 3, `${VERBS3[verb[2]!]} `);
  }

  const own: Array<[RegExp, string]> = [
    [/\b(?:yo\s+)?voy a\s+(.+)$/d, ''],
    [/\b(?:yo\s+)?me (?:encargo|ocupo|hago cargo) de\s+(.+)$/d, ''],
    [/\bpuedo (?:encargarme|ocuparme) de\s+(.+)$/d, ''],
    [/\b(?:te|les|os)\s+(?:mando|envio|paso)\s+(.+)$/d, 'Enviar '],
  ];
  for (const [re, prefix] of own) {
    const m = re.exec(n);
    if (m) return at(speaker, m, 1, prefix);
  }

  const open: RegExp[] = [/\bhay que\s+(.+)$/d, /\btenemos que\s+(.+)$/d, /\bdeberiamos\s+(.+)$/d];
  for (const re of open) {
    const m = re.exec(n);
    if (m) return at(null, m, 1);
  }
  return null;
}

function cleanText(s: string): string {
  let t = s
    .replace(/[¿?!¡]+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(?:bueno|ok|dale|entonces|genial|perfecto|bien|sí)[,.]?\s+/i, '')
    .replace(/\s*,?\s*por favor\s*$/i, '')
    .replace(/[\s,.;:]+$/g, '')
    .trim();
  if (t.length > 120) {
    const cut = t.slice(0, 120);
    t = `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 60))}…`;
  }
  return t;
}

function taskText(action: string): string {
  let t = cleanText(action).replace(/^que\s+/i, '');
  if (!INFINITIVE_RE.test(norm(t)) && !/^(Enviar|Preparar|Armar|Revisar|Escribir|Redactar|Contactar|Agendar|Actualizar|Publicar|Presentar|Llamar|Definir|Terminar|Entregar|Subir|Confirmar)\b/.test(t)) {
    // Sustantivo: "la guía de preguntas" -> "Guía de preguntas"
    t = t.replace(/^(?:el|la|los|las|un|una)\s+/i, '');
  }
  return capitalize(t);
}

/** Texto de la acción sin la fecha (la fecha va aparte, como etiqueta). */
function actionOf(sentence: string, found: RawTask, due: DueMatch | null): string {
  let action = sentence.slice(found.start);
  if (due && due.start >= found.start) {
    action = `${sentence.slice(found.start, due.start)} ${sentence.slice(due.end)}`;
  }
  return `${found.prefix}${action}`.replace(/\s+/g, ' ').trim();
}

function sameTask(a: Task, b: Task): boolean {
  const ka = norm(a.text).replace(/\b(el|la|los|las|un|una|de|del|al)\b/g, '').replace(/\s+/g, ' ').trim();
  const kb = norm(b.text).replace(/\b(el|la|los|las|un|una|de|del|al)\b/g, '').replace(/\s+/g, ' ').trim();
  if (ka === kb) return true;
  if (a.owner && b.owner && a.owner === b.owner) return ka.includes(kb) || kb.includes(ka);
  return false;
}

// ---------- decisiones ----------

const DECISION_RE =
  /\b(?:decidimos|acordamos|aprobamos|resolvimos|confirmamos|quedamos en|queda decidido|quedo decidido|queda aprobado|quedo aprobado|nos quedamos con|vamos a (?:ir con|usar|lanzar|priorizar|dejar|cambiar|migrar|adoptar|mantener|pedir))\b/;
const NEGATED_DECISION_RE = /\b(?:no|todavia no|aun no|ya no)\s+(?:decidimos|acordamos|aprobamos|resolvimos|confirmamos)\b/;
const NEGATED_TASK_RE = /\bno\s+(?:voy|puedo|me encargo|me ocupo|tengo)\b/;
const HEDGE_RE = /\b(?:quizas|tal vez|capaz|a lo mejor)\b/;

// ---------- temas ----------

const STOP = new Set(
  `sobre tenemos porque entonces vamos puede puedes hacer cuando donde tambien ahora estamos tiene hemos queda bueno
  nosotros ustedes algunos algunas despues antes luego siempre todos todas cosas mismo misma tanto desde hasta entre
  parte pueden podemos quiero quieres puedo nuestro nuestra debemos deberiamos gracias perfecto genial claro buenos
  buenas dias manana semana decidimos acordamos quedamos encargo ocupo falta faltan todavia aunque parece estoy estan
  estaba estaban hacemos hicimos pasar algo alguien nadie cada otro otra otros otras primero segundo tercero ultimo
  ultima ultimos tengo tienen tenia habia hubo seria sería podria podrian necesitamos necesito quedan queda hablar
  aviso avisar mando paso lunes martes miercoles jueves viernes sabado domingo enero febrero marzo abril mayo junio
  julio agosto septiembre setiembre octubre noviembre diciembre sigue seguir mejor menos tiempo veces vamos dijo
  dice dicen dijeron creo creemos viene vienen sino mientras durante segun hacia contra sobre ademas aqui alli
  tampoco quiza proxima proximo proximos esta estos estas ellos ellas aquello eso esos esas`.split(/\s+/),
);

function topicsOf(turns: Turn[], participants: string[]): string[] {
  const skip = new Set(participants.flatMap((p) => norm(p).split(/\s+/)));
  const counts = new Map<string, { n: number; first: number; label: string }>();
  let order = 0;
  for (const turn of turns) {
    const original = turn.text.normalize('NFC');
    const normalized = norm(original);
    for (const m of normalized.matchAll(/[a-z]{5,}/g)) {
      const word = m[0];
      if (STOP.has(word) || skip.has(word)) continue;
      const label = original.slice(m.index, m.index + word.length).toLowerCase();
      const cur = counts.get(word);
      if (cur) cur.n += 1;
      else counts.set(word, { n: 1, first: order++, label });
    }
  }
  return [...counts.values()]
    .filter((c) => c.n >= 2)
    .sort((a, b) => b.n - a.n || a.first - b.first)
    .slice(0, 5)
    .map((c) => c.label);
}

// ---------- resumen ----------

export function summarize(input: string): Summary {
  const truncated = input.length > MAX_CHARS;
  const raw = truncated ? input.slice(0, MAX_CHARS) : input;
  const turns = parseTranscript(raw);

  const participants: string[] = [];
  const names = new Map<string, string>();
  for (const t of turns) {
    if (!t.speaker) continue;
    const key = norm(t.speaker);
    if (!participants.some((p) => norm(p) === key)) participants.push(t.speaker);
    const first = key.split(/\s+/)[0] ?? key;
    if (!names.has(first)) names.set(first, t.speaker);
  }

  const words = turns.reduce((acc, t) => acc + (t.text.match(/\S+/g)?.length ?? 0), 0);
  const empty: Summary = {
    isEmpty: true,
    truncated,
    participants,
    turns: turns.length,
    words,
    readMinutes: 0,
    overview: '',
    decisions: [],
    tasks: [],
    topics: [],
  };
  if (words < 3) return empty;

  const decisions: string[] = [];
  const tasks: Task[] = [];

  for (const turn of turns) {
    for (const sentence of splitSentences(turn.text)) {
      const n = norm(sentence);
      const isQuestion = /^¿/.test(sentence) || /\?$/.test(sentence);
      const hypothetical = /^si\b/i.test(sentence) || HEDGE_RE.test(n);

      if (!isQuestion && !hypothetical && DECISION_RE.test(n) && !NEGATED_DECISION_RE.test(n)) {
        const text = capitalize(cleanText(sentence));
        if (text && !decisions.some((d) => norm(d) === norm(text))) decisions.push(text);
      }

      const addressed = /,\s*¿?\s*(?:puedes|podrias|podes)\s/.test(n);
      if ((isQuestion && !addressed) || hypothetical || NEGATED_TASK_RE.test(n)) continue;

      const found = matchTask(n, turn.speaker, names);
      if (!found) continue;
      const aligned = n.length === sentence.length;
      const due = aligned ? findDue(n) : null;
      const text = taskText(actionOf(sentence, found, due));
      if (text.length < 3) continue;

      const task: Task = { text, owner: found.owner, due: due?.label ?? null };
      const dupIndex = tasks.findIndex((t) => sameTask(t, task));
      if (dupIndex === -1) {
        tasks.push(task);
      } else {
        const prev = tasks[dupIndex]!;
        tasks[dupIndex] = {
          text: prev.text,
          owner: prev.owner ?? task.owner,
          due: prev.due ?? task.due,
        };
      }
    }
  }

  const topics = topicsOf(turns, participants);
  const owned = tasks.filter((t) => t.owner).length;

  const parts: string[] = [];
  parts.push(
    participants.length > 0
      ? `Reunión de ${plural(participants.length, 'persona', 'personas')}: ${listWithAnd(participants)}.`
      : 'Transcripción sin nombres de participantes.',
  );
  if (decisions.length === 0 && tasks.length === 0) {
    parts.push('No se detectaron decisiones ni tareas claras. Prueba con frases como «decidimos…» o «me encargo de…».');
  } else {
    const d = plural(decisions.length, 'decisión', 'decisiones');
    const t = plural(tasks.length, 'tarea', 'tareas');
    let who = '';
    if (tasks.length > 0) {
      who =
        owned === tasks.length
          ? ', todas con responsable'
          : owned === 0
            ? ', ninguna con responsable'
            : `, ${owned} con responsable`;
    }
    parts.push(`Se registraron ${d} y ${t}${who}.`);
  }
  if (topics.length > 0) parts.push(`Temas más mencionados: ${topics.join(', ')}.`);

  return {
    isEmpty: false,
    truncated,
    participants,
    turns: turns.length,
    words,
    readMinutes: Math.max(1, Math.ceil(words / 200)),
    overview: parts.join(' '),
    decisions,
    tasks,
    topics,
  };
}

export function toMarkdown(s: Summary): string {
  if (s.isEmpty) return '';
  const lines: string[] = ['# Resumen de la reunión', '', s.overview];
  if (s.decisions.length > 0) {
    lines.push('', '## Decisiones');
    for (const d of s.decisions) lines.push(`- ${d}`);
  }
  if (s.tasks.length > 0) {
    lines.push('', '## Tareas');
    for (const t of s.tasks) {
      const meta = [t.owner ? `Responsable: ${t.owner}` : 'Sin responsable', t.due ? `Fecha: ${t.due}` : null]
        .filter(Boolean)
        .join(' · ');
      lines.push(`- [ ] ${t.text} (${meta})`);
    }
  }
  return `${lines.join('\n')}\n`;
}
