// Запуск: node tests/tutor.test.js — проверка отрисовки ответов наставника, тегов картинок и адаптивного темпа
globalThis.window = globalThis;
globalThis.localStorage = { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = String(v); } };
require('../content/check.js'); require('../content/visuals.js'); require('../content/fractions.js'); require('../content/adaptive.js'); require('../content/tutor.js');
const T = window.VEKTOR_TUTOR, V = window.VEKTOR_VISUALS, A = window.VEKTOR_ADAPTIVE;
let fails = 0; const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } };

// теги картинок
ok(V.figureFromTag('полоска 3/5')?.type === 'bar', 'bar tag');
ok(V.figureFromTag('Круг 3/8')?.parts === 8, 'circle tag');
ok(V.figureFromTag('сравнить 1/3 1/5')?.type === 'pair', 'pair tag');
ok(V.figureFromTag('прямоугольник 2/3 3/4')?.rows === 3, 'grid tag');
ok(V.figureFromTag('смешанное 2 1/3')?.whole === 2, 'mixed tag');
ok(V.figureFromTag('прямая 7/4')?.type === 'line', 'line >1');
ok(V.figureFromTag('полоска 9/5') === null, 'reject numerator > denominator on bar');
ok(V.figureFromTag('круг 1/500') === null, 'reject huge denominator');
ok(V.figureFromTag('<script>') === null, 'reject junk');

// отрисовка ответа
let r = T.render('Смотри: 3/5 — это три пятых.\n[[полоска 3/5]]\n**Правило:** числители складываем.');
ok(r.html.includes('class="frac"') && r.html.includes('<svg') && r.html.includes('<b>Правило:</b>'), 'render basics');
r = T.render('<img src=x onerror=alert(1)> [[готово]]');
ok(!r.html.includes('<img') && r.done, 'escape html + done tag');
r = T.render('Ответ \\frac{2}{3} и $1/2$');
ok(!r.html.includes('frac{') && !r.html.includes('$'), 'latex cleanup');
r = T.render('Сейчас нарисую [[поло', { streaming: true });
ok(!r.html.includes('[['), 'partial tag hidden while streaming');

// промпт
const topic = window.VEKTOR_FRACTIONS.topics[3];
const task = topic.generate(1);
const sp = T.systemPrompt({ topic, mode: 'task', task, attempts: ['5/12'], pace: 'slow', style: 'visual', name: 'Саша' });
ok(sp.includes(task.answer) && sp.includes('НЕ называй') && !sp.includes('<span'), 'task prompt has hidden answer, no html');
ok(T.systemPrompt({ topic, mode: 'lesson' }).includes('[[готово]]'), 'lesson prompt plan');

// офлайн-урок
const beats = T.lessonBeats(topic, () => topic.generate(1));
ok(beats.some(b => b.task) && beats.at(-1).done, 'lesson beats');
ok(T.localAnswer(topic, 'скажи ответ', task, 0).usedHint, 'local answer gives hint not answer');

// адаптивность
const m = {}; let ev = [];
for (let k = 0; k < 2; k++) ev = ev.concat(A.afterAttempt(m, { solved: true, firstTry: true, hints: 0, sec: 20 }, 'normal'));
ok(m.level === 3 && ev.some(e => e.type === 'level-up'), 'level up after 2 clean fast');
ev = []; for (let k = 0; k < 2; k++) ev = ev.concat(A.afterAttempt(m, { solved: false, firstTry: false, hints: 1, sec: 0, mistake: 'add-denominators' }, 'normal'));
ok(m.level === 2 && ev.some(e => e.type === 'level-down') && ev.some(e => e.type === 'same-mistake'), 'level down + same mistake');
ok(A.pace(Array(10).fill({ firstTry: true, hints: 0, sec: 20 })) === 'fast', 'pace fast');
ok(A.pace(Array(10).fill({ firstTry: false, hints: 1, sec: 90 })) === 'slow', 'pace slow');
ok(A.pace([{ firstTry: true, hints: 0, sec: 20 }]) === 'normal', 'pace default with little data');
ok(A.need('slow') > A.need('normal') && A.need('normal') > A.need('fast'), 'need by pace');

console.log(fails ? `ошибок: ${fails}` : 'tutor tests: ok'); process.exit(fails ? 1 : 0);
