import { env } from './env';

// Todo el contenido editable vive en el repo: guardar = un commit, y Vercel republica solo.
const base = () => env('GITHUB_API_URL') || 'https://api.github.com';
const repo = () => env('GITHUB_REPO');
const branch = () => env('GITHUB_BRANCH') || 'main';

export const githubConfigured = () => !!env('GITHUB_TOKEN') && /^[\w.-]+\/[\w.-]+$/.test(repo());

async function gh(path: string, init: RequestInit = {}) {
  const res = await fetch(`${base()}/repos/${repo()}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env('GITHUB_TOKEN')}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      'user-agent': 'colrifas-admin',
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} en ${path}`);
  return res.json() as Promise<any>;
}

export const CONTENT_FILE = 'src/data/content.json';

export async function readContent(): Promise<unknown> {
  const f = await gh(`/contents/${CONTENT_FILE}?ref=${encodeURIComponent(branch())}`);
  return JSON.parse(Buffer.from(f.content, 'base64').toString('utf8'));
}

/** Sube una imagen como blob suelto (aún sin commit). Devuelve su sha. */
export async function createBlob(base64: string): Promise<string> {
  const r = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: base64, encoding: 'base64' }) });
  return r.sha;
}

interface Change {
  /** Ruta dentro del repo. */
  path: string;
  /** Texto, sha de un blob ya subido, o null para borrar el archivo. */
  text?: string;
  sha?: string | null;
}

/** Un único commit con todos los cambios (un solo despliegue en Vercel). */
export async function commit(message: string, changes: Change[]) {
  const ref = await gh(`/git/ref/heads/${encodeURIComponent(branch())}`);
  const parent = await gh(`/git/commits/${ref.object.sha}`);
  const tree = await gh('/git/trees', {
    method: 'POST',
    body: JSON.stringify({
      base_tree: parent.tree.sha,
      tree: changes.map((c) =>
        c.text !== undefined
          ? { path: c.path, mode: '100644', type: 'blob', content: c.text }
          : { path: c.path, mode: '100644', type: 'blob', sha: c.sha ?? null },
      ),
    }),
  });
  const made = await gh('/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }),
  });
  // Sin force: si alguien más empujó mientras tanto, falla en vez de pisar su trabajo.
  await gh(`/git/refs/heads/${encodeURIComponent(branch())}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: made.sha, force: false }),
  });
  return made.sha as string;
}
