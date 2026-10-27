// Запуск: node tests/bugs.test.js — каталог жучков (CL-2)
globalThis.window = globalThis;
require('../content/rational.js'); require('../content/bugs.js');
const K = window.VEKTOR_BUGS; let fails = 0;
const ok = (c, m) => { if (!c) { fails++; if (fails < 40) console.log('FAIL', m); } };
ok(K.list.length === 21, 'жучков 21, а не ' + K.list.length);
ok(new Set(K.list.map(b => b.key)).size === 21, 'ключи уникальны');
const N = +process.env.N || 1000;
for (const b of K.list) {
  for (const f of ['kidName', 'title', 'fixIdea']) ok(b[f], `${b.key}: нет ${f}`);
  ok(b.conflicts.length >= 2, `${b.key}: нужно 2 контрпримера`);
  b.conflicts.forEach((c, i) => { ok(c.verify(), `${b.key}: контрпример ${i + 1} не даёт абсурда`); ok(c.choices.includes(c.right), `${b.key}: верный вариант не среди кнопок`); });
  ok(b.explainOptions.length === 3, `${b.key}: 3 варианта объяснения`);
  ok(b.lesson.length === 3 && b.lesson[2].question.length > 15, `${b.key}: мини-урок из 3 слайдов с задачей`);
  let made = 0;
  for (let i = 0; i < N; i++) {
    const p = b.trap(1 + (i % 3)); if (!p) continue; made++;
    const w = b.wrong(p);
    ok(K.norm(w) !== K.norm(p.answer), `${b.key}: неверный ответ совпал с верным ${p.text}`);
    ok(K.caught(b, p, w), `${b.key}: ловушка не ловит ${p.text}`);
    const d = K.detectAnswer(p, w);
    ok(d === b || (d && K.norm(d.wrong(p)) === K.norm(w) && b.id === 'compare-numerators-only'), `${b.key}: по ответу ${w} на «${p.text}» узнан ${d && d.key}`);
    ok(!K.detectAnswer(p, p.answer), `${b.key}: верный ответ принят за жучка ${p.text}`);
    if (b.line && p.expr) { const s = K.detectStep(b.topic, p.expr, '= ' + w); ok(s === b, `${b.key}: шаг ${p.expr} → ${w} узнан как ${s && s.key}`); }
    if (fails > 40) break;
  }
  ok(made >= N * 0.95, `${b.key}: ловушка строится редко (${made}/${N})`);
}
// верный шаг не ловится как жучок
ok(!K.detectStep('add-diff', '1/2 + 1/3', '= 3/6 + 2/6'), 'верный шаг без жучка');
ok(K.detectStep('add-diff', '1/2 + 1/3', '= 2/5').key === 'add-diff:add-denominators', 'пример из ТЗ');
console.log(fails ? `bugs: ${fails} FAIL` : 'bugs: OK'); process.exit(fails ? 1 : 0);
