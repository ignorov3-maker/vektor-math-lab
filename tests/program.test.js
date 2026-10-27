// Запуск: node tests/program.test.js — структура программы 5–9
globalThis.window = globalThis;
['check', 'visuals', 'fractions', 'program'].forEach(f => require(`../content/${f}.js`));
const P = window.VEKTOR_PROGRAM, ids = new Set(window.VEKTOR_FRACTIONS.topics.map(t => t.id));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
ok(P.GRADES.map(g => g.n).join() === '5,6,7,8,9', 'классы 5–9');
for (const g of P.GRADES) for (const s of g.strands) for (const t of s.topics) {
  ok(t.title && (t.ready || P.WAVES[t.wave]), `${g.n}/${s.name}/${t.title}: готово или есть волна`);
  (t.ready || []).forEach(id => ok(ids.has(id), `${t.title}: тема ${id} существует`));
}
for (const g of P.GRADES) ok(g.strands.some(s => s.bug), `${g.n} класс: есть пример неверного правила`);
ok(P.readyCount() >= 2, 'есть готовые темы');
console.log(fails ? `program: ${fails} FAIL` : 'program: OK'); process.exit(fails ? 1 : 0);
