/* =========================================================
   Курс m5n: фундамент начальной школы (4 класс) и натуральные числа (5 класс).
   Опора: ФРП «Математика. 5–9 классы (базовый уровень)», 5 класс,
   раздел «Натуральные числа и нуль»; для тем фундамента — ФРП НОО «Математика».
   Темы f4-* — «дыры с самого начала»: на них ссылаются root ошибок старших классов.
   Ошибки — классические, описанные в методике (перенос и заём в столбике,
   пропуск нуля в частном, порядок действий, 1 — простое число и т. п.).
   Формат — docs/content-spec.md. Тексты — черновик на вычитку методисту.
   ========================================================= */
(function () {
  'use strict';
  const K = window.VEKTOR_KIT, { rnd, pick, shuffle, L3, pl, num, ans } = K.h;
  const V = window.VEKTOR_VISUALS;

  /* ---------- Общие помощники ---------- */
  const dig = (n, i) => Math.floor(n / 10 ** i) % 10;          // цифра разряда i (0 — единицы)
  const dsum = n => String(n).split('').reduce((s, d) => s + +d, 0);
  const rub = k => pl(k, 'рубль', 'рубля', 'рублей');
  const raz = k => pl(k, 'раз', 'раза', 'раз');
  const ochk = k => pl(k, 'очко', 'очка', 'очков');
  const pickW = list => { const tot = list.reduce((s, [, w]) => s + w, 0); let r = Math.random() * tot; for (const [v, w] of list) { r -= w; if (r < 0) return v; } return list[list.length - 1][0]; };
  const rep = (k, x) => { let s = 0; for (let i = 0; i < k; i++) s += x; return s; }; // k раз по x — для verify
  const PLACE = { 10: 'десятков', 100: 'сотен', 1000: 'тысяч', 10000: 'десятков тысяч', 100000: 'сотен тысяч' };

  /* ---------- Числа словами (для записи многозначных чисел) ---------- */
  const U = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const UF = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const TEEN = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const HUND = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
  function w3(n, fem) {
    const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10, out = [];
    if (h) out.push(HUND[h]);
    if (t === 1) out.push(TEEN[u]); else { if (t) out.push(TENS[t]); if (u) out.push((fem ? UF : U)[u]); }
    return out.join(' ');
  }
  function words(n) {
    const th = Math.floor(n / 1000), r = n % 1000, out = [];
    if (th) out.push(w3(th, true) + ' ' + pl(th, 'тысяча', 'тысячи', 'тысяч'));
    if (r) out.push(w3(r, false));
    return out.join(' ');
  }
  // обратный разбор слов в число — независимая проверка для verify
  function fromWords(s) {
    const val = {};
    U.forEach((w, i) => { if (w) val[w] = i; }); UF.forEach((w, i) => { if (w) val[w] = i; });
    TEEN.forEach((w, i) => { val[w] = 10 + i; }); TENS.forEach((w, i) => { if (w) val[w] = 10 * i; }); HUND.forEach((w, i) => { if (w) val[w] = 100 * i; });
    let total = 0, cur = 0;
    for (const w of s.split(' ')) {
      if (/^тысяч/.test(w)) { total += (cur || 1) * 1000; cur = 0; } else if (val[w] != null) cur += val[w]; else return NaN;
    }
    return total + cur;
  }

  /* ---------- Рисунки курса ---------- */
  if (V && V.register) {
    const esc = V.esc || (s => String(s));
    const txt = (x, y, s) => `<text x="${x}" y="${y}" text-anchor="middle" fill="currentColor" stroke="none" font-size="13">${esc(s)}</text>`;
    const line = (x1, y1, x2, y2, w = 2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" fill="none" stroke="currentColor" stroke-width="${w}"/>`;
    const isInt = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;

    // Точки рядами: rows рядов по cols; первые mark рядов закрашены (остальные — контуром)
    const dotsDesc = f => `${f.rows} ${pl(f.rows, 'ряд', 'ряда', 'рядов')} по ${f.cols} ${pl(f.cols, 'точке', 'точки', 'точек')}${f.mark != null && f.mark < f.rows ? `, закрашено рядов: ${f.mark}` : ''}`;
    V.register('dots5n', {
      describe: dotsDesc,
      render: f => {
        if (!isInt(f.rows, 1, 12) || !isInt(f.cols, 1, 12)) return '';
        const s = 22, mark = f.mark == null ? f.rows : f.mark; let body = '';
        for (let r = 0; r < f.rows; r++) for (let c = 0; c < f.cols; c++)
          body += `<circle cx="${8 + s / 2 + c * s}" cy="${8 + s / 2 + r * s}" r="7" ${r < mark ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="2"'}/>`;
        return V.svgWrap(f.cols * s + 16, f.rows * s + 16, dotsDesc(f), body);
      },
    });

    // Сложение и вычитание столбиком: { a, b, op: '+' | '−', res?: число | '?', carry?: '1 ' — пометки над разрядами }
    const colDesc = f => `${f.a} ${f.op} ${f.b} столбиком${f.res != null ? ` = ${f.res}` : ''}`;
    V.register('column5n', {
      describe: colDesc,
      render: f => {
        if (!isInt(f.a, 0, 9999999) || !isInt(f.b, 0, 9999999) || !['+', '−'].includes(f.op)) return '';
        const A = String(f.a), B = String(f.b), R = f.res == null ? '' : String(f.res), C = f.carry ? String(f.carry) : '';
        const cols = Math.max(A.length, B.length, R.length) + 1, cw = 16, rh = 22, top = C ? 16 : 0;
        const right = 12 + cols * cw, W = right + 12, H = top + rh * 3 + 12;
        const row = (s, y) => s.split('').map((ch, i) => (ch === ' ' ? '' : txt(right - (s.length - i - 0.5) * cw, y, ch))).join('');
        let body = '';
        if (C) body += row(C, 14);
        body += row(A, top + rh) + row(B, top + 2 * rh) + txt(12 + cw / 2, top + 1.5 * rh + 5, f.op);
        body += line(10, top + 2 * rh + 7, right + 2, top + 2 * rh + 7);
        if (R) body += row(R, top + 3 * rh + 4);
        return V.svgWrap(W, H, colDesc(f), body);
      },
    });

    // Деление уголком: { n, d, hide? } — шаги считаются здесь же
    const ldSteps = (N, d) => {
      const s = String(N), rows = []; let i = 1, P = +s[0], q = '', showP = false;
      while (P < d && i < s.length) P = P * 10 + +s[i++];
      for (let g = 0; g < 12; g++) {
        const k = Math.floor(P / d), prod = k * d; q += k;
        if (showP) rows.push({ t: String(P), end: i - 1 });
        rows.push({ t: String(prod), end: i - 1, minus: true });
        const r = P - prod;
        if (i >= s.length) { rows.push({ t: String(r), end: i - 1 }); break; }
        P = r * 10 + +s[i++];
        while (P < d && i < s.length) { q += '0'; P = P * 10 + +s[i++]; }
        if (P < d) { q += '0'; rows.push({ t: String(P), end: i - 1 }); break; }
        showP = true;
      }
      return { q: +q, rows, s };
    };
    const ldDesc = f => `деление уголком: ${f.n} : ${f.d}${f.hide ? '' : ` = ${Math.floor(f.n / f.d)}`}`;
    V.register('longdiv5n', {
      describe: ldDesc,
      render: f => {
        if (!isInt(f.n, 1, 9999999) || !isInt(f.d, 1, 99) || f.n < f.d) return '';
        const { q, rows, s } = ldSteps(f.n, f.d), cw = 14, rh = 21, x0 = 6, L = s.length;
        const X = c => x0 + (c + 1.5) * cw, shown = f.hide ? [] : rows;
        let body = s.split('').map((ch, c) => txt(X(c), rh, ch)).join('');
        shown.forEach((r, j) => {
          const y = (j + 2) * rh, first = r.end - r.t.length + 1;
          body += r.t.split('').map((ch, c) => txt(X(first + c), y, ch)).join('');
          if (r.minus) { body += txt(X(first - 1), y - rh / 2 + 4, '−'); body += line(X(first) - cw / 2, y + 5, X(r.end) + cw / 2, y + 5, 1.5); }
        });
        const xv = x0 + (L + 1) * cw + 6, Q = f.hide ? '?' : String(q), D = String(f.d), wR = Math.max(D.length, Q.length) * cw + 14;
        body += line(xv, 4, xv, 2 * rh + 6) + line(xv, rh + 6, xv + wR, rh + 6);
        body += D.split('').map((ch, c) => txt(xv + 8 + (c + 0.5) * cw, rh, ch)).join('');
        body += Q.split('').map((ch, c) => txt(xv + 8 + (c + 0.5) * cw, 2 * rh + 3, ch)).join('');
        const H = (Math.max(shown.length, 1) + 1) * rh + 14;
        return V.svgWrap(Math.max(xv + wR + 8, 120), H, ldDesc(f), body);
      },
    });

    // Числовой луч: { start, step, n — делений всего, labels: [номера подписанных делений], mark, letter }
    const nlDesc = f => `числовой луч из ${f.n} делений; подписаны числа ${f.labels.map(i => num(f.start + i * f.step)).join(' и ')}; точка ${f.letter || 'A'} — на ${f.mark}-м делении от левого конца`;
    V.register('nline5n', {
      describe: nlDesc,
      render: f => {
        if (!isInt(f.n, 2, 20) || !isInt(f.mark, 0, f.n) || !Array.isArray(f.labels) || !f.labels.every(i => isInt(i, 0, f.n))) return '';
        if (!Number.isFinite(f.start) || !Number.isFinite(f.step) || f.step <= 0) return '';
        const X = i => 18 + i * (262 / f.n); let body = line(X(0) - 4, 40, 292, 40) + '<path d="M292 40l-8-5v10z" fill="currentColor" stroke="none"/>';
        for (let i = 0; i <= f.n; i++) { const big = f.labels.includes(i); body += line(X(i), big ? 32 : 35, X(i), big ? 48 : 45, big ? 2 : 1.5); }
        for (const i of f.labels) body += txt(X(i), 66, num(f.start + i * f.step));
        body += `<circle cx="${X(f.mark)}" cy="40" r="5" fill="currentColor" stroke="none"/>` + txt(X(f.mark), 22, f.letter || 'A');
        return V.svgWrap(300, 76, nlDesc(f), body);
      },
    });
  }

  /* ---------- Арифметика «как у ребёнка» (неверные правила) ---------- */
  // столбик: сложение без переноса, вычитание «меньшее из большего», заём без уменьшения старшего разряда
  const addNoCarry = (a, b) => { let r = 0; for (let i = 0; i < 8; i++) r += ((dig(a, i) + dig(b, i)) % 10) * 10 ** i; return r; };
  const subAbs = (a, b) => { let r = 0; for (let i = 0; i < 8; i++) r += Math.abs(dig(a, i) - dig(b, i)) * 10 ** i; return r; };
  const subNoReduce = (a, b) => { let r = 0; for (let i = 0; i < 8; i++) r += ((dig(a, i) - dig(b, i) + 10) % 10) * 10 ** i; return r; };
  const carries = (a, b) => { let c = 0, n = 0; for (let i = 0; i < 8; i++) { c = dig(a, i) + dig(b, i) + c >= 10 ? 1 : 0; n += c; } return n; };
  const borrows = (a, b) => { let br = 0, n = 0; for (let i = 0; i < 8; i++) { br = dig(a, i) - br - dig(b, i) < 0 ? 1 : 0; n += br; } return n; };
  const len = n => String(n).length;
  // деление уголком «с забытым остатком»: каждая следующая цифра делится сама по себе
  function forgotRem(N, d) {
    const s = String(N); let i = 1, P = +s[0], out = '';
    while (P < d && i < s.length) P = P * 10 + +s[i++];
    out += Math.floor(P / d);
    while (i < s.length) out += Math.floor(+s[i++] / d);
    return +out;
  }
  const dropZeros = q => +String(q).replace(/0/g, '');

  /* ---------- Порядок действий: вычисление выражения по разным «правилам» ---------- */
  const OPS = { '+': '+', '-': '−', '*': '·', ':': ':' };
  const showExpr = toks => toks.map(t => (typeof t === 'number' ? num(t) : OPS[t] || t)).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
  // mode: 'ok' — верно; 'ltr' — слева направо без приоритета (скобки соблюдает); 'nobr' — скобки не замечает;
  // 'fixed' — «умножение раньше деления, сложение раньше вычитания». null — если вышло не натуральное число.
  function evalT(tokens, mode) {
    const toks = mode === 'nobr' ? tokens.filter(t => t !== '(' && t !== ')') : tokens;
    const prec = mode === 'ltr' ? () => 1 : mode === 'fixed' ? o => ({ '-': 1, '+': 2, ':': 3, '*': 4 })[o] : o => (o === '+' || o === '-' ? 1 : 2);
    const out = [], ops = []; let bad = false;
    const apply = () => {
      const o = ops.pop(), b = out.pop(), a = out.pop(); let r;
      if (o === '+') r = a + b; else if (o === '-') r = a - b; else if (o === '*') r = a * b; else { if (!b || a % b) bad = true; r = a / b; }
      if (r < 0) bad = true; out.push(r);
    };
    for (const t of toks) {
      if (typeof t === 'number') out.push(t);
      else if (t === '(') ops.push(t);
      else if (t === ')') { while (ops[ops.length - 1] !== '(') apply(); ops.pop(); }
      else { while (ops.length && ops[ops.length - 1] !== '(' && prec(ops[ops.length - 1]) >= prec(t)) apply(); ops.push(t); }
    }
    while (ops.length) apply();
    return bad || !Number.isInteger(out[0]) ? null : out[0];
  }
  // пошаговое решение «как в тетради»: цепочка выражений и первое действие
  function stepsOf(tokens) {
    let t = tokens.slice(); const chain = [showExpr(t)]; let first = null;
    for (let g = 0; g < 20 && t.length > 1; g++) {
      let lo = 0, hi = t.length, open = -1;
      for (let i = 0; i < t.length; i++) { if (t[i] === '(') open = i; else if (t[i] === ')') { lo = open + 1; hi = i; break; } }
      let i = -1;
      for (let j = lo; j < hi; j++) if (t[j] === '*' || t[j] === ':') { i = j; break; }
      if (i < 0) for (let j = lo; j < hi; j++) if (t[j] === '+' || t[j] === '-') { i = j; break; }
      if (i < 0) break;
      const a = t[i - 1], o = t[i], b = t[i + 1], r = o === '+' ? a + b : o === '-' ? a - b : o === '*' ? a * b : a / b;
      if (!first) first = `${num(a)} ${OPS[o]} ${num(b)} = ${num(r)}`;
      t.splice(i - 1, 3, r);
      for (let j = 0; j + 2 < t.length; j++) if (t[j] === '(' && typeof t[j + 1] === 'number' && t[j + 2] === ')') t.splice(j, 3, t[j + 1]);
      chain.push(showExpr(t));
    }
    return { chain: chain.join(' = '), first };
  }
  // независимый пересчёт (рекурсивный спуск) — для verify
  function rdEval(toks) {
    let i = 0;
    const prim = () => { const t = toks[i++]; if (t === '(') { const v = sum(); i++; return v; } return t; };
    const prod = () => { let v = prim(); while (toks[i] === '*' || toks[i] === ':') { const o = toks[i++], w = prim(); v = o === '*' ? v * w : v / w; } return v; };
    const sum = () => { let v = prod(); while (toks[i] === '+' || toks[i] === '-') { const o = toks[i++], w = prod(); v = o === '+' ? v + w : v - w; } return v; };
    return sum();
  }

  /* ---------- Делимость ---------- */
  const isPrime = n => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
  const divisors = n => { const r = []; for (let i = 1; i <= n; i++) if (n % i === 0) r.push(i); return r; };
  const ODD_PRIMES = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
  const ODD_COMP = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69, 75, 77, 81, 85, 87, 91, 93, 95, 99];
  const EVEN_COMP = Array.from({ length: 48 }, (_, i) => 4 + 2 * i); // 4…98
  const upTo = (arr, max) => arr.filter(x => x <= max);

  /* =========================================================
     Темы
     ========================================================= */
  const topics = [

    /* 1. f4-table ------------------------------------------------ */
    {
      id: 'f4-table', grade: 4, strand: 'Фундамент начальной школы',
      short: 'Табл. умножения', title: 'Таблица умножения и деление',
      frp: ['НОО, 2–3 класс: табличное умножение и деление', '5 класс: Умножение натуральных чисел; свойства нуля и единицы при умножении. Деление как действие, обратное умножению. Компоненты действий, связь между ними'],
      goal: 'Без ошибок умножать и делить в пределах таблицы, находить неизвестный множитель и делимое, знать, что любое число, умноженное на 0, равно 0.',
      requires: [],
      explain: {
        model: 'В кинозале 6 рядов по 8 кресел. Пересчитывать каждое кресло долго — умножаем: 6 · 8 = 48. Забыл, сколько это? Шагни от того, что помнишь точно: 5 рядов по 8 — это 40, и ещё один ряд: 40 + 8 = 48. А деление — умножение наоборот: 48 кресел по 8 в ряду — это 48 : 8 = 6 рядов, ведь 6 · 8 = 48.',
        figure: { type: 'dots5n', rows: 6, cols: 8, mark: 5 },
        figureCaption: '5 закрашенных рядов по 8 — это 40, ещё один ряд — 48',
        rule: '<ul class="rule-list"><li><b>6 · 8</b> — это 8, взятое 6 раз: 8 + 8 + 8 + 8 + 8 + 8.</li><li>Забыл ответ — шагни от опоры: 5 · 8 = 40, значит 6 · 8 = 40 + 8 = 48, а 7 · 8 = 48 + 8 = 56.</li><li><b>Деление проверяют умножением</b>: 56 : 8 = 7, потому что 7 · 8 = 56.</li><li>Неизвестный множитель находят <b>делением</b>: ? · 6 = 42 → 42 : 6 = 7. Неизвестное делимое — <b>умножением</b>: ? : 3 = 9 → 9 · 3 = 27.</li><li>Умножение на 0 даёт <b>0</b>: 9 · 0 = 0. Не меняет число умножение на 1: 9 · 1 = 9.</li></ul>',
        examples: [
          { q: 'В коробке 7 рядов конфет по 8 штук. Сколько конфет в коробке?', fig: { type: 'dots5n', rows: 7, cols: 8, mark: 5 },
            choices: ['56', '48', '63'], correct: 0, wrong: { 1: 'table-neighbor', 2: 'table-neighbor' },
            steps: ['Опора: 5 · 8 = 40.', 'Ещё два ряда по 8: 40 + 8 + 8 = 56.', 'Ответ: 56 конфет.'] },
          { q: 'Задумали число, умножили его на 6 и получили 42. Какое число задумали?',
            choices: ['7', '252', '48'], correct: 0, wrong: { 1: 'inverse-same-op', 2: 'table-neighbor' },
            steps: ['Запишем: ? · 6 = 42. Неизвестен множитель.', 'Неизвестный множитель = произведение : известный множитель: 42 : 6 = 7.', 'Проверка: 7 · 6 = 42. Ответ: 7.'] },
          { q: 'В игре промах приносит 0 очков. Петя промахнулся 9 раз. Сколько очков дали ему за промахи?',
            choices: ['0', '9'], correct: 0, wrong: { 1: 'zero-keeps' },
            steps: ['9 раз по 0 очков: 0 + 0 + … + 0.', '9 · 0 = 0. Ответ: 0 очков.'] },
        ],
      },
      mistakes: [
        { id: 'table-neighbor', title: 'Путает соседние произведения в таблице', kidName: 'Соседушка',
          kidRule: 'ты берёшь ответ из соседней клетки таблицы: вместо 6 · 8 вспоминаешь 7 · 8',
          say: 'Твой ответ — из соседней клетки таблицы: множитель на один больше или меньше. Шагни от опоры, которую знаешь точно, например от 5 · 8 = 40.',
          fixIdea: 'Не угадывай по памяти — шагни от опоры: 5 · 8 = 40, каждый следующий ряд прибавляет ещё 8.',
          explainOptions: ['Ответ взят из соседней клетки таблицы: на один ряд больше или меньше', 'Таблица умножения у всех немного разная', 'Надо было сложить числа, а не умножать'],
          conflicts: [
            { text: 'По твоему правилу 6 · 8 = 56. Но 56 — это 7 рядов по 8, а рядов у нас 6. Опора: 5 рядов по 8 — это 40, плюс один ряд — 48.', ask: 'Сколько будет 6 · 8?', choices: ['48', '56'], right: '48',
              verify: () => 6 * 8 === 48 && 7 * 8 === 56 && 5 * 8 + 8 === 48, figure: { type: 'dots5n', rows: 6, cols: 8, mark: 5 } },
            { text: 'По твоему правилу 63 : 9 = 8. Проверим умножением: 8 · 9 = 72, а не 63.', ask: 'Подходит 8?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 8 * 9 === 72 && 7 * 9 === 63 },
          ] },
        { id: 'inverse-same-op', title: 'Ищет неизвестный компонент тем же действием, что в записи', kidName: 'Повторяшка',
          kidRule: 'ты видишь в условии «умножили» и тоже умножаешь, хотя ищешь неизвестный множитель',
          say: 'Ты ищешь неизвестное число, а делаешь то же действие, что в условии. Подставь свой ответ обратно — получится то, что дано?',
          fixIdea: 'Неизвестный множитель находят делением, неизвестное делимое — умножением. Ответ всегда проверяй подстановкой.',
          explainOptions: ['Неизвестное находят обратным действием: множитель — делением, делимое — умножением', 'Раз в условии «умножили», то и в решении нужно умножать', 'Нужно вычесть меньшее число из большего'],
          conflicts: [
            { text: 'Задумали число, умножили его на 6 — получили 42. По твоему правилу задумали 42 · 6 = 252. Подставь: 252 · 6 = 1512, а совсем не 42.', ask: 'Подходит число 252?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 252 * 6 === 1512 && 7 * 6 === 42 },
            { text: 'Задумали число, разделили его на 3 — получили 9. По твоему правилу задумали 9 : 3 = 3. Подставь: 3 : 3 = 1, а не 9.', ask: 'Подходит число 3?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 3 / 3 === 1 && 27 / 3 === 9 },
          ] },
        { id: 'zero-keeps', title: 'Считает, что умножение на 0 не меняет число', kidName: 'Ноль-невидимка',
          kidRule: 'ты думаешь, что ноль при умножении «не считается»: 9 · 0 = 9',
          say: 'Умножить на 0 — значит взять ноль раз или сложить одни нули. Сколько ни складывай нули, будет 0.',
          fixIdea: 'Любое число, умноженное на 0, равно 0. Число не меняют сложение с нулём и умножение на 1.',
          explainOptions: ['Сколько раз ни возьми по нулю — будет 0', 'Ноль ничего не меняет, поэтому 9 · 0 = 9', 'При умножении на 0 всегда получается 1'],
          conflicts: [
            { text: 'По твоему правилу 5 · 0 = 5. Но 5 · 0 — это пять раз по нулю: 0 + 0 + 0 + 0 + 0.', ask: 'Сколько получится?', choices: ['0', '5'], right: '0', verify: () => 5 * 0 === 0 },
            { text: 'В пяти пустых коробках по 0 конфет. По твоему правилу конфет 5 · 0 = 5. Откуда они взялись, если коробки пустые?', ask: 'Сколько конфет в пустых коробках?', choices: ['0', '5'], right: '0', verify: () => 0 + 0 + 0 + 0 + 0 === 0 },
          ] },
      ],
      generate(lv) {
        const type = pick(L3(lv, ['mul', 'mul', 'div', 'inv', 'zero'], ['mul', 'div', 'inv', 'inv', 'zero'], ['mul3', 'mul3', 'div', 'inv', 'zero']));
        const big = () => rnd(6, 9);
        const pair = () => (lv === 1 ? [rnd(2, 5), rnd(2, 9)] : [big(), big()]);
        const shift = a => (a >= 9 ? -1 : a <= 2 ? 1 : pick([-1, 1]));            // соседняя клетка таблицы
        const anchor = (a, b) => (a > 5 ? `Опора: 5 · ${num(b)} = ${num(5 * b)}. Добавь ещё ${num(a - 5)} ${raz(a - 5)} по ${num(b)}.`
          : a === 5 ? `5 · ${num(b)} — это половина от 10 · ${num(b)} = ${num(10 * b)}.` : `Сложи: ${Array(a).fill(num(b)).join(' + ')}.`);

        if (type === 'mul' || type === 'mul3') {
          const [a, b] = pair(), ab = a * b, s = shift(a), nb = (a + s) * b;
          if (type === 'mul3') {
            const kind = pick(['seats', 'packs', 'teams']);
            const c = kind === 'seats' ? rnd(3, ab - 10) : kind === 'packs' ? rnd(3, 19) : rnd(2, 6), sg = kind === 'seats' ? -1 : 1, res = ab + sg * c;
            const st = kind === 'seats'
              ? { story: `В кинозале ${num(a)} ${pl(a, 'ряд', 'ряда', 'рядов')} по ${num(b)} ${pl(b, 'кресло', 'кресла', 'кресел')}. Зрители уже заняли ${num(c)} ${pl(c, 'кресло', 'кресла', 'кресел')}.`, question: 'Сколько кресел осталось свободными?' }
              : kind === 'packs'
                ? { story: `Купили ${num(a)} ${pl(a, 'пачку', 'пачки', 'пачек')} по ${num(b)} ${pl(b, 'карандашу', 'карандаша', 'карандашей')} и ещё ${num(c)} ${pl(c, 'карандаш', 'карандаша', 'карандашей')} поштучно.`, question: 'Сколько всего карандашей купили?' }
                : { story: `На турнир приехали ${num(a)} ${pl(a, 'команда', 'команды', 'команд')} по ${num(b)} ${pl(b, 'игроку', 'игрока', 'игроков')} и ${num(c)} ${pl(c, 'судья', 'судьи', 'судей')}.`, question: 'Сколько всего человек приехало на турнир?' };
            return Object.assign(st, {
              answer: ans(res),
              hints: [`Сначала найди, сколько всего ${kind === 'seats' ? 'кресел' : kind === 'packs' ? 'карандашей в пачках' : 'игроков'}: ${num(a)} · ${num(b)}.`, anchor(a, b)],
              solution: `${num(a)} · ${num(b)} = ${num(ab)}; ${num(ab)} ${sg < 0 ? '−' : '+'} ${num(c)} = ${num(res)}. Ответ: ${num(res)}.`,
              wrongs: { 'table-neighbor': ans(nb + sg * c) },
              data: { type, a, b, c: sg * c },
            });
          }
          const ctx = pick([
            () => ({ story: `В кинозале ${num(a)} ${pl(a, 'ряд', 'ряда', 'рядов')}, в каждом по ${num(b)} ${pl(b, 'кресло', 'кресла', 'кресел')}.`, question: 'Сколько всего кресел в зале?' }),
            () => ({ story: `На турнир приехали ${num(a)} ${pl(a, 'команда', 'команды', 'команд')} по ${num(b)} ${pl(b, 'игроку', 'игрока', 'игроков')}.`, question: 'Сколько всего игроков на турнире?' }),
            () => ({ story: `Одна тетрадь стоит ${num(b)} ${rub(b)}.`, question: `Сколько рублей стоят ${num(a)} ${pl(a, 'такая тетрадь', 'такие тетради', 'таких тетрадей')}?` }),
            () => ({ story: `В одной пачке ${num(b)} ${pl(b, 'карандаш', 'карандаша', 'карандашей')}. Купили ${num(a)} ${pl(a, 'пачку', 'пачки', 'пачек')}.`, question: 'Сколько карандашей купили?' }),
            () => ({ story: `Туристы шли пешком ${num(a)} ${pl(a, 'день', 'дня', 'дней')} и каждый день проходили по ${num(b)} км.`, question: 'Сколько километров они прошли?' }),
            () => ({ story: 'Найди произведение.', question: `${num(a)} · ${num(b)} = ?` }),
          ])();
          return Object.assign(ctx, {
            figure: lv === 1 && Math.random() < 0.4 ? { type: 'dots5n', rows: a, cols: b } : undefined,
            answer: ans(ab),
            hints: [`Здесь ${num(a)} ${raz(a)} по ${num(b)} — это умножение ${num(a)} · ${num(b)}.`, anchor(a, b)],
            solution: `${num(a)} · ${num(b)} = ${num(ab)}. Ответ: ${num(ab)}.`,
            wrongs: { 'table-neighbor': ans(nb) },
            data: { type: 'mul', a, b },
          });
        }
        if (type === 'div') {
          const [a, b] = pair(), total = a * b, s = shift(a);
          const ctx = pick([
            () => ({ story: `${num(total)} ${pl(total, 'карандаш', 'карандаша', 'карандашей')} разложили поровну в ${num(b)} ${pl(b, 'коробку', 'коробки', 'коробок')}.`, question: 'Сколько карандашей в каждой коробке?' }),
            () => ({ story: `${num(total)} ${pl(total, 'ученика', 'учеников', 'учеников').replace(/^ученика$/, 'ученик')} разбили на ${num(b)} ${pl(b, 'равную команду', 'равные команды', 'равных команд')}.`, question: 'Сколько человек в каждой команде?' }),
            () => ({ story: `${num(total)} ${pl(total, 'стул', 'стула', 'стульев')} расставили в ${num(b)} одинаковых ${pl(b, 'ряд', 'ряда', 'рядов')}.`, question: 'Сколько стульев в каждом ряду?' }),
            () => ({ story: `Набор из ${num(total)} ${pl(total, 'наклейки', 'наклеек', 'наклеек')} поровну поделили между ${num(b)} друзьями.`, question: 'Сколько наклеек досталось каждому?' }),
            () => ({ story: `Туристы прошли ${num(total)} км за ${num(b)} ${pl(b, 'день', 'дня', 'дней')}, каждый день поровну.`, question: 'Сколько километров они проходили за день?' }),
            () => ({ story: 'Найди частное.', question: `${num(total)} : ${num(b)} = ?` }),
          ])();
          return Object.assign(ctx, {
            answer: ans(a),
            hints: [`Деление проверяют умножением: на какое число нужно умножить ${num(b)}, чтобы получилось ${num(total)}?`, `Иди по строке таблицы на ${num(b)}: ${num(b)} · ${num(a - 1)} = ${num(b * (a - 1))}, а следующее — ${num(b)} · ${num(a)} = ?`],
            solution: `${num(total)} : ${num(b)} = ${num(a)}, потому что ${num(a)} · ${num(b)} = ${num(total)}. Ответ: ${num(a)}.`,
            wrongs: { 'table-neighbor': ans(a + s) },
            data: { type: 'div', total, b },
          });
        }
        if (type === 'inv') {
          if (Math.random() < 0.6) { // неизвестный множитель
            const [a, b] = pair(), c = a * b, s = shift(a);
            const st = Math.random() < 0.5
              ? { story: `Задумали число, умножили его на ${num(b)} и получили ${num(c)}.`, question: 'Какое число задумали?' }
              : { story: '', question: `Какое число нужно умножить на ${num(b)}, чтобы получилось ${num(c)}?` };
            return Object.assign(st, {
              answer: ans(a),
              hints: ['Неизвестный множитель находят делением: произведение делят на известный множитель.', `Нужно ${num(c)} : ${num(b)}. Проверь ответ умножением.`],
              solution: `? · ${num(b)} = ${num(c)}, значит ? = ${num(c)} : ${num(b)} = ${num(a)}. Проверка: ${num(a)} · ${num(b)} = ${num(c)}.`,
              wrongs: { 'inverse-same-op': ans(c * b), 'table-neighbor': ans(a + s) },
              data: { type: 'factor', c, b },
            });
          }
          const [b, c] = pick([[2, 4], [2, 6], [2, 8], [3, 6], [3, 9], [4, 8]]), x = b * c; // неизвестное делимое
          return {
            story: `Задумали число, разделили его на ${num(b)} и получили ${num(c)}.`, question: 'Какое число задумали?',
            answer: ans(x),
            hints: ['Неизвестное делимое находят умножением: частное умножают на делитель.', `Нужно ${num(c)} · ${num(b)}. Проверь делением.`],
            solution: `? : ${num(b)} = ${num(c)}, значит ? = ${num(c)} · ${num(b)} = ${num(x)}. Проверка: ${num(x)} : ${num(b)} = ${num(c)}.`,
            wrongs: { 'inverse-same-op': ans(c / b), 'table-neighbor': ans((c + shift(c)) * b) },
            data: { type: 'dividend', b, c },
          };
        }
        // zero
        if (Math.random() < 0.55) {
          const p = lv === 1 ? rnd(2, 5) : rnd(3, 9), k = rnd(2, 9), m = rnd(2, 9), who = pick(['Ваня', 'Оля', 'Дима', 'Аня']);
          const fem = who === 'Оля' || who === 'Аня';
          return {
            story: `В игре за каждое попадание дают ${num(p)} ${ochk(p)}, а за промах — 0 очков. ${who} ${fem ? 'попала' : 'попал'} ${num(k)} ${raz(k)} и ${fem ? 'промахнулась' : 'промахнулся'} ${num(m)} ${raz(m)}.`,
            question: `Сколько очков ${fem ? 'набрала' : 'набрал'} ${who === 'Ваня' ? 'Ваня' : who}?`,
            answer: ans(p * k),
            hints: [`Сколько очков дали за промахи? Это ${num(m)} · 0.`, `За попадания: ${num(k)} · ${num(p)} = ${num(k * p)}. За промахи: ${num(m)} · 0 = 0.`],
            solution: `${num(k)} · ${num(p)} + ${num(m)} · 0 = ${num(k * p)} + 0 = ${num(k * p)}. Ответ: ${num(k * p)}.`,
            wrongs: { 'zero-keeps': ans(p * k + m) },
            data: { type: 'game', p, k, m },
          };
        }
        const a = rnd(2, 9), c = rnd(2, 9); let b; do { b = rnd(2, 9); } while (b === a);
        if (Math.random() < 0.5) return {
          story: 'Найди значение выражения.', question: `${num(a)} · 0 + ${num(b)} · 1 = ?`,
          answer: ans(b),
          hints: ['Чему равно любое число, умноженное на 0? А на 1?', `${num(a)} · 0 = 0, ${num(b)} · 1 = ${num(b)}.`],
          solution: `${num(a)} · 0 + ${num(b)} · 1 = 0 + ${num(b)} = ${num(b)}.`,
          wrongs: { 'zero-keeps': ans(a + b) },
          data: { type: 'expr0', a, b },
        };
        return {
          story: 'Найди значение выражения.', question: `${num(a)} · ${num(b)} + ${num(c)} · 0 = ?`,
          answer: ans(a * b),
          hints: ['Сначала умножение. Чему равно число, умноженное на 0?', `${num(a)} · ${num(b)} = ${num(a * b)}, ${num(c)} · 0 = 0.`],
          solution: `${num(a * b)} + 0 = ${num(a * b)}.`,
          wrongs: { 'zero-keeps': ans(a * b + c) },
          data: { type: 'expr1', a, b, c },
        };
      },
      verify(t) {
        const d = t.data, findQ = (total, b) => { for (let q = 0; q <= total; q++) if (rep(q, b) === total) return q; return NaN; };
        const r = {
          mul: () => rep(d.a, d.b), mul3: () => rep(d.a, d.b) + d.c, div: () => findQ(d.total, d.b), factor: () => findQ(d.c, d.b),
          dividend: () => rep(d.c, d.b), game: () => rep(d.k, d.p) + rep(d.m, 0), expr0: () => rep(d.a, 0) + rep(d.b, 1), expr1: () => rep(d.a, d.b) + rep(d.c, 0),
        }[d.type]();
        return r === +t.answer;
      },
    },

    /* 2. f4-column ------------------------------------------------ */
    {
      id: 'f4-column', grade: 4, strand: 'Фундамент начальной школы',
      short: 'Столбиком', title: 'Сложение и вычитание столбиком',
      frp: ['НОО, 3–4 класс: письменное сложение и вычитание многозначных чисел', '5 класс: Сложение натуральных чисел. Вычитание как действие, обратное сложению. Проверка результата арифметического действия'],
      goal: 'Складывать и вычитать многозначные числа столбиком: переносить десяток, занимать у старшего разряда и проверять разность сложением.',
      requires: [],
      explain: {
        model: 'У Оли 47 наклеек, подруга подарила ей ещё 38. Складываем столбиком, начиная с единиц: 7 + 8 = 15. Пятёрку пишем под единицами, а целый десяток переносим — ставим маленькую 1 над десятками. Десятки: 4 + 3 = 7 и ещё перенесённый — 8. Всего 85 наклеек.',
        figure: { type: 'column5n', a: 47, b: 38, op: '+', res: 85, carry: '1 ' },
        figureCaption: 'Маленькая 1 над десятками — перенесённый десяток',
        rule: '<ul class="rule-list"><li>Пиши разряд под разрядом: единицы под единицами, десятки под десятками.</li><li>Считай <b>справа налево</b>, с единиц.</li><li><b>Сложение:</b> если в разряде вышло 10 или больше, пиши последнюю цифру, а 1 <b>переноси</b> в следующий разряд.</li><li><b>Вычитание:</b> если верхняя цифра меньше нижней, <b>займи</b> 1 у соседнего старшего разряда: здесь станет на 10 больше, а там — на 1 меньше. Не забудь его уменьшить!</li><li>Проверка: разность + вычитаемое = уменьшаемое.</li></ul>',
        examples: [
          { q: '54 − 27 = ?', fig: { type: 'column5n', a: 54, b: 27, op: '−', res: '?' },
            choices: ['27', '33', '37'], correct: 0, wrong: { 1: 'smaller-from-larger', 2: 'borrow-not-reduced' },
            steps: ['Единицы: 4 меньше 7 — занимаем десяток. Десятков было 5, стало 4, а единиц стало 14.', '14 − 7 = 7.', 'Десятки: 4 − 2 = 2 (один десяток мы заняли).', 'Ответ: 27. Проверка: 27 + 27 = 54.'] },
          { q: 'В библиотеке 365 учебников и 258 книг для чтения. Сколько всего книг?', fig: { type: 'column5n', a: 365, b: 258, op: '+', res: '?' },
            choices: ['623', '513', '613'], correct: 0, wrong: { 1: 'no-carry', 2: 'no-carry' },
            steps: ['Единицы: 5 + 8 = 13 — пишем 3, десяток переносим.', 'Десятки: 6 + 5 + 1 = 12 — пишем 2, сотню переносим.', 'Сотни: 3 + 2 + 1 = 6.', 'Ответ: 623 книги.'] },
        ],
      },
      mistakes: [
        { id: 'no-carry', title: 'Забывает перенести десяток при сложении', kidName: 'Забывашка',
          kidRule: 'ты пишешь под разрядом последнюю цифру суммы, а лишний десяток теряешь',
          say: 'В каком-то разряде вышло 10 или больше, а перенесённая единица в следующий разряд не попала. Отмечай перенос маленькой цифрой сверху.',
          fixIdea: 'Вышло в разряде 10 или больше — пиши последнюю цифру, а 1 переноси в соседний слева разряд и прибавь её там.',
          explainOptions: ['Десяток из суммы единиц потерялся — его надо прибавить к десяткам', 'В каждом разряде пишут только последнюю цифру, остальное не важно', 'Складывать надо слева направо'],
          conflicts: [
            { text: 'По твоему правилу 47 + 38 = 75. Но уже 47 + 30 = 77, а мы прибавили ещё 8. Сумма не может стать меньше!', ask: 'Может 47 + 38 быть меньше 77?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 47 + 30 === 77 && 47 + 38 === 85 && 75 < 77 },
          ] },
        { id: 'smaller-from-larger', title: 'В разряде вычитает меньшую цифру из большей', kidName: 'Переворачиватель',
          kidRule: 'ты в каждом разряде вычитаешь из большей цифры меньшую, даже если большая — снизу',
          say: 'Вычитать нужно нижнюю цифру из верхней. Если верхняя меньше — займи десяток у соседнего разряда, а не переворачивай цифры.',
          fixIdea: 'Вычитаем всегда нижнее из верхнего. Верхняя цифра меньше — занимаем 1 у старшего разряда: здесь +10, там −1.',
          explainOptions: ['Вычитать нужно нижнее из верхнего, а если не хватает — занимать десяток', 'Из большего всегда вычитают меньшее, где бы оно ни стояло', 'Если сверху меньше, разряд можно пропустить'],
          conflicts: [
            { text: 'По твоему правилу 54 − 27 = 33. Проверим сложением: 33 + 27 = 60, а должно получиться 54.', ask: 'Верно, что 54 − 27 = 33?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 33 + 27 === 60 && 54 - 27 === 27 },
          ] },
        { id: 'borrow-not-reduced', title: 'Занимает десяток, но не уменьшает старший разряд', kidName: 'Должник',
          kidRule: 'ты занимаешь десяток у соседа, а потом забываешь, что у него стало на 1 меньше',
          say: 'Десяток ты занял — значит, в старшем разряде стало на 1 меньше. Поставь над ним точку и не забудь её учесть.',
          fixIdea: 'Занял у соседнего разряда — уменьши его на 1. Ставь точку над цифрой, у которой занимаешь.',
          explainOptions: ['Занятый десяток надо вычесть из старшего разряда', 'Занимать можно бесплатно, старший разряд не меняется', 'Занятый десяток прибавляют к ответу в конце'],
          conflicts: [
            { text: 'По твоему правилу 54 − 27 = 37. Проверка: 37 + 27 = 64, а было 54 — лишний десяток взялся из ниоткуда.', ask: 'Подходит 37?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 37 + 27 === 64 && 54 - 27 === 27 },
          ] },
      ],
      generate(lv) {
        const plus = Math.random() < (lv === 1 ? 0.5 : 0.4);
        let a, b;
        for (let g = 0; g < 2000; g++) {
          if (plus) {
            [a, b] = L3(lv, [rnd(12, 79), rnd(12, 79)], [rnd(100, 799), rnd(Math.random() < 0.3 ? 12 : 100, 699)], [rnd(1000, 6999), rnd(Math.random() < 0.4 ? 100 : 1000, 2999)]);
            const L = len(a), c = carries(a, b), topOk = dig(a, L - 1) + dig(b, L - 1) + (dig(a, L - 2) + dig(b, L - 2) >= 9 ? 1 : 0) <= 9;
            if (len(a + b) !== L || !topOk) continue;
            if (c >= L3(lv, 1, 1, 2) && c <= L3(lv, 1, 2, 3)) break;
          } else {
            if (lv === 3 && Math.random() < 0.7) { // уменьшаемое с нулями: заём «через ноль»
              const D = rnd(2, 9); a = D * 1000 + pick([0, rnd(1, 9), rnd(1, 9) * 10, rnd(1, 9) * 10 + rnd(1, 9)]); b = rnd(100, a - 1 - (a % 1000 === 0 ? 0 : 0));
            } else [a, b] = L3(lv, [rnd(30, 98), rnd(11, 89)], [rnd(200, 989), rnd(Math.random() < 0.3 ? 12 : 100, 899)], [rnd(1000, 9898), rnd(100, 8999)]);
            if (b >= a) continue;
            const L = len(a), topA = dig(a, L - 1), topB = len(b) === L ? dig(b, L - 1) : 0;
            if (topA <= topB) continue;
            const br = borrows(a, b);
            if (br >= L3(lv, 1, 1, 2) && br <= L3(lv, 1, 2, 3) && subAbs(a, b) !== a - b) break;
          }
        }
        const op = plus ? '+' : '−', res = plus ? a + b : a - b, w = {};
        if (plus) w['no-carry'] = ans(addNoCarry(a, b));
        else {
          if (subAbs(a, b) !== res) w['smaller-from-larger'] = ans(subAbs(a, b));
          if (subNoReduce(a, b) !== res && subNoReduce(a, b) !== subAbs(a, b)) w['borrow-not-reduced'] = ans(subNoReduce(a, b));
        }
        const pure = Math.random() < 0.35;
        let ctx;
        if (pure) ctx = { story: plus ? 'Сложи столбиком.' : 'Вычти столбиком.', question: `${num(a)} ${op} ${num(b)} = ?`, figure: { type: 'column5n', a, b, op, res: '?' } };
        else if (plus) ctx = pick([
          () => ({ story: `В первый день туристы проехали ${num(a)} км, во второй — ${num(b)} км.`, question: 'Сколько километров они проехали за два дня?' }),
          () => ({ story: `В школьной библиотеке ${num(a)} ${pl(a, 'учебник', 'учебника', 'учебников')} и ${num(b)} ${pl(b, 'книга', 'книги', 'книг')} для чтения.`, question: 'Сколько всего книг в библиотеке?' }),
          () => ({ story: `Число зрителей на первом матче — ${num(a)}, на втором — ${num(b)}.`, question: 'Сколько зрителей было на двух матчах вместе?' }),
          () => { const [x, y] = a < 100 ? ['сок', 'булочку'] : a < 1000 ? ['футболку', 'кепку'] : ['велосипед', 'шлем'];
            return { story: `Папа купил ${x} за ${num(a)} ${rub(a)} и ${y} за ${num(b)} ${rub(b)}.`, question: 'Сколько рублей он заплатил?' }; },
        ])();
        else ctx = pick([
          () => { const x = b < 100 ? 'сок' : b < 1000 ? 'книгу' : 'кроссовки';
            return { story: `В кошельке у Маши ${num(a)} ${rub(a)}. Она купила ${x} за ${num(b)} ${rub(b)}.`, question: 'Сколько рублей у неё осталось?' }; },
          () => (a < 1000 ? { story: `В книге ${num(a)} ${pl(a, 'страница', 'страницы', 'страниц')}. Петя прочитал ${num(b)}.`, question: 'Сколько страниц ему осталось прочитать?' }
            : { story: `В городе ${num(a)} ${pl(a, 'дерево', 'дерева', 'деревьев')}. Весной ${num(b)} из них побелили.`, question: 'Сколько деревьев осталось побелить?' }),
          () => { const who = a < 100 ? 'Велосипедист' : a < 1000 ? 'Автобус' : 'Поезд';
            return { story: `${who} должен проехать ${num(a)} км. Он уже проехал ${num(b)} км.`, question: 'Сколько километров осталось проехать?' }; },
          () => ({ story: `В игре у Ани ${num(a)} ${ochk(a)}, у Димы — ${num(b)}.`, question: 'На сколько очков у Ани больше?' }),
        ])();
        return Object.assign(ctx, {
          answer: ans(res),
          hints: plus
            ? ['Запиши числа разряд под разрядом и складывай с единиц. Где вышло 10 или больше — переноси 1.', `Единицы: ${num(dig(a, 0))} + ${num(dig(b, 0))} = ${num(dig(a, 0) + dig(b, 0))}. Не забывай переносы в следующие разряды.`]
            : ['Вычитай с единиц нижнее из верхнего. Не хватает — займи десяток у соседа слева и уменьши его на 1.', `Проверь себя сложением: ответ + ${num(b)} должно дать ${num(a)}.`],
          solution: plus ? `${num(a)} + ${num(b)} = ${num(res)}.` : `${num(a)} − ${num(b)} = ${num(res)}. Проверка: ${num(res)} + ${num(b)} = ${num(a)}.`,
          wrongs: w,
          data: { op: plus ? '+' : '-', a, b },
        });
      },
      verify(t) {
        const { op, a, b } = t.data;
        let r = 0, c = 0; // поразрядно, «как в тетради»
        for (let i = 0; i < 8; i++) {
          let x = op === '+' ? dig(a, i) + dig(b, i) + c : dig(a, i) - dig(b, i) - c;
          if (op === '+') { c = x >= 10 ? 1 : 0; x -= 10 * c; } else { c = x < 0 ? 1 : 0; x += 10 * c; }
          r += x * 10 ** i;
        }
        const res = +t.answer;
        return c === 0 && r === res && (op === '+' ? res - b === a : res + b === a);
      },
    },

    /* 3. f4-longdiv ------------------------------------------------ */
    {
      id: 'f4-longdiv', grade: 4, strand: 'Фундамент начальной школы',
      short: 'Деление уголком', title: 'Деление уголком на однозначное и двузначное число',
      frp: ['НОО, 4 класс: письменное деление на однозначное и двузначное число', '5 класс: Деление как действие, обратное умножению. Проверка результата арифметического действия'],
      goal: 'Делить уголком на однозначное и двузначное число, заранее определять число цифр частного и не терять нули в частном.',
      requires: ['f4-table'],
      explain: {
        model: 'Семья проехала 816 км за 8 дней, каждый день поровну. Делим уголком: 8 сотен на 8 — по 1 сотне. Дальше 1 десяток на 8 не делится — значит, десятков в частном 0, так и пишем! Сносим 6: 16 единиц на 8 — по 2. Ответ: 102 км в день, а не 12.',
        figure: { type: 'longdiv5n', n: 816, d: 8 },
        figureCaption: 'Каждой снесённой цифре — своя цифра частного, даже если это 0',
        rule: '<ul class="rule-list"><li>Найди <b>первое неполное делимое</b> — самое короткое начало числа, которое не меньше делителя.</li><li>Сразу прикинь, <b>сколько цифр будет в частном</b>: одна за неполное делимое и по одной за каждую оставшуюся цифру.</li><li>Каждый шаг: делим — умножаем — вычитаем — <b>к остатку</b> сносим следующую цифру.</li><li>Если после сноса число меньше делителя — пиши в частное <b>0</b> и сноси следующую цифру.</li><li>Проверка: частное · делитель = делимое.</li></ul>',
        examples: [
          { q: '816 : 8 = ?', fig: { type: 'longdiv5n', n: 816, d: 8, hide: true },
            choices: ['102', '12', '100'], correct: 0, wrong: { 1: 'lost-zero', 2: 'forgot-remainder' },
            steps: ['Первое неполное делимое — 8 сотен, значит, в частном 3 цифры.', '8 : 8 = 1. Сносим 1: 1 на 8 не делится — пишем в частное 0.', 'Сносим 6: 16 : 8 = 2.', 'Ответ: 102. Проверка: 102 · 8 = 816.'] },
          { q: '96 : 4 = ?', fig: { type: 'longdiv5n', n: 96, d: 4 },
            choices: ['24', '21'], correct: 0, wrong: { 1: 'forgot-remainder' },
            steps: ['9 : 4 = 2, остаток 9 − 8 = 1.', 'К остатку 1 сносим 6 — получается 16, а не просто 6!', '16 : 4 = 4. Ответ: 24. Проверка: 24 · 4 = 96.'] },
        ],
      },
      mistakes: [
        { id: 'lost-zero', title: 'Пропускает ноль в частном', kidName: 'Нулеед',
          kidRule: 'ты не пишешь 0 в частное, когда снесённое число меньше делителя',
          say: 'В частном не хватает цифры: когда снесённое число меньше делителя, в частное нужно записать 0. Прикинь заранее, сколько цифр должно быть в ответе.',
          fixIdea: 'Перед делением прикинь число цифр частного. Не делится — пиши 0 и сноси следующую цифру.',
          explainOptions: ['Пропущен 0 в частном — цифр в ответе меньше, чем нужно', 'Нули в частном можно не писать — они ничего не значат', 'Ноль пишут только в конце частного'],
          conflicts: [
            { text: 'По твоему правилу 816 : 8 = 12. Проверим умножением: 12 · 8 = 96 — это даже не сотня, а делили 816.', ask: 'Подходит 12?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 12 * 8 === 96 && 102 * 8 === 816 },
            { text: 'По твоему правилу 840 : 4 = 21. Но 21 · 4 = 84 — в десять раз меньше, чем 840.', ask: 'Сколько будет 840 : 4?', choices: ['210', '21'], right: '210', verify: () => 21 * 4 === 84 && 210 * 4 === 840 },
          ] },
        { id: 'forgot-remainder', title: 'Сносит цифру, забыв про остаток (ошибка в неполном делимом)', kidName: 'Потеряшка',
          kidRule: 'ты делишь каждую снесённую цифру саму по себе и забываешь приписать её к остатку',
          say: 'После вычитания остался остаток — следующую цифру нужно приписать к нему, а не делить отдельно. Проверь ответ умножением.',
          fixIdea: 'Новое неполное делимое = остаток и снесённая к нему цифра. Остаток никуда не исчезает.',
          explainOptions: ['Цифру сносят к остатку — вместе они образуют новое неполное делимое', 'Каждую цифру делимого делят отдельно', 'Остаток в середине деления можно отбросить'],
          conflicts: [
            { text: 'По твоему правилу 96 : 4 = 21. Проверка: 21 · 4 = 84, а не 96 — куда-то пропали 12.', ask: 'Подходит 21?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 21 * 4 === 84 && 24 * 4 === 96 },
          ] },
      ],
      generate(lv) {
        let d, q, N;
        const zeroP = L3(lv, 0.45, 0.7, 0.65);
        const mkQ = (lo, hi, wantZero) => { for (let g = 0; g < 500; g++) { const x = rnd(lo, hi); if (String(x).slice(1).includes('0') === wantZero) return x; } return rnd(lo, hi); };
        for (let g = 0; g < 1000; g++) {
          const z = Math.random() < zeroP;
          if (lv === 1) { d = rnd(2, 9); q = mkQ(Math.ceil(100 / d), Math.floor(999 / d), z); }
          else if (lv === 2) { d = rnd(3, 9); q = mkQ(Math.max(100, Math.ceil(1000 / d)), Math.floor(9999 / d), z); }
          else { d = pick([12, 13, 14, 15, 16, 18, 21, 23, 24, 25, 32, 35, 45]); q = mkQ(Math.max(101, Math.ceil(1000 / d)), Math.min(999, Math.floor(99999 / d)), z); }
          N = d * q;
          const fr = d < 10 ? forgotRem(N, d) : q;
          if (String(q).includes('0') || fr !== q) break;
        }
        const w = {};
        if (String(q).includes('0')) w['lost-zero'] = ans(dropZeros(q));
        if (d < 10) { const fr = forgotRem(N, d); if (fr !== q && w['lost-zero'] !== ans(fr)) w['forgot-remainder'] = ans(fr); }
        const ctx = pick([
          () => ({ story: `Фабрика разложила ${num(N)} ${pl(N, 'карандаш', 'карандаша', 'карандашей')} в коробки по ${num(d)} ${pl(d, 'штуке', 'штуки', 'штук')}.`, question: 'Сколько коробок получилось?' }),
          () => ({ story: `Призовой фонд турнира — ${num(N)} ${rub(N)}. Его поровну разделили между ${num(d)} командами.`, question: 'Сколько рублей получила каждая команда?' }),
          () => (q <= 700 ? { story: `За ${num(d)} ${pl(d, 'день', 'дня', 'дней')} путешествия семья проехала на машине ${num(N)} км, каждый день поровну.`, question: 'Сколько километров семья проезжала за день?' }
            : { story: `В типографии напечатали ${num(d)} ${pl(d, 'одинаковую книгу', 'одинаковые книги', 'одинаковых книг')}, всего ${num(N)} ${pl(N, 'страница', 'страницы', 'страниц')}.`, question: 'Сколько страниц в одной книге?' }),
          () => ({ story: `Для школьной библиотеки купили ${num(d)} ${pl(d, 'одинаковый комплект', 'одинаковых комплекта', 'одинаковых комплектов')} книг, всего ${num(N)} ${pl(N, 'книга', 'книги', 'книг')}.`, question: 'Сколько книг в одном комплекте?' }),
          () => ({ story: 'Раздели уголком.', question: `${num(N)} : ${num(d)} = ?` }),
        ])();
        const firstLen = (() => { const s = String(N); let i = 1, P = +s[0]; while (P < d) P = P * 10 + +s[i++]; return i; })();
        const qLen = String(N).length - firstLen + 1;
        return Object.assign(ctx, {
          answer: ans(q),
          hints: [`Найди первое неполное делимое и прикинь, сколько цифр будет в частном. Здесь их ${num(qLen)}.`, `Каждый шаг: дели, умножай, вычитай и сноси цифру к остатку. Не делится — пиши 0. Проверь: ответ · ${num(d)} = ${num(N)}.`],
          solution: `${num(N)} : ${num(d)} = ${num(q)}. Проверка: ${num(q)} · ${num(d)} = ${num(N)}.`,
          wrongs: w,
          data: { N, d },
        });
      },
      verify(t) { const { N, d } = t.data, q = +t.answer; return Number.isInteger(q) && rep(q, d) === N; },
    },

    /* 4. n5-place ------------------------------------------------ */
    {
      id: 'n5-place', strand: 'Натуральные числа',
      short: 'Разряды и луч', title: 'Разряды, сравнение многозначных чисел, координатный луч',
      frp: ['Натуральное число. Ряд натуральных чисел. Число 0. Изображение натуральных чисел точками на координатной (числовой) прямой', 'Позиционная система счисления. Десятичная система счисления', 'Сравнение натуральных чисел, сравнение натуральных чисел с нулём. Способы сравнения'],
      goal: 'Читать и записывать многозначные числа с нулями, сравнивать их по количеству цифр и по разрядам, находить число на шкале по цене деления.',
      requires: [],
      explain: {
        model: `В Северске ${num(9870)} жителей, в Озёрске — ${num(12340)}. У первого числа первая цифра 9, у второго — 1. Но жителей больше в Озёрске: в его числе пять цифр, есть десятки тысяч, а в числе ${num(9870)} их нет совсем. Сначала сравнивают количество цифр, и только если оно одинаковое — цифры слева направо.`,
        figure: { type: 'nline5n', start: 0, step: 10, n: 10, labels: [0, 10], mark: 7, letter: 'A' },
        figureCaption: 'От 0 до 100 — 10 делений, значит, одно деление — 10. Точка A — это 70',
        rule: `<ul class="rule-list"><li>Цифры многозначного числа делят на <b>классы</b> по три справа: ${num(12340)} — это 12 тысяч и 340 единиц.</li><li>Пустой разряд — это <b>0</b>, его обязательно пишут: «три тысячи сорок пять» = 3045. После слова «тысяч» всегда идут ещё <b>три</b> цифры.</li><li><b>Сравнение:</b> больше то число, в котором больше цифр. Цифр поровну — сравнивай слева направо до первой разной цифры.</li><li><b>Шкала:</b> найди цену деления — разность двух подписанных чисел раздели на число делений между ними.</li></ul>`,
        examples: [
          { q: 'Запиши цифрами: «три тысячи сорок пять».', choices: ['3045', '345', num(300045)], correct: 0, wrong: { 1: 'drop-zeros', 2: 'write-as-heard' },
            steps: ['«Три тысячи» — цифра 3 в разряде тысяч.', 'После тысяч нужны ещё три цифры: сотни, десятки, единицы. Сотен нет — пишем 0, потом 45.', 'Ответ: 3045.'] },
          { q: 'Какое число отмечено точкой A?', fig: { type: 'nline5n', start: 200, step: 10, n: 10, labels: [0, 10], mark: 4, letter: 'A' },
            choices: ['240', '204', '400'], correct: 0, wrong: { 1: 'division-as-one' },
            steps: ['От 200 до 300 — 10 делений.', 'Цена деления: (300 − 200) : 10 = 10.', 'Точка A на 4-м делении: 200 + 4 · 10 = 240.'] },
          { q: `Что больше: ${num(9870)} или ${num(12340)}?`, choices: [num(12340), num(9870)], correct: 0, wrong: { 1: 'first-digit' },
            steps: [`В числе ${num(12340)} пять цифр, в числе ${num(9870)} — четыре.`, `Пятизначное число больше любого четырёхзначного. Ответ: ${num(12340)}.`] },
        ],
      },
      mistakes: [
        { id: 'first-digit', title: 'Сравнивает по первой цифре, не глядя на количество цифр', kidName: 'Первоцифрик',
          kidRule: 'ты сравниваешь числа по первой цифре и не замечаешь, что в одном из них цифр больше',
          say: 'Сначала посчитай цифры: в каком числе их больше, то и больше. По первой цифре сравнивают только числа одинаковой длины.',
          fixIdea: 'Больше цифр — больше число. Первые цифры сравнивают, только когда цифр поровну.',
          explainOptions: ['Сначала сравнивают количество цифр, а потом уже первые цифры', 'У кого первая цифра больше, то число и больше', 'Сравнивать надо последние цифры'],
          conflicts: [
            { text: `По твоему правилу 9 больше, чем ${num(10000)}: ведь 9 больше 1. Но 9 рублей — это одна монетка, а ${num(10000)} рублей — целая купюра в десять тысяч.`, ask: 'Что больше?', choices: ['9', num(10000)], right: num(10000), verify: () => 10000 > 9 },
          ] },
        { id: 'drop-zeros', title: 'Пропускает нули при записи числа, названного словами', kidName: 'Сжималка',
          kidRule: 'ты записываешь тысячи и сразу за ними остальное, не оставляя места для пустых разрядов',
          say: 'После тысяч должно идти ровно три цифры: сотни, десятки и единицы. Пустые разряды заполняются нулями.',
          fixIdea: 'После слова «тысяч» — всегда три цифры. Нет сотен или десятков — пиши 0.',
          explainOptions: ['После тысяч всегда три цифры, пустые разряды — нули', 'Нули в середине числа можно не писать', 'Тысячи и остаток просто пишут рядом'],
          conflicts: [
            { text: '«Три тысячи сорок пять» по твоему правилу — 345. Но 345 меньше тысячи, а в нашем числе целых три тысячи!', ask: '345 — это больше трёх тысяч?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 345 < 3000 && 3045 > 3000 },
          ] },
        { id: 'write-as-heard', title: 'Записывает число «как слышит»: тысячи с нулями, а за ними остаток', kidName: 'Нулевой хвост',
          kidRule: 'ты пишешь «три тысячи» как 3000, а потом приписываешь к нему 45',
          say: 'Нули тысячи и цифры остатка занимают одни и те же места. Остаток пишут вместо нулей, а не после них.',
          fixIdea: 'Цифры остатка встают на место нулей тысячи: 3000 и 45 — это 3045, а не 300045.',
          explainOptions: ['Остаток встаёт на место нулей, а не приписывается после них', 'Сначала пишут тысячу полностью, потом остаток', 'Чем больше нулей, тем точнее число'],
          conflicts: [
            { text: `«Три тысячи сорок пять» по твоему правилу — ${num(300045)}. Но это триста тысяч! А мы прибавили к трём тысячам всего 45.`, ask: 'Сколько будет 3000 + 45?', choices: ['3045', num(300045)], right: '3045', verify: () => 3000 + 45 === 3045 },
          ] },
        { id: 'division-as-one', title: 'Считает, что одно деление шкалы всегда равно 1', kidName: 'Единичник',
          kidRule: 'ты считаешь каждое деление шкалы за единицу и не смотришь на подписанные числа',
          say: 'Посмотри на подписанные числа и посчитай деления между ними. Одно деление может стоить 10, 50 или 100.',
          fixIdea: 'Сначала найди цену деления: разность подписанных чисел раздели на число делений между ними.',
          explainOptions: ['Цену деления находят по подписанным числам', 'Одно деление всегда равно 1', 'Цена деления — это последнее подписанное число'],
          conflicts: [
            { text: 'На шкале подписаны 0 и 100, между ними 10 делений. По твоему правилу через 10 делений будет 10. Но там стоит 100!', ask: 'Сколько стоит одно деление?', choices: ['10', '1'], right: '10', verify: () => 100 / 10 === 10, figure: { type: 'nline5n', start: 0, step: 10, n: 10, labels: [0, 10], mark: 7, letter: 'A' } },
          ] },
      ],
      generate(lv) {
        const type = pick(L3(lv, ['cmp', 'write', 'line'], ['cmp', 'write', 'write', 'line'], ['cmp', 'write', 'line']));
        if (type === 'cmp') {
          const three = lv === 3 || (lv === 2 && Math.random() < 0.4);
          const k = L3(lv, rnd(3, 4), rnd(4, 5), rnd(5, 6)), fa = rnd(6, 9), fb = rnd(1, three ? fa - 2 : fa - 1);
          const A = rnd(fa * 10 ** (k - 1), (fa + 1) * 10 ** (k - 1) - 1), B = rnd(fb * 10 ** k, (fb + 1) * 10 ** k - 1);
          if (three) {
            const fc = rnd(fb + 1, fa - 1); // первые цифры: у B меньше всех, у A больше всех — правило «по первой цифре» ошибается и на max, и на min
            let C; do { C = rnd(fc * 10 ** k, (fc + 1) * 10 ** k - 1); } while (C === B);
            const askMax = Math.random() < 0.5, list = [A, B, C];
            const right = askMax ? Math.max(...list) : Math.min(...list), wrong = askMax ? A : B; // по первой цифре: max — у A (первая цифра больше всех), min — у B
            const fake = askMax ? (fc < fa ? A : null) : B;
            return {
              story: `Числа: ${list.map(num).join('; ')}.`, question: `Какое из них ${askMax ? 'наибольшее' : 'наименьшее'}?`,
              choices: shuffle(list.map(num)), answer: num(right), accept: 'choice',
              hints: ['Сначала посчитай, сколько цифр в каждом числе.', askMax ? 'Наибольшее — среди самых длинных чисел. Сравни их по первой цифре.' : 'Наименьшее — то, в котором меньше всего цифр.'],
              solution: `В числе ${num(A)} — ${num(k)} ${pl(k, 'цифра', 'цифры', 'цифр')}, в остальных — по ${num(k + 1)}. ${askMax ? `Из длинных больше ${num(Math.max(B, C))}` : `Самое короткое — ${num(A)}`}. Ответ: ${num(right)}.`,
              wrongs: fake != null && fake !== right ? { 'first-digit': num(wrong) } : {},
              data: { kind: 'cmp', list, askMax },
            };
          }
          const askMore = Math.random() < 0.6, right = askMore ? B : A, wrong = askMore ? A : B;
          const ctx = pick([
            () => { const [x, y] = shuffle([['Северск', A], ['Озёрск', B]]);
              return { story: `В городе ${x[0]} ${num(x[1])} ${pl(x[1], 'житель', 'жителя', 'жителей')}, в городе ${y[0]} — ${num(y[1])}.`, question: `В каком городе жителей ${askMore ? 'больше' : 'меньше'}?`, names: { [A]: x[1] === A ? x[0] : y[0], [B]: x[1] === B ? x[0] : y[0] } }; },
            () => { const [x, y] = shuffle([['Аня', A], ['Боря', B]]);
              return { story: `В онлайн-игре Аня набрала ${num(x[0] === 'Аня' ? x[1] : y[1])} ${ochk(x[0] === 'Аня' ? x[1] : y[1])}, а Боря — ${num(x[0] === 'Боря' ? x[1] : y[1])}.`, question: `Кто набрал ${askMore ? 'больше' : 'меньше'} очков?`, names: { [A]: x[1] === A ? x[0] : y[0], [B]: x[1] === B ? x[0] : y[0] } }; },
            () => ({ story: '', question: `Какое число ${askMore ? 'больше' : 'меньше'}: ${num(A)} или ${num(B)}?` }),
          ])();
          const lab = v => (ctx.names ? ctx.names[v] : num(v));
          return {
            story: ctx.story, question: ctx.question,
            choices: shuffle([lab(A), lab(B)]), answer: lab(right), accept: 'choice',
            hints: ['Посчитай, сколько цифр в каждом числе.', `В числе ${num(B)} — ${num(k + 1)} ${pl(k + 1, 'цифра', 'цифры', 'цифр')}, в числе ${num(A)} — ${num(k)}.`],
            solution: `${num(B)} длиннее, значит, ${num(B)} > ${num(A)}. Ответ: ${lab(right)}.`,
            wrongs: { 'first-digit': lab(wrong) },
            data: { kind: 'cmp2', A, B, askMore, labels: { A: lab(A), B: lab(B) } },
          };
        }
        if (type === 'write') {
          const th = L3(lv, rnd(2, 9), rnd(10, 99), pick([rnd(100, 999), rnd(1, 9) * 100 + rnd(1, 9), rnd(1, 9) * 100 + rnd(1, 9) * 10]));
          const r = Math.random() < 0.35 ? rnd(1, 9) : rnd(10, 99), n = th * 1000 + r, wd = words(n);
          const ctx = pick([
            () => ({ story: `Диктор сказал, сколько человек пришло на городской праздник: «${wd}».`, question: 'Запиши это число цифрами.' }),
            () => ({ story: `В справочнике словами написано, сколько жителей в городе: «${wd}».`, question: 'Запиши это число цифрами.' }),
            () => ({ story: `Продавец назвал цену подержанной машины: «${wd}» (в рублях).`, question: 'Запиши эту цену цифрами.' }),
            () => ({ story: `Учительница диктует число: «${wd}».`, question: 'Запиши его цифрами.' }),
          ])();
          return Object.assign(ctx, {
            answer: ans(n),
            hints: ['Сначала запиши тысячи. После них должно идти ровно три цифры: сотни, десятки, единицы.', `Тысяч — ${num(th)}. Остаток ${num(r)} — это ${r < 10 ? 'только единицы: сотен и десятков нет' : 'десятки и единицы: сотен нет'}.`],
            solution: `${num(th)} ${pl(th, 'тысяча', 'тысячи', 'тысяч')} и ${num(r)}: на месте пустых разрядов нули. Ответ: ${num(n)}.`,
            wrongs: { 'drop-zeros': ans(+(String(th) + String(r))), 'write-as-heard': ans(+(String(th * 1000) + String(r))) },
            data: { kind: 'write', wd },
          });
        }
        // line
        const step = pick(L3(lv, [2, 5, 10], [10, 20, 50, 100], [50, 100, 200, 500, 1000]));
        const n = pick([10, 10, 12]);
        let labels, start, mark;
        if (lv === 3) { const i1 = rnd(1, 3), i2 = i1 + pick([4, 5]); labels = [i1, i2]; start = rnd(0, 9) * step * 10; do { mark = rnd(i1 + 1, n); } while (labels.includes(mark)); }
        else { labels = [0, pick([5, 10])]; start = lv === 1 ? 0 : rnd(0, 5) * step * 10; do { mark = rnd(1, n); } while (labels.includes(mark)); }
        const v = start + mark * step, base = start + labels[0] * step, wrong = base + (mark - labels[0]);
        const letter = pick(['A', 'B', 'K', 'M']);
        const ctx = pick([
          () => ({ story: `На числовом луче отмечена точка ${letter}.`, question: `Какое число соответствует точке ${letter}?` }),
          () => ({ story: `Шкала прибора размечена делениями. Стрелка показывает на точку ${letter}.`, question: 'Какое число показывает стрелка?' }),
          () => ({ story: `На карте похода отмечены километры от старта. Привал — в точке ${letter}.`, question: `На каком километре привал (точка ${letter})?` }),
        ])();
        const a1 = start + labels[0] * step, a2 = start + labels[1] * step, gap = labels[1] - labels[0];
        return Object.assign(ctx, {
          figure: { type: 'nline5n', start, step, n, labels, mark, letter },
          answer: ans(v),
          hints: [`Найди цену деления: между числами ${num(a1)} и ${num(a2)} — ${num(gap)} ${pl(gap, 'деление', 'деления', 'делений')}.`, `Одно деление — (${num(a2)} − ${num(a1)}) : ${num(gap)} = ${num(step)}. Посчитай, на сколько делений точка правее числа ${num(a1)}.`],
          solution: `Цена деления ${num(step)}. Точка ${letter} на ${num(mark - labels[0])} ${pl(mark - labels[0], 'деление', 'деления', 'делений')} правее ${num(a1)}: ${num(a1)} + ${num(mark - labels[0])} · ${num(step)} = ${num(v)}.`,
          wrongs: wrong !== v ? { 'division-as-one': ans(wrong) } : {},
          data: { kind: 'line', a1, a2, i1: labels[0], i2: labels[1], mark },
        });
      },
      verify(t) {
        const d = t.data;
        if (d.kind === 'write') return fromWords(d.wd) === +t.answer;
        if (d.kind === 'line') return d.a1 + (d.mark - d.i1) * ((d.a2 - d.a1) / (d.i2 - d.i1)) === +t.answer;
        if (d.kind === 'cmp2') { const big = d.A > d.B ? 'A' : 'B', small = big === 'A' ? 'B' : 'A'; return t.answer === d.labels[d.askMore ? big : small]; }
        const sorted = d.list.slice().sort((x, y) => x - y);
        return t.answer === num(d.askMax ? sorted[sorted.length - 1] : sorted[0]);
      },
    },

    /* 5. n5-round ------------------------------------------------ */
    {
      id: 'n5-round', strand: 'Натуральные числа',
      short: 'Округление', title: 'Округление натуральных чисел',
      frp: ['Округление натуральных чисел'],
      goal: 'Округлять натуральные числа до десятков, сотен, тысяч и больших разрядов, глядя на цифру справа от разряда.',
      requires: ['n5-place'],
      explain: {
        model: `На матче было ${num(38452)} зрителей. В новостях скажут «около ${num(38500)}» — это округление до сотен. Цифра сотен — 4, её сосед справа — цифра десятков 5. Сосед 5 или больше — цифру сотен увеличиваем на 1, а все цифры правее заменяем нулями.`,
        rule: '<ul class="rule-list"><li>Найди цифру разряда, до которого округляешь.</li><li>Посмотри на <b>соседнюю цифру справа</b> — только на неё, дальше не смотри.</li><li>0, 1, 2, 3, 4 — цифра разряда остаётся; <b>5</b>, 6, 7, 8, 9 — увеличиваем её на 1.</li><li><b>Все</b> цифры правее разряда заменяем нулями.</li></ul>',
        examples: [
          { q: 'Округли 3427 до сотен.', choices: ['3400', '3500', '3430'], correct: 0, wrong: { 1: 'last-digit', 2: 'wrong-place' },
            steps: ['Цифра сотен — 4.', 'Справа от неё цифра десятков 2 — меньше 5. На 7 в конце не смотрим!', 'Сотни не меняем, десятки и единицы — нули. Ответ: 3400.'] },
          { q: 'Округли 6250 до сотен.', choices: ['6300', '6200'], correct: 0, wrong: { 1: 'five-down' },
            steps: ['Цифра сотен — 2, справа от неё 5.', 'При 5 округляем вверх: 2 → 3.', 'Ответ: 6300.'] },
          { q: `Округли ${num(39650)} до тысяч.`, choices: [num(40000), num(39000)], correct: 0,
            steps: ['Цифра тысяч — 9, справа 6 — округляем вверх.', `9 + 1 = 10: в разряде тысяч 0, а десятков тысяч становится 4. Ответ: ${num(40000)}.`] },
        ],
      },
      mistakes: [
        { id: 'last-digit', title: 'Смотрит не на ту цифру — на последнюю цифру числа', kidName: 'Хвостогляд',
          kidRule: 'ты решаешь, округлять ли вверх, по последней цифре числа, а не по соседу справа от разряда',
          say: 'Решает только одна цифра — та, что стоит сразу справа от разряда, до которого округляешь. Последняя цифра числа тут не важна.',
          fixIdea: 'Смотри только на цифру сразу справа от округляемого разряда. Всё, что дальше, ничего не решает.',
          explainOptions: ['Решает цифра сразу справа от разряда, а не последняя цифра числа', 'Всегда смотрят на последнюю цифру числа', 'Смотрят на саму цифру разряда'],
          conflicts: [
            { text: 'Округли 3427 до сотен. По твоему правилу последняя цифра 7 — значит, вверх: 3500. Но от 3427 до 3400 всего 27, а до 3500 — целых 73.', ask: 'К какому числу ближе 3427?', choices: ['3400', '3500'], right: '3400', verify: () => 3427 - 3400 < 3500 - 3427 },
          ] },
        { id: 'five-down', title: 'Округляет вниз, когда справа стоит 5', kidName: 'Пятёрочный тормоз',
          kidRule: 'ты считаешь, что 5 — это «ещё мало», и при ней округляешь вниз',
          say: 'Когда справа от разряда стоит 5, округляют вверх — так же, как при 6, 7, 8 и 9.',
          fixIdea: 'Цифра справа 5, 6, 7, 8 или 9 — округляем вверх. Пятёрка — тоже вверх.',
          explainOptions: ['При 5 округляют вверх, как при 6–9', 'При 5 округляют вниз, потому что 5 — середина', 'При 5 число не округляют'],
          conflicts: [
            { text: 'Округли 2351 до сотен. По твоему правилу 2300. Но от 2351 до 2400 — 49, а до 2300 — 51. Ближе 2400!', ask: 'К какому числу ближе 2351?', choices: ['2300', '2400'], right: '2400', verify: () => 2400 - 2351 < 2351 - 2300 },
          ] },
        { id: 'wrong-place', title: 'Заменяет нулями не те разряды — округляет до соседнего разряда', kidName: 'Промахнулся-разряд',
          kidRule: 'ты округляешь на один разряд правее: просили до сотен, а ты — до десятков',
          say: 'Найди разряд по названию: единицы, десятки, сотни, тысячи — считай справа. Все цифры правее нужного разряда должны стать нулями.',
          fixIdea: 'Назови разряды справа налево и подчеркни нужный. Правее него — только нули.',
          explainOptions: ['Нулями становятся все цифры правее нужного разряда', 'Нулём заменяют только последнюю цифру', 'Округлить до сотен — значит оставить две последние цифры'],
          conflicts: [
            { text: 'Округли 4862 до сотен. По твоему правилу 4860. Но в этом числе ещё есть десятки — 6. У числа, округлённого до сотен, десятки и единицы — нули.', ask: 'Число 4860 округлено до сотен?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 4860 % 100 !== 0 && 4900 % 100 === 0 },
          ] },
      ],
      generate(lv) {
        const k = pick(L3(lv, [1, 2], [2, 3], [3, 4, 5])), p = 10 ** k, L = Math.max(k + 1, L3(lv, rnd(3, 4), rnd(4, 5), rnd(5, 6)));
        const hLen = L - k;
        let H = rnd(10 ** (hLen - 1), Math.min(10 ** hLen - 1, Math.floor(949999 / p) - 1));
        if (lv === 3 && Math.random() < 0.3 && H % 10 !== 9 && H - (H % 10) + 9 <= Math.floor(949999 / p) - 1) H = H - (H % 10) + 9; // цепочка девяток: перенос в старший разряд
        const nd = Math.random() < 0.35 ? 5 : rnd(0, 9);
        let low = 0;
        if (k >= 2) {
          // при 5 справа последняя цифра ≥ 5, чтобы «пятёрочную» ошибку не путать с «хвостовой»
          const u = nd === 5 ? rnd(5, 9) : Math.random() < 0.65 ? (nd > 5 ? rnd(0, 4) : rnd(5, 9)) : rnd(0, 9);
          low = (k >= 3 ? rnd(0, 10 ** (k - 2) - 1) * 10 : 0) + u;
          if (k >= 3) low = Math.floor(low / 10) * 10 + u;
        }
        const n = H * p + nd * (p / 10) + low;
        const res = nd >= 5 ? (H + 1) * p : H * p, w = {};
        if (k >= 2) { const lastUp = n % 10 >= 5, v = lastUp ? (H + 1) * p : H * p; if (v !== res) w['last-digit'] = ans(v); }
        if (nd === 5) w['five-down'] = ans(H * p);
        if (k >= 2) { const p2 = p / 10, v = Math.round(n / p2) * p2; if (v !== res && v !== n && !Object.values(w).includes(ans(v))) w['wrong-place'] = ans(v); }
        const ctx = pick([
          () => (n < 100000 ? { story: `Число зрителей на матче — ${num(n)}. В новостях его округлили до ${PLACE[p]}.`, question: 'Какое число назвали в новостях?' }
            : { story: `Население города — ${num(n)} ${pl(n, 'человек', 'человека', 'человек')}. В справочнике это число округлили до ${PLACE[p]}.`, question: 'Какое число написали в справочнике?' }),
          () => { const item = n < 1000 ? 'Настольная игра' : n < 10000 ? 'Самокат' : n < 100000 ? 'Ноутбук' : 'Подержанный автомобиль';
            return { story: `${item} стоит ${num(n)} ${rub(n)}.`, question: `Округли цену до ${PLACE[p]}. Ответ в рублях.` }; },
          () => ({ story: `В ${n < 1000 ? 'деревне' : n < 20000 ? 'посёлке' : 'городе'} живёт ${num(n)} ${pl(n, 'человек', 'человека', 'человек')}.`, question: `Округли это число до ${PLACE[p]}.` }),
          () => ({ story: '', question: `Округли число ${num(n)} до ${PLACE[p]}.` }),
        ])();
        const pname = { 1: 'десятков', 2: 'сотен', 3: 'тысяч', 4: 'десятков тысяч', 5: 'сотен тысяч' }[k];
        const nextName = { 1: 'единиц', 2: 'десятков', 3: 'сотен', 4: 'тысяч', 5: 'десятков тысяч' }[k];
        return Object.assign(ctx, {
          answer: ans(res),
          hints: [`Найди цифру ${pname} и посмотри только на её соседа справа — цифру ${nextName}.`, `Справа от разряда ${pname} стоит ${num(nd)}: ${nd >= 5 ? 'это 5 или больше — округляем вверх' : 'это меньше 5 — разряд не меняется'}. Всё правее — нули.`],
          solution: `Цифра ${nextName} — ${num(nd)}, ${nd >= 5 ? 'округляем вверх' : 'округляем вниз'}: ${num(n)} ≈ ${num(res)}.`,
          wrongs: w,
          data: { n, p },
        });
      },
      verify(t) { const { n, p } = t.data, lo = n - (n % p), hi = lo + p; return +t.answer === (n - lo >= hi - n ? hi : lo); },
    },

    /* 6. n5-order ------------------------------------------------ */
    {
      id: 'n5-order', strand: 'Натуральные числа',
      short: 'Порядок действий', title: 'Порядок действий и скобки',
      frp: ['Числовые выражения; порядок действий'],
      goal: 'Находить значение выражения со скобками и без: сначала скобки, потом умножение и деление, потом сложение и вычитание — слева направо.',
      requires: ['f4-table', 'f4-column'],
      explain: {
        model: 'В кафе: сок за 40 рублей и 3 пирожка по 25 рублей. Платить 40 + 3 · 25. Если считать слева направо, выйдет (40 + 3) · 25 = 1075 рублей — абсурд! Сначала пирожки: 3 · 25 = 75, потом сок: 40 + 75 = 115 рублей. Поэтому умножение и деление выполняют раньше сложения и вычитания.',
        rule: '<ul class="rule-list"><li>Сначала — действия <b>в скобках</b>.</li><li>Потом — <b>умножение и деление</b>, по порядку слева направо.</li><li>Потом — <b>сложение и вычитание</b>, по порядку слева направо.</li><li>Умножение не «главнее» деления, а сложение не «главнее» вычитания: они равноправны, идём слева направо.</li></ul>',
        examples: [
          { q: '2 + 3 · 4 = ?', choices: ['14', '20'], correct: 0, wrong: { 1: 'left-to-right' }, steps: ['Сначала умножение: 3 · 4 = 12.', 'Потом сложение: 2 + 12 = 14.'] },
          { q: '24 : 4 · 2 = ?', choices: ['12', '3'], correct: 0, wrong: { 1: 'fixed-order' }, steps: ['Деление и умножение равноправны — идём слева направо.', '24 : 4 = 6, потом 6 · 2 = 12.'] },
          { q: '(12 + 3) · 4 = ?', choices: ['60', '24'], correct: 0, wrong: { 1: 'ignore-brackets' }, steps: ['Сначала скобки: 12 + 3 = 15.', '15 · 4 = 60.'] },
        ],
      },
      mistakes: [
        { id: 'left-to-right', title: 'Выполняет действия слева направо, не глядя на приоритет', kidName: 'Паровозик',
          kidRule: 'ты считаешь всё подряд слева направо, как читаешь, и умножение ждёт своей очереди',
          say: 'Умножение и деление выполняют раньше сложения и вычитания, даже если они стоят правее. Расставь номера действий над знаками.',
          fixIdea: 'Сначала скобки, потом умножение и деление, потом сложение и вычитание. Пронумеруй действия, прежде чем считать.',
          explainOptions: ['Умножение и деление делают раньше сложения и вычитания', 'Всегда считают слева направо, как читают', 'Сначала делают сложение, потом всё остальное'],
          conflicts: [
            { text: 'По твоему правилу 2 + 3 · 4 = 20. Но в магазине: ручка за 2 рубля и 3 тетради по 4 рубля — это 2 + 12 = 14 рублей, а не 20.', ask: 'Сколько стоит покупка?', choices: ['14', '20'], right: '14', verify: () => 2 + 3 * 4 === 14 },
          ] },
        { id: 'ignore-brackets', title: 'Не замечает скобки', kidName: 'Скобкослеп',
          kidRule: 'ты не смотришь на скобки и считаешь так, будто их нет',
          say: 'Скобки говорят: это действие — первым. Сначала посчитай то, что внутри скобок.',
          fixIdea: 'Скобки — самое главное: всё, что в скобках, считаем первым.',
          explainOptions: ['Действие в скобках выполняют первым', 'Скобки — просто украшение', 'Скобки считают в самом конце'],
          conflicts: [
            { text: 'По твоему правилу (2 + 3) · 4 = 14. Но (2 + 3) · 4 — это 4 раза по 5 конфет: 5 + 5 + 5 + 5 = 20.', ask: 'Сколько это?', choices: ['20', '14'], right: '20', verify: () => (2 + 3) * 4 === 20 },
          ] },
        { id: 'fixed-order', title: 'Считает, что умножение всегда раньше деления, а сложение — раньше вычитания', kidName: 'Строгий порядок',
          kidRule: 'ты сначала делаешь все умножения, потом деления; сначала все сложения, потом вычитания',
          say: 'Умножение и деление равноправны, сложение и вычитание тоже. Внутри одной ступени иди слева направо.',
          fixIdea: 'Умножение и деление — одна ступень, сложение и вычитание — другая. Внутри ступени — строго слева направо.',
          explainOptions: ['Умножение с делением и сложение с вычитанием равноправны — идём слева направо', 'Умножение всегда раньше деления', 'Сложение всегда раньше вычитания'],
          conflicts: [
            { text: 'По твоему правилу 10 − 3 + 2 = 10 − 5 = 5. Но было 10 конфет, 3 съели, потом 2 подарили: 10 − 3 = 7, 7 + 2 = 9.', ask: 'Сколько конфет стало?', choices: ['9', '5'], right: '9', verify: () => 10 - 3 + 2 === 9 },
            { text: 'По твоему правилу 24 : 4 · 2 = 24 : 8 = 3. Но 24 конфеты разложили в 4 пакета — по 6, а потом взяли 2 пакета: 12 конфет.', ask: 'Сколько конфет взяли?', choices: ['12', '3'], right: '12', verify: () => (24 / 4) * 2 === 12 },
          ] },
      ],
      generate(lv) {
        const TPL = {
          1: [['a + b * c', { a: [2, 20], b: [2, 9], c: [2, 9] }], ['a - b * c', { a: [20, 60], b: [2, 6], c: [2, 6] }], ['a + b : c', { a: [2, 20], b: [6, 40], c: [2, 6] }],
            ['( a + b ) * c', { a: [2, 15], b: [2, 15], c: [2, 6] }], ['a * ( b - c )', { a: [2, 6], b: [8, 20], c: [2, 7] }], ['a - b + c', { a: [10, 30], b: [2, 9], c: [2, 9] }], ['a : b * c', { a: [12, 48], b: [2, 6], c: [2, 4] }]],
          2: [['a + b * c - d', { a: [10, 50], b: [2, 9], c: [2, 9], d: [2, 20] }], ['a - b : c + d', { a: [20, 60], b: [6, 48], c: [2, 6], d: [2, 15] }], ['( a - b ) * c + d', { a: [10, 30], b: [2, 9], c: [2, 6], d: [2, 20] }],
            ['a * ( b + c ) - d', { a: [2, 6], b: [2, 12], c: [2, 12], d: [2, 20] }], ['a : b * c + d', { a: [12, 72], b: [2, 9], c: [2, 5], d: [2, 20] }], ['a - b + c * d', { a: [20, 60], b: [2, 15], c: [2, 6], d: [2, 6] }],
            ['a + b * ( c - d )', { a: [2, 20], b: [2, 6], c: [8, 20], d: [2, 7] }], ['a - b - c + d', { a: [30, 80], b: [2, 20], c: [2, 20], d: [2, 20] }]],
          3: [['a * ( b + c ) - d : e', { a: [2, 9], b: [2, 15], c: [2, 15], d: [6, 60], e: [2, 6] }], ['( a + b ) : c * d', { a: [2, 40], b: [2, 40], c: [2, 9], d: [2, 6] }], ['a - ( b - c ) * d', { a: [40, 99], b: [8, 20], c: [2, 7], d: [2, 6] }],
            ['a + b * c - d * e', { a: [10, 60], b: [2, 9], c: [2, 9], d: [2, 6], e: [2, 6] }], ['( a - b * c ) : d + e', { a: [30, 99], b: [2, 6], c: [2, 6], d: [2, 9], e: [2, 20] }], ['a : ( b + c ) * d', { a: [24, 96], b: [2, 6], c: [2, 6], d: [2, 5] }],
            ['a - b + c - d', { a: [40, 99], b: [5, 30], c: [5, 30], d: [5, 30] }], ['a : b * c - d', { a: [24, 96], b: [2, 8], c: [2, 6], d: [2, 30] }]],
        };
        const MODES = [['left-to-right', 'ltr'], ['ignore-brackets', 'nobr'], ['fixed-order', 'fixed']];
        const build = (src, R, maxV) => {
          for (let g = 0; g < 400; g++) {
            const toks = src.split(' ').map(s => (R[s] ? rnd(...R[s]) : s)), v = evalT(toks, 'ok');
            if (v == null || v > maxV) continue;
            const w = {}; for (const [id, m] of MODES) { const x = evalT(toks, m); if (x != null && x !== v && !Object.values(w).includes(x)) w[id] = x; }
            if (Object.keys(w).length) return { toks, v, w };
          }
          return null;
        };
        const kind = pick(L3(lv, ['expr', 'expr', 'story', 'brackets'], ['expr', 'expr', 'expr', 'story', 'brackets'], ['expr', 'expr', 'expr', 'story']));
        if (kind === 'brackets') {
          let a, b, c, minus, target, noBr;
          do { a = rnd(2, 9); b = rnd(2, 9); c = rnd(2, 9); minus = Math.random() < 0.4 && a > b; target = minus ? (a - b) * c : (a + b) * c; noBr = minus ? a - b * c : a + b * c; } while (noBr === target || noBr < 0);
          const op = minus ? '−' : '+';
          const ch = [`(${a} ${op} ${b}) · ${c}`, `${a} ${op} (${b} · ${c})`, 'скобки не нужны'];
          return {
            story: `Нужно, чтобы выражение ${num(a)} ${op} ${num(b)} · ${num(c)} стало равно ${num(target)}.`, question: 'Куда поставить скобки?',
            choices: shuffle(ch), answer: ch[0], accept: 'choice',
            hints: [`Посчитай выражение без скобок по правилам: сначала умножение. Получится ли ${num(target)}?`, `Без скобок: ${num(b)} · ${num(c)} = ${num(b * c)}, ${num(a)} ${op} ${num(b * c)} = ${num(noBr)}. Чтобы ${op === '+' ? 'сложение' : 'вычитание'} было первым, нужны скобки.`],
            solution: `Без скобок получается ${num(noBr)}. А (${num(a)} ${op} ${num(b)}) · ${num(c)} = ${num(minus ? a - b : a + b)} · ${num(c)} = ${num(target)}.`,
            wrongs: { 'left-to-right': 'скобки не нужны' },
            data: { kind: 'br', a, b, c, minus, ch },
          };
        }
        if (kind === 'story') {
          let S = null; for (let g = 0; g < 20 && !S; g++) S = pick([
            () => { const e = build('a + b * c', { a: [30, 90], b: [2, 5], c: [35, 90] }, 1000); if (!e) return null; const [a, , b, , c] = e.toks;
              return { e, story: `Мама купила хлеб за ${num(a)} ${rub(a)} и ${num(b)} ${pl(b, 'пакет', 'пакета', 'пакетов')} молока по ${num(c)} ${rub(c)}. Кассир записал: ${showExpr(e.toks)}.`, question: 'Сколько рублей заплатила мама?' }; },
            () => { const e = build('a - b * c', { a: [100, 500], b: [2, 6], c: [12, 60] }, 1000); if (!e) return null; const [a, , b, , c] = e.toks;
              return { e, story: `В кошельке у Пети ${num(a)} ${rub(a)}. Он купил ${num(b)} ${pl(b, 'тетрадь', 'тетради', 'тетрадей')} по ${num(c)} ${rub(c)} и записал, сколько осталось: ${showExpr(e.toks)}.`, question: 'Сколько рублей осталось у Пети?' }; },
            () => { const e = build('a + b * c', { a: [10, 90], b: [2, 9], c: [5, 20] }, 1000); if (!e) return null; const [a, , b, , c] = e.toks;
              return { e, story: `В игре за каждую звезду дают ${num(c)} ${ochk(c)}. У Ани было ${num(a)} ${ochk(a)}, и она собрала ещё ${num(b)} ${pl(b, 'звезду', 'звезды', 'звёзд')}: ${showExpr(e.toks)}.`, question: 'Сколько очков у неё стало?' }; },
            () => { const e = build('( a + b ) * c', { a: [3, 15], b: [3, 15], c: [2, 6] }, 1000); if (!e) return null; const [, a, , b, , , c] = e.toks;
              return { e, story: `В каждом из ${num(c)} пакетов лежат ${num(a)} ${pl(a, 'яблоко', 'яблока', 'яблок')} и ${num(b)} ${pl(b, 'груша', 'груши', 'груш')}. Всего фруктов: ${showExpr(e.toks)}.`, question: 'Сколько всего фруктов?' }; },
          ])();
          if (S) { const { e } = S;
          return {
            story: S.story, question: S.question,
            answer: ans(e.v),
            hints: ['Какое действие здесь первое? Помни: скобки, потом умножение и деление, потом сложение и вычитание.', `Первое действие: ${stepsOf(e.toks).first}.`],
            solution: `${stepsOf(e.toks).chain}. Ответ: ${num(e.v)}.`,
            wrongs: Object.fromEntries(Object.entries(e.w).map(([id, x]) => [id, ans(x)])),
            data: { kind: 'expr', toks: e.toks },
          }; }
        }
        let e = null;
        for (let g = 0; g < 20 && !e; g++) { const [src, R] = pick(TPL[lv]); e = build(src, R, L3(lv, 200, 500, 1000)); }
        if (!e) e = build('a + b * c', { a: [2, 20], b: [2, 9], c: [2, 9] }, 1000);
        const st = stepsOf(e.toks);
        return {
          story: pick(['Найди значение выражения.', 'Посчитай, соблюдая порядок действий.', '']),
          question: `${showExpr(e.toks)} = ?`,
          answer: ans(e.v),
          hints: ['Расставь номера действий: скобки, потом умножение и деление, потом сложение и вычитание. Равноправные действия — слева направо.', `Первое действие: ${st.first}.`],
          solution: `${st.chain}.`,
          wrongs: Object.fromEntries(Object.entries(e.w).map(([id, x]) => [id, ans(x)])),
          data: { kind: 'expr', toks: e.toks },
        };
      },
      verify(t) {
        const d = t.data;
        if (d.kind === 'br') { const v = (d.minus ? d.a - d.b : d.a + d.b) * d.c; return t.answer === d.ch[0] && v === (d.minus ? d.a - d.b : d.a + d.b) * d.c && t.choices.includes('скобки не нужны'); }
        return rdEval(d.toks) === +t.answer;
      },
    },

    /* 7. n5-props ------------------------------------------------ */
    {
      id: 'n5-props', strand: 'Натуральные числа',
      short: 'Удобный счёт', title: 'Свойства сложения и умножения, удобный счёт',
      frp: ['Переместительное и сочетательное свойства (законы) сложения и умножения, распределительное свойство (закон) умножения', 'Использование букв для обозначения неизвестного компонента и записи свойств арифметических действий'],
      goal: 'Применять распределительный закон, вычитать сумму из числа и считать удобно — с округлением и верной поправкой.',
      requires: ['n5-order'],
      explain: {
        model: 'Класс из 8 человек идёт в музей: каждый платит 300 рублей за билет и 50 рублей за экскурсию. Можно сложить: 300 + 50 = 350, и умножить: 8 · 350 = 2800. А можно отдельно: 8 · 300 + 8 · 50 = 2400 + 400 = 2800. Ответ тот же — это распределительный закон. Главное — на 8 умножить и билет, и экскурсию.',
        rule: '<ul class="rule-list"><li><b>Переместительный:</b> a + b = b + a, a · b = b · a.</li><li><b>Сочетательный:</b> (a + b) + c = a + (b + c), (a · b) · c = a · (b · c). Удобно: 25 · 17 · 4 = (25 · 4) · 17 = 1700.</li><li><b>Распределительный:</b> a · (b + c) = a · b + a · c — на число умножают <b>каждое</b> слагаемое. С разностью так же: 6 · 49 = 6 · (50 − 1) = 300 − 6 = 294.</li><li><b>Вычесть сумму:</b> a − (b + c) = a − b − c.</li><li><b>Округление с поправкой:</b> 135 − 98 = 135 − 100 + 2 — вычли на 2 больше, эти 2 возвращаем.</li></ul>',
        examples: [
          { q: '7 · (20 + 3) = ?', choices: ['161', '143'], correct: 0, wrong: { 1: 'first-only' }, steps: ['На 7 умножаем каждое слагаемое: 7 · 20 = 140 и 7 · 3 = 21.', '140 + 21 = 161.'] },
          { q: 'Посчитай удобно: 135 − 98.', choices: ['37', '33'], correct: 0, wrong: { 1: 'compensate-wrong' }, steps: ['98 = 100 − 2. Вычтем 100: 135 − 100 = 35.', 'Мы вычли на 2 больше, чем надо, — вернём их: 35 + 2 = 37.'] },
          { q: '274 − (74 + 59) = ?', choices: ['141', '259'], correct: 0, wrong: { 1: 'minus-bracket' }, steps: ['Вычесть сумму — значит вычесть каждое слагаемое: 274 − 74 − 59.', '274 − 74 = 200, 200 − 59 = 141.'] },
        ],
      },
      mistakes: [
        { id: 'first-only', title: 'Умножает на число только первое слагаемое в скобке', kidName: 'Полумножитель',
          kidRule: 'ты умножаешь на число только первое слагаемое, а второе просто приписываешь',
          say: 'Умножить сумму на число — значит умножить на него каждое слагаемое. Второе слагаемое тоже нужно умножить.',
          fixIdea: 'a · (b + c) = a · b + a · c: стрелочки от множителя идут к каждому слагаемому.',
          explainOptions: ['На число умножают каждое слагаемое в скобках', 'Достаточно умножить первое слагаемое', 'Скобки можно просто убрать'],
          conflicts: [
            { text: 'По твоему правилу 3 · (4 + 5) = 12 + 5 = 17. Но 3 · (4 + 5) = 3 · 9 = 27. Три пакета, в каждом 4 яблока и 5 груш, — груш тоже три раза по 5!', ask: 'Сколько это?', choices: ['27', '17'], right: '27', verify: () => 3 * (4 + 5) === 27 && 3 * 4 + 5 === 17 },
          ] },
        { id: 'minus-bracket', title: 'Вычитая сумму, второе слагаемое прибавляет', kidName: 'Плюсик-перевёртыш',
          kidRule: 'ты раскрываешь скобки после минуса и оставляешь у второго слагаемого плюс',
          say: 'Вычесть сумму — значит вычесть и первое, и второе слагаемое. Из скобок после минуса оба выходят со знаком «−».',
          fixIdea: 'a − (b + c) = a − b − c: потратил и на первое, и на второе.',
          explainOptions: ['Вычесть сумму — вычесть каждое слагаемое', 'После минуса скобки просто убирают', 'Второе слагаемое прибавляют обратно'],
          conflicts: [
            { text: 'По твоему правилу 100 − (30 + 20) = 100 − 30 + 20 = 90. Но 30 + 20 = 50 и 100 − 50 = 50. Из 100 рублей потратили 30 и ещё 20 — останется 50.', ask: 'Сколько рублей останется?', choices: ['50', '90'], right: '50', verify: () => 100 - (30 + 20) === 50 },
          ] },
        { id: 'compensate-wrong', title: 'При удобном счёте делает поправку не в ту сторону', kidName: 'Обратный поправщик',
          kidRule: 'ты округляешь число для удобства, а потом поправляешь ответ не в ту сторону',
          say: 'Подумай, на сколько ты ошибся, когда округлил: прибавил или вычел лишнее? Поправка должна это лишнее вернуть.',
          fixIdea: 'Вычел лишнее — верни (прибавь). Прибавил лишнее — убери (вычти).',
          explainOptions: ['Поправка возвращает то, что добавили или отняли при округлении', 'Поправку всегда вычитают', 'Поправку делают тем же действием, что и в примере'],
          conflicts: [
            { text: 'По твоему правилу 135 − 98 = 135 − 100 − 2 = 33. Но вычесть 100 — это уже на 2 больше, чем 98. Эти 2 надо вернуть: 35 + 2 = 37.', ask: 'Сколько будет 135 − 98?', choices: ['37', '33'], right: '37', verify: () => 135 - 98 === 37 },
          ] },
      ],
      generate(lv) {
        const type = pick(L3(lv, ['dist', 'diststory', 'compmul', 'minusbr', 'assoc'], ['dist', 'diststory', 'compmul', 'compadd', 'compadd', 'minusbr'], ['dist', 'diststory', 'compmul', 'compadd', 'minusbr']));
        if (type === 'dist') {
          const a = lv === 3 ? rnd(11, 19) : rnd(L3(lv, 2, 3), 9), b = lv === 2 && Math.random() < 0.4 ? rnd(1, 9) * 100 : rnd(2, 9) * 10, c = rnd(1, 9), minus = Math.random() < 0.35;
          const res = a * (minus ? b - c : b + c), op = minus ? '−' : '+';
          return {
            story: 'Раскрой скобки и посчитай.', question: `${num(a)} · (${num(b)} ${op} ${num(c)}) = ?`,
            answer: ans(res),
            hints: [`На ${num(a)} нужно умножить и ${num(b)}, и ${num(c)}.`, `${num(a)} · ${num(b)} = ${num(a * b)}, ${num(a)} · ${num(c)} = ${num(a * c)}.`],
            solution: `${num(a)} · ${num(b)} ${op} ${num(a)} · ${num(c)} = ${num(a * b)} ${op} ${num(a * c)} = ${num(res)}.`,
            wrongs: { 'first-only': ans(minus ? a * b - c : a * b + c) },
            data: { type: 'dist', a, b, c: minus ? -c : c },
          };
        }
        if (type === 'diststory') {
          return pick([
            () => { const a = L3(lv, rnd(3, 9), rnd(10, 30), rnd(15, 35)), b = pick([100, 150, 200, 250, 300]), c = pick([20, 30, 40, 50, 60]);
              return { story: `В музей идут ${num(a)} ${pl(a, 'ученик', 'ученика', 'учеников')}. Каждый платит ${num(b)} ${rub(b)} за билет и ${num(c)} ${rub(c)} за экскурсию.`, question: 'Сколько рублей заплатят все вместе?',
                answer: ans(a * (b + c)), hints: ['Каждый платит и за билет, и за экскурсию. Сколько платит один человек?', `Один платит ${num(b)} + ${num(c)} = ${num(b + c)}. Умножь на ${num(a)}.`],
                solution: `${num(a)} · (${num(b)} + ${num(c)}) = ${num(a)} · ${num(b + c)} = ${num(a * (b + c))}.`, wrongs: { 'first-only': ans(a * b + c) }, data: { type: 'dist', a, b, c } }; },
            () => { const a = rnd(2, 9), b = rnd(6, 15), c = rnd(2, 5);
              return { story: `В каждой из ${num(a)} коробок лежат ${num(b)} синих и ${num(c)} ${pl(c, 'красный карандаш', 'красных карандаша', 'красных карандашей')}.`, question: 'Сколько всего карандашей во всех коробках?',
                answer: ans(a * (b + c)), hints: ['Не забудь: красные карандаши лежат в каждой коробке, а не только в одной.', `В одной коробке ${num(b)} + ${num(c)} = ${num(b + c)} карандашей.`],
                solution: `${num(a)} · (${num(b)} + ${num(c)}) = ${num(a * b)} + ${num(a * c)} = ${num(a * (b + c))}.`, wrongs: { 'first-only': ans(a * b + c) }, data: { type: 'dist', a, b, c } }; },
            () => { const a = rnd(2, 9), b = rnd(6, 15), c = rnd(1, 3);
              return { story: `На соревнования приехали ${num(a)} ${pl(a, 'команда', 'команды', 'команд')}. В каждой — ${num(b)} ${pl(b, 'игрок', 'игрока', 'игроков')} и ${num(c)} ${pl(c, 'тренер', 'тренера', 'тренеров')}.`, question: 'Сколько всего человек приехало?',
                answer: ans(a * (b + c)), hints: ['Тренеры есть в каждой команде.', `В одной команде ${num(b)} + ${num(c)} = ${num(b + c)} человек.`],
                solution: `${num(a)} · (${num(b)} + ${num(c)}) = ${num(a * (b + c))}.`, wrongs: { 'first-only': ans(a * b + c) }, data: { type: 'dist', a, b, c } }; },
          ])();
        }
        if (type === 'compmul') {
          const R = lv === 1 ? rnd(2, 9) * 10 : pick([rnd(2, 9) * 10, rnd(1, 9) * 100]), up = lv > 1 && Math.random() < 0.3, n = up ? R + 1 : R - 1, a = rnd(2, 9), res = n * a;
          const shop = !up && R >= 100 && Math.random() < 0.6;
          return {
            story: shop ? `Одна футболка стоит ${num(n)} ${rub(n)}.` : 'Посчитай удобным способом.',
            question: shop ? `Сколько рублей стоят ${num(a)} ${pl(a, 'такая футболка', 'такие футболки', 'таких футболок')}?` : `${num(n)} · ${num(a)} = ?`,
            answer: ans(res),
            hints: [`${num(n)} = ${num(R)} ${up ? '+' : '−'} 1. Умножь на ${num(a)} каждую часть: и ${num(R)}, и 1.`, `${num(R)} · ${num(a)} = ${num(R * a)}, 1 · ${num(a)} = ${num(a)}.`],
            solution: `${num(n)} · ${num(a)} = (${num(R)} ${up ? '+' : '−'} 1) · ${num(a)} = ${num(R * a)} ${up ? '+' : '−'} ${num(a)} = ${num(res)}.`,
            wrongs: { 'first-only': ans(up ? R * a + 1 : R * a - 1) },
            data: { type: 'mul', n, a },
          };
        }
        if (type === 'compadd') {
          const R = pick(L3(lv, [100], [100, 200], [100, 200, 1000])), k = rnd(1, 5), n = R - k, plus = Math.random() < 0.45;
          const x = plus ? rnd(R === 1000 ? 1000 : 100, R === 1000 ? 8999 : 899) : rnd(R + 10, R === 1000 ? 8999 : R + 899);
          const res = plus ? x + n : x - n, wr = plus ? x + R + k : x - R - k;
          const st = pick([
            () => (plus ? { story: `В копилке ${num(x)} ${rub(x)}. Дима положил туда ещё ${num(n)} ${rub(n)}.`, question: 'Сколько рублей стало в копилке?' }
              : { story: `В кошельке у Димы ${num(x)} ${rub(x)}. Он купил игру за ${num(n)} ${rub(n)}.`, question: 'Сколько рублей у него осталось?' }),
            () => ({ story: 'Посчитай удобным способом.', question: `${num(x)} ${plus ? '+' : '−'} ${num(n)} = ?` }),
          ])();
          return Object.assign(st, {
            answer: ans(res),
            hints: [`${num(n)} = ${num(R)} − ${num(k)}. ${plus ? 'Прибавь' : 'Вычти'} ${num(R)} — это на ${num(k)} больше, чем нужно. Что сделать с этой разницей?`,
              plus ? `${num(x)} + ${num(R)} = ${num(x + R)}. Мы прибавили на ${num(k)} больше — эту разницу нужно убрать.` : `${num(x)} − ${num(R)} = ${num(x - R)}. Мы вычли на ${num(k)} больше — эту разницу нужно вернуть.`],
            solution: plus ? `${num(x)} + ${num(R)} − ${num(k)} = ${num(res)}.` : `${num(x)} − ${num(R)} + ${num(k)} = ${num(res)}.`,
            wrongs: wr >= 0 ? { 'compensate-wrong': ans(wr) } : {},
            data: { type: 'add', x, n: plus ? n : -n },
          });
        }
        if (type === 'minusbr') {
          const R = pick(L3(lv, [100, 200], [100, 200, 300, 500], [300, 500, 1000])), b = rnd(R < 1000 ? 11 : 101, R < 1000 ? 99 : 999), a = b + R, c = rnd(11, Math.min(R - 1, 99));
          const swap = Math.random() < 0.3;
          return {
            story: pick(['Найди значение удобным способом.', 'Посчитай удобно.']),
            question: swap ? `${num(a)} − (${num(c)} + ${num(b)}) = ?` : `${num(a)} − (${num(b)} + ${num(c)}) = ?`,
            answer: ans(R - c),
            hints: ['Вычесть сумму — значит вычесть по очереди каждое слагаемое. Какое удобнее вычесть первым?', `${num(a)} − ${num(b)} = ${num(R)}. Осталось вычесть ${num(c)}.`],
            solution: `${num(a)} − ${num(b)} − ${num(c)} = ${num(R)} − ${num(c)} = ${num(R - c)}.`,
            wrongs: { 'minus-bracket': ans(swap ? a - c + b : R + c) },
            data: { type: 'minusbr', a, b, c },
          };
        }
        const [p, q] = pick([[25, 4], [50, 2], [5, 2], [20, 5], [125, 8]]), m = rnd(3, 19);
        return {
          story: 'Посчитай удобным способом.', question: `${num(p)} · ${num(m)} · ${num(q)} = ?`,
          answer: ans(p * m * q),
          hints: [`Переставь множители: какие два из них дают круглое число?`, `${num(p)} · ${num(q)} = ${num(p * q)}. Осталось умножить на ${num(m)}.`],
          solution: `(${num(p)} · ${num(q)}) · ${num(m)} = ${num(p * q)} · ${num(m)} = ${num(p * q * m)}.`,
          wrongs: {},
          data: { type: 'assoc', p, m, q },
        };
      },
      verify(t) {
        const d = t.data, r = +t.answer;
        switch (d.type) {
          case 'dist': return r === rep(d.a, d.b) + rep(d.a, d.c);
          case 'mul': return r === rep(d.a, d.n);
          case 'add': return d.n > 0 ? r - d.n === d.x : r - d.n === d.x && r >= 0;
          case 'minusbr': return r + d.c + d.b === d.a;
          default: return r === rep(d.m, d.p * d.q);
        }
      },
    },

    /* 8. n5-divisors ------------------------------------------------ */
    {
      id: 'n5-divisors', strand: 'Натуральные числа',
      short: 'Делители', title: 'Делители и кратные, простые и составные числа',
      frp: ['Делители и кратные числа, разложение числа на множители', 'Простые и составные числа'],
      goal: 'Различать делители и кратные, находить все делители числа, отличать простые числа от составных.',
      requires: ['f4-table'],
      explain: {
        model: '24 конфеты раскладывают в пакеты поровну, без остатка. По 1, 2, 3, 4, 6, 8, 12 или 24 штуки — получится, а по 5 — нет. Числа 1, 2, 3, 4, 6, 8, 12, 24 — делители числа 24. А 24, 48, 72… — кратные числа 24: столько конфет в одной, двух, трёх коробках по 24.',
        figure: { type: 'dots5n', rows: 4, cols: 6 },
        figureCaption: '24 = 4 · 6: значит, 4 и 6 — делители числа 24',
        rule: '<ul class="rule-list"><li><b>Делитель</b> числа a — число, на которое a делится без остатка. Делители не больше самого числа; среди них всегда есть <b>1 и само число</b>.</li><li><b>Кратное</b> числа a — число, которое делится на a: a, 2a, 3a, … Кратные не меньше самого числа, их бесконечно много.</li><li><b>Простое</b> число имеет ровно два делителя: 1 и само себя (2, 3, 5, 7, 11, 13…). <b>Составное</b> — больше двух делителей.</li><li><b>1</b> — ни простое, ни составное: у неё один делитель. <b>2</b> — единственное чётное простое. Нечётное число бывает составным: 9 = 3 · 3, 15 = 3 · 5.</li></ul>',
        examples: [
          { q: 'Простое ли число 21?', choices: ['нет', 'да'], correct: 0, wrong: { 1: 'odd-is-prime' }, steps: ['21 делится на 3: 21 = 3 · 7.', 'У 21 больше двух делителей: 1, 3, 7, 21. Это составное число.'] },
          { q: 'Сколько делителей у числа 12?', choices: ['6', '4'], correct: 0, wrong: { 1: 'forget-1-n' }, steps: ['Ищем пары: 1 · 12, 2 · 6, 3 · 4.', 'Делители: 1, 2, 3, 4, 6, 12 — шесть. Не забывай 1 и само число!'] },
          { q: 'Какое из чисел — делитель числа 18: 6 или 36?', choices: ['6', '36'], correct: 0, wrong: { 1: 'div-mult-swap' }, steps: ['18 : 6 = 3 — делится без остатка, значит, 6 — делитель числа 18.', '36 — кратное числа 18: 36 = 18 · 2.'] },
        ],
      },
      mistakes: [
        { id: 'one-is-prime', title: 'Считает 1 простым числом', kidName: 'Одинокая единица',
          kidRule: 'ты думаешь, что 1 — простое число, раз оно делится только на себя',
          say: 'У простого числа ровно два разных делителя: 1 и само число. У единицы делитель только один, поэтому она не простая и не составная.',
          fixIdea: 'Простое — ровно два делителя. У 1 один делитель: она ни простая, ни составная.',
          explainOptions: ['У простого числа ровно два делителя, а у 1 — один', '1 делится на 1 и на себя, значит, она простая', '1 — составное число'],
          conflicts: [
            { text: 'Простое число делится ровно на два числа: на 1 и на само себя. 7 делится на 1 и на 7 — два делителя. А у 1 какие делители?', ask: 'Сколько делителей у числа 1?', choices: ['1', '2'], right: '1', verify: () => divisors(1).length === 1 && divisors(7).length === 2 },
          ] },
        { id: 'div-mult-swap', title: 'Путает делитель и кратное', kidName: 'Путаник',
          kidRule: 'ты называешь делителем кратное и наоборот',
          say: 'Делитель меньше числа (или равен ему): на него число делится. Кратное больше числа (или равно ему): оно само делится на это число.',
          fixIdea: 'Делитель — «влезает» в число без остатка, он не больше числа. Кратное — число, в которое влезает данное, оно не меньше.',
          explainOptions: ['Делитель не больше числа, кратное — не меньше', 'Делитель всегда больше числа', 'Делитель и кратное — одно и то же'],
          conflicts: [
            { text: 'По твоему правилу 18 — делитель числа 6. Но разделить 6 конфет поровну на 18 ребят без остатка нельзя: каждому не достанется даже по одной.', ask: 'Делится ли 6 на 18 без остатка?', choices: ['да', 'нет'], right: 'нет', verify: () => 6 % 18 !== 0 },
          ] },
        { id: 'odd-is-prime', title: 'Считает все нечётные числа простыми', kidName: 'Нечётный обманщик',
          kidRule: 'ты думаешь, что нечётное число — значит простое',
          say: 'Нечётное число может делиться на 3, 5, 7… Проверь, нет ли у числа делителей, кроме 1 и его самого.',
          fixIdea: 'Простое число — то, у которого нет делителей, кроме 1 и себя. Нечётность этого не гарантирует: 9, 15, 21 — составные.',
          explainOptions: ['Нечётное число бывает составным: у него могут быть делители 3, 5, 7…', 'Все нечётные числа простые', 'Простые бывают только чётными'],
          conflicts: [
            { text: 'По твоему правилу 21 — простое. Но 21 стул можно поставить в 3 ряда по 7: 21 = 3 · 7.', ask: 'Есть у числа 21 делитель 3?', choices: ['да', 'нет'], right: 'да', verify: () => 21 % 3 === 0 && !isPrime(21) },
          ] },
        { id: 'forget-1-n', title: 'Забывает 1 и само число среди делителей', kidName: 'Забыл-края',
          kidRule: 'ты выписываешь делители «из середины», а 1 и само число пропускаешь',
          say: 'Любое число делится на 1 и на само себя — это тоже делители. Выписывай делители парами, начиная с 1 · число.',
          fixIdea: 'Начинай список делителей с пары «1 и само число», потом ищи остальные пары.',
          explainOptions: ['1 и само число — тоже делители, их надо считать', '1 и само число не считаются', 'Делители — только числа меньше половины'],
          conflicts: [
            { text: 'Делители числа 6 — только 2 и 3? Но 6 конфет можно положить в 1 пакет (все шесть) или в 6 пакетов по одной. Значит, 6 делится и на 1, и на 6.', ask: 'Сколько делителей у числа 6?', choices: ['4', '2'], right: '4', verify: () => divisors(6).length === 4 },
          ] },
      ],
      generate(lv) {
        const max = L3(lv, 30, 60, 99);
        const type = pick(L3(lv, ['prime', 'prime', 'pick', 'count'], ['prime', 'list', 'list', 'pick', 'count'], ['prime', 'list', 'pick', 'count']));
        if (type === 'prime') {
          const n = pickW([[1, 2], [pick(upTo(ODD_COMP, max)), 4], [pick([2, ...upTo(ODD_PRIMES, max)]), 2], [pick(upTo(EVEN_COMP, max)), 1]]);
          const prime = isPrime(n), w = {};
          const form = pick(['q', 'petya', 'rect']);
          let story, question, yes;
          if (form === 'rect' && n > 1) {
            story = `Можно ли выложить ${num(n)} ${pl(n, 'фишку', 'фишки', 'фишек')} прямоугольником из нескольких одинаковых рядов, чтобы рядов было больше одного и в каждом ряду — больше одной фишки?`;
            question = 'Выбери ответ.'; yes = !prime;
            if (ODD_COMP.includes(n)) w['odd-is-prime'] = 'нет';
          } else if (form === 'petya') {
            story = `Петя говорит, что число ${num(n)} — простое.`; question = 'Прав ли Петя?'; yes = prime;
          } else { story = ''; question = `Число ${num(n)} — простое?`; yes = prime; }
          if (form !== 'rect' || n === 1) { if (n === 1) w['one-is-prime'] = 'да'; else if (ODD_COMP.includes(n)) w['odd-is-prime'] = 'да'; }
          const ds = divisors(n);
          return {
            story, question, choices: ['да', 'нет'], answer: yes ? 'да' : 'нет', accept: 'choice',
            hints: ['Сколько делителей у этого числа? У простого их ровно два: 1 и само число.', n === 1 ? 'У числа 1 только один делитель.' : `Проверь, делится ли ${num(n)} на 2, 3, 5, 7.`],
            solution: `Делители числа ${num(n)}: ${ds.map(num).join(', ')}. ${n === 1 ? 'Один делитель — 1 не простое и не составное.' : prime ? 'Ровно два делителя — число простое.' : 'Больше двух делителей — число составное.'} Ответ: ${yes ? 'да' : 'нет'}.`,
            wrongs: w,
            data: { kind: 'prime', n, form },
          };
        }
        if (type === 'list') {
          const with1 = Math.random() < 0.45;
          let list;
          if (with1) list = [1, ...shuffle(upTo(ODD_PRIMES, max)).slice(0, rnd(2, 3)), ...shuffle(upTo(EVEN_COMP, max)).slice(0, rnd(1, 2))];
          else list = [...shuffle(upTo(ODD_COMP, max)).slice(0, rnd(2, 3)), ...shuffle(upTo(ODD_PRIMES, max)).slice(0, rnd(1, 2)), ...shuffle(upTo(EVEN_COMP, max)).slice(0, rnd(1, 2))];
          list.sort((x, y) => x - y);
          const cnt = list.filter(isPrime).length, w = {};
          if (with1) w['one-is-prime'] = ans(cnt + 1); else w['odd-is-prime'] = ans(list.filter(x => x % 2 === 1).length);
          return {
            story: `Даны числа: ${list.map(num).join(', ')}.`, question: 'Сколько среди них простых чисел?',
            answer: ans(cnt),
            hints: ['Для каждого числа проверь: есть ли у него делители, кроме 1 и самого себя?', 'Помни: 1 — не простое, а нечётное число может делиться на 3, 5 или 7.'],
            solution: `Простые: ${list.filter(isPrime).map(num).join(', ') || 'их нет'}. Ответ: ${num(cnt)}.`,
            wrongs: w,
            data: { kind: 'list', list },
          };
        }
        if (type === 'pick') {
          let n; do { n = rnd(...L3(lv, [4, 12], [6, 24], [12, 40])); } while (isPrime(n));
          const dvs = divisors(n).filter(x => x > 1 && x < n), d = pick(dvs), m = n * rnd(2, lv === 1 ? 3 : 5);
          let x; do { x = rnd(2, 3 * n); } while (n % x === 0 || x % n === 0 || x === d || x === m);
          const askDiv = Math.random() < 0.5, right = askDiv ? d : m, wrong = askDiv ? m : d;
          const st = askDiv
            ? pick([{ story: '', question: `Какое из чисел является делителем числа ${num(n)}?` },
              { story: `${num(n)} ${pl(n, 'ученик', 'ученика', 'учеников')} делятся на команды поровну, без лишних.`, question: 'Сколько человек может быть в каждой команде?' }])
            : pick([{ story: '', question: `Какое из чисел кратно ${num(n)}?` },
              { story: `Пирожки продают только в коробках по ${num(n)} штук.`, question: 'Сколько пирожков можно купить, если брать только целые коробки?' }]);
          return Object.assign(st, {
            choices: shuffle([d, m, x].map(num)), answer: num(right), accept: 'choice',
            hints: [askDiv ? `Делитель — число, на которое ${num(n)} делится без остатка. Он не больше ${num(n)}.` : `Кратное ${num(n)} — число, которое делится на ${num(n)} без остатка. Оно не меньше ${num(n)}.`, askDiv ? `Проверь каждое число: делится ли ${num(n)} на него?` : `Проверь каждое число: делится ли оно на ${num(n)}?`],
            solution: askDiv ? `${num(n)} : ${num(d)} = ${num(n / d)} — без остатка, значит, ${num(d)} — делитель. А ${num(m)} — кратное.` : `${num(m)} : ${num(n)} = ${num(m / n)} — без остатка, значит, ${num(m)} кратно ${num(n)}. А ${num(d)} — делитель.`,
            wrongs: { 'div-mult-swap': num(wrong) },
            data: { kind: 'pick', n, askDiv, nums: [d, m, x] },
          });
        }
        const n = pick(L3(lv, [6, 8, 10, 12, 14, 15, 16, 18, 20, 21], [12, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48], [36, 48, 60, 64, 72, 80, 84, 90, 96, 100]));
        const ds = divisors(n);
        const st = pick([
          { story: '', question: `Сколько делителей у числа ${num(n)}?` },
          { story: `Выпиши все делители числа ${num(n)}.`, question: 'Сколько их получилось?' },
          { story: `Витя выписывает все числа, на которые ${num(n)} делится без остатка.`, question: 'Сколько чисел он должен выписать?' },
        ]);
        return Object.assign(st, {
          answer: ans(ds.length),
          hints: [`Ищи делители парами: 1 · ${num(n)}, 2 · …, 3 · …`, `Не забудь 1 и само число ${num(n)}.`],
          solution: `Делители: ${ds.map(num).join(', ')}. Всего ${num(ds.length)}.`,
          wrongs: { 'forget-1-n': ans(ds.length - 2) },
          data: { kind: 'count', n },
        });
      },
      verify(t) {
        const d = t.data;
        const prime = n => { if (n < 2) return false; let c = 0; for (let i = 1; i <= n; i++) if (n % i === 0) c++; return c === 2; };
        if (d.kind === 'prime') return t.answer === ((d.form === 'rect' && d.n > 1 ? !prime(d.n) : prime(d.n)) ? 'да' : 'нет');
        if (d.kind === 'list') return d.list.filter(prime).length === +t.answer;
        if (d.kind === 'pick') { const ok = d.nums.filter(x => (d.askDiv ? d.n % x === 0 : x % d.n === 0)); return ok.length === 1 && num(ok[0]) === t.answer; }
        let c = 0; for (let i = 1; i <= d.n; i++) if (d.n % i === 0) c++; return c === +t.answer;
      },
    },

    /* 9. n5-divisibility ------------------------------------------------ */
    {
      id: 'n5-divisibility', strand: 'Натуральные числа',
      short: 'Делимость', title: 'Признаки делимости на 2, 3, 5, 9, 10',
      frp: ['Признаки делимости на 2, 5, 10, 3, 9'],
      goal: 'Определять делимость на 2, 5, 10 по последней цифре, а на 3 и 9 — по сумме цифр.',
      requires: ['n5-divisors'],
      explain: {
        model: 'На турнир приехали 132 школьника. Можно ли разбить их на тройки? Последняя цифра 2 — но для деления на 3 она ничего не говорит! Складываем цифры: 1 + 3 + 2 = 6. 6 делится на 3 — значит, и 132 делится на 3: получится 44 тройки.',
        rule: '<ul class="rule-list"><li><b>На 2</b> — последняя цифра чётная: 0, 2, 4, 6, 8.</li><li><b>На 5</b> — последняя цифра 0 или 5.</li><li><b>На 10</b> — последняя цифра 0.</li><li><b>На 3</b> — сумма цифр делится на 3. Последняя цифра тут ничего не решает!</li><li><b>На 9</b> — сумма цифр делится на 9. Если сумма делится только на 3 — число делится на 3, но не на 9.</li></ul>',
        examples: [
          { q: 'Делится ли 132 на 3?', choices: ['да', 'нет'], correct: 0, wrong: { 1: 'three-by-last' }, steps: ['Сумма цифр: 1 + 3 + 2 = 6.', '6 делится на 3 — значит, и 132 делится на 3.'] },
          { q: 'Делится ли 1245 на 9?', choices: ['нет', 'да'], correct: 0, wrong: { 1: 'nine-as-three' }, steps: ['Сумма цифр: 1 + 2 + 4 + 5 = 12.', '12 делится на 3, но не на 9. Значит, 1245 делится на 3, но не на 9.'] },
          { q: 'Можно ли набрать ровно 370 рублей монетами по 5 рублей?', choices: ['да', 'нет'], correct: 0, wrong: { 1: 'five-only-5' }, steps: ['370 оканчивается на 0.', 'Числа, которые оканчиваются на 0 или 5, делятся на 5: 370 : 5 = 74 монеты.'] },
        ],
      },
      mistakes: [
        { id: 'three-by-last', title: 'Проверяет делимость на 3 по последней цифре', kidName: 'Хвостик-тройка',
          kidRule: 'ты смотришь на последнюю цифру, как для 2 и 5, и решаешь, делится ли число на 3',
          say: 'Для 3 последняя цифра ничего не решает: 13 не делится на 3, а 12 делится. Сложи все цифры числа.',
          fixIdea: 'Делимость на 3 и на 9 проверяют по сумме всех цифр, а не по последней цифре.',
          explainOptions: ['На 3 проверяют по сумме цифр, а не по последней цифре', 'Число делится на 3, если оканчивается на 3, 6 или 9', 'На 3 делятся только нечётные числа'],
          conflicts: [
            { text: 'По твоему правилу 13 делится на 3 — оно же оканчивается на 3. Но 13 конфет на троих поровну не делятся: по 4, и 1 остаётся.', ask: '13 делится на 3?', choices: ['да', 'нет'], right: 'нет', verify: () => 13 % 3 !== 0 },
            { text: 'А 12 оканчивается на 2 — по твоему правилу на 3 не делится. Но 12 = 3 · 4!', ask: '12 делится на 3?', choices: ['да', 'нет'], right: 'да', verify: () => 12 % 3 === 0 },
          ] },
        { id: 'nine-as-three', title: 'Путает признаки делимости на 9 и на 3', kidName: 'Тройка-девятка',
          kidRule: 'ты считаешь, что если сумма цифр делится на 3, то число делится и на 9',
          say: 'Для 9 сумма цифр должна делиться именно на 9. Если она делится только на 3 — число делится на 3, но не на 9.',
          fixIdea: 'На 9 — сумма цифр делится на 9. На 3 — сумма цифр делится на 3. Всё, что делится на 9, делится и на 3, но не наоборот.',
          explainOptions: ['Для 9 сумма цифр должна делиться на 9, а не на 3', 'Если сумма цифр делится на 3, то число делится на 9', 'На 9 проверяют по последней цифре'],
          conflicts: [
            { text: 'Сумма цифр числа 12 — это 3, она делится на 3. По твоему правилу 12 делится на 9. Но 12 : 9 — это 1 и ещё 3 в остатке.', ask: '12 делится на 9?', choices: ['да', 'нет'], right: 'нет', verify: () => 12 % 9 !== 0 && 12 % 3 === 0 },
          ] },
        { id: 'five-only-5', title: 'Считает, что на 5 делятся только числа, оканчивающиеся на 5', kidName: 'Забыл-ноль',
          kidRule: 'ты думаешь, что на 5 делится число, только если оно оканчивается на 5, а про 0 забываешь',
          say: 'На 5 делятся числа, которые оканчиваются на 5 или на 0. 10, 20, 30 — тоже делятся на 5.',
          fixIdea: 'На 5 делится число, если последняя цифра 0 или 5.',
          explainOptions: ['На 5 делятся числа с последней цифрой 0 или 5', 'На 5 делятся только числа, оканчивающиеся на 5', 'Число с нулём на конце делится только на 10'],
          conflicts: [
            { text: 'По твоему правилу 20 на 5 не делится — оно оканчивается на 0. Но 20 рублей — это ровно 4 монеты по 5 рублей.', ask: '20 делится на 5?', choices: ['да', 'нет'], right: 'да', verify: () => 20 % 5 === 0 },
          ] },
      ],
      generate(lv) {
        const L = L3(lv, 3, rnd(3, 4), rnd(4, 5)), lo = 10 ** (L - 1), hi = 10 ** L - 1;
        const type = pick(L3(lv, ['yn', 'yn', 'yn', 'count'], ['yn', 'yn', 'count', 'count', 'digit'], ['yn', 'count', 'count', 'digit']));
        const findN = cond => { for (let g = 0; g < 5000; g++) { const n = rnd(lo, hi); if (cond(n)) return n; } return null; };
        if (type === 'yn') {
          const k = pickW(L3(lv, [[3, 4], [9, 3], [5, 3], [2, 1], [10, 1]], [[3, 4], [9, 4], [5, 3], [2, 1]], [[3, 4], [9, 4], [5, 2]]));
          let n, w = {};
          if (k === 3) {
            const tricky = Math.random() < 0.75, div = Math.random() < 0.5;
            n = findN(x => (x % 3 === 0) === div && (!tricky || ([0, 3, 6, 9].includes(x % 10) !== div)));
            const byLast = [0, 3, 6, 9].includes(n % 10); if (byLast !== (n % 3 === 0)) w['three-by-last'] = byLast ? 'да' : 'нет';
          } else if (k === 9) {
            const tricky = Math.random() < 0.65;
            n = tricky ? findN(x => x % 3 === 0 && x % 9 !== 0) : findN(x => Math.random() < 0.5 ? x % 9 === 0 : x % 3 !== 0);
            if (n % 3 === 0 && n % 9 !== 0) w['nine-as-three'] = 'да';
          } else if (k === 5) {
            const r = Math.random(); n = findN(x => (r < 0.6 ? x % 10 === 0 : r < 0.8 ? x % 10 === 5 : x % 5 !== 0));
            if (n % 10 === 0) w['five-only-5'] = 'нет';
          } else n = findN(() => true);
          const yes = n % k === 0;
          const st = pick([
            () => ({ story: '', question: `Делится ли число ${num(n)} на ${num(k)}?` }),
            () => ({ 3: { story: `На турнир приехали ${num(n)} ${pl(n, 'школьник', 'школьника', 'школьников')}.`, question: 'Получится ли разбить всех на команды по 3 человека без лишних?' },
              9: { story: `${num(n)} ${pl(n, 'конфету', 'конфеты', 'конфет')} раскладывают в коробки по 9 штук.`, question: 'Получится ли разложить все конфеты так, чтобы не осталось лишних?' },
              5: { story: '', question: `Можно ли набрать ровно ${num(n)} ${rub(n)} монетами по 5 рублей?` },
              2: { story: `${num(n)} ${pl(n, 'ученик', 'ученика', 'учеников')} встают парами.`, question: 'Хватит ли пары каждому?' },
              10: { story: '', question: `Можно ли набрать ровно ${num(n)} ${rub(n)} монетами по 10 рублей?` } }[k]),
          ])();
          const rule = k === 3 || k === 9 ? `сумма цифр ${String(n).split('').join(' + ')} = ${num(dsum(n))}` : `последняя цифра ${num(n % 10)}`;
          return Object.assign(st, {
            choices: ['да', 'нет'], answer: yes ? 'да' : 'нет', accept: 'choice',
            hints: [k === 3 || k === 9 ? `Для ${num(k)} смотрят на сумму цифр, а не на последнюю цифру.` : `Для ${num(k)} смотрят на последнюю цифру.`, `Здесь ${rule}.`],
            solution: `${rule[0].toUpperCase() + rule.slice(1)} — значит, число ${num(n)} ${yes ? '' : 'не '}делится на ${num(k)}. Ответ: ${yes ? 'да' : 'нет'}.`,
            wrongs: w,
            data: { kind: 'yn', n, k },
          });
        }
        if (type === 'count') {
          const k = pick(L3(lv, [3, 5], [3, 9, 5], [3, 9])), list = new Set();
          const tricky = { 3: x => [0, 3, 6, 9].includes(x % 10) !== (x % 3 === 0), 9: x => x % 3 === 0 && x % 9 !== 0, 5: x => x % 10 === 0 }[k];
          const L2 = lv === 1 ? 3 : L, lo2 = 10 ** (L2 - 1), hi2 = 10 ** L2 - 1;
          while (list.size < 2) { const x = rnd(lo2, hi2); if (tricky(x)) list.add(x); }
          if (k === 9) { let x; do { x = rnd(lo2, hi2); } while (x % 9 !== 0); list.add(x); }
          while (list.size < 5) list.add(rnd(lo2, hi2));
          const arr = shuffle([...list]), cnt = arr.filter(x => x % k === 0).length;
          const wv = { 3: arr.filter(x => [0, 3, 6, 9].includes(x % 10)).length, 9: arr.filter(x => x % 3 === 0).length, 5: arr.filter(x => x % 10 === 5).length }[k];
          const id = { 3: 'three-by-last', 9: 'nine-as-three', 5: 'five-only-5' }[k];
          return {
            story: `Даны числа: ${arr.map(num).join('; ')}.`, question: `Сколько из них делятся на ${num(k)}?`,
            answer: ans(cnt),
            hints: [k === 5 ? 'Для 5 смотри на последнюю цифру: 0 или 5.' : `Для ${num(k)} найди сумму цифр каждого числа.`, k === 5 ? 'Не забудь числа, которые оканчиваются на 0.' : `Сумма цифр должна делиться на ${num(k)}.`],
            solution: `Делятся на ${num(k)}: ${arr.filter(x => x % k === 0).map(num).join(', ') || 'ни одно'}. Ответ: ${num(cnt)}.`,
            wrongs: wv !== cnt ? { [id]: ans(wv) } : {},
            data: { kind: 'count', arr, k },
          };
        }
        // digit: наименьшая цифра вместо *, чтобы число делилось на 9
        let a, b, s, r, w3;
        for (let g = 0; g < 500; g++) { a = rnd(...L3(lv, [1, 9], [1, 99], [10, 999])); b = rnd(0, 9); s = dsum(a) + b; r = (9 - (s % 9)) % 9; w3 = (3 - (s % 3)) % 3; if (w3 !== r) break; }
        const shown = `${a}*${b}`;
        return {
          story: `В записи числа ${shown} одна цифра заменена звёздочкой.`, question: 'Какую наименьшую цифру нужно поставить вместо звёздочки, чтобы число делилось на 9?',
          answer: ans(r),
          hints: [`Сумма известных цифр: ${num(s)}. Вместе с новой цифрой сумма должна делиться на 9.`, `Ближайшее число, кратное 9, не меньше ${num(s)} — это ${num(s + r)}.`],
          solution: `${num(s)} + ${num(r)} = ${num(s + r)} — делится на 9. Ответ: ${num(r)}.`,
          wrongs: w3 !== r ? { 'nine-as-three': ans(w3) } : {},
          data: { kind: 'digit', a, b },
        };
      },
      verify(t) {
        const d = t.data;
        if (d.kind === 'yn') return t.answer === (d.n % d.k === 0 ? 'да' : 'нет');
        if (d.kind === 'count') return d.arr.filter(x => x % d.k === 0).length === +t.answer;
        for (let x = 0; x <= 9; x++) if (+(String(d.a) + x + String(d.b)) % 9 === 0) return x === +t.answer;
        return false;
      },
    },

    /* 10. n5-remainder ------------------------------------------------ */
    {
      id: 'n5-remainder', strand: 'Натуральные числа',
      short: 'С остатком', title: 'Деление с остатком',
      frp: ['Деление с остатком', 'Решение текстовых задач на все арифметические действия'],
      goal: 'Делить с остатком, помня, что остаток меньше делителя; находить делимое по формуле a = b · q + r; понимать остаток в задачах.',
      requires: ['f4-longdiv'],
      explain: {
        model: '47 конфет раздают 6 ребятам поровну, каждому как можно больше. По 7 — это 42 конфеты, и ещё 5 останется: 47 : 6 = 7 (ост. 5). Остаток всегда меньше делителя: если бы осталось 6 или больше, каждому можно было бы дать ещё по одной.',
        rule: '<ul class="rule-list"><li>a : b = q (ост. r): q — <b>неполное частное</b>, r — <b>остаток</b>.</li><li>Остаток <b>всегда меньше делителя</b>: r < b.</li><li>Проверка: <b>a = b · q + r</b>. Остаток не забывай!</li><li>В задаче «сколько нужно лодок» лишние люди тоже должны уехать: если есть остаток, нужна ещё одна лодка.</li></ul>',
        examples: [
          { q: '47 : 6. Найди неполное частное.', choices: ['7', '6'], correct: 0, wrong: { 1: 'rem-too-big' }, steps: ['6 · 7 = 42, а 6 · 8 = 48 — это уже больше 47.', 'Неполное частное 7, остаток 47 − 42 = 5 — он меньше 6.'] },
          { q: 'При делении числа на 7 получили неполное частное 5 и остаток 3. Найди это число.', choices: ['38', '35'], correct: 0, wrong: { 1: 'forget-rem' }, steps: ['Число = делитель · неполное частное + остаток.', '7 · 5 + 3 = 38.'] },
          { q: '30 туристов переправляются на лодках, в лодку помещается 4 человека. Сколько нужно лодок?', choices: ['8', '7'], correct: 0, wrong: { 1: 'ignore-leftover' }, steps: ['30 : 4 = 7 (ост. 2).', '7 лодок увезут 28 человек, а двоим нужна ещё одна лодка: 7 + 1 = 8.'] },
        ],
      },
      mistakes: [
        { id: 'rem-too-big', title: 'Получает остаток больше делителя (недобирает частное)', kidName: 'Жадный остаток',
          kidRule: 'ты берёшь неполное частное поменьше, и остаток выходит больше делителя',
          say: 'Остаток получился не меньше делителя — значит, можно было разделить ещё раз. Увеличь неполное частное на 1.',
          fixIdea: 'Остаток всегда меньше делителя. Если он больше или равен — частное можно увеличить.',
          explainOptions: ['Остаток должен быть меньше делителя, иначе делим дальше', 'Остаток может быть любым', 'Остаток должен быть больше делителя'],
          conflicts: [
            { text: 'По твоему правилу 47 : 6 = 6 (ост. 11). Но из 11 оставшихся конфет можно дать каждому из шести ребят ещё по одной!', ask: 'Может остаток быть больше делителя?', choices: ['да', 'нет'], right: 'нет', verify: () => 47 === 6 * 6 + 11 && 11 >= 6 && 47 === 6 * 7 + 5 },
          ] },
        { id: 'forget-rem', title: 'Забывает остаток при проверке a = b · q + r', kidName: 'Потерял хвостик',
          kidRule: 'ты умножаешь делитель на частное, а остаток не прибавляешь',
          say: 'Делимое — это делитель, умноженный на неполное частное, плюс остаток. Остаток тоже был частью делимого.',
          fixIdea: 'a = b · q + r: остаток — часть делимого, его обязательно прибавляют.',
          explainOptions: ['Делимое = делитель · частное + остаток', 'Делимое = делитель · частное', 'Остаток вычитают'],
          conflicts: [
            { text: 'Число при делении на 7 даёт частное 5 и остаток 3. По твоему правилу это 35. Но 35 делится на 7 без остатка — откуда тогда остаток 3?', ask: 'Какой остаток у 35 при делении на 7?', choices: ['0', '3'], right: '0', verify: () => 35 % 7 === 0 && 38 % 7 === 3 },
          ] },
        { id: 'ignore-leftover', title: 'В задаче «сколько нужно» отбрасывает остаток', kidName: 'Оставил на берегу',
          kidRule: 'ты считаешь только полные лодки, а оставшихся людей забываешь',
          say: 'Остаток — это люди или вещи, которым тоже нужно место. Если остаток есть, нужна ещё одна лодка (коробка, автобус).',
          fixIdea: 'Если в задаче нужно увезти или упаковать всех — при остатке берём на одну лодку больше.',
          explainOptions: ['Остаток тоже нужно увезти — нужна ещё одна лодка', 'Остаток можно не считать', 'Нужно разделить остаток на число лодок'],
          conflicts: [
            { text: '30 туристов, в лодку помещается 4 человека. По твоему правилу хватит 7 лодок. Но 7 · 4 = 28 — двое останутся на берегу!', ask: 'Хватит 7 лодок?', choices: ['да', 'нет'], right: 'нет', verify: () => 7 * 4 < 30 && 8 * 4 >= 30 },
          ] },
      ],
      generate(lv) {
        const b = L3(lv, rnd(2, 9), rnd(3, 9), rnd(11, 25)), q = L3(lv, rnd(2, 9), rnd(5, 30), rnd(5, 40)), r = rnd(1, b - 1), a = b * q + r;
        const type = pick(L3(lv, ['q', 'r', 'dividend', 'need'], ['q', 'r', 'dividend', 'need'], ['q', 'r', 'dividend', 'need']));
        if (type === 'q' || type === 'r') {
          const askQ = type === 'q';
          const st = pick([
            () => ({ story: `Раздели с остатком: ${num(a)} : ${num(b)}.`, question: askQ ? 'Чему равно неполное частное?' : 'Чему равен остаток?' }),
            () => ({ story: `${num(a)} ${pl(a, 'конфету', 'конфеты', 'конфет')} раздали поровну ${num(b)} ребятам, каждому — как можно больше.`, question: askQ ? 'Сколько конфет получил каждый?' : 'Сколько конфет осталось?' }),
            () => ({ story: `${num(a)} ${pl(a, 'фотографию', 'фотографии', 'фотографий')} вклеивают в альбом по ${num(b)} на страницу.`, question: askQ ? 'Сколько страниц заполнится целиком?' : 'Сколько фотографий окажется на последней, неполной странице?' }),
          ])();
          const w = {};
          if (q >= 2) w['rem-too-big'] = ans(askQ ? q - 1 : r + b);
          return Object.assign(st, {
            answer: ans(askQ ? q : r),
            hints: [`Найди самое большое число, которое при умножении на ${num(b)} даёт не больше ${num(a)}.`, `${num(b)} · ${num(q)} = ${num(b * q)}, а ${num(b)} · ${num(q + 1)} = ${num(b * (q + 1))} — уже больше ${num(a)}.`],
            solution: `${num(a)} : ${num(b)} = ${num(q)} (ост. ${num(r)}), ведь ${num(b)} · ${num(q)} + ${num(r)} = ${num(a)} и ${num(r)} < ${num(b)}. Ответ: ${num(askQ ? q : r)}.`,
            wrongs: w,
            data: { kind: askQ ? 'q' : 'r', a, b },
          });
        }
        if (type === 'dividend') {
          const st = pick([
            () => ({ story: `При делении числа на ${num(b)} получили неполное частное ${num(q)} и остаток ${num(r)}.`, question: 'Найди это число.' }),
            () => ({ story: `Ваня вклеивал марки в альбом по ${num(b)} на страницу. Заполнилось ${num(q)} ${pl(q, 'страница', 'страницы', 'страниц')}, и ещё ${num(r)} ${pl(r, 'марка осталась', 'марки остались', 'марок осталось')}.`, question: 'Сколько всего было марок?' }),
            () => (b <= 9
              ? { story: `Туристы сели в лодки по ${num(b)} ${pl(b, 'человеку', 'человека', 'человек')}. Получилось ${num(q)} полных ${pl(q, 'лодка', 'лодки', 'лодок')}, и ещё ${num(r)} ${pl(r, 'человек сел', 'человека сели', 'человек сели')} в последнюю, неполную лодку.`, question: 'Сколько всего было туристов?' }
              : { story: `Школьники ехали на экскурсию в автобусах на ${num(b)} ${pl(b, 'место', 'места', 'мест')}. ${num(q)} ${pl(q, 'автобус', 'автобуса', 'автобусов')} заполнились целиком, а в последнем ехали ещё ${num(r)} ${pl(r, 'школьник', 'школьника', 'школьников')}.`, question: 'Сколько всего школьников ехало на экскурсию?' }),
          ])();
          return Object.assign(st, {
            answer: ans(a),
            hints: ['Делимое = делитель · неполное частное + остаток.', `${num(b)} · ${num(q)} = ${num(b * q)}. Не забудь остаток.`],
            solution: `${num(b)} · ${num(q)} + ${num(r)} = ${num(b * q)} + ${num(r)} = ${num(a)}.`,
            wrongs: { 'forget-rem': ans(b * q) },
            data: { kind: 'dividend', b, q, r },
          });
        }
        const st = pick([
          () => (b <= 6
            ? { story: `${num(a)} ${pl(a, 'турист', 'туриста', 'туристов')} переправляются через реку. В лодку помещается ${num(b)} ${pl(b, 'человек', 'человека', 'человек')}.`, question: 'Сколько лодок нужно, чтобы переправить всех?' }
            : { story: `На экскурсию едут ${num(a)} ${pl(a, 'школьник', 'школьника', 'школьников')}. В ${b <= 20 ? 'микроавтобусе' : 'автобусе'} ${num(b)} ${pl(b, 'место', 'места', 'мест')}.`, question: `Сколько ${b <= 20 ? 'микроавтобусов' : 'автобусов'} нужно заказать, чтобы поехали все?` }),
          () => ({ story: `Нужно упаковать ${num(a)} ${pl(a, 'книгу', 'книги', 'книг')}, в одну коробку входит ${num(b)}.`, question: 'Сколько коробок понадобится?' }),
          () => ({ story: `На праздник пригласили ${num(a)} ${pl(a, 'гостя', 'гостей', 'гостей')}. За один стол садятся ${num(b)} ${pl(b, 'человек', 'человека', 'человек')}.`, question: 'Сколько столов нужно поставить, чтобы сели все?' }),
        ])();
        return Object.assign(st, {
          answer: ans(q + 1),
          hints: [`Раздели с остатком: ${num(a)} : ${num(b)}.`, `${num(a)} : ${num(b)} = ${num(q)} (ост. ${num(r)}). Что делать с остатком — ведь им тоже нужно место?`],
          solution: `${num(a)} : ${num(b)} = ${num(q)} (ост. ${num(r)}). Для остатка нужна ещё одна: ${num(q)} + 1 = ${num(q + 1)}.`,
          wrongs: { 'ignore-leftover': ans(q) },
          data: { kind: 'need', a, b },
        });
      },
      verify(t) {
        const d = t.data, x = +t.answer;
        if (d.kind === 'dividend') return x % d.b === d.r && Math.floor(x / d.b) === d.q;
        let q = 0, rest = d.a; while (rest >= d.b) { rest -= d.b; q++; }
        if (d.kind === 'q') return x === q;
        if (d.kind === 'r') return x === rest;
        return x * d.b >= d.a && (x - 1) * d.b < d.a;
      },
    },

    /* 11. n5-power ------------------------------------------------ */
    {
      id: 'n5-power', strand: 'Натуральные числа',
      short: 'Квадрат и куб', title: 'Квадрат и куб числа',
      frp: ['Степень с натуральным показателем', 'Числовые выражения; порядок действий'],
      goal: 'Вычислять квадраты и кубы чисел и значения выражений со степенями, выполняя возведение в степень раньше умножения и сложения.',
      requires: ['n5-order'],
      explain: {
        model: 'Квадратная клумба 5 м на 5 м: её площадь 5 · 5 = 25 м². Короче пишут 5<sup>2</sup> — «пять в квадрате». Кубик из маленьких кубиков 3 на 3 на 3 — это 3 · 3 · 3 = 27 кубиков, или 3<sup>3</sup> — «три в кубе». Показатель степени говорит, сколько одинаковых множителей перемножить, а не на что умножить.',
        figure: { type: 'dots5n', rows: 5, cols: 5 },
        figureCaption: '5<sup>2</sup> = 5 · 5 = 25 точек, а не 5 · 2 = 10',
        rule: '<ul class="rule-list"><li><b>a<sup>2</sup></b> = a · a (квадрат), <b>a<sup>3</sup></b> = a · a · a (куб).</li><li>Показатель — сколько раз число берут <b>множителем</b>: 2<sup>3</sup> = 2 · 2 · 2 = 8, а не 2 · 3 = 6.</li><li>10<sup>2</sup> = 100, 10<sup>3</sup> = 1000: сколько показатель, столько нулей.</li><li>В выражении степень считают <b>раньше</b> умножения, деления, сложения и вычитания: 2 · 3<sup>2</sup> = 2 · 9 = 18.</li></ul>',
        examples: [
          { q: '2<sup>3</sup> = ?', choices: ['8', '6'], correct: 0, wrong: { 1: 'base-times-exp' }, steps: ['2<sup>3</sup> = 2 · 2 · 2.', '2 · 2 = 4, 4 · 2 = 8.'] },
          { q: '2 · 3<sup>2</sup> = ?', choices: ['18', '36', '12'], correct: 0, wrong: { 1: 'power-last', 2: 'base-times-exp' }, steps: ['Сначала степень: 3<sup>2</sup> = 3 · 3 = 9.', 'Потом умножение: 2 · 9 = 18.'] },
        ],
      },
      mistakes: [
        { id: 'base-times-exp', title: 'Умножает основание на показатель', kidName: 'Умножайка',
          kidRule: 'ты умножаешь число на показатель: 2³ = 2 · 3 = 6',
          say: 'Показатель — это не множитель, а количество одинаковых множителей. 2³ — это 2 · 2 · 2.',
          fixIdea: 'a² = a · a, a³ = a · a · a. Показатель — сколько раз число стоит множителем.',
          explainOptions: ['Показатель — сколько раз число берут множителем', 'Число умножают на показатель', 'Число складывают с показателем'],
          conflicts: [
            { text: 'По твоему правилу 10² = 20. Но 10² = 10 · 10 — это квадрат 10 на 10 клеток: 10 рядов по 10, всего 100 клеток.', ask: 'Сколько клеток в квадрате 10 на 10?', choices: ['100', '20'], right: '100', verify: () => 10 * 10 === 100 },
            { text: 'По твоему правилу 2³ = 6. Но 2 · 2 · 2 = 4 · 2 = 8.', ask: 'Чему равно 2 · 2 · 2?', choices: ['8', '6'], right: '8', verify: () => 2 * 2 * 2 === 8 },
          ] },
        { id: 'power-last', title: 'Возводит в степень после умножения или сложения', kidName: 'Опоздавшая степень',
          kidRule: 'ты сначала умножаешь или складываешь, а в степень возводишь весь результат',
          say: 'Степень относится только к числу, рядом с которым стоит, и считается первой. Сначала степень, потом умножение и сложение.',
          fixIdea: 'Порядок: скобки → степень → умножение и деление → сложение и вычитание.',
          explainOptions: ['Степень вычисляют раньше умножения и сложения', 'Степень вычисляют в самом конце', 'Степень относится ко всему выражению'],
          root: 'n5-order',
          conflicts: [
            { text: 'По твоему правилу 2 · 3² = 6² = 36. Но 2 · 3² — это две квадратные клумбы 3 на 3: 9 + 9 = 18 клеток.', ask: 'Сколько клеток в двух квадратах 3 на 3?', choices: ['18', '36'], right: '18', verify: () => 2 * 3 ** 2 === 18 && 9 + 9 === 18 },
          ] },
      ],
      generate(lv) {
        const sup = (a, n) => `${num(a)}<sup>${n}</sup>`, P = (a, n) => a ** n;
        const type = pick(L3(lv, ['pure', 'pure', 'story'], ['pure', 'story', 'expr', 'expr'], ['pure', 'story', 'expr', 'expr2']));
        if (type === 'pure') {
          const n = Math.random() < 0.55 ? 2 : 3;
          const a = n === 2 ? pick(L3(lv, [3, 4, 5, 6, 7, 8, 9, 10], [6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [11, 12, 13, 14, 15, 16, 17, 18, 19, 20])) : pick(L3(lv, [2, 3, 4, 5], [3, 4, 5, 6, 10], [4, 5, 6, 7, 8, 9, 10]));
          const v = P(a, n);
          return {
            story: pick(['Найди значение.', 'Вычисли степень.', '']), question: `${sup(a, n)} = ?`,
            answer: ans(v),
            hints: [`Показатель ${n} — значит, ${num(a)} нужно взять множителем ${n} ${raz(n)}.`, n === 2 ? `${num(a)} · ${num(a)} = ?` : `${num(a)} · ${num(a)} = ${num(a * a)}. Ещё раз умножь на ${num(a)}.`],
            solution: `${sup(a, n)} = ${Array(n).fill(num(a)).join(' · ')} = ${num(v)}.`,
            wrongs: a * n !== v ? { 'base-times-exp': ans(a * n) } : {},
            data: { kind: 'pow', a, n },
          };
        }
        if (type === 'story') {
          return pick([
            () => { const a = rnd(L3(lv, 3, 4, 11), L3(lv, 9, 12, 20)); return { story: `Квадратная клумба со стороной ${num(a)} м.`, question: `Найди её площадь — это ${sup(a, 2)}. Ответ в квадратных метрах.`, answer: ans(a * a),
              hints: ['Площадь квадрата — сторона, умноженная сама на себя.', `${num(a)} · ${num(a)} = ?`], solution: `${sup(a, 2)} = ${num(a)} · ${num(a)} = ${num(a * a)}.`, wrongs: { 'base-times-exp': ans(2 * a) }, data: { kind: 'pow', a, n: 2 } }; },
            () => { const a = rnd(L3(lv, 4, 6, 9), L3(lv, 9, 12, 16)); return { story: `Игровое поле — квадрат ${num(a)} на ${num(a)} клеток.`, question: 'Сколько клеток на поле?', answer: ans(a * a),
              hints: [`Это ${num(a)} рядов по ${num(a)} клеток, то есть ${sup(a, 2)}.`, `${num(a)} · ${num(a)} = ?`], solution: `${sup(a, 2)} = ${num(a * a)}.`, wrongs: { 'base-times-exp': ans(2 * a) }, data: { kind: 'pow', a, n: 2 } }; },
            () => { const a = rnd(2, L3(lv, 4, 6, 9)); return { story: `Большой кубик сложили из маленьких: ${num(a)} в длину, ${num(a)} в ширину и ${num(a)} в высоту.`, question: 'Сколько маленьких кубиков понадобилось?', answer: ans(a ** 3),
              hints: [`Сколько кубиков в одном слое и сколько слоёв? Это ${sup(a, 3)}.`, `В одном слое ${num(a)} · ${num(a)} = ${num(a * a)} ${pl(a * a, 'кубик', 'кубика', 'кубиков')}, а слоёв ${num(a)}.`], solution: `${sup(a, 3)} = ${num(a)} · ${num(a)} · ${num(a)} = ${num(a ** 3)}.`, wrongs: { 'base-times-exp': ans(3 * a) }, data: { kind: 'pow', a, n: 3 } }; },
            () => { const a = rnd(2, L3(lv, 5, 8, 10)); return { story: `Коробка имеет форму куба с ребром ${num(a)} дм.`, question: `Найди её объём — это ${sup(a, 3)}. Ответ в кубических дециметрах.`, answer: ans(a ** 3),
              hints: ['Объём куба — ребро, умноженное само на себя три раза.', `${num(a)} · ${num(a)} · ${num(a)} = ?`], solution: `${sup(a, 3)} = ${num(a ** 3)}.`, wrongs: { 'base-times-exp': ans(3 * a) }, data: { kind: 'pow', a, n: 3 } }; },
          ])();
        }
        if (type === 'expr') {
          const form = pick(['mul2', 'add2', 'mul3', 'add3']), n = form.endsWith('3') ? 3 : 2;
          const a = n === 2 ? rnd(3, 9) : rnd(2, 4), k = rnd(2, form.startsWith('mul') ? 5 : 9), mul = form.startsWith('mul');
          const v = mul ? k * P(a, n) : k + P(a, n), late = mul ? P(k * a, n) : P(k + a, n), bte = mul ? k * a * n : k + a * n;
          const w = {}; if (late !== v && late <= 1e5) w['power-last'] = ans(late); if (bte !== v) w['base-times-exp'] = ans(bte);
          return {
            story: pick(['Найди значение выражения.', 'Посчитай, соблюдая порядок действий.']), question: `${num(k)} ${mul ? '·' : '+'} ${sup(a, n)} = ?`,
            answer: ans(v),
            hints: ['Что делают первым: степень или умножение (сложение)?', `Сначала степень: ${sup(a, n)} = ${num(P(a, n))}.`],
            solution: `${sup(a, n)} = ${num(P(a, n))}; ${num(k)} ${mul ? '·' : '+'} ${num(P(a, n))} = ${num(v)}.`,
            wrongs: w,
            data: { kind: 'expr', k, a, n, mul },
          };
        }
        const a = rnd(3, 9), b = rnd(2, 4), k = rnd(2, 5), v = k * a * a + b ** 3;
        return {
          story: 'Найди значение выражения.', question: `${num(k)} · ${sup(a, 2)} + ${sup(b, 3)} = ?`,
          answer: ans(v),
          hints: ['Сначала вычисли обе степени, потом умножение, потом сложение.', `${sup(a, 2)} = ${num(a * a)}, ${sup(b, 3)} = ${num(b ** 3)}.`],
          solution: `${num(k)} · ${num(a * a)} + ${num(b ** 3)} = ${num(k * a * a)} + ${num(b ** 3)} = ${num(v)}.`,
          wrongs: { 'power-last': ans((k * a) ** 2 + b ** 3), 'base-times-exp': ans(k * a * 2 + b * 3) },
          data: { kind: 'expr2', k, a, b },
        };
      },
      verify(t) {
        const d = t.data, pw = (a, n) => { let r = 1; for (let i = 0; i < n; i++) r = rep(a, r); return r; }, x = +t.answer;
        if (d.kind === 'pow') return x === pw(d.a, d.n);
        if (d.kind === 'expr') return x === (d.mul ? rep(d.k, pw(d.a, d.n)) : d.k + pw(d.a, d.n));
        return x === rep(d.k, pw(d.a, 2)) + pw(d.b, 3);
      },
    },
  ];

  K.course({ id: 'm5n', grade: 5, title: 'Натуральные числа, 5 класс', topics });
})();
