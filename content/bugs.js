/* =========================================================
   Каталог жучков мысли — дроби 5 класса (CL-2).
   Одно неверное правило жучка (wrong) питает всё:
     • ловушки trap(lv)          — задачи, где правило даёт правдоподобный неверный ответ;
     • детектор по ответу         — detectAnswer(problem, raw);
     • детектор по шагу (ур. 2)   — detectStep(lineBefore, lineAfter);
     • неверное решение Дробика   — тот же wrong.
   Числа в контрпримерах фиксированы, их проверяет движок (verify).
   Тексты для детей — черновик, вычитать с учителем математики.
   window.VEKTOR_BUGS = { list, byKey, ofTopic, problem, solve, detectAnswer, detectStep, toTask }
   ========================================================= */
(function (root) {
  'use strict';
  const R = root.VEKTOR_RATIONAL;
  const { Q, add, sub, mul, div, eq, cmp, str } = R;
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[rnd(0, arr.length - 1)];
  const gcd = R.gcd, lcm = (a, b) => (a * b) / gcd(a, b);
  const L3 = (lv, a, b, c) => [a, b, c][Math.min(3, Math.max(1, lv || 2)) - 1];
  const F = (n, d) => `${n}/${d}`;

  /* ---------- Задачи-структуры ----------
     { topic, kind, ...числа, expr?, text, answer: raw, value?: Q, sign? } */
  const P = {
    concept(lv) { // пиццу разрезали на n, съели k — сколько осталось
      const [lo, hi] = L3(lv, [3, 6], [4, 10], [6, 12]);
      let n, k; do { n = rnd(lo, hi); k = rnd(1, n - 1); } while (2 * k === n);
      return { topic: 'concept', kind: 'left', n, k, text: `Пиццу разрезали на ${n} равных кусков и съели ${k}. Какая часть пиццы осталась?`, answer: F(n - k, n), value: Q(n - k, n) };
    },
    conceptParts() { // неравные части: сравнить маленький кусок с половиной
      const n = pick([2, 3, 4]);
      return { topic: 'concept', kind: 'unequal', n, text: `Торт разрезали на ${n} куска разного размера. Сравни самый маленький кусок и 1/${n} торта.`, answer: '<', sign: '<' };
    },
    reduce(lv) {
      let a, b, k; do { b = rnd(2, L3(lv, 6, 9, 12)); a = rnd(1, b - 1); } while (gcd(a, b) !== 1);
      k = pick(L3(lv, [2, 3], [2, 3, 4, 6], [4, 6, 8, 9]));
      return { topic: 'reduce', kind: 'frac', A: a * k, B: b * k, expr: F(a * k, b * k), text: `Сократи дробь ${F(a * k, b * k)}.`, answer: F(a, b), value: Q(a, b) };
    },
    compare(lv) {
      let a, b, c, d;
      do { b = rnd(2, L3(lv, 8, 10, 12)); d = rnd(2, L3(lv, 8, 10, 12)); a = rnd(1, b - 1); c = rnd(1, d - 1); } while (b === d || cmp(Q(a, b), Q(c, d)) === 0);
      const s = ['<', '=', '>'][cmp(Q(a, b), Q(c, d)) + 1];
      return { topic: 'compare', kind: 'cmp', a, b, c, d, text: `Сравни ${F(a, b)} и ${F(c, d)}.`, answer: s, sign: s };
    },
    'add-same'(lv) {
      const d = rnd(3, L3(lv, 8, 12, 15)); const plus = Math.random() < 0.6;
      let a, b; do { a = rnd(1, d - 1); b = rnd(1, d - 1); } while (plus ? a + b > d : a <= b);
      const op = plus ? '+' : '−', v = plus ? Q(a + b, d) : Q(a - b, d);
      return { topic: 'add-same', kind: 'binop', op: plus ? '+' : '-', x: [a, d], y: [b, d], expr: `${F(a, d)} ${op} ${F(b, d)}`, text: `${F(a, d)} ${op} ${F(b, d)} = ?`, answer: str(v), value: v };
    },
    'add-diff'(lv) {
      let a, b, c, d; const plus = Math.random() < 0.6;
      do { b = rnd(2, L3(lv, 6, 10, 12)); d = rnd(2, L3(lv, 6, 10, 12)); a = rnd(1, b - 1); c = rnd(1, d - 1); }
      while (b === d || lcm(b, d) > 30 || (!plus && cmp(Q(a, b), Q(c, d)) <= 0));
      const op = plus ? '+' : '−', v = plus ? add(Q(a, b), Q(c, d)) : sub(Q(a, b), Q(c, d));
      return { topic: 'add-diff', kind: 'binop', op: plus ? '+' : '-', x: [a, b], y: [c, d], expr: `${F(a, b)} ${op} ${F(c, d)}`, text: `${F(a, b)} ${op} ${F(c, d)} = ?`, answer: str(v), value: v };
    },
    mixed(lv) {
      const d = rnd(2, L3(lv, 5, 8, 12)), w = rnd(1, L3(lv, 3, 5, 9)); let n; do { n = rnd(1, d - 1); } while (gcd(n, d) !== 1);
      return { topic: 'mixed', kind: 'mixed', w, n, d, expr: `${w} ${F(n, d)}`, text: `Запиши ${w} ${F(n, d)} неправильной дробью.`, answer: F(w * d + n, d), value: Q(w * d + n, d) };
    },
    mult(lv) {
      if (Math.random() < 0.5) {
        const d = rnd(3, L3(lv, 6, 9, 12)), a = rnd(1, d - 1), k = rnd(2, L3(lv, 4, 6, 9)), v = mul(Q(k), Q(a, d));
        return { topic: 'mult', kind: 'binop', op: '*', x: [k, 1], y: [a, d], expr: `${k} · ${F(a, d)}`, text: `${k} · ${F(a, d)} = ?`, answer: str(v), value: v };
      }
      let a, b, c, d; do { b = rnd(2, L3(lv, 6, 9, 12)); d = rnd(2, L3(lv, 6, 9, 12)); a = rnd(1, b - 1); c = rnd(1, d - 1); } while (b === d);
      const v = mul(Q(a, b), Q(c, d));
      return { topic: 'mult', kind: 'binop', op: '*', x: [a, b], y: [c, d], expr: `${F(a, b)} · ${F(c, d)}`, text: `${F(a, b)} · ${F(c, d)} = ?`, answer: str(v), value: v };
    },
    div(lv) {
      let a, b, c, d; do { b = rnd(2, L3(lv, 6, 9, 12)); d = rnd(2, L3(lv, 6, 9, 12)); a = rnd(1, b + 2); c = rnd(1, d - 1); } while (b === d && a === c);
      const v = div(Q(a, b), Q(c, d));
      return { topic: 'div', kind: 'binop', op: '/', x: [a, b], y: [c, d], expr: `${F(a, b)} : ${F(c, d)}`, text: `${F(a, b)} : ${F(c, d)} = ?`, answer: str(v), value: v };
    },
    'part-of'(lv) {
      let b, a; do { b = rnd(2, L3(lv, 5, 8, 10)); a = rnd(1, b - 1); } while (gcd(a, b) !== 1);
      const unit = rnd(2, L3(lv, 6, 9, 12));
      if (Math.random() < 0.5) {
        const N = unit * b;
        return { topic: 'part-of', kind: 'part', a, b, N, text: `В классе ${N} учеников. ${F(a, b)} из них ходят в кружок. Сколько учеников ходят в кружок?`, answer: String(unit * a), value: Q(unit * a) };
      }
      const M = unit * a;
      return { topic: 'part-of', kind: 'whole', a, b, M, text: `Миша прочитал ${M} страниц — это ${F(a, b)} книги. Сколько страниц во всей книге?`, answer: String(unit * b), value: Q(unit * b) };
    },
  };
  const problem = (topic, lv) => (topic === 'concept' && Math.random() < 0.15 ? P.conceptParts() : P[topic](lv));

  /* ---------- Каталог ----------
     wrong(p) → raw-ответ по неверному правилу или null, если правило к задаче не применимо.
     notation: true — жучок узнаётся по записи (значение может совпасть с верным).
     line: true — правило работает и как шаг черновика (detectStep). */
  const q = ([n, d]) => Q(n, d);
  const B = [];
  const bug = o => B.push(o);
  const art = (tag) => `[[${tag}]]`;

  bug({ topic: 'concept', id: 'flipped', kidName: 'Перевёртыш', title: 'Числитель и знаменатель перепутаны местами',
    wrong: p => (p.kind === 'left' ? F(p.n, p.n - p.k) : null),
    conflicts: [
      { text: 'У тебя 5/3: взяли 5 кусков из 3. Пиццу разрезали на 3 куска — можно съесть 5?', figure: art('круг 3/3'), ask: 'Можно съесть 5 кусков из 3?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => cmp(Q(5, 3), Q(1)) > 0 },
      { text: 'По твоему правилу закрашенная часть полоски — 4/3. Но полоска одна. Может её часть быть больше всей полоски?', figure: art('полоска 3/4'), ask: 'Часть больше целого?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => cmp(Q(4, 3), Q(1)) > 0 },
    ],
    fixIdea: 'Внизу — на сколько равных частей разрезали целое, вверху — сколько частей взяли.',
    explainOptions: ['Внизу пишут, на сколько частей разрезали, а вверху — сколько взяли', 'Большее число всегда пишут сверху', 'Нужно было сложить числа'],
  });
  bug({ topic: 'concept', id: 'took-eaten', kidName: 'Перепутайка', title: 'Посчитана не та часть',
    wrong: p => (p.kind === 'left' ? F(p.k, p.n) : null),
    conflicts: [
      { text: 'На картинке закрашено съеденное. Вопрос про то, что осталось. Твой ответ про что?', figure: art('круг 3/8'), ask: 'Твой ответ — это…', choices: ['что съели', 'что осталось'], right: 'что съели', verify: () => true },
      { text: 'Из 10 конфет съели 3. По твоему осталось 3/10 — то есть 3 конфеты. А 10 − 3 = ?', figure: art('полоска 3/10'), ask: 'Сколько конфет осталось?', choices: ['3', '7'], right: '7', verify: () => 10 - 3 === 7 },
    ],
    fixIdea: 'Перечитай вопрос: спрашивают, сколько осталось, — считай оставшиеся куски.',
    explainOptions: ['Спрашивали, сколько осталось, а не сколько съели', 'Знаменатель неправильный', 'Надо было сократить'],
  });
  bug({ topic: 'concept', id: 'unequal-parts', kidName: 'Криворез', title: 'Считает доли, хотя части неравные',
    wrong: p => (p.kind === 'unequal' ? '=' : null),
    conflicts: [
      { text: 'Торт разрезали на большой и крошечный кусок. Тебе дали крошечный — это половина?', figure: '', ask: 'Крошечный кусок — половина?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => true },
      { text: 'Шоколадку разломали на 4 куска: один огромный и три маленьких. Каждый маленький — это 1/4?', figure: art('полоска 1/4'), ask: 'Маленький кусок — четверть?', choices: ['Да', 'Нет, меньше'], right: 'Нет, меньше', verify: () => true },
    ],
    fixIdea: 'Дробь — это только равные части. Неравные куски нельзя называть долями.',
    explainOptions: ['Доли должны быть одинаковыми по размеру', 'Кусков было мало', 'Надо считать только большие куски'],
  });
  bug({ topic: 'reduce', id: 'not-fully-reduced', kidName: 'Недорез', title: 'Дробь сокращена не до конца', notation: true, trapLv: 3, line: true,
    wrong: p => {
      if (p.kind !== 'frac') return null;
      const g = gcd(p.A, p.B); const s = [2, 3, 5, 7].find(k => g % k === 0 && k < g);
      return s ? F(p.A / s, p.B / s) : null;
    },
    conflicts: [
      { text: '12/18 → 6/9. А 6 и 9 ещё делятся на одно число?', figure: '', ask: 'Делятся 6 и 9 на 3?', choices: ['Да', 'Нет'], right: 'Да', verify: () => gcd(6, 9) === 3 },
      { text: '20/40 → 10/20. Посмотри: 10 и 20 обе делятся на 10. Это точно конец?', figure: art('сравнить 10/20 1/2'), ask: 'Можно сократить ещё?', choices: ['Да', 'Нет'], right: 'Да', verify: () => gcd(10, 20) > 1 },
    ],
    fixIdea: 'Сокращай, пока у числителя и знаменателя есть общий делитель больше 1.',
    explainOptions: ['У числителя и знаменателя ещё остался общий делитель', 'Сокращать нельзя', 'Надо было вычесть'],
  });
  bug({ topic: 'reduce', id: 'only-one-part', kidName: 'Однобокий', title: 'Разделён только числитель или только знаменатель', line: true,
    wrong: p => (p.kind === 'frac' ? F(p.A / gcd(p.A, p.B), p.B) : null),
    conflicts: [
      { text: 'По твоему 6/8 = 3/8. Сравни полоски — они равны?', figure: art('сравнить 6/8 3/8'), ask: 'Полоски равны?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => !eq(Q(6, 8), Q(3, 8)) },
      { text: 'По твоему 4/10 = 2/10. Было 4 куска, стало 2 таких же. Дробь не изменилась?', figure: art('сравнить 4/10 2/10'), ask: 'Это одно и то же?', choices: ['Да', 'Нет, стало меньше'], right: 'Нет, стало меньше', verify: () => cmp(Q(2, 10), Q(4, 10)) < 0 },
    ],
    fixIdea: 'Делить нужно и числитель, и знаменатель на одно и то же число.',
    explainOptions: ['Поделили только числитель, а знаменатель тоже надо делить', 'Надо было умножить', 'Сокращать нужно только знаменатель'],
  });
  bug({ topic: 'reduce', id: 'subtract-instead', kidName: 'Вычитатель', title: 'Из чисел вычитают, а не делят', line: true,
    wrong: p => {
      if (p.kind !== 'frac') return null;
      const s = p.A - (p.A / gcd(p.A, p.B)); // вычитает столько же, сколько «убрал» бы деление в числителе
      return p.B - s > 0 && p.A - s > 0 ? F(p.A - s, p.B - s) : null;
    },
    conflicts: [
      { text: 'По твоему 2/4 = 1/3 (отняли по 1). Половина и треть — одно и то же?', figure: art('сравнить 2/4 1/3'), ask: 'Это одинаково?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => !eq(Q(2, 4), Q(1, 3)) },
      { text: 'Отнимем от 3/6 по 2 — получится 1/4. Но 3/6 — это половина. Половина равна четверти?', figure: art('сравнить 1/2 1/4'), ask: 'Половина равна четверти?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => !eq(Q(3, 6), Q(1, 4)) },
    ],
    fixIdea: 'Сокращение — это деление числителя и знаменателя на одно число, а не вычитание.',
    explainOptions: ['При сокращении делят, а не вычитают', 'Вычитать надо больше', 'Надо вычитать только из знаменателя'],
  });
  bug({ topic: 'compare', id: 'bigger-denominator-bigger', kidName: 'Знаменатель-хвастун', title: 'Считает, что больше знаменатель — больше дробь',
    wrong: p => (p.kind === 'cmp' ? (p.b > p.d ? '>' : '<') : null),
    conflicts: [
      { text: 'Что ты выберешь: 1/2 пиццы или 1/12 пиццы?', figure: art('сравнить 1/2 1/12'), ask: 'Что больше?', choices: ['1/2', '1/12'], right: '1/2', verify: () => cmp(Q(1, 2), Q(1, 12)) > 0 },
      { text: 'Шоколадку делят на 3 человек или на 10. Когда твой кусок больше?', figure: art('сравнить 1/3 1/10'), ask: 'Кусок больше, когда людей…', choices: ['3', '10'], right: '3', verify: () => cmp(Q(1, 3), Q(1, 10)) > 0 },
    ],
    fixIdea: 'Чем на большее число частей режут целое, тем мельче каждая часть.',
    explainOptions: ['Больше знаменатель — мельче куски', 'Больше знаменатель — больше дробь', 'Знаменатель не важен'],
  });
  bug({ topic: 'compare', id: 'compare-numerators-only', kidName: 'Одноглазик', title: 'Сравнивает только числители при разных знаменателях',
    wrong: p => (p.kind === 'cmp' && p.a !== p.c ? (p.a > p.c ? '>' : '<') : null),
    conflicts: [
      { text: 'По числителям 3/8 больше 2/3. Но 3/8 — меньше половины, а 2/3 — больше. Как так?', figure: art('сравнить 3/8 2/3'), ask: 'Что больше на самом деле?', choices: ['3/8', '2/3'], right: '2/3', verify: () => cmp(Q(2, 3), Q(3, 8)) > 0 },
      { text: 'По числителям 2/20 больше 1/2. Две крошки или половина торта?', figure: art('сравнить 2/20 1/2'), ask: 'Что больше?', choices: ['2/20', '1/2'], right: '1/2', verify: () => cmp(Q(1, 2), Q(2, 20)) > 0 },
    ],
    fixIdea: 'Числители можно сравнивать, только если знаменатели одинаковые.',
    explainOptions: ['Доли разного размера — сначала нужен общий знаменатель', 'У кого больше числитель, та дробь и больше', 'Надо сравнить знаменатели'],
  });
  const addDen = topic => ({ topic, id: 'add-denominators', kidName: 'Складыватель', title: topic === 'add-same' ? 'Складывает и знаменатели тоже' : 'Складывает числители и знаменатели', line: true,
    wrong: p => (p.kind === 'binop' && p.op === '+' ? F(p.x[0] + p.y[0], p.x[1] + p.y[1]) : null),
    conflicts: topic === 'add-same' ? [
      { text: 'По твоему 1/4 + 1/4 = 2/8 = 1/4. Четверть плюс четверть — снова четверть?', figure: art('сравнить 2/4 1/4'), ask: 'Четверть плюс четверть — четверть?', choices: ['Да', 'Нет, больше'], right: 'Нет, больше', verify: () => eq(Q(2, 8), Q(1, 4)) },
      { text: 'По твоему 1/2 + 1/2 = 2/4. Но две половинки яблока — это целое яблоко, а 2/4 — снова половина.', figure: art('сравнить 2/4 1/2'), ask: 'Две половинки — это…', choices: ['целое', 'половина'], right: 'целое', verify: () => eq(Q(2, 4), Q(1, 2)) },
    ] : [
      { text: 'По твоему 1/2 + 1/3 = 2/5. Но 2/5 меньше половины. Прибавили — и стало меньше?', figure: art('сравнить 1/2 2/5'), ask: 'Может сумма быть меньше слагаемого?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => cmp(Q(2, 5), Q(1, 2)) < 0 },
      { text: 'По твоему 1/3 + 1/6 = 2/9. Но 2/9 меньше, чем 1/3. Добавили кусок — пиццы стало меньше?', figure: art('сравнить 1/3 2/9'), ask: 'Пиццы стало меньше?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => cmp(Q(2, 9), Q(1, 3)) < 0 },
    ],
    fixIdea: topic === 'add-same' ? 'Знаменатель — размер доли. Складываем только числители, знаменатель остаётся.' : 'Сначала одинаковые куски: приведи к общему знаменателю, потом складывай числители.',
    explainOptions: topic === 'add-same'
      ? ['Знаменатель — размер куска, он не меняется', 'Знаменатели тоже надо складывать', 'Надо умножить числители']
      : ['Куски разного размера — сначала нужен общий знаменатель', 'Складывать можно всё сразу', 'Надо вычесть знаменатели'],
  });
  bug(addDen('add-same'));
  bug({ topic: 'add-same', id: 'subtract-denominators', kidName: 'Нулевик', title: 'Вычитает и знаменатели', notation: true, line: true,
    wrong: p => (p.kind === 'binop' && p.op === '-' ? F(p.x[0] - p.y[0], 0) : null),
    conflicts: [
      { text: 'По твоему 3/5 − 1/5 = 2/0. Разрезать пирог на 0 частей — это как?', figure: '', ask: 'Можно разрезать на 0 частей?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => true },
      { text: 'Было 4/7, съели 1/7. Куски были седьмые — разве после еды они стали другими?', figure: art('полоска 3/7'), ask: 'Размер кусков изменился?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => eq(sub(Q(4, 7), Q(1, 7)), Q(3, 7)) },
    ],
    fixIdea: 'Знаменатель — размер доли, он не меняется. Вычитаем только числители.',
    explainOptions: ['Знаменатель — размер куска, его не вычитают', 'Знаменатели тоже вычитают', 'Надо сложить знаменатели'],
  });
  bug(addDen('add-diff'));
  bug({ topic: 'add-diff', id: 'forgot-scale-numerators', kidName: 'Полупереводчик', title: 'Привёл знаменатели, но не домножил числители', line: true,
    wrong: p => {
      if (p.kind !== 'binop' || (p.op !== '+' && p.op !== '-')) return null;
      const L = lcm(p.x[1], p.y[1]); const n = p.op === '+' ? p.x[0] + p.y[0] : p.x[0] - p.y[0];
      return n > 0 ? F(n, L) : null;
    },
    conflicts: [
      { text: 'Ты записал 1/2 как 1/6. Посмотри — это одинаковые куски?', figure: art('сравнить 1/2 1/6'), ask: '1/2 и 1/6 равны?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => !eq(Q(1, 2), Q(1, 6)) },
      { text: 'Ты записал 2/3 как 2/12. Две трети пиццы и два маленьких кусочка — это одно и то же?', figure: art('сравнить 2/3 2/12'), ask: 'Это одинаково?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => !eq(Q(2, 3), Q(2, 12)) },
    ],
    fixIdea: 'Во сколько раз увеличил знаменатель — во столько же раз увеличь и числитель.',
    explainOptions: ['Знаменатель домножили, а числитель забыли', 'Числитель менять нельзя', 'Надо сложить знаменатели'],
  });
  bug({ topic: 'mixed', id: 'add-whole-to-numerator', kidName: 'Прилипала', title: 'Прибавляет целую часть к числителю', line: true,
    wrong: p => (p.kind === 'mixed' ? F(p.w + p.n, p.d) : null),
    conflicts: [
      { text: 'По твоему 2 1/3 = 3/3, а 3/3 — это всего 1. Было больше двух — стало одно?', figure: art('смешанное 2 1/3'), ask: 'Больше двух может стать одним?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => eq(Q(3, 3), Q(1)) },
      { text: 'По твоему 3 1/4 = 4/4 = 1. Три целых пиццы и кусок — это одна пицца?', figure: art('смешанное 3 1/4'), ask: 'Это одна пицца?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => cmp(Q(13, 4), Q(1)) > 0 },
    ],
    fixIdea: 'В одной целой столько долей, сколько в знаменателе: целую часть сначала умножь на знаменатель.',
    explainOptions: ['В целой не одна доля, а столько, сколько в знаменателе', 'Целую часть прибавляют к числителю', 'Целую часть надо отбросить'],
  });
  bug({ topic: 'mixed', id: 'multiply-whole-numerator', kidName: 'Умножала', title: 'Умножает целую часть на числитель', line: true,
    wrong: p => (p.kind === 'mixed' ? F(p.w * p.n, p.d) : null),
    conflicts: [
      { text: 'По твоему 2 1/3 = 2/3 — меньше одного. А тут два целых круга и ещё кусок.', figure: art('смешанное 2 1/3'), ask: '2 1/3 меньше одного?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => cmp(Q(2, 3), Q(1)) < 0 },
      { text: 'По твоему 4 1/2 = 4/2 = 2. Четыре с половиной яблока — это два яблока?', figure: art('смешанное 4 1/2'), ask: 'Это два яблока?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => eq(Q(4, 2), Q(2)) },
    ],
    fixIdea: 'Целую часть умножают на знаменатель, а не на числитель, и прибавляют числитель.',
    explainOptions: ['Целую часть умножают на знаменатель', 'Целую часть умножают на числитель', 'Числитель надо отбросить'],
  });
  bug({ topic: 'mult', id: 'cross-multiply', kidName: 'Крестоносец', title: 'Умножает «крест-накрест»', line: true,
    wrong: p => (p.kind === 'binop' && p.op === '*' && p.x[1] !== 1 ? F(p.x[0] * p.y[1], p.x[1] * p.y[0]) : null),
    conflicts: [
      { text: 'По твоему 1/2 · 1/2 = 2/2 = 1. Половина от половины — целая пицца?', figure: art('прямоугольник 1/2 1/2'), ask: 'Половина от половины — целая?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => eq(Q(2, 2), Q(1)) },
      { text: 'По твоему 1/3 · 1/3 = 3/3 = 1. Треть от трети — это целое?', figure: art('прямоугольник 1/3 1/3'), ask: 'Треть от трети — целое?', choices: ['Да', 'Нет, кусочек'], right: 'Нет, кусочек', verify: () => eq(Q(3, 3), Q(1)) },
    ],
    fixIdea: 'При умножении: числитель на числитель, знаменатель на знаменатель.',
    explainOptions: ['Числитель умножают на числитель, знаменатель на знаменатель', 'Умножают крест-накрест', 'Числители складывают'],
  });
  bug({ topic: 'mult', id: 'multiply-both', kidName: 'Двойник-умножатель', title: 'Умножает на число и числитель, и знаменатель', notation: true, line: true,
    wrong: p => (p.kind === 'binop' && p.op === '*' && p.x[1] === 1 ? F(p.x[0] * p.y[0], p.x[0] * p.y[1]) : null),
    conflicts: [
      { text: 'По твоему 2 · 3/4 = 6/8 = 3/4. Две порции по 3/4 — это одна порция?', figure: art('сравнить 6/8 3/4'), ask: 'Две порции — как одна?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => eq(Q(6, 8), Q(3, 4)) },
      { text: 'По твоему 3 · 1/2 = 3/6 = 1/2. Три половинки — это половинка?', figure: art('сравнить 3/6 1/2'), ask: 'Три половинки — одна половинка?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => eq(Q(3, 6), Q(1, 2)) },
    ],
    fixIdea: 'На натуральное число умножают только числитель: долей стало больше, а размер тот же.',
    explainOptions: ['Умножаем только числитель — размер долей не меняется', 'Умножаем и числитель, и знаменатель', 'Умножаем только знаменатель'],
  });
  bug({ topic: 'div', id: 'multiply-instead-of-divide', kidName: 'Непереворот', title: 'Умножает, не перевернув делитель', line: true,
    wrong: p => (p.kind === 'binop' && p.op === '/' ? str(mul(q(p.x), q(p.y))) : null),
    conflicts: [
      { text: 'По твоему 1 : 1/2 = 1/2. Сколько половинок в одном яблоке — половинка?', figure: art('полоска 1/2'), ask: 'Сколько половинок в яблоке?', choices: ['1/2', '2'], right: '2', verify: () => eq(div(Q(1), Q(1, 2)), Q(2)) },
      { text: 'По твоему 3 : 1/3 = 1. Сколько третей в трёх пиццах — одна?', figure: art('полоска 1/3'), ask: 'Сколько третей в трёх пиццах?', choices: ['1', '9'], right: '9', verify: () => eq(div(Q(3), Q(1, 3)), Q(9)) },
    ],
    fixIdea: 'Деление на дробь заменяем умножением на перевёрнутую дробь.',
    explainOptions: ['Делитель надо перевернуть, а потом умножить', 'Делить на дробь — это просто умножать', 'Надо перевернуть первую дробь'],
  });
  bug({ topic: 'div', id: 'flip-first', kidName: 'Переворот не того', title: 'Переворачивает не ту дробь', line: true,
    wrong: p => (p.kind === 'binop' && p.op === '/' ? str(mul(Q(p.x[1], p.x[0]), q(p.y))) : null),
    conflicts: [
      { text: 'По твоему 1/2 : 1 = 2. Половину яблока ни на что не делили — а стало два яблока?', figure: art('полоска 1/2'), ask: 'Половина : 1 — это…', choices: ['1/2', '2'], right: '1/2', verify: () => eq(div(Q(1, 2), Q(1)), Q(1, 2)) },
      { text: 'По твоему 1/4 : 1 = 4. Четверть пиццы раздали одному человеку — у него стало 4 пиццы?', figure: art('круг 1/4'), ask: 'Сколько у него пиццы?', choices: ['1/4', '4'], right: '1/4', verify: () => eq(div(Q(1, 4), Q(1)), Q(1, 4)) },
    ],
    fixIdea: 'Переворачивают делитель — вторую дробь, на которую делят.',
    explainOptions: ['Переворачивают вторую дробь, а не первую', 'Переворачивают первую дробь', 'Ничего не переворачивают'],
  });
  bug({ topic: 'part-of', id: 'flip-fraction', kidName: 'Вывертень', title: 'Делит на числитель и умножает на знаменатель в прямой задаче',
    wrong: p => (p.kind === 'part' && p.N % p.a === 0 ? String((p.N / p.a) * p.b) : null),
    conflicts: [
      { text: 'По твоему половина от 10 = 10 : 1 · 2 = 20. Половина больше целого?', figure: art('полоска 1/2'), ask: 'Половина больше целого?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 10 / 1 * 2 > 10 },
      { text: 'По твоему треть от 9 = 9 : 1 · 3 = 27. У тебя 9 конфет — треть от них 27?', figure: art('полоска 1/3'), ask: 'Треть больше всех конфет?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 9 / 1 * 3 > 9 },
    ],
    fixIdea: 'Чтобы найти часть: дели на знаменатель, умножай на числитель.',
    explainOptions: ['Часть меньше целого: делим на знаменатель, умножаем на числитель', 'Делим на числитель', 'Умножаем на знаменатель'],
  });
  bug({ topic: 'part-of', id: 'only-one-step', kidName: 'Полдороги', title: 'Нашёл одну долю и остановился',
    wrong: p => (p.kind === 'part' && p.a !== 1 ? String(p.N / p.b) : p.kind === 'whole' && p.a !== 1 ? String(p.M / p.a) : null),
    conflicts: [
      { text: 'Ты нашёл 1/4 от 8 = 2. А просили 3/4 — три таких куска или один?', figure: art('полоска 3/4'), ask: 'Сколько кусков взять?', choices: ['1', '3'], right: '3', verify: () => 8 / 4 * 3 === 6 },
      { text: 'Ты нашёл 1/5 от 20 = 4. А просили 2/5. Сколько пятых долей нужно?', figure: art('полоска 2/5'), ask: 'Сколько пятых долей?', choices: ['1', '2'], right: '2', verify: () => 20 / 5 * 2 === 8 },
    ],
    fixIdea: 'Одна доля — это только полдороги. Возьми столько долей, сколько в числителе.',
    explainOptions: ['Нашёл одну долю, а надо взять столько, сколько в числителе', 'Одной доли достаточно', 'Надо было разделить ещё раз'],
  });
  bug({ topic: 'part-of', id: 'part-instead-of-whole', kidName: 'Путаник', title: 'В обратной задаче снова ищет часть',
    wrong: p => (p.kind === 'whole' && p.M % p.b === 0 && p.a !== p.b ? String((p.M / p.b) * p.a) : null),
    conflicts: [
      { text: '2/5 числа — это 10, а ты ответил 4. Целое может быть меньше своей части?', figure: art('полоска 2/5'), ask: 'Целое меньше части?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 4 < 10 },
      { text: 'Миша прочитал 6 страниц — это 1/2 книги. По твоему правилу в книге 3 страницы. Он прочитал больше, чем есть в книге?', figure: art('полоска 1/2'), ask: 'Так бывает?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 3 < 6 },
    ],
    fixIdea: 'Целое больше своей части: дели на числитель, умножай на знаменатель.',
    explainOptions: ['Целое должно быть больше части, значит делим на числитель', 'Ищем часть от числа', 'Умножаем на числитель'],
  });

  /* ---------- Ловушки ----------
     Задача темы, где неверное правило даёт правдоподобный ответ, отличный от верного
     и от ответов других жучков этой темы (иначе по ответу не понять, кто попался). */
  function plausible(raw, b) {
    if (raw === '<' || raw === '>' || raw === '=') return true;
    const m = String(raw).match(/^(-?\d+)(?:\/(\d+))?$/); if (!m) return false;
    const n = +m[1], d = m[2] == null ? 1 : +m[2];
    if (d === 0) return b.id === 'subtract-denominators';
    return n > 0 && d <= 30 && n <= 200;
  }
  function trapOf(b, lv, tries = 400) {
    return trapTry(b, lv, tries, true) || trapTry(b, lv, tries, false);
  }
  function trapTry(b, lv, tries, unique) {
    const gen = b.id === 'unequal-parts' ? () => P.conceptParts() : () => P[b.topic](b.trapLv || lv);
    const others = B.filter(o => o.topic === b.topic && o !== b);
    for (let i = 0; i < tries; i++) {
      const p = gen(); const w = b.wrong(p);
      if (w == null || !plausible(w, b)) continue;
      if (b.notation ? norm(w) === norm(p.answer) : sameValue(w, p)) continue;
      if (unique && others.some(o => { const ow = o.wrong(p); return ow != null && norm(ow) === norm(w); })) continue;
      if (unique && others.some(o => detectOne(o, p, w))) continue;
      b._lastTrap = p; return p;
    }
    return null;
  }

  /* ---------- Детектор уровня 1: по ответу ---------- */
  const norm = raw => String(raw).replace(/\s+/g, '').replace(/[−–]/g, '-');
  function rawValue(raw) {
    const r = R.evalLine(String(raw)); return r.ok ? r.value : null;
  }
  const sameValue = (raw, p) => { if (p.sign) return raw === p.sign; const v = rawValue(raw); return v && p.value && eq(v, p.value); };
  function detectOne(b, p, raw) {
    const w = b.wrong(p); if (w == null || raw == null) return false;
    if (b.notation || p.sign) return norm(raw) === norm(w);
    if (sameValue(raw, p)) return false; // верное значение — это не жучок
    const v = rawValue(raw), wv = rawValue(w);
    return !!(v && wv && eq(v, wv));
  }
  // → bug | null. Приоритет: точное совпадение записи, затем значение.
  function detectAnswer(p, raw) {
    if (raw == null || norm(raw) === norm(p.answer)) return null;
    const cand = B.filter(b => b.topic === p.topic && b.wrong(p) != null);
    return cand.find(b => norm(b.wrong(p)) === norm(raw) && (b.notation || !sameValue(raw, p)))
      || cand.find(b => detectOne(b, p, raw)) || null;
  }

  /* ---------- Детектор уровня 2: по шагу черновика ----------
     Строка «до» превращается в задачу-структуру; если неверное правило
     жучка от неё даёт строку «после» — жучок найден. */
  function fromLine(topic, line) {
    const pl = R.parseLine(line); if (!pl.ok || pl.neg) return null;
    const nm = pl.nums;
    if (nm.length === 1) {
      const t = nm[0];
      if (t.kind === 'mixed') return { topic, kind: 'mixed', w: t.w, n: t.n, d: t.d };
      if (t.kind === 'frac') return { topic, kind: 'frac', A: t.n, B: t.d };
      return null;
    }
    if (nm.length === 2 && nm.every(t => t.kind !== 'mixed')) return { topic, kind: 'binop', op: pl.ops[0], x: [nm[0].n, nm[0].d], y: [nm[1].n, nm[1].d] };
    return null;
  }
  function detectStep(topic, before, after) {
    const p = fromLine(topic, before); if (!p) return null;
    const ra = R.evalLine(after); const rb = R.evalLine(before);
    const pool = B.filter(b => b.line && (b.topic === topic || b.id === 'add-denominators'));
    for (const b of pool.filter(b => b.topic === topic).concat(pool.filter(b => b.topic !== topic))) {
      let w; try { w = b.wrong(p); } catch (e) { w = null; }
      if (w == null) continue;
      if (norm(after.replace(/^=\s*/, '')) === norm(w)) return b;
      if (!b.notation && ra.ok && rb.ok && !eq(ra.value, rb.value)) { const wv = rawValue(w); if (wv && eq(wv, ra.value)) return b; }
    }
    return null;
  }

  /* ---------- Верное решение и неверное решение Дробика ---------- */
  function solve(p) { return p.answer; }

  /* ---------- Совместимость с тренировкой ---------- */
  function toTask(p) {
    return {
      story: '', question: p.text, answer: p.answer, accept: p.sign ? 'exact' : 'equivalent',
      choices: p.sign ? ['<', '=', '>'] : undefined, hints: [], solution: `Ответ: ${p.answer}.`, xray: p,
      misc: got => { const b = detectAnswer(p, got && got.kind === 'sign' ? got.v : got && got.kind === 'frac' ? `${got.n}/${got.d}` : got ? String(got.v) : ''); return b ? b.id : null; },
    };
  }

  /* ---------- Достраиваем поля ---------- */
  const ex = s => s.replace(/\[\[[^\]]*\]\]/g, '').trim();
  for (const b of B) {
    b.trap = lv => trapOf(b, lv);
    b.key = `${b.topic}:${b.id}`;
    b.explainRight = 0; // explainOptions[0] — верное; интерфейс перемешивает
    b.lesson = [
      { kind: 'wrong', html: `<p>Дробик думает, что так можно:</p><p>${ex(b.conflicts[0].text).split('.')[0]}.</p>`, question: 'Согласны с Дробиком?' },
      { kind: 'conflict', html: `<p>${ex(b.conflicts[0].text)}</p>${b.conflicts[0].figure}`, question: b.conflicts[0].ask },
      { kind: 'fix', html: `<p><b>${b.fixIdea}</b></p>`, question: 'Решим вместе: ' + (() => { const p = trapOf(b, 2); return p ? p.text : ''; })(), answerHtml: (() => { const p = b._lastTrap; return p ? p.answer : ''; })() },
    ];
  }

  const byKey = Object.fromEntries(B.map(b => [b.key, b]));
  // caught(bug, p, raw) — попался ли ребёнок именно на этого жучка (для ловушек разминки)
  root.VEKTOR_BUGS = { caught: detectOne, list: B, byKey, ofTopic: t => B.filter(b => b.topic === t), problem, gen: P, solve, detectAnswer, detectStep, fromLine, toTask, norm };
})(typeof window !== 'undefined' ? window : globalThis);
