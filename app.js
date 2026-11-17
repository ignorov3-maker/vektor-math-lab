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

// Ф-10: в пилотной версии видны только 9 тем дробей; заглушки других разделов скрыты (?demo=all вернёт их)
const SHOW_LEGACY = /[?&]demo=all\b/.test(location.search);
const topics = [...window.VEKTOR_FRACTIONS.topics, ...(SHOW_LEGACY ? legacy : [])];
const byId = Object.fromEntries(topics.map((t, i) => [t.id, i]));
const SECTIONS = SHOW_LEGACY ? ['Дроби', 'Отношения', 'Геометрия'] : ['Дроби'];
const ROUTE = window.VEKTOR_FRACTIONS.topics.map((t, i) => i); // раздел «Дроби» — настоящая последовательность тем
const DIAG = ['concept', 'reduce', 'compare', 'add-same', 'mult', 'part-of'].map(id => byId[id]);
const DONE = 80;

const pages = { home: 'Мой путь', map: 'Все темы', diagnostic: 'Диагностика', library: 'Все темы', awards: 'Награды', teacher: 'Отчёт для учителя', settings: 'Профиль', lesson: 'Занятие', warmup: 'Разминка', intro: 'Знакомство', quick: 'Старт' };
const STAGES = [['learn', 'Узнать'], ['practice', 'Потренироваться'], ['check', 'Проверить себя']];

/* ================= Состояние ================= */

const KEY = 'vektor-progress-v3';
const fresh = () => ({
  progress: Object.fromEntries(topics.map(t => [t.id, t.start])),
  meta: {}, attempts: [], answers: 0, asked: 0, days: [], diag: { step: 0, results: [] },
  settings: { name: 'Ученик', style: 'steps' },
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
  if (state.settings.interests !== undefined && !Array.isArray(state.settings.interests)) delete state.settings.interests;
  if (![5, 6, 7, 8, 9].includes(state.settings.grade)) state.settings.grade = 5;
  if (!Array.isArray(state.diag.results) || !Number.isInteger(state.diag.step)) state.diag = d.diag;
  state.attempts = state.attempts.filter(a => a && typeof a === 'object');
  // Раньше у четырёх тем стоял демонстрационный прогресс: новый ученик видел «Начато», хотя ничего не решал.
  // Если по теме нет ни одной попытки, а процент ровно тот старый, — это не его прогресс.
  const DEMO_START = { concept: 25, reduce: 33, compare: 20, 'add-same': 33 };
  const idle = (id, m = state.meta[id]) => !(m && (m.tasks || m.practice || m.errorsTotal || m.mastered || m.failedChecks || m.cleanTotal)) && !state.attempts.some(a => a.topic === id);
  for (const [id, v] of Object.entries(DEMO_START)) if (state.progress[id] === v && idle(id)) state.progress[id] = 0;
})();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} if (window.VEKTOR_SYNC) window.VEKTOR_SYNC.push(state); };
// Ф-31: «Как тебе занятие?» — 5 смайликов, один раз за занятие, можно пропустить (только с сервером)
const MOODS = ['😣', '🙁', '😐', '🙂', '😄'];
const moodAsked = () => { try { return sessionStorage.getItem('vektor-mood') === today(); } catch { return true; } };
const moodBox = () => !window.VEKTOR_SYNC || moodAsked() ? '' : `<div class="mood" role="group" aria-label="Как тебе занятие?"><span>Как тебе занятие?</span>${MOODS.map((m, k) => `<button type="button" data-mood="${k + 1}" aria-label="${k + 1} из 5">${m}</button>`).join('')}</div>`;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-mood]'); if (!b) return;
  logEvent('feedback', { mood: +b.dataset.mood, topic: location.hash.split('/')[1] || null });
  try { sessionStorage.setItem('vektor-mood', today()); } catch {}
  b.closest('.mood').innerHTML = '<span>Спасибо!</span>';
});
// журнал событий для анализа пилота (раздел 7 ТЗ); без сервера ничего не делает
const logEvent = (type, data) => { if (window.VEKTOR_SYNC) window.VEKTOR_SYNC.event(type, data); window.VEKTOR_METRIKA?.goal(type, data); };
// Разбор жучка (Рентген мышления, шаги 1–4). Своя задача ребёнка — в виде структуры для движка.
function ownProblem(task, topic) {
  const X = window.VEKTOR_XRAY, expr = X && X.exprOf(task);
  const text = String(task.question || '').replace(/<span class="frac"><span>(\d+)<\/span><span>(\d+)<\/span><\/span>/g, '$1/$2').replace(/<[^>]+>/g, '');
  const p = { topic, expr, text: [task.story, text].filter(Boolean).join(' ').replace(/<[^>]+>/g, ''), answer: task.answer };
  if (['<', '>', '='].includes(task.answer)) p.sign = task.answer;
  else { const r = window.VEKTOR_RATIONAL.evalLine(String(task.answer)); if (r.ok) p.value = r.value; }
  return p;
}
function warmupPlan() {
  const W = window.VEKTOR_WARMUP, RV = window.VEKTOR_REVIEW; if (!W || !RV) return [];
  const done = topics.map((t, k) => k).filter(k => !topics[k].legacy && meta(k).mastered);
  return W.plan(RV.ensure(state), today(), { reviewTopic: done.length ? done[Math.floor(Math.random() * done.length)] : null });
}
function warmupPage() { return '<div class="page-head"><h1>Разминка</h1></div><div id="wu"></div>'; }
function runWarmup() {
  const el = app.querySelector('#wu'); if (!el) return;
  const items = warmupPlan();
  if (!items.length) { location.hash = 'home'; return; }
  window.VEKTOR_WARMUP.run(el, { items, bugs: window.VEKTOR_REVIEW.ensure(state), today: today(), lv: 2,
    reviewTask: k => topics[k].generate(2), check,
    onEvent: (type, data) => { logEvent(type, data); save(); },
    onStars: n => { game().stars += n; save(); hud(); },
    onReview: (key, p, back) => openReview(el, key, null, null, { own: p, onClose: back }),
    onDone: () => { state.warmupDay = today(); save(); location.hash = 'home'; } });
}
function openReview(host, key, s, i, extra = {}) {
  const RV = window.VEKTOR_REVIEW; if (!RV) return;
  RV.open(host, { bugKey: key, own: extra.own || ownProblem(s.task, topics[i].id), today: today(), bugs: RV.ensure(state), lv: i == null ? 2 : meta(i).level || 2,
    onEvent: (type, data) => { logEvent(type, data); save(); },
    onStars: n => { game().stars += n; save(); const h = document.querySelector('#hud-stars'); if (h) h.textContent = game().stars; },
    onClose: () => { save(); host.innerHTML = ''; if (extra.onClose) extra.onClose(); else app.querySelector('#ans-num')?.focus(); } });
  save(); host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
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
const reviewOpen = m => !!(m && m.mastered && m.reviewDue && m.reviewDue <= today());
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
    <div class="frac-input${mixed ? ' with-whole' : ''}" role="group" aria-label="Твой ответ — ${mixed ? 'смешанное число' : 'дробь'}">
      ${mixed ? '<label class="fi-whole"><input id="ans-whole" inputmode="numeric" autocomplete="off" aria-label="Целая часть"><span>целые</span></label>' : ''}
      <div class="fi-frac">
        <input id="ans-num" inputmode="numeric" autocomplete="off" aria-label="Числитель — верхнее число" placeholder="?"><span class="fi-lab" aria-hidden="true">числитель</span>
        <i aria-hidden="true"></i><span></span>
        <input id="ans-den" inputmode="numeric" autocomplete="off" aria-label="Знаменатель — нижнее число" placeholder="?"><span class="fi-lab" aria-hidden="true">знаменатель</span>
      </div>
    </div>
    <button class="btn btn-primary btn-big" type="submit">${button}</button>
  </div>
  ${mixed ? '<p class="fi-help small muted">Слева — целые, справа — дробная часть.</p>' : ''}`;
}

function taskCard(task, { formId = 'answer-form', button = 'Проверить', exam = false, hints = false } = {}) {
  return `<p class="story">${task.interest && window.VEKTOR_ART ? `<span class="story-ic" aria-hidden="true">${window.VEKTOR_ART.interest(task.interest, { size: 28 })}</span>` : ''}${task.story}</p>${exam && task.figureIsHint ? '' : figure(task.figure)}<p class="question" id="q">${task.question}</p>
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
}

/* ================= ИИ-наставник: чат ================= */

const chats = {}; // в памяти: «тема:вид» → переписка
let session = null; // текущая задача / проверка

function getChat(i, kind) {
  const key = `${topics[i].id}:${kind}`;
  if (!chats[key]) chats[key] = { msgs: [], beats: null, beat: -1, pending: null, done: false, busy: false, hint: 0, started: false };
  return chats[key];
}
// Сервер «Вектора» (вход по логину): ключи ИИ, имя и отчёты для взрослых ученику не показываем (П-04)
const SERVER = !!window.VEKTOR_SYNC;
let aiPaused = false; // П-03: ИИ на сервере выключен — до конца занятия идём по конспекту молча
const isOnline = () => !aiPaused && T.ready(ai);

function msgHtml(m, k, old) {
  return `<div class="msg ${m.role}${m.error ? ' error' : ''}${old === true ? ' is-old' : ''}">${m.role === 'assistant' ? '<span class="msg-who"><i class="bip-dot" aria-hidden="true"></i>Бипыч</span>' : ''}<div class="msg-body">${m.html}${m.lab ? V.labHtml(`lab-msg-${k}`) : ''}</div></div>`;
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
  const ph = kind === 'lesson' ? (c.pending ? 'Твой ответ, например 3/4' : 'Ответь или спроси Бипыча…') : 'Спроси, что непонятно…';
  const steps = kind === 'lesson' && c.beats && !online ? `<div class="lesson-progress"><span>Шаг ${Math.max(1, c.beat + 1)} из ${c.beats.length}</span>${bar(Math.round(Math.max(1, c.beat + 1) / c.beats.length * 100))}</div>` : '';
  // урок: Бипыч сам говорит — на виду его последняя реплика и ответ ученика, раньше сказанное спрятано в «Что было раньше»
  const vis = c.msgs.filter(m => !m.hidden), lastA = kind === 'lesson' ? vis.map(m => m.role).lastIndexOf('assistant') : -1;
  const older = lastA > 0 ? `<button type="button" class="bip-history" data-bip-history>Что было раньше</button>` : '';
  return `<div class="chat chat-${kind}" data-chat="${kind}">${steps}
    ${kind === 'lesson' ? '<div class="bip-stage" aria-hidden="true"><span class="bip-stage-pet"></span></div>' : ''}
    <div class="chat-log" aria-live="polite">${older}${vis.map((m, k) => msgHtml(m, k, k < lastA && !m.error)).join('') || (kind === 'task' ? '<p class="muted small chat-empty">Застрял? Спроси Бипыча — он не скажет ответ, но поможет дойти до него самому.</p>' : '')}</div>
    <div class="chat-quick">${quickReplies(i, kind).map(([v, l, main]) => `<button type="button" class="btn ${main ? 'btn-primary' : 'btn-ghost'} btn-sm" data-quick="${esc(v)}">${l}</button>`).join('')}</div>
    ${kind === 'lesson' && c.pending ? `<form class="chat-form chat-answer" autocomplete="off">${answerInput(c.pending.task, 'Проверить')}</form>` : `<form class="chat-form" autocomplete="off"><label class="visually-hidden" for="chat-in-${kind}">Сообщение наставнику</label>
      <input id="chat-in-${kind}" placeholder="${ph}" maxlength="400"${c.busy ? ' disabled' : ''}>${SPEECH ? `<button class="btn btn-ghost chat-mic" type="button" aria-label="Сказать голосом" title="Сказать голосом"${c.busy ? ' disabled' : ''}>${MIC_SVG}</button>` : ''}<button class="btn btn-primary" type="submit"${c.busy ? ' disabled' : ''}>Отправить</button></form>`}
    <p class="chat-mode small muted">${online && !c.forceOffline ? (SERVER ? 'Бипыч не скажет ответ — поможет дойти до него самому.' : `Наставник: ${esc(modelName())}.`) : online ? 'ИИ временно недоступен — урок идёт по конспекту.' : 'Бипыч без ИИ — отвечает по конспекту.'} ${online || SERVER ? '' : '<a href="#settings">Подключить ИИ</a>'}</p>
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
  if (kind === 'lesson') bipReact(i);
}

// Бипыч на сцене урока: говорит последнюю реплику, жест — по смыслу
let stagePet = null, stageSaid = -1;
function bipReact(i, first) {
  if (!stagePet) return;
  const c = getChat(i, 'lesson'), vis = c.msgs.filter(m => !m.hidden), k = vis.map(m => m.role).lastIndexOf('assistant');
  if (k < 0 || (k === stageSaid && !first)) return;
  stageSaid = k;
  const m = vis[k], text = String(m.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const ok = /^(Верно|Точно|Да!|Отлично|Молодец)/.test(text), oops = m.error || /^(Почти|Не совсем|Пока нет|Смотри)/.test(text);
  try {
    stagePet.setState(ok ? 'celebrate' : oops ? 'thinking' : c.pending ? 'thinking' : c.done ? 'proud' : 'happy');
    stagePet.talk(Math.min(5500, 600 + text.length * 32), first ? 'wave' : c.pending || /\?\s*$/.test(text) ? 'point' : ok ? null : 'nod');
  } catch {}
}

function updateLastMsg(i, kind, m) {
  const box = app.querySelector(`.chat[data-chat="${kind}"]`);
  if (!box || route().i !== i) return;
  const body = box.querySelectorAll('.msg-body'); const last = body[body.length - 1];
  if (last) last.innerHTML = m.html;
  const log = box.querySelector('.chat-log'); log.scrollTop = log.scrollHeight;
  if (kind === 'lesson' && stagePet) try { stagePet.talk(900); } catch {}
}

/* Голосовой ввод в чат: встроенное распознавание речи браузера (ru-RU), без платных моделей.
   Где браузер не умеет — кнопки микрофона нет, остаётся текст. Речь → текст в поле, ребёнок проверяет и отправляет. */
const SPEECH = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const MIC_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1A7 7 0 0 0 19 12z" fill="currentColor"/></svg>';
let listening = null;
function listen(inp, btn) {
  if (listening) { listening.stop(); return; }
  const r = new SPEECH(); r.lang = 'ru-RU'; r.interimResults = true; r.maxAlternatives = 1;
  const before = inp.value ? inp.value.trim() + ' ' : '';
  r.onresult = e => { inp.value = (before + [...e.results].map(x => x[0].transcript).join(' ')).slice(0, 400); };
  r.onend = r.onerror = () => { listening = null; btn.classList.remove('on'); btn.setAttribute('aria-label', 'Сказать голосом'); inp.focus(); };
  listening = r; btn.classList.add('on'); btn.setAttribute('aria-label', 'Остановить запись');
  try { r.start(); } catch { r.onend(); }
}

/* Интересы ребёнка (CL-9): 12 иконок, до трёх; сюжеты задач — из заранее написанного банка, числа — от движка */
/* ================= Маскот Бипыч, коллекция жучков, мастерская (CL-11, модули Codex) =================
   Модули ничего не хранят сами: данные и обработчики передаём отсюда. */
let pets = [], taskPet = null;
const petAge = () => (window.VEKTOR_TONE && window.VEKTOR_TONE.senior() ? 'senior' : 'junior');
const beatenCount = () => Object.values(window.VEKTOR_REVIEW ? window.VEKTOR_REVIEW.ensure(state) : {}).filter(b => b && b.status === 'beaten').length;
const bugRank = n => (n >= 12 ? 'master' : n >= 5 ? 'catcher' : n >= 1 ? 'tracker' : 'novice');
// особые вещи мастерской открываются достижениями учебного ядра
const unlocked = () => { const n = beatenCount(); return new Set([n >= 10 && 'ten-bugs', bugRank(n) === 'master' && 'bug-master', mastered() >= 3 && 'topic-master'].filter(Boolean)); };
function wardrobe() {
  const D = window.VEKTOR_DROBIK, w = state.workshop && typeof state.workshop === 'object' ? state.workshop : (state.workshop = {});
  if (!Array.isArray(w.owned)) w.owned = [];
  if (!w.equipped || typeof w.equipped !== 'object') w.equipped = {};
  if (D) {
    const got = unlocked();
    D.COSMETICS.forEach(c => { if (((!c.unlock && !c.price) || (c.unlock && got.has(c.unlock))) && !w.owned.includes(c.id)) w.owned.push(c.id); });
    if (!w.equipped.screen && w.owned.includes('screen-turquoise')) w.equipped.screen = 'screen-turquoise';
  }
  return w;
}
function petMount(el, opts = {}) {
  const D = window.VEKTOR_DROBIK; if (!D || !el) return null;
  try { const p = D.mount(el, { age: petAge(), cosmetics: wardrobe().equipped, ...opts }); pets.push(p); return p; } catch { return null; }
}
function petsClear() { pets.forEach(p => { try { p.destroy(); } catch {} }); pets = []; taskPet = null; }
const petState = s => { if (taskPet) try { taskPet.setState(s); } catch {} };
function collectionBugs() {
  const K = window.VEKTOR_BUGS, T = window.VEKTOR_TONE;
  return Object.entries(window.VEKTOR_REVIEW.ensure(state)).filter(([k]) => K.byKey[k]).map(([key, b]) => {
    const bug = K.byKey[key];
    return { key, kidName: T.name(bug), title: bug.title, status: b.status, found: b.found, beaten: b.beatenAt || null, howBeaten: bug.fixIdea };
  });
}
const dayCharge = () => { const g = game(), goal = Math.min(10, Math.max(3, g.goal)); return { done: Math.min(g.day === today() ? g.dayTasks : 0, goal), goal }; };
function mountPetsAndCollection(page, stage) {
  const g = game(), C = window.VEKTOR_COLLECTION;
  const home = app.querySelector('#pet-home');
  if (home) {
    const ch = dayCharge(), small = innerWidth < 760;
    const pet = petMount(home, { size: small ? 64 : 84, state: ch.done >= ch.goal ? 'celebrate' : 'happy', charge: ch, hideCharge: small });
    // Бипыч здоровается: текст печатается в облачке, рот двигается
    if (pet) {
      setTimeout(() => { try { pet.say(bipGreeting(currentSpot()), { type: true, gesture: 'wave' }); } catch {} }, 350);
      setTimeout(() => { if (route().page === 'home') try { pet.say(''); } catch {} }, 9000);
    }
  }
  const sp = app.querySelector('.chat-lesson .bip-stage-pet');
  stagePet = sp ? petMount(sp, { size: innerWidth <= 760 ? 96 : 110, state: 'happy', hideCharge: true }) : null;
  stageSaid = -1;
  if (stagePet && page === 'lesson') setTimeout(() => bipReact(route().i, true), 250);
  const lp = app.querySelector('#pet-lesson');
  if (lp) petMount(lp, { size: 56, state: 'idle', hideCharge: true });
  if (page === 'lesson' && stage === 'practice') {
    const at = app.querySelector('#answer-form') && app.querySelector('.story');
    if (at && !app.querySelector('.task-pet')) { const d = document.createElement('div'); d.className = 'task-pet'; d.setAttribute('aria-hidden', 'true'); at.before(d); taskPet = petMount(d, { size: 64, state: 'idle', charge: dayCharge() }); }
  }
  const cb = app.querySelector('#col-bugs'), cs = app.querySelector('#col-shop');
  if (C && cb) C.renderBugs(cb, { bugs: collectionBugs(), rank: bugRank(beatenCount()) });
  if (C && cs) {
    const shop = () => C.renderWorkshop(cs, { stars: g.stars, owned: wardrobe().owned.slice(), equipped: { ...wardrobe().equipped },
      onBuy: async id => {
        const it = window.VEKTOR_DROBIK.COSMETICS.find(c => c.id === id), w = wardrobe();
        if (!it || w.owned.includes(id)) return;
        if (it.unlock) throw new Error('Эта вещь открывается достижением.');
        if (it.price > g.stars) throw new Error('Не хватает звёзд.');
        g.stars -= it.price; w.owned.push(id); save(); hud(); shop();
      },
      onEquip: async (slot, id) => { const w = wardrobe(); if (!w.owned.includes(id)) throw new Error('Сначала получи эту вещь.'); w.equipped[slot] = id; save(); shop(); },
    });
    shop();
  }
}

function interestPicker(sel) {
  const S = window.VEKTOR_STORIES, A = window.VEKTOR_ART;
  return `<div class="interests" role="group" aria-label="Интересы">${S.INTERESTS.map(x => `<label class="int-chip"><input type="checkbox" name="interest" value="${x.id}"${sel.includes(x.id) ? ' checked' : ''}><span>${A ? A.interest(x.id, { size: 28 }) : ''}${x.name}</span></label>`).join('')}</div>`;
}
const pickedInterests = el => [...el.querySelectorAll('input[name=interest]:checked')].map(x => x.value).slice(0, 3);
function withInterests(task) { const S = window.VEKTOR_STORIES; return S && Array.isArray(state.settings.interests) ? S.apply(task, state.settings.interests) : task; }
function bindInterests(root) {
  root.querySelectorAll('.interests').forEach(g => g.addEventListener('change', e => {
    const on = g.querySelectorAll('input:checked'); if (on.length > 3) e.target.checked = false;
  }));
  const box = root.querySelector('.interests-ask'); if (!box) return;
  box.querySelector('[data-interests-save]').onclick = () => { state.settings.interests = pickedInterests(box); save(); render(); };
  box.querySelector('[data-interests-skip]').onclick = () => { state.settings.interests = []; save(); render(); };
}

function bindChat(i, kind) {
  const box = app.querySelector(`.chat[data-chat="${kind}"]`); if (!box) return;
  const cf = box.querySelector('.chat-form');
  if (cf.classList.contains('chat-answer')) {
    cf.onsubmit = e => {
      e.preventDefault();
      const got = readAnswer(cf, e);
      if (got.error || !got.value) { getChat(i, kind).msgs.push({ role: 'assistant', html: `<p>${got.error || 'Впиши ответ в клеточки.'}</p>` }); refreshChat(i, kind); return; }
      tutorSay(i, kind, got.value);
    };
    bindAnswerKeys();
    setTimeout(() => cf.querySelector('#ans-num')?.focus({ preventScroll: true }), 0);
  } else {
    cf.onsubmit = e => {
      e.preventDefault();
      const inp = cf.querySelector('input'), v = inp.value.trim(); if (!v) return;
      inp.value = ''; tutorSay(i, kind, v);
    };
    const mic = cf.querySelector('.chat-mic'); if (mic) mic.onclick = () => listen(cf.querySelector('input'), mic);
  }
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
  c.msgs.push({ role: 'user', html: T.render(String(text).replace(/\[\[|\]\]/g, '')).html, raw: text, hidden: /^дальше$/i.test(text) });
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
    pace: pace(), style: state.settings.style, // имя ученика в ИИ не передаём (Д-06)
  });
  const history = c.msgs.filter(m => m.raw).slice(-14).map(m => ({ role: m.role, content: m.raw }));
  const msg = { role: 'assistant', html: '<p class="typing">Бипыч думает…</p>', raw: null };
  c.msgs.push(msg); c.busy = true; refreshChat(i, kind);
  const call = () => T.stream(ai, [{ role: 'system', content: sys }, ...history], txt => {
    msg.html = T.render(txt, { streaming: true }).html || '<p class="typing">…</p>'; updateLastMsg(i, kind, msg);
  }, { maxTokens: kind === 'lesson' ? 700 : 550, topic: topics[i].id, onFinish: r => { c.truncated = r === 'length'; } });
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
    c.busy = false;
    const idx = c.msgs.indexOf(msg); if (idx >= 0) c.msgs.splice(idx, 1);
    if (/Я на сегодня выдохся/.test(e.message || '')) {
      c.forceOffline = true;
      c.msgs.push({ role: 'assistant', html: `<p>${esc(e.message)}</p>` });
      offlineFallback(i, kind); return;
    }
    if (e.quiet) { aiPaused = true; offlineFallback(i, kind); return; }
    c.forceOffline = true;
    if (SERVER) c.msgs.push({ role: 'assistant', error: true, html: `<p class="small">${/вопрос/.test(e.message || '') ? esc(e.message) : 'Бипыч сейчас не на связи — продолжаем по конспекту.'} <button type="button" class="link" data-retry-ai>Спросить ещё раз</button></p>` });
    else c.msgs.push({ role: 'assistant', error: true, html: `<p class="small"><b>ИИ сейчас не отвечает</b> — ${esc(e.message || 'нет связи')} Продолжаю по конспекту. <button type="button" class="link" data-retry-ai>Попробовать ИИ снова</button></p>` });
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
  { sel: '#path .node.is-current .node-btn, #path .node .node-btn', title: 'Твой путь', text: 'Ты здесь. Жми на кружок — и вперёд. Пройденные уровни станут зелёными, а под облаками ждут новые.' },
  { sel: '.bip-dock .pet-tap', title: 'Бипыч', text: 'Это Бипыч. Застрял — нажми на него и спроси. Ответ он не скажет, но подскажет, с чего начать.' },
  { sel: '.hud', title: 'Звёзды и огонёк', text: 'Звёзды — за решённые задачи. Огонёк — сколько дней подряд ты занимаешься.' },
  { sel: '.sidebar nav', title: 'Меню', text: () => (innerWidth <= 760 ? 'Внизу экрана — путь, все темы, награды и профиль.' : 'Слева — путь, все темы, награды и профиль.') },
];
/* Знакомство с интерфейсом. Подсказка сама меряет себя и встаёт туда, где не закрывает
   подсвеченное: снизу, сверху, сбоку, а если места нет — шторкой у противоположного края экрана.
   Пересчитывается при повороте экрана, изменении размера и прокрутке; Esc — пропустить. */
let tourCleanup = null;
function startTour(k = 0) {
  if (tourCleanup) { tourCleanup(); tourCleanup = null; }
  document.querySelectorAll('.tour-hole, .tour-tip').forEach(el => el.remove());
  if (k >= TOUR.length) { state.toured = true; save(); return; }
  const step = TOUR[k];
  const el = step.sel.split(',').map(q => [...document.querySelectorAll(q.trim())].find(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden')).find(Boolean);
  if (!el) return startTour(k + 1);
  const hole = document.createElement('div'); hole.className = 'tour-hole';
  const tip = document.createElement('div'); tip.className = 'tour-tip'; tip.setAttribute('role', 'dialog'); tip.setAttribute('aria-modal', 'true'); tip.setAttribute('aria-labelledby', 'tour-h');
  tip.innerHTML = `<p class="tour-count">${k + 1} из ${TOUR.length}</p><h3 id="tour-h">${step.title}</h3><p>${typeof step.text === 'function' ? step.text() : step.text}</p>
    <div class="row-actions"><button class="btn btn-primary" data-tour-next>${k + 1 < TOUR.length ? 'Дальше' : 'Понятно!'}</button><button class="btn btn-ghost" data-tour-skip>Пропустить</button></div>`;
  document.body.append(hole, tip);
  const fixedEl = getComputedStyle(el).position === 'fixed' || !!el.closest('.sidebar');
  if (!fixedEl) { const r0 = el.getBoundingClientRect(); if (r0.top < 72 || r0.bottom > innerHeight - 96) el.scrollIntoView({ block: 'center', behavior: 'instant' }); }
  let shifted = false;
  const place = () => {
    const W = innerWidth, H = innerHeight, gap = 14, m = 12, pad = 8;
    const r = el.getBoundingClientRect();
    // подсветка — только видимая часть элемента
    const hr = { l: Math.max(m / 2, r.left - pad), t: Math.max(m / 2, r.top - pad), r: Math.min(W - m / 2, r.right + pad), b: Math.min(H - m / 2, r.bottom + pad) };
    Object.assign(hole.style, { left: hr.l + 'px', top: hr.t + 'px', width: Math.max(0, hr.r - hr.l) + 'px', height: Math.max(0, hr.b - hr.t) + 'px' });
    const tw = Math.min(360, W - 2 * m); tip.style.width = tw + 'px'; tip.classList.remove('sheet-top', 'sheet-bottom');
    const th = tip.offsetHeight;
    const clampX = x => Math.max(m, Math.min(W - tw - m, x));
    const opts = [
      { ok: H - hr.b - gap >= th + m, x: clampX(hr.l), y: hr.b + gap },                      // снизу
      { ok: hr.t - gap >= th + m, x: clampX(hr.l), y: hr.t - gap - th },                      // сверху
      { ok: W - hr.r - gap >= tw + m, x: hr.r + gap, y: Math.max(m, Math.min(H - th - m, hr.t)) }, // справа
      { ok: hr.l - gap >= tw + m, x: hr.l - gap - tw, y: Math.max(m, Math.min(H - th - m, hr.t)) }, // слева
    ];
    const o = opts.find(x => x.ok);
    if (o) Object.assign(tip.style, { left: o.x + 'px', top: o.y + 'px', bottom: 'auto' });
    else { // места нет — шторка у края; высоту меряем у самой шторки (у неё своя ширина)
      tip.classList.add('sheet-bottom');
      Object.assign(tip.style, { width: '', left: '', top: 'auto', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' });
      const sh = tip.offsetHeight + 8 + gap;
      const fitsBottom = hr.b <= H - sh, fitsTop = hr.t >= sh;
      // обычный элемент один раз сдвигаем так, чтобы он оказался над шторкой
      if (!fitsBottom && !fitsTop && !fixedEl && !shifted) {
        shifted = true; const need = hr.b - (H - sh), y0 = scrollY;
        scrollBy({ top: need, behavior: 'instant' });
        if (scrollY !== y0) return place();
      }
      const topFree = fitsTop && !fitsBottom || (!fitsTop && !fitsBottom && hr.t > H - hr.b);
      if (topFree) { tip.classList.replace('sheet-bottom', 'sheet-top'); Object.assign(tip.style, { top: 'calc(env(safe-area-inset-top, 0px) + 8px)', bottom: 'auto' }); }
    }
  };
  let raf = 0; const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
  const onKey = e => { if (e.key === 'Escape') startTour(TOUR.length); };
  addEventListener('resize', onMove); addEventListener('scroll', onMove, true); addEventListener('keydown', onKey);
  if (window.visualViewport) visualViewport.addEventListener('resize', onMove);
  tourCleanup = () => { removeEventListener('resize', onMove); removeEventListener('scroll', onMove, true); removeEventListener('keydown', onKey); if (window.visualViewport) visualViewport.removeEventListener('resize', onMove); cancelAnimationFrame(raf); };
  place();
  tip.querySelector('[data-tour-next]').onclick = () => startTour(k + 1);
  tip.querySelector('[data-tour-skip]').onclick = () => startTour(TOUR.length);
  tip.querySelector('[data-tour-next]').focus({ preventScroll: true });
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

/* ================= Главная: карта уровней (mobile first) =================
   Экран — это сама карта: сверху вниз, как в играх. У текущего уровня стоит Бипыч и говорит
   одну короткую фразу; дальние уровни спрятаны под облаками и открываются по мере пути. */
const Q = () => window.VEKTOR_QUICK;
const quickDone = id => !!(state.quick && state.quick[id] && state.quick[id].done);
// новичок сначала проходит лёгкий старт; кто уже занимается дробями — старт открыт, но не обязателен
const fractionsStarted = () => state.attempts.length > 0 || ROUTE.some(i => pct(i) > 0 || meta(i).practice);
function currentSpot() {
  const q = Q(), pend = q && q.LEVELS.find(l => !quickDone(l.id));
  if (pend && !fractionsStarted()) return { kind: 'quick', id: pend.id };
  return { kind: 'topic', i: continueTarget().i };
}
function bipGreeting(cur) {
  const hour = new Date().getHours(), name = esc(state.settings.name || '');
  const hi = (hour < 12 ? 'Доброе утро' : hour < 18 ? 'Привет' : 'Добрый вечер') + (name && name !== 'Ученик' ? `, ${name}` : '') + '!';
  if (state.warmupDay !== today() && warmupPlan().length) return `${hi} Сначала проверим, не вернулись ли жучки — это две минуты.`;
  if (cur.kind === 'quick') { const l = Q().byId[cur.id]; return `${hi} ${l.say} Жми на кружок!`; }
  const t = topics[cur.i], ct = continueTarget(), why = ct.stage !== 'review' && nextStep().reason;
  if (why) return `${hi} ${why}`;
  return ct.stage === 'review' ? `${hi} Пора повторить «${t.short || t.title}».` : `${hi} Сегодня — «${t.short || t.title}». Жми на кружок!`;
}
function home() {
  const ct = continueTarget(), p = pace(), cur = currentSpot(), q = Q();
  const x = [0, 1, 2, 1, 0, -1, -2, -1, 0];
  // единая лента уровней: сначала лёгкий старт, потом дроби
  const seq = [...(q ? q.LEVELS.map(l => ({ kind: 'quick', id: l.id })) : []), ...ROUTE.map(i => ({ kind: 'topic', i }))];
  const curIdx = Math.max(0, seq.findIndex(n => n.kind === cur.kind && (n.kind === 'quick' ? n.id === cur.id : n.i === cur.i)));
  const FOG_FROM = curIdx + 3; // видно текущий и два следующих, дальше облака
  let k = 0, fogged = 0;
  const nodeHtml = (n, idx) => {
    const xx = x[idx % x.length];
    if (idx >= FOG_FROM) { fogged++; return fogged > 2 ? '' : `<li class="node is-fog" style="--x:${xx}" aria-hidden="true"><span class="node-btn fog-btn"><span class="node-face">?</span></span><span class="cloud cloud-a"></span><span class="cloud cloud-b"></span></li>`; }
    const isCur = idx === curIdx;
    if (n.kind === 'quick') {
      const l = q.byId[n.id], done = quickDone(n.id), st = done ? 'done' : isCur ? 'started' : 'todo';
      return `<li class="node is-${st}${isCur ? ' is-current' : ''} node-quick${xx > 0 ? ' left' : ''}" style="--x:${xx}">
        ${isCur ? `<a class="node-bubble" href="#quick/${n.id}">Начать</a>` : ''}
        <a class="node-btn" href="#quick/${n.id}" style="--p:${done ? 100 : 0}" aria-label="${l.title}: ${done ? 'пройдено' : isCur ? 'ты здесь' : 'можно открыть'}"><span class="node-face">${done ? '✓' : l.check ? G.icon('target', 28) : '★'}</span></a>
        <div class="node-label"><b>${l.short}</b></div></li>`;
    }
    const i = n.i, st = status(i), due = dueReviews().includes(i), steps = stepStates(i);
    const sub = st === 'done' ? (due ? 'Пора повторить' : 'Освоено') : isCur ? 'Ты здесь' : st === 'started' ? 'Начато' : '';
    return `<li class="node is-${st}${isCur ? ' is-current' : ''}${due ? ' is-due' : ''}${xx > 0 ? ' left' : ''}" style="--x:${xx}">
      ${isCur ? `<button class="node-bubble" data-continue>${ct.stage === 'review' ? 'Повторить' : steps.next === 'learn' && !meta(i).practice ? 'Начать' : 'Продолжить'}</button>` : ''}
      <button class="node-btn" data-lesson="${i}" style="--p:${pct(i)}" aria-label="${topics[i].title}${sub ? ': ' + sub : ''}">
        <span class="node-face">${st === 'done' && !due ? '✓' : due ? G.icon('repeat', 26) : ROUTE.indexOf(i) + 1}</span>
      </button>
      <div class="node-label"><b>${topics[i].short || topics[i].title}</b>${sub ? `<span>${sub}</span>` : ''}</div>
    </li>`;
  };
  const qn = q ? q.LEVELS.length : 0;
  const chapter = (title, sub) => `<li class="chapter"><b>${title}</b><span>${sub}</span></li>`;
  const startOpen = qn && (!fractionsStarted() || q.LEVELS.some(l => quickDone(l.id)));
  const items = [
    startOpen ? chapter('Старт', 'разминка для ума') : '',
    ...(startOpen ? seq.slice(0, qn).map((n, idx) => nodeHtml(n, idx)) : []),
    chapter('Обыкновенные дроби', `${ROUTE.filter(i => pct(i) >= DONE).length} из ${ROUTE.length} освоено`),
    ...seq.slice(qn).map((n, idx) => nodeHtml(n, idx + qn)),
  ].join('');
  const hidden = Math.max(0, seq.length - FOG_FROM - 2);
  return `${state.warmupDay !== today() && warmupPlan().length ? `<a class="strip strip-warmup" href="#warmup" data-warmup>${G.icon('repeat', 18)}<span><b>${window.VEKTOR_TONE.senior() ? 'Проверим разобранные ошибки' : 'Не вернулись ли жучки?'}</b> 2 минуты</span><span class="strip-go">Начать</span></a>` : ''}
  ${(state.settings.grade || 5) >= 7 ? `<a class="strip grade-note" href="#map"><span><b>Программа ${state.settings.grade} класса скоро появится.</b> Пока закрываем дыры в дробях.</span></a>` : ''}
  ${!Array.isArray(state.settings.interests) && window.VEKTOR_STORIES && state.answers > 0 ? `<section class="sheet interests-ask" aria-label="Интересы"><h2>Про что сделать задачи?</h2>${interestPicker([])}<div class="row-actions"><button class="btn btn-primary" data-interests-save>Готово</button><button class="btn btn-ghost" data-interests-skip>Пропустить</button></div></section>` : ''}
  <h1 class="visually-hidden">Мой путь</h1>
  <div class="layout home-layout">
    <section class="path-wrap" aria-label="Мой путь">
      <ol class="path" id="path"><svg class="path-line" aria-hidden="true"></svg>${items}
        ${hidden > 0 ? `<li class="fog-bank" aria-label="Ещё ${hidden} уровней скрыты"><span class="cloud cloud-a"></span><span class="cloud cloud-b"></span><span class="cloud cloud-c"></span><b>Ещё ${hidden} ${plural(hidden, 'уровень', 'уровня', 'уровней')} под облаками</b><span>Откроются, когда дойдёшь</span></li>` : `<li class="node node-finish" style="--x:0"><span class="finish-flag">${G.icon('flag', 30)}</span><div class="node-label"><b>Финиш</b><span>Покоритель дробей</span></div></li>`}
      </ol>
    </section>
    <div class="stack side">
      ${todayCard()}
      ${state.attempts.length >= 5 ? `<div class="sheet pace pace-${p}"><h3>Твой темп: ${A.PACE[p].label.toLowerCase()}</h3><p class="muted small">${A.PACE[p].say}</p></div>` : ''}
    </div>
  </div>
  <div class="bip-dock"><button class="pet-tap" data-bip-chat aria-label="Поговорить с Бипычем"><span id="pet-home"></span></button></div>`;
}

/* ================= Лёгкий старт: уровень с плитками =================
   Экран как в Duolingo: сверху крестик и полоска прогресса, в центре пример с пустой клеткой,
   снизу плитки. Плитку можно перетащить в клетку или просто нажать на неё. */
let quickRun = null;
const quickTask = (l, k) => Q().task(l, k);
const ymGoal = (name, params) => window.VEKTOR_METRIKA?.goal(name, params);
function quickPage() {
  const q = Q(), id = (location.hash.split('/')[1] || ''), l = q && q.byId[id];
  if (!l) return head('Старт', 'Такого уровня нет.') + '<a class="btn btn-primary" href="#home">К карте</a>';
  if (!quickRun || quickRun.id !== id) { quickRun = { id, k: 0, streak: 0, best: 0, misses: 0, task: quickTask(l, 0), done: false, msg: l.say, res: {} }; ymGoal(l.check ? 'check_start' : 'quick_start', { level: id }); }
  const r = quickRun, N = q.count(l);
  const bar = `<div class="qz-top"><a class="qz-close" href="#home" aria-label="Выйти на карту">✕</a><div class="qz-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${N}" aria-valuenow="${r.k}"><i style="width:${r.k / N * 100}%"></i></div><span class="qz-streak${r.streak >= 2 ? ' on' : ''}" title="Подряд без ошибок">${G.icon('flame', 18)}<b>${r.streak}</b></span></div>`;
  if (r.done && l.check) {
    const known = (state.quick[id] && state.quick[id].known) || [], next = q.LEVELS.find(x => !x.check && !quickDone(x.id));
    return `<section class="qz qz-done">${bar}
      <div class="qz-center"><div class="qz-pet" id="pet-quick"></div>
        <h1 class="qz-title">${next ? 'Проверка пройдена!' : 'Ты всё помнишь!'}</h1>
        <p class="qz-sub">${known.length ? `Уже знаешь: ${known.map(x => q.byId[x].short.toLowerCase()).join(', ')}. Эти уровни засчитаны.` : 'Начнём с самого простого — так быстрее разгонимся.'}</p></div>
      <div class="qz-foot">${next ? `<a class="btn btn-primary btn-big" href="#quick/${next.id}" data-quick-next>Начнём с: ${next.short}</a>` : `<a class="btn btn-primary btn-big" href="#home">Сразу к дробям</a>`}<a class="btn btn-ghost btn-big" href="#home">На карту</a></div></section>`;
  }
  if (r.done) {
    const next = q.LEVELS.find((x, j) => j > q.LEVELS.findIndex(y => y.id === id) && !quickDone(x.id));
    return `<section class="qz qz-done">${bar}
      <div class="qz-center"><div class="qz-pet" id="pet-quick"></div>
        <h1 class="qz-title">Уровень пройден!</h1>
        <p class="qz-sub">${r.misses ? `Ошибок: ${r.misses} — и все исправлены.` : 'Ни одной ошибки!'} Лучшая серия: ${r.best} подряд.</p></div>
      <div class="qz-foot">${next ? `<a class="btn btn-primary btn-big" href="#quick/${next.id}" data-quick-next>Дальше: ${next.short}</a>` : `<a class="btn btn-primary btn-big" href="#home">К дробям</a>`}<a class="btn btn-ghost btn-big" href="#home">На карту</a></div></section>`;
  }
  const t = r.task;
  const parts = t.parts.map(x => `<span>${esc(String(x))}</span>`).join('');
  return `<section class="qz">${bar}
    <div class="qz-center">
      <div class="qz-pet" id="pet-quick"></div>
      <div class="qz-q" aria-label="${esc(t.parts.join(' '))} ?">${parts}<span class="qz-slot" data-slot aria-label="Пустая клетка для ответа"></span></div>
    </div>
    <div class="qz-foot"><p class="qz-help small muted">Перетащи число в клетку или нажми на него</p>
      <div class="qz-tiles" role="group" aria-label="Варианты ответа">${t.tiles.map(v => `<button class="qz-tile" data-v="${v}">${v}</button>`).join('')}</div></div>
  </section>`;
}
function runQuick() {
  const host = app.querySelector('.qz'); if (!host || !quickRun) return;
  const q = Q(), l = q.byId[quickRun.id], r = quickRun;
  const pet = petMount(app.querySelector('#pet-quick'), { size: 76, hideCharge: true, state: r.done ? 'celebrate' : 'idle' });
  if (pet) setTimeout(() => { try { pet.say(r.done ? (l.check ? 'Теперь я знаю, с чего начать!' : 'Вот это скорость! Идём дальше?') : r.msg, { type: true, gesture: r.done ? null : r.k === 0 ? 'wave' : 'nod' }); } catch {} }, 150);
  const close = host.querySelector('.qz-close'); if (close) close.onclick = () => { if (!r.done) ymGoal('quick_exit', { level: r.id, k: r.k }); };
  if (r.done) return;
  const N = q.count(l);
  const finishLevel = () => {
    r.done = true; state.quick = state.quick || {};
    if (l.check) {
      // уровень засчитан, если все его задачи в проверке решены с первого раза
      const known = [...new Set(l.plan)].filter(x => r.res[x] && r.res[x].right && !r.res[x].wrong);
      known.forEach(x => { if (!quickDone(x)) state.quick[x] = { done: true, at: today(), via: 'check' }; });
      state.quick[r.id] = { done: true, at: today(), known };
      logEvent('quick_check', { level: r.id, known: known.length, misses: r.misses }); ymGoal('check_done', { known: known.length, misses: r.misses });
    } else {
      state.quick[r.id] = { done: true, at: today(), best: r.best };
      logEvent('quick', { level: r.id, misses: r.misses });
    }
    confetti(); sfx('win');
  };
  const nextTask = msg => { r.lock = false; r.missed = false; if (r.k >= N) finishLevel(); else { r.task = quickTask(l, r.k); r.msg = msg; } save(); render(); };
  const mark = ok => { const f = r.task.from; r.res[f] = r.res[f] || { right: 0, wrong: 0 }; r.res[f][ok ? 'right' : 'wrong']++; };
  const slot = host.querySelector('[data-slot]');
  const answer = (v, tile) => {
    if (r.lock) return;
    if (+v === r.task.answer) {
      r.lock = true; slot.textContent = v; slot.classList.add('ok'); tile && tile.classList.add('used');
      r.k++; r.streak++; r.best = Math.max(r.best, r.streak); state.answers = (state.answers || 0) + 1;
      celebrate(G.solved(game(), today(), { firstTry: !r.missed, hints: 0, wrongBefore: r.missed ? 1 : 0 }), { quiet: true });
      sfx('ok'); try { pet && pet.setState('happy'); } catch {}
      if (r.streak === 5) toast(`${G.icon('flame', 18)}<b>5 подряд!</b> Серия без ошибок`, 'toast-stars');
      if (l.check && !r.missed) mark(true);
      setTimeout(() => nextTask(['Точно!', 'Есть!', 'Верно!', 'Отлично!'][r.k % 4] + (l.check ? ' Дальше.' : ' Следующий.')), 650);
    } else if (l.check) {
      // в проверке не переспрашиваем: показываем верный ответ и идём дальше, без наказания
      r.lock = true; r.streak = 0; r.misses++; mark(false); ymGoal('quick_wrong', { level: r.id, from: r.task.from, k: r.k });
      slot.textContent = r.task.answer; slot.classList.add('miss'); tile && tile.classList.add('shake');
      try { pet && pet.setState('thinking'); pet && pet.say(`Не страшно — вот ответ. Потренируем в уровне «${q.byId[r.task.from].short}».`, { type: true }); } catch {}
      r.k++; setTimeout(() => nextTask('Следующий вопрос.'), 1700);
    } else {
      r.streak = 0; r.misses++; r.missed = true; sfx('wrong'); ymGoal('quick_wrong', { level: r.id, k: r.k });
      if (tile) { tile.classList.remove('shake'); void tile.offsetWidth; tile.classList.add('shake'); }
      try { pet && pet.setState('thinking'); pet && pet.say(r.task.hint, { type: true, gesture: 'point' }); } catch {}
      host.querySelector('.qz-streak b').textContent = 0; host.querySelector('.qz-streak').classList.remove('on');
    }
  };
  host.querySelectorAll('.qz-tile').forEach(tile => {
    tile.onclick = () => { if (!tile.dataset.dragged) answer(tile.dataset.v, tile); delete tile.dataset.dragged; };
    // перетаскивание пальцем или мышью: плитка едет за указателем, отпустили над клеткой — ответ
    tile.onpointerdown = e => {
      if (r.lock) return;
      const start = { x: e.clientX, y: e.clientY }; let ghost = null;
      const move = ev => {
        const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
        if (!ghost && Math.hypot(dx, dy) < 8) return;
        if (!ghost) { ghost = tile.cloneNode(true); ghost.classList.add('qz-ghost'); document.body.append(ghost); tile.classList.add('lifted'); }
        ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
        const sr = slot.getBoundingClientRect(); slot.classList.toggle('hover', ev.clientX > sr.left - 20 && ev.clientX < sr.right + 20 && ev.clientY > sr.top - 20 && ev.clientY < sr.bottom + 20);
      };
      const up = ev => {
        removeEventListener('pointermove', move); removeEventListener('pointerup', up);
        if (!ghost) return;
        tile.dataset.dragged = '1'; ghost.remove(); tile.classList.remove('lifted');
        const over = slot.classList.contains('hover'); slot.classList.remove('hover');
        if (over) answer(tile.dataset.v, tile);
      };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    };
  });
}

/* ================= Знакомство: поймай ошибку Бипыча =================
   Первая минута — не экскурсия и не анкета, а маленькая победа: ребёнок находит
   чужую ошибку, видит, как её ломает простой пример, и узнаёт, как работает Вектор. */
let introStep = 1, introPick = null, introMiss = false;
const INTRO_BUG = 'add-diff:add-denominators';
// Пицца: круг на n кусков, закрашенные группы — [сколько кусков, цвет]. Подписей внутри нет: их даёт текст рядом.
function introPizza(n, groups, label) {
  const R = 52, C = 60, pt = a => `${(C + R * Math.sin(a)).toFixed(1)} ${(C - R * Math.cos(a)).toFixed(1)}`;
  const step = 2 * Math.PI / n; let k = 0;
  const wedges = groups.flatMap(([cnt, col]) => Array.from({ length: cnt }, () => { const a = k++ * step;
    return `<path d="M${C} ${C} L${pt(a)} A${R} ${R} 0 0 1 ${pt(a + step)} Z" fill="${col}"/>`; })).join('');
  const cuts = Array.from({ length: n }, (_, m) => `<line x1="${C}" y1="${C}" x2="${pt(m * step).replace(' ', '" y2="')}" />`).join('');
  return `<svg class="intro-pizza" viewBox="0 0 120 120" role="img" aria-label="${label}"><circle cx="${C}" cy="${C}" r="${R + 4}" fill="#E9B872"/><circle cx="${C}" cy="${C}" r="${R}" fill="#FFF3D6"/>${wedges}<g stroke="#C98B3A" stroke-width="1.5">${cuts}</g><circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="#C98B3A" stroke-width="1.5"/></svg>`;
}
function introPage() {
  const senior = window.VEKTOR_TONE.senior(), F = V.f;
  const bug = window.VEKTOR_BUGS && window.VEKTOR_BUGS.byKey[INTRO_BUG];
  // пример всегда перед глазами; у каждой дроби свой цвет — те же цвета на пиццах
  const sum = (big) => `<div class="intro-board${big ? '' : ' intro-board-small'}" role="img" aria-label="Одна вторая плюс одна третья равно две пятых"><span class="ib-half">${F(1, 2)}</span><span>+</span><span class="ib-third">${F(1, 3)}</span><span>=</span><span class="ib-bip">${F(2, 5)}</span></div>`;
  const dots = `<ol class="intro-dots" aria-label="Шаг ${introStep} из 3">${[1, 2, 3].map(k => `<li class="${k < introStep ? 'is-done' : k === introStep ? 'is-now' : ''}"></li>`).join('')}</ol>`;
  const HALF = 'var(--intro-half)', THIRD = 'var(--intro-third)', BIP = 'var(--intro-bip)';
  let body;
  if (introStep === 1) body = `
      <h1 class="intro-title">${senior ? 'Проверь решение одноклассника' : 'Я съел половину пиццы, а потом ещё треть. Посчитал, сколько всего:'}</h1>
      ${senior ? '<p class="intro-text">Половина пиццы и ещё треть — сколько это вместе? Он посчитал так:</p>' : ''}
      ${sum(true)}
      <p class="intro-text">${senior ? 'Здесь всё верно?' : 'Верно я посчитал?'}</p>
      <div class="intro-actions"><button class="btn btn-primary btn-big" data-intro-pick="wrong">${senior ? 'Есть ошибка' : 'Тут ошибка'}</button><button class="btn btn-ghost btn-big" data-intro-pick="right">Всё верно</button></div>`;
  else if (introStep === 2) body = `
      ${sum(false)}
      <h1 class="intro-title">${introPick === 'wrong' ? (senior ? 'Верно, ошибка есть. Докажем на пицце.' : 'Зоркий глаз! Давай проверим на пицце.') : 'Давай проверим на пицце.'}</h1>
      <div class="intro-pizzas">
        <figure>${introPizza(6, [[3, HALF], [2, THIRD]], 'Пицца: закрашена половина и ещё треть — почти вся')}
          <figcaption><b>Сколько съели</b><span><i class="dot dot-half"></i>половина <i class="dot dot-third"></i>и ещё треть</span></figcaption></figure>
        <figure>${introPizza(5, [[2, BIP]], 'Пицца на пять кусков, закрашены два — меньше половины')}
          <figcaption><b>Что вышло у ${senior ? 'него' : 'Бипыча'}</b><span><i class="dot dot-bip"></i>2 куска из 5</span></figcaption></figure>
      </div>
      <p class="intro-text">${senior ? 'Слева съедено больше половины пиццы. А по его ответу — меньше половины.' : 'Слева видно: съели больше половины пиццы. А у меня вышло меньше половины!'} Может такое быть?</p>
      ${introMiss ? `<p class="intro-hint" role="status">Посмотри на левую пиццу: целая половина и ещё кусок. Это точно больше, чем ${F(2, 5)} на правой.</p>` : ''}
      <div class="intro-actions"><button class="btn btn-primary btn-big" data-intro-pick="never">Нет, съели больше</button><button class="btn btn-ghost btn-big" data-intro-pick="maybe">Может</button></div>`;
  else body = `
      <div class="intro-trophy">${window.VEKTOR_TONE.art(bug, { size: 88, status: 'beaten' })}</div>
      <h1 class="intro-title">${senior ? 'Ты нашёл неверное правило' : 'Ты поймал первого жучка!'}</h1>
      ${senior ? '' : `<p class="intro-text">Это ${esc(bug ? bug.kidName : 'Складыватель')} — он живёт у многих.</p>`}
      <div class="intro-why"><p><b>${senior ? 'Ошибка:' : 'Я ошибся:'}</b> сложил верх с верхом (1 + 1) и низ с низом (2 + 3). А половина и треть — куски разного размера.</p>
        <p><b>Верно:</b> режем пиццу на 6 кусков. Половина — 3 куска, треть — 2. Вместе ${F(5, 6)}.</p></div>
      <p class="intro-how-line"><span>Так работает Вектор:</span> <b>находим</b> неверное правило → <b>ломаем</b> примером → <b>проверяем через день</b></p>
      <div class="intro-actions"><button class="btn btn-primary btn-big" data-intro-go="quick/q-check">Поехали!</button><button class="btn btn-ghost btn-big" data-intro-go="home">Посмотреть карту</button></div>`;
  return `<section class="intro intro-step-${introStep}" aria-live="polite">
    <div class="intro-card">
      <div class="intro-top">${dots}${introStep < 3 ? '<button class="link small" data-intro-skip>Пропустить</button>' : ''}</div>
      ${senior || introStep !== 1 ? '' : '<div class="intro-pet" id="pet-intro" aria-hidden="true"></div>'}
      <div class="intro-body">${body}</div>
    </div>
  </section>`;
}
function runIntro() {
  const host = app.querySelector('.intro'); if (!host) return;
  const petEl = app.querySelector('#pet-intro');
  const pet = petEl ? petMount(petEl, { size: introStep === 3 ? 96 : 112, hideCharge: true, state: introStep === 1 ? 'confused' : introStep === 2 ? 'thinking' : 'celebrate' }) : null;
  const finish = to => { state.introDone = true; save(); ymGoal('intro_done', { to }); introStep = 1; introPick = null; introMiss = false; location.hash = to; };
  host.querySelectorAll('[data-intro-pick]').forEach(b => b.onclick = () => {
    const v = b.dataset.introPick;
    if (introStep === 1) { introPick = v; introStep = 2; logEvent('intro', { step: 1, pick: v }); render(); return; }
    if (v === 'maybe') { introMiss = true; sfx('wrong'); render(); return; }
    introStep = 3; sfx('win'); confetti(); logEvent('intro', { step: 2, miss: introMiss }); render();
  });
  host.querySelectorAll('[data-intro-go]').forEach(b => b.onclick = () => finish(b.dataset.introGo));
  const sk = host.querySelector('[data-intro-skip]'); if (sk) sk.onclick = () => { logEvent('intro', { skip: introStep }); finish('home'); };
  if (pet && introStep === 3) try { pet.setState('celebrate'); } catch {}
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
  const els = [...box.querySelectorAll('.node-btn, .finish-flag, .fog-bank')];
  const pts = els.map(el => { const r = el.getBoundingClientRect(); return [r.left - b.left + r.width / 2, r.top - b.top + (el.classList.contains('fog-bank') ? 24 : r.height / 2)]; });
  if (pts.length < 2) return;
  svg.setAttribute('width', b.width); svg.setAttribute('height', b.height);
  const lastDone = Math.max(0, els.findIndex(el => el.closest('.is-current'))); // до текущего уровня — сплошная
  const seg = (a, z) => pts.slice(a, z + 1).map((p, k) => `${k ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  svg.innerHTML = `<path class="todo" d="${seg(0, pts.length - 1)}"/>${lastDone > 0 ? `<path class="done" d="${seg(0, Math.min(lastDone, pts.length - 1))}"/>` : ''}`;
}

/* ================= Карта и материалы ================= */

const filters = cur => `<div class="filters" role="group" aria-label="Фильтр по разделам">${['Все', ...SECTIONS].map(s => `<button class="chip" data-filter="${s}" aria-pressed="${s === cur}">${s}</button>`).join('')}</div>`;

/* «Все темы» — вся программа 5–9 по классам. Готовое открывается, остальное помечено «скоро»
   и показывает, как Рентген мышления поймает ошибку в этом разделе: метод не только про дроби. */
let mapGrade = null;
function topicCards(ids) {
  const cur = continueTarget().i;
  return `<div class="topics">${ids.map(id => topics.findIndex(t => t.id === id)).filter(i => i >= 0).map(i => {
    const t = topics[i];
    const p = pct(i), done = p >= DONE;
    return `<article class="topic is-${status(i)}${i === cur ? ' is-current' : ''}">
      <button class="topic-row" data-lesson="${i}" aria-label="${t.title}: ${i === cur ? 'ты здесь' : statusText(i)}">
        <span class="topic-ring" style="--p:${p}">${done ? '✓' : ''}</span>
        <span class="topic-text"><b>${t.title}</b><small>${i === cur ? 'Ты здесь' : statusText(i)}</small></span>
        <span class="topic-go" aria-hidden="true">›</span>
      </button>
    </article>`; }).join('')}</div>`;
}
function mapPage() {
  const P = window.VEKTOR_PROGRAM;
  if (!P) return head('Все темы', '') + topicCards(topics.map(t => t.id));
  const gn = mapGrade || state.settings.grade || 5, g = P.grade(gn);
  const tabs = `<div class="segmented grade-tabs" role="tablist" aria-label="Класс">${P.GRADES.map(x => `<button role="tab" data-map-grade="${x.n}" aria-selected="${x.n === gn}" aria-pressed="${x.n === gn}" aria-label="${x.n} класс">${x.n}<span class="gt-s"> класс</span></button>`).join('')}</div>`;
  const body = g.strands.map(st => {
    const ready = st.topics.filter(t => t.ready), soon = st.topics.filter(t => !t.ready);
    const waves = [...new Set(soon.map(t => t.wave))], when = waves.length === 1 && P.WAVES[waves[0]] ? `появится ${P.WAVES[waves[0]]}` : '';
    return `<section class="section strand"><h2>${esc(st.name)}${!ready.length && when ? ` <small>${when}</small>` : ''}</h2>
      ${ready.map(t => `<h3 class="strand-sub">${esc(t.title)}</h3>${topicCards(t.ready)}`).join('')}
      ${soon.length ? `<ul class="soon-list">${soon.map(t => `<li><span>${esc(t.title)}</span>${ready.length || !when ? `<small>скоро${P.WAVES[t.wave] ? ', ' + P.WAVES[t.wave] : ''}</small>` : ''}</li>`).join('')}</ul>` : ''}
      ${st.bug ? `<div class="bug-sample"><p class="bs-label">Как Вектор поймает ошибку здесь</p><p class="bs-rule"><s>${esc(st.bug.rule)}</s></p><p class="bs-counter">${esc(st.bug.counter)}</p></div>` : ''}
    </section>`;
  }).join('');
  const lead = gn <= 6 ? '' : `Программа ${gn} класса в работе. Пока закрываем дыры из 5–6 класса.`;
  return head('Все темы', lead) + tabs + body;
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
  // Д-01: повторение только для освоенной темы, когда подошёл его день
  if (stage === 'review' && !reviewOpen(meta(i))) stage = meta(i).practice ? 'practice' : 'learn';
  const st = stepStates(i), need = A.need(pace()), m = meta(i);
  const sub = { learn: st.learn === 'done' ? 'Пройдено' : 'Картинки и правило', practice: st.practice === 'done' ? 'Готово' : `${Math.min(m.practice, need)} из ${need} задач`, check: st.check === 'done' ? 'Тема освоена' : 'Нужно 3 из 4' };
  // шаги темы — тонкая полоска из трёх частей вверху экрана, как в играх
  const steps = t.legacy || stage === 'review' ? '<div class="stepper stepper-empty"></div>' : `<ol class="stepper" aria-label="Шаги темы">${STAGES.map(([id, name], k) => `
    <li><button class="step is-${st[id]}${id === stage ? ' on' : ''}" data-stage="${id}"${id === stage ? ' aria-current="step"' : ''} title="${name}: ${sub[id]}">
      <i class="step-bar" aria-hidden="true"></i><span class="step-t"><b>${name}</b></span>
    </button></li>`).join('')}</ol>`;
  const req = (t.requires || []).map(id => byId[id]).filter(x => x != null && pct(x) < DONE);
  const reqHtml = req.length && stage === 'learn' ? `<p class="requires small">Пригодится тема ${req.map(r => `<button class="link" data-lesson="${r}">«${topics[r].title}»</button>`).join(' и ')} — её можно повторить в любой момент.</p>` : '';
  const body = stage === 'learn' ? learnStage(i) : stage === 'check' ? checkStage(i, 'check') : stage === 'review' ? checkStage(i, 'review') : practiceStage(i);
  const learnTabs = stage === 'learn' && !t.legacy ? `<div class="lb-tabs" role="group" aria-label="Как изучать">
      <button data-learn-tab="tutor" aria-pressed="${learnTab === 'tutor'}" aria-label="Урок с Бипычем" title="Урок с Бипычем">${G.icon('chat', 20)}</button>
      <button data-learn-tab="notes" aria-pressed="${learnTab === 'notes'}" aria-label="Конспект" title="Конспект">${G.icon('book', 20)}</button></div>` : '<span class="lb-tabs"></span>';
  return `<div class="lesson lesson-${stage}">
    <div class="lesson-bar"><button class="lb-close back" data-go="home" aria-label="Выйти на карту">✕</button>${steps}${learnTabs}</div>
    <h1 class="lesson-title">${t.title}</h1>
    ${reqHtml}${body}</div>
    ${stage === 'practice' && !t.legacy ? `<div class="bip-dock bip-dock-lesson"><button class="pet-tap" data-bip-open aria-label="Спросить Бипыча"><span id="pet-lesson"></span></button></div>` : ''}`;
}

function learnStage(i) {
  const t = topics[i], e = t.explain;
  const tabBtns = '';
  const side = `<aside class="stack side">
      <div class="sheet"><h3>Готов потренироваться?</h3><p class="muted small">Задачи каждый раз новые и подстраиваются под твой темп.</p><button class="btn btn-primary btn-big" data-stage="practice">Начать тренировку →</button></div>
      <details class="sheet lab-box" ${matchMedia('(min-width: 761px)').matches ? 'open' : ''}><summary><h3>Лаборатория дробей</h3><span class="muted small">Нажимай + и −, чтобы увидеть дробь</span></summary>${V.labHtml('lab-side', { n: 3, d: 5, k: 1 })}</details>
    </aside>`;
  if (learnTab === 'tutor') {
    return tabBtns + `<div class="layout"><section class="sheet tutor-lesson" aria-label="Урок с Бипычем">${chatBox(i, 'lesson')}</section>${side}</div>`;
  }
  return tabBtns + `<div class="layout">
    <article class="sheet method">
      <h2>Коротко</h2>
      <p>${e.model}</p>
      ${figure(e.figure)}<p class="figure-caption">${e.figureCaption}</p>
      <div class="rule"><h3>Правило</h3><div class="rule-body">${e.rule}</div></div>
      ${(() => { const open = matchMedia('(min-width: 761px)').matches ? ' open' : '';
        return `<details class="notes-more"${open}><summary>Примеры <span class="muted">· ${e.examples.length}</span></summary>
        ${e.examples.map(x => `<div class="worked"><p class="worked-q">${x.q}</p><ol>${x.steps.map(s => `<li>${s}</li>`).join('')}</ol></div>`).join('')}</details>
      <details class="notes-more"${open}><summary>Где чаще ошибаются</summary>
      <ul class="mistakes">${t.mistakes.map(m => `<li><b>${m.title}.</b> ${m.say}</li>`).join('')}</ul></details>`; })()}
      <p class="muted small notes-src">${window.VEKTOR_FRACTIONS.sources}</p>
      <div class="notes-go"><button class="btn btn-ghost btn-big" data-learn-tab="tutor">${G.icon('chat', 18)} Объясни, Бипыч</button><button class="btn btn-primary btn-big" data-stage="practice">Тренироваться</button></div>
    </article>${side}</div>`;
}

function newPracticeTask(i) {
  const m = meta(i), t = topics[i], p = pace();
  if (m.level == null && !t.legacy) m.level = A.startLevel(p);
  session = { i, mode: 'practice', task: withInterests(t.generate(t.legacy ? undefined : m.level)), hints: 0, answered: false, tries: [], started: Date.now(), lastMistake: null, autoHint: false };
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
      ${!t.legacy && ready ? `<div class="ready-strip" role="status"><span>${G.icon('star', 20)} Тренировка пройдена — пора проверить себя!</span><button class="btn btn-primary" data-stage="check">Проверить себя →</button></div>` : ''}
    </section>
    <aside class="stack side">
      ${t.legacy ? '' : `<div class="sheet streak ${ready ? 'ready' : ''}"><h3>${ready ? 'Можно проверять себя!' : 'Тренировка'}</h3>
        <p class="small muted">${ready ? 'Ты решил достаточно задач. Можешь потренироваться ещё или перейти к проверке.' : `Реши ещё ${need - m.practice} ${plural(need - m.practice, 'задачу', 'задачи', 'задач')} — потом проверка.`}</p>
        <button class="btn ${ready ? 'btn-primary' : 'btn-ghost'}" data-stage="check">Перейти к проверке</button></div>
      <div class="sheet bip-chat" id="bip-chat"><h3><i class="bip-dot" aria-hidden="true"></i>Спроси Бипыча<button class="bc-close" data-bip-close aria-label="Закрыть">✕</button></h3>${chatBox(i, 'task')}</div>`}
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
    <p class="muted small check-note">${title} · без подсказок</p>
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
      ${moodBox()}
      <div class="row-actions">${pass
        ? `${next != null ? `<button class="btn btn-primary" data-lesson="${next}">Дальше: ${topics[next].title}</button>` : ''}<button class="btn btn-ghost" data-go="home">К маршруту</button>`
        : `${advice ? `<button class="btn btn-primary" data-lesson="${weak[0]}">Повторить «${topics[weak[0]].title}»</button>` : ''}<button class="btn ${advice ? 'btn-ghost' : 'btn-primary'}" data-stage="learn">К уроку</button><button class="btn btn-ghost" id="retry">Ещё раз</button>`}</div>
    </section>`;
  }
  return `<section class="sheet result ${pass ? 'pass' : 'fail'}" style="max-width:760px">
    <h2>${pass ? 'Отлично, тема не забылась' : 'Стоит освежить'}</h2>
    <p>Верно ${s.right} из ${s.total}. ${pass ? (m.reviewDue ? `Следующее повторение — ${new Date(m.reviewDue + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}.` : 'Все три повторения пройдены — тема закреплена.') : 'Повторение вернётся завтра. Если хочешь, загляни в урок.'}</p>
    ${moodBox()}
    <div class="row-actions"><button class="btn btn-primary" data-go="home">К маршруту</button>${pass ? '' : '<button class="btn btn-ghost" data-stage="learn">К уроку</button>'}</div>
  </section>`;
}

/* ================= Диагностика ================= */

let diagTask = null;
function diagnostic() {
  const d = state.diag;
  if (d.step >= DIAG.length) {
    const right = d.results.filter(Boolean).length, weak = DIAG.map((i, k) => ({ i, k })).filter(x => !d.results[x.k]);
    const B = window.VEKTOR_BUGS, TN = window.VEKTOR_TONE, senior = TN.senior();
    const row = ({ i, k }) => {
      const key = Array.isArray(d.bugs) && d.bugs[k], bug = key && B && B.byKey[`${topics[i].id}:${key}`];
      return `<li class="diag-row">${bug ? `<span class="diag-art">${TN.art(bug, { size: 36 })}</span>` : `<span class="diag-art diag-num">${k + 1}</span>`}
        <div><b>${topics[i].title}</b><span class="muted small">${bug ? (senior ? esc(bug.title) : `Жучок «${esc(bug.kidName)}»: ${esc(bug.kidRule || bug.title.toLowerCase())}`) : 'Здесь стоит потренироваться'}</span></div>
        <button class="btn btn-ghost btn-sm" data-lesson="${i}">Разобрать</button></li>`;
    };
    return head(weak.length ? (senior ? 'Проверка пройдена' : 'Готово! Вот что мы нашли') : 'Отличный результат', `Верно ${right} из ${DIAG.length}. ${weak.length ? 'Начнём с того, где правило сбивает чаще всего.' : 'Все темы проверки тебе знакомы — двигаемся дальше по пути.'}`) + `<div class="sheet diag-result" style="max-width:640px">
      ${weak.length ? `<ol class="diag-list">${weak.map(row).join('')}</ol>` : ''}
      <div class="row-actions"><button class="btn btn-primary" data-go="home">К моему пути</button><button class="btn btn-ghost" id="diag-restart">Пройти ещё раз</button></div></div>`;
  }
  const i = DIAG[d.step];
  if (!diagTask || diagTask.i !== i) diagTask = { i, task: topics[i].generate(2), started: Date.now() };
  return head(window.VEKTOR_TONE.senior() ? 'Проверка' : 'Ищем твоих жучков', `${DIAG.length} коротких задач по разным темам, без подсказок. Ошибаться можно — так мы найдём, где правило сбивает, и подберём путь.`) + `
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
  const tab = awardsTab, TABS = [['rank', 'Звание'], ...(window.VEKTOR_COLLECTION ? [['bugs', 'Жучки'], ['shop', 'Гардероб']] : []), ['badges', 'Значки']];
  const show = id => tab === id ? '' : ' hidden';
  return `<div class="page-head"><h1>Награды</h1></div>
  <div class="segmented aw-tabs" role="tablist" aria-label="Разделы наград">${TABS.map(([id, name]) => `<button role="tab" data-aw-tab="${id}" aria-selected="${tab === id}" aria-pressed="${tab === id}">${name}</button>`).join('')}</div>
  <div class="layout">
    <div class="stack">
      <div class="aw-pane"${show('rank')}>
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
      <details class="sheet star-how"><summary>Как получить звёзды</summary><ul class="small star-rules">
        <li><b>+3</b> — задача с первой попытки без подсказок</li><li><b>+2</b> — с первой попытки, но с подсказкой</li>
        <li><b>+1</b> — решил после ошибок: упорство тоже считается</li><li><b>+2</b> — каждый верный ответ в проверке</li>
        <li><b>+10</b> — тема освоена</li><li><b>+5</b> — повторение без ошибок и выполненная цель дня</li></ul>
        <h3>Звания</h3><ol class="small ranks">${G.RANKS.map(r => `<li class="${r.name === rk.name ? 'on' : ''}">${r.name} <span class="muted">— от ${r.min} ★</span></li>`).join('')}</ol></details>
      </div>
      ${window.VEKTOR_COLLECTION ? `<section class="sheet aw-pane" aria-label="Мои жучки"${show('bugs')}><div id="col-bugs"></div></section>
      <section class="sheet aw-pane" aria-label="Мастерская"${show('shop')}><div id="col-shop"></div></section>` : ''}
      <section class="sheet aw-pane"${show('badges')}><h2>Достижения</h2>
        <div class="badges">${G.BADGES.map(b => { const on = g.earned.includes(b.id); return `<div class="badge-card${on ? ' on' : ''}">${G.icon(b.icon, 30)}<div><b>${b.title}</b><span>${b.desc}</span></div>${on ? '' : '<span class="visually-hidden">Ещё не получено</span>'}</div>`; }).join('')}</div>
      </section>
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
  if (SERVER) return settingsServer();
  return head('Профиль', 'Имя, цель дня, звуки и ИИ-наставник.') + `
  <div class="layout settings">
    <div class="stack">
      <form class="sheet" id="settings-form">
        <h2>Ученик</h2>
        ${window.VEKTOR_STORIES ? `<div class="field">Мои интересы <span class="muted small">(до 3)</span>${interestPicker(state.settings.interests || [])}</div>` : ''}
        <label class="field">Имя ученика<input name="name" id="set-name" value="${esc(s.name)}" maxlength="30" required></label>
        <label class="field">Класс<select name="grade" id="set-grade">${[5, 6, 7, 8, 9].map(n => `<option value="${n}"${s.grade === n ? ' selected' : ''}>${n} класс</option>`).join('')}</select></label>
        <label class="field">Цель дня<select name="goal" id="set-goal">${[3, 5, 10].map(n => `<option value="${n}"${game().goal === n ? ' selected' : ''}>${n} задач в день</option>`).join('')}</select></label>
        <label class="field">Как объяснять<select name="style" id="set-style"><option value="steps"${s.style === 'steps' ? ' selected' : ''}>Коротко и по шагам</option><option value="visual"${s.style === 'visual' ? ' selected' : ''}>Через наглядные примеры</option></select></label>
        <label class="switch"><input type="checkbox" name="sound" id="set-sound"${state.settings.sound === false ? '' : ' checked'}> Звуки при ответах</label>
        <button class="btn btn-primary" type="submit">Сохранить</button>
        <div class="feedback" id="feedback" role="status" aria-live="polite"></div>
      </form>
      ${skinPicker()}
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
        <label class="field" data-show="key">Ключ OpenRouter<input type="password" name="key" id="ai-key" value="${esc(ai.key)}" placeholder="Ключ из настроек OpenRouter" spellcheck="false"></label>
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

// П-07: стиль оформления выбирается только здесь, а не плавающей панелью поверх урока
const SKINS = [['notebook', 'Тетрадь'], ['orbit', 'Орбита'], ['pop', 'Стикеры'], ['pixel', 'Пиксель']];
const skinPicker = () => `<div class="sheet"><h2>Оформление</h2><div class="skin-pick" role="group" aria-label="Стиль оформления">${SKINS.map(([k, t]) => `<button type="button" class="btn btn-ghost" data-skin-pick="${k}" aria-pressed="${document.documentElement.dataset.skin === k}"><i class="skin-dot skin-dot-${k}" aria-hidden="true"></i>${t}</button>`).join('')}</div></div>`;

// Профиль ученика, вошедшего по логину (П-04): имя только для просмотра, без настроек ИИ и отчётов для взрослых
function settingsServer() {
  const s = state.settings;
  return head('Профиль', 'Цель дня, звуки и оформление.') + `
  <div class="layout settings">
    <div class="stack">
      <form class="sheet" id="settings-form">
        <h2 data-ym-private>${esc(s.name)}</h2>
        <p class="muted small">Так тебя видит учитель. Своё имя вписывать не нужно.</p>
        <label class="field">Класс<select name="grade" id="set-grade">${[5, 6, 7, 8, 9].map(n => `<option value="${n}"${s.grade === n ? ' selected' : ''}>${n} класс</option>`).join('')}</select></label>
        <label class="field">Цель дня<select name="goal" id="set-goal">${[3, 5, 10].map(n => `<option value="${n}"${game().goal === n ? ' selected' : ''}>${n} задач в день</option>`).join('')}</select></label>
        <label class="field">Как объяснять<select name="style" id="set-style"><option value="steps"${s.style === 'steps' ? ' selected' : ''}>Коротко и по шагам</option><option value="visual"${s.style === 'visual' ? ' selected' : ''}>Через наглядные примеры</option></select></label>
        <label class="switch"><input type="checkbox" name="sound" id="set-sound"${s.sound === false ? '' : ' checked'}> Звуки при ответах</label>
        <button class="btn btn-primary" type="submit">Сохранить</button>
        <div class="feedback" id="feedback" role="status" aria-live="polite"></div>
      </form>
      ${window.VEKTOR_PROFILE ? window.VEKTOR_PROFILE.html() : ''}
      ${skinPicker()}
    </div>
    <div class="stack side">
      <div class="sheet"><h2>Закончил занятие?</h2><p class="muted small">Выйди, чтобы следующий ученик не попал в твой аккаунт. Прогресс сохранится.</p>
        <button class="btn btn-primary" type="button" id="profile-logout">Выйти</button></div>
      <div class="sheet seen"><h2>Что видит родитель</h2><p class="muted small">Если дашь родителю код из «Моего аккаунта», он увидит только итог недели — то же, что здесь:</p>
        <ul class="seen-list"><li class="yes">в какие дни ты занимался</li><li class="yes">какие темы прошёл</li><li class="yes">какие ошибки нашлись и какие ты уже закрыл</li><li class="no">каждый твой ответ</li><li class="no">переписку с наставником</li></ul></div>
      <div class="sheet"><h2>Помощь</h2><p class="muted small">Короткая экскурсия по главному экрану.</p><button class="btn btn-ghost" id="tour-again">Показать подсказки снова</button></div>
    </div>
  </div>`;
}

/* ================= Роутинг ================= */

const filterState = { map: 'Все', library: 'Все' };
const route = () => { const [page, arg, stage] = (location.hash.slice(1) || 'home').split('/'); return { page: pages[page] && !(SERVER && page === 'teacher') ? page : 'home', i: Math.min(Math.max(+arg || 0, 0), topics.length - 1), stage }; };

let passwordOffered = false, bipChatFocus = false, ymLesson = '', awardsTab = 'rank';
// Первый вход: сначала знакомство «Поймай ошибку Бипыча», а не экскурсия и анкеты
const needsIntro = () => !state.introDone && !state.answers && !state.diag.step && !state.attempts.length;
function render() {
  if (route().page === 'home' && needsIntro() && !navigator.webdriver) { history.replaceState(null, '', '#intro'); }
  petsClear();
  if (window.VEKTOR_TONE) { window.VEKTOR_TONE.setGrade(state.settings.grade); document.body.classList.toggle('age-senior', window.VEKTOR_TONE.senior()); }
  const { page, i, stage } = route();
  document.body.classList.toggle('is-intro', page === 'intro' || page === 'quick');
  document.body.classList.toggle('is-focus', page === 'lesson');
  document.body.classList.remove('bip-open');
  document.body.dataset.page = page;
  const lessonStage = stage || (topics[i].legacy || meta(i).practice ? 'practice' : 'learn');
  document.querySelector('#crumb').textContent = page === 'lesson' ? topics[i].title : pages[page];
  const mt = document.querySelector('#m-title'); if (mt) mt.textContent = page === 'home' ? '' : pages[page];
  document.title = (page === 'home' ? '' : (page === 'lesson' ? topics[i].title : pages[page]) + ' — ') + 'Вектор';
  document.querySelectorAll('.sidebar [data-page]').forEach(b => (b.dataset.page === page || (page === 'library' && b.dataset.page === 'map')) ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  document.querySelector('#student-name').textContent = state.settings.name;
  { const sm = document.querySelector('.sidebar .profile small'); if (sm) sm.textContent = `Математика, ${state.settings.grade || 5} класс`; }
  document.querySelector('#avatar').textContent = (state.settings.name[0] || 'А').toUpperCase();
  app.innerHTML = ({ home, map: () => mapPage(filterState.map), diagnostic, library: () => library(filterState.library), awards, teacher, settings, lesson: () => lessonPage(i, lessonStage), warmup: warmupPage, intro: introPage, quick: quickPage })[page]();
  bind(page, i, lessonStage);
  if(page==='settings'&&SERVER&&window.VEKTOR_PROFILE)window.VEKTOR_PROFILE.mount();
  if(page==='home'&&SERVER&&window.VEKTOR_ASSIGNMENTS)window.VEKTOR_ASSIGNMENTS.mount(topics);
  bindInterests(app);
  mountPetsAndCollection(page, lessonStage);
  if (page === 'warmup') runWarmup();
  if (page === 'intro') runIntro();
  if (page === 'quick') runQuick();
  if (page === 'lesson') { const key = i + '/' + lessonStage; if (key !== ymLesson) { ymLesson = key; ymGoal('lesson_' + lessonStage, { topic: topics[i].id }); } } else ymLesson = '';
  app.querySelectorAll('[data-warmup]').forEach(b => b.onclick = () => { location.hash = 'warmup'; });
  app.querySelectorAll('[data-aw-tab]').forEach(b => b.onclick = () => { awardsTab = b.dataset.awTab; render(); });
  // Бипыч в уроке: на телефоне разговор выезжает снизу, на компьютере он и так рядом с задачей
  const openBip = () => { const c = app.querySelector('#bip-chat'); if (!c) return; ymGoal('bip_tap', { kind: 'lesson' });
    if (innerWidth <= 760) document.body.classList.add('bip-open'); else c.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => c.querySelector('input, textarea')?.focus({ preventScroll: true }), 250); };
  app.querySelectorAll('[data-bip-open]').forEach(b => b.onclick = openBip);
  app.querySelectorAll('[data-bip-close]').forEach(b => b.onclick = () => document.body.classList.remove('bip-open'));
  app.querySelectorAll('[data-bip-chat]').forEach(b => b.onclick = () => {
    const cur = currentSpot(); ymGoal('bip_tap', { kind: cur.kind });
    if (cur.kind === 'quick') { location.hash = 'quick/' + cur.id; return; }
    bipChatFocus = true; session = null; location.hash = `lesson/${cur.i}/practice`;
  });
  // на телефоне карта сразу показывает текущий уровень (после сброса прокрутки при смене экрана)
  if (page === 'home' && innerWidth <= 760) requestAnimationFrame(() => { const cur = app.querySelector('#path .is-current'); if (cur) { const r = cur.getBoundingClientRect(); if (r.bottom > innerHeight * .62) scrollTo({ top: scrollY + r.top - innerHeight * .3, behavior: 'instant' }); } });
  if (bipChatFocus && app.querySelector('#bip-chat')) { bipChatFocus = false; setTimeout(openBip, 300); }
  hud();
  if (page === 'home' && state.toured === false && !navigator.webdriver) setTimeout(() => route().page === 'home' && startTour(0), 600);
  // Предложить свой пароль — когда ребёнок уже позанимался, а не в первую минуту
  if (page === 'home' && SERVER && state.answers >= 3 && !passwordOffered && window.VEKTOR_PROFILE) { passwordOffered = true; window.VEKTOR_PROFILE.offer(); }
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
  app.querySelectorAll('[data-map-grade]').forEach(b => b.onclick = () => { mapGrade = +b.dataset.mapGrade; render(); });
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
      logEvent('attempt', { topic: topics[i].id, mode: s.mode, level: s.mode === 'practice' ? meta(i).level : null, question: String(s.task.question || '').replace(/<[^>]+>/g, '').slice(0, 200),
        answer: String(value).slice(0, 40), ok: !!(r.ok && !r.almost), try: (s.tries ? s.tries.length : 0) + 1, hints: s.hints || 0, mistake: r.mistake || null, sec: Math.round((Date.now() - (s.started || Date.now())) / 1000) });
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
          const X = window.VEKTOR_XRAY, xrayExpr = X && !t.legacy ? X.exprOf(s.task) : null;
          petState('thinking');
          // Известная ошибка → одна главная кнопка: сразу к разбору правила, без черновика.
          // Черновик «как считал» остаётся ссылкой — и главным путём для незнакомых ошибок.
          const rk = !t.legacy && r.mistake && window.VEKTOR_BUGS && window.VEKTOR_BUGS.byKey[`${t.id}:${r.mistake}`];
          const senior = window.VEKTOR_TONE.senior();
          const fbTitle = rk ? (senior ? 'Здесь сработало неверное правило' : 'Похоже, тут жучок') : 'Пока не так — попробуй ещё раз';
          const primary = rk ? `<button class="btn btn-primary btn-big" id="catch-open">${window.VEKTOR_TONE.t('catchBtn')}</button>`
            : xrayExpr ? `<button class="btn btn-primary btn-big" id="xray-open">${window.VEKTOR_TONE.t('catchBtn')}</button>`
            : '<button class="btn btn-primary" id="try-again">Исправить ответ</button>';
          const links = [rk || xrayExpr ? '<button class="link" id="try-again">Исправить ответ</button>' : '',
            rk && xrayExpr ? '<button class="link" id="xray-open">Записать, как считал</button>' : '',
            s.hints < s.task.hints.length ? '<button class="link" id="fb-hint">Подсказка</button>' : '',
            t.legacy ? '' : '<button class="link" id="ask-tutor">Спросить наставника</button>'].filter(Boolean).join('');
          fb.className = 'feedback bad big' + (rk ? ' fb-bug' : '');
          fb.innerHTML = `<p class="fb-title">${rk ? window.VEKTOR_TONE.art(rk, { size: 30 }) : G.icon('repeat', 22)} ${fbTitle}</p><p>${rk && mistakeOf(i, r.mistake) ? `<b>${mistakeOf(i, r.mistake).title}.</b> ${mistakeOf(i, r.mistake).say}` : feedbackFor(r, s.task, i)}</p>` + eventsHtml(ev, i) +
            `<div class="fb-actions">${primary}</div><div class="fb-links">${links}</div>`;
          fb.querySelector('#try-again').onclick = () => { const inp = app.querySelector('#ans-num'); if (inp) { inp.focus(); inp.select(); } };
          const fh = fb.querySelector('#fb-hint'); if (fh) fh.onclick = () => app.querySelector('#hint-btn')?.click();
          sfx('wrong');
          const ask = fb.querySelector('#ask-tutor');
          if (ask) ask.onclick = () => { tutorSay(i, 'task', `Я ответил «${value}», но не получилось. Помоги понять, где ошибка.`); app.querySelector('.chat-task')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
          bindEventButtons(fb, i);
          const co = fb.querySelector('#catch-open');
          if (co) co.onclick = () => {
            let host = app.querySelector('#xray-host'); if (!host) { host = document.createElement('div'); host.id = 'xray-host'; fb.after(host); }
            if (!(s.xray && s.xray.key === rk.key)) { s.xray = { key: rk.key, level: 1, step: null }; logEvent('bug_found', { bug: rk.key, topic: t.id, level: 1, step: null }); }
            petState('catching'); co.disabled = true;
            openReview(host, rk.key, s, i);
            host.scrollIntoView({ behavior: 'smooth', block: 'start' });
          };
          const xo = fb.querySelector('#xray-open');
          if (xo) xo.onclick = () => {
            let host = app.querySelector('#xray-host');
            if (!host) { host = document.createElement('div'); host.id = 'xray-host'; fb.after(host); }
            xo.disabled = true;
            X.openDraft(host, { topic: t.id, expr: xrayExpr, mistakeId: r.mistake, prefill: value,
              onResult: (a, lines) => {
                logEvent('draft', { topic: t.id, lines: lines.length - 1, ok: a.stepsOk, step: a.errorAt });
                if (a.ai && a.ai.bug === 'other') logEvent('bug_other', { topic: t.id, note: a.ai.note || '', lines: lines.slice(0, 5).map(x => String(x).slice(0, 60)) });
                if (a.bug && !(s.xray && s.xray.key === a.bug.key)) {
                  s.xray = { key: a.bug.key, level: a.level, step: a.errorAt };
                  logEvent('bug_found', { bug: a.bug.key, topic: t.id, level: a.level, step: a.errorAt });
                }
                if (a.bug) petState('catching');
                if (a.bug) {
                  const res = host.querySelector('.xr-result');
                  res.insertAdjacentHTML('beforeend', `<button type="button" class="btn btn-primary" id="review-open">${window.VEKTOR_TONE.t('reviewBtn')}</button>`);
                  res.querySelector('#review-open').onclick = () => openReview(host, a.bug.key, s, i);
                }
              },
              onSkip: () => { xo.disabled = false; } });
            host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          };
          fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); // на телефоне отклик сразу на виду
          save(); return;
        }
        s.answered = true; m.practice++; petState('happy'); if (taskPet) try { taskPet.setCharge(Math.min(dayCharge().done + 1, dayCharge().goal), dayCharge().goal); } catch {}
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
        const tc = t.check || { count: 4, passScore: 3 }, extra = !t.legacy && m.practice >= need + 3;
        fb.innerHTML = `<p class="fb-title">${G.icon('star', 22)} Верно!</p><p>${feedbackFor(r, s.task, i).replace(/^<b>Верно!<\/b>\s*/, '')}</p>` + eventsHtml(ev, i) +
          (!t.legacy && A.fastTrack(m, pace()) ? `<p class="fast-track">Похоже, ты это уже знаешь — можно сразу к проверке.</p>` : '') +
          (justReady ? `<div class="milestone"><p class="ms-title">${G.icon('star', 24)} Тренировка пройдена: ${need} из ${need}!</p><p>Дальше — проверка: ${tc.count} ${plural(tc.count, 'задача', 'задачи', 'задач')} без подсказок, нужно ${tc.passScore} верных. Получится — откроется следующая тема.</p></div>` : '') +
          (extra ? `<p class="fast-track">Ты решил уже ${m.practice} ${plural(m.practice, 'задачу', 'задачи', 'задач')} — этого точно хватит. Переходи к проверке!</p>` : '') +
          (!t.legacy && m.practice >= need
            ? `<div class="fb-actions"><button class="btn btn-primary btn-big" data-stage-now="check">Проверить себя →</button><button class="btn btn-ghost" id="next-task">Ещё задачу</button></div>`
            : `<div class="fb-actions"><button class="btn btn-primary btn-big" id="next-task">Следующая задача →</button>${!t.legacy && A.fastTrack(m, pace()) ? '<button class="btn btn-ghost" data-stage-now="check">К проверке</button>' : ''}</div>`);
        form.querySelectorAll('input,button').forEach(el => el.disabled = true);
        fb.querySelector('#next-task').onclick = () => { newPracticeTask(i); render(); app.querySelector('#ans-num')?.focus(); };
        (fb.querySelector('.fb-actions .btn-primary') || fb.querySelector('#next-task')).focus({ preventScroll: true });
        fb.querySelector('.fb-actions')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        sfx('ok');
        bindEventButtons(fb, i);
        save(); celebrate(G.solved(game(), today(), { firstTry, hints, wrongBefore: s.tries.length - 1 })); return;
      }
      // проверка и повторение: один ответ на задачу
      s.answered = true;
      const ok = r.ok && !r.almost;
      if (ok) s.right++; else if (r.mistake) s.found.push(r.mistake);
      if (s.mode === 'check' && !meta(i).mastered) { const ce = G.checkAnswer(game(), today(), ok); // Д-02: звёзды за проверку — один раз на тему
        s.stars = (s.stars || 0) + ce.reduce((a, e) => a + e.n, 0); celebrate(ce, { quiet: true }); }
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
    state.diag.results[k] = ok; if (!Array.isArray(state.diag.bugs)) state.diag.bugs = []; state.diag.bugs[k] = ok ? null : (r.mistake || null); state.diag.step++; diagTask = null; save(); render();
    if (state.diag.step >= DIAG.length) celebrate(G.diag(game(), today()));
  };
  if (dform) bindAnswerKeys();
  const restart = app.querySelector('#diag-restart');
  if (restart) restart.onclick = () => { state.diag = { step: 0, results: [] }; save(); render(); };

  const sform = app.querySelector('#settings-form');
  if (sform) sform.onsubmit = e => {
    e.preventDefault();
    const nm = sform.querySelector('#set-name');
    state.settings = { ...state.settings, name: nm ? nm.value.trim() || 'Ученик' : state.settings.name, style: sform.style.value, sound: sform.sound.checked, grade: +sform.grade.value || 5, interests: pickedInterests(sform) }; game().goal = +sform.goal.value || 5; save();
    document.querySelector('#student-name').textContent = state.settings.name;
    document.querySelector('#avatar').textContent = state.settings.name[0].toUpperCase();
    app.querySelector('#feedback').textContent = 'Сохранено.';
  };
  app.querySelectorAll('[data-skin-pick]').forEach(b => b.onclick = () => { setSkin(b.dataset.skinPick); app.querySelectorAll('[data-skin-pick]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  const plo = app.querySelector('#profile-logout'); if (plo) plo.onclick = () => window.VEKTOR_ACCOUNT && window.VEKTOR_ACCOUNT.logout();
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
  logEvent(s.mode === 'check' ? 'check_result' : 'review_result', { topic: t.id, right: s.right, total: s.total, passed: s.mode === 'check' ? s.right >= t.check.passScore : s.right === s.total });
  if (s.mode === 'check') {
    if (s.right >= t.check.passScore) {
      const already = m.mastered;
      setPct(i, 100); m.failedChecks = 0;
      if (!already) { ymGoal('mastered', { topic: t.id }); m.mastered = true; m.masteredAt = today(); m.reviewStep = 0; m.reviewDue = addDays(today(), t.review.afterDays[0]); }
      if (!already) logEvent('mastery', { topic: t.id });
      if (!already) gameEvents = G.mastered(game(), ROUTE.filter(r => pct(r) >= DONE).length); // Д-02
    } else m.failedChecks++;
    if (s.stars) (gameEvents ||= []).unshift({ type: 'stars', n: s.stars, why: 'за проверку' });
  } else if (s.mode === 'review' && m.mastered) {
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
app.addEventListener('click', e => { const h = e.target.closest('[data-bip-history]'); if (h) h.closest('.chat')?.classList.toggle('show-old'); });

// ---------- Скины ----------
function setSkin(name) {
  if (!['notebook', 'orbit', 'pop', 'pixel'].includes(name)) name = 'notebook';
  document.documentElement.dataset.skin = name;
  // Шрифты со сторонних серверов не грузим (Д-07): IP детей не должны уходить в Google.
  document.querySelectorAll('.skin-switch button').forEach(b => b.setAttribute('aria-pressed', b.dataset.skin === name));
  try { localStorage.setItem('vektor-skin', name); } catch {}
  requestAnimationFrame(drawRoute);
}
document.querySelectorAll('.skin-switch button').forEach(b => b.onclick = () => setSkin(b.dataset.skin));
let savedSkin; try { savedSkin = localStorage.getItem('vektor-skin'); } catch {}
setSkin(savedSkin || 'notebook');

let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawRoute, 100); });
render();
