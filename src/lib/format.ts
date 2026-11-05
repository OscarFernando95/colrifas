import type { PrizeKey } from './content';

export const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

/** "300000" → "$300.000"; si ya viene con formato propio, se respeta. */
export const money = (v: string) => (/^\d+$/.test(v) ? `$${Number(v).toLocaleString('es-CO')}` : v);

/** Las dos cifras ganadoras de un premio, a partir del resultado de la lotería de 4 cifras. */
export function pairOf(number: string, key: PrizeKey): string {
  if (!/^\d{4}$/.test(number)) return '';
  return { last2: number.slice(2), first2: number.slice(0, 2), middle2: number.slice(1, 3) }[key];
}
