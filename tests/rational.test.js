// Запуск: node tests/rational.test.js — точная арифметика и проверка шагов (CL-1)
globalThis.window = globalThis;
require('../content/rational.js');
const R = window.VEKTOR_RATIONAL;
const { Q, str, evalLine, checkSteps } = R;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const val = s => { const r = evalLine(s); return r.ok ? str(r.value) : 'ERR:' + r.error; };

// арифметика
ok(str(Q(6, 8)) === '3/4' && str(Q(3, -6)) === '-1/2' && str(Q(4, 2)) === '2', 'сокращение и знак');
ok(val('1/2 + 1/3') === '5/6', 'сложение разных');
ok(val('3/5 − 1/5') === '2/5', 'вычитание, длинный минус');
ok(val('2/3 · 3/4') === '1/2', 'умножение');
ok(val('1 : 1/2') === '2', 'деление');
ok(val('2 1/3') === '7/3', 'смешанное');
ok(val('2 1/3 + 1 2/3') === '4', 'смешанные складываются');
ok(val('= 3/6 + 2/6') === '5/6', 'строка с «=»');
ok(val('1/2 + 1/3 · 3') === '3/2', 'приоритет умножения');
ok(val('1 − 1/4 : 1/2') === '1/2', 'приоритет деления');
ok(val('-1/2 + 1') === '1/2', 'унарный минус');
ok(val('2 × 3/4') === '3/2' && val('6 ÷ 3') === '2', 'знаки × ÷');
ok(val('3/0').startsWith('ERR'), 'нулевой знаменатель');
ok(val('1 : 0').startsWith('ERR'), 'деление на ноль');
ok(val('1/2 +').startsWith('ERR') && val('+ 1/2').startsWith('ERR') && val('1/2 1/3').startsWith('ERR'), 'кривые строки');
ok(val('').startsWith('ERR') && val('1/2 ?').startsWith('ERR'), 'пусто и чужие знаки');

// запись сохраняется (нужна детектору уровня 2)
const p = R.parseLine('2/8 + 1 1/4');
ok(p.ok && p.nums[0].n === 2 && p.nums[0].d === 8 && p.nums[1].kind === 'mixed', 'raw-запись чисел');

// проверка шагов
let c = checkSteps(['1/2 + 1/3', '= 2/5']);
ok(!c.ok && c.errorAt === 1 && c.reason === 'value-changed' && str(c.expected) === '5/6', 'пример из ТЗ: 1/2+1/3=2/5');
c = checkSteps(['1/2 + 1/3', '= 3/6 + 2/6', '= 5/6']);
ok(c.ok && c.errorAt === -1, 'верное решение по шагам');
c = checkSteps(['1/2 + 1/3', '= 3/6 + 2/6', '= 5/12']);
ok(c.errorAt === 2, 'ошибка во втором шаге');
c = checkSteps(['2 1/3', '= 7/3']);
ok(c.ok, 'перевод смешанного');
c = checkSteps(['1/2 + 1/3', '= 3/6 +']);
ok(c.errorAt === 1 && c.reason === 'missing-number', 'нечитаемая строка');

// случайная сверка с плавающей точкой, все 4 действия
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const opsym = ['+', '−', '·', ':'], fn = [(a, b) => a + b, (a, b) => a - b, (a, b) => a * b, (a, b) => a / b];
for (let i = 0; i < 5000; i++) {
  const a = rnd(0, 20), b = rnd(1, 12), c2 = rnd(1, 20), d = rnd(1, 12), k = rnd(0, 3);
  const r = evalLine(`${a}/${b} ${opsym[k]} ${c2}/${d}`);
  ok(r.ok && Math.abs(r.value.n / r.value.d - fn[k](a / b, c2 / d)) < 1e-9, `fuzz ${a}/${b} ${opsym[k]} ${c2}/${d}`);
  if (fails > 20) break;
}

console.log(fails ? `rational: ${fails} FAIL` : 'rational: OK');
process.exit(fails ? 1 : 0);
