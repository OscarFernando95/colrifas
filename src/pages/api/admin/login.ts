import type { APIRoute } from 'astro';
import { COOKIE, adminConfigured, clearFails, credentialsMatch, json, makeSession, registerFail, sameOriginJson, throttled } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  if (!adminConfigured() || !sameOriginJson(request)) return json({ error: 'No disponible' }, 403);
  const ip = clientAddress || request.headers.get('x-forwarded-for') || 'x';
  if (throttled(ip)) return json({ error: 'Demasiados intentos. Espera 15 minutos.' }, 429);

  const body = await request.json().catch(() => null);
  const user = typeof body?.user === 'string' ? body.user : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!credentialsMatch(user, password)) {
    registerFail(ip);
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: 'Usuario o contraseña incorrectos.' }, 401);
  }
  clearFails(ip);
  const s = makeSession();
  cookies.set(COOKIE, s.value, { httpOnly: true, secure: !import.meta.env.DEV, sameSite: 'strict', path: '/', maxAge: s.maxAge });
  return json({ ok: true });
};
