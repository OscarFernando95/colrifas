import type { APIRoute } from 'astro';
import { COOKIE, json, sameOriginJson } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = ({ request, cookies }) => {
  if (!sameOriginJson(request)) return json({ error: 'No disponible' }, 403);
  cookies.delete(COOKIE, { path: '/' });
  return json({ ok: true });
};
