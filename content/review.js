/* =========================================================
   Разбор ошибки в 4 шага и статусы жучков (CL-4).
   Найти → Столкнуть → Починить → Проверить.
   window.VEKTOR_REVIEW = { ensure, caught, healing, beaten, addDays, open }
   ========================================================= */
(function (root) {
  'use strict';
  const K = root.VEKTOR_BUGS, R = root.VEKTOR_RATIONAL;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fr = s => esc(s).replace(/(\d+)\/(\d+)/g, '<span class="frac"><span>$1</span><span>$2</span></span>');

  /* ---------- Статусы ----------
     state.bugs[key] = { topic, status: caught|healing|beaten, found, next, stage, cycles, conflict } */
  const addDays = (day, n) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const ensure = state => (state.bugs && typeof state.bugs === 'object' && !Array.isArray(state.bugs) ? state.bugs : (state.bugs = {}));
  function caught(bugs, key, today) {
    const b = bugs[key], bug = K.byKey[key];
    if (!bug) return null;
    if (b && b.status === 'caught') return b;
    bugs[key] = { topic: bug.topic, status: 'caught', found: today, next: null, stage: 0,
      cycles: (b ? b.cycles : 0) + (b ? 1 : 0), conflict: b ? ((b.conflict || 0) + 1) % bug.conflicts.length : 0, beatenAt: b && b.beatenAt || null };
    return bugs[key];
  }
  function healing(bugs, key, today) { const b = bugs[key]; if (!b) return null; Object.assign(b, { status: 'healing', next: addDays(today, 1), stage: 1 }); return b; }
  function beaten(bugs, key, today) { const b = bugs[key]; if (!b) return null; Object.assign(b, { status: 'beaten', next: addDays(today, 7), stage: 3, beatenAt: today }); return b; }

  /* ---------- Ввод ответа: черновик, знаки или поле ---------- */
  function answerer(el, p, onAnswer) {
    const X = root.VEKTOR_XRAY;
    if (p.expr && X) {
      X.openDraft(el, { topic: p.topic, expr: p.expr, title: 'Реши по шагам', skip: false, ai: false,
        onResult: (a, lines) => onAnswer(lines[lines.length - 1].replace(/^=\s*/, ''), a) });
      return;
    }
    if (p.sign) {
      el.innerHTML = `<div class="rv-choices">${['<', '=', '>'].map(s => `<button type="button" class="btn btn-ghost rv-sign" data-v="${s}">${s}</button>`).join('')}</div>`;
      el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => onAnswer(b.dataset.v));
      return;
    }
    el.innerHTML = `<form class="rv-ans"><input class="xr-in" inputmode="numeric" autocomplete="off" aria-label="Ответ" placeholder="ответ">
      <button type="button" class="xr-key" data-k="/">/</button><button class="btn btn-primary">Проверить</button></form>`;
    const f = el.querySelector('form'), inp = f.querySelector('input');
    f.querySelector('[data-k]').onclick = () => { inp.value += '/'; inp.focus(); };
    f.onsubmit = e => { e.preventDefault(); if (inp.value.trim()) onAnswer(inp.value.trim()); };
    setTimeout(() => inp.focus(), 0);
  }
  function isRight(p, raw) {
    const C = root.VEKTOR_CHECK;
    if (p.sign) return raw === p.sign;
    const r = C.check(raw, K.toTask(p));
    return !!(r.ok && !(r.almost));
  }

  /* ---------- Разбор ----------
     open(el, { bugKey, own: задача-структура ребёнка | null, kidLine?, today, bugs, lv, onEvent(type, data), onStars(n), onClose() }) */
  function open(el, o) {
    const bug = K.byKey[o.bugKey]; if (!bug) return null;
    const rec = caught(o.bugs, o.bugKey, o.today);
    const T = root.VEKTOR_TONE, V = root.VEKTOR_VISUALS;
    const fig = tag => { const m = String(tag || '').match(/^\[\[(.+)\]\]$/); const g = m && V && V.figureFromTag(m[1]); return g ? `<div class="rv-fig">${V.figure(g)}</div>` : ''; };
    const ev = (type, data) => o.onEvent && o.onEvent(type, Object.assign({ bug: bug.key }, data));
    let step = 0, conflictIdx = rec.conflict || 0;
    el.innerHTML = `<div class="review card" data-bug="${bug.key}">
      <div class="rv-dots">${[0, 1, 2, 3].map(k => `<span class="rv-dot" data-d="${k}"></span>`).join('')}</div>
      <div class="rv-body"></div></div>`;
    const body = el.querySelector('.rv-body');
    const dots = () => el.querySelectorAll('.rv-dot').forEach((d, k) => { d.classList.toggle('on', k === step); d.classList.toggle('done', k < step); });
    const next = label => `<button type="button" class="btn btn-primary rv-next">${label || 'Дальше'}</button>`;
    const bindNext = fn => { const b = body.querySelector('.rv-next'); if (b) b.onclick = fn; };
    // «Не понимаю» — ИИ объясняет этот же шаг иначе, зная найденную ошибку (только если сервер ИИ доступен)
    const STEP = ['найти ошибку', 'контрпример', 'починить'];
    function more() {
      const TU = root.VEKTOR_TUTOR;
      if (!TU || !TU.serverReady || !TU.serverReady() || body.querySelector('.rv-more')) return;
      body.insertAdjacentHTML('beforeend', '<button type="button" class="rv-more">Не понимаю</button><div class="rv-more-out" aria-live="polite"></div>');
      const b = body.querySelector('.rv-more'), out = body.querySelector('.rv-more-out');
      b.onclick = async () => {
        b.disabled = true; out.innerHTML = '<p class="muted">Объясняю по-другому…</p>';
        ev('explain_more', { step: STEP[step] || step });
        try {
          await TU.explainMore({ title: bug.title, fix: bug.fixIdea, step: STEP[step] || '', task: o.own ? o.own.text : '' },
            t => { out.innerHTML = TU.render(t, { streaming: true }).html; });
          b.remove();
        } catch (e) { out.innerHTML = '<p class="muted">Сейчас не получилось. Посмотри на картинку ещё раз и попробуй следующий шаг.</p>'; b.disabled = false; }
      };
    }

    // 1. Найти
    function find() {
      step = 0; dots();
      body.innerHTML = `<div class="rv-find">${T.art(bug, { size: T.senior() ? 40 : 72, status: 'caught' })}
        <div><p class="rv-h">${T.t('findHead', bug)}</p><p>Похоже, ${esc(bug.kidRule)}.</p></div></div>${next()}`;
      bindNext(clash); more();
    }
    // 2. Столкнуть
    function clash() {
      step = 1; dots();
      const c = bug.conflicts[conflictIdx % bug.conflicts.length];
      body.innerHTML = `<p>${fr(c.text.replace(/\[\[[^\]]*\]\]/g, ''))}</p>${fig(c.figure)}
        <p class="rv-q">${fr(c.ask)}</p><div class="rv-choices">${c.choices.map(x => `<button type="button" class="btn btn-ghost rv-choice">${fr(x)}</button>`).join('')}</div><p class="rv-note" aria-live="polite"></p>`;
      more();
      body.querySelectorAll('.rv-choice').forEach((b, k) => b.onclick = () => {
        const right = c.choices[k] === c.right;
        ev('bug_step', { step: 'conflict', ok: right });
        if (right) {
          body.querySelector('.rv-note').innerHTML = T.t('conflictOk');
          body.querySelectorAll('.rv-choice').forEach(x => (x.disabled = true));
          body.insertAdjacentHTML('beforeend', next()); bindNext(fix);
        } else {
          b.disabled = true;
          body.querySelector('.rv-note').innerHTML = 'Посмотри на картинку ещё раз. Подумай, как было бы на самом деле.';
        }
      });
    }
    // 3. Починить: верная идея и своя задача заново
    function fix() {
      step = 2; dots();
      const p = o.own;
      body.innerHTML = `<p class="rv-h">${esc(bug.fixIdea)}</p>${p ? `<p>Теперь реши свою задачу заново:</p><p class="rv-task">${fr(p.text)}</p><div class="rv-ans-host"></div><p class="rv-note" aria-live="polite"></p>` : next()}`;
      more();
      if (!p) return bindNext(twin);
      answerer(body.querySelector('.rv-ans-host'), p, (raw, a) => {
        const ok = isRight(p, raw) && (!a || a.stepsOk);
        ev('bug_step', { step: 'fix', ok });
        const note = body.querySelector('.rv-note');
        if (ok) { note.innerHTML = T.t('fixOk'); if (!body.querySelector('.rv-next')) { body.insertAdjacentHTML('beforeend', next('К проверке')); bindNext(twin); } }
        else note.innerHTML = a && a.errorAt > 0 ? T.t('fixAgain', a.errorAt) : 'Пока не так. Вспомни верную идею выше.';
      });
    }
    // 4. Проверить: задача-двойник
    function twin() {
      step = 3; dots();
      const p = bug.trap(o.lv || 2) || o.own;
      body.innerHTML = `<p>Проверим: задача-двойник.</p><p class="rv-task" data-expr="${esc(p.expr || '')}">${fr(p.text)}</p><div class="rv-ans-host"></div><p class="rv-note" aria-live="polite"></p>`;
      answerer(body.querySelector('.rv-ans-host'), p, (raw, a) => {
        const ok = isRight(p, raw) && (!a || a.stepsOk);
        ev('bug_step', { step: 'twin', ok });
        if (ok) {
          healing(o.bugs, bug.key, o.today);
          o.onStars && o.onStars(3);
          body.innerHTML = `<div class="rv-find">${T.art(bug, { size: T.senior() ? 40 : 72, status: 'healing' })}
            <div><p class="rv-h">${T.t('twinHead')}</p><p>${T.t('twinText', bug)}</p></div></div>
            <p class="rv-stars">+3 ★</p>${next('Продолжить')}`;
          step = 4; dots();
          bindNext(() => { el.innerHTML = ''; o.onClose && o.onClose(true); });
        } else {
          // попался снова — новый круг с другим контрпримером
          conflictIdx++; o.bugs[bug.key].conflict = conflictIdx % bug.conflicts.length; o.bugs[bug.key].cycles++;
          body.querySelector('.rv-note').innerHTML = T.t('twinFail', bug);
          body.insertAdjacentHTML('beforeend', next('Ещё раз')); bindNext(clash);
        }
      });
    }
    find();
    return { step: () => step };
  }

  /* Задача от учителя (Пульс): контрпример + задача-двойник поверх экрана.
     pushCard({ id, bug, payload: { conflict, problem } }, onDone(ok)) */
  function pushCard(push, onDone) {
    const bug = K.byKey[push.bug], pl = push.payload || {}, p = pl.problem;
    if (!bug || !p || document.getElementById('push-card')) return false;
    const c = bug.conflicts[(pl.conflict || 0) % bug.conflicts.length];
    const V = root.VEKTOR_VISUALS, m = String(c.figure || '').match(/^\[\[(.+)\]\]$/), g = m && V && V.figureFromTag(m[1]);
    // Окно поверх экрана с затемнением; «Позже» сворачивает его в плашку, задача не теряется
    const el = document.createElement('div'); el.id = 'push-card'; el.className = 'push-wrap';
    el.innerHTML = `<div class="push-back" data-pc="later"></div>
      <section class="push-card" role="dialog" aria-modal="true" aria-labelledby="pc-title">
        <div class="pc-head"><h2 id="pc-title">Задача от учителя</h2><button type="button" class="pc-later" data-pc="later">Позже</button></div>
        <p>${fr(c.text.replace(/\[\[[^\]]*\]\]/g, ''))}</p>${g ? `<div class="rv-fig">${V.figure(g)}</div>` : ''}
        <p class="rv-task pc-lead" data-expr="${esc(p.expr || '')}">${p.expr ? 'Теперь реши сам:' : fr(p.text)}</p>
        <div class="rv-ans-host"></div><div class="pc-result" aria-live="polite"></div>
      </section>
      <button type="button" class="push-pill" data-pc="open" hidden>Задача от учителя</button>`;
    document.body.appendChild(el);
    const card = el.querySelector('.push-card'), back = el.querySelector('.push-back'), pill = el.querySelector('.push-pill');
    const show = on => { card.hidden = back.hidden = !on; pill.hidden = on; document.body.classList.toggle('push-open', on); };
    el.querySelectorAll('[data-pc="later"]').forEach(b => b.onclick = () => show(false));
    pill.onclick = () => show(true);
    show(true);
    let sent = false;
    answerer(el.querySelector('.rv-ans-host'), p, (raw, a) => {
      const ok = isRight(p, raw) && (!a || a.stepsOk);
      if (!sent) { sent = true; onDone && onDone(ok); }
      el.querySelector('.rv-ans-host').querySelectorAll('button, input').forEach(x => (x.disabled = true));
      el.querySelector('.pc-result').innerHTML = `<p class="${ok ? 'pc-ok' : 'pc-bad'}">${ok ? 'Верно! Учитель увидит твою галочку.' : `Пока не так. Правильный ответ: ${fr(p.answer)}.`}</p>
        <button type="button" class="btn btn-primary" data-pc="close">Готово</button>`;
      el.querySelector('[data-pc="close"]').onclick = () => { document.body.classList.remove('push-open'); el.remove(); };
      el.querySelector('[data-pc="later"].pc-later').hidden = true;
    });
    return true;
  }

  root.VEKTOR_REVIEW = { ensure, caught, healing, beaten, addDays, open, isRight, pushCard };
})(typeof window !== 'undefined' ? window : globalThis);
