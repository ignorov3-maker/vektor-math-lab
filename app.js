'use strict';

/* ================= Данные ================= */

const { check } = window.VEKTOR_CHECK;
const f = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

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
const STAGES = [['learn', 'Разбор'], ['practice', 'Тренировка'], ['check', 'Проверка']];

/* ================= Состояние ================= */

const KEY = 'vektor-progress-v3';
const fresh = () => ({
  progress: Object.fromEntries(topics.map(t => [t.id, t.start])),
  meta: {}, answers: 0, days: [], diag: { step: 0, results: [] },
  settings: { name: 'Александр', style: 'steps' },
});
let state;
try { state = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY))); } catch { state = fresh(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const meta = i => (state.meta[topics[i].id] ||= { practice: 0, streak: 0, mastered: false, masteredAt: null, reviewStep: 0, reviewDue: null, errors: {} });
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

function markActivity() {
  state.answers++;
  if (!state.days.includes(today())) state.days = [...state.days, today()].slice(-60);
}

/* ================= Рисунки к задачам ================= */

function figure(fig) {
  if (!fig) return '';
  const W = 300;
  const barSvg = (parts, shaded, { split = null, crossed = 0, y = 0, h = 44, label = null } = {}) => {
    const w = W / parts;
    let s = '';
    for (let k = 0; k < parts; k++) {
      const cls = k < shaded ? (split != null && k >= split ? 'fig-on2' : 'fig-on') : (k >= parts - crossed ? 'fig-x' : 'fig-off');
      s += `<rect class="${cls}" x="${k * w + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="3"/>`;
    }
    if (crossed) for (let k = parts - crossed; k < parts; k++) s += `<path class="fig-cross" d="M${k * w + 6} ${y + 6}L${(k + 1) * w - 6} ${y + h - 6}"/>`;
    if (label) s += `<text class="fig-label" x="${W / 2}" y="${y - 8}" text-anchor="middle">${label}</text>`;
    return s;
  };
  let svg, h, label;
  if (fig.type === 'circle') {
    const r = 80, c = 90;
    svg = Array.from({ length: fig.parts }, (_, k) => {
      const a1 = (k / fig.parts) * 2 * Math.PI - Math.PI / 2, a2 = ((k + 1) / fig.parts) * 2 * Math.PI - Math.PI / 2;
      const p = a => `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`;
      return `<path class="slice${k < fig.empty ? ' eaten' : ''}" d="M${c},${c} L${p(a1)} A${r},${r} 0 0 1 ${p(a2)} Z"/>`;
    }).join('');
    return `<div class="figure"><svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Круг из ${fig.parts} частей, ${fig.empty} пустые">${svg}</svg></div>`;
  }
  if (fig.type === 'bar') { h = fig.label ? 70 : 46; svg = barSvg(fig.parts, fig.shaded, { split: fig.split, crossed: fig.crossed, y: fig.label ? 24 : 0, label: fig.label }); label = `Полоска из ${fig.parts} частей, закрашено ${fig.shaded}`; }
  if (fig.type === 'pair') { h = 108; svg = barSvg(fig.a[1], fig.a[0]) + barSvg(fig.b[1], fig.b[0], { y: 60 }); label = `Две полоски: ${fig.a[0]} из ${fig.a[1]} и ${fig.b[0]} из ${fig.b[1]}`; }
  if (fig.type === 'mixed') {
    const r = 34, gap = 16, cnt = fig.whole + 1;
    svg = Array.from({ length: cnt }, (_, j) => {
      const cx = r + 4 + j * (2 * r + gap), cy = r + 4, on = j < fig.whole ? fig.d : fig.n;
      return Array.from({ length: fig.d }, (_, k) => {
        const a1 = (k / fig.d) * 2 * Math.PI - Math.PI / 2, a2 = ((k + 1) / fig.d) * 2 * Math.PI - Math.PI / 2;
        const p = a => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
        return `<path class="slice${k < on ? '' : ' eaten'}" d="M${cx},${cy} L${p(a1)} A${r},${r} 0 0 1 ${p(a2)} Z"/>`;
      }).join('');
    }).join('');
    const vw = cnt * (2 * r + gap) - gap + 8;
    return `<div class="figure"><svg viewBox="0 0 ${vw} ${2 * r + 8}" width="${vw}" height="${2 * r + 8}" role="img" aria-label="${fig.whole} целых круга и ещё ${fig.n} из ${fig.d}">${svg}</svg></div>`;
  }
  if (fig.type === 'grid') {
    const cw = 50, chh = 34; h = fig.rows * chh + 2; svg = '';
    for (let r = 0; r < fig.rows; r++) for (let c = 0; c < fig.cols; c++) {
      const cls = r < fig.r && c < fig.c ? 'fig-on' : (r < fig.r || c < fig.c) ? 'fig-half' : 'fig-off';
      svg += `<rect class="${cls}" x="${c * cw + 1}" y="${r * chh + 1}" width="${cw - 2}" height="${chh - 2}" rx="3"/>`;
    }
    return `<div class="figure"><svg viewBox="0 0 ${fig.cols * cw} ${h}" width="${fig.cols * cw}" height="${h}" role="img" aria-label="Прямоугольник ${fig.rows} на ${fig.cols}, закрашено ${fig.r * fig.c} клеток">${svg}</svg></div>`;
  }
  return `<div class="figure"><svg viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${label}">${svg}</svg></div>`;
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

/* ================= Главная ================= */

function home() {
  const cur = currentStop(), t = topics[cur], due = dueReviews();
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
        <div><h2>Следующий шаг: ${t.title}</h2><p class="muted">${t.goal || t.idea}</p></div>
        <div class="actions"><button class="btn btn-primary" data-lesson="${cur}">${meta(cur).practice ? 'Продолжить' : 'Начать занятие'}</button><span class="muted small">10–15 минут</span></div>
      </div>
      <div class="facts">
        <div class="fact"><strong>${mastered()}<small> из ${topics.length}</small></strong><span>тем освоено</span></div>
        <div class="fact"><strong>${checked()}<small> из ${topics.length}</small></strong><span>тем начато</span></div>
        <div class="fact"><strong>${state.answers}</strong><span>ответов дано</span></div>
      </div>
      <div class="sheet"><h3>Эта неделя</h3><div class="week">${week()}</div></div>
    </div>
    <div class="stack side">
      <div class="sheet knowledge">
        <h3>Что ты уже знаешь</h3>
        <p class="muted small" style="margin-top:6px">Средний прогресс по начатым темам — <b>${knowledge()}%</b>. Темы, которые ты ещё не открывал, не считаются пробелами.</p>
        ${SECTIONS.map(s => { const ix = topics.map((t, i) => i).filter(i => topics[i].section === s); const v = Math.round(ix.reduce((a, i) => a + pct(i), 0) / ix.length); return `<div class="row"><span>${s}</span><b>${v}%</b>${bar(v)}</div>`; }).join('')}
        <button class="btn btn-ghost" data-go="diagnostic" style="margin-top:6px">Пройти диагностику</button>
      </div>
      <div class="sheet note"><h3>Как устроено занятие</h3><p>Сначала разбор с картинкой и примерами, потом тренировка с подсказками, в конце — проверка из 4 задач. Тема засчитывается, если верно хотя бы 3.</p></div>
    </div>
  </div>`;
}

function week() {
  const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], now = new Date(), dow = (now.getDay() + 6) % 7;
  return names.map((n, k) => { const d = new Date(now); d.setDate(now.getDate() - dow + k); const on = state.days.includes(d.toISOString().slice(0, 10)); return `<span>${n}<i class="${on ? 'on' : ''}" title="${on ? 'Занимался' : 'Нет занятий'}"></i></span>`; }).join('');
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
      <button class="link" data-lesson="${i}" style="margin-top:auto;align-self:flex-start">${t.legacy ? 'Решить задачу' : 'Открыть методичку'}</button></article>`; }).join('')}</div>`;
}

/* ================= Занятие ================= */

let session = null; // текущая задача / проверка — живёт в памяти, функции не сериализуются

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
  return `<div class="layout">
    <article class="sheet method">
      <h2>Как это устроено</h2>
      <p>${e.model}</p>
      ${figure(e.figure)}<p class="figure-caption">${e.figureCaption}</p>
      <div class="rule"><h3>Правило</h3><p>${e.rule}</p></div>
      <h2>Разберём на примерах</h2>
      ${e.examples.map(x => `<div class="worked"><p class="worked-q">${x.q}</p><ol>${x.steps.map(s => `<li>${s}</li>`).join('')}</ol></div>`).join('')}
      <h2>Где чаще всего ошибаются</h2>
      <ul class="mistakes">${t.mistakes.map(m => `<li><b>${m.title}.</b> ${m.say}</li>`).join('')}</ul>
    </article>
    <aside class="stack side">
      <div class="sheet"><h3>Готов попробовать?</h3><p class="muted small">В тренировке задачи каждый раз новые, а подсказки открываются по одной.</p><button class="btn btn-primary" data-stage="practice">Начать тренировку</button></div>
      <p class="muted small">${window.VEKTOR_FRACTIONS.sources}</p>
    </aside>
  </div>`;
}

function practiceStage(i) {
  const t = topics[i], m = meta(i);
  if (!session || session.i !== i || session.mode !== 'practice') session = { i, mode: 'practice', task: t.generate(), hints: 0, answered: false };
  const task = session.task, need = 3;
  return `<div class="layout">
    <section class="sheet task" aria-labelledby="q">${taskCard(task)}</section>
    <aside class="sheet tutor" aria-label="Подсказки">
      <h3>Подсказки</h3>
      <p class="muted small" style="margin-top:4px">Открывай по одной — сначала попробуй сам.</p>
      <div id="hints">${task.hints.slice(0, session.hints).map(h => `<p class="bubble">${h}</p>`).join('')}</div>
      <button class="btn btn-ghost" id="hint-btn"${session.hints >= task.hints.length ? ' disabled' : ''}>${session.hints ? 'Ещё подсказка' : 'Показать подсказку'}</button>
      ${t.legacy ? '' : `<div class="streak"><h3>Тренировка</h3><p class="small muted">Решено верно: <b>${m.practice}</b>. ${m.practice >= need ? 'Можно переходить к проверке.' : `До проверки советуем решить ещё ${need - m.practice}.`}</p>
      <button class="btn ${m.practice >= need ? 'btn-primary' : 'btn-ghost'}" data-stage="check">Перейти к проверке</button></div>`}
    </aside>
  </div>`;
}

function checkStage(i, mode) {
  const t = topics[i], total = mode === 'check' ? t.check.count : 2;
  if (!session || session.i !== i || session.mode !== mode) session = { i, mode, k: 0, right: 0, total, task: t.generate(), answered: false, found: [] };
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
    return `<section class="sheet result ${pass ? 'pass' : 'fail'}" style="max-width:760px">
      <h2>${pass ? 'Тема освоена!' : 'Пока не засчитано'}</h2>
      <p>Верно ${s.right} из ${s.total}. ${pass ? 'Повторение придёт завтра, потом через 3 и через 7 дней.' : `Нужно хотя бы ${t.check.passScore}. Вернись к разбору — и попробуй снова.`}</p>
      ${found.length ? `<h3>Что заметили</h3><ul class="mistakes">${found.map(x => `<li><b>${x.title}.</b> ${x.say}</li>`).join('')}</ul>` : ''}
      <div class="row-actions">${pass
        ? `${next != null ? `<button class="btn btn-primary" data-lesson="${next}">Дальше: ${topics[next].title}</button>` : ''}<button class="btn btn-ghost" data-go="home">К маршруту</button>`
        : `<button class="btn btn-primary" data-stage="learn">К разбору</button><button class="btn btn-ghost" id="retry">Ещё раз</button>`}</div>
    </section>`;
  }
  return `<section class="sheet result ${pass ? 'pass' : 'fail'}" style="max-width:760px">
    <h2>${pass ? 'Отлично, тема не забылась' : 'Стоит освежить'}</h2>
    <p>Верно ${s.right} из ${s.total}. ${pass ? (m.reviewDue ? `Следующее повторение — ${new Date(m.reviewDue + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}.` : 'Все три повторения пройдены — тема закреплена.') : 'Повторение вернётся завтра. Если хочешь, загляни в разбор.'}</p>
    <div class="row-actions"><button class="btn btn-primary" data-go="home">К маршруту</button>${pass ? '' : '<button class="btn btn-ghost" data-stage="learn">К разбору</button>'}</div>
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
  if (!diagTask || diagTask.i !== i) diagTask = { i, task: topics[i].generate() };
  return head('Диагностика', `${DIAG.length} коротких задач по разным темам, без подсказок. Ошибаться можно — так мы точнее подберём маршрут.`) + `
  <section class="sheet task" style="max-width:760px">
    <div class="steps" aria-hidden="true">${DIAG.map((_, k) => `<i class="${k < d.step ? 'on' : ''}"></i>`).join('')}</div>
    <p class="muted">Вопрос ${d.step + 1} из ${DIAG.length} · ${topics[i].title}</p>
    ${taskCard(diagTask.task, { formId: 'diag-form', button: 'Ответить', exam: true })}
  </section>`;
}

/* ================= Преподавателю и настройки ================= */

function teacher() {
  const rows = topics.map((t, i) => i).filter(i => pct(i) > 0 || Object.keys(meta(i).errors).length).sort((a, b) => pct(a) - pct(b));
  const advice = i => pct(i) >= DONE ? ['ok', 'Уверенно', 'Дать задачу посложнее'] : pct(i) >= 30 ? ['', 'Формируется', 'Закрепить на 3–4 задачах'] : ['warn', 'Нужна поддержка', 'Разобрать на наглядной модели'];
  const errs = i => Object.entries(meta(i).errors).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id, n]) => { const m = mistakeOf(i, id); return m ? `${m.title} <span class="muted">(${n})</span>` : ''; }).filter(Boolean).join('<br>') || '<span class="muted">—</span>';
  return head('Преподавателю', `Сводка по ученику: ${esc(state.settings.name)}. Сверху — темы, где нужна помощь. Типичные ошибки распознаются автоматически по ответам.`) + `
  <div class="facts" style="margin-bottom:24px">
    <div class="fact"><strong>${mastered()}<small> из ${topics.length}</small></strong><span>тем освоено</span></div>
    <div class="fact"><strong>${checked()}</strong><span>тем начато</span></div>
    <div class="fact"><strong>${state.answers}</strong><span>ответов</span></div>
  </div>
  <div class="sheet"><div class="tablewrap"><table>
    <thead><tr><th>Тема</th><th>Прогресс</th><th>Состояние</th><th>Частые ошибки</th><th>Что сделать</th></tr></thead>
    <tbody>${rows.map(i => { const [c, s, a] = advice(i); return `<tr><td><b>${topics[i].title}</b><br><span class="muted small">${topics[i].section}</span></td><td style="min-width:110px">${pct(i)}%${bar(pct(i))}</td><td><span class="pill ${c}">${s}</span></td><td class="small">${errs(i)}</td><td>${a}</td></tr>`; }).join('')}</tbody>
  </table></div></div>`;
}

function settings() {
  const s = state.settings;
  return head('Настройки', 'Как к тебе обращаться и как объяснять.') + `
  <div class="layout"><form class="sheet" id="settings-form">
    <label class="field">Имя ученика<input name="name" id="set-name" value="${esc(s.name)}" maxlength="30" required></label>
    <label class="field">Как объяснять<select name="style" id="set-style"><option value="steps"${s.style === 'steps' ? ' selected' : ''}>Коротко и по шагам</option><option value="visual"${s.style === 'visual' ? ' selected' : ''}>Через наглядные примеры</option></select></label>
    <button class="btn btn-primary" type="submit">Сохранить</button>
    <div class="feedback" id="feedback" role="status" aria-live="polite"></div>
  </form>
  <div class="sheet note"><h3>Где хранятся данные</h3><p>Имя и прогресс сохраняются только в этом браузере и никуда не отправляются. Очистить их можно кнопкой «Начать заново» внизу страницы.</p></div></div>`;
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
  if (r.empty || r.unreadable) return r.msg;
  if (r.almost) return r.msg;
  const m = r.mistake && mistakeOf(i, r.mistake);
  return m ? `<b>Похоже на частую ошибку: ${m.title.toLowerCase()}.</b> ${m.say}` : 'Пока не совпало. Открой подсказку — она подскажет первый шаг.';
}

function bind(page, i, stage) {
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => location.hash = b.dataset.go);
  app.querySelectorAll('[data-lesson]').forEach(b => b.onclick = () => { session = null; location.hash = 'lesson/' + b.dataset.lesson; });
  app.querySelectorAll('[data-review]').forEach(b => b.onclick = () => { session = null; location.hash = `lesson/${b.dataset.review}/review`; });
  app.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { session = null; location.hash = `lesson/${i}/${b.dataset.stage}`; });
  app.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { filterState[page] = b.dataset.filter; render(); });

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
      const m = meta(i);
      if (r.mistake) m.errors[r.mistake] = (m.errors[r.mistake] || 0) + 1;

      if (s.mode === 'practice') {
        if (r.almost) { fb.className = 'feedback bad'; fb.innerHTML = feedbackFor(r, s.task, i); save(); return; }
        fb.className = 'feedback' + (r.ok ? '' : ' bad');
        fb.innerHTML = feedbackFor(r, s.task, i);
        if (r.ok) {
          s.answered = true; m.practice++;
          if (topics[i].legacy) setPct(i, 100); else setPct(i, Math.max(pct(i), Math.min(70, 10 + m.practice * 15)));
          fb.insertAdjacentHTML('beforeend', ` <button class="link" id="next-task">Следующая задача</button>`);
          fb.querySelector('#next-task').onclick = () => { session = null; render(); app.querySelector('#answer')?.focus(); };
          const st = app.querySelector('.streak .small b'); if (st) st.textContent = m.practice;
        }
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
        s.k++; s.answered = false; s.task = topics[i].generate();
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
    const ok = r.ok && !r.almost;
    if (ok) setPct(ti, Math.max(pct(ti), 60));
    if (r.mistake) { const m = meta(ti); m.errors[r.mistake] = (m.errors[r.mistake] || 0) + 1; }
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
}

function finishSession(i) {
  const t = topics[i], s = session, m = meta(i);
  if (s.mode === 'check') {
    if (s.right >= t.check.passScore) {
      setPct(i, 100); m.mastered = true; m.masteredAt = today(); m.reviewStep = 0; m.reviewDue = addDays(today(), t.review.afterDays[0]);
    }
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
  state = fresh(); session = null; save(); location.hash = 'home'; render();
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
