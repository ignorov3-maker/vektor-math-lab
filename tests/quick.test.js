// Запуск: node tests/quick.test.js — генераторы лёгкого старта: ответ всегда среди плиток, числа маленькие.
global.window = {};
require('../content/quick.js');
const Q = window.VEKTOR_QUICK; let bad = 0;
const ok = (c, n) => { if (!c) { bad++; console.log('FAIL', n); } };
ok(Q.LEVELS.length >= 3 && Q.PER_LEVEL === 5, 'уровни есть, по 5 задач');
for (const l of Q.LEVELS) {
  ok(Q.byId[l.id] === l && l.title && l.short && l.say, l.id + ': описание');
  for (let k = 0; k < 300; k++) {
    const t = l.gen();
    ok(Number.isInteger(t.answer) && t.answer >= 0 && t.answer <= 30, `${l.id}: ответ ${t.answer}`);
    ok(t.tiles.includes(t.answer), `${l.id}: ответ среди плиток`);
    ok(new Set(t.tiles).size === t.tiles.length && t.tiles.length >= 3 && t.tiles.length <= 5, `${l.id}: 3–5 разных плиток`);
    ok(Array.isArray(t.parts) && t.parts.length >= 2 && t.hint, `${l.id}: пример и подсказка`);
    if (bad > 5) break;
  }
}
const add = Q.byId['q-add']; for (let k = 0; k < 200; k++) { const t = add.gen(); ok(t.answer <= 5 && String(t.tiles) !== '' && t.tiles.every(v => v >= 1 && v <= 5), 'сложение: в пределах 5'); }
console.log(bad ? `quick: FAIL (${bad})` : 'quick: OK'); process.exit(bad ? 1 : 0);
