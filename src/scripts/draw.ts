// Sorteo del hero: las balotas giran, sale un número y de ahí se forman los ganadores
// (dos últimas, dos primeras y dos del medio). Se pausa fuera de pantalla y con "reducir movimiento".
export function initDraw(reduce: boolean) {
  const stage = document.getElementById('draw-stage');
  if (!stage) return;

  const slots = Array.from(stage.querySelectorAll<HTMLElement>('.slot'));
  const balls = Array.from(stage.querySelectorAll<HTMLElement>('.ball'));
  const reels = Array.from(stage.querySelectorAll<HTMLElement>('.reel'));
  const ring = stage.querySelector<HTMLElement>('.pair');
  const chips = Array.from(stage.querySelectorAll<HTMLElement>('.chip'));
  const visual = stage.closest('.visual');
  if (!ring || reels.length !== 4) return;

  const STEP = 100 / 40;
  const at = (i: number) => `translateY(-${i * STEP}%)`;
  const cur = reels.map((r) => 10 + Number(r.dataset.digit ?? 0));
  const pairOf = (n: number[], pos: number) => `${n[pos]}${n[pos + 1]}`;

  if (reduce) return;

  let visible = false;
  let running = false;
  let first = true;

  const spin = (i: number, d: number) => {
    const r = reels[i];
    const dur = 1700 + i * 380;
    const a = r.animate([{ transform: at(cur[i]) }, { transform: at(30 + d) }], {
      duration: dur,
      easing: 'cubic-bezier(0.12, 0.72, 0.16, 1.03)',
      fill: 'forwards',
    });
    balls[i].animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)', offset: 0.18 }, { transform: 'translateY(0)' }],
      { duration: dur, easing: 'ease-out' },
    );
    a.onfinish = () => {
      r.style.transform = at(10 + d);
      a.cancel();
      cur[i] = 10 + d;
    };
  };

  const canRun = () => visible && !document.hidden;
  const later = (ms: number, fn: () => void) => window.setTimeout(fn, ms);

  const run = () => {
    if (!canRun()) { running = false; return; }
    running = true;
    const n = [0, 0, 0, 0].map(() => Math.floor(Math.random() * 10));

    ring.classList.remove('on');
    slots.forEach((s) => s.classList.remove('dim'));
    chips.forEach((c) => {
      c.classList.remove('active', 'done');
      const b = c.querySelector('b');
      if (b) b.textContent = '––';
    });
    n.forEach((d, i) => spin(i, d));

    chips.forEach((c, k) => {
      const pos = Number(c.dataset.pos);
      const start = 3100 + k * 1800;
      later(start, () => {
        chips.forEach((q) => { if (q.classList.contains('active')) { q.classList.remove('active'); q.classList.add('done'); } });
        ring.style.setProperty('--pos', String(pos));
        ring.classList.add('on');
        visual?.classList.add('is-lit');
        slots.forEach((s, i) => s.classList.toggle('dim', i !== pos && i !== pos + 1));
      });
      later(start + 380, () => {
        const b = c.querySelector('b');
        if (b) b.textContent = pairOf(n, pos);
        c.classList.add('active');
      });
    });

    const end = 3100 + chips.length * 1800;
    later(end, () => {
      ring.classList.remove('on');
      visual?.classList.remove('is-lit');
      slots.forEach((s) => s.classList.remove('dim'));
      chips.forEach((q) => { q.classList.remove('active'); q.classList.add('done'); });
      stage.setAttribute(
        'aria-label',
        `Ejemplo: la lotería del día da ${n.join('')}. Ganan el ${pairOf(n, 2)} con las dos últimas cifras, el ${pairOf(n, 0)} con las dos primeras y el ${pairOf(n, 1)} con las dos del medio.`,
      );
    });
    later(end + 3000, run);
  };

  const check = () => {
    if (!canRun() || running) return;
    if (first) { first = false; running = true; later(1400, () => { running = false; check(); }); return; }
    run();
  };

  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; check(); }, { threshold: 0.3 }).observe(stage);
  document.addEventListener('visibilitychange', check);
}
