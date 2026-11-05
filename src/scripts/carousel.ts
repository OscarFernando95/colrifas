// Carruseles horizontales (Rail.astro): flechas, arrastre con mouse y degradado en los bordes.
document.querySelectorAll<HTMLElement>('[data-rail]').forEach((rail) => {
  const track = rail.querySelector<HTMLElement>('.track')!;
  const prev = rail.querySelector<HTMLButtonElement>('.prev')!;
  const next = rail.querySelector<HTMLButtonElement>('.next')!;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    const overflow = max > 4;
    rail.toggleAttribute('data-overflow', overflow);
    track.classList.toggle('can-drag', overflow);
    prev.hidden = next.hidden = !overflow;
    prev.disabled = track.scrollLeft < 6;
    next.disabled = track.scrollLeft > max - 6;
    // Degradado solo del lado donde aún hay más tarjetas
    track.style.setProperty('--fade-l', overflow && track.scrollLeft > 6 ? '28px' : '0px');
    track.style.setProperty('--fade-r', overflow && track.scrollLeft < max - 6 ? '28px' : '0px');
  };
  update();
  track.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(track);

  const step = (dir: 1 | -1) =>
    track.scrollBy({ left: dir * Math.max(240, track.clientWidth * 0.8), behavior: reduced.matches ? 'auto' : 'smooth' });
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));

  // Arrastrar con el mouse (el dedo ya desliza solo). Un arrastre no cuenta como clic en una foto.
  let startX = 0, startLeft = 0, down = false, moved = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('dragging'); }
    if (moved) track.scrollLeft = startLeft - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    track.classList.remove('dragging');
  });
  track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
});
