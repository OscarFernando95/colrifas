import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { APIContext } from 'astro';
import { env } from './env';

export const COOKIE = 'colrifas_admin';
const SESSION_SECONDS = 60 * 60 * 8;

const sha = (v: string) => createHash('sha256').update(v).digest();
const sign = (v: string) => createHmac('sha256', env('ADMIN_SECRET')).update(v).digest('base64url');

/** El panel queda apagado si faltan las variables: nunca se abre "por defecto". */
export function adminConfigured(): boolean {
  return env('ADMIN_USER').length >= 3 && env('ADMIN_PASSWORD').length >= 8 && env('ADMIN_SECRET').length >= 16;
}

/** Compara usuario y contraseña siempre los dos, para no revelar cuál falló. */
export function credentialsMatch(user: string, password: string): boolean {
  const okUser = timingSafeEqual(sha(user), sha(env('ADMIN_USER')));
  const okPass = timingSafeEqual(sha(password), sha(env('ADMIN_PASSWORD')));
  return okUser && okPass;
}

export function makeSession(): { value: string; maxAge: number } {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return { value: `${exp}.${sign(exp)}`, maxAge: SESSION_SECONDS };
}

export function isAuthed(ctx: Pick<APIContext, 'cookies'>): boolean {
  if (!adminConfigured()) return false;
  const raw = ctx.cookies.get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, mac] = raw.split('.');
  if (!exp || !mac || Number(exp) < Date.now() / 1000) return false;
  const good = Buffer.from(sign(exp));
  const got = Buffer.from(mac);
  return good.length === got.length && timingSafeEqual(good, got);
}

/** Las peticiones que modifican algo deben venir de nuestro propio sitio y como JSON. */
export function sameOriginJson(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin || new URL(origin).host !== new URL(request.url).host) return false;
  return (request.headers.get('content-type') ?? '').startsWith('application/json');
}

// Freno básico a la fuerza bruta (por instancia del servidor; suficiente con una contraseña larga).
const fails = new Map<string, { n: number; until: number }>();
export function throttled(ip: string): boolean {
  const f = fails.get(ip);
  return !!f && f.n >= 5 && f.until > Date.now();
}
export function registerFail(ip: string) {
  const f = fails.get(ip);
  const n = (f && f.until > Date.now() ? f.n : 0) + 1;
  fails.set(ip, { n, until: Date.now() + 15 * 60 * 1000 });
}
export function clearFails(ip: string) {
  fails.delete(ip);
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
