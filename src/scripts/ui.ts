// Interacciones básicas: tema, menú móvil, preguntas y estado de los botones de WhatsApp.
const root = document.documentElement;

/* ---------- Tema claro / oscuro (misma clave 'theme' que la web anterior) ---------- */
const themeBtn = document.getElementById('theme-toggle');
const syncThemeLabel = () => {
  const dark = root.getAttribute('data-theme') === 'dark';
  themeBtn?.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
};
syncThemeLabel();
themeBtn?.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch { /* almacenamiento bloqueado */ }
  syncThemeLabel();
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  let saved: string | null = null;
  try { saved = localStorage.getItem('theme'); } catch { /* almacenamiento bloqueado */ }
  if (!saved) { root.setAttribute('data-theme', e.matches ? 'dark' : 'light'); syncThemeLabel(); }
});

/* ---------- Menú móvil ---------- */
const menuBtn = document.getElementById('menu-toggle');
const menu = document.getElementById('nav-menu');
const setMenu = (open: boolean) => {
  menu?.classList.toggle('is-open', open);
  menuBtn?.setAttribute('aria-expanded', String(open));
  menuBtn?.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
};
menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* ---------- Preguntas ---------- */
document.querySelectorAll<HTMLButtonElement>('.faq .q').forEach((q) => {
  q.addEventListener('click', () => {
    const open = q.getAttribute('aria-expanded') !== 'true';
    q.setAttribute('aria-expanded', String(open));
    q.closest('.item')?.classList.toggle('is-open', open);
  });
});

/* ---------- Botones de WhatsApp: el enlace abre normal; solo se muestra el estado ---------- */
document.querySelectorAll<HTMLAnchorElement>('[data-cta]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const lbl = btn.querySelector('.lbl');
    if (!lbl || btn.classList.contains('is-loading')) return;
    const original = lbl.textContent;
    btn.style.minWidth = `${btn.offsetWidth}px`;
    btn.classList.add('is-loading');
    lbl.textContent = 'Abriendo WhatsApp…';
    window.setTimeout(() => {
      btn.classList.remove('is-loading');
      lbl.textContent = '¿No abrió? Toca de nuevo';
      window.setTimeout(() => { lbl.textContent = original; btn.style.minWidth = ''; }, 4000);
    }, 3000);
  });
});
