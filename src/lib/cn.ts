type ClassValue = string | false | null | undefined;

/** Une clases condicionales sin dependencias externas. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
