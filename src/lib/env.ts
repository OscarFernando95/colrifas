// Lee variables en tiempo de ejecución (Vercel) o desde .env (astro dev).
export function env(name: string): string {
  return process.env[name] ?? (import.meta.env as Record<string, string | undefined>)[name] ?? '';
}
