import type { APIRoute } from 'astro';
import { isAuthed, json, sameOriginJson } from '../../../lib/auth';
import { createBlob, githubConfigured } from '../../../lib/github';

export const prerender = false;

const MAX_BYTES = 3 * 1024 * 1024;

/** Reconoce el tipo por los primeros bytes, no por lo que diga el navegador. */
function sniff(b: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAuthed({ cookies })) return json({ error: 'Sesión vencida' }, 401);
  if (!sameOriginJson(request)) return json({ error: 'No disponible' }, 403);
  if (!githubConfigured()) return json({ error: 'Faltan GITHUB_TOKEN o GITHUB_REPO en Vercel.' }, 500);

  const body = await request.json().catch(() => null);
  const data = typeof body?.data === 'string' ? body.data : '';
  const bytes = Buffer.from(data, 'base64');
  const ext = bytes.length ? sniff(bytes) : null;
  if (!ext) return json({ error: 'Solo se aceptan imágenes JPG, PNG o WebP.' }, 400);
  if (bytes.length > MAX_BYTES) return json({ error: 'La imagen pesa demasiado (máximo 3 MB).' }, 413);

  try {
    const sha = await createBlob(bytes.toString('base64'));
    const name = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    return json({ path: `/evidencias/${name}`, sha });
  } catch {
    return json({ error: 'No se pudo subir la imagen a GitHub.' }, 502);
  }
};
