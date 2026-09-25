/**
 * Normalización de texto libre en español: minúsculas, sin tildes ni signos, espacios simples y
 * espacios en los extremos (así " no " se busca como palabra completa).
 */
export function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(?<!\d)[.,]|[.,](?!\d)/g, " ")
    .replace(/[¿?¡!;:()"'$]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}
