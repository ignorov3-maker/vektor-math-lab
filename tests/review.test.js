// Запуск: node tests/review.test.js — статусы жучков (CL-4)
globalThis.window = globalThis;
['rational', 'tone', 'bugs', 'review'].forEach(f => require(`../content/${f}.js`));
const RV = window.VEKTOR_REVIEW; let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const st = {}; const bugs = RV.ensure(st); const k = 'add-diff:add-denominators';
ok(RV.ensure({ bugs: [] }) && !Array.isArray(RV.ensure({ bugs: [] })), 'испорченный state.bugs чинится');
RV.caught(bugs, k, '2026-10-27'); ok(bugs[k].status === 'caught' && bugs[k].cycles === 0, 'пойман');
RV.healing(bugs, k, '2026-10-27'); ok(bugs[k].status === 'healing' && bugs[k].next === '2026-10-28', 'лечится, проверка завтра');
RV.beaten(bugs, k, '2026-10-30'); ok(bugs[k].status === 'beaten' && bugs[k].beatenAt === '2026-10-30', 'побеждён');
RV.caught(bugs, k, '2026-11-02'); ok(bugs[k].status === 'caught' && bugs[k].cycles === 1 && bugs[k].conflict === 1 && bugs[k].beatenAt === '2026-10-30', 'вернулся — снова пойман, другой контрпример, без штрафа');
ok(RV.addDays('2026-12-31', 1) === '2027-01-01' && RV.addDays('2026-03-28', 1) === '2026-03-29', 'даты через границы');
ok(RV.caught(bugs, 'нет:такого', '2026-10-27') === null, 'неизвестный жучок');
console.log(fails ? `review: ${fails} FAIL` : 'review: OK'); process.exit(fails ? 1 : 0);
