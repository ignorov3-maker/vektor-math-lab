// Запуск: node tests/generators.test.js
globalThis.window = globalThis;
require('../content/check.js');
require('../content/fractions.js');
const { check, parse } = window.VEKTOR_CHECK;
let fails = 0, total = 0;
const seen = {};
for (const t of window.VEKTOR_FRACTIONS.topics) {
  for (let i = 0; i < 3000; i++) {
    total++;
    const task = t.generate();
    const html = [task.story, task.question, ...task.hints, task.solution].join(' ');
    const bad = (msg) => { fails++; if (fails < 40) console.log('FAIL', t.id, msg, task.question, task.answer); };
    if (/undefined|NaN|Infinity/.test(html)) bad('bad text');
    const r = check(task.answer, task);
    if (!r.ok || r.almost) bad('own answer rejected ' + JSON.stringify(r));
    const p = parse(task.answer);
    if (task.misc && task.misc(p)) bad('correct answer flagged as ' + task.misc(p));
    if (p.kind === 'frac' && p.d === 0) bad('zero denominator');
    seen[t.id] = (seen[t.id] || new Set()).add(task.story + task.question);
  }
}
// точечные проверки распознавания ошибок
const mk = (id) => window.VEKTOR_FRACTIONS.topics.find(t => t.id === id);
const probe = (id, n, wrong, expect) => { for (let i = 0; i < 500; i++) { const task = mk(id).generate(); const w = wrong(task); if (w == null) continue; const r = check(w, task); if (r.mistake === expect) return true; } console.log('MISS', id, expect); fails++; };
probe('add-same', 0, t => { const m = t.question.match(/<span>(\d+)<\/span><span>(\d+)<\/span><\/span> \+ <span class="frac"><span>(\d+)<\/span><span>(\d+)/); return m ? `${+m[1] + +m[3]}/${+m[2] * 2}` : null; }, 'add-denominators');
probe('reduce', 0, t => { const [a, b] = t.answer.split('/').map(Number); const m = t.question.match(/<span>(\d+)<\/span><span>(\d+)/); return `${a}/${m[2]}`; }, 'only-one-part');
probe('mixed', 0, t => { const m = t.question.match(/^(\d+) <span class="frac"><span>(\d+)<\/span><span>(\d+)/); return m ? `${+m[1] + +m[2]}/${m[3]}` : null; }, 'add-whole-to-numerator');
probe('reduce', 0, t => { const [a, b] = t.answer.split('/').map(Number); return `${a * 2}/${b * 2}`; }, 'not-fully-reduced');
console.log(`${total} задач, ошибок: ${fails}`);
for (const k in seen) console.log(k.padEnd(10), 'разных задач:', seen[k].size);
process.exit(fails ? 1 : 0);
