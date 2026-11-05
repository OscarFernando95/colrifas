import type { APIRoute } from 'astro';
import { isAuthed, json, sameOriginJson } from '../../../lib/auth';
import { MAX_DRAWS, MAX_TESTIMONIALS, imagesOf, parseContent, type SiteContent } from '../../../lib/content';
import { CONTENT_FILE, commit, githubConfigured, readContent } from '../../../lib/github';

export const prerender = false;

const repoPath = (webPath: string) => `public${webPath}`;
/** Cada módulo del panel solo puede tocar sus propias secciones. */
const SECTIONS = ['whatsappUrl', 'nextDraw', 'draws', 'testimonials'] as const;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAuthed({ cookies })) return json({ error: 'Sesión vencida' }, 401);
  if (!sameOriginJson(request)) return json({ error: 'No disponible' }, 403);
  if (!githubConfigured()) return json({ error: 'Faltan GITHUB_TOKEN o GITHUB_REPO en Vercel.' }, 500);

  const body = await request.json().catch(() => null);
  const changes = body?.changes;
  if (!changes || typeof changes !== 'object') return json({ error: 'Nada que guardar.' }, 400);

  // Imágenes nuevas: ya subidas como blob; aquí solo se enlazan al commit.
  const uploaded: { path: string; sha: string }[] = Array.isArray(body?.uploaded) ? body.uploaded : [];
  const blobByPath = new Map(uploaded.filter((u) => typeof u?.path === 'string' && /^[0-9a-f]{40}$/.test(u?.sha)).map((u) => [u.path, u.sha]));

  try {
    // Se parte de lo que hay en GitHub ahora mismo: guardar un módulo nunca pisa a los otros.
    const current = (await readContent()) as SiteContent;
    const merged: Record<string, unknown> = { ...current };
    for (const k of SECTIONS) if (k in changes) merged[k] = changes[k];

    // Límites para no saturar la web: se quedan los más recientes y se elimina el resto.
    if (Array.isArray(changes.draws)) {
      const before = new Set(current.draws.map((d) => d.id));
      const incoming = new Set(changes.draws.map((d: any) => d?.id));
      const added = changes.draws.filter((d: any) => !before.has(d?.id)).length;
      const removed = current.draws.filter((d) => !incoming.has(d.id)).length;
      // El contador sube con cada sorteo nuevo y solo baja si alguien elimina uno a propósito, nunca por el límite.
      merged.drawsTotal = Math.max(0, (current.drawsTotal ?? current.draws.length) + added - removed);
      merged.draws = [...changes.draws]
        .sort((a: any, b: any) => String(b?.date).localeCompare(String(a?.date)))
        .slice(0, MAX_DRAWS);
    }
    if (Array.isArray(changes.testimonials)) merged.testimonials = changes.testimonials.slice(0, MAX_TESTIMONIALS);

    const parsed = parseContent(merged);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const next = parsed.value;

    const before = imagesOf(current);
    const after = imagesOf(next);
    const files = [{ path: CONTENT_FILE, text: JSON.stringify(next, null, 2) + '\n' }] as { path: string; text?: string; sha?: string | null }[];
    for (const img of after) {
      if (before.has(img)) continue;
      const sha = blobByPath.get(img);
      if (!sha) return json({ error: 'Falta subir una imagen. Vuelve a agregarla.' }, 400);
      files.push({ path: repoPath(img), sha });
    }
    for (const img of before) if (!after.has(img)) files.push({ path: repoPath(img), sha: null });

    await commit('Panel admin: actualiza contenido del sitio', files);
    return json({ ok: true, content: next });
  } catch {
    return json({ error: 'No se pudo guardar. Recarga el panel e inténtalo de nuevo.' }, 502);
  }
};
