// Тренировка проверяет дроби по общим эталонам (tests/answer_cases.json) — те же эталоны проверяет сервер для теста.
require('../content/check.js');
const C = globalThis.VEKTOR_CHECK, assert = require('assert');
const { cases } = require('./answer_cases.json');
const ACCEPT = { value: undefined, simplest: 'simplest', mixed: 'mixed' };
let bad = 0;
for (const [input, answer, rule, want] of cases) {
  const r = C.check(input, { answer, accept: ACCEPT[rule] });
  const got = !!(r.ok && !r.almost);
  if (got !== want) { bad++; console.log('FAIL', JSON.stringify(input), rule, answer, 'ждали', want, 'получили', got, r.msg || ''); }
}
assert.strictEqual(bad, 0);
console.log(`answers: OK (${cases.length} эталонов)`);
