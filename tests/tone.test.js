// Запуск: node tests/tone.test.js — возрастной язык: с 8 класса без «жучков»
globalThis.window = globalThis;
['rational', 'tone', 'bugs'].forEach(f => require(`../content/${f}.js`));
const T = window.VEKTOR_TONE, b = window.VEKTOR_BUGS.byKey['add-diff:add-denominators'];
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const keys = ['catchBtn', 'draftTitle', 'found', 'reviewBtn', 'findHead', 'conflictOk', 'fixOk', 'fixAgain', 'twinHead', 'twinText', 'twinFail', 'trapOk', 'trapBeaten', 'trapBack', 'warmupSub'];
for (const g of [5, 6, 7]) { T.setGrade(g); ok(!T.senior() && T.t('found', b).includes('Складыватель'), `${g} класс — жучки`); }
for (const g of [8, 9]) {
  T.setGrade(g); ok(T.senior(), `${g} класс — взрослый тон`);
  for (const k of keys) { const s = T.t(k, b); ok(!/жуч|Складыватель|поймал/i.test(s), `${g} класс, ${k}: «${s}»`); }
  ok(!/data-bug/.test(T.art(b)), 'старшим без рисунка жучка');
}
T.setGrade(42); ok(T.grade() === 9, 'класс ограничен 5–9');
console.log(fails ? `tone: ${fails} FAIL` : 'tone: OK'); process.exit(fails ? 1 : 0);
