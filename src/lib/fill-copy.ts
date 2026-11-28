/**
 * Rellena marcadores `{nombre}` en todo el texto (strings anidados, arrays), sin mutar el original.
 * Un marcador sin valor lanza: un error tipográfico en el copy no debe llegar a la web.
 */
export function fillCopy<T>(value: T, vars: Readonly<Record<string, string>>): T {
  if (typeof value === 'string') {
    return value.replace(/\{([a-z][a-zA-Z0-9]*)\}/g, (_, key: string) => {
      const v = vars[key];
      if (v === undefined) throw new Error(`Marcador de copy sin valor: {${key}}`);
      return v;
    }) as T;
  }
  if (Array.isArray(value)) return value.map((v) => fillCopy(v, vars)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillCopy(v, vars)])) as T;
  }
  return value;
}
