import type { APIRoute } from 'astro';
import { isAuthed, json } from '../../../lib/auth';
import { githubConfigured, readContent } from '../../../lib/github';

export const prerender = false;

/** Devuelve el contenido tal como está en GitHub (lo más reciente, aunque Vercel aún no haya republicado). */
export const GET: APIRoute = async ({ cookies }) => {
  if (!isAuthed({ cookies })) return json({ error: 'Sesión vencida' }, 401);
  if (!githubConfigured()) return json({ error: 'Faltan GITHUB_TOKEN o GITHUB_REPO en Vercel.' }, 500);
  try {
    return json(await readContent());
  } catch {
    return json({ error: 'No se pudo leer el contenido desde GitHub.' }, 502);
  }
};
