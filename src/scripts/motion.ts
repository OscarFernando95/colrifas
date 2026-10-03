// Movimiento del sitio con GSAP: entrada del hero, títulos palabra por palabra, tarjetas,
// franja de texto, línea de pasos y parallax. Con "reducir movimiento" todo queda quieto y visible.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { initDraw } from './draw';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Menú y botón flotante (independientes del movimiento) ---------- */
const header = document.getElementById('site-header');
const floatBtn = document.getElementById('float-wa');
const heroEl = document.querySelector<HTMLElement>('.hero, .page-hero');

ScrollTrigger.create({ start: 40, end: 'max', onToggle: (s) => header?.classList.toggle('is-scrolled', s.isActive) });
if (floatBtn) {
  if (heroEl) {
    ScrollTrigger.create({ trigger: heroEl, start: 'bottom 70%', end: 'max', onToggle: (s) => floatBtn.classList.toggle('is-visible', s.isActive) });
  } else {
    floatBtn.classList.add('is-visible');
  }
}

initDraw(reduce);

const fontsReady = Promise.race([
  document.fonts ? document.fonts.ready : Promise.resolve(),
  new Promise((r) => setTimeout(r, 700)),
]);

if (reduce) {
  root.classList.add('motion-ready');
} else {
  fontsReady.then(setup);
}

// Las animaciones se repiten en ambos sentidos: entran al bajar, salen al pasar,
// vuelven a entrar al subir y otra vez al bajar.
const replay = (trigger: Element | null, start = 'top 86%') => ({
  trigger, start, end: 'bottom 8%', toggleActions: 'play reverse play reverse',
});

function splitWords(el: HTMLElement) {
  return SplitText.create(el, { type: 'words', mask: 'words', wordsClass: 'w' }).words;
}

function setup() {
  /* ---------- Entrada del hero ---------- */
  const intro = gsap.utils.toArray<HTMLElement>('[data-intro]');
  const heroTitle = intro.find((el) => el.hasAttribute('data-split'));
  const stage = document.getElementById('draw-stage');
  const presenter = document.querySelector<HTMLElement>('[data-presenter]');
  const fades = intro.filter((el) => el !== heroTitle && el !== stage && el !== presenter);

  gsap.set(fades, { autoAlpha: 0, y: 26 });
  if (presenter) gsap.set(presenter, { autoAlpha: 0, y: 90, scale: 0.94 });
  if (stage) gsap.set(stage, { autoAlpha: 0, scale: 0.88, y: 30 });
  const heroWords = heroTitle ? splitWords(heroTitle) : [];
  if (heroTitle) gsap.set(heroTitle, { autoAlpha: 1 });
  gsap.set(heroWords, { yPercent: 115 });
  root.classList.add('motion-ready');

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to(heroWords, { yPercent: 0, duration: 1.2, stagger: 0.08 }, 0.1)
    .to(fades, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12 }, 0.05);
  if (presenter) tl.to(presenter, { autoAlpha: 1, y: 0, scale: 1, duration: 1.8 }, 0.1);
  if (stage) tl.to(stage, { autoAlpha: 1, scale: 1, y: 0, duration: 1.5 }, 0.45);

  /* La presentadora flota suavemente mientras el sorteo corre */
  if (presenter) {
    gsap.to(presenter.querySelector('.figure'), { y: -10, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.8 });
    gsap.fromTo(presenter.querySelector('.photo'), { scale: 1.04, transformOrigin: '46% 32%' }, { scale: 1.12, duration: 11, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  /* ---------- El hero se aleja al bajar ---------- */
  if (document.querySelector('.hero')) {
    const st = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero .grid', { yPercent: -14, ease: 'none', scrollTrigger: st });
    gsap.to('.hero .text', { autoAlpha: 0.15, ease: 'none', scrollTrigger: st });
    gsap.to('.hero .glow', { yPercent: 30, scale: 1.2, ease: 'none', scrollTrigger: st });
    gsap.to('[data-presenter]', { yPercent: 10, ease: 'none', scrollTrigger: st });
  }

  /* ---------- Orbes dorados de fondo ---------- */
  const full = { start: 0, end: 'max', scrub: 1.2 };
  gsap.to('.orb-a', { yPercent: -45, xPercent: 10, ease: 'none', scrollTrigger: full });
  gsap.to('.orb-b', { yPercent: -70, xPercent: -12, ease: 'none', scrollTrigger: full });
  gsap.to('.orb-c', { yPercent: -90, ease: 'none', scrollTrigger: full });

  /* ---------- Títulos palabra por palabra ---------- */
  gsap.utils.toArray<HTMLElement>('[data-split]').forEach((el) => {
    if (el === heroTitle) return;
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 115, rotate: 4, duration: 1.1, ease: 'expo.out', stagger: 0.06,
      scrollTrigger: replay(el),
    });
  });

  /* ---------- Bloques que suben al aparecer ---------- */
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      autoAlpha: 0, y: 30, duration: 1, ease: 'power3.out',
      scrollTrigger: replay(el, 'top 92%'),
    });
  });

  /* ---------- Tarjetas en cascada ---------- */
  gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((group) => {
    gsap.from(group.children, {
      autoAlpha: 0, y: 70, scale: 0.92, rotate: (i: number) => (i % 2 ? 3 : -3),
      duration: 1.1, ease: 'back.out(1.4)', stagger: 0.12,
      scrollTrigger: replay(group),
    });
  });

  /* ---------- Franja de texto que se mueve con el scroll ---------- */
  gsap.utils.toArray<HTMLElement>('[data-marquee]').forEach((track) => {
    const dir = Number(track.dataset.marquee);
    gsap.fromTo(track,
      { xPercent: dir < 0 ? 0 : -33.333 },
      { xPercent: dir < 0 ? -33.333 : 0, ease: 'none', scrollTrigger: { trigger: track.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  });

  /* ---------- Pasos: la línea dorada se llena al bajar ---------- */
  const mm = gsap.matchMedia();
  document.querySelectorAll<HTMLElement>('[data-steps]').forEach((wrap) => {
    const fill = wrap.querySelector('.rail-fill');
    const steps = wrap.querySelectorAll('[data-step]');
    const nums = wrap.querySelectorAll('.num');
    mm.add({ wide: '(min-width: 900px)', narrow: '(max-width: 899px)' }, (ctx) => {
      const wide = ctx.conditions?.wide;
      if (fill) {
        gsap.fromTo(fill, wide ? { scaleX: 0, scaleY: 1 } : { scaleY: 0, scaleX: 1 }, {
          scaleX: 1, scaleY: 1, ease: 'none',
          scrollTrigger: { trigger: wrap, start: 'top 75%', end: 'bottom 55%', scrub: 0.5 },
        });
      }
      gsap.from(steps, {
        autoAlpha: 0, x: wide ? 0 : -40, y: wide ? 50 : 0, duration: 1, ease: 'power3.out', stagger: 0.18,
        scrollTrigger: replay(wrap, 'top 82%'),
      });
      gsap.from(nums, {
        scale: 0, rotate: -120, duration: 0.9, ease: 'back.out(2.2)', stagger: 0.18, delay: 0.2,
        scrollTrigger: replay(wrap, 'top 82%'),
      });
    });
  });

  /* ---------- Balotas del cierre: flotan y se desplazan con el scroll ---------- */
  gsap.utils.toArray<HTMLElement>('.final .b').forEach((b, i) => {
    gsap.to(b, { y: -14 - i * 4, duration: 2.6 + i * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(b, {
      yPercent: i % 2 ? 60 : -60, rotate: i % 2 ? 40 : -40, ease: 'none',
      scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* ---------- Inclinación 3D de las tarjetas clay (solo con mouse) ---------- */
  mm.add('(hover: hover) and (pointer: fine)', () => {
    document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
      gsap.set(card, { transformPerspective: 900 });
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 12);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 12);
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  });

  ScrollTrigger.refresh();
}
