'use strict';

/* ================= Данные ================= */

// Дробь «столбиком» для вопросов и подсказок
const f = (a, b) => `<span class="frac" aria-label="${a} ${b === 2 ? 'вторых' : 'на ' + b}"><span>${a}</span><span>${b}</span></span>`;

const topics = [
  { title: 'Понятие дроби', section: 'Дроби', start: 25,
    idea: 'Дробь показывает часть целого, разделённого на равные части. Нижнее число — на сколько частей делили, верхнее — сколько частей взяли.',
    story: 'Пиццу разрезали на 8 равных кусков. Три куска уже съели.', question: 'Какая часть пиццы осталась?',
    figure: { parts: 8, eaten: 3 }, answer: '5/8', placeholder: 'например, 1/2',
    hints: ['Сначала посчитай, сколько кусков осталось.', 'Осталось 5 кусков из 8. Запиши это дробью: сверху — оставшиеся куски, снизу — все куски.'] },
  { title: 'Сокращение дробей', section: 'Дроби', start: 33,
    idea: 'Числитель и знаменатель можно разделить на одно и то же число — величина дроби не изменится.',
    story: 'Сократи дробь так, чтобы её нельзя было сократить ещё раз.', question: `${f(6, 8)} = ?`,
    answer: '3/4', simplest: true,
    hints: ['На какое число делятся и 6, и 8?', 'Оба числа делятся на 2: 6 : 2 = 3, 8 : 2 = 4.'] },
  { title: 'Сравнение дробей', section: 'Дроби', start: 20,
    idea: 'Чтобы сравнить дроби с разными знаменателями, приведи их к общему знаменателю.',
    story: 'Маша прочитала 3/5 книги, а Петя — 2/3 такой же книги.', question: `Что больше: ${f(3, 5)} или ${f(2, 3)}? Запиши большую дробь.`,
    answer: '2/3', exact: true,
    hints: ['Общий знаменатель для 5 и 3 — число 15.', `${f(3, 5)} = ${f(9, 15)}, а ${f(2, 3)} = ${f(10, 15)}.`] },
  { title: 'Сложение дробей', section: 'Дроби', start: 33,
    idea: 'Дроби с одинаковым знаменателем складывают так: числители складывают, знаменатель оставляют.',
    story: 'Утром Оля прошла 1/6 пути, а днём — ещё 3/6.', question: `${f(1, 6)} + ${f(3, 6)} = ?`,
    answer: '2/3',
    hints: ['Знаменатели одинаковые — сложи только числители.', `Получится ${f(4, 6)}. Можно ещё сократить.`] },
  { title: 'Вычитание дробей', section: 'Дроби', start: 0,
    idea: 'При одинаковых знаменателях из числителя уменьшаемого вычитают числитель вычитаемого.',
    story: 'В бутылке было 7/9 литра сока. Выпили 4/9 литра.', question: `${f(7, 9)} − ${f(4, 9)} = ?`,
    answer: '1/3',
    hints: ['Вычти числители: 7 − 4.', `Получится ${f(3, 9)} — это можно сократить на 3.`] },
  { title: 'Умножение дробей', section: 'Дроби', start: 0,
    idea: 'Чтобы умножить дроби, перемножают числители и знаменатели отдельно.',
    story: 'Найди произведение.', question: `${f(2, 3)} · ${f(3, 4)} = ?`,
    answer: '1/2',
    hints: ['Числитель: 2 · 3, знаменатель: 3 · 4.', `Получится ${f(6, 12)}. Сократи.`] },
  { title: 'Деление дробей', section: 'Дроби', start: 0,
    idea: 'Разделить на дробь — то же, что умножить на перевёрнутую дробь.',
    story: 'Сколько четвертинок помещается в половине?', question: `${f(1, 2)} : ${f(1, 4)} = ?`,
    answer: '2',
    hints: [`Переверни ${f(1, 4)} и умножь.`, `${f(1, 2)} · 4 = 2.`] },
  { title: 'Смешанные числа', section: 'Дроби', start: 0,
    idea: 'Смешанное число — это целая часть плюс дробь. Его можно записать неправильной дробью.',
    story: 'Запиши смешанное число 2 целых 1/3 в виде неправильной дроби.', question: `2 ${f(1, 3)} = ?`,
    answer: '7/3', exact: true, placeholder: 'например, 5/2',
    hints: ['Сколько третей в двух целых?', 'В двух целых 6 третей, да ещё одна треть.'] },
  { title: 'Пропорции', section: 'Отношения', start: 40,
    idea: 'Пропорция — это равенство двух отношений. Произведение крайних членов равно произведению средних.',
    story: 'Найди x.', question: `${f('x', 4)} = ${f(6, 8)}`,
    answer: '3', placeholder: 'x = ?',
    hints: ['Во сколько раз 8 больше 4?', 'В 2 раза. Значит, x в 2 раза меньше 6.'] },
  { title: 'Проценты', section: 'Отношения', start: 15,
    idea: 'Процент — это одна сотая часть. 25% — то же самое, что четверть.',
    story: 'В классе 80 тетрадей, 25% из них — в клетку.', question: 'Сколько тетрадей в клетку?',
    answer: '20',
    hints: ['25% — это четверть.', 'Найди четверть от 80: 80 : 4.'] },
  { title: 'Координатная плоскость', section: 'Геометрия', start: 0,
    idea: 'Положение точки задают два числа: первое — по горизонтальной оси, второе — по вертикальной.',
    story: 'Дана точка A(−2; 5).', question: 'Чему равна её первая координата (абсцисса)?',
    answer: '-2',
    hints: ['Абсцисса записывается первой в скобках.', 'Первое число в скобках — −2.'] },
  { title: 'Площадь фигур', section: 'Геометрия', start: 50,
    idea: 'Площадь прямоугольника равна произведению его длины и ширины.',
    story: 'Прямоугольник имеет длину 6 см и ширину 4 см.', question: 'Чему равна его площадь в см²?',
    answer: '24',
    hints: ['Площадь = длина · ширина.', '6 · 4 = ?'] },
];

const diagnosticQs = [
  { topic: 3, question: `${f(3, 4)} + ${f(1, 4)} = ?`, answer: '1' },
  { topic: 2, question: `Что больше: ${f(3, 5)} или ${f(2, 3)}?`, answer: '2/3', exact: true },
  { topic: 9, question: 'Сколько будет 10% от 50?', answer: '5' },
];

const pages = { home: 'Мой маршрут', map: 'Карта знаний', diagnostic: 'Диагностика', library: 'Материалы', teacher: 'Преподавателю', settings: 'Настройки', lesson: 'Занятие' };
const ROUTE = [0, 1, 2, 3, 4, 5, 6, 7]; // раздел «Дроби» — настоящая последовательность тем
const DONE = 80;

/* ================= Состояние ================= */

const KEY = 'vektor-progress-v2';
const fresh = () => ({
  progress: Object.fromEntries(topics.map((t, i) => [i, t.start])),
  answers: 0, days: [], diag: { step: 0, results: [] },
  settings: { name: 'Александр', style: 'steps' },
});
let state;
try { state = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY))); } catch { state = fresh(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

const pct = i => state.progress[i] || 0;
const checked = () => topics.filter((t, i) => pct(i) > 0).length;
const mastered = () => topics.filter((t, i) => pct(i) >= DONE).length;
const knowledge = () => { const c = topics.map((t, i) => pct(i)).filter(Boolean); return c.length ? Math.round(c.reduce((a, b) => a + b) / c.length) : 0; };
const currentStop = () => ROUTE.find(i => pct(i) < DONE) ?? ROUTE[ROUTE.length - 1];
const status = i => pct(i) >= DONE ? 'done' : pct(i) > 0 ? 'started' : 'todo';
const statusText = i => ({ done: 'Освоено', started: `Начато, ${pct(i)}%`, todo: 'Ещё не начато' })[status(i)];

/* ================= Проверка ответа ================= */

function parseNum(raw) {
  const s = String(raw).trim().replace(/\s+/g, ' ').replace(',', '.').replace(/[−–]/g, '-').replace(/^x\s*=\s*/i, '');
  let m;
  if ((m = s.match(/^(-?\d+) (\d+)\s*\/\s*(\d+)$/))) { const w = +m[1]; return { v: w + Math.sign(w || 1) * m[2] / m[3], kind: 'mixed' }; }
  if ((m = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/))) return +m[2] === 0 ? null : { v: m[1] / m[2], kind: 'frac', n: +m[1], d: +m[2] };
  if (/^-?\d+(\.\d+)?$/.test(s)) return { v: +s, kind: 'dec' };
  return null;
}
const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);

function check(input, task) {
  const got = parseNum(input), want = parseNum(task.answer);
  if (!input.trim()) return { ok: false, msg: 'Сначала впиши ответ в поле.' };
  if (!got) return { ok: false, msg: 'Не получилось прочитать ответ. Запиши число или дробь через косую черту, например 3/4.' };
  if (Math.abs(got.v - want.v) > 1e-9) return { ok: false, msg: 'Пока не совпало. Открой подсказку — она подскажет первый шаг.' };
  if ((task.simplest || task.exact === undefined) && got.kind === 'frac' && gcd(got.n, got.d) > 1 && want.kind === 'frac')
    return { ok: !task.simplest, almost: true, msg: `Значение верное! Но дробь можно сократить — попробуй записать её короче.` };
  if (task.exact && got.kind !== want.kind && want.kind !== 'dec') return { ok: false, almost: true, msg: 'Число верное, но запиши его в виде дроби.' };
  return { ok: true };
}

function record(ok, topicIndex) {
  state.answers++;
  const today = new Date().toISOString().slice(0, 10);
  if (!state.days.includes(today)) state.days = [...state.days, today].slice(-60);
  if (ok && topicIndex != null) state.progress[topicIndex] = 100;
  save();
}

/* ================= Отрисовка страниц ================= */

const app = document.querySelector('#app');
const head = (title, lead) => `<div class="page-head"><h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div>`;
const bar = v => `<div class="bar" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100"><i style="width:${v}%"></i></div>`;

function home() {
  const cur = currentStop(), t = topics[cur];
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  const stops = ROUTE.map((i, k) => {
    const cls = i === cur ? 'is-current' : 'is-' + (status(i) === 'done' ? 'done' : status(i) === 'started' ? 'started' : 'todo');
    return `<button class="stop ${cls}${k % 2 ? ' below' : ''}" data-lesson="${i}" data-k="${k}" aria-label="${topics[i].title}: ${statusText(i)}">
      <span class="dot">${status(i) === 'done' ? '✓' : k + 1}</span><span class="label">${topics[i].title}</span></button>`;
  }).join('');
  return head(`${hello}, ${state.settings.name}!`, 'Вот твой маршрут по разделу «Дроби». Ты сейчас здесь — на выделенной точке.') + `
  <section aria-label="Маршрут по разделу «Дроби»" class="route" id="route"><svg class="vector" aria-hidden="true"></svg>${stops}</section>
  <div class="layout">
    <div class="stack">
      <div class="sheet next">
        <div><h2>Следующий шаг: ${t.title}</h2><p class="muted">${t.idea}</p></div>
        <div class="actions"><button class="btn btn-primary" data-lesson="${cur}">Начать занятие</button><span class="muted small">5–10 минут</span></div>
      </div>
      <div class="facts">
        <div class="fact"><strong>${mastered()}<small> из ${topics.length}</small></strong><span>тем освоено</span></div>
        <div class="fact"><strong>${checked()}<small> из ${topics.length}</small></strong><span>тем начато</span></div>
        <div class="fact"><strong>${state.answers}</strong><span>ответов дано</span></div>
      </div>
      <div class="sheet">
        <h3>Эта неделя</h3>
        <div class="week">${week()}</div>
      </div>
    </div>
    <div class="stack side">
      <div class="sheet knowledge">
        <h3>Что ты уже знаешь</h3>
        <p class="muted small" style="margin-top:6px">Средний прогресс по начатым темам — <b>${knowledge()}%</b>. Темы, которые ты ещё не открывал, не считаются пробелами.</p>
        ${['Дроби', 'Отношения', 'Геометрия'].map(s => { const ix = topics.map((t, i) => i).filter(i => topics[i].section === s); const v = Math.round(ix.reduce((a, i) => a + pct(i), 0) / ix.length); return `<div class="row"><span>${s}</span><b>${v}%</b>${bar(v)}</div>`; }).join('')}
        <button class="btn btn-ghost" data-go="diagnostic" style="margin-top:6px">Пройти диагностику</button>
      </div>
      <div class="sheet note"><h3>Застрял на задаче?</h3><p>В каждом занятии есть подсказки по шагам — сначала намёк, потом готовый первый шаг.</p></div>
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
  const pts = ROUTE.map((_, k) => [W * (0.07 + 0.84 * k / (n - 1)), H * (0.82 - 0.64 * Math.pow(k / (n - 1), 0.85))]);
  box.querySelectorAll('.stop').forEach((el, k) => { el.style.left = pts[k][0] + 'px'; el.style.top = pts[k][1] + 'px'; });
  const P = a => a.map(p => p.join(',')).join(' ');
  const last = pts[n - 1], prev = pts[n - 2], ang = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
  const tip = [last[0] + 34 * Math.cos(ang), last[1] + 34 * Math.sin(ang)];
  const hw = (a, d) => [tip[0] - 16 * Math.cos(ang) + d * 9 * Math.cos(ang + a), tip[1] - 16 * Math.sin(ang) + d * 9 * Math.sin(ang + a)];
  svg.innerHTML = `<line class="axis" x1="0" y1="${H - 1}" x2="${W}" y2="${H - 1}"/>
    <polyline class="todo" points="${P(pts.slice(Math.max(cur, 0)).concat([tip]))}"/>
    <polyline class="done" points="${P(pts.slice(0, cur + 1))}"/>
    <polygon class="head" points="${P([tip, hw(Math.PI / 2, 1), hw(Math.PI / 2, -1)])}"/>`;
}

function mapPage(filter = 'Все') {
  const sections = ['Дроби', 'Отношения', 'Геометрия'].filter(s => filter === 'Все' || s === filter);
  const cur = currentStop();
  return head('Карта знаний', 'Вся программа на одном листе. Открывай любую тему — порядок подсказывает маршрут, но не запрещает.') +
    `<div class="filters" role="group" aria-label="Фильтр по разделам">${['Все', 'Дроби', 'Отношения', 'Геометрия'].map(s => `<button class="chip" data-filter="${s}" aria-pressed="${s === filter}">${s}</button>`).join('')}</div>` +
    sections.map(s => { const ix = topics.map((t, i) => i).filter(i => topics[i].section === s); const done = ix.filter(i => pct(i) >= DONE).length;
      return `<section class="section"><h2>${s} <small>освоено ${done} из ${ix.length}</small></h2><div class="topics">${ix.map(i => `
        <button class="topic is-${status(i)}${i === cur ? ' is-current' : ''}" data-lesson="${i}">
          <h3>${topics[i].title}</h3><span class="status">${i === cur ? 'Следующий шаг маршрута' : statusText(i)}</span>${bar(pct(i))}
        </button>`).join('')}</div></section>`; }).join('');
}

function figure(fig) {
  if (!fig) return '';
  const { parts, eaten } = fig, r = 90, c = 100;
  const slices = Array.from({ length: parts }, (_, k) => {
    const a1 = (k / parts) * 2 * Math.PI - Math.PI / 2, a2 = ((k + 1) / parts) * 2 * Math.PI - Math.PI / 2;
    const p = a => `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`;
    return `<path class="slice${k < eaten ? ' eaten' : ''}" d="M${c},${c} L${p(a1)} A${r},${r} 0 0 1 ${p(a2)} Z"/>`;
  }).join('');
  return `<div class="figure"><svg viewBox="0 0 200 200" role="img" aria-label="Круг из ${parts} частей, ${eaten} из них пустые">${slices}</svg></div><p class="figure-caption">Пунктиром — съеденные куски</p>`;
}

function lesson(i) {
  const t = topics[i];
  return head(t.title, t.idea) + `
  <div class="layout">
    <section class="sheet task" aria-labelledby="q">
      <p class="story">${t.story}</p>
      ${figure(t.figure)}
      <p class="question" id="q">${t.question}</p>
      <form class="answer" id="answer-form" autocomplete="off">
        <label>Твой ответ<input id="answer" inputmode="text" placeholder="${t.placeholder || 'число или дробь'}"></label>
        <button class="btn btn-primary" type="submit">Проверить ответ</button>
      </form>
      <div class="feedback" id="feedback" role="status" aria-live="polite"></div>
    </section>
    <aside class="sheet tutor" aria-label="Подсказки">
      <h3>Подсказки</h3>
      <p class="muted small" style="margin-top:4px">Открывай по одной — сначала попробуй сам.</p>
      <div id="hints"></div>
      <button class="btn btn-ghost" id="hint-btn">Показать подсказку</button>
      <p style="margin-top:20px"><button class="link" data-go="map">К карте знаний</button></p>
    </aside>
  </div>`;
}

function diagnostic() {
  const d = state.diag;
  if (d.step >= diagnosticQs.length) {
    const right = d.results.filter(Boolean).length, weak = diagnosticQs.filter((q, k) => !d.results[k]).map(q => q.topic);
    return head('Диагностика пройдена', `Верных ответов: ${right} из ${diagnosticQs.length}.`) + `<div class="sheet" style="max-width:640px">
      ${weak.length ? `<h3>Стоит повторить</h3><ul>${weak.map(i => `<li><button class="link" data-lesson="${i}">${topics[i].title}</button></li>`).join('')}</ul>` : '<h3>Отличный результат</h3><p>Все темы диагностики тебе знакомы. Можно двигаться дальше по маршруту.</p>'}
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px"><button class="btn btn-primary" data-go="home">К маршруту</button><button class="btn btn-ghost" id="diag-restart">Пройти ещё раз</button></div></div>`;
  }
  const q = diagnosticQs[d.step];
  return head('Диагностика', 'Три коротких вопроса без подсказок. Ошибаться можно — так мы точнее подберём маршрут.') + `
  <section class="sheet task" style="max-width:720px">
    <div class="steps" aria-hidden="true">${diagnosticQs.map((_, k) => `<i class="${k <= d.step ? 'on' : ''}"></i>`).join('')}</div>
    <p class="muted">Вопрос ${d.step + 1} из ${diagnosticQs.length}</p>
    <p class="question">${q.question}</p>
    <form class="answer" id="diag-form" autocomplete="off"><label>Твой ответ<input id="answer" placeholder="число или дробь"></label><button class="btn btn-primary" type="submit">Ответить</button></form>
    <div class="feedback" id="feedback" role="status" aria-live="polite"></div>
  </section>`;
}

function library(filter = 'Все') {
  const list = topics.map((t, i) => i).filter(i => filter === 'Все' || topics[i].section === filter);
  return head('Материалы', 'Короткие объяснения: главная мысль темы и задача, чтобы сразу проверить себя.') +
    `<div class="filters" role="group" aria-label="Фильтр по разделам">${['Все', 'Дроби', 'Отношения', 'Геометрия'].map(s => `<button class="chip" data-filter="${s}" aria-pressed="${s === filter}">${s}</button>`).join('')}</div>
    <div class="topics">${list.map(i => `<article class="topic"><h3>${topics[i].title}</h3><p class="muted small">${topics[i].idea}</p><button class="link" data-lesson="${i}" style="margin-top:auto;align-self:flex-start">Открыть занятие</button></article>`).join('')}</div>`;
}

function teacher() {
  const rows = topics.map((t, i) => i).filter(i => pct(i) > 0).sort((a, b) => pct(a) - pct(b));
  const advice = i => pct(i) >= DONE ? ['ok', 'Уверенно', 'Дать задачу посложнее'] : pct(i) >= 30 ? ['', 'Формируется', 'Закрепить на 3–4 задачах'] : ['warn', 'Нужна поддержка', 'Разобрать на наглядной модели'];
  return head('Преподавателю', `Сводка по ученику: ${state.settings.name}. Темы отсортированы — сверху те, где нужна помощь.`) + `
  <div class="facts" style="margin-bottom:24px">
    <div class="fact"><strong>${mastered()}<small> из ${topics.length}</small></strong><span>тем освоено</span></div>
    <div class="fact"><strong>${checked()}</strong><span>тем начато</span></div>
    <div class="fact"><strong>${state.answers}</strong><span>ответов</span></div>
  </div>
  <div class="sheet"><div class="tablewrap"><table>
    <thead><tr><th>Тема</th><th>Прогресс</th><th>Состояние</th><th>Что сделать</th></tr></thead>
    <tbody>${rows.map(i => { const [c, s, a] = advice(i); return `<tr><td><b>${topics[i].title}</b><br><span class="muted small">${topics[i].section}</span></td><td style="min-width:120px">${pct(i)}%${bar(pct(i))}</td><td><span class="pill ${c}">${s}</span></td><td>${a}</td></tr>`; }).join('')}</tbody>
  </table></div></div>`;
}

function settings() {
  const s = state.settings;
  return head('Настройки', 'Как к тебе обращаться и как объяснять.') + `
  <div class="layout"><form class="sheet" id="settings-form">
    <label class="field">Имя ученика<input name="name" value="${s.name.replace(/"/g, '&quot;')}" maxlength="30" required></label>
    <label class="field">Как объяснять<select name="style"><option value="steps"${s.style === 'steps' ? ' selected' : ''}>Коротко и по шагам</option><option value="visual"${s.style === 'visual' ? ' selected' : ''}>Через наглядные примеры</option></select></label>
    <button class="btn btn-primary" type="submit">Сохранить</button>
    <div class="feedback" id="feedback" role="status" aria-live="polite"></div>
  </form>
  <div class="sheet note"><h3>Где хранятся данные</h3><p>Имя и прогресс сохраняются только в этом браузере и никуда не отправляются. Очистить их можно кнопкой «Начать заново» внизу страницы.</p></div></div>`;
}

/* ================= Роутинг ================= */

let filterState = { map: 'Все', library: 'Все' };

function render() {
  const [page, arg] = (location.hash.slice(1) || 'home').split('/');
  const key = pages[page] ? page : 'home';
  const idx = Math.min(Math.max(+arg || 0, 0), topics.length - 1);
  document.querySelector('#crumb').textContent = key === 'lesson' ? topics[idx].title : pages[key];
  document.title = (key === 'home' ? '' : (key === 'lesson' ? topics[idx].title : pages[key]) + ' — ') + 'Вектор';
  document.querySelectorAll('nav button').forEach(b => b.dataset.page === key ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  document.querySelector('#student-name').textContent = state.settings.name;
  document.querySelector('#avatar').textContent = (state.settings.name[0] || 'А').toUpperCase();
  app.innerHTML = ({ home, map: () => mapPage(filterState.map), diagnostic, library: () => library(filterState.library), teacher, settings, lesson: () => lesson(idx) })[key]();
  bind(key, idx);
  requestAnimationFrame(drawRoute);
}

function bind(page, idx) {
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => location.hash = b.dataset.go);
  app.querySelectorAll('[data-lesson]').forEach(b => b.onclick = () => location.hash = 'lesson/' + b.dataset.lesson);
  app.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { filterState[page] = b.dataset.filter; render(); });

  const form = app.querySelector('#answer-form');
  if (form) {
    const t = topics[idx]; let shown = 0;
    form.onsubmit = e => {
      e.preventDefault();
      const r = check(form.querySelector('#answer').value, t), fb = app.querySelector('#feedback');
      if (form.querySelector('#answer').value.trim() && (r.ok || !r.almost)) record(r.ok, idx);
      fb.className = 'feedback' + (r.ok && !r.almost ? '' : ' bad');
      fb.innerHTML = r.ok && !r.almost
        ? `<b>Верно!</b> Ответ: ${t.answer.includes('/') ? f(...t.answer.split('/')) : t.answer}. Тема отмечена как освоенная. <button class="link" data-lesson="${(idx + 1) % topics.length}">Следующая тема</button>`
        : r.msg;
      fb.querySelectorAll('[data-lesson]').forEach(b => b.onclick = () => location.hash = 'lesson/' + b.dataset.lesson);
    };
    const hb = app.querySelector('#hint-btn');
    hb.onclick = () => {
      app.querySelector('#hints').insertAdjacentHTML('beforeend', `<p class="bubble">${t.hints[shown++]}</p>`);
      if (shown >= t.hints.length) hb.disabled = true; else hb.textContent = 'Ещё подсказка';
    };
  }

  const dform = app.querySelector('#diag-form');
  if (dform) dform.onsubmit = e => {
    e.preventDefault();
    const q = diagnosticQs[state.diag.step], v = dform.querySelector('#answer').value;
    if (!v.trim()) { app.querySelector('#feedback').textContent = 'Впиши ответ — или напиши 0, если не знаешь.'; return; }
    const r = check(v, q);
    record(r.ok && !r.almost);
    if (r.ok && !r.almost) state.progress[q.topic] = Math.max(pct(q.topic), 60);
    state.diag.results[state.diag.step] = r.ok && !r.almost; state.diag.step++; save(); render();
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

document.querySelectorAll('nav button').forEach(b => b.onclick = () => location.hash = b.dataset.page);
// Сброс в два нажатия — без системного confirm()
const resetBtn = document.querySelector('#reset'); let resetArmed;
resetBtn.onclick = () => {
  if (!resetArmed) { resetArmed = setTimeout(() => { resetArmed = null; resetBtn.textContent = 'Начать заново'; }, 4000); resetBtn.textContent = 'Нажми ещё раз, чтобы стереть прогресс'; return; }
  clearTimeout(resetArmed); resetArmed = null; resetBtn.textContent = 'Начать заново';
  state = fresh(); save(); location.hash = 'home'; render();
};
addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); app.querySelector('h1')?.focus?.(); });
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawRoute, 100); });
render();
