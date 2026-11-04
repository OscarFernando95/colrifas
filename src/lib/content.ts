export interface Draw {
  id: string;
  date: string;
  prize: string;
  winner: string;
  images: string[];
}
export interface SiteContent {
  whatsappUrl: string;
  nextDraw: { date: string; prize: string; note: string };
  draws: Draw[];
}

export const IMAGE_PATH = /^\/evidencias\/[a-z0-9][a-z0-9-]{0,80}\.(jpg|png|webp)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9-]{1,40}$/;
const text = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.length <= max ? v.trim() : null;

/** Valida lo que llega del navegador y devuelve solo los campos conocidos. */
export function parseContent(input: any): { ok: true; value: SiteContent } | { ok: false; error: string } {
  const whatsappUrl = text(input?.whatsappUrl, 300);
  if (!whatsappUrl || !/^https:\/\/(chat\.whatsapp\.com|wa\.me)\//.test(whatsappUrl)) {
    return { ok: false, error: 'El link de WhatsApp debe empezar por https://chat.whatsapp.com/ o https://wa.me/' };
  }
  const nd = input?.nextDraw;
  const nextDraw = { date: text(nd?.date, 10), prize: text(nd?.prize, 200), note: text(nd?.note, 300) };
  if (nextDraw.date === null || nextDraw.prize === null || nextDraw.note === null || (nextDraw.date && !DATE.test(nextDraw.date))) {
    return { ok: false, error: 'Revisa los datos del próximo sorteo.' };
  }
  if (!Array.isArray(input?.draws) || input.draws.length > 500) return { ok: false, error: 'Lista de sorteos inválida.' };
  const draws: Draw[] = [];
  const seen = new Set<string>();
  for (const d of input.draws) {
    const id = text(d?.id, 40), date = text(d?.date, 10), prize = text(d?.prize, 200), winner = text(d?.winner, 300);
    if (!id || !ID.test(id) || seen.has(id) || !date || !DATE.test(date) || prize === null || winner === null) {
      return { ok: false, error: 'Revisa los sorteos realizados: cada uno necesita una fecha válida.' };
    }
    if (!Array.isArray(d.images) || d.images.length > 20 || !d.images.every((i: unknown) => typeof i === 'string' && IMAGE_PATH.test(i))) {
      return { ok: false, error: 'Imágenes inválidas en un sorteo.' };
    }
    seen.add(id);
    draws.push({ id, date, prize, winner, images: d.images });
  }
  draws.sort((a, b) => b.date.localeCompare(a.date));
  return { ok: true, value: { whatsappUrl, nextDraw: { date: nextDraw.date!, prize: nextDraw.prize!, note: nextDraw.note! }, draws } };
}
