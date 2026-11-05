(() => {
  const $ = (s) => document.querySelector(s);

  /** Crea un elemento: h('div', { class: 'x', onclick }, 'texto', otroNodo). Siempre texto plano, nunca HTML. */
  const h = (tag, props = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === false || v == null) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el[k] = v;
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
    return el;
  };

  const statusEl = $('#status');
  let statusTimer;
  const say = (msg, ok = true) => {
    statusEl.textContent = msg;
    statusEl.className = ok ? 'ok' : 'bad';
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (statusEl.className = ''), 6000);
  };
  const api = async (path, body) => {
    const res = await fetch(path, body === undefined
      ? { cache: 'no-store' }
      : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && path !== '/api/admin/login') location.reload();
    if (!res.ok) throw new Error(data.error || 'Algo salió mal.');
    return data;
  };

  // ---------- Login ----------
  const login = $('#login');
  if (login) {
    login.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(login);
      try { await api('/api/admin/login', { user: f.get('user'), password: f.get('password') }); location.reload(); }
      catch (err) { say(err.message, false); }
    });
    return;
  }

  const app = $('#app');
  if (!app) return;
  const view = $('#view');

  // ---------- Datos ----------
  const PRIZES = [
    ['last2', 'Dos últimas cifras'],
    ['first2', 'Dos primeras cifras'],
    ['middle2', 'Dos del medio'],
  ];
  const MAX_DRAWS = 5;
  const MAX_TESTIMONIALS = 10;
  let content;
  // path -> { sha, preview }: fotos subidas en esta sesión que quizá aún no están en el sitio.
  const uploaded = new Map();
  const newId = (p) => `${p}-${Date.now().toString(36)}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (iso) => new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
  const money = (v) => (/^\d+$/.test(v) ? '$' + Number(v).toLocaleString('es-CO') : v);

  const total = () => content.drawsTotal ?? content.draws.length;
  /** Si al agregar `draw` se pasa del límite, devuelve el sorteo que se eliminaría (el de fecha más antigua). */
  const drawDropped = (draw) => {
    const all = [draw, ...content.draws].sort((a, b) => b.date.localeCompare(a.date));
    return all.length > MAX_DRAWS ? all[MAX_DRAWS] : null;
  };
  const confirmDrop = (draw) => {
    const dropped = drawDropped(draw);
    return !dropped || confirm(`Ya hay ${MAX_DRAWS} sorteos publicados. Al guardar se eliminará el más antiguo (${fmtDate(dropped.date)}) con sus fotos, pero el contador seguirá subiendo. ¿Continuar?`);
  };

  const go = (hash) => { location.hash = hash; };
  const reload = async () => { content = await api('/api/admin/content'); };

  /** Guarda solo las secciones indicadas. El servidor las une con lo que hay en GitHub. */
  async function save(changes, okMsg) {
    const text = JSON.stringify(changes);
    const up = [...uploaded].filter(([p]) => text.includes(p)).map(([path, v]) => ({ path, sha: v.sha }));
    const res = await api('/api/admin/save', { changes, uploaded: up });
    content = res.content;
    say(okMsg || 'Guardado. El sitio se actualiza en cerca de 1 minuto.');
  }

  // ---------- Piezas reutilizables ----------
  const field = (label, input) => h('label', {}, label, input);
  const textInput = (value, attrs = {}) => h('input', { value: value ?? '', ...attrs });
  const back = (to, label = '← Volver al panel') => h('button', { class: 'back', type: 'button', onclick: () => go(to) }, label);

  /** Botones Guardar / Cancelar. `onSave` puede lanzar un error; se muestra y se puede reintentar. */
  function actions(onSave, cancelTo, saveLabel = 'Guardar', extra = []) {
    const saveBtn = h('button', { class: 'primary', type: 'button' }, saveLabel);
    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      try { await onSave(); } catch (err) { say(err.message, false); }
      saveBtn.disabled = false;
    });
    return h('div', { class: 'actions' }, saveBtn, h('button', { type: 'button', onclick: () => go(cancelTo) }, 'Cancelar'), extra);
  }

  // Reduce la foto en el navegador (máx. 1600 px): sube rápido y no pesa en la web.
  async function shrink(file) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82));
    return { blob, preview: URL.createObjectURL(blob) };
  }
  const toBase64 = (blob) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

  /** Selector de fotos. `images` es un arreglo que se modifica en sitio. */
  function photoPicker(images, { multiple = true, label = 'Fotos' } = {}) {
    const box = h('div');
    const draw = () => {
      box.textContent = '';
      const thumbs = h('div', { class: 'thumbs' });
      images.forEach((src, k) => {
        thumbs.append(h('div', { class: 'thumb' },
          h('img', { src: uploaded.get(src)?.preview || src, alt: 'Foto', loading: 'lazy' }),
          h('button', { type: 'button', 'aria-label': 'Quitar foto', onclick: () => { images.splice(k, 1); draw(); } }, '×')));
      });
      const pick = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple });
      pick.addEventListener('change', async () => {
        for (const file of pick.files) {
          try {
            say('Subiendo foto…');
            const { blob, preview } = await shrink(file);
            const r = await api('/api/admin/upload', { data: await toBase64(blob) });
            uploaded.set(r.path, { sha: r.sha, preview });
            if (!multiple) images.length = 0;
            images.push(r.path);
            say('Foto lista. Falta guardar.');
          } catch (err) { say(err.message, false); }
        }
        draw();
      });
      box.append(h('label', {}, label, images.length ? thumbs : null, pick));
    };
    draw();
    return box;
  }

  // ---------- Inicio ----------
  function homeView() {
    const nd = content.nextDraw;
    const modules = [
      ['#whatsapp', 'Link de WhatsApp', content.whatsappUrl.replace('https://', '').slice(0, 42)],
      ['#proximo', 'Próximo sorteo', nd ? `${fmtDate(nd.date)} · ${Object.keys(nd.prizes).length} premio(s)` : 'Sin sorteo programado'],
      ['#realizados', 'Sorteos realizados', `${total()} en total · ${content.draws.length} visibles en la web`],
      ['#testimonios', 'Testimonios y evidencias', `${content.testimonials.length} publicados`],
    ];
    return [
      h('div', { class: 'stat' }, h('b', {}, String(total())), h('span', { class: 'hint' }, total() === 1 ? 'sorteo realizado' : 'sorteos realizados')),
      h('div', { class: 'modules' }, modules.map(([to, title, sub]) =>
        h('button', { class: 'module', type: 'button', onclick: () => go(to) }, h('b', {}, title), h('span', {}, sub)))),
      h('p', { class: 'hint', style: 'margin-top:16px' }, 'Cada cambio se guarda por separado y el sitio se actualiza solo en cerca de 1 minuto.'),
    ];
  }

  // ---------- WhatsApp ----------
  function whatsappView() {
    const input = textInput(content.whatsappUrl, { inputMode: 'url', placeholder: 'https://chat.whatsapp.com/…' });
    return [
      back('#'),
      h('div', { class: 'card' },
        h('h2', {}, 'Link de WhatsApp'),
        h('p', { class: 'hint' }, 'Todos los botones de la web usan este enlace.'),
        field('Enlace del grupo', input),
        actions(async () => { await save({ whatsappUrl: input.value.trim() }); go('#'); }, '#')),
    ];
  }

  // ---------- Formulario de sorteo (próximo / finalizado) ----------
  /**
   * mode 'next': fecha + premios + nota.
   * mode 'done': fecha + resultado de la lotería + premios y ganadores + nota + fotos.
   * Un premio vacío no cuenta: no se guarda ni se muestra.
   */
  function drawForm(draw, mode) {
    const date = textInput(draw.date, { type: 'date' });
    const number = textInput(draw.number || '', { inputMode: 'numeric', maxLength: 4, placeholder: 'Ej: 4719' });
    const note = h('textarea', { rows: 2, maxLength: mode === 'done' ? 600 : 300, value: draw.note || '' });
    const images = [...(draw.images || [])];
    const rows = PRIZES.map(([key, label]) => {
      const cur = mode === 'done' ? draw.results?.[key] : null;
      const prize = textInput(mode === 'done' ? cur?.prize : draw.prizes?.[key], { maxLength: 120, placeholder: 'Ej: 200000 (vacío = no hay este premio)' });
      const winner = mode === 'done' ? textInput(cur?.winner, { maxLength: 300, placeholder: 'Nombre o número del ganador' }) : null;
      return { key, prize, winner, el: h('div', { class: 'prize' }, h('strong', {}, label), field('Premio', prize), winner && field('Ganador(es)', winner)) };
    });
    const el = h('div', {},
      h('div', { class: 'row' }, field('Fecha del sorteo', date), mode === 'done' && field('Resultado de la lotería (4 cifras)', number)),
      h('h3', {}, 'Premios'),
      h('p', { class: 'hint' }, 'Deja vacío el premio que no se juegue: no cuenta y no se muestra.'),
      rows.map((r) => r.el),
      field('Nota (opcional)', note),
      mode === 'done' && photoPicker(images, { label: 'Fotos de evidencia' }));
    const collect = () => {
      if (!date.value) throw new Error('Falta la fecha del sorteo.');
      if (!rows.some((r) => r.prize.value.trim())) throw new Error('Pon al menos un premio.');
      if (mode === 'next') {
        return { id: draw.id, date: date.value, note: note.value.trim(),
          prizes: Object.fromEntries(rows.filter((r) => r.prize.value.trim()).map((r) => [r.key, r.prize.value.trim()])) };
      }
      return { id: draw.id, date: date.value, number: number.value.trim(), note: note.value.trim(), images,
        results: Object.fromEntries(rows.filter((r) => r.prize.value.trim()).map((r) => [r.key, { prize: r.prize.value.trim(), winner: r.winner.value.trim() }])) };
    };
    return { el, collect };
  }

  // ---------- Próximo sorteo ----------
  function nextView() {
    const nd = content.nextDraw;
    const form = drawForm(nd || { id: newId('sorteo'), date: '', prizes: {}, note: '' }, 'next');
    const extra = nd ? [
      h('button', { type: 'button', onclick: () => go('#proximo/finalizar') }, 'Marcar como finalizado'),
      h('button', { class: 'danger', type: 'button', onclick: async () => {
        if (!confirm('¿Quitar el próximo sorteo de la web?')) return;
        try { await save({ nextDraw: null }, 'Próximo sorteo eliminado.'); go('#'); } catch (err) { say(err.message, false); }
      } }, 'Eliminar'),
    ] : [];
    return [
      back('#'),
      h('div', { class: 'card' },
        h('h2', {}, nd ? 'Editar próximo sorteo' : 'Crear próximo sorteo'),
        h('p', { class: 'hint' }, 'Se muestra en la portada. Cuando pase la fecha, márcalo como finalizado y pon los ganadores.'),
        form.el,
        actions(async () => { await save({ nextDraw: form.collect() }); go('#'); }, '#', 'Guardar', extra)),
    ];
  }

  function finishView() {
    const nd = content.nextDraw;
    if (!nd) return (go('#proximo'), []);
    const form = drawForm({ id: nd.id, date: nd.date, number: '', note: nd.note, images: [],
      results: Object.fromEntries(Object.entries(nd.prizes).map(([k, p]) => [k, { prize: p, winner: '' }])) }, 'done');
    return [
      back('#proximo', '← Volver al próximo sorteo'),
      h('div', { class: 'card' },
        h('h2', {}, 'Finalizar sorteo'),
        h('p', { class: 'hint' }, 'Registra el resultado y los ganadores. Pasa a "Sorteos realizados" y deja de salir como próximo.'),
        form.el,
        actions(async () => {
          const draw = form.collect();
          if (!confirmDrop(draw)) return;
          await save({ nextDraw: null, draws: [draw, ...content.draws] }, 'Sorteo finalizado y publicado.');
          go('#realizados');
        }, '#proximo', 'Finalizar y publicar')),
    ];
  }

  // ---------- Sorteos realizados ----------
  function drawsView() {
    const list = content.draws.length
      ? content.draws.map((d) => h('div', { class: 'item' },
          h('div', { class: 'meta' }, h('b', {}, fmtDate(d.date)),
            h('span', {}, Object.values(d.results).map((r) => money(r.prize)).join(' · ') || d.note || 'Sin premios detallados')),
          h('div', { class: 'btns' },
            h('button', { class: 'small', type: 'button', onclick: () => go('#realizados/' + d.id) }, 'Editar'),
            h('button', { class: 'small danger', type: 'button', onclick: async () => {
              if (!confirm('¿Eliminar este sorteo y sus fotos? El contador bajará en 1.')) return;
              try { await save({ draws: content.draws.filter((x) => x.id !== d.id) }, 'Sorteo eliminado.'); route(); } catch (err) { say(err.message, false); }
            } }, 'Eliminar'))))
      : [h('p', { class: 'hint' }, 'Todavía no hay sorteos registrados.')];
    return [
      back('#'),
      h('div', { class: 'card' },
        h('h2', {}, 'Sorteos realizados'),
        h('p', { class: 'hint' }, `La web muestra los ${MAX_DRAWS} más recientes. Al agregar uno nuevo se elimina el más antiguo, pero el contador (${total()} en total) no baja.`),
        list,
        h('div', { class: 'actions' }, h('button', { class: 'primary', type: 'button', onclick: () => go('#realizados/nuevo') }, '+ Registrar sorteo realizado'))),
    ];
  }

  function drawEditView(id) {
    const existing = id === 'nuevo' ? null : content.draws.find((d) => d.id === id);
    if (id !== 'nuevo' && !existing) return (go('#realizados'), []);
    const form = drawForm(existing || { id: newId('sorteo'), date: today(), number: '', note: '', images: [], results: {} }, 'done');
    return [
      back('#realizados', '← Volver a sorteos realizados'),
      h('div', { class: 'card' },
        h('h2', {}, existing ? 'Editar sorteo realizado' : 'Registrar sorteo realizado'),
        form.el,
        actions(async () => {
          const draw = form.collect();
          if (!existing && !confirmDrop(draw)) return;
          const draws = existing ? content.draws.map((d) => (d.id === draw.id ? draw : d)) : [draw, ...content.draws];
          await save({ draws });
          go('#realizados');
        }, '#realizados')),
    ];
  }

  // ---------- Testimonios y evidencias ----------
  function testimonialsView() {
    const list = content.testimonials.length
      ? content.testimonials.map((t) => h('div', { class: 'item' },
          h('div', { class: 'meta' }, h('b', {}, t.name || 'Sin nombre'), h('span', {}, t.text || 'Solo foto')),
          h('div', { class: 'btns' },
            h('button', { class: 'small', type: 'button', onclick: () => go('#testimonios/' + t.id) }, 'Editar'),
            h('button', { class: 'small danger', type: 'button', onclick: async () => {
              if (!confirm('¿Eliminar este testimonio?')) return;
              try { await save({ testimonials: content.testimonials.filter((x) => x.id !== t.id) }, 'Testimonio eliminado.'); route(); } catch (err) { say(err.message, false); }
            } }, 'Eliminar'))))
      : [h('p', { class: 'hint' }, 'Todavía no hay testimonios.')];
    return [
      back('#'),
      h('div', { class: 'card' },
        h('h2', {}, 'Testimonios y evidencias'),
        h('p', { class: 'hint' }, `Se muestran en la portada. Máximo ${MAX_TESTIMONIALS}: al agregar uno nuevo se elimina el más antiguo.`),
        list,
        h('div', { class: 'actions' }, h('button', { class: 'primary', type: 'button', onclick: () => go('#testimonios/nuevo') }, '+ Agregar'))),
    ];
  }

  function testimonialEditView(id) {
    const existing = id === 'nuevo' ? null : content.testimonials.find((t) => t.id === id);
    if (id !== 'nuevo' && !existing) return (go('#testimonios'), []);
    const t = existing || { id: newId('testimonio'), name: '', text: '', image: '' };
    const name = textInput(t.name, { maxLength: 80, placeholder: 'Ej: Yuliana, Cali' });
    const body = h('textarea', { rows: 4, maxLength: 600, value: t.text });
    const images = t.image ? [t.image] : [];
    return [
      back('#testimonios', '← Volver a testimonios'),
      h('div', { class: 'card' },
        h('h2', {}, existing ? 'Editar testimonio' : 'Agregar testimonio o evidencia'),
        field('Nombre (opcional)', name),
        field('Texto (opcional si pones foto)', body),
        photoPicker(images, { multiple: false, label: 'Foto o captura (opcional si pones texto)' }),
        actions(async () => {
          const item = { id: t.id, name: name.value.trim(), text: body.value.trim(), image: images[0] || '' };
          if (!item.text && !item.image) throw new Error('Pon un texto o una foto.');
          if (!existing && content.testimonials.length >= MAX_TESTIMONIALS) {
            const old = content.testimonials[MAX_TESTIMONIALS - 1];
            if (!confirm(`Ya hay ${MAX_TESTIMONIALS} testimonios. Al guardar se eliminará el más antiguo (${old.name || 'sin nombre'}) con su foto. ¿Continuar?`)) return;
          }
          const testimonials = existing ? content.testimonials.map((x) => (x.id === item.id ? item : x)) : [item, ...content.testimonials];
          await save({ testimonials });
          go('#testimonios');
        }, '#testimonios')),
    ];
  }

  // ---------- Rutas ----------
  async function route() {
    const [page, arg] = location.hash.slice(1).split('/');
    try { await reload(); } catch (err) { say(err.message, false); return; }
    let out;
    if (page === 'whatsapp') out = whatsappView();
    else if (page === 'proximo') out = arg === 'finalizar' ? finishView() : nextView();
    else if (page === 'realizados') out = arg ? drawEditView(arg) : drawsView();
    else if (page === 'testimonios') out = arg ? testimonialEditView(arg) : testimonialsView();
    else out = homeView();
    view.textContent = '';
    view.append(...[out].flat());
    app.hidden = false;
    window.scrollTo(0, 0);
  }

  $('#logout').onclick = async () => { await api('/api/admin/logout', {}); location.reload(); };
  window.addEventListener('hashchange', route);
  route();
})();
