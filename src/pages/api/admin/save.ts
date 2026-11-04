import type { APIRoute } from 'astro';
import { isAuthed, json, sameOriginJson } from '../../../lib/auth';
import { parseContent, type SiteContent } from '../../../lib/content';
import { CONTENT_FILE, commit, githubConfigured, readContent } from '../../../lib/github';

export const prerender = false;

const repoPath = (webPath: string) => `public${webPath}`;
const allImages = (c: SiteContent) => new Set(c.draws.flatMap((d) => d.images));

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAuthed({ cookies })) return json({ error: 'Sesión vencida' }, 401);
  if (!sameOriginJson(request)) return json({ error: 'No disponible' }, 403);
  if (!githubConfigured()) return json({ error: 'Faltan GITHUB_TOKEN o GITHUB_REPO en Vercel.' }, 500);

  const body = await request.json().catch(() => null);
  const parsed = parseContent(body?.content);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const next = parsed.value;

  // Imágenes nuevas: ya subidas como blob; aquí solo se enlazan al commit.
  const uploaded: { path: string; sha: string }[] = Array.isArray(body?.uploaded) ? body.uploaded : [];
  const blobByPath = new Map(uploaded.filter((u) => typeof u?.path === 'string' && /^[0-9a-f]{40}$/.test(u?.sha)).map((u) => [u.path, u.sha]));

  try {
    const current = (await readContent()) as SiteContent;
    const before = allImages(current);
    const after = allImages(next);

    const changes = [{ path: CONTENT_FILE, text: JSON.stringify(next, null, 2) + '\n' }] as { path: string; text?: string; sha?: string | null }[];
    for (const img of after) {
      if (before.has(img)) continue;
      const sha = blobByPath.get(img);
      if (!sha) return json({ error: 'Falta subir una imagen. Vuelve a agregarla.' }, 400);
      changes.push({ path: repoPath(img), sha });
    }
    for (const img of before) if (!after.has(img)) changes.push({ path: repoPath(img), sha: null });

    await commit('Panel admin: actualiza contenido del sitio', changes);
    return json({ ok: true });
  } catch {
    return json({ error: 'No se pudo guardar. Recarga el panel e inténtalo de nuevo.' }, 502);
  }
};
