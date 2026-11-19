import { describe, expect, it } from 'vitest';
import {
  MAX_CHARS,
  findDue,
  norm,
  parseTranscript,
  plural,
  summarize,
  toMarkdown,
} from './summarize';
import { SAMPLE_TRANSCRIPT } from './sample';

const due = (s: string) => findDue(norm(s))?.label ?? null;

describe('parseTranscript', () => {
  it('separa por hablante y une las líneas sin nombre al turno anterior', () => {
    const turns = parseTranscript('Ana: Hola a todos.\nsigo con la idea\nBeto: De acuerdo.');
    expect(turns).toHaveLength(2);
    expect(turns[0]).toEqual({ speaker: 'Ana', text: 'Hola a todos. sigo con la idea' });
    expect(turns[1]).toEqual({ speaker: 'Beto', text: 'De acuerdo.' });
  });

  it('acepta marcas de tiempo antes del nombre', () => {
    const turns = parseTranscript('[00:03] Ana: Hola\n(01:10:22) Beto: Chau\n02:05 Cami: Listo');
    expect(turns.map((t) => t.speaker)).toEqual(['Ana', 'Beto', 'Cami']);
  });

  it('no toma "Agenda:" ni "Nota:" como si fueran personas', () => {
    const turns = parseTranscript('Ana: Empezamos.\nAgenda: revisar el presupuesto');
    expect(turns).toHaveLength(1);
    expect(turns[0]?.text).toContain('Agenda: revisar el presupuesto');
  });

  it('un texto sin nombres queda como un solo turno sin hablante', () => {
    const turns = parseTranscript('Hoy hablamos del plan.\nHay que cerrar el presupuesto.');
    expect(turns).toHaveLength(1);
    expect(turns[0]?.speaker).toBeNull();
  });

  it('acepta saltos de línea de Windows y líneas vacías', () => {
    expect(parseTranscript('Ana: Hola\r\n\r\nBeto: Chau\r\n')).toHaveLength(2);
  });
});

describe('findDue', () => {
  it('reconoce días de la semana, con y sin "para el"', () => {
    expect(due('Lo envío para el viernes')).toBe('Viernes');
    expect(due('Lo envío el miércoles')).toBe('Miércoles');
    expect(due('Lo envío para sabado')).toBe('Sábado');
  });

  it('conserva "antes del" para no cambiar el sentido', () => {
    expect(due('Hay que avisar antes del viernes')).toBe('Antes del viernes');
    expect(due('Hay que avisar antes del 20 de noviembre')).toBe('Antes del 20 de noviembre');
  });

  it('reconoce fechas con mes', () => {
    expect(due('Sale el 15 de marzo')).toBe('15 de marzo');
    expect(due('Sale para el 3 de setiembre')).toBe('3 de setiembre');
  });

  it('mañana (día) no se confunde con "la mañana"', () => {
    expect(due('Lo subo mañana')).toBe('Mañana');
    expect(due('Nos vemos por la mañana')).toBeNull();
    expect(due('Esta mañana hablé con Ana')).toBeNull();
  });

  it('reconoce hoy, esta semana, próxima semana y fin de mes', () => {
    expect(due('Lo cierro hoy')).toBe('Hoy');
    expect(due('Lo termino esta semana')).toBe('Esta semana');
    expect(due('Lo vemos la semana que viene')).toBe('Próxima semana');
    expect(due('Lo vemos la próxima semana')).toBe('Próxima semana');
    expect(due('Se paga a fin de mes')).toBe('Fin de mes');
  });

  it('devuelve null si no hay fecha', () => {
    expect(due('Hay que revisar el contrato')).toBeNull();
  });
});

describe('tareas', () => {
  it('primera persona: el responsable es quien habla', () => {
    const s = summarize('Ana: Voy a enviar el informe el lunes.\nBeto: Perfecto.');
    expect(s.tasks).toEqual([{ text: 'Enviar el informe', owner: 'Ana', due: 'Lunes' }]);
  });

  it('"me encargo de" con sustantivo quita el artículo', () => {
    const s = summarize('Ana: Me encargo de la propuesta para el viernes.\nBeto: Dale.');
    expect(s.tasks[0]).toEqual({ text: 'Propuesta', owner: 'Ana', due: 'Viernes' });
  });

  it('tercera persona con un participante conocido', () => {
    const s = summarize('Ana: Beto se encarga de revisar el contrato.\nBeto: Ok.');
    expect(s.tasks[0]).toEqual({ text: 'Revisar el contrato', owner: 'Beto', due: null });
  });

  it('verbo conjugado en tercera persona pasa a infinitivo', () => {
    const s = summarize('Ana: Beto envía la factura el martes.\nBeto: Ok.');
    expect(s.tasks[0]).toEqual({ text: 'Enviar la factura', owner: 'Beto', due: 'Martes' });
  });

  it('pedido directo con pregunta: "Beto, ¿puedes…?"', () => {
    const s = summarize('Ana: Beto, ¿puedes preparar la presentación para el jueves?\nBeto: Claro.');
    expect(s.tasks[0]).toEqual({ text: 'Preparar la presentación', owner: 'Beto', due: 'Jueves' });
  });

  it('"hay que" y "tenemos que" quedan sin responsable', () => {
    const s = summarize('Ana: Hay que cerrar el presupuesto antes del 10 de mayo.\nBeto: Y tenemos que avisar a soporte.');
    expect(s.tasks).toEqual([
      { text: 'Cerrar el presupuesto', owner: null, due: 'Antes del 10 de mayo' },
      { text: 'Avisar a soporte', owner: null, due: null },
    ]);
  });

  it('"te mando X" se convierte en "Enviar X"', () => {
    const s = summarize('Ana: Te mando el resumen mañana.\nBeto: Gracias.');
    expect(s.tasks[0]).toEqual({ text: 'Enviar el resumen', owner: 'Ana', due: 'Mañana' });
  });

  it('ignora preguntas, negaciones e hipótesis', () => {
    const s = summarize(
      [
        'Ana: ¿Quién se encarga de la tienda?',
        'Beto: No voy a poder enviar el informe.',
        'Ana: Si quieres, voy a revisar el contrato.',
        'Beto: Quizás voy a llamar al cliente.',
        'Ana: Ok, seguimos.',
      ].join('\n'),
    );
    expect(s.tasks).toHaveLength(0);
  });

  it('"Sí, me encargo" (afirmación con tilde) cuenta como tarea', () => {
    const s = summarize('Ana: ¿Alguien arma el informe?\nBeto: Sí, me encargo de armar el informe.');
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0]?.owner).toBe('Beto');
  });

  it('no duplica la misma tarea dicha dos veces; conserva la fecha', () => {
    const s = summarize(
      'Ana: Beto se encarga de revisar el contrato.\nBeto: Voy a revisar el contrato para el viernes.\nAna: Ok.',
    );
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0]).toEqual({ text: 'Revisar el contrato', owner: 'Beto', due: 'Viernes' });
  });

  it('funciona con texto sin tildes ni mayúsculas en los verbos', () => {
    const s = summarize('Maria: voy a enviar el informe manana\nJose: dale');
    expect(s.tasks[0]).toEqual({ text: 'Enviar el informe', owner: 'Maria', due: 'Mañana' });
  });

  it('un nombre que no participó no se toma como responsable', () => {
    const s = summarize('Ana: Carlos envía la factura el martes.\nBeto: Ok.');
    expect(s.tasks).toHaveLength(0);
  });

  it('recorta acciones muy largas', () => {
    const largo = 'x'.repeat(8) + ' ' + 'palabra '.repeat(40);
    const s = summarize(`Ana: Voy a revisar ${largo}.\nBeto: Ok.`);
    expect((s.tasks[0]?.text.length ?? 0) <= 121).toBe(true);
    expect(s.tasks[0]?.text.endsWith('…')).toBe(true);
  });
});

describe('decisiones', () => {
  it('detecta "decidimos", "acordamos" y "quedamos en"', () => {
    const s = summarize(
      'Ana: Decidimos lanzar en marzo. Acordamos pedir feedback. Quedamos en que Beto prepara el plan.\nBeto: Ok.',
    );
    expect(s.decisions).toHaveLength(3);
    expect(s.decisions[0]).toBe('Decidimos lanzar en marzo');
  });

  it('una decisión puede generar además una tarea con responsable', () => {
    const s = summarize('Ana: Quedamos en que Beto envía la propuesta el viernes.\nBeto: Ok.');
    expect(s.decisions).toHaveLength(1);
    expect(s.tasks[0]).toEqual({ text: 'Enviar la propuesta', owner: 'Beto', due: 'Viernes' });
  });

  it('ignora decisiones negadas, condicionales y preguntas', () => {
    const s = summarize(
      'Ana: Todavía no decidimos el precio. ¿Acordamos el viernes? Si quieres, decidimos mañana.\nBeto: Ok.',
    );
    expect(s.decisions).toHaveLength(0);
  });

  it('no repite decisiones idénticas', () => {
    const s = summarize('Ana: Decidimos lanzar en marzo.\nBeto: Decidimos lanzar en marzo.');
    expect(s.decisions).toHaveLength(1);
  });
});

describe('resumen general', () => {
  it('texto vacío o demasiado corto devuelve un resumen vacío', () => {
    expect(summarize('').isEmpty).toBe(true);
    expect(summarize('   \n  ').isEmpty).toBe(true);
    expect(summarize('Ana: Hola').isEmpty).toBe(true);
    expect(toMarkdown(summarize(''))).toBe('');
  });

  it('marca el recorte cuando el texto supera el máximo', () => {
    const s = summarize(`Ana: ${'hablamos de cosas importantes '.repeat(1000)}`);
    expect(s.truncated).toBe(true);
    expect(MAX_CHARS).toBe(20000);
  });

  it('cuenta participantes sin repetirlos (sin importar tildes)', () => {
    const s = summarize('Ana María: Hola a todos hoy.\nBeto: Hola.\nAna María: Seguimos con el tema.');
    expect(s.participants).toEqual(['Ana María', 'Beto']);
    expect(s.turns).toBe(3);
  });

  it('explica qué probar cuando no encuentra nada', () => {
    const s = summarize('Ana: Hoy hablamos del clima.\nBeto: Hace calor en la oficina.');
    expect(s.isEmpty).toBe(false);
    expect(s.overview).toContain('No se detectaron decisiones ni tareas claras');
  });

  it('singular y plural en la frase de resumen', () => {
    const uno = summarize('Ana: Decidimos lanzar en marzo. Voy a armar el plan.\nBeto: Ok.');
    expect(uno.overview).toContain('1 decisión y 1 tarea, todas con responsable');
    const sin = summarize('Ana: Hay que cerrar el plan.\nBeto: Ok.');
    expect(sin.overview).toContain('0 decisiones y 1 tarea, ninguna con responsable');
  });

  it('plural()', () => {
    expect(plural(1, 'tarea', 'tareas')).toBe('1 tarea');
    expect(plural(0, 'tarea', 'tareas')).toBe('0 tareas');
    expect(plural(3, 'tarea', 'tareas')).toBe('3 tareas');
  });

  it('temas: solo palabras que se repiten, sin nombres ni palabras vacías', () => {
    const s = summarize(
      'Ana: El presupuesto del proyecto preocupa.\nBeto: El presupuesto crece. Hablemos del presupuesto con Ana.\nAna: El proyecto avanza bien.',
    );
    expect(s.topics).toContain('presupuesto');
    expect(s.topics).toContain('proyecto');
    expect(s.topics).not.toContain('beto');
  });

  it('la lectura estimada nunca baja de 1 minuto', () => {
    expect(summarize('Ana: Decidimos lanzar hoy.\nBeto: Ok perfecto.').readMinutes).toBe(1);
  });
});

describe('reunión de ejemplo', () => {
  const s = summarize(SAMPLE_TRANSCRIPT);

  it('encuentra 4 participantes, 3 decisiones y 5 tareas', () => {
    expect(s.participants).toEqual(['Marta', 'Diego', 'Lucía', 'Sofía']);
    expect(s.decisions).toHaveLength(3);
    expect(s.tasks).toHaveLength(5);
  });

  it('asigna responsables y fechas esperadas', () => {
    const byText = (t: string) => s.tasks.find((x) => x.text.startsWith(t));
    expect(byText('Preparar el texto')).toEqual({
      text: 'Preparar el texto de ese aviso',
      owner: 'Lucía',
      due: 'Jueves',
    });
    expect(byText('Subir la versión')?.owner).toBe('Diego');
    expect(byText('Avisar al equipo')?.owner).toBeNull();
    expect(byText('Avisar al equipo')?.due).toBe('Antes del 20 de noviembre');
    expect(byText('Guía de preguntas')?.owner).toBe('Sofía');
    expect(byText('Enviar las capturas')?.owner).toBe('Marta');
  });

  it('no toma "no voy a poder…" ni la pregunta de la tienda como tareas', () => {
    expect(s.tasks.some((t) => /poder|ficha/i.test(t.text))).toBe(false);
  });
});

describe('toMarkdown', () => {
  it('arma secciones solo con lo que hay', () => {
    const md = toMarkdown(summarize('Ana: Decidimos lanzar en marzo.\nBeto: Ok, gracias.'));
    expect(md).toContain('# Resumen de la reunión');
    expect(md).toContain('## Decisiones');
    expect(md).not.toContain('## Tareas');
    expect(md.endsWith('\n')).toBe(true);
  });

  it('marca las tareas como casillas, con responsable y fecha', () => {
    const md = toMarkdown(summarize('Ana: Voy a enviar el informe el lunes.\nBeto: Ok.'));
    expect(md).toContain('- [ ] Enviar el informe (Responsable: Ana · Fecha: Lunes)');
  });

  it('indica "Sin responsable" cuando no hay dueño', () => {
    const md = toMarkdown(summarize('Ana: Hay que cerrar el plan.\nBeto: Ok.'));
    expect(md).toContain('(Sin responsable)');
  });
});
