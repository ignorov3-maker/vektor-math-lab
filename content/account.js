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
    test_get: (b, t) => ['vektor_test_get', { p_token: t }],
    test_answer: (b, t) => ['vektor_test_answer', { p_token: t, p_n: b.n, p_answer: b.answer, p_sec: b.sec ?? null }],
    test_finish: (b, t) => ['vektor_test_finish', { p_token: t }],
    push_get: (b, t) => ['vektor_push_get', { p_token: t }],
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
    if (location.protocol === 'file:') return false;
    if (SB) return true;
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 2500);
    try { const r = await fetch(API + '?r=ping', { cache: 'no-store', signal: ctl.signal }); const j = await r.json(); return !!(j && j.ok); }
    catch { return false; } finally { clearTimeout(t); }
  }

  function loadApp() { const s = document.createElement('script'); s.src = 'app.js'; document.body.appendChild(s); }

  /* ---------- Экран входа ---------- */
  function loginScreen(msg) {
    document.body.classList.add('logged-out');
    const app = document.getElementById('app');
    const L = window.VEKTOR_LANDING;
    const loginHtml = `<section class="login sheet" aria-labelledby="login-title">
      ${L ? '<h2 id="login-title">Вход для ученика</h2>' : '<h1 id="login-title">Вход в «Вектор»</h1>'}
      <p class="muted">Логин и пароль написаны на твоей бумажке.</p>
      <form id="login-form" novalidate>
        <label>Логин<input name="login" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="ученик1" required></label>
        <label>Пароль<input name="password" type="password" autocomplete="current-password" autocapitalize="none" spellcheck="false" placeholder="слово и 4 цифры" required></label>
        <label class="show-pass"><input type="checkbox" id="show-pass"> Показать пароль</label>
        <p class="feedback ${msg ? 'bad' : ''}" id="login-msg" role="alert">${msg ? esc(msg) : ''}</p>
        <button class="btn btn-primary btn-big" type="submit">Войти</button>
      </form>
      <div class="role-switch"><span>Я учитель</span><a class="btn btn-ghost btn-sm" href="teacher.html">Вход для учителя</a></div></section>`;
    // Первая страница — лендинг, форма входа внутри него
    if (L) { document.body.classList.add('landing'); app.innerHTML = L.render(loginHtml); L.mount(app); }
    else app.innerHTML = loginHtml;
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
    // П-02: на телефоне шапки нет — «Выйти» в верхней полоске рядом со звёздами
    const side = document.querySelector('.sidebar .hud');
    if (side) { side.insertAdjacentHTML('afterend', `<button class="btn btn-ghost btn-sm m-logout" id="m-logout" type="button">Выйти</button>`); document.getElementById('m-logout').onclick = () => logout(sync); }
    const reset = document.getElementById('reset'); if (reset) reset.hidden = true; // стереть прогресс может только учитель
    const badge = document.querySelector('header .badge'); if (badge) badge.hidden = true;
    const adult = document.querySelector('.adult-links'); if (adult) adult.hidden = true; // отчёты для взрослых — в кабинете учителя (П-04)
    const note = document.querySelector('footer span:last-child'); if (note) note.firstChild.textContent = 'Прогресс сохраняется на сервере школы. ';
    exitHook = () => logout(sync);
    // Ф-13: через 25 минут занятия — мягкое напоминание о перерыве (СанПиН), один раз
    setTimeout(() => {
      document.body.insertAdjacentHTML('afterbegin', `<div class="test-banner break-banner" role="status">Ты занимаешься уже 25 минут — сделай перерыв: встань, разомнись, посмотри в окно 🙂
        <button class="btn btn-ghost btn-sm" onclick="this.parentNode.remove()">Хорошо</button></div>`);
    }, (window.VEKTOR_BREAK_MIN || 25) * 60000);
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
    // Тест до/после (Ф-27–Ф-29) и контрольная группа: только тест, без занятий
    if (SB) {
      let tg = null; try { tg = await call('test_get', {}, sess.token); } catch {}
      if (tg && tg.test) { testScreen(sess, tg.test); return; }
      if (tg && tg.group === 'control') { controlScreen(sess); return; }
    }
    const sync = makeSync(sess);
    window.VEKTOR_SYNC = sync;
    if (ls.get('vektor-dirty:' + sess.login) && ls.get(KEY)) sync.push(ls.get(KEY)); // не успели отправить в прошлый раз
    chrome(sync, sess);
    loadApp();
    if (SB) watchTests(sess);
  }

  /* ---------- Тест до и после ---------- */
  // Пока ученик занимается, раз в 20 секунд проверяем, не открыл ли учитель тест
  function watchTests(sess) {
    const tick = async () => {
      if (document.hidden || document.getElementById('test-banner')) return;
      let tg = null; try { tg = await call('test_get', {}, sess.token); } catch { return; }
      if (!tg || !tg.test) return;
      document.body.insertAdjacentHTML('afterbegin', `<div class="test-banner" id="test-banner" role="alert"><b>Учитель открыл тест.</b>
        <button class="btn btn-primary" id="test-go">Начать тест</button></div>`);
      document.getElementById('test-go').onclick = async () => { if (window.VEKTOR_SYNC) await window.VEKTOR_SYNC.flush(); location.reload(); };
    };
    // Пульс: задача от учителя для группы — тот же опрос раз в 20 секунд
    const pushTick = async () => {
      if (document.hidden || document.getElementById('push-card') || !window.VEKTOR_REVIEW) return;
      let r = null; try { r = await call('push_get', {}, sess.token); } catch { return; }
      if (!r || !r.push) return;
      window.VEKTOR_REVIEW.pushCard(r.push, ok => { if (window.VEKTOR_SYNC) { window.VEKTOR_SYNC.event('push_done', { push: r.push.id, ok }); window.VEKTOR_SYNC.flush(); } });
    };
    setInterval(() => { tick(); pushTick(); }, 20000); setTimeout(pushTick, 3000);
  }

  function bareChrome(sess) {
    document.body.classList.add('logged-out', 'test-mode');
    const head = document.querySelector('main > header');
    head.insertAdjacentHTML('beforeend', `<button class="btn btn-ghost btn-sm" id="logout-btn" type="button">Выйти · ${esc(sess.name)}</button>`);
    document.getElementById('logout-btn').onclick = async () => { try { await call('logout', {}, sess.token); } catch {} ls.del(SESS); ls.del(KEY); location.hash = ''; location.reload(); };
  }

  function controlScreen(sess) {
    bareChrome(sess);
    document.getElementById('app').innerHTML = `<section class="login sheet"><h1>Привет, ${esc(sess.name)}!</h1>
      <p>Сейчас для тебя только тест. Подожди, пока учитель его откроет, — тест появится на этой странице сам.</p><p class="muted" id="ctl-msg">Если тест не начинается, скажи учителю.</p>
      <button class="btn btn-ghost" type="button" id="ctl-exit">Выйти</button></section>`;
    document.getElementById('ctl-exit').onclick = () => document.getElementById('logout-btn').click();
    setInterval(async () => { try { const tg = await call('test_get', {}, sess.token); if (tg && tg.test) location.reload(); } catch {} }, 15000);
  }

  // Дроби в условии — «этажом», как в уроках (П-06)
  const fracify = txt => esc(txt)
    .replace(/(\d+) (\d+)\/(\d+)/g, '$1<span class="frac"><span>$2</span><span>$3</span></span>')
    .replace(/(\d+)\/(\d+)/g, '<span class="frac"><span>$1</span><span>$2</span></span>');
  const splitAns = v => { const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(String(v || '').trim()); if (m) return { w: m[1] || '', n: m[2], d: m[3] }; return { w: /^\d+$/.test(String(v || '').trim()) ? String(v).trim() : '', n: '', d: '' }; };

  function testScreen(sess, t) {
    bareChrome(sess);
    const OUTQ = 'vektor-test-q:' + sess.login;
    const answers = { ...(t.answers || {}) }, started = Date.now(), endAt = Date.now() + t.seconds_left * 1000;
    let queue = ls.get(OUTQ) || [];
    const app = document.getElementById('app');
    const box = (n, v) => { const a = splitAns(v); const inp = (part, val, lab) => `<input data-part="${part}" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="4" value="${esc(val)}" aria-label="${lab} — задание ${n}">`;
      return `<div class="frac-input with-whole test-box" role="group" aria-label="Ответ к заданию ${n}"><label class="fi-whole">${inp('w', a.w, 'Целые')}<span>целые</span></label>
        <div class="fi-frac">${inp('n', a.n, 'Числитель')}<i aria-hidden="true"></i>${inp('d', a.d, 'Знаменатель')}</div></div>`; };
    app.innerHTML = `<section class="test sheet" aria-labelledby="test-title">
      <div class="test-head"><h1 id="test-title">${t.phase === 'pre' ? 'Входной тест' : 'Итоговый тест'}</h1><span class="test-count" id="test-count"></span><span class="test-timer" id="test-timer" aria-label="Осталось времени"></span></div>
      <p class="muted">Реши сам, без подсказок. Дробь вписывай клеточками: числитель сверху, знаменатель снизу. Если в ответе целое число — впиши его в клетку «целые». Ответы сохраняются сами.</p>
      <ol class="test-list">${t.items.map(i => `<li data-n="${i.n}"><p>${fracify(i.prompt)}</p>${i.kind === 'sign'
        ? `<div class="test-signs" role="group" aria-label="Знак">${['<', '=', '>'].map(z => `<button type="button" class="btn btn-ghost" data-sign="${esc(z)}" aria-pressed="${answers[i.n] === z}">${esc(z)}</button>`).join('')}</div>`
        : box(i.n, answers[i.n])}
        <span class="test-saved" aria-live="polite"></span></li>`).join('')}</ol>
      <p class="test-left" id="test-left"></p>
      <button class="btn btn-primary btn-big" id="test-finish" type="button">Закончить тест</button>
    </section>`;
    const answered = () => Object.values(answers).filter(v => String(v).trim()).length;
    const count = () => { const k = answered(); document.getElementById('test-count').innerHTML = `<span class="tc-word">Отвечено </span>${k} из ${t.items.length}`; };
    // отправка по одной и строго по очереди: два одновременных вызова не должны терять ответы
    let flushing = null;
    const flushQ = () => (flushing = (flushing || Promise.resolve()).then(sendQ, sendQ));
    const sendQ = async () => {
      while (queue.length) {
        const q = queue[0];
        try { const r = await call('test_answer', q, sess.token); if (r && r.error === 'closed') { queue = []; break; } }
        catch (e) { if (e.status === 401) break; return false; }
        queue = queue.filter(x => x !== q); ls.set(OUTQ, queue);
      }
      ls.set(OUTQ, queue); return true;
    };
    const save = (n, v, li) => {
      if ((answers[n] || '') === v) return;
      answers[n] = v; count();
      queue = queue.filter(q => q.n !== n).concat({ n, answer: v, sec: Math.round((Date.now() - started) / 1000) }); ls.set(OUTQ, queue);
      flushQ().then(ok => { const m = li.querySelector('.test-saved'); m.textContent = ok ? (v ? 'сохранено' : '') : 'сохраним, когда будет связь'; });
    };
    // клеточки → строка ответа: «36», «3/4» или «2 1/3»
    const readBox = li => { const g = k => li.querySelector(`[data-part="${k}"]`).value.replace(/\D/g, ''); const w = g('w'), n = g('n'), d = g('d');
      if (n && d) return (w ? w + ' ' : '') + n + '/' + d; if (!n && !d) return w; return null; };
    app.querySelectorAll('.test-box').forEach(bx => {
      const li = bx.closest('li'), n = +li.dataset.n, inputs = [...bx.querySelectorAll('input')];
      const commit = () => { const v = readBox(li); const m = li.querySelector('.test-saved');
        if (v === null) { m.textContent = 'допиши дробь: нужны и числитель, и знаменатель'; return; } save(n, v, li); };
      inputs.forEach(inp => {
        inp.oninput = () => { inp.value = inp.value.replace(/\D/g, ''); };
        inp.onchange = commit;
        inp.onkeydown = e => { if (e.key !== 'Enter') return; e.preventDefault(); commit();
          const all = [...app.querySelectorAll('.test-box input')]; const nx = inp.dataset.part === 'n' ? bx.querySelector('[data-part=d]') : inp.dataset.part === 'w' ? bx.querySelector('[data-part=n]') : all[all.indexOf(inp) + 1];
          if (nx) nx.focus(); };
      });
    });
    app.querySelectorAll('[data-sign]').forEach(b => b.onclick = () => {
      const li = b.closest('li'); li.querySelectorAll('[data-sign]').forEach(x => x.setAttribute('aria-pressed', x === b));
      save(+li.dataset.n, b.dataset.sign, li);
    });
    const finish = async () => {
      document.activeElement && document.activeElement.blur();
      const ok = await flushQ();
      if (!ok) { document.getElementById('test-left').textContent = 'Нет связи — ответы сохранены на этом устройстве. Подключись к интернету и нажми ещё раз.'; return; }
      try { await call('test_finish', {}, sess.token); } catch { document.getElementById('test-left').textContent = 'Нет связи, нажми ещё раз.'; return; }
      ls.del(OUTQ); clearInterval(tm);
      app.innerHTML = `<section class="login sheet"><h1>Тест сдан. Спасибо!</h1><p>Можно продолжать занятия.</p><button class="btn btn-primary btn-big" onclick="location.reload()">Продолжить</button></section>`;
    };
    let armed = false;
    document.getElementById('test-finish').onclick = () => {
      app.querySelectorAll('.test-box').forEach(bx => { const li = bx.closest('li'), v = readBox(li); if (v !== null) save(+li.dataset.n, v, li); });
      const left = t.items.length - answered();
      if (left > 0 && !armed) { armed = true; document.getElementById('test-finish').textContent = `Не отвечено ${left}. Всё равно закончить?`; return; }
      finish();
    };
    const tick = () => {
      const s = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      const el = document.getElementById('test-timer'); if (!el) return;
      el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; el.classList.toggle('low', s < 300);
      if (s === 0) { clearInterval(tm); finish(); }
    };
    const tm = setInterval(tick, 1000); tick();
    count(); flushQ();
    scrollTo(0, 0);
  }
  let exitHook = null;
  window.VEKTOR_ACCOUNT = { boot, logout: () => exitHook && exitHook() };
  boot();
})();
