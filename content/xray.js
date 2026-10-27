/* =========================================================
   Рентген мышления — черновик и детектор уровней 1–2 (CL-3).
   window.VEKTOR_XRAY = { exprOf, analyze, openDraft }
   ========================================================= */
(function (root) {
  'use strict';
  const R = root.VEKTOR_RATIONAL, K = root.VEKTOR_BUGS;

  // условие задачи → строка для движка («1/2 + 1/3»), или null, если задача словесная
  function exprOf(task) {
    if (!task || task.xray && task.xray.expr) return task && task.xray ? task.xray.expr : null;
    const q = String(task.question || '')
      .replace(/<span class="frac"><span>(\d+)<\/span><span>(\d+)<\/span><\/span>/g, '$1/$2')
      .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s*=\s*\?\s*$/, '').trim();
    if (!q || /[?а-яё]/i.test(q)) return null;
    const r = R.evalLine(q);
    return r.ok ? q : null;
  }

  /* analyze → { stepsOk, errorAt, values, bug, level, reason }
     lines[0] — условие. mistakeId — то, что уже нашёл детектор уровня 1 по ответу. */
  function analyze(topic, lines, mistakeId) {
    const c = R.checkSteps(lines);
    let bug = null, level = null;
    if (!c.ok && c.errorAt > 0 && c.reason === 'value-changed') {
      bug = K.detectStep(topic, lines[c.errorAt - 1], lines[c.errorAt]);
      if (bug) level = 2;
    }
    if (!bug && mistakeId && K.byKey[`${topic}:${mistakeId}`]) { bug = K.byKey[`${topic}:${mistakeId}`]; level = 1; }
    return { stepsOk: c.ok, errorAt: c.errorAt, values: c.values, reason: c.reason, bug, level };
  }

  /* ---------- Черновик ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const pretty = line => esc(line).replace(/(\d+)\s*\/\s*(\d+)/g, '<span class="frac"><span>$1</span><span>$2</span></span>').replace(/\*/g, '·');
  const KEYS = ['/', '+', '−', '·', ':', '␣'];
  const ROW = (i, v = '') => `<div class="xr-row" data-row="${i}"><span class="xr-eq">=</span>
    <input class="xr-in" inputmode="numeric" autocomplete="off" spellcheck="false" value="${esc(v)}" aria-label="Строка ${i}">
    <span class="xr-prev" aria-hidden="true"></span><span class="xr-mark"></span></div>`;

  /* openDraft(el, { topic, expr, mistakeId, onResult(res, lines), onSkip() }) */
  function openDraft(el, { topic, expr, mistakeId, prefill = '', onResult, onSkip } = {}) {
    el.innerHTML = `<div class="xray card">
      <p class="xr-title">Давай поймаем жучка! Запиши, как считал</p>
      <div class="xr-lines">
        <div class="xr-row xr-cond"><span class="xr-eq"></span><span class="xr-prev">${pretty(expr)}</span></div>
        ${ROW(1, prefill)}
      </div>
      <div class="xr-keys">${KEYS.map(k => `<button type="button" class="xr-key" data-k="${k}">${k === '␣' ? 'пробел' : k}</button>`).join('')}</div>
      <div class="xr-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-xr="add">+ строка</button>
        <button type="button" class="btn btn-primary" data-xr="done">Готово</button>
      </div>
      <button type="button" class="xr-skip" data-xr="skip">Не помню, как решал</button>
      <div class="xr-result" aria-live="polite"></div>
    </div>`;
    const box = el.querySelector('.xray'), lines = box.querySelector('.xr-lines');
    let focused = null;
    const rows = () => [...lines.querySelectorAll('.xr-row[data-row]')];
    const bindRow = row => {
      const inp = row.querySelector('.xr-in'), prev = row.querySelector('.xr-prev');
      const upd = () => { prev.innerHTML = inp.value.trim() ? pretty(inp.value) : ''; row.classList.remove('bad', 'ok'); row.querySelector('.xr-mark').textContent = ''; };
      inp.addEventListener('input', upd); inp.addEventListener('focus', () => (focused = inp));
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); done(); } });
      upd();
    };
    rows().forEach(bindRow);
    const add = () => {
      if (rows().length >= 4) return;
      lines.insertAdjacentHTML('beforeend', ROW(rows().length + 1));
      const r = rows().at(-1); bindRow(r); r.querySelector('.xr-in').focus();
    };
    const keyMap = { '−': ' − ', '+': ' + ', '·': ' · ', ':': ' : ', '/': '/', '␣': ' ' };
    box.querySelectorAll('.xr-key').forEach(b => b.onclick = () => {
      const inp = focused || rows().at(-1).querySelector('.xr-in');
      const a = inp.selectionStart ?? inp.value.length, z = inp.selectionEnd ?? a, ins = keyMap[b.dataset.k];
      inp.value = (inp.value.slice(0, a) + ins + inp.value.slice(z)).replace(/\s{2,}/g, ' ');
      inp.dispatchEvent(new Event('input')); inp.focus(); const p = a + ins.length; inp.setSelectionRange(p, p);
    });
    function done() {
      const vals = rows().map(r => r.querySelector('.xr-in').value.trim()).filter(Boolean);
      const res = box.querySelector('.xr-result');
      if (!vals.length) { res.innerHTML = '<p class="xr-note">Запиши хотя бы одну строку — как ты считал.</p>'; return; }
      const all = [expr, ...vals];
      const a = analyze(topic, all, mistakeId);
      const filled = rows().filter(r => r.querySelector('.xr-in').value.trim());
      filled.forEach((r, i) => {
        const mark = r.querySelector('.xr-mark');
        const bad = i + 1 === a.errorAt, before = a.errorAt < 0 || i + 1 < a.errorAt;
        r.classList.toggle('bad', bad); r.classList.toggle('ok', before);
        mark.innerHTML = bad ? (root.VEKTOR_ART ? root.VEKTOR_ART.bug(a.bug ? a.bug.key : '?', { size: 28 }) : '🐞') : before ? '✓' : '';
      });
      if (a.reason && a.reason !== 'value-changed' && a.errorAt > 0)
        res.innerHTML = '<p class="xr-note">Эту строку не получилось прочитать. Пиши числа и знаки: 1/2 + 1/3.</p>';
      else if (a.stepsOk)
        res.innerHTML = '<p class="xr-note">В черновике всё верно! Впиши последний результат в ответ.</p>';
      else if (a.bug)
        res.innerHTML = `<p class="xr-found">Поймали жучка! Это ${esc(a.bug.kidName)}.</p>`;
      else
        res.innerHTML = `<p class="xr-note">Ошибка спряталась в строке ${a.errorAt}. Сравни её с предыдущей.</p>`;
      onResult && onResult(a, all);
    }
    box.querySelector('[data-xr="add"]').onclick = add;
    box.querySelector('[data-xr="done"]').onclick = done;
    box.querySelector('[data-xr="skip"]').onclick = () => { el.innerHTML = ''; onSkip && onSkip(); };
    setTimeout(() => rows()[0].querySelector('.xr-in').focus(), 0);
    return { done, add };
  }

  root.VEKTOR_XRAY = { exprOf, analyze, openDraft, pretty };
})(typeof window !== 'undefined' ? window : globalThis);
