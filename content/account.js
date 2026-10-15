/* Вход по готовому логину и синхронизация прогресса с сервером «Вектора».
   Если сервера нет (GitHub Pages, файл с диска) — приложение работает как раньше, прогресс в браузере.
   Ф-03 вход, Ф-07 выход и автовыход, Ф-08 прогресс на сервере, Ф-09 работа без сети и очередь событий. */
(() => {
  const API = 'api/';
  const KEY = 'vektor-progress-v3', SESS = 'vektor-session';
  const IDLE_MIN = 20, DEBOUNCE = 1500, RETRY = 15000;
  const ls = {
    get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del: k => { try { localStorage.removeItem(k); } catch {} },
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Два варианта сервера: Supabase (адрес и публичный ключ в config.js) или PHP рядом с сайтом (api/, Бегет)
  const CFG = window.VEKTOR_CONFIG || {};
  const SB = CFG.supabaseUrl && CFG.supabaseKey ? CFG.supabaseUrl.replace(/\/+$/, '') : '';
  const RPC = {
    login: b => ['vektor_login', { p_login: b.login, p_password: b.password }],
    logout: (b, t) => ['vektor_logout', { p_token: t }],
    state: (b, t) => ['vektor_state', { p_token: t }],
    sync: (b, t) => ['vektor_sync', { p_token: t, p_state: b.state ?? null, p_events: b.events || [] }],
  };
  const STATUS = { bad_login: 401, no_session: 401, locked: 429, layout: 400, forbidden: 403, too_large: 413 };

  async function call(r, body, token) {
    if (SB) {
      const [fn, args] = RPC[r](body || {}, token);
      const res = await fetch(`${SB}/rest/v1/rpc/${fn}`, {
        method: 'POST', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', apikey: CFG.supabaseKey, Authorization: 'Bearer ' + CFG.supabaseKey },
        body: JSON.stringify(args),
      });
      let j = null; try { j = await res.json(); } catch {}
      if (!res.ok) {
        const code = j && /no_session|forbidden/.exec(j.message || '');
        const e = new Error(code ? (code[0] === 'no_session' ? 'Сессия закончилась, войди заново' : 'Нет доступа') : 'Нет связи с сервером');
        e.status = code ? STATUS[code[0]] : res.status >= 500 ? 0 : res.status; e.code = code && code[0]; throw e;
      }
      if (j && j.error) { const e = new Error(j.message); e.status = STATUS[j.error] || 400; e.code = j.error; throw e; }
      return j;
    }
    const res = await fetch(API + '?r=' + r, {
      method: body ? 'POST' : 'GET', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token, 'X-Vektor-Token': token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let j = null; try { j = await res.json(); } catch {}
    if (!res.ok || !j) { const e = new Error((j && j.message) || 'Нет связи с сервером'); e.status = res.status; e.code = j && j.error; throw e; }
    return j;
  }

  // Есть ли сервер? Supabase — если задан в config.js; PHP — если api/ отвечает JSON (на GitHub Pages — нет).
  async function hasServer() {
    if (SB) return true;
    if (location.protocol === 'file:') return false;
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 2500);
    try { const r = await fetch(API + '?r=ping', { cache: 'no-store', signal: ctl.signal }); const j = await r.json(); return !!(j && j.ok); }
    catch { return false; } finally { clearTimeout(t); }
  }

  function loadApp() { const s = document.createElement('script'); s.src = 'app.js'; document.body.appendChild(s); }

  /* ---------- Экран входа ---------- */
  function loginScreen(msg) {
    document.body.classList.add('logged-out');
    const app = document.getElementById('app');
    app.innerHTML = `<section class="login sheet" aria-labelledby="login-title">
      <h1 id="login-title">Вход в «Вектор»</h1>
      <p class="muted">Логин и пароль написаны на твоей бумажке.</p>
      <form id="login-form" novalidate>
        <label>Логин<input name="login" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="ученик1" required></label>
        <label>Пароль<input name="password" type="password" autocomplete="current-password" autocapitalize="none" spellcheck="false" placeholder="слово и 4 цифры" required></label>
        <label class="show-pass"><input type="checkbox" id="show-pass"> Показать пароль</label>
        <p class="feedback ${msg ? 'bad' : ''}" id="login-msg" role="alert">${msg ? esc(msg) : ''}</p>
        <button class="btn btn-primary btn-big" type="submit">Войти</button>
      </form></section>`;
    const f = document.getElementById('login-form'), out = document.getElementById('login-msg');
    document.getElementById('show-pass').onchange = e => { f.password.type = e.target.checked ? 'text' : 'password'; };
    const latin = /[a-z]/i;
    const hint = () => { const bad = latin.test(f.login.value) || latin.test(f.password.value); out.className = 'feedback' + (bad ? ' bad' : ''); out.textContent = bad ? 'Смени язык клавиатуры на русский' : ''; };
    f.login.oninput = f.password.oninput = hint;
    f.onsubmit = async e => {
      e.preventDefault();
      if (!f.login.value.trim() || !f.password.value.trim()) { out.className = 'feedback bad'; out.textContent = 'Впиши логин и пароль с бумажки'; return; }
      const btn = f.querySelector('button[type=submit]'); btn.disabled = true; out.className = 'feedback'; out.textContent = 'Входим…';
      try {
        const r = await call('login', { login: f.login.value, password: f.password.value });
        startSession(r);
      } catch (err) {
        out.className = 'feedback bad'; out.textContent = err.status ? err.message : 'Нет связи с сервером. Проверь интернет и попробуй ещё раз.';
        btn.disabled = false;
      }
    };
    f.login.focus();
  }

  function displayName(r) {
    if (r.label) return r.label;
    const m = /^ученик(\d+)$/.exec(r.login || '');
    return m ? 'Ученик ' + m[1] : r.login;
  }

  function startSession(r) {
    ls.set(SESS, { token: r.token, login: r.login, name: displayName(r) });
    const st = r.state && typeof r.state === 'object' ? r.state : {};
    st.settings = { ...(st.settings || {}), name: displayName(r) };
    ls.set(KEY, st); // прогресс прошлого ученика на этом устройстве затирается
    location.hash = 'home'; location.reload();
  }

  /* ---------- Синхронизация ---------- */
  function makeSync(sess) {
    const OUT = 'vektor-outbox:' + sess.login, DIRTY = 'vektor-dirty:' + sess.login;
    let outbox = ls.get(OUT) || [], pendingState = null, timer = null, busy = false;
    const status = el => {
      const b = document.getElementById('sync-status'); if (!b) return;
      const unsent = pendingState || outbox.length;
      b.textContent = el === 'offline' ? 'Нет связи — ответы сохранятся позже' : unsent ? 'Сохраняем…' : 'Сохранено';
      b.dataset.state = el === 'offline' ? 'offline' : unsent ? 'pending' : 'ok';
    };
    async function flush() {
      if (busy || (!pendingState && !outbox.length)) return true;
      busy = true; clearTimeout(timer);
      const state = pendingState, events = outbox.slice(0, 200);
      try {
        const r = await call('sync', { state: state || undefined, events }, sess.token);
        const acc = new Set(r.accepted || []);
        outbox = outbox.filter(e => !acc.has(e.id)); ls.set(OUT, outbox);
        if (pendingState === state) { pendingState = null; ls.del(DIRTY); }
        busy = false; status('ok');
        if (pendingState || outbox.length) timer = setTimeout(flush, 300);
        return true;
      } catch (err) {
        busy = false;
        if (err.status === 401) { ls.del(SESS); loginScreenAfterExpiry(); return false; }
        status('offline'); timer = setTimeout(flush, RETRY); return false;
      }
    }
    const later = () => { clearTimeout(timer); status(); timer = setTimeout(flush, DEBOUNCE); };
    addEventListener('online', flush);
    addEventListener('pagehide', () => { flush(); });
    return {
      login: sess.login,
      push(state) { pendingState = JSON.parse(JSON.stringify(state)); ls.set(DIRTY, 1); later(); },
      event(type, data) {
        const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g, '');
        outbox.push({ id, type, data, ts: Date.now() }); if (outbox.length > 2000) outbox = outbox.slice(-2000);
        ls.set(OUT, outbox); later();
      },
      flush, unsent: () => !!(pendingState || outbox.length),
    };
  }

  function loginScreenAfterExpiry() { ls.del(KEY); location.reload(); }

  async function logout(sync, force) {
    if (!force && sync.unsent()) {
      const ok = await sync.flush();
      if (!ok) { const b = document.getElementById('logout-btn'); b.textContent = 'Нет связи. Выйти всё равно?'; b.onclick = () => logout(sync, true); return; }
    }
    const s = ls.get(SESS);
    try { if (s) await call('logout', {}, s.token); } catch {}
    ls.del(SESS); ls.del(KEY); location.hash = ''; location.reload();
  }

  function chrome(sync, sess) {
    document.body.classList.add('logged-in');
    const head = document.querySelector('main > header');
    head.insertAdjacentHTML('beforeend', `<span class="sync-status" id="sync-status" data-state="ok" aria-live="polite">Сохранено</span>
      <button class="btn btn-ghost btn-sm" id="logout-btn" type="button">Выйти · ${esc(sess.name)}</button>`);
    document.getElementById('logout-btn').onclick = () => logout(sync);
    const reset = document.getElementById('reset'); if (reset) reset.closest('span').hidden = true; // стереть прогресс может только учитель
    const badge = document.querySelector('header .badge'); if (badge) badge.hidden = true;
    // Ф-07: автовыход после 20 минут бездействия на общем компьютере
    let idle; const poke = () => { clearTimeout(idle); idle = setTimeout(() => logout(sync), IDLE_MIN * 60000); };
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(e => addEventListener(e, poke, { passive: true })); poke();
  }

  async function boot() {
    if (!(await hasServer())) { window.VEKTOR_SYNC = null; loadApp(); return; }
    const sess = ls.get(SESS);
    if (!sess || !sess.token) { ls.del(KEY); loginScreen(); return; }
    try {
      const r = await call('state', null, sess.token);
      // сервер — источник истины; локальную копию берём, только если она новее (не успела уйти до перезагрузки)
      const dirty = ls.get('vektor-dirty:' + sess.login) && ls.get(KEY);
      if (r.state && !dirty) ls.set(KEY, { ...r.state, settings: { ...(r.state.settings || {}), name: sess.name } });
    } catch (err) {
      if (err.status === 401) { ls.del(SESS); ls.del(KEY); loginScreen('Сессия закончилась, войди заново'); return; }
      // нет связи — работаем с локальной копией, отправим позже
    }
    const sync = makeSync(sess);
    window.VEKTOR_SYNC = sync;
    if (ls.get('vektor-dirty:' + sess.login) && ls.get(KEY)) sync.push(ls.get(KEY)); // не успели отправить в прошлый раз
    chrome(sync, sess);
    loadApp();
  }
  window.VEKTOR_ACCOUNT = { boot };
  boot();
})();
