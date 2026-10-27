// Запуск: node tests/warmup.test.js — расписание ловушек (CL-5)
globalThis.window = globalThis;
['rational', 'tone', 'check', 'bugs', 'review', 'warmup'].forEach(f => require(`../content/${f}.js`));
const W = window.VEKTOR_WARMUP, RV = window.VEKTOR_REVIEW, K = window.VEKTOR_BUGS;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const key = 'add-diff:add-denominators', D = RV.addDays;
const fresh = () => { const bugs = {}; RV.caught(bugs, key, '2026-10-27'); RV.healing(bugs, key, '2026-10-27'); return bugs; };
let bugs = fresh();
ok(W.plan(bugs, '2026-10-27').length === 0, 'в день разбора разминки нет');
ok(W.plan(bugs, '2026-10-28')[0].key === key, '+1 день — ловушка');
ok(W.plan(bugs, '2026-11-05').length === 1, 'не заходил неделю — ловушка ждёт');
ok(W.plan(bugs, '2026-10-28', { reviewTopic: 3 }).some(x => x.type === 'review'), 'плюс повторение темы');
ok(W.plan({}, '2026-10-28', { reviewTopic: 3 }).length === 0, 'нечего проверять — разминки нет');
W.apply(bugs, key, true, '2026-10-28'); ok(bugs[key].stage === 2 && bugs[key].next === '2026-10-31', '1-я ловушка пройдена → +3 дня');
ok(W.plan(bugs, '2026-10-30').length === 0 && W.plan(bugs, '2026-10-31').length === 1, '+3 дня — 2-я ловушка');
const r = W.apply(bugs, key, true, '2026-10-31'); ok(r.beaten && bugs[key].status === 'beaten', '2-я пройдена → побеждён');
ok(W.plan(bugs, '2026-11-06').length === 0 && W.plan(bugs, '2026-11-07')[0].stage === 3, 'контроль через 7 дней');
W.apply(bugs, key, false, '2026-11-07'); ok(bugs[key].status === 'beaten' && bugs[key].controlOk === false && W.plan(bugs, '2026-11-20').length === 0, 'контроль — только в метрику, один раз');
bugs = fresh(); W.apply(bugs, key, false, '2026-10-28'); ok(bugs[key].status === 'caught' && bugs[key].conflict === 1, 'попался → снова пойман, другой контрпример');
// не больше двух ловушек, сначала лечащиеся
bugs = {}; for (const b of K.list.slice(0, 5)) { RV.caught(bugs, b.key, '2026-10-01'); RV.healing(bugs, b.key, '2026-10-01'); }
ok(W.plan(bugs, '2026-10-10').filter(x => x.type === 'trap').length === 2, 'не больше двух ловушек');
console.log(fails ? `warmup: ${fails} FAIL` : 'warmup: OK'); process.exit(fails ? 1 : 0);
