'use strict';

/* ================= Модули ================= */

const { check } = window.VEKTOR_CHECK;
const V = window.VEKTOR_VISUALS, T = window.VEKTOR_TUTOR, A = window.VEKTOR_ADAPTIVE, G = window.VEKTOR_GAME;
const { f, figure } = V;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* ================= Данные ================= */

// Темы с полной методичкой (content/fractions.js) + краткие занятия по другим разделам
const legacy = [
  { id: 'proportion', title: 'Пропорции', section: 'Отношения', start: 40,
    idea: 'Пропорция — это равенство двух отношений. Произведение крайних членов равно произведению средних.',
    task: { story: 'Найди x.', question: `${f('x', 4)} = ${f(6, 8)}`, answer: '3', placeholder: 'x = ?', hints: ['Во сколько раз 8 больше 4?', 'В 2 раза. Значит, x в 2 раза меньше 6.'] } },
  { id: 'percent', title: 'Проценты', section: 'Отношения', start: 15,
    idea: 'Процент — это одна сотая часть. 25% — то же самое, что четверть.',
    task: { story: 'В классе 80 тетрадей, 25% из них — в клетку.', question: 'Сколько тетрадей в клетку?', answer: '20', hints: ['25% — это четверть.', 'Найди четверть от 80: 80 : 4.'] } },
  { id: 'coords', title: 'Координатная плоскость', section: 'Геометрия', start: 0,
    idea: 'Положение точки задают два числа: первое — по горизонтальной оси, второе — по вертикальной.',
    task: { story: 'Дана точка A(−2; 5).', question: 'Чему равна её первая координата (абсцисса)?', answer: '-2', hints: ['Абсцисса записывается первой в скобках.', 'Первое число в скобках — −2.'] } },
  { id: 'area', title: 'Площадь фигур', section: 'Геометрия', start: 50,
    idea: 'Площадь прямоугольника равна произведению его длины и ширины.',
    task: { story: 'Прямоугольник имеет длину 6 см и ширину 4 см.', question: 'Чему равна его площадь в см²?', answer: '24', hints: ['Площадь = длина · ширина.', '6 · 4 = ?'] } },
].map(t => ({ ...t, legacy: true, generate: () => ({ ...t.task, accept: 'exact', solution: `Ответ: ${t.task.answer}.` }) }));

const topics = [...window.VEKTOR_FRACTIONS.topics, ...legacy];
const byId = Object.fromEntries(topics.map((t, i) => [t.id, i]));
const SECTIONS = ['Дроби', 'Отношения', 'Геометрия'];
const ROUTE = window.VEKTOR_FRACTIONS.topics.map((t, i) => i); // раздел «Дроби» — настоящая последовательность тем
const DIAG = ['concept', 'reduce', 'compare', 'add-same', 'mult', 'part-of'].map(id => byId[id]);
const DONE = 80;

const pages = { home: 'Мой путь', map: 'Все темы', diagnostic: 'Диагностика', library: 'Все темы', awards: 'Награды', teacher: 'Отчёт для учителя', settings: 'Профиль', lesson: 'Занятие' };
const STAGES = [['learn', 'Узнать'], ['practice', 'Потренироваться'], ['check', 'Проверить себя']];

/* ================= Состояние ================= */

const KEY = 'vektor-progress-v3';
const fresh = () => ({
  progress: Object.fromEntries(topics.map(t => [t.id, t.start])),
  meta: {}, attempts: [], answers: 0, asked: 0, days: [], diag: { step: 0, results: [] },
  settings: { name: 'Александр', style: 'steps' },
});
let state;
try { state = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY))); } catch { state = fresh(); }
// защита от испорченных или старых данных в браузере
(() => {
  const d = fresh(), isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  for (const k of ['progress', 'meta', 'diag', 'settings']) if (!isObj(state[k])) state[k] = d[k];
  for (const k of ['attempts', 'days']) if (!Array.isArray(state[k])) state[k] = [];
  for (const k of ['answers', 'asked']) if (!Number.isFinite(state[k])) state[k] = 0;
  if (typeof state.settings.name !== 'string' || !state.settings.name.trim()) state.settings.name = d.settings.name;
  if (!['steps', 'visual'].includes(state.settings.style)) state.settings.style = 'steps';
  if (typeof state.settings.sound !== 'boolean') state.settings.sound = true;
  if (!Array.isArray(state.diag.results) || !Number.isInteger(state.diag.step)) state.diag = d.diag;
  state.attempts = state.attempts.filter(a => a && typeof a === 'object');
})();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
let ai = T.loadCfg();
const game = () => G.ensure(state);

// даты по местному времени ученика (а не по UTC)
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => isoDate(new Date());
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDate(d); };
const meta = i => {
  const m = (state.meta[topics[i].id] ||= {});
  return Object.assign(m, { practice: 0, streak: 0, mastered: false, masteredAt: null, reviewStep: 0, reviewDue: null, errors: {},
    level: null, cleanRun: 0, wrongRun: 0, cleanTotal: 0, errorsTotal: 0, failedChecks: 0, hintsUsed: 0, tasks: 0, secTotal: 0 }, { ...m });
};
const pct = i => state.progress[topics[i].id] || 0;
const setPct = (i, v) => { state.progress[topics[i].id] = Math.max(0, Math.min(100, Math.round(v))); };
const checked = () => topics.filter((t, i) => pct(i) > 0).length;
const mastered = () => topics.filter((t, i) => pct(i) >= DONE).length;
const knowledge = () => { const c = topics.map((t, i) => pct(i)).filter(Boolean); return c.length ? Math.round(c.reduce((a, b) => a + b) / c.length) : 0; };
const currentStop = () => ROUTE.find(i => pct(i) < DONE) ?? ROUTE[ROUTE.length - 1];
const status = i => pct(i) >= DONE ? 'done' : pct(i) > 0 ? 'started' : 'todo';
const statusText = i => ({ done: 'Освоено', started: `Начато, ${pct(i)}%`, todo: 'Ещё не начато' })[status(i)];
const dueReviews = () => topics.map((t, i) => i).filter(i => { const m = state.meta[topics[i].id]; return m && m.reviewDue && m.reviewDue <= today(); });
const mistakeOf = (i, id) => (topics[i].mistakes || []).find(m => m.id === id);
const pace = () => A.pace(state.attempts);
const levelOf = i => meta(i).level ?? A.startLevel(pace());
const dots = lv => `<span class="level" title="Уровень задач ${lv} из 3">${[1, 2, 3].map(k => `<i class="${k <= lv ? 'on' : ''}"></i>`).join('')}</span>`;
const modelName = () => (T.MODELS.find(m => m.id === ai.model)?.name.split(' — ')[0]) || ai.model;

// Что делать дальше: повторение, база для трудной темы или следующая тема маршрута
function nextStep() {
  // если какая-то тема дважды не сдана, а её база не освоена — сначала база
  for (const i of ROUTE) {
    if (pct(i) >= DONE || meta(i).failedChecks < 2) continue;
    const weak = (topics[i].requires || []).map(id => byId[id]).filter(r => r != null && pct(r) < DONE);
    if (weak.length) return { i: weak[0], reason: `Сначала повтори «${topics[weak[0]].title}» — на ней держится тема «${topics[i].title}».` };
  }
  return { i: currentStop(), reason: null };
}

function markActivity() {
  state.answers++;
  if (!state.days.includes(today())) state.days = [...state.days, today()].slice(-60);
}

/* ================= Общие куски разметки ================= */

const app = document.querySelector('#app');
const head = (title, lead) => `<div class="page-head"><h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div>`;
const bar = v => `<div class="bar" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100"><i style="width:${v}%"></i></div>`;

// Поле ответа: дробь клеточками (числитель сверху, знаменатель снизу), при желании — целая часть
function answerInput(task, button) {
  if (task.choices) return `<div class="choices" role="group" aria-label="Выбери знак">${task.choices.map(c => `<button type="submit" class="btn btn-ghost choice" name="choice" value="${esc(c)}" aria-label="${{ '<': 'меньше', '>': 'больше', '=': 'равно' }[c] || c}">${esc(c)}</button>`).join('')}</div>`;
  const numberOnly = !String(task.answer).includes('/') && task.accept === 'exact';
  if (numberOnly) return `<div class="answer-row"><label class="num-input"><span class="visually-hidden">Твой ответ</span><input id="ans-num" inputmode="numeric" autocomplete="off" placeholder="?" aria-label="Твой ответ — число"></label><button class="btn btn-primary btn-big" type="submit">${button}</button></div>`;
  const mixed = task.accept === 'mixed';
  return `<div class="answer-row">
    <div class="frac-input${mixed ? ' with-whole' : ''}" role="group" aria-label="Твой ответ — дробь">
      <label class="fi-whole"><input id="ans-whole" inputmode="numeric" autocomplete="off" aria-label="Целая часть"><span>целые</span></label>
      <div class="fi-frac">
        <input id="ans-num" inputmode="numeric" autocomplete="off" aria-label="Числитель — верхнее число" placeholder="?">
        <i aria-hidden="true"></i>
        <input id="ans-den" inputmode="numeric" autocomplete="off" aria-label="Знаменатель — нижнее число" placeholder="?">
      </div>
    </div>
    <button class="btn btn-primary btn-big" type="submit">${button}</button>
  </div>
  <p class="fi-help small muted">Сверху — сколько частей взяли, снизу — на сколько частей делили. Ответ целый? Впиши его сверху, низ оставь пустым.${mixed ? '' : ' <button type="button" class="link small" data-whole>Добавить целую часть</button>'}</p>`;
}

function taskCard(task, { formId = 'answer-form', button = 'Проверить', exam = false, hints = false } = {}) {
  return `<p class="story">${task.story}</p>${exam && task.figureIsHint ? '' : figure(task.figure)}<p class="question" id="q">${task.question}</p>
    <form class="answer" id="${formId}" autocomplete="off">${answerInput(task, button)}</form>
    ${hints ? `<div class="hint-zone"><div id="hints"></div><button type="button" class="btn btn-ghost" id="hint-btn">Подсказка</button></div>` : ''}
    <div class="feedback" id="feedback" role="status" aria-live="polite"></div>`;
}

// Собрать ответ из клеточек → строка для проверки
function readAnswer(form, e) {
  if (e && e.submitter && e.submitter.name === 'choice') return { value: e.submitter.value };
  const v = id => (form.querySelector('#' + id)?.value || '').trim();
  const whole = v('ans-whole'), num = v('ans-num'), den = v('ans-den');
  if (num.includes('/') || num.includes(' ')) return { value: (whole ? whole + ' ' : '') + num };
  if (den && !num) return { error: 'Впиши верхнее число — числитель.' };
  if (num && den) return { value: whole ? `${whole} ${num}/${den}` : `${num}/${den}` };
  if (whole && !num && !den) return { value: whole };
  return { value: num };
}
// Для тестов и наставника: разложить строку ответа по клеточкам
function fillAnswer(val) {
  const s = String(val).trim(), set = (id, x) => { const el = app.querySelector('#' + id); if (el) el.value = x; };
  let m;
  if ((m = s.match(/^(-?\d+) (\d+)\/(\d+)$/))) { app.querySelector('.frac-input')?.classList.add('with-whole'); set('ans-whole', m[1]); set('ans-num', m[2]); set('ans-den', m[3]); }
  else if ((m = s.match(/^(-?\d+)\/(-?\d+)$/))) { set('ans-whole', ''); set('ans-num', m[1]); set('ans-den', m[2]); }
  else { set('ans-whole', ''); set('ans-num', s); set('ans-den', ''); }
}
function bindAnswerKeys() {
  const num = app.querySelector('#ans-num'), den = app.querySelector('#ans-den'), whole = app.querySelector('#ans-whole');
  if (num && den) {
    num.addEventListener('keydown', e => { if (e.key === '/' || e.key === 'ArrowDown') { e.preventDefault(); den.focus(); } });
    den.addEventListener('keydown', e => { if ((e.key === 'Backspace' && !den.value) || e.key === 'ArrowUp') { e.preventDefault(); num.focus(); } });
  }
  if (whole && num) whole.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); num.focus(); } });
  app.querySelectorAll('[data-whole]').forEach(b => b.onclick = () => { app.querySelector('.frac-input')?.classList.add('with-whole'); b.remove(); app.querySelector('#ans-whole')?.focus(); });
}

/* ================= ИИ-наставник: чат ================= */

const chats = {}; // в памяти: «тема:вид» → переписка
let session = null; // текущая задача / проверка

function getChat(i, kind) {
  const key = `${topics[i].id}:${kind}`;
  if (!chats[key]) chats[key] = { msgs: [], beats: null, beat: -1, pending: null, done: false, busy: false, hint: 0, started: false };
  return chats[key];
}
const isOnline = () => T.ready(ai);

function msgHtml(m, k) {
  return `<div class="msg ${m.role}${m.error ? ' error' : ''}">${m.role === 'assistant' ? '<span class="msg-who">Наставник</span>' : ''}<div class="msg-body">${m.html}${m.lab ? V.labHtml(`lab-msg-${k}`) : ''}</div></div>`;
}

function quickReplies(i, kind) {
  const c = getChat(i, kind);
  if (c.busy) return [];
  if (kind === 'lesson') {
    if (c.done) return [['go-practice', 'Перейти к тренировке', true]];
    if (c.pending) return [['hint', 'Подсказка'], ['solution', 'Покажи решение']];
    if (c.forceOffline) return [['Дальше', 'Дальше', true], ['Повтори правило', 'Повтори правило'], ['Покажи картинку', 'Картинка']];
    if (isOnline() && c.truncated) return [['Продолжи, пожалуйста', 'Продолжи', true], ['Дальше', 'Дальше']];
    return isOnline()
      ? [['Дальше', 'Дальше', true], ['Не понял, объясни по-другому', 'Не понял'], ['Покажи на картинке', 'Покажи картинку'], ['Дай ещё пример', 'Ещё пример']]
      : [['Дальше', 'Дальше', true], ['Повтори правило', 'Повтори правило'], ['Покажи картинку', 'Картинка']];
  }
  if (isOnline() && c.truncated && !c.forceOffline) return [['Продолжи, пожалуйста', 'Продолжи', true], ['Дай подсказку', 'Подсказка']];
  return isOnline() && !c.forceOffline
    ? [['Дай подсказку', 'Подсказка'], ['Я не понимаю задачу', 'Не понимаю задачу'], ['Покажи на картинке', 'Картинка']]
    : [['Дай подсказку', 'Подсказка'], ['Покажи картинку', 'Картинка'], ['Повтори правило', 'Правило']];
}

function chatBox(i, kind) {
  const c = getChat(i, kind), online = isOnline();
  const ph = kind === 'lesson' ? (c.pending ? 'Твой ответ, например 3/4' : 'Ответь или спроси наставника…') : 'Спроси, что непонятно…';
  const steps = kind === 'lesson' && c.beats && !online ? `<div class="lesson-progress"><span>Шаг ${Math.max(1, c.beat + 1)} из ${c.beats.length}</span>${bar(Math.round(Math.max(1, c.beat + 1) / c.beats.length * 100))}</div>` : '';
  return `<div class="chat chat-${kind}" data-chat="${kind}">${steps}
    <div class="chat-log" aria-live="polite">${c.msgs.filter(m => !m.hidden).map(msgHtml).join('') || (kind === 'task' ? '<p class="muted small chat-empty">Застрял? Спроси наставника — он не скажет ответ, но поможет дойти до него самому.</p>' : '')}</div>
    <div class="chat-quick">${quickReplies(i, kind).map(([v, l, main]) => `<button type="button" class="btn ${main ? 'btn-primary' : 'btn-ghost'} btn-sm" data-quick="${esc(v)}">${l}</button>`).join('')}</div>
    <form class="chat-form" autocomplete="off"><label class="visually-hidden" for="chat-in-${kind}">Сообщение наставнику</label>
      <input id="chat-in-${kind}" placeholder="${ph}" maxlength="400"${c.busy ? ' disabled' : ''}><button class="btn btn-primary" type="submit"${c.busy ? ' disabled' : ''}>Отправить</button></form>
    <p class="chat-mode small muted">${online && !c.forceOffline ? `Наставник: ${esc(modelName())}.` : online ? 'ИИ временно недоступен — урок идёт по конспекту.' : 'Наставник без ИИ — отвечает по конспекту.'} ${online ? '' : '<a href="#settings">Подключить ИИ</a>'}</p>
  </div>`;
}

function refreshChat(i, kind) {
  const box = app.querySelector(`.chat[data-chat="${kind}"]`);
  if (!box || route().page !== 'lesson' || route().i !== i) return;
  const tmp = document.createElement('div'); tmp.innerHTML = chatBox(i, kind);
  const nb = tmp.firstElementChild, log = nb.querySelector('.chat-log');
  box.querySelector('.chat-log').replaceWith(log);
  box.querySelector('.chat-quick').replaceWith(nb.querySelector('.chat-quick'));
  box.querySelector('.chat-form').replaceWith(nb.querySelector('.chat-form'));
  box.querySelector('.chat-mode').replaceWith(nb.querySelector('.chat-mode'));
  const oldSteps = box.querySelector('.lesson-progress'), newSteps = nb.querySelector('.lesson-progress');
  if (oldSteps && newSteps) oldSteps.replaceWith(newSteps); else if (newSteps) box.prepend(newSteps);
  bindChat(i, kind);
  V.labBind(box);
  log.scrollTop = log.scrollHeight;
}

function updateLastMsg(i, kind, m) {
  const box = app.querySelector(`.chat[data-chat="${kind}"]`);
  if (!box || route().i !== i) return;
  const body = box.querySelectorAll('.msg-body'); const last = body[body.length - 1];
  if (last) last.innerHTML = m.html;
  const log = box.querySelector('.chat-log'); log.scrollTop = log.scrollHeight;
}

function bindChat(i, kind) {
  const box = app.querySelector(`.chat[data-chat="${kind}"]`); if (!box) return;
  box.querySelector('.chat-form').onsubmit = e => {
    e.preventDefault();
    const inp = box.querySelector('input'), v = inp.value.trim(); if (!v) return;
    inp.value = ''; tutorSay(i, kind, v);
  };
  box.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => {
    const v = b.dataset.quick;
    if (v === 'go-practice') { session = null; location.hash = `lesson/${i}/practice`; return; }
    if (v === 'hint' || v === 'solution') return lessonTaskHelp(i, v);
    tutorSay(i, kind, v);
  });
  box.querySelectorAll('[data-offline]').forEach(b => b.onclick = () => offlineFallback(i, kind));
  box.querySelectorAll('[data-retry-ai]').forEach(b => b.onclick = () => { getChat(i, kind).forceOffline = false; b.closest('p').innerHTML = '<b>Пробую снова.</b> Напиши вопрос или нажми «Дальше».'; refreshChat(i, kind); });
}

function startLesson(i) {
  const c = getChat(i, 'lesson');
  if (c.started) return;
  c.started = true;
  if (isOnline()) { aiReply(i, 'lesson', 'Начни урок.'); return; }
  c.beats = T.lessonBeats(topics[i], () => topics[i].generate(1));
  nextBeat(i);
}

function nextBeat(i) {
  const c = getChat(i, 'lesson');
  if (!c.beats) c.beats = T.lessonBeats(topics[i], () => topics[i].generate(1));
  if (c.beat >= c.beats.length - 1) { c.done = true; return; }
  const b = c.beats[++c.beat];
  if (b.task) {
    c.pending = { task: b.task, tries: 0 };
    c.msgs.push({ role: 'assistant', html: `<p><b>Проверь себя.</b> ${b.task.story}</p>${figure(b.task.figure)}<p class="chat-q">${b.task.question}</p>${b.task.choices ? `<p class="small muted">Напиши знак: &lt;, &gt; или =</p>` : ''}` });
  } else {
    c.msgs.push({ role: 'assistant', html: b.html, lab: b.lab });
    if (b.done) c.done = true;
  }
}

function syncHints() {
  const box = app.querySelector('#hints'), hb = app.querySelector('#hint-btn'); if (!box || !session?.task) return;
  const all = session.task.hints || [];
  box.innerHTML = all.slice(0, session.hints).map((h, k) => `<p class="bubble"><b>Подсказка ${k + 1}.</b> ${h}</p>`).join('');
  if (hb) { const left = all.length - session.hints; hb.disabled = left <= 0; hb.textContent = left <= 0 ? 'Подсказок больше нет' : `Подсказка (${left})`; }
}

function lessonTaskHelp(i, what) {
  const c = getChat(i, 'lesson'), p = c.pending; if (!p) return;
  if (what === 'hint') c.msgs.push({ role: 'assistant', html: `<p>${p.task.hints[Math.min(p.tries, p.task.hints.length - 1)]}</p>` });
  else { c.msgs.push({ role: 'assistant', html: `<p><b>Решение.</b> ${p.task.solution}</p><p>Нажми «Дальше».</p>` }); c.pending = null; }
  refreshChat(i, 'lesson');
}

function tutorSay(i, kind, text) {
  const c = getChat(i, kind);
  if (c.busy) return;
  c.msgs.push({ role: 'user', html: `<p>${esc(text)}</p>`, raw: text });
  state.asked = (state.asked || 0) + 1; save();
  if (!c.pending && !/^(дальше|продолжи)/i.test(text)) celebrate(G.asked(game()));
  if (kind === 'lesson' && c.pending) { // ответ на задачу внутри урока проверяет код
    const p = c.pending, r = check(text, p.task);
    if (r.empty || r.unreadable) c.msgs.push({ role: 'assistant', html: `<p>${r.msg || 'Впиши ответ числом или дробью.'}</p>` });
    else if (r.ok && !r.almost) { c.msgs.push({ role: 'assistant', html: `<p><b>Верно!</b> ${p.task.solution}</p><p>Нажми «Дальше».</p>` }); c.pending = null; }
    else {
      p.tries++;
      const m = r.mistake && mistakeOf(i, r.mistake);
      if (p.tries >= 3) { c.msgs.push({ role: 'assistant', html: `<p>Ничего страшного, разберём вместе. ${p.task.solution}</p><p>Нажми «Дальше».</p>` }); c.pending = null; }
      else c.msgs.push({ role: 'assistant', html: `<p>${r.almost ? r.msg : m ? `Похоже на частую ошибку: <b>${m.title.toLowerCase()}</b>. ${m.say}` : 'Пока не совпало.'}</p><p>${p.task.hints[Math.min(p.tries - 1, p.task.hints.length - 1)]}</p>` });
    }
    refreshChat(i, kind); return;
  }
  if (isOnline() && !c.forceOffline) return aiReply(i, kind);
  // офлайн-наставник
  if (kind === 'lesson' && /^дальше$/i.test(text)) nextBeat(i);
  else {
    const task = kind === 'task' ? session?.task : null;
    const hintAt = Math.max(c.hint, kind === 'task' && session ? session.hints : 0);
    const r = T.localAnswer(topics[i], /^дай подсказку$/i.test(text) ? 'подскажи' : text, task, hintAt);
    if (r.usedHint) { c.hint = hintAt + 1; if (kind === 'task' && session && session.mode === 'practice') { session.hints = Math.max(session.hints, c.hint); syncHints(); } }
    c.msgs.push({ role: 'assistant', html: r.html });
  }
  refreshChat(i, kind);
}

async function aiReply(i, kind, hiddenUser) {
  const c = getChat(i, kind), t = topics[i];
  if (hiddenUser) c.msgs.push({ role: 'user', html: '', raw: hiddenUser, hidden: true });
  const task = kind === 'task' ? session?.task : null;
  const sys = T.systemPrompt({
    topic: t, mode: kind === 'lesson' ? 'lesson' : 'task', task,
    attempts: kind === 'task' ? (session?.tries || []) : [], mistake: kind === 'task' && session?.lastMistake ? mistakeOf(i, session.lastMistake) : null,
    pace: pace(), style: state.settings.style, name: state.settings.name,
  });
  const history = c.msgs.filter(m => m.raw).slice(-14).map(m => ({ role: m.role, content: m.raw }));
  const msg = { role: 'assistant', html: '<p class="typing">Наставник думает…</p>', raw: null };
  c.msgs.push(msg); c.busy = true; refreshChat(i, kind);
  const call = () => T.stream(ai, [{ role: 'system', content: sys }, ...history], txt => {
    msg.html = T.render(txt, { streaming: true }).html || '<p class="typing">…</p>'; updateLastMsg(i, kind, msg);
  }, { maxTokens: kind === 'lesson' ? 700 : 550, onFinish: r => { c.truncated = r === 'length'; } });
  try {
    let text;
    try { text = await call(); }
    catch (e) { if (!/Нет связи|не отвечает/.test(e.message || '')) throw e; await new Promise(r => setTimeout(r, 1500)); text = await call(); } // один повтор при сбое сети
    const r = T.render(text);
    msg.raw = text; msg.html = r.html || '<p>…</p>';
    if (r.done && kind === 'lesson') c.done = true;
    if (kind === 'task' && session?.mode === 'practice') session.askedAi = true;
    c.forceOffline = false;
  } catch (e) {
    // ИИ недоступен — урок не стопорится: продолжаем по конспекту
    c.busy = false; c.forceOffline = true;
    const idx = c.msgs.indexOf(msg); if (idx >= 0) c.msgs.splice(idx, 1);
    c.msgs.push({ role: 'assistant', error: true, html: `<p class="small"><b>ИИ сейчас не отвечает</b> — ${esc(e.message || 'нет связи')} Продолжаю по конспекту. <button type="button" class="link" data-retry-ai>Попробовать ИИ снова</button></p>` });
    offlineFallback(i, kind);
    return;
  } finally {
    c.busy = false; refreshChat(i, kind);
  }
}

// Ответ без ИИ после ошибки подключения
function offlineFallback(i, kind) {
  const c = getChat(i, kind), t = topics[i], task = kind === 'task' ? session?.task : null;
  const last = [...c.msgs].reverse().find(m => m.role === 'user' && !m.error);
  if (kind === 'lesson' && c.beat < 0 && c.msgs.some(m => m.role === 'assistant' && m.raw)) c.beat = 0; // приветствие уже было от ИИ
  if (kind === 'lesson' && (!last || /^(дальше|начни урок|продолжи)/i.test(last.raw || ''))) nextBeat(i);
  else c.msgs.push({ role: 'assistant', html: T.localAnswer(t, last?.raw || 'правило', task, c.hint).html });
  refreshChat(i, kind);
}

/* ================= Звуки ================= */

let audioCtx = null;
// Короткие тихие звуки на ответы; выключаются в профиле
function sfx(kind) {
  if (state.settings.sound === false) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const notes = { ok: [660, 880], wrong: [330, 262], win: [523, 659, 784, 1047] }[kind] || [];
    notes.forEach((hz, k) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime + k * 0.11;
      o.type = kind === 'wrong' ? 'triangle' : 'sine'; o.frequency.value = hz;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.connect(g).connect(audioCtx.destination); o.start(t0); o.stop(t0 + 0.25);
    });
  } catch {}
}

/* ================= Знакомство с интерфейсом ================= */

const TOUR = [
  { sel: '.hero-next [data-continue]', title: 'Главная кнопка', text: 'Всегда ведёт к следующему шагу. Не знаешь, что делать, — жми «Продолжить».' },
  { sel: '#path', title: 'Твой путь', text: 'Кружки — темы по порядку. Зелёный — освоено, жёлтый — ты здесь. Нажми на любой кружок, чтобы открыть тему.' },
  { sel: '.hud', title: 'Звёзды и огонёк', text: 'Звёзды — за решённые задачи. Огонёк — сколько дней подряд ты занимаешься.' },
  { sel: 'nav', title: 'Меню', text: 'Путь, все темы, награды и профиль. В профиле можно поменять имя и подключить ИИ-наставника.' },
];
function startTour(k = 0) {
  document.querySelectorAll('.tour-hole, .tour-tip').forEach(el => el.remove());
  if (k >= TOUR.length) { state.toured = true; save(); return; }
  const step = TOUR[k], el = [...document.querySelectorAll(step.sel)].find(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
  if (!el) return startTour(k + 1);
  el.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect(), pad = 8;
  const hole = document.createElement('div'); hole.className = 'tour-hole';
  Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: Math.min(r.height, innerHeight * 0.6) + pad * 2 + 'px' });
  const tip = document.createElement('div'); tip.className = 'tour-tip'; tip.setAttribute('role', 'dialog'); tip.setAttribute('aria-label', step.title);
  tip.innerHTML = `<p class="tour-count">${k + 1} из ${TOUR.length}</p><h3>${step.title}</h3><p>${step.text}</p>
    <div class="row-actions"><button class="btn btn-primary" data-tour-next>${k + 1 < TOUR.length ? 'Дальше' : 'Понятно!'}</button><button class="btn btn-ghost" data-tour-skip>Пропустить</button></div>`;
  document.body.append(hole, tip);
  const below = r.bottom + 200 < innerHeight, tw = Math.min(340, innerWidth - 32);
  Object.assign(tip.style, { width: tw + 'px', left: Math.max(16, Math.min(innerWidth - tw - 16, r.left)) + 'px', top: (below ? Math.min(r.bottom + 16, innerHeight - 220) : Math.max(16, r.top - 216)) + 'px' });
  tip.querySelector('[data-tour-next]').onclick = () => startTour(k + 1);
  tip.querySelector('[data-tour-skip]').onclick = () => startTour(TOUR.length);
  tip.querySelector('[data-tour-next]').focus();
}

/* ================= Награды: тосты, праздник, счётчики ================= */

function hud() {
  const g = game();
  document.querySelector('#hud-stars').textContent = g.stars;
  document.querySelector('#hud-streak').textContent = G.liveStreak(g, today());
}

function toast(html, kind = '') {
  const box = document.querySelector('#toasts'); if (!box) return;
  const el = document.createElement('div'); el.className = 'toast ' + kind; el.innerHTML = html;
  box.appendChild(el);
  while (box.children.length > 3) box.firstElementChild.remove(); // не больше трёх уведомлений сразу
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3100);
}

function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.className = 'confetti'; c.setAttribute('aria-hidden', 'true');
  const W = c.width = innerWidth, H = c.height = innerHeight, ctx = c.getContext('2d');
  document.body.appendChild(c);
  const css = getComputedStyle(document.documentElement);
  const colors = ['--green', '--marker', '--pie', '--margin', '--green-soft'].map(v => css.getPropertyValue(v).trim() || '#1E7358');
  const parts = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 4, r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - .5) * .3, c: colors[Math.floor(Math.random() * colors.length)] }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) { p.vy += .42; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); }
    if (t - t0 < 1800) requestAnimationFrame(frame); else c.remove();
  })(t0);
}

// Показать события игры: звёзды, цель дня, достижения, освоенная тема
function celebrate(ev, { quiet = false } = {}) {
  if (!ev || !ev.length) return;
  if (quiet) { hud(); save(); return; }
  const main = ev.filter(e => e.type === 'stars' && e.why !== 'цель дня');
  const stars = main.reduce((a, e) => a + e.n, 0);
  if (stars) toast(`${G.icon('star', 18)}<b>+${stars}</b> ${main.length > 1 ? 'звёзд' : main[0].why}`, 'toast-stars');
  if (ev.some(e => e.type === 'goal')) toast(`${G.icon('target', 20)}<span><b>Цель дня выполнена!</b> +5 звёзд</span>`, 'toast-goal');
  for (const e of ev.filter(e => e.type === 'badge')) toast(`${G.icon(e.badge.icon, 22)}<span><b>Новое достижение:</b> ${e.badge.title}</span>`, 'toast-badge');
  if (ev.some(e => e.type === 'mastered' || e.type === 'badge' || e.type === 'goal')) confetti();
  hud(); save();
}

/* ================= Главная ================= */

// Какой шаг темы сейчас: урок → тренировка → проверка
function stepStates(i) {
  const t = topics[i], m = meta(i), need = A.need(pace()), c = chats[`${t.id}:lesson`];
  if (t.legacy) return { learn: 'done', practice: pct(i) >= DONE ? 'done' : 'now', check: 'done', next: 'practice' };
  const mast = pct(i) >= DONE;
  const learned = mast || m.practice > 0 || (c && c.done);
  const practiced = mast || m.practice >= need;
  const next = mast ? 'practice' : !learned ? 'learn' : !practiced ? 'practice' : 'check';
  return { learn: learned ? 'done' : next === 'learn' ? 'now' : 'next', practice: practiced ? 'done' : next === 'practice' ? 'now' : 'next', check: mast ? 'done' : next === 'check' ? 'now' : 'next', next };
}
const STAGE_SAY = {
  learn: 'Урок с наставником: картинки, правило и пример',
  practice: 'Тренировка: задачи с подсказками',
  check: 'Проверка: 4 задачи без подсказок',
  review: 'Повторение: 2 задачи, чтобы не забыть',
};

// Что откроет большая кнопка «Продолжить»
function continueTarget() {
  const due = dueReviews();
  if (due.length) return { i: due[0], stage: 'review', title: topics[due[0]].title, say: STAGE_SAY.review, reason: 'Пора повторить — это займёт пару минут.' };
  const ns = nextStep(), st = stepStates(ns.i);
  return { i: ns.i, stage: st.next, title: topics[ns.i].title, say: STAGE_SAY[st.next], reason: ns.reason };
}

function home() {
  const ct = continueTarget(), p = pace(), cur = currentStop();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  const firstTime = !state.answers && !state.diag.step;
  const x = [0, 1, 2, 1, 0, -1, -2, -1, 0];
  const nodes = ROUTE.map((i, k) => {
    const st = status(i), isCur = i === ct.i, due = dueReviews().includes(i), steps = stepStates(i);
    const sub = st === 'done' ? (due ? 'Пора повторить' : 'Освоено') : isCur ? 'Ты здесь' : st === 'started' ? 'Начато' : 'Можно открыть';
    return `<li class="node is-${st}${isCur ? ' is-current' : ''}${due ? ' is-due' : ''}${x[k % x.length] > 0 ? ' left' : ''}" style="--x:${x[k % x.length]}">
      ${isCur ? `<button class="node-bubble" data-continue>${ct.stage === 'review' ? 'Повторить' : steps.next === 'learn' && !meta(i).practice ? 'Начать' : 'Продолжить'}</button>` : ''}
      <button class="node-btn" data-lesson="${i}" style="--p:${pct(i)}" aria-label="${topics[i].title}: ${sub}">
        <span class="node-face">${st === 'done' && !due ? '✓' : due ? G.icon('repeat', 26) : k + 1}</span>
      </button>
      <div class="node-label"><b>${topics[i].short || topics[i].title}</b><span>${sub}</span></div>
    </li>`;
  }).join('');
  return `<div class="page-head home-head"><h1>${hello}, ${esc(state.settings.name)}!</h1></div>
  <section class="hero-next" aria-label="Следующий шаг">
    <div class="hero-text">
      <p class="hero-kicker">${ct.stage === 'review' ? 'Повторение' : ct.reason ? 'Сначала повторим' : 'Продолжай отсюда'}</p>
      <h2>${ct.title}</h2>
      <p class="muted">${ct.reason || ct.say}</p>
      ${ct.stage !== 'review' && !topics[ct.i].legacy ? miniSteps(ct.i) : ''}
    </div>
    <button class="btn btn-primary btn-big btn-go" data-continue>${G.icon('rocket', 22)} Продолжить</button>
  </section>
  <div class="layout home-layout">
    <section class="path-wrap" aria-label="Мой путь по теме «Обыкновенные дроби»">
      <div class="path-head"><h2>Мой путь: обыкновенные дроби</h2><span class="muted small">${ROUTE.filter(i => pct(i) >= DONE).length} из ${ROUTE.length} тем освоено</span></div>
      <ol class="path" id="path"><svg class="path-line" aria-hidden="true"></svg>${nodes}
        <li class="node node-finish" style="--x:0"><span class="finish-flag">${G.icon('flag', 30)}</span><div class="node-label"><b>Финиш</b><span>Покоритель дробей</span></div></li>
      </ol>
    </section>
    <div class="stack side">
      ${firstTime ? `<div class="sheet note"><h3>Не знаешь, с чего начать?</h3><p>Пройди быстрый тест из 6 задач — и путь подстроится под тебя.</p><button class="btn btn-primary" data-go="diagnostic">Пройти тест</button></div>` : ''}
      ${todayCard()}
      <div class="sheet pace pace-${p}">
        <h3>Твой темп: ${A.PACE[p].label.toLowerCase()}</h3>
        <p class="muted small">${A.PACE[p].say}</p>
      </div>
      <div class="sheet small-note"><h3>Наставник ${isOnline() ? 'на связи' : 'работает по конспекту'}</h3><p class="muted small">${isOnline() ? `Ведёт урок, отвечает на вопросы и рисует дроби (${esc(modelName())}).` : 'Ведёт урок по методичке. Чтобы он отвечал на любые вопросы, подключи ИИ в профиле.'}</p></div>
    </div>
  </div>`;
}

// Три точки шагов темы: ✓ готово, ● сейчас, ○ потом
function miniSteps(i) {
  const st = stepStates(i);
  return `<ol class="mini-steps">${STAGES.map(([id, name]) => `<li class="is-${st[id]}"><span>${st[id] === 'done' ? '✓' : ''}</span>${name}</li>`).join('')}</ol>`;
}

function todayCard() {
  const g = game(), done = g.day === today() ? g.dayTasks : 0, st = G.liveStreak(g, today()), rk = G.rank(g.stars);
  const pctGoal = Math.min(100, Math.round(done / g.goal * 100));
  return `<div class="sheet today">
    <div class="today-head"><h3>Сегодня</h3><button class="link small" data-go="awards">Награды</button></div>
    <div class="today-grid">
      <div class="goal-ring" style="--p:${pctGoal}" role="img" aria-label="Цель дня: ${Math.min(done, g.goal)} из ${g.goal} задач"><b>${Math.min(done, g.goal)}<small>/${g.goal}</small></b></div>
      <div><p class="today-line"><b>${done >= g.goal ? 'Цель дня выполнена!' : `Ещё ${g.goal - done} ${plural(g.goal - done, 'задача', 'задачи', 'задач')} до цели дня`}</b></p>
        <p class="muted small">${G.icon('flame', 16)} ${st ? `${st} ${plural(st, 'день', 'дня', 'дней')} подряд` : 'Начни серию дней сегодня'} · ${G.icon('star', 16)} ${g.stars} · ${rk.name}</p></div>
    </div>
    <div class="week">${week()}</div>
  </div>`;
}
const plural = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many; };

function week() {
  const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], now = new Date(), dow = (now.getDay() + 6) % 7;
  return names.map((n, k) => { const d = new Date(now); d.setDate(now.getDate() - dow + k); const on = state.days.includes(isoDate(d)); return `<span>${n}<i class="${on ? 'on' : ''}" title="${on ? 'Занимался' : 'Нет занятий'}"></i></span>`; }).join('');
}

function drawRoute() {
  const box = document.querySelector('#path'); if (!box) return;
  const svg = box.querySelector('.path-line'), b = box.getBoundingClientRect();
  const pts = [...box.querySelectorAll('.node-btn, .finish-flag')].map(el => { const r = el.getBoundingClientRect(); return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2]; });
  if (pts.length < 2) return;
  svg.setAttribute('width', b.width); svg.setAttribute('height', b.height);
  const lastDone = Math.max(-1, ...ROUTE.map((i, k) => pct(i) >= DONE ? k : -1)) + 1; // до текущей темы — сплошная
  const seg = (a, z) => pts.slice(a, z + 1).map((p, k) => `${k ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  svg.innerHTML = `<path class="todo" d="${seg(0, pts.length - 1)}"/>${lastDone > 0 ? `<path class="done" d="${seg(0, Math.min(lastDone, pts.length - 1))}"/>` : ''}`;
}

/* ================= Карта и материалы ================= */

const filters = cur => `<div class="filters" role="group" aria-label="Фильтр по разделам">${['Все', ...SECTIONS].map(s => `<button class="chip" data-filter="${s}" aria-pressed="${s === cur}">${s}</button>`).join('')}</div>`;

function mapPage(filter = 'Все') {
  const cur = continueTarget().i;
  return head('Все темы', 'Можно открыть любую тему. «Урок» — объяснение с наставником, «Конспект» — коротко прочитать правило и примеры.') + filters(filter) +
    SECTIONS.filter(s => filter === 'Все' || s === filter).map(s => {
      const ix = topics.map((t, i) => i).filter(i => topics[i].section === s), done = ix.filter(i => pct(i) >= DONE).length;
      return `<section class="section"><h2>${s === 'Дроби' ? 'Обыкновенные дроби' : s} <small>освоено ${done} из ${ix.length}</small></h2><div class="topics">${ix.map(i => {
        const t = topics[i];
        return `<article class="topic is-${status(i)}${i === cur ? ' is-current' : ''}">
          <h3>${t.title}</h3>
          <span class="status">${i === cur ? 'Ты здесь' : statusText(i)}${t.legacy ? ' · пока одна задача' : ''}</span>
          ${t.legacy ? '' : miniSteps(i)}
          <div class="topic-actions"><button class="btn btn-primary btn-sm" data-lesson="${i}">${t.legacy ? 'Решить задачу' : pct(i) >= DONE ? 'Повторить урок' : 'Урок'}</button>${t.legacy ? '' : `<button class="btn btn-ghost btn-sm" data-lesson="${i}" data-tab="notes">Конспект</button>`}</div>
        </article>`; }).join('')}</div></section>`;
    }).join('');
}
const library = filter => mapPage(filter);

/* ================= Занятие ================= */

let learnTab = 'tutor';

const DO_NOW = {
  learn: () => learnTab === 'tutor' ? 'Читай наставника и нажимай «Дальше». Что-то непонятно — напиши вопрос в поле внизу.' : 'Прочитай правило и примеры. Потом нажми «Начать тренировку».',
  practice: () => 'Реши задачу и нажми «Проверить». Застрял — жми «Подсказка» или спроси наставника.',
  check: () => 'Подсказок нет. Из 4 задач нужно решить хотя бы 3 — тогда тема засчитается.',
  review: () => 'Две задачи на тему, которую ты уже освоил, — чтобы не забылось.',
};

function lessonPage(i, stage) {
  const t = topics[i];
  if (t.legacy) stage = 'practice';
  const st = stepStates(i), need = A.need(pace()), m = meta(i);
  const sub = { learn: st.learn === 'done' ? 'Пройдено' : 'Картинки и правило', practice: st.practice === 'done' ? 'Готово' : `${Math.min(m.practice, need)} из ${need} задач`, check: st.check === 'done' ? 'Тема освоена' : 'Нужно 3 из 4' };
  const steps = t.legacy || stage === 'review' ? '' : `<ol class="stepper" aria-label="Шаги темы">${STAGES.map(([id, name], k) => `
    <li><button class="step is-${st[id]}${id === stage ? ' on' : ''}" data-stage="${id}"${id === stage ? ' aria-current="step"' : ''}>
      <span class="step-n">${st[id] === 'done' ? '✓' : k + 1}</span><span class="step-t"><b>${name}</b><small>${sub[id]}</small></span>
    </button></li>`).join('')}</ol>`;
  const req = (t.requires || []).map(id => byId[id]).filter(x => x != null && pct(x) < DONE);
  const reqHtml = req.length && stage === 'learn' ? `<p class="requires small">Пригодится тема ${req.map(r => `<button class="link" data-lesson="${r}">«${topics[r].title}»</button>`).join(' и ')} — её можно повторить в любой момент.</p>` : '';
  const body = stage === 'learn' ? learnStage(i) : stage === 'check' ? checkStage(i, 'check') : stage === 'review' ? checkStage(i, 'review') : practiceStage(i);
  return `<div class="lesson-top"><button class="btn btn-ghost btn-sm back" data-go="home">← К пути</button></div>
    <div class="page-head"><h1>${t.title}</h1></div>
    ${steps}
    <p class="do-now">${G.icon('target', 20)}<span><b>Что делать сейчас:</b> ${DO_NOW[stage] ? DO_NOW[stage]() : ''}</span></p>
    ${reqHtml}${body}`;
}

function learnStage(i) {
  const t = topics[i], e = t.explain;
  const tabBtns = `<div class="segmented" role="group" aria-label="Как изучать">
    <button data-learn-tab="tutor" aria-pressed="${learnTab === 'tutor'}">${G.icon('chat', 18)} С наставником</button>
    <button data-learn-tab="notes" aria-pressed="${learnTab === 'notes'}">${G.icon('book', 18)} Конспект</button></div>`;
  const side = `<aside class="stack side">
      <div class="sheet"><h3>Готов потренироваться?</h3><p class="muted small">Задачи каждый раз новые и подстраиваются под твой темп.</p><button class="btn btn-primary btn-big" data-stage="practice">Начать тренировку →</button></div>
      <details class="sheet lab-box" ${matchMedia('(min-width: 761px)').matches ? 'open' : ''}><summary><h3>Лаборатория дробей</h3><span class="muted small">Нажимай + и −, чтобы увидеть дробь</span></summary>${V.labHtml('lab-side', { n: 3, d: 5, k: 1 })}</details>
    </aside>`;
  if (learnTab === 'tutor') {
    return tabBtns + `<div class="layout"><section class="sheet tutor-lesson" aria-label="Урок с наставником">${chatBox(i, 'lesson')}</section>${side}</div>`;
  }
  return tabBtns + `<div class="layout">
    <article class="sheet method">
      <h2>Как это устроено</h2>
      <p>${e.model}</p>
      ${figure(e.figure)}<p class="figure-caption">${e.figureCaption}</p>
      <div class="rule"><h3>Правило</h3><p>${e.rule}</p></div>
      <h2>Разберём на примерах</h2>
      ${e.examples.map(x => `<div class="worked"><p class="worked-q">${x.q}</p><ol>${x.steps.map(s => `<li>${s}</li>`).join('')}</ol></div>`).join('')}
      <h2>Где чаще всего ошибаются</h2>
      <ul class="mistakes">${t.mistakes.map(m => `<li><b>${m.title}.</b> ${m.say}</li>`).join('')}</ul>
      <p class="muted small">${window.VEKTOR_FRACTIONS.sources}</p>
    </article>${side}</div>`;
}

function newPracticeTask(i) {
  const m = meta(i), t = topics[i], p = pace();
  if (m.level == null && !t.legacy) m.level = A.startLevel(p);
  session = { i, mode: 'practice', task: t.generate(t.legacy ? undefined : m.level), hints: 0, answered: false, tries: [], started: Date.now(), lastMistake: null, autoHint: false };
  if (!t.legacy && A.autoHint(m, p)) { session.hints = 1; session.autoHint = true; }
  const tc = chats[`${t.id}:task`]; if (tc && !tc.busy) Object.assign(tc, { msgs: [], hint: 0 });
}

function practiceStage(i) {
  const t = topics[i], m = meta(i), p = pace();
  if (!session || session.i !== i || session.mode !== 'practice') newPracticeTask(i);
  const task = session.task, need = A.need(p), ready = m.practice >= need;
  return `<div class="layout">
    <section class="sheet task" aria-labelledby="q">
      ${t.legacy ? '' : `<div class="task-progress"><span>Решено ${Math.min(m.practice, need)} из ${need}</span>${bar(Math.round(Math.min(m.practice, need) / need * 100))}<span class="task-meta" title="Сложность задач подстраивается под тебя">Сложность ${dots(m.level || 2)}</span></div>`}
      ${taskCard(task, { hints: true })}
    </section>
    <aside class="stack side">
      ${t.legacy ? '' : `<div class="sheet streak ${ready ? 'ready' : ''}"><h3>${ready ? 'Можно проверять себя!' : 'Тренировка'}</h3>
        <p class="small muted">${ready ? 'Ты решил достаточно задач. Можешь потренироваться ещё или перейти к проверке.' : `Реши ещё ${need - m.practice} ${plural(need - m.practice, 'задачу', 'задачи', 'задач')} — потом проверка.`}</p>
        <button class="btn ${ready ? 'btn-primary' : 'btn-ghost'}" data-stage="check">Перейти к проверке</button></div>
      <div class="sheet"><h3>Спроси наставника</h3>${chatBox(i, 'task')}</div>`}
    </aside>
  </div>`;
}

function checkStage(i, mode) {
  const t = topics[i], total = mode === 'check' ? t.check.count : 2;
  if (!session || session.i !== i || session.mode !== mode) session = { i, mode, k: 0, right: 0, total, task: t.generate(2), answered: false, found: [] };
  const s = session;
  if (s.k >= s.total) return resultView(i);
  const title = mode === 'check' ? `Проверка: задача ${s.k + 1} из ${s.total}` : `Повторение: задача ${s.k + 1} из ${s.total}`;
  return `<section class="sheet task" style="max-width:760px">
    <div class="steps" aria-hidden="true">${Array.from({ length: s.total }, (_, k) => `<i class="${k < s.k ? 'on' : ''}"></i>`).join('')}</div>
    <p class="muted">${title}. Подсказок здесь нет.</p>
    ${taskCard(s.task, { button: 'Ответить', exam: true })}
  </section>`;
}

function resultView(i) {
  const t = topics[i], s = session, m = meta(i);
  const pass = s.mode === 'check' ? s.right >= t.check.passScore : s.right === s.total;
  const next = ROUTE.find(r => r > i && pct(r) < DONE);
  const found = [...new Set(s.found)].map(id => mistakeOf(i, id)).filter(Boolean);
  if (s.mode === 'check') {
    const weak = (t.requires || []).map(id => byId[id]).filter(r => r != null && pct(r) < DONE);
    const advice = !pass && m.failedChecks >= 2 && weak.length
      ? `<p class="advice">Тема пока не даётся — так бывает. Похоже, стоит освежить «${topics[weak[0]].title}»: на ней держится эта тема.</p>` : '';
    return `<section class="sheet result ${pass ? 'pass' : 'fail'}" style="max-width:760px">
      <h2>${pass ? 'Тема освоена!' : 'Пока не засчитано'}</h2>
      <p>Верно ${s.right} из ${s.total}. ${pass ? 'Повторение придёт завтра, потом через 3 и через 7 дней.' : `Нужно хотя бы ${t.check.passScore}. Вернись к уроку — и попробуй снова.`}</p>
      ${found.length ? `<h3>Что заметили</h3><ul class="mistakes">${found.map(x => `<li><b>${x.title}.</b> ${x.say}</li>`).join('')}</ul>` : ''}
      ${advice}
      <div class="row-actions">${pass
        ? `${next != null ? `<button class="btn btn-primary" data-lesson="${next}">Дальше: ${topics[next].title}</button>` : ''}<button class="btn btn-ghost" data-go="home">К маршруту</button>`
        : `${advice ? `<button class="btn btn-primary" data-lesson="${weak[0]}">Повторить «${topics[weak[0]].title}»</button>` : ''}<button class="btn ${advice ? 'btn-ghost' : 'btn-primary'}" data-stage="learn">К уроку</button><button class="btn btn-ghost" id="retry">Ещё раз</button>`}</div>
    </section>`;
  }
  return `<section class="sheet result ${pass ? 'pass' : 'fail'}" style="max-width:760px">
    <h2>${pass ? 'Отлично, тема не забылась' : 'Стоит освежить'}</h2>
    <p>Верно ${s.right} из ${s.total}. ${pass ? (m.reviewDue ? `Следующее повторение — ${new Date(m.reviewDue + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}.` : 'Все три повторения пройдены — тема закреплена.') : 'Повторение вернётся завтра. Если хочешь, загляни в урок.'}</p>
    <div class="row-actions"><button class="btn btn-primary" data-go="home">К маршруту</button>${pass ? '' : '<button class="btn btn-ghost" data-stage="learn">К уроку</button>'}</div>
  </section>`;
}

/* ================= Диагностика ================= */

let diagTask = null;
function diagnostic() {
  const d = state.diag;
  if (d.step >= DIAG.length) {
    const right = d.results.filter(Boolean).length, weak = DIAG.filter((_, k) => !d.results[k]);
    return head('Диагностика пройдена', `Верных ответов: ${right} из ${DIAG.length}.`) + `<div class="sheet" style="max-width:640px">
      ${weak.length ? `<h3>С этого стоит начать</h3><ul>${weak.map(i => `<li><button class="link" data-lesson="${i}">${topics[i].title}</button></li>`).join('')}</ul>` : '<h3>Отличный результат</h3><p>Все темы диагностики тебе знакомы. Можно двигаться дальше по маршруту.</p>'}
      <div class="row-actions"><button class="btn btn-primary" data-go="home">К маршруту</button><button class="btn btn-ghost" id="diag-restart">Пройти ещё раз</button></div></div>`;
  }
  const i = DIAG[d.step];
  if (!diagTask || diagTask.i !== i) diagTask = { i, task: topics[i].generate(2), started: Date.now() };
  return head('Диагностика', `${DIAG.length} коротких задач по разным темам, без подсказок. Ошибаться можно — так мы точнее подберём маршрут и темп.`) + `
  <section class="sheet task" style="max-width:760px">
    <div class="steps" aria-hidden="true">${DIAG.map((_, k) => `<i class="${k < d.step ? 'on' : ''}"></i>`).join('')}</div>
    <p class="muted">Вопрос ${d.step + 1} из ${DIAG.length} · ${topics[i].title}</p>
    ${taskCard(diagTask.task, { formId: 'diag-form', button: 'Ответить', exam: true })}
  </section>`;
}

/* ================= Награды ================= */

function awards() {
  const g = game(), rk = G.rank(g.stars), st = G.liveStreak(g, today());
  const toNext = rk.next ? rk.next.min - g.stars : 0, prog = rk.next ? Math.round((g.stars - rk.min) / (rk.next.min - rk.min) * 100) : 100;
  return head('Награды', 'Звёзды даются за каждую решённую задачу — больше, если решил сам с первой попытки. Ошибки звёзд не отнимают.') + `
  <div class="layout">
    <div class="stack">
      <div class="sheet rank-card">
        <div class="rank-top">${G.icon('crown', 40)}<div><p class="muted small">Твоё звание</p><h2>${rk.name}</h2></div></div>
        ${bar(prog)}
        <p class="small muted">${rk.next ? `Ещё ${toNext} ${plural(toNext, 'звезда', 'звезды', 'звёзд')} до звания «${rk.next.name}»` : 'Высшее звание — ты настоящий гроссмейстер дробей!'}</p>
      </div>
      <div class="facts">
        <div class="fact"><strong>${g.stars}</strong><span>звёзд</span></div>
        <div class="fact"><strong>${st}</strong><span>${plural(st, 'день', 'дня', 'дней')} подряд</span></div>
        <div class="fact"><strong>${g.earned.length}<small> из ${G.BADGES.length}</small></strong><span>достижений</span></div>
      </div>
      <section class="sheet"><h2>Достижения</h2>
        <div class="badges">${G.BADGES.map(b => { const on = g.earned.includes(b.id); return `<div class="badge-card${on ? ' on' : ''}">${G.icon(b.icon, 30)}<div><b>${b.title}</b><span>${b.desc}</span></div>${on ? '' : '<span class="visually-hidden">Ещё не получено</span>'}</div>`; }).join('')}</div>
      </section>
    </div>
    <div class="stack side">
      <div class="sheet"><h3>Как получить звёзды</h3><ul class="small star-rules">
        <li><b>+3</b> — задача с первой попытки без подсказок</li><li><b>+2</b> — с первой попытки, но с подсказкой</li>
        <li><b>+1</b> — решил после ошибок: упорство тоже считается</li><li><b>+2</b> — каждый верный ответ в проверке</li>
        <li><b>+10</b> — тема освоена</li><li><b>+5</b> — повторение без ошибок и выполненная цель дня</li></ul></div>
      <div class="sheet"><h3>Звания</h3><ol class="small ranks">${G.RANKS.map(r => `<li class="${r.name === rk.name ? 'on' : ''}">${r.name} <span class="muted">— от ${r.min} ★</span></li>`).join('')}</ol></div>
    </div>
  </div>`;
}

/* ================= Преподавателю ================= */

function teacher() {
  const p = pace();
  const rows = topics.map((t, i) => i).filter(i => pct(i) > 0 || Object.keys(meta(i).errors).length).sort((a, b) => pct(a) - pct(b));
  const advice = i => pct(i) >= DONE ? ['ok', 'Уверенно', 'Дать задачу посложнее'] : pct(i) >= 30 ? ['', 'Формируется', 'Закрепить на 3–4 задачах'] : ['warn', 'Нужна поддержка', 'Разобрать на наглядной модели'];
  const errs = i => Object.entries(meta(i).errors).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id, n]) => { const m = mistakeOf(i, id); return m ? `${m.title} <span class="muted">(${n})</span>` : ''; }).filter(Boolean).join('<br>') || '<span class="muted">—</span>';
  const hintsPer = i => { const m = meta(i); return m.tasks ? (m.hintsUsed / m.tasks).toFixed(1) : '—'; };
  return head('Преподавателю', `Сводка по ученику: ${esc(state.settings.name)}. Сверху — темы, где нужна помощь. Ошибки распознаются автоматически, темп и уровень задач подстраиваются сами.`) + `
  <div class="facts" style="margin-bottom:24px">
    <div class="fact"><strong>${mastered()}<small> из ${topics.length}</small></strong><span>тем освоено</span></div>
    <div class="fact"><strong>${A.PACE[p].label}</strong><span>темп ученика</span></div>
    <div class="fact"><strong>${state.asked || 0}</strong><span>сообщений наставнику</span></div>
  </div>
  <div class="sheet"><div class="tablewrap"><table>
    <thead><tr><th>Тема</th><th>Прогресс</th><th>Состояние</th><th>Уровень задач</th><th>Подсказок на задачу</th><th>Частые ошибки</th><th>Что сделать</th></tr></thead>
    <tbody>${rows.map(i => { const [c, s, a] = advice(i); const m = meta(i); return `<tr><td><b>${topics[i].title}</b><br><span class="muted small">${topics[i].section}</span></td><td style="min-width:110px">${pct(i)}%${bar(pct(i))}</td><td><span class="pill ${c}">${s}</span></td><td>${topics[i].legacy || m.level == null ? '<span class="muted">—</span>' : dots(m.level)}</td><td>${hintsPer(i)}</td><td class="small">${errs(i)}</td><td>${a}${m.failedChecks >= 2 ? '<br><span class="small muted">Проверка не сдана дважды</span>' : ''}</td></tr>`; }).join('')}</tbody>
  </table></div></div>
  <p class="muted small" style="margin-top:12px">Мотивация: ${game().stars} звёзд, серия ${G.liveStreak(game(), today())} дн. (лучшая — ${game().bestStreak}), достижений ${game().earned.length} из ${G.BADGES.length}, цель дня — ${game().goal} задач.</p>
  <p class="muted small">Темп: ${A.PACE[p].label.toLowerCase()} — ${A.PACE[p].say.charAt(0).toLowerCase() + A.PACE[p].say.slice(1)} Считается по последним 15 задачам: доля решённых с первой попытки без подсказок и время на задачу.</p>`;
}

/* ================= Настройки ================= */

function settings() {
  const s = state.settings;
  return head('Профиль', 'Имя, цель дня, звуки и ИИ-наставник.') + `
  <div class="layout settings">
    <div class="stack">
      <form class="sheet" id="settings-form">
        <h2>Ученик</h2>
        <label class="field">Имя ученика<input name="name" id="set-name" value="${esc(s.name)}" maxlength="30" required></label>
        <label class="field">Цель дня<select name="goal" id="set-goal">${[3, 5, 10].map(n => `<option value="${n}"${game().goal === n ? ' selected' : ''}>${n} задач в день</option>`).join('')}</select></label>
        <label class="field">Как объяснять<select name="style" id="set-style"><option value="steps"${s.style === 'steps' ? ' selected' : ''}>Коротко и по шагам</option><option value="visual"${s.style === 'visual' ? ' selected' : ''}>Через наглядные примеры</option></select></label>
        <label class="switch"><input type="checkbox" name="sound" id="set-sound"${state.settings.sound === false ? '' : ' checked'}> Звуки при ответах</label>
        <button class="btn btn-primary" type="submit">Сохранить</button>
        <div class="feedback" id="feedback" role="status" aria-live="polite"></div>
      </form>
      <div class="sheet"><h2>Помощь</h2><p class="muted small">Короткая экскурсия по главному экрану: где кнопка «Продолжить», путь, звёзды и меню.</p>
        <button class="btn btn-ghost" id="tour-again">Показать подсказки снова</button></div>
      <div class="sheet"><h2>Для взрослых</h2><p class="muted small">Отчёт по темам, темпу и частым ошибкам, а также быстрый тест, чтобы подобрать маршрут.</p>
        <div class="row-actions"><button class="btn btn-ghost" data-go="teacher">Отчёт для учителя</button><button class="btn btn-ghost" data-go="diagnostic">Диагностика</button></div></div>
      <form class="sheet" id="ai-form" autocomplete="off">
        <h2>ИИ-наставник</h2>
        <p class="muted small">Наставник работает на моделях DeepSeek через OpenRouter. Без подключения он ведёт урок по конспекту и отвечает на простые вопросы.</p>
        <fieldset class="field radios"><legend>Подключение</legend>
          <label><input type="radio" name="mode" value="off"${ai.mode === 'off' ? ' checked' : ''}> Без ИИ — только конспект</label>
          <label><input type="radio" name="mode" value="key"${ai.mode === 'key' ? ' checked' : ''}> Мой ключ OpenRouter в этом браузере</label>
          <label><input type="radio" name="mode" value="proxy"${ai.mode === 'proxy' ? ' checked' : ''}> Свой сервер-прокси (ключ хранится на сервере)</label>
        </fieldset>
        <label class="field" data-show="key">Ключ OpenRouter<input type="password" name="key" id="ai-key" value="${esc(ai.key)}" placeholder="sk-or-v1-…" spellcheck="false"></label>
        <label class="field" data-show="proxy">Адрес прокси<input type="url" name="proxy" id="ai-proxy" value="${esc(ai.proxy)}" placeholder="https://vektor-tutor.имя.workers.dev"></label>
        <label class="field" data-show="key proxy">Модель<select name="model" id="ai-model">${T.MODELS.map(m => `<option value="${m.id}"${ai.model === m.id ? ' selected' : ''}>${m.name}</option>`).join('')}</select></label>
        <div class="row-actions">
          <button class="btn btn-primary" type="submit">Сохранить</button>
          <button class="btn btn-ghost" type="button" id="ai-test" data-show="key proxy">Проверить подключение</button>
          <button class="btn btn-ghost" type="button" id="ai-forget" data-show="key">Удалить ключ</button>
        </div>
        <div class="feedback" id="ai-status" role="status" aria-live="polite"></div>
      </form>
    </div>
    <div class="stack side">
      <div class="sheet note"><h3>Как подключить DeepSeek</h3>
        <ol class="small"><li>Зарегистрируйся на openrouter.ai и пополни баланс.</li><li>Создай ключ и поставь лимит расходов, например $5.</li><li>Вставь ключ сюда и нажми «Проверить подключение».</li></ol>
        <p class="small">DeepSeek V4 Flash стоит примерно $0.014 за миллион входящих и $0.35 за миллион исходящих токенов — около 10–15 центов на тысячу ответов наставника.</p></div>
      <div class="sheet warn-box"><h3>Про безопасность ключа</h3>
        <p class="small">Ключ хранится только в этом браузере. Никогда не вставляй его в код на GitHub: страница публичная, ключ сразу украдут.</p>
        <p class="small">Для детей лучше вариант с прокси: ключ лежит на сервере, а ребёнок его не видит. Готовый прокси для Cloudflare — в папке <code>server/</code> репозитория.</p></div>
      <div class="sheet"><h3>Где хранятся данные</h3><p class="small muted">Имя и прогресс сохраняются только в этом браузере. Сообщения наставнику уходят в OpenRouter и выбранную модель. Очистить прогресс можно кнопкой «Начать заново» внизу страницы.</p></div>
    </div>
  </div>`;
}

/* ================= Роутинг ================= */

const filterState = { map: 'Все', library: 'Все' };
const route = () => { const [page, arg, stage] = (location.hash.slice(1) || 'home').split('/'); return { page: pages[page] ? page : 'home', i: Math.min(Math.max(+arg || 0, 0), topics.length - 1), stage }; };

function render() {
  const { page, i, stage } = route();
  const lessonStage = stage || (topics[i].legacy || meta(i).practice ? 'practice' : 'learn');
  document.querySelector('#crumb').textContent = page === 'lesson' ? topics[i].title : pages[page];
  document.title = (page === 'home' ? '' : (page === 'lesson' ? topics[i].title : pages[page]) + ' — ') + 'Вектор';
  document.querySelectorAll('.sidebar [data-page]').forEach(b => (b.dataset.page === page || (page === 'library' && b.dataset.page === 'map')) ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  document.querySelector('#student-name').textContent = state.settings.name;
  document.querySelector('#avatar').textContent = (state.settings.name[0] || 'А').toUpperCase();
  app.innerHTML = ({ home, map: () => mapPage(filterState.map), diagnostic, library: () => library(filterState.library), awards, teacher, settings, lesson: () => lessonPage(i, lessonStage) })[page]();
  bind(page, i, lessonStage);
  hud();
  if (page === 'home' && !state.toured && !navigator.webdriver) setTimeout(() => route().page === 'home' && startTour(0), 600);
  requestAnimationFrame(drawRoute);
}

function feedbackFor(r, task, i) {
  if (r.ok) return `<b>Верно!</b> ${r.note ? r.note + ' ' : ''}${task.solution}`;
  if (r.empty || r.unreadable || r.almost) return r.msg;
  const m = r.mistake && mistakeOf(i, r.mistake);
  return m ? `<b>Похоже на частую ошибку: ${m.title.toLowerCase()}.</b> ${m.say}` : 'Пока не совпало. Открой подсказку или спроси наставника.';
}

const EVENT_TEXT = {
  'level-up': () => 'Ты решаешь уверенно — следующие задачи будут посложнее.',
  'level-down': () => 'Сделаем следующие задачи попроще, чтобы закрепить основу.',
  'struggle': () => 'Эта задача непростая. Давай разберём её вместе с наставником.',
  'same-mistake': (e, i) => { const m = mistakeOf(i, e.mistake); return `Эта ошибка повторяется${m ? `: ${m.title.toLowerCase()}` : ''}. Загляни в урок — там есть картинка.`; },
};

function bind(page, i, stage) {
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => location.hash = b.dataset.go);
  app.querySelectorAll('[data-continue]').forEach(b => b.onclick = () => { const ct = continueTarget(); session = null; if (ct.stage === 'learn') learnTab = 'tutor'; location.hash = `lesson/${ct.i}/${ct.stage}`; });
  app.querySelectorAll('[data-lesson]').forEach(b => b.onclick = () => { session = null; if (b.dataset.tab) learnTab = b.dataset.tab; location.hash = 'lesson/' + b.dataset.lesson + (b.dataset.tab && !topics[+b.dataset.lesson].legacy ? '/learn' : ''); });
  app.querySelectorAll('[data-review]').forEach(b => b.onclick = () => { session = null; location.hash = `lesson/${b.dataset.review}/review`; });
  app.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { session = null; location.hash = `lesson/${i}/${b.dataset.stage}`; });
  app.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { filterState[page] = b.dataset.filter; render(); });
  app.querySelectorAll('[data-learn-tab]').forEach(b => b.onclick = () => { learnTab = b.dataset.learnTab; render(); });
  V.labBind(app);
  app.querySelectorAll('[data-insert]').forEach(b => b.onclick = () => {
    const inp = app.querySelector('#answer'); if (!inp) return;
    const a = inp.selectionStart ?? inp.value.length, z = inp.selectionEnd ?? a;
    inp.value = inp.value.slice(0, a) + b.dataset.insert + inp.value.slice(z); inp.focus(); inp.setSelectionRange(a + 1, a + 1);
  });

  if (page === 'lesson' && stage === 'learn' && learnTab === 'tutor' && !topics[i].legacy) {
    bindChat(i, 'lesson');
    const c = getChat(i, 'lesson');
    if (!c.started) { startLesson(i); refreshChat(i, 'lesson'); }
    const log = app.querySelector('.chat-lesson .chat-log'); if (log) log.scrollTop = log.scrollHeight;
  }
  if (page === 'lesson' && stage === 'practice' && !topics[i].legacy) bindChat(i, 'task');

  const form = app.querySelector('#answer-form');
  if (form && page === 'lesson') {
    const s = session, fb = app.querySelector('#feedback');
    form.onsubmit = e => {
      e.preventDefault();
      if (s.answered) return;
      const got = readAnswer(form, e);
      if (got.error) { fb.className = 'feedback bad'; fb.innerHTML = got.error; return; }
      const value = got.value;
      const r = check(value, s.task);
      if (r.empty || r.unreadable) { fb.className = 'feedback bad'; fb.innerHTML = r.empty ? 'Сначала впиши ответ в клеточки.' : r.msg; return; }
      markActivity();
      const m = meta(i), t = topics[i];
      if (r.mistake) m.errors[r.mistake] = (m.errors[r.mistake] || 0) + 1;

      if (s.mode === 'practice') {
        s.tries.push(value);
        const solved = r.ok && !r.almost;
        if (!solved) {
          if (r.mistake) s.lastMistake = r.mistake;
          m.errorsTotal++; G.wrong(game());
          const ev = t.legacy ? [] : A.afterAttempt(m, { solved: false, firstTry: false, hints: s.hints, sec: 0, mistake: r.mistake }, pace());
          fb.className = 'feedback bad big';
          fb.innerHTML = `<p class="fb-title">${G.icon('repeat', 22)} Пока не так — попробуй ещё раз</p><p>${feedbackFor(r, s.task, i)}</p>` + eventsHtml(ev, i) +
            `<div class="fb-actions"><button class="btn btn-primary" id="try-again">Исправить ответ</button>${s.hints < s.task.hints.length ? '<button class="btn btn-ghost" id="fb-hint">Подсказка</button>' : ''}${t.legacy ? '' : '<button class="btn btn-ghost" id="ask-tutor">Разобрать с наставником</button>'}</div>`;
          fb.querySelector('#try-again').onclick = () => { const inp = app.querySelector('#ans-num'); if (inp) { inp.focus(); inp.select(); } };
          const fh = fb.querySelector('#fb-hint'); if (fh) fh.onclick = () => app.querySelector('#hint-btn')?.click();
          sfx('wrong');
          const ask = fb.querySelector('#ask-tutor');
          if (ask) ask.onclick = () => { tutorSay(i, 'task', `Я ответил «${value}», но не получилось. Помоги понять, где ошибка.`); app.querySelector('.chat-task')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
          bindEventButtons(fb, i);
          save(); return;
        }
        s.answered = true; m.practice++;
        const sec = Math.round((Date.now() - s.started) / 1000), firstTry = s.tries.length === 1, hints = s.hints;
        let ev = [];
        if (!t.legacy) {
          ev = A.afterAttempt(m, { solved: true, firstTry, hints, sec, mistake: null }, pace());
          m.tasks++; m.hintsUsed += hints; m.secTotal += sec;
          if (firstTry && hints === 0) m.cleanTotal++;
          state.attempts = [...state.attempts, { topic: t.id, firstTry, hints, sec, level: m.level, ai: !!s.askedAi }].slice(-60);
          setPct(i, Math.max(pct(i), Math.min(70, 10 + m.practice * 15)));
        } else setPct(i, 100);
        const need = A.need(pace()), justReady = !t.legacy && m.practice === need;
        fb.className = 'feedback big';
        fb.innerHTML = `<p class="fb-title">${G.icon('star', 22)} Верно!</p><p>${feedbackFor(r, s.task, i).replace(/^<b>Верно!<\/b>\s*/, '')}</p>` + eventsHtml(ev, i) +
          (!t.legacy && A.fastTrack(m, pace()) ? `<p class="fast-track">Похоже, ты это уже знаешь — можно сразу к проверке.</p>` : '') +
          (justReady ? `<p class="fast-track">Ты решил ${need} ${plural(need, 'задачу', 'задачи', 'задач')} — можно проверить себя!</p>` : '') +
          `<div class="fb-actions"><button class="btn btn-primary btn-big" id="next-task">Следующая задача →</button>${!t.legacy && (justReady || A.fastTrack(m, pace()) || m.practice > need) ? '<button class="btn btn-ghost" data-stage-now="check">К проверке</button>' : ''}</div>`;
        form.querySelectorAll('input,button').forEach(el => el.disabled = true);
        fb.querySelector('#next-task').onclick = () => { newPracticeTask(i); render(); app.querySelector('#ans-num')?.focus(); };
        fb.querySelector('#next-task').focus({ preventScroll: true });
        sfx('ok');
        bindEventButtons(fb, i);
        save(); celebrate(G.solved(game(), today(), { firstTry, hints, wrongBefore: s.tries.length - 1 })); return;
      }
      // проверка и повторение: один ответ на задачу
      s.answered = true;
      const ok = r.ok && !r.almost;
      if (ok) s.right++; else if (r.mistake) s.found.push(r.mistake);
      if (s.mode === 'check') { const ce = G.checkAnswer(game(), today(), ok); s.stars = (s.stars || 0) + ce.reduce((a, e) => a + e.n, 0); celebrate(ce, { quiet: true }); }
      fb.className = 'feedback big' + (ok ? '' : ' bad');
      fb.innerHTML = ok ? `<p class="fb-title">${G.icon('star', 22)} Верно</p>` : `<p class="fb-title">Не совсем</p><p>Решение: ${s.task.solution}</p>`;
      fb.insertAdjacentHTML('beforeend', `<div class="fb-actions"><button class="btn btn-primary btn-big" id="next-task">${s.k + 1 < s.total ? 'Следующая задача →' : 'Узнать результат →'}</button></div>`);
      sfx(ok ? 'ok' : 'wrong');
      form.querySelectorAll('input,button').forEach(el => el.disabled = true);
      fb.querySelector('#next-task').onclick = () => {
        s.k++; s.answered = false; s.task = topics[i].generate(2);
        if (s.k >= s.total) finishSession(i);
        render(); app.querySelector('#ans-num')?.focus();
        if (gameEvents) { if (gameEvents.some(e => e.type === 'mastered')) sfx('win'); celebrate(gameEvents); gameEvents = null; }
      };
      fb.querySelector('#next-task').focus();
      save();
    };
    const hb = app.querySelector('#hint-btn');
    if (hb) hb.onclick = () => { if (s.hints < s.task.hints.length) { s.hints++; syncHints(); } };
    syncHints();
    bindAnswerKeys();
  }
  const retry = app.querySelector('#retry');
  if (retry) retry.onclick = () => { session = null; render(); };

  const dform = app.querySelector('#diag-form');
  if (dform) dform.onsubmit = e => {
    e.preventDefault();
    const got = readAnswer(dform, e), k = state.diag.step, ti = DIAG[k];
    if (got.error) { app.querySelector('#feedback').textContent = got.error; return; }
    const value = got.value, r = check(value, diagTask.task);
    if (r.empty) { app.querySelector('#feedback').textContent = 'Впиши ответ — или напиши 0, если не знаешь.'; return; }
    markActivity();
    const ok = r.ok && !r.almost, sec = Math.round((Date.now() - diagTask.started) / 1000);
    if (ok) setPct(ti, Math.max(pct(ti), 60));
    if (r.mistake) { const m = meta(ti); m.errors[r.mistake] = (m.errors[r.mistake] || 0) + 1; }
    state.attempts = [...state.attempts, { topic: topics[ti].id, firstTry: ok, hints: 0, sec, level: 2, diag: true }].slice(-60);
    state.diag.results[k] = ok; state.diag.step++; diagTask = null; save(); render();
    if (state.diag.step >= DIAG.length) celebrate(G.diag(game(), today()));
  };
  if (dform) bindAnswerKeys();
  const restart = app.querySelector('#diag-restart');
  if (restart) restart.onclick = () => { state.diag = { step: 0, results: [] }; save(); render(); };

  const sform = app.querySelector('#settings-form');
  if (sform) sform.onsubmit = e => {
    e.preventDefault();
    state.settings = { name: sform.name.value.trim() || 'Ученик', style: sform.style.value, sound: sform.sound.checked }; game().goal = +sform.goal.value || 5; save();
    document.querySelector('#student-name').textContent = state.settings.name;
    document.querySelector('#avatar').textContent = state.settings.name[0].toUpperCase();
    app.querySelector('#feedback').textContent = 'Сохранено.';
  };
  const ta = app.querySelector('#tour-again');
  if (ta) ta.onclick = () => { state.toured = false; save(); location.hash = 'home'; };
  const aform = app.querySelector('#ai-form');
  if (aform) bindAiForm(aform);
}

function eventsHtml(ev, i) {
  return ev.map(e => `<p class="adapt-note">${EVENT_TEXT[e.type](e, i)}${e.type === 'struggle' ? ' <button class="btn btn-ghost btn-sm" data-ask="1">Спросить наставника</button>' : ''}${e.type === 'same-mistake' ? ' <button class="btn btn-ghost btn-sm" data-stage-now="learn">Посмотреть урок</button>' : ''}</p>`).join('');
}
function bindEventButtons(fb, i) {
  fb.querySelectorAll('[data-stage-now]').forEach(b => b.onclick = () => { session = null; if (b.dataset.stageNow === 'learn') learnTab = 'tutor'; location.hash = `lesson/${i}/${b.dataset.stageNow}`; });
  fb.querySelectorAll('[data-ask]').forEach(b => b.onclick = () => { tutorSay(i, 'task', 'Я не понимаю, как решить эту задачу. Помоги начать.'); app.querySelector('.chat-task')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
}

function bindAiForm(form) {
  const st = form.querySelector('#ai-status');
  const showFields = () => {
    const mode = form.mode.value;
    form.querySelectorAll('[data-show]').forEach(el => { el.hidden = !el.dataset.show.split(' ').includes(mode); });
  };
  form.querySelectorAll('input[name=mode]').forEach(r => r.onchange = showFields);
  showFields();
  const read = () => ({ mode: form.mode.value, key: form.key.value.trim(), proxy: form.proxy.value.trim(), model: form.model.value });
  const validate = c => {
    if (c.mode === 'key' && !/^sk-or-/.test(c.key)) return 'Ключ OpenRouter начинается с «sk-or-». Скопируй его целиком со страницы Keys на openrouter.ai.';
    if (c.mode === 'proxy' && !/^https:\/\//.test(c.proxy)) return 'Адрес прокси должен начинаться с https://';
    return null;
  };
  form.onsubmit = e => {
    e.preventDefault();
    const c = read(), err = validate(c);
    if (err) { st.className = 'feedback bad'; st.textContent = err; return; }
    ai = c; T.saveCfg(ai);
    st.className = 'feedback'; st.textContent = c.mode === 'off' ? 'Сохранено. Наставник работает по конспекту.' : 'Сохранено. Нажми «Проверить подключение», чтобы убедиться, что всё работает.';
  };
  form.querySelector('#ai-test').onclick = async () => {
    const c = read(), err = validate(c);
    if (err) { st.className = 'feedback bad'; st.textContent = err; return; }
    st.className = 'feedback'; st.textContent = 'Проверяю…';
    try { const reply = await T.testConnection(c); ai = c; T.saveCfg(ai); st.innerHTML = `<b>Работает.</b> Модель ответила: «${esc(reply.slice(0, 40))}». Настройки сохранены.`; }
    catch (e) { st.className = 'feedback bad'; st.textContent = e.message || 'Не получилось подключиться.'; }
  };
  form.querySelector('#ai-forget').onclick = () => {
    ai = { ...ai, key: '', mode: ai.mode === 'key' ? 'off' : ai.mode }; T.saveCfg(ai);
    form.key.value = ''; if (form.mode.value === 'key') form.querySelector('input[value=off]').checked = true; showFields();
    st.className = 'feedback'; st.textContent = 'Ключ удалён из этого браузера.';
  };
}

let gameEvents = null; // показываем после перерисовки экрана результата
function finishSession(i) {
  const t = topics[i], s = session, m = meta(i);
  if (s.mode === 'check') {
    if (s.right >= t.check.passScore) {
      setPct(i, 100); m.mastered = true; m.masteredAt = today(); m.reviewStep = 0; m.reviewDue = addDays(today(), t.review.afterDays[0]); m.failedChecks = 0;
      gameEvents = G.mastered(game(), ROUTE.filter(r => pct(r) >= DONE).length);
    } else m.failedChecks++;
    if (s.stars) (gameEvents ||= []).unshift({ type: 'stars', n: s.stars, why: 'за проверку' });
  } else if (s.mode === 'review') {
    if (s.right === s.total) {
      m.reviewStep++;
      const days = t.review.afterDays;
      m.reviewDue = m.reviewStep < days.length ? addDays(m.masteredAt || today(), days[m.reviewStep]) : null;
      if (m.reviewDue && m.reviewDue <= today()) m.reviewDue = addDays(today(), 1);
      setPct(i, 100);
    } else { m.reviewDue = addDays(today(), 1); setPct(i, 85); }
    gameEvents = G.reviewed(game(), today(), s.right === s.total);
  }
  save();
}

/* ================= Запуск ================= */

document.querySelectorAll('.sidebar [data-page]').forEach(b => b.onclick = () => location.hash = b.dataset.page);
// Сброс в два нажатия — без системного confirm()
const resetBtn = document.querySelector('#reset'); let resetArmed;
resetBtn.onclick = () => {
  if (!resetArmed) { resetArmed = setTimeout(() => { resetArmed = null; resetBtn.textContent = 'Начать заново'; }, 4000); resetBtn.textContent = 'Нажми ещё раз, чтобы стереть прогресс'; return; }
  clearTimeout(resetArmed); resetArmed = null; resetBtn.textContent = 'Начать заново';
  state = fresh(); session = null; for (const k in chats) delete chats[k]; save(); location.hash = 'home'; render();
};
addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

// ---------- Скины ----------
const SKIN_FONTS = {
  orbit: 'family=Unbounded:wght@500;700',
  pop: 'family=Dela+Gothic+One&family=Rubik:wght@400;500;600;700',
  pixel: 'family=Press+Start+2P&family=Rubik:wght@400;500;600;700;800',
};
function setSkin(name) {
  if (!['notebook', 'orbit', 'pop', 'pixel'].includes(name)) name = 'notebook';
  document.documentElement.dataset.skin = name;
  if (SKIN_FONTS[name] && !document.getElementById('font-' + name)) {
    const l = document.createElement('link'); l.id = 'font-' + name; l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?${SKIN_FONTS[name]}&display=swap`; document.head.appendChild(l);
  }
  document.querySelectorAll('.skin-switch button').forEach(b => b.setAttribute('aria-pressed', b.dataset.skin === name));
  try { localStorage.setItem('vektor-skin', name); } catch {}
  requestAnimationFrame(drawRoute);
}
document.querySelectorAll('.skin-switch button').forEach(b => b.onclick = () => setSkin(b.dataset.skin));
let savedSkin; try { savedSkin = localStorage.getItem('vektor-skin'); } catch {}
setSkin(savedSkin || 'notebook');

let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawRoute, 100); });
render();
