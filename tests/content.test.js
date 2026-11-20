// Проверка тем 5–9 из content/courses/*.js (формат — docs/content-spec.md).
// Запуск: node tests/content.test.js                 — все курсы
//         node tests/content.test.js content/courses/a7.js — подробно только этот файл (остальные грузятся для ссылок)
// Каждая тема: поля, ссылки requires/root, 1500 задач (свой ответ принят, верный не помечен ошибкой,
// каждая ошибка темы ловится по ответу, рисунки без NaN, задачи разнообразные), жучки и ловушки, мини-урок,
// задача переживает JSON (так она уходит в «задачу группе»), verify() пересчитывает ответ.
'use strict';
const fs = require('fs'), path = require('path');
globalThis.window = globalThis;
const ROOT = path.join(__dirname, '..');
for (const f of ['check', 'rational', 'tone', 'visuals', 'bugs', 'kit', 'fractions', 'geometry']) require(path.join(ROOT, 'content', f + '.js'));
const K = window.VEKTOR_KIT, C = window.VEKTOR_CHECK, V = window.VEKTOR_VISUALS, B = window.VEKTOR_BUGS;
K.adopt('fractions', 'Обыкновенные дроби', 5, window.VEKTOR_FRACTIONS.topics, 'Дроби');
// старая геометрия 5–6 — пока её не заменил курс content/courses/g56.js с теми же id
if (window.VEKTOR_GEOMETRY && !fs.existsSync(path.join(ROOT, 'content', 'courses', 'g56.js'))) K.adopt('geometry56', 'Наглядная геометрия', 5, window.VEKTOR_GEOMETRY.topics, 'Наглядная геометрия');

const dir = path.join(ROOT, 'content', 'courses');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => path.join(dir, f)) : [];
const only = process.argv.slice(2).map(f => path.resolve(f));
const loaded = {};
for (const f of files) { const before = K.topics.length; try { require(f); } catch (e) { console.log('FAIL загрузка', path.basename(f), e.message); process.exitCode = 1; continue; } loaded[f] = K.topics.slice(before); }

const STRANDS = {
  4: ['Фундамент начальной школы'],
  5: ['Натуральные числа', 'Дроби', 'Текстовые задачи', 'Наглядная геометрия'],
  6: ['Натуральные числа', 'Дроби', 'Положительные и отрицательные числа', 'Буквенные выражения', 'Текстовые задачи', 'Наглядная геометрия'],
  7: ['Алгебра', 'Геометрия', 'Вероятность и статистика'], 8: ['Алгебра', 'Геометрия', 'Вероятность и статистика'], 9: ['Алгебра', 'Геометрия', 'Вероятность и статистика'],
};
const N = +(process.env.N || 1500);
// темы, которые пишутся параллельно: ссылка на них — предупреждение, пока файла нет (STRICT=1 — ошибка)
const PLANNED = new Set([...fs.readFileSync(path.join(ROOT, 'docs', 'content-ids.md'), 'utf8').matchAll(/^- `([a-z0-9-]+)`/gm)].map(m => m[1]));
const STRICT = process.env.STRICT === '1';
const missingRef = (t, what, id) => { if (!STRICT && PLANNED.has(id)) { if (!missingRef.seen.has(id)) { missingRef.seen.add(id); console.log('WARN', t.id, what, id, '— тема ещё не написана'); } } else bad(t, what + ': нет темы', id); };
missingRef.seen = new Set();
let fails = 0, checked = 0;
const bad = (t, ...m) => { fails++; if (fails <= 80) console.log('FAIL', t && t.id || '', ...m); };
const BADTEXT = /undefined|NaN|Infinity|\[object|null|\btrue\b|\bfalse\b|-0\b|\d\.\d|\$\{/;
const eqv = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : a === b);

for (const [f, list] of Object.entries(loaded)) {
  if (only.length && !only.includes(f)) continue;
  for (const t of list) {
    checked++;
    // --- поля темы
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(t.id)) bad(t, 'id: латиница через дефис, с префиксом курса');
    if (!STRANDS[t.grade] || !STRANDS[t.grade].includes(t.strand)) bad(t, 'strand не из ФРП для класса', t.grade, t.strand);
    for (const k of ['title', 'short', 'goal']) if (!t[k] || typeof t[k] !== 'string') bad(t, 'нет поля', k);
    if (t.short && t.short.length > 16) bad(t, 'short длиннее 16 символов', t.short);
    if (!Array.isArray(t.frp) || !t.frp.length) bad(t, 'нет frp — пункт ФРП, который покрывает тема');
    const e = t.explain || {};
    if (!e.model || !e.rule || !Array.isArray(e.examples) || e.examples.length < 2) bad(t, 'explain: model, rule и ≥2 examples');
    for (const x of e.examples || []) { if (!x.q || !Array.isArray(x.steps) || !x.steps.length) bad(t, 'пример без q/steps'); if (x.fig && !V.figure(x.fig)) bad(t, 'рисунок примера пустой', JSON.stringify(x.fig)); }
    if (e.figure && !V.figure(e.figure)) bad(t, 'explain.figure пустой', JSON.stringify(e.figure));
    if ([e.model, e.rule, e.figureCaption, ...(e.examples || []).flatMap(x => [x.q, ...x.steps])].some(s => s != null && /undefined|NaN|\$\{/.test(String(s)))) bad(t, 'explain: мусор в тексте');
    for (const r of t.requires || []) if (!K.byId[r]) missingRef(t, 'requires', r);
    const ms = t.mistakes || [], mids = new Set(ms.map(m => m.id));
    if (ms.length < 2) bad(t, 'нужно ≥2 типичных ошибок');
    for (const m of ms) {
      for (const k of ['id', 'title', 'say', 'kidName', 'kidRule', 'fixIdea']) if (!m[k]) bad(t, `ошибка ${m.id}: нет ${k}`);
      if (m.kidRule && !/^ты /.test(m.kidRule)) bad(t, `ошибка ${m.id}: kidRule начинается с «ты …»`);
      if (!Array.isArray(m.explainOptions) || m.explainOptions.length !== 3) bad(t, `ошибка ${m.id}: explainOptions — ровно 3, первый верный`);
      if (!Array.isArray(m.conflicts) || !m.conflicts.length) bad(t, `ошибка ${m.id}: нужен ≥1 conflict (контрпример)`);
      for (const c of m.conflicts || []) { if (!c.text || !c.ask || !Array.isArray(c.choices) || c.choices.length < 2 || !c.choices.includes(c.right)) bad(t, `ошибка ${m.id}: conflict {text, ask, choices, right∈choices}`); if (typeof c.verify === 'function' && !c.verify()) bad(t, `ошибка ${m.id}: conflict.verify() = false`); if (c.figure && typeof c.figure === 'object' && !V.figure(c.figure)) bad(t, `ошибка ${m.id}: рисунок контрпримера пустой`); }
      if (m.root) { const r = K.byId[m.root]; if (!r) missingRef(t, `ошибка ${m.id}: root`, m.root); else if ((r.grade || 5) > t.grade) bad(t, `ошибка ${m.id}: root из старшего класса`); }
    }
    if (typeof t.verify !== 'function') bad(t, 'нет verify(task) — независимый пересчёт ответа');
    // --- генератор
    const seen = new Set(), wrongSeen = new Set(), lvSeen = { 1: new Set(), 3: new Set() };
    let ok = 0;
    for (let i = 0; i < N; i++) {
      const lv = 1 + (i % 3); let task;
      try { task = t.generate(lv); } catch (err) { bad(t, 'generate бросил', err.message); break; }
      const text = [task.story, task.question, ...(task.hints || []), task.solution].join(' ');
      if (BADTEXT.test(text.replace(/<[^>]+>/g, ''))) { bad(t, 'мусор в тексте (undefined/NaN/точка в десятичной…)', text.slice(0, 160)); break; }
      if (!task.question || !Array.isArray(task.hints) || task.hints.length < 2 || !task.solution) { bad(t, 'задача: question, ≥2 hints, solution'); break; }
      if (task.accept === 'choice') { if (!Array.isArray(task.choices) || !task.choices.includes(task.answer) || task.choices.length < 2 || task.choices.length > 4) { bad(t, 'choice: answer среди 2–4 choices'); break; } }
      else { const p = C.parse(task.answer); if (!p || p.kind === 'sign') { bad(t, 'answer не читается как число', task.answer); break; } if (Math.abs(p.v) > 1e6) { bad(t, 'слишком большое число', task.answer); break; } }
      const r = C.check(task.answer, task); if (!r.ok || r.almost) { bad(t, 'свой ответ не принят', task.answer, JSON.stringify(r)); break; }
      const own = task.accept === 'choice' ? { kind: 'choice', v: task.answer } : C.parse(task.answer);
      if (task.misc(own)) { bad(t, 'верный ответ помечен ошибкой', task.misc(own)); break; }
      for (const [id, w] of Object.entries(task.wrongs || {})) {
        if (!mids.has(id)) { bad(t, 'wrongs: нет такой ошибки', id); break; }
        const wv = K.valueOf(w, task); if (wv == null) { bad(t, 'wrongs: не читается', id, w); break; }
        if (eqv(wv, K.valueOf(task.answer, task))) continue; // на этой задаче ошибка даёт верный ответ — не ловушка
        const rr = C.check(String(w), task);
        if (rr.ok) { bad(t, 'неверный ответ принят', id, w); break; }
        wrongSeen.add(id);
      }
      if (task.figure) { const svg = V.figure(task.figure); if (!svg || /NaN|undefined|Infinity/.test(svg)) { bad(t, 'рисунок задачи', JSON.stringify(task.figure)); break; } }
      try { if (!t.verify(task)) { bad(t, 'verify(task) не подтвердил ответ', task.text, task.answer); break; } } catch (err) { bad(t, 'verify бросил', err.message); break; }
      const back = K.fromData(JSON.parse(JSON.stringify(task)));
      if (!C.check(task.answer, back).ok) { bad(t, 'задача не переживает JSON'); break; }
      seen.add(task.text); if (lv !== 2) lvSeen[lv].add(task.text); ok++;
    }
    if (ok === N) {
      if (seen.size < Math.min(40, N / 10)) bad(t, 'мало разных задач', seen.size);
      for (const m of ms) if (!wrongSeen.has(m.id)) bad(t, `ошибка ${m.id} ни разу не ловится по ответу (нет в wrongs)`);
      for (const m of ms) { const b = B.byKey[`${t.id}:${m.id}`]; if (!b) { bad(t, `жучок ${m.id} не зарегистрирован`); continue; } const p = b.trap(2); if (!p) bad(t, `нет ловушки для ${m.id}`); else if (!B.caught(b, p, b.wrong(p))) bad(t, `ловушка ${m.id}: неверный ответ не узнаётся`); if (b.lesson.some(s => /undefined|NaN/.test(s.html + (s.question || '') + (s.answerHtml || '')))) bad(t, `мини-урок ${m.id}: мусор`); }
    }
  }
}
console.log(fails ? `content: ${fails} FAIL (проверено тем: ${checked})` : `content: OK (тем: ${checked}, курсов: ${K.courses.filter(c => !c.adopted).length})`);
process.exitCode = fails ? 1 : process.exitCode;
