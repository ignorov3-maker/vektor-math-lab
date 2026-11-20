/* Кабинет взрослого: список детей и недельная карточка.
   Родитель видит результат — какие правила нашли и закрыли, — а не каждую попытку.
   Те же функции рисуют карточку и для репетитора (у него ещё даты и инструменты). */
(() => {
 const api = window.VEKTOR_ADULT, { rpc, esc, host } = api;
 let current = null, children = [];
 const tutor = api.role === 'tutor';
 const who = tutor ? 'ученика' : 'ребёнка';
 const topic = id => [...(window.VEKTOR_FRACTIONS?.topics || []), ...(window.VEKTOR_GEOMETRY?.topics || [])].find(t => t.id === id)?.title || id;
 const date = s => s ? new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—';
 const plural = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many; };
 const ruleTitle = key => window.VEKTOR_BUGS?.byKey[key]?.title || 'Правило пока не описано в каталоге';
 // статус правила: найдено → разобрано → проверено задачей через дни
 const ruleState = b => b.checked_at && b.checked_at >= b.found_at ? 'closed' : b.beaten_at && b.beaten_at >= b.found_at ? 'fixed' : 'open';
 const STATE_TEXT = { open: 'Разбираем', fixed: 'Разобрали — ждём проверку', closed: 'Закрыто: проверено через дни' };

 function credentials(r) {
  const box = document.createElement('section');
  box.className = 'adult-card adult-cred no-print';
  box.innerHTML = `<h2>Вход для ${who} готов</h2><p class="adult-muted">Пароль показан один раз. Распечатайте лист или запишите — ${tutor ? 'ученик' : 'ребёнок'} войдёт с ним на главной странице Вектора.</p>
   <dl class="adult-cred-grid"><div><dt>Логин</dt><dd><strong>${esc(r.login)}</strong></dd></div><div><dt>Пароль</dt><dd><strong>${esc(r.password)}</strong></dd></div></dl>
   <div class="adult-actions"><button data-print>Открыть лист для печати</button><button class="secondary" data-close>Я сохранил, закрыть</button></div>`;
  box.querySelector('[data-print]').onclick = () => { const w = window.open('print/slip.html', '_blank'); if (!w) { api.message('Разрешите открытие окна для печати', true); return; } w.opener = null; w.addEventListener('load', () => { w.VEKTOR_PRINT.fill([{ login: r.login, password: r.password, class: '', url: location.origin }]); }, { once: true }); };
  box.querySelector('[data-close]').onclick = () => { box.remove(); r.password = ''; };
  host.prepend(box);
 }

 // Неделя: 7 клеток, закрашены дни с занятиями
 function weekStrip(days) {
  const done = new Set(days.map(d => d.day)), out = [];
  for (let k = 6; k >= 0; k--) {
   const d = new Date(); d.setDate(d.getDate() - k);
   const iso = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' });
   const on = done.has(iso);
   out.push(`<li class="${on ? 'on' : ''}" title="${d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}${on ? ': занимался' : ''}"><span>${d.toLocaleDateString('ru-RU', { weekday: 'short' })}</span><i aria-hidden="true">${on ? '✓' : ''}</i></li>`);
  }
  return `<ol class="adult-week" aria-label="Дни занятий за неделю">${out.join('')}</ol>`;
 }

 // Одна подсказка родителю — по тому, что было на неделе. Без игровых слов: это текст для взрослого.
 function talkTip(r, found, closed) {
  if (!r.days.length) return 'На этой неделе занятий не было. Вместо напоминания попробуйте договориться: разобрал тему из домашки в Векторе — дальше свободное время.';
  if (closed.length) return `Спросите, почему правило «${ruleTitle(closed[0].key).toLowerCase()}» неверное. Пусть объяснит вам на примере: так тема закрепится лучше всего.`;
  if (found.length) return 'Похвалите за найденную ошибку, а не за то, что ошибок не было. Найти своё неверное правило — это и есть половина работы.';
  return 'Спросите, что на этой неделе было самым понятным. Ошибок не нашлось — значит, темы идут ровно.';
 }

 async function showChild(id) {
  current = +id;
  host.querySelectorAll('[data-child]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.child === current)));
  const out = document.getElementById('adult-child'); out.innerHTML = '<div class="adult-card adult-loading">Загружаем отчёт…</div>';
  try {
   const r = await rpc(tutor ? 'vektor_tutor_child' : 'vektor_parent_child', { p_token: api.session.token, p_student: current });
   if (current !== +id) return;
   const name = esc(r.label || 'Ученик');
   const found = r.rules, fixed = found.filter(b => ruleState(b) !== 'open'), closed = found.filter(b => ruleState(b) === 'closed');
   const daysN = r.days.length;
   const lead = daysN
    ? `Занимался ${daysN} ${plural(daysN, 'день', 'дня', 'дней')} из 7. ${found.length ? `Нашли ${found.length} ${plural(found.length, 'неверное правило', 'неверных правила', 'неверных правил')} в рассуждениях${fixed.length ? `, ${fixed.length} уже ${fixed.length === 1 ? 'разобрано' : 'разобраны'}` : ''}.` : 'Устойчивых ошибок не нашлось.'}`
    : 'На этой неделе занятий не было.';
   out.innerHTML = `<article class="adult-card adult-report">
    <div class="adult-report-head"><div><p class="adult-kicker">Последние 7 дней</p><h2>${name}</h2></div>${weekStrip(r.days)}</div>
    <p class="adult-lead">${lead}</p>
    <div class="adult-stats">
     <p><b>${daysN}</b><span>${plural(daysN, 'день', 'дня', 'дней')} занятий</span></p>
     <p><b>${r.solved}</b><span>${plural(r.solved, 'задача решена', 'задачи решены', 'задач решено')} верно</span></p>
     <p><b>${found.length}</b><span>${plural(found.length, 'ошибка найдена', 'ошибки найдены', 'ошибок найдено')}</span></p>
     <p class="good"><b>${closed.length}</b><span>${plural(closed.length, 'закрыта', 'закрыты', 'закрыто')} совсем</span></p>
    </div>
    <h3>Над какими правилами работали</h3>
    ${found.length ? `<ul class="adult-rules">${found.map(b => { const st = ruleState(b); return `<li class="is-${st}"><span class="adult-rule-name">${esc(ruleTitle(b.key))}</span><span class="adult-pill">${STATE_TEXT[st]}</span>${tutor ? `<span class="adult-muted small">найдено ${date(b.found_at)}</span>` : ''}</li>`; }).join('')}</ul>
      <p class="adult-muted small">Ошибка закрыта, когда ${tutor ? 'ученик' : 'ребёнок'} через день и через три не попался на задачу-ловушку с тем же правилом.</p>`
     : '<p class="adult-muted">Новых затруднений за неделю не зафиксировано.</p>'}
    <h3>Пройденные темы</h3>
    <p>${r.topics.length ? r.topics.map(t => `<span class="adult-tag">${esc(topic(t))}</span>`).join(' ') : `<span class="adult-muted">Завершённых тем за неделю пока нет.${r.worked_topics?.length ? ` Работали над: ${r.worked_topics.map(t => esc(topic(t))).join(', ')}.` : ''}</span>`}</p>
    ${tutor ? '' : `<aside class="adult-tip"><b>Что сказать ${who}</b><p>${esc(talkTip(r, found, closed))}</p></aside>
    <p class="adult-muted small">Вы видите результат, а не каждый ответ. Ребёнок знает, что именно здесь показано: у него в профиле есть такой же список.</p>`}
    <div class="adult-actions no-print"><button data-weekly>Отчёт за неделю · Печать / PDF</button></div>
    <details class="adult-more no-print"><summary>Доступ ${who}</summary><div class="adult-actions"><button class="secondary" data-reset-child>Сбросить пароль ${who}</button><button class="secondary" data-unlink>Отвязать</button></div><div id="child-action"></div></details>
   </article>`;
   if (api.renderTutorChildTools) api.renderTutorChildTools(current, out);
  } catch (e) { out.innerHTML = `<div class="adult-card adult-error">${esc(e.message)}</div>`; }
 }

 function emptyState() {
  return `<section class="adult-card adult-empty"><h2>Добавьте ${who}</h2><p class="adult-muted">Каждую неделю здесь будет короткий отчёт: в каких правилах ${tutor ? 'ученик' : 'ребёнок'} путался, что уже исправлено и что сказать ему, чтобы помочь.</p><button data-add>Добавить ${who}</button></section>`;
 }

 async function renderCabinet() {
  current = null; host.innerHTML = '<p class="adult-muted">Загружаем список…</p>';
  try {
   children = await rpc(tutor ? 'vektor_tutor_students' : 'vektor_parent_children', { p_token: api.session.token });
   host.innerHTML = `<div class="adult-bar no-print"><h2 class="adult-section">${tutor ? 'Ученики' : 'Дети'}</h2><div class="adult-bar-right"><button class="secondary small" data-logout>Выйти</button><button class="link small" data-logout-all>Выйти со всех устройств</button></div></div>
    <p id="adult-message" role="status"></p>
    <section id="adult-add" class="adult-card adult-add" hidden><h2>Добавить ${who}</h2>
     <div class="adult-add-grid">
      <form id="adult-link"><h3>Уже есть вход в Вектор</h3><p class="adult-muted small">Например, логин выдали в школе. Код из 6 цифр ${tutor ? 'ученик' : 'ребёнок'} получит в Векторе: «Профиль» → «Код для родителя или репетитора».</p><label>Код из профиля<input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required placeholder="000000"></label><button>Добавить по коду</button></form>
      <form id="adult-create"><h3>Входа ещё нет</h3><p class="adult-muted small">Создадим логин и пароль. Их можно распечатать на листе.</p><label>Как подписать${tutor ? '' : ' (имя ребёнка)'}<input name="label" maxlength="60" required placeholder="${tutor ? 'Например, Миша 6Б' : 'Например, Миша'}"></label><button>Создать вход</button></form>
     </div></section>
    <section class="adult-kids no-print">${children.length ? `<div class="adult-chips" role="group" aria-label="${tutor ? 'Ученики' : 'Дети'}">${children.map(c => `<button class="adult-chip" data-child="${c.id}" aria-pressed="false">${esc(c.label || 'Ученик ' + c.id)}</button>`).join('')}<button class="adult-chip adult-chip-add" data-add>+ Добавить</button></div>` : ''}</section>
    ${children.length ? '' : emptyState()}
    <div id="adult-child"></div><div id="tutor-tools"></div>`;
   if (api.renderTutorTools) await api.renderTutorTools(children);
   if (children.length === 1 && !tutor) await showChild(children[0].id);
  } catch (e) { host.innerHTML = `<div class="adult-card adult-error"><p>${esc(e.message)}</p><button data-logout>Выйти и войти снова</button><p id="adult-message"></p></div>`; }
 }

 host.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.hasAttribute('data-add')) { const add = document.getElementById('adult-add'); add.hidden = false; host.querySelector('.adult-empty')?.remove(); add.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); add.querySelector('input')?.focus({ preventScroll: true }); }
  if (b.dataset.child) await showChild(b.dataset.child);
  if (b.hasAttribute('data-weekly')) window.print();
  if (b.hasAttribute('data-reset-child')) document.getElementById('child-action').innerHTML = `<p class="adult-muted">Старые устройства выйдут из аккаунта. Прогресс сохранится.</p><button data-reset-confirm>Сбросить и показать лист входа</button>`;
  if (b.hasAttribute('data-unlink')) document.getElementById('child-action').innerHTML = `<p class="adult-muted">Вы перестанете видеть успехи. Аккаунт ${who} останется.</p><button data-unlink-confirm>Отвязать ${who}</button>`;
  if (b.hasAttribute('data-reset-confirm') || b.hasAttribute('data-unlink-confirm')) {
   b.disabled = true;
   try { const reset = b.hasAttribute('data-reset-confirm'); const r = await rpc(reset ? 'vektor_adult_reset_student' : 'vektor_adult_unlink', { p_token: api.session.token, p_student: current }); if (reset) credentials(r); else await renderCabinet(); }
   catch (e) { api.message(e.message, true); } finally { b.disabled = false; }
  }
 });
 host.addEventListener('submit', async e => {
  if (!['adult-link', 'adult-create'].includes(e.target.id)) return; e.preventDefault();
  const f = e.target, b = f.querySelector('button'); b.disabled = true;
  try { const create = f.id === 'adult-create'; const r = await rpc(create ? 'vektor_adult_create_student' : 'vektor_adult_link', { p_token: api.session.token, ...(create ? { p_label: f.label.value } : { p_code: f.code.value }) }); await renderCabinet(); if (create) credentials(r); }
  catch (e) { api.message(e.message, true); } finally { b.disabled = false; }
 });
 api.renderCabinet = renderCabinet; api.showChild = showChild; api.credentials = credentials;
})();
