'use strict';

/* ================= Модули ================= */

const { check } = window.VEKTOR_CHECK;
const V = window.VEKTOR_VISUALS, T = window.VEKTOR_TUTOR, A = window.VEKTOR_ADAPTIVE;
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

const pages = { home: 'Мой маршрут', map: 'Карта знаний', diagnostic: 'Диагностика', library: 'Материалы', teacher: 'Преподавателю', settings: 'Настройки', lesson: 'Занятие' };
const STAGES = [['learn', 'Урок'], ['practice', 'Тренировка'], ['check', 'Проверка']];

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
  if (!Array.isArray(state.diag.results) || !Number.isInteger(state.diag.step)) state.diag = d.diag;
  state.attempts = state.attempts.filter(a => a && typeof a === 'object');
})();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
let ai = T.loadCfg();

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

function taskCard(task, { formId = 'answer-form', button = 'Проверить ответ', exam = false } = {}) {
  const input = task.choices
    ? `<div class="choices" role="group" aria-label="Выбери знак">${task.choices.map(c => `<button type="submit" class="btn btn-ghost choice" name="choice" value="${esc(c)}">${esc(c)}</button>`).join('')}</div>`
    : `<label>Твой ответ<input id="answer" inputmode="text" autocomplete="off" placeholder="${esc(task.placeholder || 'число или дробь')}"></label><button class="btn btn-primary" type="submit">${button}</button>`;
  return `<p class="story">${task.story}</p>${exam && task.figureIsHint ? '' : figure(task.figure)}<p class="question" id="q">${task.question}</p>
    <form class="answer" id="${formId}" autocomplete="off">${input}</form>
    <div class="feedback" id="feedback" role="status" aria-live="polite"></div>`;
}
const readAnswer = (form, e) => e.submitter && e.submitter.name === 'choice' ? e.submitter.value : (form.querySelector('#answer')?.value || '');

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
    return isOnline()
      ? [['Дальше', 'Дальше', true], ['Не понял, объясни по-другому', 'Не понял'], ['Покажи на картинке', 'Покажи картинку'], ['Дай ещё пример', 'Ещё пример']]
      : [['Дальше', 'Дальше', true], ['Повтори правило', 'Повтори правило'], ['Покажи картинку', 'Картинка']];
  }
  return isOnline()
    ? [['Дай подсказку', 'Подсказка'], ['Я не понимаю задачу', 'Не понимаю задачу'], ['Покажи на картинке', 'Картинка']]
    : [['Дай подсказку', 'Подсказка'], ['Покажи картинку', 'Картинка'], ['Повтори правило', 'Правило']];
}

function chatBox(i, kind) {
  const c = getChat(i, kind), online = isOnline();
  const ph = kind === 'lesson' ? (c.pending ? 'Твой ответ, например 3/4' : 'Ответь или спроси наставника…') : 'Спроси, что непонятно…';
  return `<div class="chat chat-${kind}" data-chat="${kind}">
    <div class="chat-log" aria-live="polite">${c.msgs.filter(m => !m.hidden).map(msgHtml).join('') || (kind === 'task' ? '<p class="muted small chat-empty">Застрял? Спроси наставника — он не скажет ответ, но поможет дойти до него самому.</p>' : '')}</div>
    <div class="chat-quick">${quickReplies(i, kind).map(([v, l, main]) => `<button type="button" class="btn ${main ? 'btn-primary' : 'btn-ghost'} btn-sm" data-quick="${esc(v)}">${l}</button>`).join('')}</div>
    <form class="chat-form" autocomplete="off"><label class="visually-hidden" for="chat-in-${kind}">Сообщение наставнику</label>
      <input id="chat-in-${kind}" placeholder="${ph}" maxlength="400"${c.busy ? ' disabled' : ''}><button class="btn btn-primary" type="submit"${c.busy ? ' disabled' : ''}>Отправить</button></form>
    <p class="chat-mode small muted">${online ? `Наставник: ${esc(modelName())} через OpenRouter.` : 'Наставник без ИИ — отвечает по конспекту.'} ${online ? '' : '<a href="#settings">Подключить ИИ</a>'}</p>
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
  box.innerHTML = session.task.hints.slice(0, session.hints).map(h => `<p class="bubble">${h}</p>`).join('');
  if (hb) { hb.disabled = session.hints >= session.task.hints.length; hb.textContent = session.hints ? 'Ещё подсказка' : 'Показать подсказку'; }
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
  if (isOnline()) return aiReply(i, kind);
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
  try {
    const text = await T.stream(ai, [{ role: 'system', content: sys }, ...history], txt => {
      msg.html = T.render(txt, { streaming: true }).html || '<p class="typing">…</p>'; updateLastMsg(i, kind, msg);
    });
    const r = T.render(text);
    msg.raw = text; msg.html = r.html || '<p>…</p>';
    if (r.done && kind === 'lesson') c.done = true;
    if (kind === 'task' && session?.mode === 'practice') session.askedAi = true;
  } catch (e) {
    msg.error = true;
    msg.html = `<p>${esc(e.message || 'Не получилось получить ответ.')}</p><p class="small">Пока могу помочь по конспекту: <button type="button" class="link" data-offline="1">ответить без ИИ</button></p>`;
  } finally {
    c.busy = false; refreshChat(i, kind);
  }
}

// Ответ без ИИ после ошибки подключения
function offlineFallback(i, kind) {
  const c = getChat(i, kind), t = topics[i], task = kind === 'task' ? session?.task : null;
  const last = [...c.msgs].reverse().find(m => m.role === 'user' && !m.error);
  if (kind === 'lesson' && (!last || /^(дальше|начни урок)/i.test(last.raw || ''))) nextBeat(i);
  else c.msgs.push({ role: 'assistant', html: T.localAnswer(t, last?.raw || 'правило', task, c.hint).html });
  refreshChat(i, kind);
}

/* ================= Главная ================= */

function home() {
  const ns = nextStep(), cur = currentStop(), t = topics[ns.i], due = dueReviews(), p = pace();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  const stops = ROUTE.map((i, k) => {
    const cls = i === cur ? 'is-current' : 'is-' + (status(i) === 'done' ? 'done' : status(i) === 'started' ? 'started' : 'todo');
    return `<button class="stop ${cls}${k % 2 ? ' below' : ''}" data-lesson="${i}" aria-label="${topics[i].title}: ${statusText(i)}">
      <span class="dot">${status(i) === 'done' ? '✓' : k + 1}</span><span class="label">${topics[i].short || topics[i].title}</span></button>`;
  }).join('');
  return head(`${hello}, ${esc(state.settings.name)}!`, 'Вот твой маршрут по разделу «Обыкновенные дроби». Ты сейчас здесь — на выделенной точке.') + `
  <section aria-label="Маршрут по разделу «Обыкновенные дроби»" class="route" id="route"><svg class="vector" aria-hidden="true"></svg>${stops}</section>
  <div class="layout">
    <div class="stack">
      ${due.length ? `<div class="sheet review-due"><h2>Повторить сегодня</h2><p class="muted">Две задачи на тему, которую ты уже освоил, — чтобы не забылось.</p><div class="review-list">${due.map(i => `<button class="btn btn-ghost" data-review="${i}">${topics[i].title}</button>`).join('')}</div></div>` : ''}
      <div class="sheet next">
        <div><h2>${ns.reason ? 'Сначала повторим' : 'Следующий шаг'}: ${t.title}</h2><p class="muted">${ns.reason || t.goal || t.idea}</p></div>
        <div class="actions"><button class="btn btn-primary" data-lesson="${ns.i}">${meta(ns.i).practice ? 'Продолжить' : 'Начать урок'}</button><span class="muted small">${p === 'fast' ? '7–10' : p === 'slow' ? '15–20' : '10–15'} минут</span></div>
      </div>
      <div class="facts">
        <div class="fact"><strong>${mastered()}<small> из ${topics.length}</small></strong><span>тем освоено</span></div>
        <div class="fact"><strong>${checked()}<small> из ${topics.length}</small></strong><span>тем начато</span></div>
        <div class="fact"><strong>${state.answers}</strong><span>ответов дано</span></div>
      </div>
      <div class="sheet"><h3>Эта неделя</h3><div class="week">${week()}</div></div>
    </div>
    <div class="stack side">
      <div class="sheet pace pace-${p}">
        <h3>Твой темп: ${A.PACE[p].label.toLowerCase()}</h3>
        <p class="muted small">${A.PACE[p].say} Темп подстраивается сам — по тому, как ты решаешь.</p>
        ${state.attempts.length < 4 ? '<p class="small muted">Реши ещё несколько задач — и маршрут подстроится под тебя.</p>' : ''}
      </div>
      <div class="sheet knowledge">
        <h3>Что ты уже знаешь</h3>
        <p class="muted small" style="margin-top:6px">Средний прогресс по начатым темам — <b>${knowledge()}%</b>. Темы, которые ты ещё не открывал, не считаются пробелами.</p>
        ${SECTIONS.map(s => { const ix = topics.map((t, i) => i).filter(i => topics[i].section === s); const v = Math.round(ix.reduce((a, i) => a + pct(i), 0) / ix.length); return `<div class="row"><span>${s}</span><b>${v}%</b>${bar(v)}</div>`; }).join('')}
        <button class="btn btn-ghost" data-go="diagnostic" style="margin-top:6px">Пройти диагностику</button>
      </div>
      <div class="sheet note"><h3>Наставник ${isOnline() ? 'на связи' : 'работает по конспекту'}</h3><p>${isOnline() ? `Ведёт урок, отвечает на вопросы и рисует дроби. Модель: ${esc(modelName())}.` : 'Ведёт урок по методичке. Чтобы он отвечал на любые вопросы, подключи ИИ в настройках.'}</p>${isOnline() ? '' : '<button class="link" data-go="settings">Подключить ИИ</button>'}</div>
    </div>
  </div>`;
}

function week() {
  const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], now = new Date(), dow = (now.getDay() + 6) % 7;
  return names.map((n, k) => { const d = new Date(now); d.setDate(now.getDate() - dow + k); const on = state.days.includes(isoDate(d)); return `<span>${n}<i class="${on ? 'on' : ''}" title="${on ? 'Занимался' : 'Нет занятий'}"></i></span>`; }).join('');
}

function drawRoute() {
  const box = document.querySelector('#route'); if (!box) return;
  const svg = box.querySelector('svg'), W = box.clientWidth, H = box.clientHeight;
  if (!W || getComputedStyle(svg).display === 'none') return;
  const n = ROUTE.length;
  // сплошная линия — пройденная часть пути: до последней начатой темы
  const cur = Math.max(ROUTE.indexOf(currentStop()), ...ROUTE.map((i, k) => pct(i) > 0 ? k : 0));
  const pts = ROUTE.map((_, k) => [W * (0.06 + 0.86 * k / (n - 1)), H * (0.82 - 0.64 * Math.pow(k / (n - 1), 0.85))]);
  box.querySelectorAll('.stop').forEach((el, k) => { el.style.left = pts[k][0] + 'px'; el.style.top = pts[k][1] + 'px'; });
  const P = a => a.map(p => p.join(',')).join(' ');
  const last = pts[n - 1], prev = pts[n - 2], ang = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
  const tip = [last[0] + 34 * Math.cos(ang), last[1] + 34 * Math.sin(ang)];
  const hw = (a, d) => [tip[0] - 16 * Math.cos(ang) + d * 9 * Math.cos(ang + a), tip[1] - 16 * Math.sin(ang) + d * 9 * Math.sin(ang + a)];
  svg.innerHTML = `<defs><linearGradient id="holo-grad" x1="0" x2="1"><stop offset="0" stop-color="#7EE0C3"/><stop offset=".45" stop-color="#8F7CFF"/><stop offset="1" stop-color="#FF7EB8"/></linearGradient></defs><line class="axis" x1="0" y1="${H - 1}" x2="${W}" y2="${H - 1}"/>
    <polyline class="todo" points="${P(pts.slice(Math.max(cur, 0)).concat([tip]))}"/>
    <polyline class="done" points="${P(pts.slice(0, cur + 1))}"/>
    <polygon class="head" points="${P([tip, hw(Math.PI / 2, 1), hw(Math.PI / 2, -1)])}"/>`;
  const done = svg.querySelector('.done'); if (done) done.style.setProperty('--len', Math.ceil(done.getTotalLength()) + 1);
}

/* ================= Карта и материалы ================= */

const filters = cur => `<div class="filters" role="group" aria-label="Фильтр по разделам">${['Все', ...SECTIONS].map(s => `<button class="chip" data-filter="${s}" aria-pressed="${s === cur}">${s}</button>`).join('')}</div>`;

function mapPage(filter = 'Все') {
  const cur = currentStop();
  return head('Карта знаний', 'Вся программа на одном листе. Открывай любую тему — порядок подсказывает маршрут, но не запрещает.') + filters(filter) +
    SECTIONS.filter(s => filter === 'Все' || s === filter).map(s => {
      const ix = topics.map((t, i) => i).filter(i => topics[i].section === s), done = ix.filter(i => pct(i) >= DONE).length;
      return `<section class="section"><h2>${s === 'Дроби' ? 'Обыкновенные дроби' : s} <small>освоено ${done} из ${ix.length}</small></h2><div class="topics">${ix.map(i => `
        <button class="topic is-${status(i)}${i === cur ? ' is-current' : ''}" data-lesson="${i}">
          <h3>${topics[i].title}</h3><span class="status">${i === cur ? 'Следующий шаг маршрута' : statusText(i)}${topics[i].legacy ? ' · краткое занятие' : ''}</span>${bar(pct(i))}
        </button>`).join('')}</div></section>`;
    }).join('');
}

function library(filter = 'Все') {
  const list = topics.map((t, i) => i).filter(i => filter === 'Все' || topics[i].section === filter);
  return head('Материалы', 'Методички по темам: чему научишься, наглядная модель, правило, разобранные примеры и частые ошибки.') + filters(filter) +
    `<div class="topics">${list.map(i => { const t = topics[i]; return `<article class="topic"><h3>${t.title}</h3><p class="muted small">${t.goal || t.idea}</p>
      <span class="status">${t.legacy ? 'Методичка готовится — пока одна задача' : `${t.explain.examples.length} разобранных примера · ${t.mistakes.length} частые ошибки`}</span>
      <button class="link" data-lesson="${i}" data-tab="notes" style="margin-top:auto;align-self:flex-start">${t.legacy ? 'Решить задачу' : 'Открыть конспект'}</button></article>`; }).join('')}</div>`;
}

/* ================= Занятие ================= */

let learnTab = 'tutor';

function lessonPage(i, stage) {
  const t = topics[i];
  if (t.legacy) stage = 'practice';
  const tabs = t.legacy ? '' : `<div class="stages" role="navigation" aria-label="Этапы занятия">${STAGES.map(([id, name], k) =>
    `<button class="stage${id === stage ? ' on' : ''}" data-stage="${id}" ${id === stage ? 'aria-current="step"' : ''}><b>${k + 1}</b>${name}</button>`).join('')}</div>`;
  const req = (t.requires || []).map(id => byId[id]).filter(x => x != null);
  const reqHtml = req.length ? `<p class="requires small">Опирается на: ${req.map(r => `<button class="link" data-lesson="${r}">${topics[r].title}</button>${pct(r) >= DONE ? ' ✓' : ''}`).join(', ')}</p>` : '';
  const body = stage === 'learn' ? learnStage(i) : stage === 'check' ? checkStage(i, 'check') : stage === 'review' ? checkStage(i, 'review') : practiceStage(i);
  return head(t.title, t.legacy ? t.idea : `После этой темы ты сможешь: ${t.goal.charAt(0).toLowerCase() + t.goal.slice(1)}`) + tabs + reqHtml + body;
}

function learnStage(i) {
  const t = topics[i], e = t.explain;
  const tabBtns = `<div class="learn-tabs" role="tablist" aria-label="Как изучать">
    <button role="tab" class="chip" data-learn-tab="tutor" aria-selected="${learnTab === 'tutor'}" aria-pressed="${learnTab === 'tutor'}">Урок с наставником</button>
    <button role="tab" class="chip" data-learn-tab="notes" aria-selected="${learnTab === 'notes'}" aria-pressed="${learnTab === 'notes'}">Конспект</button></div>`;
  const side = `<aside class="stack side">
      <div class="sheet"><h3>Лаборатория дробей</h3><p class="muted small">Меняй числа и смотри, как выглядит дробь на полоске, круге и прямой.</p>${V.labHtml('lab-side', { n: 3, d: 5, k: 1 })}</div>
      <div class="sheet"><h3>Готов потренироваться?</h3><p class="muted small">Задачи каждый раз новые и подстраиваются под твой темп.</p><button class="btn btn-primary" data-stage="practice">Начать тренировку</button></div>
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
  const task = session.task, need = A.need(p);
  return `<div class="layout">
    <section class="sheet task" aria-labelledby="q">${t.legacy ? '' : `<p class="task-meta small muted">Уровень задач ${dots(m.level || 2)} · твой темп: ${A.PACE[p].label.toLowerCase()}</p>`}${taskCard(task)}</section>
    <aside class="stack side">
      <div class="sheet tutor" aria-label="Подсказки">
        <h3>Подсказки</h3>
        <p class="muted small" style="margin-top:4px">${session.autoHint ? 'Первую подсказку открыли сразу — так будет легче начать.' : 'Открывай по одной — сначала попробуй сам.'}</p>
        <div id="hints">${task.hints.slice(0, session.hints).map(h => `<p class="bubble">${h}</p>`).join('')}</div>
        <button class="btn btn-ghost" id="hint-btn"${session.hints >= task.hints.length ? ' disabled' : ''}>${session.hints ? 'Ещё подсказка' : 'Показать подсказку'}</button>
        ${t.legacy ? '' : `<div class="streak"><h3>Тренировка</h3><p class="small muted">Решено верно: <b>${m.practice}</b>. ${m.practice >= need ? 'Можно переходить к проверке.' : `До проверки советуем решить ещё ${need - m.practice}.`}</p>
        <button class="btn ${m.practice >= need ? 'btn-primary' : 'btn-ghost'}" data-stage="check">Перейти к проверке</button></div>`}
      </div>
      ${t.legacy ? '' : `<div class="sheet"><h3>Наставник</h3>${chatBox(i, 'task')}</div>`}
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
  <p class="muted small" style="margin-top:12px">Темп: ${A.PACE[p].label.toLowerCase()} — ${A.PACE[p].say.charAt(0).toLowerCase() + A.PACE[p].say.slice(1)} Считается по последним 15 задачам: доля решённых с первой попытки без подсказок и время на задачу.</p>`;
}

/* ================= Настройки ================= */

function settings() {
  const s = state.settings;
  return head('Настройки', 'Как к тебе обращаться, как объяснять и как подключить ИИ-наставника.') + `
  <div class="layout settings">
    <div class="stack">
      <form class="sheet" id="settings-form">
        <h2>Ученик</h2>
        <label class="field">Имя ученика<input name="name" id="set-name" value="${esc(s.name)}" maxlength="30" required></label>
        <label class="field">Как объяснять<select name="style" id="set-style"><option value="steps"${s.style === 'steps' ? ' selected' : ''}>Коротко и по шагам</option><option value="visual"${s.style === 'visual' ? ' selected' : ''}>Через наглядные примеры</option></select></label>
        <button class="btn btn-primary" type="submit">Сохранить</button>
        <div class="feedback" id="feedback" role="status" aria-live="polite"></div>
      </form>
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
  document.querySelectorAll('nav button[data-page]').forEach(b => b.dataset.page === page ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  document.querySelector('#student-name').textContent = state.settings.name;
  document.querySelector('#avatar').textContent = (state.settings.name[0] || 'А').toUpperCase();
  app.innerHTML = ({ home, map: () => mapPage(filterState.map), diagnostic, library: () => library(filterState.library), teacher, settings, lesson: () => lessonPage(i, lessonStage) })[page]();
  bind(page, i, lessonStage);
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
  app.querySelectorAll('[data-lesson]').forEach(b => b.onclick = () => { session = null; if (b.dataset.tab) learnTab = b.dataset.tab; location.hash = 'lesson/' + b.dataset.lesson + (b.dataset.tab && !topics[+b.dataset.lesson].legacy ? '/learn' : ''); });
  app.querySelectorAll('[data-review]').forEach(b => b.onclick = () => { session = null; location.hash = `lesson/${b.dataset.review}/review`; });
  app.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { session = null; location.hash = `lesson/${i}/${b.dataset.stage}`; });
  app.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { filterState[page] = b.dataset.filter; render(); });
  app.querySelectorAll('[data-learn-tab]').forEach(b => b.onclick = () => { learnTab = b.dataset.learnTab; render(); });
  V.labBind(app);

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
      const value = readAnswer(form, e);
      if (s.answered) return;
      const r = check(value, s.task);
      if (r.empty || r.unreadable) { fb.className = 'feedback bad'; fb.innerHTML = r.msg; return; }
      markActivity();
      const m = meta(i), t = topics[i];
      if (r.mistake) m.errors[r.mistake] = (m.errors[r.mistake] || 0) + 1;

      if (s.mode === 'practice') {
        s.tries.push(value);
        const solved = r.ok && !r.almost;
        if (!solved) {
          if (r.mistake) s.lastMistake = r.mistake;
          m.errorsTotal++;
          const ev = t.legacy ? [] : A.afterAttempt(m, { solved: false, firstTry: false, hints: s.hints, sec: 0, mistake: r.mistake }, pace());
          fb.className = 'feedback bad';
          fb.innerHTML = feedbackFor(r, s.task, i) + eventsHtml(ev, i) + (t.legacy ? '' : ` <button class="link" id="ask-tutor">Разобрать с наставником</button>`);
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
        fb.className = 'feedback';
        fb.innerHTML = feedbackFor(r, s.task, i) + eventsHtml(ev, i) +
          (!t.legacy && A.fastTrack(m, pace()) ? `<p class="fast-track">Похоже, ты это уже знаешь. Можно сразу к проверке. <button class="btn btn-primary btn-sm" data-stage-now="check">К проверке</button></p>` : '') +
          ` <button class="link" id="next-task">Следующая задача</button>`;
        fb.querySelector('#next-task').onclick = () => { newPracticeTask(i); render(); app.querySelector('#answer')?.focus(); };
        bindEventButtons(fb, i);
        const st = app.querySelector('.streak .small b'); if (st) st.textContent = m.practice;
        save(); return;
      }
      // проверка и повторение: один ответ на задачу
      s.answered = true;
      const ok = r.ok && !r.almost;
      if (ok) s.right++; else if (r.mistake) s.found.push(r.mistake);
      fb.className = 'feedback' + (ok ? '' : ' bad');
      fb.innerHTML = ok ? '<b>Верно.</b>' : `<b>Неверно.</b> Решение: ${s.task.solution}`;
      fb.insertAdjacentHTML('beforeend', ` <button class="btn btn-primary btn-sm" id="next-task">${s.k + 1 < s.total ? 'Дальше' : 'Результат'}</button>`);
      form.querySelectorAll('input,button').forEach(el => el.disabled = true);
      fb.querySelector('#next-task').onclick = () => {
        s.k++; s.answered = false; s.task = topics[i].generate(2);
        if (s.k >= s.total) finishSession(i);
        render(); app.querySelector('#answer')?.focus();
      };
      fb.querySelector('#next-task').focus();
      save();
    };
    const hb = app.querySelector('#hint-btn');
    if (hb) hb.onclick = () => {
      app.querySelector('#hints').insertAdjacentHTML('beforeend', `<p class="bubble">${s.task.hints[s.hints++]}</p>`);
      if (s.hints >= s.task.hints.length) hb.disabled = true; else hb.textContent = 'Ещё подсказка';
    };
  }
  const retry = app.querySelector('#retry');
  if (retry) retry.onclick = () => { session = null; render(); };

  const dform = app.querySelector('#diag-form');
  if (dform) dform.onsubmit = e => {
    e.preventDefault();
    const value = readAnswer(dform, e), k = state.diag.step, ti = DIAG[k];
    const r = check(value, diagTask.task);
    if (r.empty) { app.querySelector('#feedback').textContent = 'Впиши ответ — или напиши 0, если не знаешь.'; return; }
    markActivity();
    const ok = r.ok && !r.almost, sec = Math.round((Date.now() - diagTask.started) / 1000);
    if (ok) setPct(ti, Math.max(pct(ti), 60));
    if (r.mistake) { const m = meta(ti); m.errors[r.mistake] = (m.errors[r.mistake] || 0) + 1; }
    state.attempts = [...state.attempts, { topic: topics[ti].id, firstTry: ok, hints: 0, sec, level: 2, diag: true }].slice(-60);
    state.diag.results[k] = ok; state.diag.step++; diagTask = null; save(); render();
  };
  const restart = app.querySelector('#diag-restart');
  if (restart) restart.onclick = () => { state.diag = { step: 0, results: [] }; save(); render(); };

  const sform = app.querySelector('#settings-form');
  if (sform) sform.onsubmit = e => {
    e.preventDefault();
    state.settings = { name: sform.name.value.trim() || 'Ученик', style: sform.style.value }; save();
    document.querySelector('#student-name').textContent = state.settings.name;
    document.querySelector('#avatar').textContent = state.settings.name[0].toUpperCase();
    app.querySelector('#feedback').textContent = 'Сохранено.';
  };
  const aform = app.querySelector('#ai-form');
  if (aform) bindAiForm(aform);
}

function eventsHtml(ev, i) {
  return ev.map(e => `<p class="adapt-note">${EVENT_TEXT[e.type](e, i)}${e.type === 'struggle' ? ' <button class="link" data-ask="1">Спросить наставника</button>' : ''}${e.type === 'same-mistake' ? ' <button class="link" data-stage-now="learn">Открыть урок</button>' : ''}</p>`).join('');
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

function finishSession(i) {
  const t = topics[i], s = session, m = meta(i);
  if (s.mode === 'check') {
    if (s.right >= t.check.passScore) {
      setPct(i, 100); m.mastered = true; m.masteredAt = today(); m.reviewStep = 0; m.reviewDue = addDays(today(), t.review.afterDays[0]); m.failedChecks = 0;
    } else m.failedChecks++;
  } else if (s.mode === 'review') {
    if (s.right === s.total) {
      m.reviewStep++;
      const days = t.review.afterDays;
      m.reviewDue = m.reviewStep < days.length ? addDays(m.masteredAt || today(), days[m.reviewStep]) : null;
      if (m.reviewDue && m.reviewDue <= today()) m.reviewDue = addDays(today(), 1);
      setPct(i, 100);
    } else { m.reviewDue = addDays(today(), 1); setPct(i, 85); }
  }
  save();
}

/* ================= Запуск ================= */

document.querySelectorAll('nav button[data-page]').forEach(b => b.onclick = () => location.hash = b.dataset.page);
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
  holo: 'family=Comfortaa:wght@500;700&family=Nunito:wght@400;600;700;800',
};
function setSkin(name) {
  if (!['notebook', 'orbit', 'pop', 'holo'].includes(name)) name = 'notebook';
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
