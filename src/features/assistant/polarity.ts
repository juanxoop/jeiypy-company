/**
 * Lectura de la postura del visitante ante una pregunta: afirma, niega o duda.
 *
 * No compara frases completas: busca SEÑALES y las combina.
 * - Afirmación: palabras de acuerdo ("claro", "dale", "de una", "perfecto") y verbos de interés o
 *   necesidad en cualquier forma ("me encanta", "me serviría", "lo necesito", "hagámoslo").
 * - Negación: "no", "nah", "nunca", "tampoco"… Niega el verbo de interés que tenga cerca
 *   ("no me interesa") o cuenta sola si no niega nada ("la verdad no", "eso no").
 * - Duda: "no sé", "tal vez", "depende", "déjame pensarlo"… Se inclina hacia un lado si además
 *   hay señales de interés ("sí me llama la atención, pero depende").
 * - Para después: "por ahora", "más adelante", "primero algo sencillo"… Matiza la respuesta.
 *
 * Tolera errores de escritura frecuentes: letras repetidas ("siii", "claroo"), sin tildes,
 * abreviaturas de chat ("q", "tb", "nose") y errores de una letra en las palabras largas.
 */
import { normalize } from "./normalize";

export type Polarity = "positive" | "negative" | "uncertain";

export type PolarityReading = {
  polarity?: Polarity;
  /** La respuesta pospone: "sí, aunque primero algo sencillo", "no por ahora", "más adelante". */
  later: boolean;
  /** Si duda, hacia dónde se inclina. */
  lean?: "positive" | "negative";
  /** La única señal es un "no" suelto: puede ser un dato ("Instagram pero no web"), no una respuesta. */
  bareNegation?: boolean;
};

/** Abreviaturas y variantes de chat → forma estándar. */
const SLANG: Record<string, string> = {
  q: "que",
  k: "que",
  xq: "porque",
  pq: "porque",
  porq: "porque",
  tb: "tambien",
  tmb: "tambien",
  tbn: "tambien",
  tambn: "tambien",
  bn: "bien",
  ps: "pues",
  nose: "no se",
  nc: "no se",
  ns: "no se",
  sip: "si",
  sep: "si",
  sisas: "si",
  zi: "si",
  nop: "no",
  nope: "no",
  nel: "no",
  nah: "no",
  naa: "no",
  oki: "ok",
  okey: "ok",
  okay: "ok",
  talvez: "tal vez",
  talves: "tal vez",
  ves: "vez",
  quizas: "quiza",
  kiza: "quiza",
  kizas: "quiza",
  obvi: "obvio",
  deuna: "de una",
};

/** Colapsa letras repetidas ("siii" → "si", "claroo" → "claro"); se aplica igual al léxico. */
const squeeze = (value: string) => value.replace(/([a-zñ])\1+/g, "$1");

function prepare(raw: string): string {
  const words = normalize(raw)
    .trim()
    .split(" ")
    .map((w) => SLANG[squeeze(w)] ?? SLANG[w] ?? w);
  return ` ${squeeze(words.join(" "))} `;
}

const lexicon = (items: string[]) => items.map((item) => squeeze(item));

/** Acuerdo explícito. */
const AGREE = lexicon([
  "si", "claro", "obvio", "dale", "listo", "ok", "vale", "va", "perfecto", "genial", "excelente", "buenisimo", "chevere",
  "bacano", "super", "correcto", "exacto", "afirmativo", "hagamoslo", "hagamosle", "hagale", "hagamos", "adelante", "sale",
]);
/** Frases de acuerdo o interés de varias palabras. */
const AGREE_PHRASES = lexicon([
  "de una", "por supuesto", "con gusto", "me llama la atencion", "llama la atencion", "suena bien", "suena genial",
  "suena interesante", "me parece bien", "me parece buena idea", "buena idea", "me late", "me apunto", "vamos con eso",
  "eso me sirve", "me vendria bien", "vendria bien", "seria ideal", "seria genial", "seria bueno", "hace falta",
]);
/** Verbos de interés, gusto o necesidad (formas completas, no raíces: "servicio" no es "servir"). */
const WANT = lexicon([
  "gusta", "gustan", "gustaria", "gustarian", "gusto", "encanta", "encantan", "encantaria", "encanto", "interesa", "interesan",
  "interesaria", "interesante", "sirve", "sirven", "serviria", "servirian", "servirme", "sirva", "conviene", "convendria",
  "quiero", "quisiera", "queremos", "querria", "necesito", "necesitaria", "necesitamos", "necesita", "requiero", "agrada",
  "agradaria", "animo", "incluyelo", "incluyamoslo", "agregalo", "sumalo",
]);
/** Palabras largas donde un error de una letra se corrige ("intereza", "nesesito", "perfeto"). */
const FUZZY = lexicon(["gustaria", "encanta", "encantaria", "interesa", "interesaria", "serviria", "convendria", "necesito", "necesitaria", "hagamoslo", "perfecto", "excelente", "buenisimo"]);

/** Palabras que acompañan un "no" sin darle otro sentido ("no gracias"). */
const FILLERS = new Set(["gracias", "porfa", "senor", "senora", "bro", "man", "hermano", "amigo", "amiga"]);
const NEGATORS = new Set(["no", "nunca", "jamas", "tampoco", "ningun", "ninguno", "ninguna", "ni"]);
const NEGATIVE_PHRASES = lexicon(["claro que no", "obvio que no", "por supuesto que no", "para nada", "ni loco", "nada de eso", "ni de riesgos", "de ninguna manera", "mejor no", "que no"]);

/** Duda. Las de la primera lista se inclinan a favor ("puede ser"). */
const UNSURE_LEANING_YES = lexicon(["puede ser", "podria ser", "puede que", "probablemente", "posiblemente", "a lo mejor", "de pronto", "capaz", "quiza", "tal vez"]);
const UNSURE = lexicon([
  "no se", "ni idea", "no estoy seguro", "no estoy segura", "no tengo claro", "no lo tengo claro", "no sabria", "depende",
  "lo pienso", "lo voy a pensar", "pensarlo", "dejame pensar", "tengo que pensar", "no lo he pensado", "no he decidido",
  "no lo he decidido", "no estoy convencido", "no estoy convencida", "mm", "hm", "veremos", "mas o menos",
]);
/** Para después (matiza sí o no). */
const LATER = lexicon([
  "por ahora", "por el momento", "de momento", "mas adelante", "despues", "luego", "todavia no", "aun no", "ahora no",
  "no ahora", "en otra etapa", "segunda etapa", "primero", "poco a poco", "algo sencillo", "algo simple", "algo basico",
  "lo basico", "lo esencial", "arrancar sencillo", "empezar sencillo", "comenzar sencillo", "arrancar simple", "empezar simple",
  "mas sencillo", "mas simple", "mas basico", "sencillito", "algo pequeno", "empezar pequeno", "empezar con poco", "lo minimo",
]);

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    // Transposición de letras vecinas ("gustaira").
    if (a[i] === b[j + 1] && a[i + 1] === b[j] && a.length === b.length) {
      i += 2;
      j += 2;
      continue;
    }
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const isWant = (word: string) => WANT.includes(word) || (word.length >= 7 && FUZZY.some((w) => editDistanceAtMostOne(word, w)));

/** Reemplaza cada frase encontrada por una marca (así su "no" no cuenta dos veces) y devuelve cuántas hubo. */
function consume(t: string, phrases: string[], mark: string): [string, number] {
  let count = 0;
  let out = t;
  for (const phrase of [...phrases].sort((a, b) => b.length - a.length)) {
    const needle = ` ${phrase} `;
    while (out.includes(needle)) {
      out = out.replace(needle, ` ${mark} `);
      count++;
    }
  }
  return [out, count];
}

export function readPolarity(raw: string): PolarityReading {
  // El orden importa: "no sé" es duda (no negación) y "todavía no" es "para después".
  const [t1, unsure] = consume(prepare(raw), UNSURE, "_duda_");
  const [t2, unsureYes] = consume(t1, UNSURE_LEANING_YES, "_quiza_");
  const [t3, later] = consume(t2, LATER, "_luego_");
  const [t4, negPhrases] = consume(t3, NEGATIVE_PHRASES, "_nop_");
  const [t, agreePhrases] = consume(t4, AGREE_PHRASES, "_ok_");

  // Señales en orden, por cláusula: un "no" niega un verbo de interés cercano en su misma cláusula.
  const signals: ("pos" | "neg")[] = [];
  // "no" seguido de un dato ("no web", "no tengo página"): puede ser información, no una respuesta.
  let negationsBeforeContent = 0;
  for (let n = 0; n < agreePhrases; n++) signals.push("pos");
  for (let n = 0; n < negPhrases; n++) signals.push("neg");
  for (const clause of t.split(/ (?:pero|aunque|sino|solo que|y) /)) {
    const words = clause.trim().split(" ").filter(Boolean);
    const usedNegator = new Set<number>();
    words.forEach((word, i) => {
      const positive = AGREE.includes(word) || isWant(word);
      if (!positive) return;
      // "si" tras "no" no es afirmación ("no, si no quiero") salvo "eso sí".
      const negIndex = [i - 1, i - 2, i - 3].find((k) => k >= 0 && NEGATORS.has(words[k]));
      if (negIndex !== undefined && word !== "si") {
        usedNegator.add(negIndex);
        signals.push("neg");
      } else signals.push("pos");
    });
    words.forEach((word, i) => {
      if (!NEGATORS.has(word) || usedNegator.has(i)) return;
      signals.push("neg");
      const next = words[i + 1];
      if (next && !NEGATORS.has(next) && !FILLERS.has(next) && !next.startsWith("_")) negationsBeforeContent++;
    });
  }

  const pos = signals.filter((s) => s === "pos").length;
  const neg = signals.filter((s) => s === "neg").length;
  const lean = pos + unsureYes > neg ? "positive" : neg > pos ? "negative" : undefined;

  if (unsure > 0 || (unsureYes > 0 && pos === 0 && neg === 0)) return { polarity: "uncertain", later: later > 0, lean };
  if (pos > neg) return { polarity: "positive", later: later > 0 };
  if (neg > pos) return { polarity: "negative", later: later > 0, bareNegation: pos === 0 && negPhrases === 0 && later === 0 && negationsBeforeContent === neg };
  if (pos > 0) {
    // Empate ("no… bueno sí"): manda la última señal, como en una conversación.
    return { polarity: signals[signals.length - 1] === "pos" ? "positive" : "negative", later: later > 0 };
  }
  // Solo "para después" ("por ahora prefiero arrancar sencillo"): lo pospone.
  if (later > 0) return { polarity: "negative", later: true };
  return { polarity: undefined, later: false };
}
