/** Los tres premios de cada sorteo, según qué cifras de la lotería del día coincidan. */
export const PRIZE_KEYS = ['last2', 'first2', 'middle2'] as const;
export type PrizeKey = (typeof PRIZE_KEYS)[number];
export const PRIZE_LABELS: Record<PrizeKey, string> = {
  last2: 'Dos últimas cifras',
  first2: 'Dos primeras cifras',
  middle2: 'Dos del medio',
};

export interface NextDraw {
  id: string;
  date: string;
  /** Solo los premios con valor: un premio vacío "no cuenta". */
  prizes: Partial<Record<PrizeKey, string>>;
  note: string;
}
export interface DrawResult {
  prize: string;
  winner: string;
}
export interface Draw {
  id: string;
  date: string;
  /** Resultado de la lotería (4 cifras); vacío si no se registró. */
  number: string;
  note: string;
  results: Partial<Record<PrizeKey, DrawResult>>;
  images: string[];
}
export interface Testimonial {
  id: string;
  name: string;
  text: string;
  /** Ruta de la foto, o vacío. */
  image: string;
}
export interface SiteContent {
  whatsappUrl: string;
  nextDraw: NextDraw | null;
  draws: Draw[];
  testimonials: Testimonial[];
}

export const IMAGE_PATH = /^\/evidencias\/[a-z0-9][a-z0-9-]{0,80}\.(jpg|png|webp)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9-]{1,40}$/;
const text = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.length <= max ? v.trim() : null;

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

function parsePrizes(input: any): Partial<Record<PrizeKey, string>> | null {
  const out: Partial<Record<PrizeKey, string>> = {};
  for (const k of PRIZE_KEYS) {
    const v = text(input?.[k] ?? '', 120);
    if (v === null) return null;
    if (v) out[k] = v;
  }
  return out;
}

function parseNextDraw(d: any): { ok: true; value: NextDraw } | Fail {
  const id = text(d?.id, 40), date = text(d?.date, 10), note = text(d?.note ?? '', 300);
  const prizes = parsePrizes(d?.prizes);
  if (!id || !ID.test(id) || !date || !DATE.test(date) || note === null || !prizes) return fail('Revisa los datos del próximo sorteo.');
  if (!Object.keys(prizes).length) return fail('El próximo sorteo necesita al menos un premio.');
  return { ok: true, value: { id, date, prizes, note } };
}

function parseDraw(d: any): { ok: true; value: Draw } | Fail {
  const id = text(d?.id, 40), date = text(d?.date, 10), number = text(d?.number ?? '', 4), note = text(d?.note ?? '', 600);
  if (!id || !ID.test(id) || !date || !DATE.test(date) || note === null || number === null || (number && !/^\d{4}$/.test(number))) {
    return fail('Revisa un sorteo realizado: necesita fecha, y el resultado de la lotería son 4 cifras.');
  }
  const results: Draw['results'] = {};
  for (const k of PRIZE_KEYS) {
    const r = d?.results?.[k];
    if (!r) continue;
    const prize = text(r.prize ?? '', 120), winner = text(r.winner ?? '', 300);
    if (prize === null || winner === null) return fail('Revisa los premios o ganadores de un sorteo.');
    if (prize) results[k] = { prize, winner };
  }
  if (!Array.isArray(d?.images) || d.images.length > 20 || !d.images.every((i: unknown) => typeof i === 'string' && IMAGE_PATH.test(i))) {
    return fail('Imágenes inválidas en un sorteo.');
  }
  return { ok: true, value: { id, date, number: number ?? '', note, results, images: d.images } };
}

function parseTestimonial(t: any): { ok: true; value: Testimonial } | Fail {
  const id = text(t?.id, 40), name = text(t?.name ?? '', 80), body = text(t?.text ?? '', 600);
  const image = typeof t?.image === 'string' ? t.image : '';
  if (!id || !ID.test(id) || name === null || body === null || (image && !IMAGE_PATH.test(image))) return fail('Revisa un testimonio.');
  if (!body && !image) return fail('Un testimonio necesita un texto o una foto.');
  return { ok: true, value: { id, name, text: body, image } };
}

/** Valida el contenido completo y devuelve solo los campos conocidos. */
export function parseContent(input: any): { ok: true; value: SiteContent } | Fail {
  const whatsappUrl = text(input?.whatsappUrl, 300);
  if (!whatsappUrl || !/^https:\/\/(chat\.whatsapp\.com|wa\.me)\//.test(whatsappUrl)) {
    return fail('El link de WhatsApp debe empezar por https://chat.whatsapp.com/ o https://wa.me/');
  }
  let nextDraw: NextDraw | null = null;
  if (input?.nextDraw) {
    const r = parseNextDraw(input.nextDraw);
    if (!r.ok) return r;
    nextDraw = r.value;
  }
  if (!Array.isArray(input?.draws) || input.draws.length > 500) return fail('Lista de sorteos inválida.');
  if (!Array.isArray(input?.testimonials) || input.testimonials.length > 500) return fail('Lista de testimonios inválida.');

  const ids = new Set<string>();
  const draws: Draw[] = [];
  for (const d of input.draws) {
    const r = parseDraw(d);
    if (!r.ok) return r;
    if (ids.has(r.value.id)) return fail('Hay dos sorteos con el mismo identificador.');
    ids.add(r.value.id);
    draws.push(r.value);
  }
  draws.sort((a, b) => b.date.localeCompare(a.date));

  const testimonials: Testimonial[] = [];
  for (const t of input.testimonials) {
    const r = parseTestimonial(t);
    if (!r.ok) return r;
    if (ids.has(r.value.id)) return fail('Hay dos elementos con el mismo identificador.');
    ids.add(r.value.id);
    testimonials.push(r.value);
  }
  return { ok: true, value: { whatsappUrl, nextDraw, draws, testimonials } };
}

/** Todas las fotos que el contenido usa (para saber cuáles agregar o borrar del repo). */
export function imagesOf(c: SiteContent): Set<string> {
  return new Set([...c.draws.flatMap((d) => d.images), ...c.testimonials.map((t) => t.image).filter(Boolean)]);
}
