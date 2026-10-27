/* =========================================================
   Разминка с ловушками (CL-5).
   Расписание: двойник решён → ловушка через 1 день (stage 1) →
   через 3 дня (stage 2) → жучок побеждён → контрольная ловушка
   через 7 дней (stage 3, только для метрики «жучок не вернулся»).
   Попался на stage 1–2 → снова «пойман», новый круг разбора.
   Даты — это «не раньше чем»: не заходил неделю — ловушка ждёт.
   window.VEKTOR_WARMUP = { plan, apply, run }
   ========================================================= */
(function (root) {
  'use strict';
  const K = root.VEKTOR_BUGS, RV = root.VEKTOR_REVIEW;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fr = s => esc(s).replace(/(\d+)\/(\d+)/g, '<span class="frac"><span>$1</span><span>$2</span></span>');
  const MAX_TRAPS = 2;

  // → [{ type:'trap', key, stage }] + 1 повторение, если есть ловушки. Пусто — разминки нет.
  function plan(bugs, today, { reviewTopic = null } = {}) {
    const due = Object.entries(bugs || {})
      .filter(([k, b]) => K.byKey[k] && b && b.next && b.next <= today && (b.status === 'healing' || (b.status === 'beaten' && b.stage === 3 && !b.controlDone)))
      .sort((a, b) => (a[1].status === 'healing' ? 0 : 1) - (b[1].status === 'healing' ? 0 : 1) || a[1].next.localeCompare(b[1].next))
      .slice(0, MAX_TRAPS)
      .map(([key, b]) => ({ type: 'trap', key, stage: b.status === 'beaten' ? 3 : b.stage }));
    if (due.length && reviewTopic != null) due.push({ type: 'review', topic: reviewTopic });
    return due;
  }

  // результат ловушки → { status, beaten?: true, returned?: true }
  function apply(bugs, key, ok, today) {
    const b = bugs[key]; if (!b) return null;
    if (b.status === 'beaten') { b.controlDone = true; b.controlOk = !!ok; b.next = null; return { status: 'beaten', control: true }; }
    if (!ok) { RV.caught(bugs, key, today); return { status: 'caught', returned: true }; }
    if (b.stage <= 1) { Object.assign(b, { stage: 2, next: RV.addDays(today, 3) }); return { status: 'healing' }; }
    RV.beaten(bugs, key, today); return { status: 'beaten', beaten: true };
  }

  /* run(el, { items, bugs, today, lv, reviewTask(topicIdx) → task, check(raw, task), onEvent, onStars, onReview(key, problem), onDone })
     Ловушки не подписаны как ловушки — это обычные задачи разминки. */
  function run(el, o) {
    let k = 0, right = 0;
    const total = o.items.length;
    const frame = inner => `<div class="warmup card"><p class="wu-kicker">Разминка · ${Math.min(k + 1, total)} из ${total}</p>${inner}</div>`;
    function next() {
      if (k >= total) return finish();
      const it = o.items[k];
      if (it.type === 'trap') {
        const bug = K.byKey[it.key];
        const p = bug.trap(o.lv || 2);
        if (!p) { k++; return next(); }
        el.innerHTML = frame(`<p class="rv-task" data-expr="${esc(p.expr || '')}">${fr(p.text)}</p><div class="wu-ans"></div><div class="wu-fb" aria-live="polite"></div>`);
        ask(el.querySelector('.wu-ans'), p, raw => {
          const ok = RV.isRight(p, raw), fell = !ok && K.caught(bug, p, raw);
          // неверно, но не по правилу жучка — жучок не вернулся, ловушку повторим в следующий раз
          const res = ok || fell ? apply(o.bugs, it.key, ok, o.today) : { status: o.bugs[it.key].status, miss: true };
          o.onEvent && o.onEvent('trap', { bug: it.key, ok, stage: it.stage, fell: !!fell });
          if (res.beaten) { o.onEvent && o.onEvent('bug_beaten', { bug: it.key }); o.onStars && o.onStars(10); }
          if (ok) right++;
          const fb = el.querySelector('.wu-fb');
          if (res.beaten) fb.innerHTML = `<p class="wu-win">${root.VEKTOR_ART ? root.VEKTOR_ART.bug(it.key, { size: 48, status: 'beaten' }) : ''} ${esc(bug.kidName)} побеждён! +10 ★</p>`;
          else if (res.control) fb.innerHTML = `<p class="wu-ok">${ok ? 'Верно!' : `Ответ: ${fr(p.answer)}.`}</p>`;
          else if (ok) fb.innerHTML = `<p class="wu-ok">Ты не попался жучку ${esc(bug.kidName)}! Ещё одна проверка — и он побеждён.</p>`;
          else if (res.returned) fb.innerHTML = `<p class="wu-bad">Ой, ${esc(bug.kidName)} вернулся. Ничего — поймаем ещё раз.</p><button type="button" class="btn btn-primary" data-wu="review">Разобраться</button>`;
          else fb.innerHTML = `<p class="wu-bad">Пока не так. Правильный ответ: ${fr(p.answer)}.</p>`;
          fb.insertAdjacentHTML('beforeend', `<button type="button" class="btn ${res.returned ? 'btn-ghost' : 'btn-primary'}" data-wu="next">Дальше</button>`);
          const rb = fb.querySelector('[data-wu="review"]'); if (rb) rb.onclick = () => o.onReview && o.onReview(it.key, p, () => { k++; next(); });
          fb.querySelector('[data-wu="next"]').onclick = () => { k++; next(); };
        });
        return;
      }
      // повторение освоенной темы — обычная задача генератора
      const task = o.reviewTask(it.topic);
      el.innerHTML = frame(`<p class="rv-task">${task.story ? esc(task.story.replace(/<[^>]+>/g, '')) + ' ' : ''}${task.question}</p><div class="wu-ans"></div><div class="wu-fb" aria-live="polite"></div>`);
      const p = { answer: task.answer, sign: ['<', '>', '='].includes(task.answer) ? task.answer : null };
      ask(el.querySelector('.wu-ans'), p, raw => {
        const r = o.check(raw, task), ok = !!(r.ok && !r.almost);
        if (ok) right++;
        o.onEvent && o.onEvent('warmup_review', { topic: it.topic, ok });
        el.querySelector('.wu-fb').innerHTML = `<p class="${ok ? 'wu-ok' : 'wu-bad'}">${ok ? 'Верно!' : `Ответ: ${fr(task.answer)}.`}</p><button type="button" class="btn btn-primary" data-wu="next">Дальше</button>`;
        el.querySelector('[data-wu="next"]').onclick = () => { k++; next(); };
      });
    }
    function ask(host, p, cb) {
      let done = false; const once = raw => { if (done) return; done = true; host.querySelectorAll('button,input').forEach(x => (x.disabled = true)); cb(raw); };
      if (p.sign) {
        host.innerHTML = `<div class="rv-choices">${['<', '=', '>'].map(s => `<button type="button" class="btn btn-ghost" data-v="${s}">${s}</button>`).join('')}</div>`;
        host.querySelectorAll('[data-v]').forEach(b => b.onclick = () => once(b.dataset.v));
        return;
      }
      host.innerHTML = `<form class="rv-ans"><input class="xr-in" inputmode="numeric" autocomplete="off" aria-label="Ответ" placeholder="ответ">
        <button type="button" class="xr-key" data-k="/">/</button><button class="btn btn-primary">Ответить</button></form>`;
      const f = host.querySelector('form'), inp = f.querySelector('input');
      f.querySelector('[data-k]').onclick = () => { inp.value += '/'; inp.focus(); };
      f.onsubmit = e => { e.preventDefault(); if (inp.value.trim()) once(inp.value.trim()); };
      setTimeout(() => inp.focus(), 0);
    }
    function finish() {
      el.innerHTML = `<div class="warmup card"><p class="rv-h">Разминка готова: ${right} из ${total}</p><p>Теперь — к новым задачам.</p><button type="button" class="btn btn-primary" data-wu="done">Продолжить</button></div>`;
      el.querySelector('[data-wu="done"]').onclick = () => o.onDone && o.onDone(right, total);
    }
    next();
  }

  root.VEKTOR_WARMUP = { plan, apply, run };
})(typeof window !== 'undefined' ? window : globalThis);
