(() => {
  const $ = (s) => document.querySelector(s);
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
    if (res.status === 401 && path !== '/api/admin/login') { location.reload(); }
    if (!res.ok) throw new Error(data.error || 'Algo salió mal.');
    return data;
  };

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

  let data;
  // path -> { sha, preview }: imágenes subidas en esta sesión que aún no están en el sitio.
  const uploaded = new Map();

  const newId = () => 'sorteo-' + Date.now().toString(36);

  function render() {
    $('#whatsappUrl').value = data.whatsappUrl;
    $('#nd-date').value = data.nextDraw.date;
    $('#nd-prize').value = data.nextDraw.prize;
    $('#nd-note').value = data.nextDraw.note;
    $('#counter').textContent = data.draws.length;
    const box = $('#draws');
    box.textContent = '';
    data.draws.forEach((d, i) => box.append(drawEl(d, i)));
  }

  function field(label, value, onInput, attrs = {}) {
    const l = document.createElement('label');
    l.append(label);
    const input = document.createElement('input');
    Object.assign(input, attrs, { value });
    input.addEventListener('input', () => onInput(input.value));
    l.append(input);
    return l;
  }

  function drawEl(d, i) {
    const el = document.createElement('div');
    el.className = 'draw';
    const head = document.createElement('div');
    head.className = 'draw-head';
    head.append(`Sorteo #${data.draws.length - i}`);
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'danger'; del.textContent = 'Eliminar';
    del.onclick = () => { if (confirm('¿Eliminar este sorteo y sus fotos?')) { data.draws.splice(i, 1); render(); } };
    head.append(del);
    const row = document.createElement('div');
    row.className = 'row';
    row.append(field('Fecha', d.date, (v) => (d.date = v), { type: 'date' }), field('Premio', d.prize, (v) => (d.prize = v), { maxLength: 200 }));
    el.append(head, row, field('Ganador(es)', d.winner, (v) => (d.winner = v), { maxLength: 300 }));

    const thumbs = document.createElement('div');
    thumbs.className = 'thumbs';
    d.images.forEach((src, k) => {
      const t = document.createElement('div');
      t.className = 'thumb';
      const img = document.createElement('img');
      img.src = uploaded.get(src)?.preview || src; img.alt = 'Evidencia'; img.loading = 'lazy';
      const x = document.createElement('button');
      x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Quitar foto');
      x.onclick = () => { d.images.splice(k, 1); uploaded.delete(src); render(); };
      t.append(img, x);
      thumbs.append(t);
    });
    el.append(thumbs);

    const pick = document.createElement('input');
    pick.type = 'file'; pick.accept = 'image/jpeg,image/png,image/webp'; pick.multiple = true;
    pick.onchange = async () => {
      for (const file of pick.files) {
        try {
          say('Subiendo foto…');
          const { blob, preview } = await shrink(file);
          const r = await api('/api/admin/upload', { data: await toBase64(blob) });
          uploaded.set(r.path, { sha: r.sha, preview });
          d.images.push(r.path);
        } catch (err) { say(err.message, false); }
      }
      render();
    };
    el.append(pick);
    return el;
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

  $('#whatsappUrl').addEventListener('input', (e) => (data.whatsappUrl = e.target.value.trim()));
  $('#nd-date').addEventListener('input', (e) => (data.nextDraw.date = e.target.value));
  $('#nd-prize').addEventListener('input', (e) => (data.nextDraw.prize = e.target.value));
  $('#nd-note').addEventListener('input', (e) => (data.nextDraw.note = e.target.value));
  $('#add-draw').onclick = () => {
    data.draws.unshift({ id: newId(), date: new Date().toISOString().slice(0, 10), prize: '', winner: '', images: [] });
    render();
  };
  $('#logout').onclick = async () => { await api('/api/admin/logout', {}); location.reload(); };

  $('#save').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const used = new Set(data.draws.flatMap((d) => d.images));
      const up = [...uploaded].filter(([p]) => used.has(p)).map(([path, v]) => ({ path, sha: v.sha }));
      await api('/api/admin/save', { content: data, uploaded: up });
      say('Guardado. El sitio se actualiza en cerca de 1 minuto.');
    } catch (err) { say(err.message, false); }
    btn.disabled = false;
  };

  api('/api/admin/content').then((c) => { data = c; app.hidden = false; render(); }).catch((err) => say(err.message, false));
})();
