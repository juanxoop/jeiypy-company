/**
 * Texto seguro para enviar a la base de datos.
 *
 * `String.slice` cuenta unidades UTF-16: al recortar un texto con emojis (👗, 🚀…) puede partir un
 * carácter por la mitad y dejar un "sustituto suelto". JavaScript lo tolera, pero Supabase
 * (PostgREST/Postgres) rechaza el cuerpo completo con 400 "Empty or invalid json" (PGRST102),
 * y el lead no se guarda. Por eso todo recorte de texto del visitante pasa por aquí.
 */

const SURROGATE = /[\uD800-\uDFFF]/;

/** Elimina sustitutos UTF-16 sueltos (sin su pareja) y conserva los emojis completos. */
export function wellFormed(value: string): string {
  if (!SURROGATE.test(value)) return value;
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += value[i] + value[i + 1];
        i++;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue;
    out += value[i];
  }
  return out;
}

/** Recorta a `max` unidades sin partir emojis ni dejar caracteres inválidos. */
export function safeSlice(value: string, max: number): string {
  return wellFormed(value.length > max ? value.slice(0, max) : value);
}
