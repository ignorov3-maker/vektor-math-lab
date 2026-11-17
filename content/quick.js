/* Лёгкий старт: короткие уровни до дробей. Ответ — перетащить плитку (или нажать на неё).
   Задача уровня — первая победа без ощущения «я глупый», поэтому числа маленькие,
   а неверная плитка просто возвращается на место с подсказкой. */
(() => {
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // варианты: правильный ответ и соседи, без повторов и без нуля/отрицательных
  const around = (ans, n = 4, lo = 1) => {
    const set = new Set([ans]);
    for (const d of shuffle([-2, -1, 1, 2, 3, -3])) { if (set.size >= n) break; if (ans + d >= lo) set.add(ans + d); }
    return shuffle([...set]);
  };
  const LEVELS = [
    // первый уровень — проверка: что ребёнок уже знает, то пропускаем, чтобы не скучал
    { id: 'q-check', short: 'Что ты знаешь', title: 'Проверка знаний', check: true,
      plan: ['q-add', 'q-mult', 'q-seq', 'q-half', 'q-mult', 'q-seq'],
      say: 'Давай проверим твои прошлые знания! Что помнишь — перепрыгнем.' },
    { id: 'q-add', short: 'Сложение', title: 'Сложение', say: 'Разомнёмся: сложи два числа.',
      gen() { const a = rnd(1, 4), b = rnd(1, 5 - a); return { parts: [a, '+', b, '='], answer: a + b, tiles: [1, 2, 3, 4, 5], hint: `Отсчитай от ${a} ещё ${b}.` }; } },
    { id: 'q-mult', short: 'Умножение', title: 'Умножение', say: 'Умножение — это сложение одинаковых чисел.',
      gen() { const a = rnd(2, 5), b = rnd(2, 4); return { parts: [a, '×', b, '='], answer: a * b, tiles: around(a * b), hint: `Это ${Array(b).fill(a).join(' + ')}.` }; } },
    { id: 'q-seq', short: 'Числовой ряд', title: 'Что дальше?', say: 'Найди, на сколько растут числа.',
      gen() { const s = rnd(1, 5), d = rnd(1, 4), r = [s, s + d, s + 2 * d]; return { parts: [r[0] + ',', r[1] + ',', r[2] + ','], answer: s + 3 * d, tiles: around(s + 3 * d), hint: `Каждое следующее больше на ${d}.` }; } },
    { id: 'q-half', short: 'Половинки', title: 'Половина', say: 'Половина — это поровну на двоих.',
      gen() { const n = rnd(1, 6) * 2; return { parts: ['Половина от', n, '='], answer: n / 2, tiles: around(n / 2), hint: `Раздели ${n} поровну на двоих: сколько у каждого?` }; } },
  ];
  const PER_LEVEL = 5;
  const byId = Object.fromEntries(LEVELS.map(l => [l.id, l]));
  const count = l => (l.plan ? l.plan.length : PER_LEVEL);
  // задача k уровня; в проверке — по плану из разных уровней, с пометкой, откуда она
  const task = (l, k) => {
    const src = l.plan ? byId[l.plan[k % l.plan.length]] : l, t = src.gen();
    return { ...t, from: src.id, tiles: t.tiles.includes(t.answer) ? t.tiles : [...t.tiles, t.answer] };
  };
  window.VEKTOR_QUICK = { LEVELS, PER_LEVEL, byId, count, task };
})();
