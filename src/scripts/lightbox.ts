// Visor de imágenes: las miniaturas `a[data-lightbox="grupo"]` se abren aquí en vez de en otra pestaña.
// Sin JavaScript, el enlace sigue abriendo la imagen normal.
const root = document.getElementById('lightbox') as HTMLElement | null;

if (root) {
  const frame = root.querySelector('.lb-frame') as HTMLElement;
  const img = root.querySelector('.lb-img') as HTMLImageElement;
  const cap = root.querySelector('.lb-cap') as HTMLElement;
  const count = root.querySelector('.lb-count') as HTMLElement;
  const backdrop = root.querySelector('.lb-backdrop') as HTMLElement;
  const btnClose = root.querySelector('.lb-close') as HTMLButtonElement;
  const btnPrev = root.querySelector('.lb-prev') as HTMLButtonElement;
  const btnNext = root.querySelector('.lb-next') as HTMLButtonElement;
  const controls = [btnClose, btnPrev, btnNext];
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPRING = 'cubic-bezier(0.2, 0.9, 0.25, 1.04)';

  let items: HTMLAnchorElement[] = [];
  let index = 0;
  let opener: HTMLElement | null = null;
  let busy = false;
  let isOpen = false;

  const thumbOf = (a: HTMLAnchorElement) => (a.querySelector('img') ?? a) as HTMLElement;
  const visibleRect = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const inView = r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    return inView ? r : null;
  };

  function fill(i: number) {
    const a = items[i];
    img.src = a.href;
    img.alt = thumbOf(a).getAttribute('alt') || 'Imagen';
    cap.textContent = a.dataset.caption || '';
    cap.hidden = !a.dataset.caption;
    count.textContent = items.length > 1 ? `${i + 1} / ${items.length}` : '';
    btnPrev.hidden = btnNext.hidden = items.length < 2;
    // Precarga las vecinas para que pasar de una a otra sea instantáneo.
    for (const n of [i - 1, i + 1]) if (items[n]) new Image().src = items[n].href;
  }

  async function open(a: HTMLAnchorElement) {
    if (isOpen || busy) return;
    busy = true;
    const group = a.dataset.lightbox!;
    items = [...document.querySelectorAll<HTMLAnchorElement>(`a[data-lightbox="${CSS.escape(group)}"]`)];
    index = Math.max(0, items.indexOf(a));
    opener = a;
    fill(index);

    root!.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    try { await img.decode(); } catch { /* si falla, se muestra igual al cargar */ }

    const from = visibleRect(thumbOf(a));
    const to = frame.getBoundingClientRect();
    if (reduced()) {
      root!.animate({ opacity: [0, 1] }, { duration: 160 });
    } else {
      backdrop.animate({ opacity: [0, 1], backdropFilter: ['blur(0px)', 'blur(14px)'] }, { duration: 420, easing: 'ease-out' });
      if (from) {
        // Expansión desde la miniatura: la imagen "crece" desde donde se tocó.
        const dx = from.left + from.width / 2 - (to.left + to.width / 2);
        const dy = from.top + from.height / 2 - (to.top + to.height / 2);
        frame.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`, borderRadius: '14px' },
            { transform: 'none', borderRadius: '22px' },
          ],
          { duration: 560, easing: SPRING },
        );
      } else {
        frame.animate({ opacity: [0, 1], transform: ['scale(0.92) translateY(20px)', 'none'] }, { duration: 480, easing: SPRING });
      }
      frame.querySelector('.lb-shine')?.animate({ transform: ['translateX(-120%)', 'translateX(120%)'] }, { duration: 900, delay: 380, easing: 'ease-in-out' });
      controls.concat([cap, count]).forEach((el, k) =>
        el.animate({ opacity: [0, 1], transform: ['translateY(10px)', 'none'] }, { duration: 380, delay: 220 + k * 60, easing: 'ease-out', fill: 'backwards' }),
      );
    }
    isOpen = true;
    busy = false;
    btnClose.focus({ preventScroll: true });
  }

  async function close() {
    if (!isOpen || busy) return;
    busy = true;
    const target = visibleRect(thumbOf(items[index]));
    const from = frame.getBoundingClientRect();
    const out: Promise<unknown>[] = [];
    if (reduced()) {
      out.push(root!.animate({ opacity: [1, 0] }, { duration: 140 }).finished);
    } else {
      out.push(backdrop.animate({ opacity: [1, 0] }, { duration: 320, easing: 'ease-in' }).finished);
      controls.concat([cap, count]).forEach((el) => el.animate({ opacity: [1, 0] }, { duration: 160, fill: 'forwards' }));
      if (target) {
        const dx = target.left + target.width / 2 - (from.left + from.width / 2);
        const dy = target.top + target.height / 2 - (from.top + from.height / 2);
        out.push(frame.animate(
          [{ transform: 'none', borderRadius: '22px' }, { transform: `translate(${dx}px, ${dy}px) scale(${target.width / from.width}, ${target.height / from.height})`, borderRadius: '14px' }],
          { duration: 380, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' },
        ).finished);
      } else {
        out.push(frame.animate({ opacity: [1, 0], transform: ['none', 'scale(0.94) translateY(16px)'] }, { duration: 300, fill: 'forwards' }).finished);
      }
    }
    await Promise.allSettled(out);
    root!.getAnimations({ subtree: true }).forEach((an) => an.cancel());
    root!.hidden = true;
    document.documentElement.style.overflow = '';
    isOpen = false;
    busy = false;
    opener?.focus({ preventScroll: true });
  }

  async function go(dir: 1 | -1) {
    if (!isOpen || busy || items.length < 2) return;
    busy = true;
    index = (index + dir + items.length) % items.length;
    if (!reduced()) {
      await frame.animate({ opacity: [1, 0], transform: ['none', `translateX(${-dir * 48}px) scale(0.97)`] }, { duration: 170, easing: 'ease-in', fill: 'forwards' }).finished;
    }
    fill(index);
    try { await img.decode(); } catch { /* se muestra al cargar */ }
    frame.getAnimations().forEach((an) => an.cancel());
    if (!reduced()) {
      frame.animate({ opacity: [0, 1], transform: [`translateX(${dir * 48}px) scale(0.97)`, 'none'] }, { duration: 340, easing: SPRING });
      frame.querySelector('.lb-shine')?.animate({ transform: ['translateX(-120%)', 'translateX(120%)'] }, { duration: 700, delay: 120, easing: 'ease-in-out' });
    }
    busy = false;
  }

  document.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-lightbox]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    open(a);
  });
  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', () => go(-1));
  btnNext.addEventListener('click', () => go(1));
  // Tocar fuera de la imagen (fondo) cierra.
  root.addEventListener('click', (e) => {
    const t = e.target as Element;
    if (t === root || t === backdrop || t.classList.contains('lb-stage')) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Tab') {
      // Mantiene el foco dentro del visor.
      const f = controls.filter((b) => !b.hidden);
      const i = f.indexOf(document.activeElement as HTMLButtonElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });

  // Gestos: deslizar de lado cambia de foto; deslizar hacia abajo cierra.
  let sx = 0, sy = 0, tracking = false;
  frame.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; tracking = true; });
  window.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
  });
}
