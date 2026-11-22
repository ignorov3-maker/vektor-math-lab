// Наглядная геометрия 5–6: генераторы, проверка ответа, распознавание ошибок, рисунки. Запуск: node tests/geometry56.test.js
globalThis.window = globalThis;
require('../content/check.js'); require('../content/visuals.js'); require('../content/geometry.js');
const { check, parse } = window.VEKTOR_CHECK, V = window.VEKTOR_VISUALS, G = window.VEKTOR_GEOMETRY;
let fails = 0;
const bad = (...m) => { fails++; if (fails < 30) console.log('FAIL', ...m); };
const ids = new Set();
for (const t of G.topics) {
  if (ids.has(t.id)) bad('dup id', t.id); ids.add(t.id);
  if (!/^g-/.test(t.id)) bad('id must start with g-', t.id);
  const mist = new Set(t.mistakes.map(m => m.id));
  for (const ex of t.explain.examples) { for (const k of Object.values(ex.wrong || {})) if (!mist.has(k)) bad('example mistake unknown', t.id, k); if (ex.fig && !V.figure(ex.fig)) bad('example figure empty', t.id); }
  if (t.explain.figure && !V.figure(t.explain.figure)) bad('explain figure empty', t.id);
  const seenMist = new Set(), stories = new Set();
  for (let i = 0; i < 3000; i++) {
    const task = t.generate(1 + (i % 3));
    const text = [task.story, task.question, ...task.hints, task.solution].join(' ');
    if (/undefined|NaN|Infinity|null/.test(text)) bad('bad text', t.id, text);
    if (!/^\d+$/.test(task.answer) || +task.answer <= 0) bad('answer not positive int', t.id, task.answer);
    const r = check(task.answer, task); if (!r.ok || r.almost) bad('own answer rejected', t.id, task.answer, JSON.stringify(r));
    if (task.misc(parse(task.answer))) bad('correct flagged', t.id);
    if (task.figure) { const svg = V.figure(task.figure); if (!svg || /NaN|undefined/.test(svg)) bad('figure', t.id, JSON.stringify(task.figure)); }
    // каждая записанная в misc ошибка существует в списке темы
    for (let w = 1; w <= 2000; w += 1) { const m = task.misc({ kind: 'num', v: w }); if (m) { if (!mist.has(m)) bad('unknown mistake', t.id, m); seenMist.add(m); } if (i > 30) break; }
    stories.add(task.story + task.question);
  }
  for (const m of mist) if (!seenMist.has(m) && !t.explain.examples.some(e => Object.values(e.wrong || {}).includes(m))) bad('mistake never detected', t.id, m);
  if (stories.size < 30) bad('too few distinct tasks', t.id, stories.size);
}
// точечно: классические ошибки ловятся
const find = (id, pred) => { for (let i = 0; i < 2000; i++) { const x = G.topics.find(t => t.id === id).generate(2); if (pred(x)) return x; } };
const per = find('g-perimeter', x => x.p); { const { a, b } = per.p; const r = check(String(a + b), per); if (r.mistake !== 'half-perimeter') bad('half-perimeter', r.mistake); if (a * b !== 2 * (a + b) && check(String(a * b), per).mistake !== 'area-not-perimeter') bad('area-not-perimeter'); }
const ar = find('g-area', x => x.p); { const { a, b } = ar.p; if (2 * (a + b) !== a * b && check(String(2 * (a + b)), ar).mistake !== 'perimeter-not-area') bad('perimeter-not-area'); }
const bx = find('g-volume', x => x.p); { const { a, b, c } = bx.p; if (check(String(a + b + c), bx).mistake !== 'sum-of-edges') bad('sum-of-edges'); }
const an = find('g-angles', x => x.p && x.p.T === 180); { if (check(String(an.p.a), an).mistake !== 'copied-given') bad('copied-given'); }
console.log(fails ? `geometry56: ${fails} FAIL` : `geometry56: OK (${G.topics.length} тем)`); process.exit(fails ? 1 : 0);
