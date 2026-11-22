/* =========================================================
   Курс m5d: десятичные дроби и текстовые задачи, 5 класс.
   Опора: ФРП «Математика. 5–9 классы (базовый уровень)», 5 класс,
   раздел «Дроби» (десятичная запись, сравнение, действия, округление,
   связь с обыкновенными дробями) и «Решение текстовых задач»
   (движение, покупки, единицы измерения, перебор вариантов).
   Ошибки — классические, описанные в методике: «0,25 > 0,5»,
   «0,7 + 0,5 = 0,12», «0,3 · 0,2 = 0,6», пропуск нуля в частном,
   «3/4 = 3,4», «1 ч = 100 мин», навстречу — вычитание скоростей и т. п.
   Формат — docs/content-spec.md. Тексты — черновик на вычитку методисту.
   ========================================================= */
(function () {
  'use strict';
  const K = window.VEKTOR_KIT, { rnd, pick, shuffle, L3, pl, gcd, round, num, ans, fr } = K.h;
  const V = window.VEKTOR_VISUALS;

  /* ---------- Общие помощники ---------- */
  const R = x => round(x, 6);
  const same = (a, b) => Math.abs(a - b) < 1e-9;
  const P10 = k => 10 ** k;
  const sc = (x, k) => Math.round(x * P10(k));                                 // x · 10^k целым числом
  const nd = x => { const s = ans(x), i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; }; // знаков после запятой
  const fix = (x, t) => { const [i, f] = R(x).toFixed(t).split('.'); return num(+i) + (f ? ',' + f : ''); }; // ровно t знаков: fix(5, 1) → «5,0»
  const znak = k => pl(k, 'знак', 'знака', 'знаков');
  const nuley = k => ['', 'один нуль', 'два нуля', 'три нуля'][k];
  const hours = k => pl(k, 'час', 'часа', 'часов');
  const minut = k => pl(k, 'минуту', 'минуты', 'минут');
  const desyat = k => pl(k, 'десятая', 'десятых', 'десятых');
  const sotyh = k => pl(k, 'сотая', 'сотых', 'сотых');
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const nz = (lo, hi) => { let v; do v = rnd(lo, hi); while (v % 10 === 0); return v; };                 // не кратно 10
  const noZero = (lo, hi) => { let v; do v = rnd(lo, hi); while (String(v).includes('0')); return v; };  // без нулей в записи
  const digits = n => { let s = ''; for (let i = 0; i < n; i++) s += String(i === 0 || i === n - 1 ? rnd(1, 9) : rnd(0, 9)); return s; };
  const listRu = a => (a.length < 2 ? String(a[0]) : a.slice(0, -1).join(', ') + ' и ' + a[a.length - 1]);
  const simp = (n, d) => { const g = gcd(n, d) || 1; return [n / g, d / g]; };
  const cmpSign = (a, b) => (same(a, b) ? '=' : a < b ? '<' : '>');
  const SIGNS = ['<', '=', '>'];
  const PAIRS = [['Дима', 'Катя'], ['Саша', 'Оля'], ['Петя', 'Маша'], ['Ваня', 'Лиза'], ['Миша', 'Аня'], ['Гоша', 'Вика']];
  // неверные ответы-числа: совпавшие с верным и «не числа» отбрасываем
  const wr = (right, m) => { const o = {}; for (const [k, v] of Object.entries(m)) if (v != null && Number.isFinite(v) && v >= 0 && !same(v, right)) o[k] = ans(v); return o; };
  // неверные ответы-варианты (выбор из списка)
  const wc = (right, m) => { const o = {}; for (const [k, v] of Object.entries(m)) if (v != null && v !== right) o[k] = v; return o; };
  // неверные ответы-дроби: [числитель, знаменатель]
  const wf = (right, m) => { const o = {}; for (const [k, v] of Object.entries(m)) if (v && v[1] > 0 && !same(v[0] / v[1], right)) o[k] = `${v[0]}/${v[1]}`; return o; };

  /* ---------- Рисунки курса ---------- */
  if (V && V.register) {
    const esc = V.esc || (s => String(s));
    const tx = (x, y, s, anchor = 'middle', more = '') => `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="currentColor" stroke="none" font-size="13"${more}>${esc(s)}</text>`;
    const ln = (x1, y1, x2, y2, w = 1.5, more = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" fill="none" stroke="currentColor" stroke-width="${w}"${more}/>`;
    const DEC = /^\d{1,5}(,\d{1,3})?$/;
    const isInt = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;
    // как svgWrap, но крупнее на экране (для записи столбиком)
    const wrapScaled = (vw, vh, label, inner, s) => `<svg viewBox="0 0 ${vw} ${vh}" width="${Math.round(vw * s)}" height="${Math.round(vh * s)}" role="img" aria-label="${esc(label)}" style="width:${Math.round(vw * s)}px;max-width:100%;height:auto"><title>${esc(label)}</title>${inner}</svg>`;

    // Таблица разрядов: { nums: ['0,5', '0,25'] } — каждая цифра в своей клетке
    const plDesc = f => `таблица разрядов: ${(f.nums || []).join('; ')}`;
    V.register('places5d', {
      describe: plDesc,
      render: f => {
        const nums = (f.nums || []).map(String);
        if (!nums.length || nums.length > 4 || !nums.every(s => DEC.test(s))) return '';
        const cols = Math.min(3, Math.max(2, ...nums.map(s => (s.split(',')[1] || '').length)));
        const heads = ['целые', 'десятые', 'сотые', 'тысячные'].slice(0, cols + 1);
        const c0 = 80, cw = Math.floor(214 / cols), W = 2 + c0 + cw * cols + 2, rh = 30, H = 32 + rh * nums.length;
        const cx = i => (i === 0 ? 2 + c0 / 2 : 2 + c0 + cw * (i - 1) + cw / 2);
        let g = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="6" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".6"/>` + ln(2, 30, W - 2, 30, 1.2, ' opacity=".6"');
        for (let i = 0; i < cols; i++) g += ln(2 + c0 + cw * i, 2, 2 + c0 + cw * i, H - 2, 1.2, ' opacity=".6"');
        let t = heads.map((h, i) => tx(cx(i), 21, h)).join('');
        nums.forEach((s, r) => {
          const [i, fp = ''] = s.split(','), y = 30 + rh * r + 21;
          t += tx(2 + c0 - 8, y, i + (fp ? ',' : ''), 'end', ' font-weight="700"');
          [...fp].forEach((dg, j) => { t += tx(cx(j + 1), y, dg, 'middle', ' font-weight="700"'); });
        });
        return V.svgWrap(W, H, plDesc(f), g + t);
      },
    });

    // Запись столбиком десятичных дробей: { a: '3,50', b: '1,25', op: '+', r?: '4,75', align?: 'right' — неверное выравнивание }
    const colDesc = f => `запись столбиком: ${f.a} ${f.op} ${f.b}${f.r ? ' = ' + f.r : ''}${f.align === 'right' ? ' — числа выровнены по правому краю, запятые не друг под другом' : ', запятая под запятой'}`;
    V.register('column5d', {
      describe: colDesc,
      render: f => {
        const rows = [f.a, f.b, f.r].filter(x => x != null).map(String);
        if (rows.length < 2 || !rows.every(s => DEC.test(s)) || !['+', '−'].includes(f.op)) return '';
        const P = rows.map(s => { const [i, fp = ''] = s.split(','); return { i, f: fp }; });
        const mi = Math.max(...P.map(p => p.i.length)), mf = Math.max(...P.map(p => p.f.length)), right = f.align === 'right';
        const ncol = right ? Math.max(...rows.map(s => s.length)) : mi + (mf ? 1 + mf : 0);
        const cw = 12, x0 = 24, W = x0 + ncol * cw + 10, rh = 20;
        const cells = (s, p) => {
          if (right) return [...s].map((ch, k) => ({ col: ncol - s.length + k, ch }));
          const out = [...p.i].map((ch, k) => ({ col: mi - p.i.length + k, ch }));
          if (p.f) { out.push({ col: mi, ch: ',' }); [...p.f].forEach((ch, k) => out.push({ col: mi + 1 + k, ch })); }
          return out;
        };
        let t = '';
        rows.forEach((s, r) => { const y = 18 + r * rh + (r === 2 ? 8 : 0); for (const c of cells(s, P[r])) t += tx(x0 + c.col * cw + cw / 2, y, c.ch, 'middle', ' font-family="monospace" font-weight="700"'); });
        t += tx(10, 18 + rh, f.op);
        const H = rows.length === 3 ? 18 + 2 * rh + 14 : 18 + rh + 12;
        return wrapScaled(W, H, colDesc(f), ln(x0 - 4, 18 + rh + 7, x0 + ncol * cw + 4, 18 + rh + 7) + t, 1.6);
      },
    });

    // Схема движения: { kind: 'one' | 'meet' | 'apart' | 'same', v: ['12 км/ч', …], s?: '? км', t?: 'время: 3 ч' }
    const roadDesc = f => {
      const v = (f.v || []).join(' и ');
      const what = { one: `движение со скоростью ${v}`, meet: `движение навстречу друг другу, скорости ${v}`, apart: `движение в противоположные стороны из одной точки, скорости ${v}`, same: `движение в одну сторону из одной точки, скорости ${v}` }[f.kind] || '';
      return `схема: ${what}${f.s ? `, расстояние ${f.s}` : ''}${f.t ? `, ${f.t}` : ''}`;
    };
    V.register('road5d', {
      describe: roadDesc,
      render: f => {
        const k = f.kind, v = (f.v || []).map(String);
        if (!['one', 'meet', 'apart', 'same'].includes(k) || v.length < (k === 'one' ? 1 : 2) || v.some(s => !s || s.length > 14)) return '';
        const y = 84, x0 = 22, x1 = 278;
        const arrow = (a, b, yy, label) => { const d = b > a ? 1 : -1; return ln(a, yy, b - 8 * d, yy, 2.5) + `<path d="M${b} ${yy}l${-10 * d} -6v12z" fill="currentColor" stroke="none"/>` + tx((a + b) / 2, yy - 8, label); };
        const dot = x => `<circle cx="${x}" cy="${y}" r="5" fill="currentColor" stroke="none"/>`;
        const brace = (a, b, label) => ln(a, y + 18, b, y + 18) + ln(a, y + 12, a, y + 24) + ln(b, y + 12, b, y + 24) + tx((a + b) / 2, y + 38, label);
        let s = ln(x0 - 12, y, x1 + 12, y, 1.5, ' stroke-dasharray="6 4" opacity=".6"');
        if (k === 'one') s += dot(x0) + arrow(x0, 150, y - 16, v[0]) + `<path d="M${x1} ${y}v-24l14 6-14 6" fill="none" stroke="currentColor" stroke-width="1.5"/>` + (f.s ? brace(x0, x1, f.s) : '');
        if (k === 'meet') s += dot(x0) + dot(x1) + arrow(x0, 125, y - 16, v[0]) + arrow(x1, 175, y - 16, v[1]) + (f.s ? brace(x0, x1, f.s) : '');
        if (k === 'apart') s += dot(150) + arrow(150, 45, y - 16, v[0]) + arrow(150, 255, y - 16, v[1]) + (f.s ? brace(45, 255, f.s) : '');
        if (k === 'same') s += dot(x0) + arrow(x0, 250, y - 38, v[0]) + arrow(x0, 150, y - 14, v[1]) + (f.s ? brace(150, 250, f.s) : '');
        if (f.t) s += tx(150, 16, String(f.t));
        return V.svgWrap(300, 132, roadDesc(f), s);
      },
    });

    // Квадрат 10 × 10: выделены a столбцов (0,a) и b строк (0,b), пересечение — произведение
    const hgDesc = f => `квадрат из 100 клеток: выделены ${f.a} ${pl(f.a, 'столбец', 'столбца', 'столбцов')} и ${f.b} ${pl(f.b, 'строка', 'строки', 'строк')}, на пересечении ${f.a * f.b} ${pl(f.a * f.b, 'клетка', 'клетки', 'клеток')} из 100`;
    V.register('hgrid5d', {
      describe: hgDesc,
      render: f => {
        if (!isInt(f.a, 1, 9) || !isInt(f.b, 1, 9)) return '';
        const c = 18, x0 = 44, y0 = 24;
        let s = '';
        for (let r = 0; r < 10; r++) for (let q = 0; q < 10; q++) {
          const A = q < f.a, B = r < f.b;
          s += `<rect x="${x0 + q * c}" y="${y0 + r * c}" width="${c}" height="${c}" fill="${A && B ? 'var(--green,currentColor)' : 'currentColor'}" fill-opacity="${A && B ? 0.8 : A || B ? 0.16 : 0}" stroke="currentColor" stroke-opacity=".35" stroke-width="1"/>`;
        }
        s += `<rect x="${x0}" y="${y0}" width="${10 * c}" height="${10 * c}" fill="none" stroke="currentColor" stroke-width="2"/>`;
        s += tx(x0 + (f.a * c) / 2, y0 - 8, '0,' + f.a) + tx(x0 - 20, y0 + (f.b * c) / 2 + 4, '0,' + f.b) + tx(x0 + 5 * c, y0 + 10 * c + 18, '1 м');
        return V.svgWrap(x0 + 10 * c + 12, y0 + 10 * c + 26, hgDesc(f), s);
      },
    });

    // Числовой луч для десятичных: { from, to, step, labels: [числа], points: [{ v, label }] }
    const nlDesc = f => `числовой луч от ${num(f.from)} до ${num(f.to)}, отмечены точки ${(f.points || []).map(p => p.label || num(p.v)).join(' и ')}`;
    V.register('nline5d', {
      describe: nlDesc,
      render: f => {
        const n = Math.round((f.to - f.from) / f.step);
        if (![f.from, f.to, f.step].every(Number.isFinite) || !(f.to > f.from) || !(n >= 2 && n <= 20) || !Array.isArray(f.points)) return '';
        const x0 = 20, x1 = 276, y = 44, X = v => x0 + ((x1 - x0) * (v - f.from)) / (f.to - f.from);
        let s = ln(x0 - 8, y, x1 + 14, y, 1.5) + `<path d="M${x1 + 18} ${y}l-8-5v10z" fill="currentColor" stroke="none"/>`;
        for (let i = 0; i <= n; i++) { const big = i === 0 || i === n || 2 * i === n; s += ln(X(f.from + i * f.step), y - (big ? 8 : 5), X(f.from + i * f.step), y + (big ? 8 : 5), big ? 2 : 1.2); }
        for (const v of f.labels || [f.from, f.to]) s += tx(X(v), y + 24, num(R(v)));
        for (const p of f.points) if (p.v >= f.from && p.v <= f.to) s += `<circle cx="${X(p.v)}" cy="${y}" r="5" fill="var(--green,currentColor)" stroke="none"/>` + tx(X(p.v), y - 13, p.label || num(p.v), 'middle', ' font-weight="700"');
        return V.svgWrap(300, 76, nlDesc(f), s);
      },
    });
  }

  /* ---------- Данные для сюжетов ---------- */
  const MOVERS = [
    { who: 'Пешеход', past: 'шёл', perf: 'прошёл', v: [3, 6] },
    { who: 'Велосипедист', past: 'ехал', perf: 'проехал', v: [10, 20] },
    { who: 'Лыжник', past: 'бежал', perf: 'пробежал', v: [8, 15] },
    { who: 'Автомобиль', past: 'ехал', perf: 'проехал', v: [50, 90] },
    { who: 'Поезд', past: 'шёл', perf: 'прошёл', v: [60, 120] },
  ];
  const speedOf = M => (M.v[1] >= 50 ? 5 * rnd(M.v[0] / 5, M.v[1] / 5) : rnd(M.v[0], M.v[1]));
  const DUO = [
    { two: 'два пешехода', go: 'вышли', from: 'двух сёл', fromOne: 'одного села', btw: 'сёлами', one: ['один', 'другой'], gen: ['одного', 'другого'], v: () => rnd(3, 6) },
    { two: 'два велосипедиста', go: 'выехали', from: 'двух посёлков', fromOne: 'одного посёлка', btw: 'посёлками', one: ['один', 'другой'], gen: ['одного', 'другого'], v: () => rnd(10, 20) },
    { two: 'две машины', go: 'выехали', from: 'двух городов', fromOne: 'одного города', btw: 'городами', one: ['одна', 'другая'], gen: ['одной', 'другой'], v: () => 5 * rnd(10, 18) },
    { two: 'два лыжника', go: 'вышли', from: 'двух турбаз', fromOne: 'одной турбазы', btw: 'турбазами', one: ['один', 'другой'], gen: ['одного', 'другого'], v: () => rnd(8, 15) },
  ];
  const GOODS = [
    { one: 'одна тетрадь', nom: 'тетрадь', f: ['тетрадь', 'тетради', 'тетрадей'], p: [25, 60] },
    { one: 'одна ручка', nom: 'ручка', f: ['ручку', 'ручки', 'ручек'], p: [20, 80] },
    { one: 'один блокнот', nom: 'блокнот', f: ['блокнот', 'блокнота', 'блокнотов'], p: [60, 150] },
    { one: 'одна булочка', nom: 'булочка', f: ['булочку', 'булочки', 'булочек'], p: [25, 50] },
    { one: 'один билет в кино', nom: 'билет в кино', f: ['билет в кино', 'билета в кино', 'билетов в кино'], p: [200, 450] },
    { one: 'один набор фломастеров', nom: 'набор фломастеров', f: ['набор фломастеров', 'набора фломастеров', 'наборов фломастеров'], p: [150, 350] },
  ];
  const priceOf = g => 5 * rnd(g.p[0] / 5, g.p[1] / 5);
  const acc = (g, n) => pl(n, ...g.f);

  /* =========================================================
     Темы
     ========================================================= */
  const topics = [

    /* 1. d5-notation --------------------------------------------- */
    {
      id: 'd5-notation', strand: 'Дроби', short: 'Десятичные дроби',
      title: 'Десятичная запись и сравнение десятичных дробей',
      frp: ['Десятичная запись дробей', 'Сравнение десятичных дробей', 'Изображение десятичных дробей точками на числовой прямой'],
      goal: 'Понимать, что значит каждая цифра после запятой, записывать десятичные дроби и сравнивать их.',
      requires: ['concept', 'n5-place'],
      explain: {
        model: 'В рубле 100 копеек. 0,5 руб. — это 50 копеек, а 0,25 руб. — 25 копеек. На вид «25» больше «5», но денег-то у тебя меньше! После запятой цифры стоят в разрядах: первая — десятые, вторая — сотые, третья — тысячные. Поэтому десятичные дроби сравнивают разряд за разрядом, а не «хвосты» целиком.',
        figure: { type: 'places5d', nums: ['0,5', '0,25'] },
        figureCaption: 'У 0,5 в разряде десятых стоит 5, а у 0,25 — только 2. Значит, 0,5 > 0,25.',
        rule: '<ul class="rule-list"><li><b>Разряды после запятой:</b> десятые, сотые, тысячные. 0,7 — семь десятых, 0,07 — семь сотых: если десятых нет, на их месте пишут 0.</li><li><b>Нули в конце ничего не меняют:</b> 0,5 = 0,50 = 0,500.</li><li><b>Как сравнить:</b> сначала целые части. Если они равны — допиши нули, чтобы после запятой цифр стало поровну, и сравни как обычные числа: 0,5 = 0,50, а 50 > 25, значит, 0,5 > 0,25.</li></ul>',
        examples: [
          { q: 'Что больше: 0,5 или 0,25?', fig: { type: 'nline5d', from: 0, to: 1, step: 0.1, labels: [0, 0.5, 1], points: [{ v: 0.25, label: '0,25' }, { v: 0.5, label: '0,5' }] },
            choices: ['0,5', '0,25'], correct: 0, wrong: { 1: 'tail-whole' },
            steps: ['Целые части равны: 0 и 0.', 'Допишем нуль: 0,5 = 0,50.', '50 сотых больше 25 сотых, значит, 0,5 > 0,25. На луче 0,5 тоже правее.'] },
          { q: 'Что больше: 0,4 или 0,45?', choices: ['0,45', '0,4'], correct: 0, wrong: { 1: 'shorter-bigger' },
            steps: ['Допишем нуль: 0,4 = 0,40.', '45 сотых больше 40 сотых: 0,45 > 0,4.'] },
          { q: 'Запиши десятичной дробью: 3 целых 7 сотых.', fig: { type: 'places5d', nums: ['3,07'] }, choices: ['3,07', '3,7'], correct: 0, wrong: { 1: 'zero-lost' },
            steps: ['Сотые — второй знак после запятой.', 'Десятых нет — на их место ставим 0: 3,07.', '3,7 — это 3 целых 7 десятых, совсем другое число.'] },
        ],
      },
      mistakes: [
        { id: 'tail-whole', title: 'Сравнивает цифры после запятой как целые числа («больше цифр — больше число»)', kidName: 'Хвостомер',
          kidRule: 'ты сравниваешь цифры после запятой как обычные числа: раз 25 больше 5, то и 0,25 больше 0,5',
          say: 'После запятой стоят разряды, а не одно целое число. Допиши нули, чтобы цифр стало поровну, и тогда сравнивай.',
          fixIdea: 'Сначала уравняй число знаков после запятой: 0,5 = 0,50. Теперь видно: 50 сотых больше 25 сотых.',
          explainOptions: ['Сравнивают разряд за разрядом: 5 десятых больше 2 десятых, поэтому 0,5 > 0,25', 'Чем больше цифр после запятой, тем больше число', 'Целые части равны, значит, и числа равны'],
          conflicts: [
            { text: 'В рубле 100 копеек: 0,5 руб. — это 50 копеек, а 0,25 руб. — 25 копеек. По твоему правилу 0,25 руб. больше, чем 0,5 руб.', ask: 'Выходит, 25 копеек больше 50 копеек. Так бывает?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => Math.round(0.25 * 100) === 25 && Math.round(0.5 * 100) === 50 && 25 < 50 },
            { text: 'По твоему правилу 0,50 больше 0,5, ведь 50 больше 5. Но 0,50 руб. и 0,5 руб. — это одни и те же 50 копеек.', ask: '0,50 и 0,5 — это разные числа?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => same(0.50, 0.5) },
          ],
          root: 'n5-place' },
        { id: 'shorter-bigger', title: 'Считает, что число с меньшим количеством знаков после запятой больше', kidName: 'Короткохвост',
          kidRule: 'ты думаешь: десятые крупнее сотых, значит, 0,4 больше 0,45 — там же «крупные» доли',
          say: 'Десятых у этих чисел может быть поровну, а у второго есть ещё и сотые. Допиши нули, чтобы знаков стало поровну, и сравни.',
          fixIdea: 'Допиши нули до одинаковой длины: 0,4 = 0,40. 40 сотых меньше 45 сотых, значит, 0,4 < 0,45.',
          explainOptions: ['0,4 = 0,40, а 40 сотых меньше 45 сотых', 'Десятые крупнее сотых, поэтому 0,4 больше', 'В числе 0,4 меньше цифр, значит, оно всегда меньше'],
          conflicts: [
            { text: '0,4 м — это 40 см, а 0,45 м — это 45 см. По твоему правилу 0,4 м длиннее, чем 0,45 м.', ask: 'Выходит, 40 см длиннее 45 см. Это так?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => Math.round(0.4 * 100) === 40 && Math.round(0.45 * 100) === 45 },
          ],
          root: 'compare' },
        { id: 'zero-lost', title: 'Путает разряды после запятой, пропускает нуль (0,07 = 0,7)', kidName: 'Путаразряд',
          kidRule: 'ты пропускаешь нули сразу после запятой и путаешь десятые с сотыми: 7 сотых пишешь как 0,7',
          say: 'Посмотри, в каком разряде стоит цифра: десятые — первый знак после запятой, сотые — второй. Пустой разряд занимает 0.',
          fixIdea: 'Каждая цифра стоит в своём разряде. Если десятых нет, на их месте пишут 0: 7 сотых = 0,07.',
          explainOptions: ['0,7 — это 7 десятых, то есть 70 сотых, а 0,07 — всего 7 сотых', 'Нуль ничего не значит, его можно не писать', 'В 0,07 и 0,7 одна и та же цифра 7, значит, числа равны'],
          conflicts: [
            { text: '7 копеек — это 0,07 рубля. По твоему правилу это 0,7 рубля. Но 0,7 рубля — это 70 копеек.', ask: '7 копеек и 70 копеек — одна и та же сумма?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => Math.round(0.07 * 100) === 7 && Math.round(0.7 * 100) === 70 },
          ],
          root: 'n5-place' },
      ],
      generate(lv) {
        const type = pick(L3(lv, ['cmp', 'cmp', 'write'], ['cmp', 'cmp', 'ext', 'write', 'zero', 'hund'], ['cmp', 'ext', 'ext', 'write', 'zero', 'hund']));

        if (type === 'cmp') {
          const [s, l] = pick(L3(lv, [[1, 2]], [[1, 2], [1, 2], [2, 3]], [[1, 3], [2, 3], [1, 2]]));
          const eqCase = lv > 1 && Math.random() < 0.15, shortBig = Math.random() < 0.6;
          let S, T;
          if (eqCase) { S = digits(s); T = S + '0'.repeat(l - s); }
          else do { S = digits(s); T = digits(l); } while (+S * P10(l - s) === +T || (+S * P10(l - s) > +T) !== shortBig);
          const kind = pick(l > 2 ? ['sign', 'sign', 'mass'] : lv === 1 ? ['sign', 'jump', 'mass'] : ['sign', 'jump', 'mass', 'time']);
          const w = kind === 'jump' ? rnd(2, 5) : kind === 'time' ? rnd(8, 12) : kind === 'mass' ? (lv === 1 ? 0 : rnd(0, 3)) : L3(lv, 0, rnd(0, 20), rnd(0, 99));
          const flip = Math.random() < 0.5, sh = `${w},${S}`, lo = `${w},${T}`;
          const A = flip ? lo : sh, B = flip ? sh : lo;
          const pad = x => { const [i, f] = x.split(','); return `${i},${f.padEnd(l, '0')}`; };
          const val = x => +x.replace(',', '.');
          const sign = cmpSign(val(A), val(B));
          const tw = cmpSign(+(flip ? T : S), +(flip ? S : T)); // «хвосты» как целые числа
          const sb = flip ? '<' : '>';                           // «меньше цифр — больше число»
          const [n1, n2] = pick(PAIRS);
          const ST = {
            sign: { story: 'Сравни десятичные дроби.', question: `${A} ? ${B}`, labels: null },
            jump: { story: `Прыжки в длину: ${n1} — ${A} м, ${n2} — ${B} м.`, question: 'Чей прыжок длиннее?', labels: [n1, n2, 'Одинаковые'] },
            mass: { story: `Пакет яблок весит ${A} кг, а пакет груш — ${B} кг.`, question: 'Какой пакет тяжелее?', labels: ['С яблоками', 'С грушами', 'Весят одинаково'] },
            time: { story: `Бег на 60 м. Время: ${n1} — ${A} с, ${n2} — ${B} с.`, question: 'Кто пробежал быстрее?', labels: [n1, n2, 'Одинаково'] },
          }[kind];
          const mode = kind === 'time' ? 'min' : 'max';
          const toCh = sg => (!ST.labels ? sg : sg === '=' ? ST.labels[2] : (sg === '>') === (mode === 'max') ? ST.labels[0] : ST.labels[1]);
          const answer = toCh(sign);
          return {
            story: ST.story, question: ST.question, accept: 'choice', choices: ST.labels || SIGNS, answer,
            hints: [(kind === 'time' ? 'Быстрее тот, у кого время меньше. ' : '') + 'Целые части равны. Допиши справа нули, чтобы после запятой цифр стало поровну.',
              `${pad(A)} и ${pad(B)} — теперь сравни их как обычные числа.`],
            solution: `${pad(A)} ${sign} ${pad(B)}, значит, ${A} ${sign} ${B}.${ST.labels ? ` Ответ: ${answer}.` : ''}`,
            wrongs: wc(answer, { 'tail-whole': toCh(tw), 'shorter-bigger': toCh(sb) }),
            data: { type: 'cmp', A, B, mode: ST.labels ? mode : 'sign', labels: ST.labels },
          };
        }

        if (type === 'ext') {
          const isMax = Math.random() < 0.5;
          let d, e, g;
          if (isMax) { e = rnd(2, 9); d = rnd(1, e - 1); g = rnd(1, e - 1); } else { e = rnd(1, 8); d = rnd(e + 1, 9); g = rnd(e + 1, 9); }
          const f = rnd(1, 9), h = rnd(0, 9), i = rnd(1, 9);
          const kind = pick(['plain', 'bags', 'ropes']);
          const w = kind === 'bags' ? rnd(0, 2) : kind === 'ropes' ? rnd(1, 5) : L3(lv, 0, rnd(0, 3), rnd(0, 20));
          const x = R(w + d / 10), y = R(w + (10 * e + f) / 100), z = R(w + (100 * g + 10 * h + i) / 1000);
          const list = shuffle([x, y, z]), L = list.map(num);
          const ST = {
            plain: { story: `Даны числа: ${L.join('; ')}.`, question: isMax ? 'Какое из них наибольшее? Впиши его.' : 'Какое из них наименьшее? Впиши его.' },
            bags: { story: `В трёх пакетах крупа: ${L[0]} кг, ${L[1]} кг и ${L[2]} кг.`, question: isMax ? 'Сколько килограммов крупы в самом тяжёлом пакете?' : 'Сколько килограммов крупы в самом лёгком пакете?' },
            ropes: { story: `Есть три верёвки: ${L[0]} м, ${L[1]} м и ${L[2]} м.`, question: isMax ? 'Какой длины самая длинная верёвка? Ответ в метрах.' : 'Какой длины самая короткая верёвка? Ответ в метрах.' },
          }[kind];
          const padded = list.map(v => fix(v, 3)).join('; ');
          return Object.assign(ST, {
            answer: ans(y),
            hints: ['Целые части у всех чисел равны. Допиши нули, чтобы у каждого числа было по три знака после запятой.', `${padded} — сравни их как обычные числа.`],
            solution: `${padded}. ${isMax ? 'Наибольшее' : 'Наименьшее'} — ${fix(y, 3)}, то есть ${num(y)}.`,
            wrongs: wr(y, { 'tail-whole': isMax ? z : x, 'shorter-bigger': isMax ? x : z }),
            data: { type: 'ext', list, isMax },
          });
        }

        if (type === 'write') {
          const d = rnd(1, 9);
          if (lv === 1) {
            const words = Math.random() < 0.5;
            return {
              story: '', question: `Запиши десятичной дробью: ${words ? `${d} ${sotyh(d)}` : fr(d, 100)}.`,
              answer: ans(d / 100),
              hints: ['Сотые — второй знак после запятой. А что стоит на месте десятых?', `Десятых нет — на их место пишем 0, а ${d} — на место сотых.`],
              solution: `${fr(d, 100)} = ${num(d / 100)}: 0 целых, 0 десятых, ${d} ${sotyh(d)}.`,
              wrongs: wr(d / 100, { 'zero-lost': d / 10 }),
              data: { type: 'write', w: 0, d },
            };
          }
          const kind = pick(['words', 'money', 'length']);
          const w = kind === 'money' ? rnd(10, L3(lv, 0, 99, 999)) : kind === 'length' ? rnd(1, 6) : L3(lv, 0, rnd(1, 20), rnd(1, 99));
          const x = R(w + d / 100);
          const ST = {
            words: { story: '', question: `Запиши десятичной дробью: ${w} ${pl(w, 'целая', 'целых', 'целых')} ${d} ${sotyh(d)}.` },
            money: { story: `${w < 100 ? 'Пакет молока' : 'Рюкзак'} стоит ${w} руб. ${d} коп.`, question: 'Запиши цену в рублях десятичной дробью.' },
            length: { story: `Длина доски — ${w} м ${d} см.`, question: 'Сколько это метров? Запиши десятичной дробью.' },
          }[kind];
          return Object.assign(ST, {
            answer: ans(x),
            hints: [kind === 'money' ? '1 копейка — это одна сотая рубля. Копейки пишут во втором знаке после запятой.' : kind === 'length' ? '1 см — это одна сотая метра. Сантиметры пишут во втором знаке после запятой.' : 'Сотые — второй знак после запятой. А что стоит на месте десятых?',
              `На месте десятых пусто — пишем там 0, а ${d} ставим на место сотых.`],
            solution: kind === 'money' ? `${w} руб. ${d} коп. = ${num(x)} руб.` : kind === 'length' ? `${w} м ${d} см = ${num(x)} м.` : `${num(x)}: ${w} ${pl(w, 'целая', 'целых', 'целых')}, 0 десятых, ${d} ${sotyh(d)}.`,
            wrongs: wr(x, { 'zero-lost': w + d / 10 }),
            data: { type: 'write', w, d },
          });
        }

        if (type === 'zero') {
          const w = L3(lv, 0, rnd(0, 9), rnd(0, 50)), d = rnd(1, 9), flip = Math.random() < 0.5;
          const p = `${w},0${d}`, q = `${w},${d}`, A = flip ? q : p, B = flip ? p : q, sign = flip ? '>' : '<';
          const val = x => +x.replace(',', '.');
          return {
            story: 'Сравни десятичные дроби.', question: `${A} ? ${B}`, accept: 'choice', choices: SIGNS, answer: sign,
            hints: [`Посмотри, в каком разряде стоит цифра ${d} в каждом числе.`, `В числе ${p} цифра ${d} — в разряде сотых, а в числе ${q} — в разряде десятых: ${q} = ${w},${d}0.`],
            solution: `${fix(val(A), 2)} ${sign} ${fix(val(B), 2)}, значит, ${A} ${sign} ${B}.`,
            wrongs: wc(sign, { 'zero-lost': '=' }),
            data: { type: 'cmp', A, B, mode: 'sign', labels: null },
          };
        }

        // hund: сколько сотых (копеек, сантиметров) в 0,d
        const d = rnd(1, 9), kind = pick(['plain', 'money', 'length']);
        const ST = {
          plain: { story: '', question: `Сколько сотых в числе 0,${d}?`,
            hints: [`0,${d} — это ${d} ${desyat(d)}. А сколько сотых в одной десятой?`, `В одной десятой 10 сотых, значит, в ${d} ${desyat(d)} — ${d} · 10 сотых.`], solution: `0,${d} = 0,${d}0 — это ${10 * d} сотых.` },
          money: { story: `На счёте телефона осталось 0,${d} руб.`, question: 'Сколько это копеек?',
            hints: ['1 рубль = 100 копеек, значит, 0,1 руб. = 10 копеек.', `0,${d} руб. — это ${d} раз по 10 копеек.`], solution: `0,${d} руб. = 0,${d}0 руб. = ${10 * d} коп.` },
          length: { story: `Высота цветка в горшке — 0,${d} м.`, question: 'Сколько это сантиметров?',
            hints: ['1 м = 100 см, значит, 0,1 м = 10 см.', `0,${d} м — это ${d} раз по 10 см.`], solution: `0,${d} м = 0,${d}0 м = ${10 * d} см.` },
        }[kind];
        return Object.assign(ST, {
          answer: ans(10 * d),
          wrongs: wr(10 * d, { 'zero-lost': d }),
          data: { type: 'hund', d },
        });
      },
      verify(t) {
        const d = t.data;
        if (d.type === 'cmp') {
          const a = Math.round(parseFloat(d.A.replace(',', '.')) * 1000), b = Math.round(parseFloat(d.B.replace(',', '.')) * 1000);
          if (d.mode === 'sign') return t.answer === (a < b ? '<' : a > b ? '>' : '=');
          return t.answer === d.labels[a === b ? 2 : (a > b) === (d.mode === 'max') ? 0 : 1];
        }
        if (d.type === 'ext') { const ints = d.list.map(v => sc(v, 3)), best = d.isMax ? Math.max(...ints) : Math.min(...ints); return sc(+t.answer, 3) === best; }
        if (d.type === 'write') return sc(+t.answer, 2) === d.w * 100 + d.d;
        return +t.answer === d.d * 10;
      },
    },

    /* 2. d5-addsub ----------------------------------------------- */
    {
      id: 'd5-addsub', strand: 'Дроби', short: 'Сумма и разность',
      title: 'Сложение и вычитание десятичных дробей',
      frp: ['Арифметические действия с десятичными дробями: сложение и вычитание'],
      goal: 'Складывать и вычитать десятичные дроби столбиком, записывая запятую под запятой.',
      requires: ['d5-notation', 'f4-column'],
      explain: {
        model: 'Сок стоит 45,5 руб., печенье — 12,75 руб. Сколько отдать на кассе? Если записать числа столбиком по правому краю, как целые, 5 десятых встанут под 5 сотых — и сложатся десятки копеек с копейками вперемешку. Поэтому десятичные дроби пишут запятая под запятой: десятые под десятыми, сотые под сотыми.',
        figure: { type: 'column5d', a: '45,50', b: '12,75', op: '+', r: '58,25' },
        figureCaption: 'Запятая под запятой, пустое место заполнили нулём: 45,50 + 12,75 = 58,25',
        rule: '<ul class="rule-list"><li><b>Запятая под запятой.</b> Тогда десятые стоят под десятыми, сотые — под сотыми.</li><li><b>Уравняй «хвосты» нулями:</b> 3,5 = 3,50, 6 = 6,0.</li><li>Складывай или вычитай как обычные числа, а в ответе поставь запятую <b>под запятыми</b>.</li><li><b>10 десятых — это 1 целая:</b> 0,7 + 0,5 = 1,2, а не 0,12.</li><li>Проверка прикидкой: 3,5 + 1,25 — это примерно 3 + 1, ответ около 4–5.</li></ul>',
        examples: [
          { q: '3,5 + 1,25 = ?', fig: { type: 'column5d', a: '3,50', b: '1,25', op: '+', r: '4,75' },
            choices: ['4,75', '1,6', '475'], correct: 0, wrong: { 1: 'align-right', 2: 'lost-comma' },
            steps: ['Пишем запятую под запятой и дописываем нуль: 3,50 + 1,25.', 'Складываем как 350 + 125 = 475.', 'Ставим запятую под запятыми: 4,75. Прикидка: 3 + 1 = 4 — похоже.'] },
          { q: 'В кувшине 0,7 л сока, долили 0,5 л. Сколько стало?',
            choices: ['1,2 л', '0,12 л'], correct: 0, wrong: { 1: 'separate-parts' },
            steps: ['7 десятых + 5 десятых = 12 десятых.', '10 десятых — это 1 целая, остаётся 2 десятых: 1,2 л.'] },
          { q: '7,25 − 3,5 = ?', choices: ['3,75', '6,9'], correct: 0, wrong: { 1: 'align-right' },
            steps: ['3,5 = 3,50.', '7,25 − 3,50: считаем 725 − 350 = 375.', 'Запятая под запятыми: 3,75.'] },
        ],
      },
      mistakes: [
        { id: 'align-right', title: 'Выравнивает числа по правому краю, а не по запятой', kidName: 'Сдвигайка',
          kidRule: 'ты пишешь числа столбиком по правому краю, как целые, и запятые разъезжаются: 3,5 + 1,25 = 1,60',
          say: 'Посмотри на запятые: они должны стоять друг под другом. Иначе десятые складываются с сотыми.',
          fixIdea: 'Запятая под запятой, пустые места заполни нулями: 3,5 = 3,50. Складывать можно только одинаковые разряды.',
          explainOptions: ['Складывать можно только одинаковые разряды: десятые с десятыми, сотые с сотыми', 'Числа всегда пишут по правому краю, как при сложении целых', 'Запятую в ответе можно поставить где угодно'],
          conflicts: [
            { text: '3,5 + 1,25. Одно только первое слагаемое больше 3. По твоему правилу сумма 1,60 — меньше, чем 3,5.', ask: 'Может сумма двух положительных чисел быть меньше одного из них?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 1.6 < 3.5 && same(3.5 + 1.25, 4.75), figure: { type: 'column5d', a: '3,5', b: '1,25', op: '+', r: '1,60', align: 'right' } },
            { text: '6 + 0,3. По твоему правилу цифра 6 встаёт под цифру 3, и получается 0,9 — даже меньше единицы.', ask: 'Может сумма 6 и 0,3 быть меньше 6?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 0.9 < 6 && same(6 + 0.3, 6.3) },
          ],
          root: 'f4-column' },
        { id: 'separate-parts', title: 'Складывает отдельно целые и отдельно цифры после запятой (0,7 + 0,5 = 0,12)', kidName: 'Разлучник',
          kidRule: 'ты складываешь целые с целыми, а цифры после запятой — как отдельное число: 0,7 + 0,5 = 0,12',
          say: '10 десятых — это уже 1 целая, как 10 единиц — это десяток. Перенеси её в целую часть.',
          fixIdea: '10 десятых = 1 целая: переноси в целые, как в столбике переносишь десяток.',
          explainOptions: ['7 десятых + 5 десятых = 12 десятых, а это 1 целая и 2 десятых', 'После запятой стоит отдельное число, его складывают отдельно', '0,12 больше 0,7, потому что 12 больше 7'],
          conflicts: [
            { text: 'В кувшине было 0,7 л сока, долили ещё 0,5 л. По твоему правилу стало 0,12 л — меньше, чем было до того, как долили.', ask: 'Могло сока стать меньше, если его долили?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 0.12 < 0.7 && same(0.7 + 0.5, 1.2) },
          ],
          root: 'n5-place' },
        { id: 'lost-comma', title: 'Теряет запятую в ответе', kidName: 'Беззапятик',
          kidRule: 'ты считаешь столбиком верно, но в ответе забываешь поставить запятую: 3,5 + 1,25 = 475',
          say: 'Прикинь ответ по целым частям: 3,5 + 1,25 — это примерно 3 + 1. Может ли получиться сотни?',
          fixIdea: 'Запятая в ответе стоит под запятыми чисел. Проверяй прикидкой: сложи целые части — ответ должен быть рядом.',
          explainOptions: ['Ответ должен быть близок к сумме целых частей: 3 + 1 = 4, значит, 4,75', 'Запятую можно не ставить — цифры ведь верные', 'Запятую ставят после первой цифры ответа'],
          conflicts: [
            { text: 'Ленты 3,5 м и 1,25 м. Каждая короче 4 м, значит, вместе меньше 8 м. По твоему правилу вместе 475 м.', ask: 'Может быть 475 м?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 3.5 + 1.25 < 8 && 475 > 8 },
          ],
          root: 'f4-column' },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['carry', 'carry', 'mixed', 'whole'], ['mixed', 'mixed', 'carry', 'sub', 'whole'], ['mixed', 'sub', 'sub2', 'carry', 'whole', 'wsub']));
        const W = () => L3(lv, rnd(0, 5), rnd(1, 20), rnd(10, 60));
        const tail2 = () => nz(1, 99);
        let a, b, ka, kb, op = '+';
        const wrong = {};
        if (kind === 'carry') {
          const fa = rnd(1, 9), fb = Math.random() < 0.8 ? rnd(Math.max(1, 10 - fa), 9) : rnd(1, Math.max(1, 9 - fa));
          a = R(W() + fa / 10); b = R(W() + fb / 10); ka = kb = 1;
          if (fa + fb >= 10) wrong['separate-parts'] = R(Math.floor(a) + Math.floor(b) + (fa + fb) / 100);
        } else if (kind === 'mixed') {
          const x = R(W() + rnd(1, 9) / 10), y = R(W() + tail2() / 100);
          [a, ka, b, kb] = Math.random() < 0.5 ? [x, 1, y, 2] : [y, 2, x, 1];
          wrong['align-right'] = R((sc(x, 1) + sc(y, 2)) / 100);
        } else if (kind === 'whole') {
          const w = L3(lv, rnd(2, 9), rnd(2, 30), rnd(5, 90)), q = lv === 1 ? 1 : pick([1, 2]);
          const y = R(L3(lv, 0, rnd(0, 9), rnd(0, 30)) + (q === 1 ? rnd(1, 9) : tail2()) / P10(q));
          [a, ka, b, kb] = Math.random() < 0.5 ? [w, 0, y, q] : [y, q, w, 0];
          wrong['align-right'] = R((w + sc(y, q)) / P10(q));
        } else if (kind === 'sub') {
          op = '−';
          const wb = W(), wa = wb + rnd(1, L3(lv, 5, 15, 30));
          a = R(wa + tail2() / 100); b = R(wb + rnd(1, 9) / 10); ka = 2; kb = 1;
          wrong['align-right'] = R((sc(a, 2) - sc(b, 1)) / 100);
        } else if (kind === 'sub2') {
          op = '−';
          const wb = rnd(1, 30), wa = wb + rnd(1, 20);
          a = R(wa + rnd(1, 9) / 10); b = R(wb + tail2() / 100); ka = 1; kb = 2;
        } else {
          op = '−';
          const q = pick([1, 2]);
          b = R(rnd(1, 20) + (q === 1 ? rnd(1, 9) : tail2()) / P10(q)); a = Math.floor(b) + rnd(1, 20); ka = 0; kb = q;
        }
        const m = Math.max(ka, kb), res = R(op === '+' ? a + b : a - b);
        wrong['lost-comma'] = sc(res, m);
        const A = num(a), B = num(b), lo = Math.min(a, b), hi = Math.max(a, b);
        const opts = ['plain', 'plain', 'ribbon'];
        if (lo >= 5) opts.push('money');
        if (hi < 5) opts.push('juice');
        if (op === '+' && hi < 15 && lo >= 0.5) opts.push('bag');
        const st = pick(opts);
        const ST = op === '+' ? {
          plain: { story: 'Вычисли.', question: `${A} + ${B} = ?` },
          ribbon: { story: `Сшили вместе две ленты: ${A} м и ${B} м.`, question: 'Какой длины получилась лента? Ответ в метрах.' },
          money: { story: `Сок стоит ${A} руб., а печенье — ${B} руб.`, question: 'Сколько стоит вся покупка? Ответ в рублях.' },
          juice: { story: `В кувшине было ${A} л сока, в него долили ещё ${B} л.`, question: 'Сколько литров сока стало в кувшине?' },
          bag: { story: `Рюкзак весит ${A} кг. В него положили книги массой ${B} кг.`, question: 'Сколько килограммов теперь весит рюкзак?' },
        }[st] : {
          plain: { story: 'Вычисли.', question: `${A} − ${B} = ?` },
          ribbon: { story: `От ленты длиной ${A} м отрезали кусок ${B} м.`, question: 'Сколько метров ленты осталось?' },
          money: { story: `В кошельке было ${A} руб. Из них потратили ${B} руб.`, question: 'Сколько рублей осталось?' },
          juice: { story: `В кувшине было ${A} л сока, из него выпили ${B} л.`, question: 'Сколько литров сока осталось?' },
        }[st];
        const pa = fix(a, m), pb = fix(b, m);
        return Object.assign(ST, {
          answer: ans(res),
          hints: ['Запиши числа столбиком так, чтобы запятая оказалась под запятой. Пустые места справа заполни нулями.',
            `${pa} ${op} ${pb}: считай как ${num(sc(a, m))} ${op} ${num(sc(b, m))} и поставь в ответе запятую под запятыми.${wrong['separate-parts'] != null ? ' Помни: 10 десятых — это 1 целая.' : ''}`],
          solution: `${pa} ${op} ${pb} = ${fix(res, m)}${nd(res) < m ? ` = ${num(res)}` : ''}.`,
          wrongs: wr(res, wrong),
          data: { op: op === '+' ? '+' : '-', a, b },
        });
      },
      verify(t) {
        const { op, a, b } = t.data, r = op === '+' ? sc(a, 3) + sc(b, 3) : sc(a, 3) - sc(b, 3);
        return sc(+t.answer, 3) === r;
      },
    },

    /* 3. d5-mult ------------------------------------------------- */
    {
      id: 'd5-mult', strand: 'Дроби', short: 'Умножаем 0,3·0,2',
      title: 'Умножение десятичных дробей',
      frp: ['Арифметические действия с десятичными дробями: умножение десятичных дробей, умножение на 10, 100, 1000 и на 0,1; 0,01'],
      goal: 'Умножать десятичную дробь на 10, 100, 1000 и на 0,1, а также десятичную дробь на десятичную, верно ставя запятую.',
      requires: ['d5-notation', 'f4-table'],
      explain: {
        model: 'Плитка для ванной — 0,3 м на 0,2 м. Какая у неё площадь? Разрежем квадратный метр на 100 одинаковых клеток. Плитка занимает 3 столбца и 2 строки — 6 клеток из 100, то есть 0,06 м². Вот почему 0,3 · 0,2 = 0,06, а не 0,6: часть от части меньше каждой из них.',
        figure: { type: 'hgrid5d', a: 3, b: 2 },
        figureCaption: 'Квадратный метр — 100 клеток. Плитка 0,3 м × 0,2 м занимает 6 клеток: 0,06 м²',
        rule: '<ul class="rule-list"><li><b>На 10, 100, 1000:</b> перенеси запятую <b>вправо</b> на столько знаков, сколько нулей: 3,7 · 100 = 370. Число становится больше.</li><li><b>На 0,1 и 0,01:</b> перенеси запятую <b>влево</b> на 1 или 2 знака: 3,7 · 0,1 = 0,37.</li><li><b>Десятичную на десятичную:</b> умножь, не глядя на запятые, а потом отсчитай справа столько знаков, сколько их <b>в обоих множителях вместе</b>: 0,3 · 0,2 → 3 · 2 = 6 → два знака → 0,06.</li></ul>',
        examples: [
          { q: 'Тетрадь стоит 37,5 руб. Сколько стоят 10 тетрадей?', choices: ['375 руб.', '37,50 руб.', '3,75 руб.'], correct: 0, wrong: { 1: 'append-zero', 2: 'shift-wrong' },
            steps: ['Умножаем на 10 — запятая переезжает на 1 знак вправо.', '37,5 · 10 = 375 руб. Проверка здравым смыслом: 10 тетрадей должны стоить дороже одной.'] },
          { q: '1,5 · 0,4 = ?', choices: ['0,6', '6'], correct: 0, wrong: { 1: 'comma-one' },
            steps: ['Без запятых: 15 · 4 = 60.', 'В множителях вместе 2 знака после запятой (по одному у каждого).', 'Отсчитываем 2 знака справа: 0,60 = 0,6.'] },
        ],
      },
      mistakes: [
        { id: 'append-zero', title: 'При умножении на 10, 100 приписывает нуль в конце, как у целых чисел', kidName: 'Нулепис',
          kidRule: 'ты умножаешь на 10, как целые числа: просто приписываешь нуль в конце — 3,7 · 10 = 3,70',
          say: 'Нуль в конце десятичной дроби ничего не меняет: 3,70 = 3,7. А при умножении на 10 число должно стать в 10 раз больше.',
          fixIdea: 'Умножить на 10 — перенести запятую на 1 знак вправо: 3,7 · 10 = 37. На 100 — на 2 знака.',
          explainOptions: ['3,70 — это то же число 3,7, а произведение должно быть в 10 раз больше', 'Чтобы умножить на 10, всегда приписывают нуль', 'Нуль в конце делает десятичную дробь в 10 раз больше'],
          conflicts: [
            { text: 'Шоколадка весит 0,1 кг. По твоему правилу 10 шоколадок весят 0,10 кг. Но 0,10 кг = 0,1 кг — столько же, сколько одна шоколадка.', ask: 'Могут 10 шоколадок весить столько же, сколько одна?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => same(0.10, 0.1) && same(0.1 * 10, 1) },
          ],
          root: 'n5-place' },
        { id: 'shift-wrong', title: 'Переносит запятую не в ту сторону', kidName: 'Левый Прыжок',
          kidRule: 'ты при умножении на 10 или 100 переносишь запятую влево, и число становится меньше',
          say: 'При умножении на 10, 100, 1000 число растёт — значит, запятая едет вправо. Влево — когда умножаешь на 0,1 или 0,01.',
          fixIdea: 'Умножаешь на 10, 100, 1000 — число больше, запятая вправо. Умножаешь на 0,1 или 0,01 — число меньше, запятая влево.',
          explainOptions: ['10 тетрадей дороже одной — число должно вырасти, запятая едет вправо', 'Запятую всегда переносят влево', 'Направление неважно, важно только на сколько знаков'],
          conflicts: [
            { text: 'Тетрадь стоит 37,5 руб. По твоему правилу 10 тетрадей стоят 37,5 · 10 = 3,75 руб.', ask: 'Могут 10 тетрадей стоить дешевле одной?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 3.75 < 37.5 && same(37.5 * 10, 375) },
          ],
          root: 'n5-place' },
        { id: 'comma-one', title: 'Отделяет в произведении столько знаков, сколько у одного множителя (0,3 · 0,2 = 0,6)', kidName: 'Недосчёт',
          kidRule: 'ты ставишь запятую, как при сложении: у множителей по одному знаку — и в ответе один, 0,3 · 0,2 = 0,6',
          say: 'Сосчитай знаки после запятой в обоих множителях вместе — столько же их должно быть в произведении.',
          fixIdea: 'Знаки после запятой у множителей складываются: 0,3 · 0,2 — это 1 + 1 = 2 знака, ответ 0,06.',
          explainOptions: [`0,3 · 0,2 — это 3/10 · 2/10 = 6/100, то есть 0,06`, 'Знаков в ответе столько же, сколько у каждого множителя', 'Запятую ставят под запятыми, как при сложении'],
          conflicts: [
            { text: 'Плитка 0,3 м на 0,2 м. По твоему правилу её площадь 0,6 м² — больше половины квадратного метра. А на рисунке плитка занимает всего 6 клеток из 100.', ask: 'Может маленькая плитка занимать больше половины квадратного метра?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 0.3 * 0.2 < 0.5 && 0.6 > 0.5, figure: { type: 'hgrid5d', a: 3, b: 2 } },
          ],
          root: 'mult' },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['x10', 'x10', 'dd1'], ['x10', 'x10', 'dd', 'dd'], ['x01', 'dd3', 'dd', 'x10']));

        if (kind === 'x10') {
          const k = pick(L3(lv, [1, 2], [1, 2, 3], [2, 3])), m = P10(k);
          const st = pick(['plain', 'plain', 'step', 'clip'].concat(k < 3 ? ['price'] : []));
          const x = st === 'price' ? R(rnd(10, 60) + rnd(1, 9) / 10) : st === 'step' ? R(nz(51, 89) / 100) : st === 'clip' ? R(rnd(0, 1) + rnd(1, 9) / 10)
            : lv === 1 ? R(rnd(1, 9) + rnd(1, 9) / 10) : R(rnd(0, 99) + (Math.random() < 0.5 ? rnd(1, 9) / 10 : nz(1, 99) / 100));
          const res = R(x * m), X = num(x), M = num(m);
          const ST = {
            plain: { story: 'Вычисли.', question: `${X} · ${M} = ?` },
            price: { story: `Одна тетрадь стоит ${X} руб.`, question: `Сколько рублей стоят ${M} таких тетрадей?` },
            step: { story: `Длина шага Кати — ${X} м.`, question: `Сколько метров Катя пройдёт за ${M} шагов?` },
            clip: { story: `Одна канцелярская скрепка весит ${X} г.`, question: `Сколько граммов весят ${M} таких скрепок?` },
          }[st];
          return Object.assign(ST, {
            answer: ans(res),
            hints: ['При умножении на 10, 100, 1000 число становится больше. В какую сторону поедет запятая?', `В записи числа ${M} ${nuley(k)} — перенеси запятую на ${k} ${znak(k)} вправо. Не хватает цифр — допиши нули.`],
            solution: `${X} · ${M} = ${num(res)}: запятая переехала на ${k} ${znak(k)} вправо.`,
            wrongs: wr(res, { 'append-zero': x, 'shift-wrong': R(x / m) }),
            data: { a: x, b: m },
          });
        }

        if (kind === 'x01') {
          const use01 = Math.random() < 0.6, k = use01 ? 1 : 2, f = R(1 / P10(k));
          const st = use01 && Math.random() < 0.4 ? 'sale' : 'plain';
          const x = st === 'sale' ? 10 * rnd(50, 500) : use01 ? R(rnd(1, 99) + rnd(1, 9) / 10) : nz(11, 999);
          const res = R(x * f);
          const ST = st === 'sale'
            ? { story: `Куртка стоит ${num(x)} руб. Скидка на неё — 0,1 цены.`, question: 'Сколько рублей составляет скидка?' }
            : { story: 'Вычисли.', question: `${num(x)} · ${num(f)} = ?` };
          return Object.assign(ST, {
            answer: ans(res),
            hints: [use01 ? 'Умножить на 0,1 — значит найти десятую часть числа: оно станет меньше в 10 раз.' : 'Умножить на 0,01 — значит найти сотую часть числа: оно станет меньше в 100 раз.',
              `Перенеси запятую на ${k} ${znak(k)} влево. Не хватает цифр — допиши нули слева.`],
            solution: `${num(x)} · ${num(f)} = ${num(res)}: запятая переехала на ${k} ${znak(k)} влево.`,
            wrongs: wr(res, { 'shift-wrong': R(x * P10(k)), 'comma-one': use01 && !Number.isInteger(x) ? x : null }),
            data: { a: x, b: f },
          });
        }

        // dd1, dd, dd3: десятичная на десятичную
        let st, A, p = 1, B = rnd(2, 9);
        if (kind === 'dd1') { st = pick(['plain', 'tile']); A = rnd(2, 9); }
        else if (kind === 'dd') {
          st = pick(['plain', 'tile', 'bed', 'ribbon', 'bike']);
          A = st === 'tile' ? rnd(2, 9) : st === 'bed' ? nz(11, 99) : st === 'ribbon' ? nz(151, 499) : st === 'bike' ? nz(101, 199) : (Math.random() < 0.3 ? rnd(2, 9) : nz(11, 99));
        } else { st = pick(['plain', 'wire']); p = 2; do { A = rnd(101, 999); B = rnd(2, 9); } while (A % 10 === 0 || (A * B) % 10 !== 0); }
        const q = 1, a = R(A / P10(p)), b = R(B / P10(q)), AB = A * B, res = R(AB / P10(p + q)), a_ = num(a), b_ = num(b);
        const ST = {
          plain: { story: 'Вычисли.', question: `${a_} · ${b_} = ?` },
          tile: { story: `Плитка для ванной — прямоугольник ${a_} м на ${b_} м.`, question: 'Найди площадь плитки (в м²).' },
          bed: { story: `Грядка имеет форму прямоугольника ${a_} м на ${b_} м.`, question: 'Найди площадь грядки (в м²).' },
          ribbon: { story: `Метр ленты стоит ${a_} руб.`, question: `Сколько рублей стоит кусок такой ленты длиной ${b_} м?` },
          bike: { story: `Велосипедист едет со скоростью ${a_} км/ч.`, question: `Сколько километров он проедет за ${b_} ч?` },
          wire: { story: `Метр стальной трубы весит ${a_} кг.`, question: `Сколько килограммов весит кусок такой трубы длиной ${b_} м?` },
        }[st];
        return Object.assign(ST, {
          answer: ans(res),
          hints: [`Перемножь числа, не обращая внимания на запятые: ${A} · ${B}.`, `${A} · ${B} = ${num(AB)}. В множителях вместе ${p + q} ${znak(p + q)} после запятой — отсчитай столько же справа.`],
          solution: `${A} · ${B} = ${num(AB)}; после запятой нужно ${p + q} ${znak(p + q)}: ${a_} · ${b_} = ${fix(AB / P10(p + q), p + q)}${nd(res) < p + q ? ` = ${num(res)}` : ''}.`,
          wrongs: wr(res, { 'comma-one': R(AB / P10(Math.max(p, q))) }),
          data: { a, b },
        });
      },
      verify(t) { const { a, b } = t.data; return sc(+t.answer, 6) === sc(a, 3) * sc(b, 3); },
    },

    /* 4. d5-div -------------------------------------------------- */
    {
      id: 'd5-div', strand: 'Дроби', short: 'Делим 4,8 : 0,4',
      title: 'Деление десятичных дробей',
      frp: ['Арифметические действия с десятичными дробями: деление на натуральное число, на 10, 100, 1000 и на десятичную дробь'],
      goal: 'Делить десятичную дробь на 10, 100, 1000, на натуральное число и на десятичную дробь.',
      requires: ['d5-mult', 'f4-longdiv'],
      explain: {
        model: 'Ленту длиной 4,8 м режут на куски по 0,4 м. Сколько кусков? Переведём в дециметры: 48 дм режем по 4 дм — получится 12 кусков. Мы увеличили в 10 раз и длину ленты, и длину куска — ответ от этого не изменился. Так и делят на десятичную дробь: переносят запятую в обоих числах на одно и то же число знаков.',
        rule: '<ul class="rule-list"><li><b>На 10, 100, 1000:</b> запятая переезжает <b>влево</b> на столько знаков, сколько нулей: 45,6 : 10 = 4,56.</li><li><b>На натуральное число:</b> дели уголком, как обычно; когда закончилась целая часть делимого — ставь запятую в частном. Если очередное число меньше делителя, пиши в частном 0: 6,24 : 6 = 1,04.</li><li><b>На десятичную дробь:</b> перенеси запятую <b>и в делимом, и в делителе</b> на столько знаков, чтобы делитель стал целым: 4,8 : 0,4 = 48 : 4 = 12.</li><li>Проверка: частное · делитель = делимое.</li></ul>',
        examples: [
          { q: 'Ленту 4,8 м режут на куски по 0,4 м. Сколько кусков? 4,8 : 0,4 = ?', choices: ['12', '1,2'], correct: 0, wrong: { 1: 'one-comma' },
            steps: ['Делитель 0,4 станет целым, если перенести запятую на 1 знак вправо: 4.', 'Переносим и в делимом: 4,8 → 48.', '48 : 4 = 12 кусков. Проверка: 12 · 0,4 = 4,8.'] },
          { q: '6,24 : 6 = ?', choices: ['1,04', '1,4'], correct: 0, wrong: { 1: 'lost-zero' },
            steps: ['6 : 6 = 1 — целая часть кончилась, ставим запятую.', '2 меньше 6 — пишем в частном 0 и сносим 4: получается 24.', '24 : 6 = 4. Ответ: 1,04. Проверка: 1,04 · 6 = 6,24.'] },
        ],
      },
      mistakes: [
        { id: 'shift-wrong', title: 'При делении на 10, 100 переносит запятую вправо', kidName: 'Правый Прыжок',
          kidRule: 'ты при делении на 10 или 100 переносишь запятую вправо, и число становится больше',
          say: 'При делении на 10, 100, 1000 число уменьшается. Значит, запятая едет влево.',
          fixIdea: 'Делишь на 10, 100, 1000 — число меньше, запятая влево на столько знаков, сколько нулей.',
          explainOptions: ['Если разрезать канат на 10 частей, каждая часть короче всего каната — число должно уменьшиться', 'При делении запятая всегда едет вправо', 'Делить на 10 — то же, что умножать на 10'],
          conflicts: [
            { text: 'Канат длиной 45,6 м разрезали на 10 равных частей. По твоему правилу каждая часть — 456 м.', ask: 'Может часть каната быть длиннее всего каната?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 456 > 45.6 && same(45.6 / 10, 4.56) },
          ],
          root: 'n5-place' },
        { id: 'one-comma', title: 'Переносит запятую только в делителе', kidName: 'Полупрыг',
          kidRule: 'ты делаешь делитель целым, а запятую в делимом оставляешь на месте: 4,8 : 0,4 = 4,8 : 4 = 1,2',
          say: 'Если делитель увеличился в 10 раз, то и делимое надо увеличить в 10 раз — иначе частное изменится.',
          fixIdea: 'Частное не меняется, если делимое и делитель умножить на одно и то же число. Переноси запятую в обоих числах на одинаковое число знаков.',
          explainOptions: ['4,8 : 0,4 и 48 : 4 — одно и то же: оба числа увеличили в 10 раз', 'Запятую переносят только в делителе, делимое не трогают', 'Можно перенести запятую в любом одном числе — ответ не изменится'],
          conflicts: [
            { text: '4,8 м ленты режут на куски по 0,4 м. По твоему правилу получится 1,2 куска. Но уже 10 кусков по 0,4 м — это 4 м, а лента ещё не кончилась.', ask: 'Может получиться всего 1,2 куска?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => same(0.4 * 10, 4) && 4 < 4.8 && same(4.8 / 0.4, 12) },
          ],
          root: 'reduce' },
        { id: 'lost-zero', title: 'Пропускает нуль в частном', kidName: 'Нулевор',
          kidRule: 'ты при делении уголком пропускаешь шаг, где число меньше делителя, и не пишешь в частном 0',
          say: 'Если очередное число меньше делителя, в частном обязательно пишут 0 — иначе цифры встанут не в те разряды. Проверь ответ умножением.',
          fixIdea: 'Число меньше делителя — пиши в частном 0 и сноси следующую цифру. Проверяй: частное · делитель = делимое.',
          explainOptions: ['Проверка: 1,4 · 6 = 8,4, а не 6,24 — значит, где-то пропущен 0', 'Нули в частном можно не писать', 'Нуль пишут только в конце частного'],
          conflicts: [
            { text: '6,24 : 6. По твоему правилу вышло 1,4. Проверим умножением: 1,4 · 6 = 8,4.', ask: '8,4 — это 6,24?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => same(1.4 * 6, 8.4) && same(1.04 * 6, 6.24) },
          ],
          root: 'f4-longdiv' },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['d10', 'd10', 'zero'], ['d10', 'zero', 'zero', 'dec', 'dec'], ['dec', 'dec', 'zero', 'd10']));

        if (kind === 'd10') {
          const k = pick(L3(lv, [1, 2], [1, 2], [2, 3])), m = P10(k);
          const st = pick(['plain', 'plain', 'paper'].concat(k < 3 ? ['rope', 'notebooks'] : []));
          // в сюжетах сначала выбираем правдоподобную «одну часть», делимое — это она · m
          const per = st === 'paper' ? nz(201, 699) / 100 : st === 'notebooks' ? nz(2501, 6499) / 100 : st === 'rope' ? (k === 1 ? nz(101, 999) / 100 : nz(11, 99) / 10) : null;
          const x = per != null ? R(per * m)
            : k === 3 ? 10 * nz(101, 999) : k === 2 ? nz(lv === 1 ? 11 : 101, lv === 1 ? 999 : 9999) : Math.random() < 0.5 ? nz(11, 999) : R(rnd(1, 99) + rnd(1, 9) / 10);
          const res = R(x / m), X = num(x), M = num(m);
          const ST = {
            plain: { story: 'Вычисли.', question: `${X} : ${M} = ?` },
            rope: { story: `Канат длиной ${X} м разрезали на ${M} равных частей.`, question: 'Какой длины каждая часть? Ответ в метрах.' },
            paper: { story: `Пачка из ${M} одинаковых листов бумаги весит ${X} г.`, question: 'Сколько граммов весит один лист?' },
            notebooks: { story: `${M} одинаковых тетрадей стоят ${X} руб.`, question: 'Сколько рублей стоит одна тетрадь?' },
          }[st];
          return Object.assign(ST, {
            answer: ans(res),
            hints: ['При делении на 10, 100, 1000 число становится меньше. В какую сторону поедет запятая?', `В записи числа ${M} ${nuley(k)} — перенеси запятую на ${k} ${znak(k)} влево. Не хватает цифр — допиши нули слева.`],
            solution: `${X} : ${M} = ${num(res)}: запятая переехала на ${k} ${znak(k)} влево.`,
            wrongs: wr(res, { 'shift-wrong': R(x * m) }),
            data: { a: x, b: m },
          });
        }

        if (kind === 'zero') {
          const n = rnd(...L3(lv, [2, 4], [2, 9], [3, 9])), dd = rnd(1, 9), patB = lv > 1 && Math.random() < 0.35;
          let q, wq;
          if (!patB) { const w = L3(lv, rnd(1, 3), noZero(1, 19), noZero(1, 49)); q = R(w + dd / 100); wq = R(w + dd / 10); }   // w,0d
          else { const a = rnd(1, 9); q = R(10 * a + dd / 10); wq = R(a + dd / 10); }                                       // a0,d
          const D = R(q * n), Dt = num(D);
          const st = pick(['plain', 'route'].concat(D <= 30 ? ['candy'] : []));
          const ST = {
            plain: { story: 'Вычисли.', question: `${Dt} : ${n} = ?` },
            route: { story: `Трассу длиной ${Dt} км разделили на ${n} равных ${pl(n, 'этап', 'этапа', 'этапов')}.`, question: 'Какой длины каждый этап? Ответ в км.' },
            candy: { story: `${Dt} кг конфет разложили поровну в ${n} ${pl(n, 'коробку', 'коробки', 'коробок')}.`, question: 'Сколько килограммов конфет в каждой коробке?' },
          }[st];
          return Object.assign(ST, {
            answer: ans(q),
            hints: ['Дели уголком, как натуральные числа. Когда закончится целая часть делимого, поставь в частном запятую.', `Если очередное число меньше ${n}, в частном пишут 0 и сносят следующую цифру. Проверь: ответ · ${n} = ${Dt}.`],
            solution: `${Dt} : ${n} = ${num(q)}. Проверка: ${num(q)} · ${n} = ${Dt}.`,
            wrongs: wr(q, { 'lost-zero': wq }),
            data: { a: D, b: n },
          });
        }

        // dec: деление на десятичную дробь, ответ — целое
        const st = pick(['plain', 'ribbon', 'juice', 'cheese']);
        let Q, B, p;
        if (st === 'cheese') { p = 1; B = rnd(2, 9); Q = 10 * rnd(30, 90); }
        else if (st === 'juice') { [B, p] = pick([[2, 1], [25, 2], [3, 1], [5, 1]]); Q = rnd(2, 12); }
        else if (lv === 3 && Math.random() < 0.6) { p = 2; B = pick([5, 25, 15, 12, 4, 8, 35, 75]); Q = rnd(2, 40); }
        else { p = 1; B = Math.random() < 0.7 ? rnd(2, 9) : nz(11, 25); Q = rnd(2, L3(lv, 9, 20, 40)); }
        const b = R(B / P10(p)), a = R((Q * B) / P10(p)), At = num(a), Bt = num(b);
        const ST = {
          plain: { story: 'Вычисли.', question: `${At} : ${Bt} = ?` },
          ribbon: { story: `Ленту длиной ${At} м разрезали на куски по ${Bt} м.`, question: 'Сколько получилось кусков?' },
          juice: { story: `В банке ${At} л сока. Его разлили в стаканы по ${Bt} л.`, question: 'Сколько стаканов получилось?' },
          cheese: { story: `За ${Bt} кг сыра заплатили ${At} руб.`, question: 'Сколько стоит 1 кг сыра? Ответ в рублях.' },
        }[st];
        return Object.assign(ST, {
          answer: ans(Q),
          hints: [`Сделай делитель целым: перенеси запятую вправо на ${p} ${znak(p)} — и в делителе, и в делимом.`, `${At} : ${Bt} = ${num(Q * B)} : ${B}.`],
          solution: `${At} : ${Bt} = ${num(Q * B)} : ${B} = ${Q}. Проверка: ${Q} · ${Bt} = ${At}.`,
          wrongs: wr(Q, { 'one-comma': R(Q / P10(p)) }),
          data: { a, b },
        });
      },
      verify(t) { const { a, b } = t.data; return sc(+t.answer, 3) * sc(b, 3) === sc(a, 6); },
    },

    /* 5. d5-round ------------------------------------------------ */
    {
      id: 'd5-round', strand: 'Дроби', short: 'Округляем 3,48',
      title: 'Округление десятичных дробей',
      frp: ['Округление десятичных дробей'],
      goal: 'Округлять десятичные дроби до целых, десятых и сотых по цифре, стоящей сразу за нужным разрядом.',
      requires: ['d5-notation', 'n5-round'],
      explain: {
        model: 'Посылка весит 2,47 кг, а на почте массу пишут до десятых. 2,47 лежит между 2,4 и 2,5 — и ближе к 2,5. Как это узнать, не рисуя луч? Смотрим на цифру сразу справа от нужного разряда: 7 — это 5 или больше, значит, округляем вверх: 2,47 ≈ 2,5.',
        figure: { type: 'nline5d', from: 2.4, to: 2.5, step: 0.01, labels: [2.4, 2.45, 2.5], points: [{ v: 2.47, label: '2,47' }] },
        figureCaption: '2,47 правее середины 2,45 — оно ближе к 2,5',
        rule: '<ol class="rule-list"><li>Найди цифру того разряда, до которого округляешь.</li><li>Посмотри на <b>следующую</b> цифру справа — только на неё.</li><li>Если она 0, 1, 2, 3 или 4 — цифру разряда оставь. Если 5, 6, 7, 8 или 9 — увеличь на 1.</li><li>Все цифры правее отбрось.</li><li>Если 9 превращается в 10 — пиши 0 и прибавь 1 к соседнему разряду слева: 4,97 ≈ 5,0.</li></ol>',
        examples: [
          { q: 'Округли 3,48 до целых.', fig: { type: 'nline5d', from: 3, to: 4, step: 0.1, labels: [3, 3.5, 4], points: [{ v: 3.48, label: '3,48' }] },
            choices: ['3', '4'], correct: 0, wrong: { 1: 'last-digit' },
            steps: ['Разряд единиц: там 3.', 'Следующая цифра — 4 (десятые). 4 меньше 5 — оставляем 3.', 'Цифру 8 не смотрим: она стоит дальше. 3,48 ≈ 3.'] },
          { q: 'Округли 4,97 до десятых.', choices: ['5,0', '4,10', '4,9'], correct: 0, wrong: { 1: 'nine-carry', 2: 'truncate' },
            steps: ['Разряд десятых: там 9.', 'Следующая цифра 7 — значит, 9 увеличиваем на 1.', '9 + 1 = 10: в десятых пишем 0, а 1 переносим в целые. 4,97 ≈ 5,0.'] },
        ],
      },
      mistakes: [
        { id: 'truncate', title: 'Отбрасывает цифры без округления', kidName: 'Ножницы',
          kidRule: 'ты просто отрезаешь лишние цифры и не смотришь, надо ли увеличить последнюю оставшуюся',
          say: 'Отбросить мало: посмотри на первую отброшенную цифру. Если она 5 или больше — последнюю оставшуюся цифру надо увеличить.',
          fixIdea: 'Округлить — найти ближайшее число. Первая отброшенная цифра 5 или больше — увеличь разряд на 1.',
          explainOptions: ['2,47 ближе к 2,5, чем к 2,4: до 2,5 всего 0,03', 'Округлить — значит просто отрезать лишние цифры', 'Округляют всегда в меньшую сторону'],
          conflicts: [
            { text: 'От 2,47 до 2,4 — целых 0,07, а до 2,5 — всего 0,03. По твоему правилу 2,47 ≈ 2,4.', ask: 'К какому числу 2,47 ближе?', choices: ['К 2,4', 'К 2,5'], right: 'К 2,5', verify: () => 2.5 - 2.47 < 2.47 - 2.4,
              figure: { type: 'nline5d', from: 2.4, to: 2.5, step: 0.01, labels: [2.4, 2.45, 2.5], points: [{ v: 2.47, label: '2,47' }] } },
          ],
          root: 'n5-round' },
        { id: 'last-digit', title: 'Смотрит на последнюю цифру числа, а не на следующую за разрядом', kidName: 'Дальнозор',
          kidRule: 'ты решаешь, округлять ли вверх, по самой последней цифре числа, а не по цифре сразу за нужным разрядом',
          say: 'Важна только цифра сразу справа от разряда, до которого округляешь. Последняя цифра числа тут ни при чём.',
          fixIdea: 'Смотри на соседа справа от нужного разряда — и только на него: 3,48 до целых → смотрим на 4 → 3.',
          explainOptions: ['3,48 меньше 3,5, значит, оно ближе к 3, чем к 4', 'Решает последняя цифра: 8 больше 5, значит, вверх', 'Округляют по самой большой цифре в числе'],
          conflicts: [
            { text: '3,48 до целых. По твоему правилу смотрим на 8 и получаем 4. Но 3,48 меньше 3,5 — середины между 3 и 4.', ask: 'К какому целому числу 3,48 ближе?', choices: ['К 3', 'К 4'], right: 'К 3', verify: () => 3.48 - 3 < 4 - 3.48,
              figure: { type: 'nline5d', from: 3, to: 4, step: 0.1, labels: [3, 3.5, 4], points: [{ v: 3.48, label: '3,48' }] } },
          ],
          root: 'n5-round' },
        { id: 'nine-carry', title: 'Округляя 9 вверх, пишет «10» в один разряд (4,97 ≈ 4,10)', kidName: 'Девятка-Десятка',
          kidRule: 'ты округляешь 9 вверх и пишешь 10 прямо в разряд: 4,97 ≈ 4,10',
          say: 'В одном разряде помещается только одна цифра. 9 + 1 = 10: пиши 0, а 1 переноси в соседний разряд слева.',
          fixIdea: '9 + 1 = 10 — как в столбике: 0 остаётся в разряде, 1 переходит влево. 4,97 ≈ 5,0.',
          explainOptions: ['4,10 = 4,1 — это намного меньше 4,97, а округление должно дать близкое число', 'В один разряд можно записать 10', 'После 9 идёт 10, значит, 4,9 превращается в 4,10'],
          conflicts: [
            { text: '4,97 до десятых. По твоему правилу 4,97 ≈ 4,10. Но 4,10 = 4,1 — это почти на 0,9 меньше, чем 4,97.', ask: 'Близко ли 4,1 к 4,97?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 4.97 - 4.1 > 0.8 && 5 - 4.97 < 0.05 },
          ],
          root: 'n5-round' },
      ],
      generate(lv) {
        const [k, t] = pick(L3(lv, [[1, 0], [2, 0], [2, 1]], [[2, 0], [2, 1], [3, 1], [3, 2], [3, 0]], [[3, 1], [3, 2], [3, 0], [2, 1]]));
        const nine = lv > 1 && t >= 1 && Math.random() < 0.35, up = nine || Math.random() < 0.6;
        const fd = Array.from({ length: k }, () => rnd(0, 9));
        if (nine) fd[t - 1] = 9;
        fd[t] = up ? rnd(5, 9) : rnd(t === k - 1 ? 1 : 0, 4);
        if (k - 1 > t && fd[k - 1] === 0) fd[k - 1] = rnd(1, 9);
        const opts = ['plain', 'plain'];
        if (k >= 2) opts.push('mass');
        if (k === 2 && t === 0) opts.push('price');
        if (k === 2 && t === 1) opts.push('run');
        if (k === 3 && t >= 1) opts.push('route');
        const st = pick(opts);
        const w = st === 'price' ? rnd(10, 999) : st === 'run' ? rnd(11, 16) : st === 'mass' ? rnd(0, 9) : st === 'route' ? rnd(1, 30) : L3(lv, rnd(0, 9), rnd(0, 99), rnd(0, 99));
        const X = w * P10(k) + +fd.join(''), x = R(X / P10(k)), xs = num(x);
        const m = k - t, base = Math.floor(X / P10(m)), next = fd[t], last = fd[k - 1];
        const res = R((base + (next >= 5 ? 1 : 0)) / P10(t));
        const place = ['целых', 'десятых', 'сотых'][t], pg = ['единиц', 'десятых', 'сотых'][t];
        const target = t === 0 ? w % 10 : fd[t - 1];
        const ST = {
          plain: { story: '', question: `Округли число ${xs} до ${place}.` },
          mass: { story: `Посылка весит ${xs} кг.`, question: `Округли её массу до ${place}. Ответ в кг.` },
          price: { story: `Игрушка стоит ${xs} руб.`, question: 'Округли цену до целых рублей.' },
          run: { story: `Время забега на 100 м — ${xs} с.`, question: 'Округли его до десятых секунды.' },
          route: { story: `Длина маршрута — ${xs} км.`, question: `Округли её до ${place}. Ответ в км.` },
        }[st];
        return Object.assign(ST, {
          answer: ans(res),
          hints: [`Найди разряд ${pg}: там стоит ${target}. Теперь посмотри на цифру сразу справа от него.`,
            `Справа стоит ${next}. ${next < 5 ? 'Это меньше 5 — цифру разряда не меняй.' : target < 9 ? `Это 5 или больше — увеличь цифру разряда на 1: ${target} → ${target + 1}.` : 'Это 5 или больше — цифру разряда надо увеличить на 1. Но 9 + 1 = 10: в разряде пишем 0, а 1 переносим в соседний разряд слева.'} Все цифры правее отбрось.`],
          solution: `${xs} ≈ ${fix(res, t)}: справа от разряда ${pg} стоит ${next}, ${next >= 5 ? 'поэтому округляем вверх' : 'поэтому цифру разряда оставляем'}.`,
          wrongs: wr(res, {
            truncate: base / P10(t),
            'last-digit': m >= 2 ? (base + (last >= 5 ? 1 : 0)) / P10(t) : null,
            'nine-carry': t >= 1 && next >= 5 && base % 10 === 9 ? (Math.floor(base / 10) * 10 + 1) / P10(t) : null,
          }),
          data: { X, k, t },
        });
      },
      verify(task) {
        const { X, k, t } = task.data, step = P10(k - t), r = Math.floor((X + step / 2) / step);
        return sc(+task.answer, 3) === r * P10(3 - t);
      },
    },

    /* 6. d5-convert ---------------------------------------------- */
    {
      id: 'd5-convert', strand: 'Дроби', short: 'Дробь 3/4 = 0,75',
      title: 'Обыкновенные и десятичные дроби',
      frp: ['Представление десятичной дроби в виде обыкновенной', 'Десятичная запись дробей'],
      goal: 'Переводить десятичную дробь в обыкновенную и обыкновенную дробь со знаменателем 2, 4, 5, 20, 25, 50 — в десятичную.',
      requires: ['d5-notation', 'reduce'],
      explain: {
        model: `Мама просит купить ${fr(3, 4)} кг сыра, а весы в магазине показывают только десятичные дроби. Сколько это? Приведём дробь к знаменателю 100: ${fr(3, 4)} = ${fr(75, 100)} — это 75 сотых, то есть 0,75 кг. И обратно: 0,75 — «семьдесят пять сотых», значит, ${fr(75, 100)}, а после сокращения ${fr(3, 4)}.`,
        figure: { type: 'places5d', nums: ['0,75'] },
        figureCaption: `0,75 — это 7 десятых и 5 сотых, всего 75 сотых: ${fr(75, 100)} = ${fr(3, 4)}`,
        rule: `<ul class="rule-list"><li><b>Десятичная → обыкновенная:</b> цифры после запятой — числитель, а в знаменателе 1 и столько нулей, сколько знаков после запятой: 0,3 = ${fr(3, 10)}, 0,25 = ${fr(25, 100)} = ${fr(1, 4)}. Потом сократи.</li><li><b>Обыкновенная → десятичная:</b> приведи дробь к знаменателю 10 или 100: ${fr(3, 4)} = ${fr(75, 100)} = 0,75, ${fr(1, 5)} = ${fr(2, 10)} = 0,2.</li><li>Дробная черта — это деление, а не запятая: ${fr(3, 4)} = 3 : 4, а вовсе не 3,4.</li></ul>`,
        examples: [
          { q: `Запиши ${fr(3, 4)} десятичной дробью.`, choices: ['0,75', '3,4', '0,34'], correct: 0, wrong: { 1: 'glued' },
            steps: ['Знаменатель 4 превратим в 100: умножим числитель и знаменатель на 25.', `${fr(3, 4)} = ${fr(75, 100)}.`, '75 сотых — это 0,75.'] },
          { q: 'Запиши 0,3 обыкновенной дробью.', choices: [fr(3, 10), fr(1, 3)], correct: 0, wrong: { 1: 'digit-den' },
            steps: ['0,3 читается «три десятых».', `Значит, 0,3 = ${fr(3, 10)}.`, `${fr(1, 3)} — это одна третья, совсем другое число.`] },
          { q: 'Запиши 0,25 обыкновенной дробью.', choices: [fr(1, 4), fr(25, 10)], correct: 0, wrong: { 1: 'always-ten' },
            steps: ['После запятой два знака — это сотые.', `0,25 = ${fr(25, 100)}.`, `Сокращаем на 25: ${fr(1, 4)}.`] },
        ],
      },
      mistakes: [
        { id: 'glued', title: 'Записывает дробь через запятую: 3/4 = 3,4', kidName: 'Склейщик',
          kidRule: 'ты переписываешь числитель и знаменатель через запятую: 3/4 превращается в 3,4',
          say: 'Дробная черта означает деление, а не запятую. Правильная дробь меньше единицы, а у тебя получилось больше.',
          fixIdea: `Дробь — это деление: 3/4 = 3 : 4. Приведи к знаменателю 100: 3/4 = 75/100 = 0,75.`,
          explainOptions: [`3/4 меньше целого, а 3,4 больше трёх — они не могут быть равны`, 'Числитель пишут до запятой, знаменатель — после', 'Черта дроби и запятая означают одно и то же'],
          conflicts: [
            { text: `3/4 пиццы — это меньше одной пиццы. По твоему правилу 3/4 = 3,4 — больше трёх целых пицц.`, ask: 'Три четверти пиццы — это больше трёх пицц?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 3 / 4 < 1 && 3.4 > 3, figure: { type: 'pizza', parts: 4, have: 3 } },
          ],
          root: 'concept' },
        { id: 'digit-den', title: 'Считает цифру после запятой знаменателем: 0,3 = 1/3, 1/5 = 0,5', kidName: 'Перевёртыш',
          kidRule: 'ты думаешь, что 0,5 — это одна пятая, а 0,3 — одна третья: цифра после запятой у тебя становится знаменателем',
          say: '0,5 читается «пять десятых», а не «одна пятая». Знаменатель десятичной дроби — 10, 100 или 1000.',
          fixIdea: `Прочитай дробь вслух: 0,3 — «три десятых», значит, 3/10. А 1/5 = 2/10 = 0,2.`,
          explainOptions: [`0,5 — это половина, а 1/5 — только пятая часть, они разные`, `Одна пятая записывается как 0,5`, 'Цифра после запятой показывает, на сколько частей делят целое'],
          conflicts: [
            { text: `0,5 — это пять десятых, то есть половина. По твоему правилу 0,5 = 1/5. Разрежь торт на 5 частей и возьми одну.`, ask: 'Пятая часть торта — это половина торта?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => !same(1 / 5, 0.5), figure: { type: 'cake', parts: 5, have: 1 } },
          ],
          root: 'concept' },
        { id: 'always-ten', title: 'Всегда ставит в знаменатель 10: 0,25 = 25/10', kidName: 'Вечная Десятка',
          kidRule: 'ты всегда пишешь в знаменателе 10, сколько бы цифр ни было после запятой: 0,25 = 25/10',
          say: 'Посчитай знаки после запятой: один знак — десятые, два — сотые. Сколько знаков — столько нулей в знаменателе.',
          fixIdea: `Сколько знаков после запятой — столько нулей в знаменателе: 0,25 = 25/100, 0,07 = 7/100.`,
          explainOptions: [`25/10 больше двух, а 0,25 меньше единицы — значит, знаменатель должен быть 100`, 'В знаменателе десятичной дроби всегда 10', 'Знаменатель можно выбрать любой, главное — числитель'],
          conflicts: [
            { text: `0,25 меньше единицы. По твоему правилу 0,25 = 25/10. Но 25/10 = 2,5 — это больше двух.`, ask: 'Может 0,25 быть больше двух?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 25 / 10 > 2 && 0.25 < 1 },
          ],
          root: 'n5-place' },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['f2d', 'f2d', 'd2f'], ['f2d', 'd2f', 'f2d', 'd2f'], ['f2d', 'd2f', 'mixed', 'dw']));

        if (kind === 'f2d' || kind === 'mixed') {
          const b = kind === 'mixed' ? pick([2, 4, 5, 20, 25]) : pick(lv === 1 ? [2, 5, 10] : [2, 4, 5, 20, 25, 50, 100]);
          let a;
          if (b === 100) a = Math.random() < 0.6 ? rnd(1, 9) : nz(11, 99);
          else if (b === 10) a = rnd(1, 9);
          else if (Math.random() < 0.35) a = 1;
          else do a = rnd(1, b - 1); while (gcd(a, b) !== 1);
          const w = kind === 'mixed' ? rnd(1, 9) : 0, val = R(w + a / b), D = 10 % b === 0 ? 10 : 100, k = D / b, F = fr(a, b), W = w ? `${w} ` : '';
          const tens = b === 10 || b === 100, small = [2, 4, 5].includes(b), plainQ = { story: 'Запиши обыкновенную дробь десятичной.', question: `${F} = ?` };
          const ST = w ? pick([
            { story: 'Запиши смешанное число десятичной дробью.', question: `${W}${F} = ?` },
            { story: `Арбуз весит ${W}${F} кг.`, question: 'Запиши его массу десятичной дробью (в кг).' },
          ]) : pick([plainQ, plainQ]
            .concat(small ? [{ story: `Мама попросила купить ${F} кг сыра. Весы в магазине показывают массу десятичной дробью.`, question: 'Какое число должно быть на весах? Ответ в кг.' },
              { story: `В бутылке ${F} л сока.`, question: 'Запиши объём десятичной дробью (в литрах).' }] : [])
            .concat(small || (b === 10 && gcd(a, 10) === 1) ? [{ story: `От дома до школы ${F} км.`, question: 'Запиши это расстояние десятичной дробью (в км).' }] : []));
          return Object.assign(ST, {
            answer: ans(val),
            hints: tens
              ? ['Знаменатель 10 — один знак после запятой, знаменатель 100 — два знака.', `${F} — это ${a} ${b === 10 ? desyat(a) : sotyh(a)}.`]
              : [`${w ? 'Целая часть остаётся до запятой. ' : ''}Приведи дробь к знаменателю ${D}: на какое число нужно умножить ${b}?`, `${b} · ${k} = ${D}. Числитель тоже умножь на ${k}: ${F} = ${fr(a * k, D)}.`],
            solution: tens ? `${F} = ${num(val)}.` : `${W}${F} = ${W}${fr(a * k, D)} = ${num(val)}.`,
            wrongs: wr(val, {
              glued: tens || (w && !small) ? null : +(w ? `${w}.${a}${b}` : `${a}.${b}`),
              'digit-den': a === 1 && !tens ? R(w + +`0.${b}`) : null,
              'always-ten': b === 100 && a < 10 ? R(w + a / 10) : null,
            }),
            data: { kind: 'f2d', w, a, b },
          });
        }

        if (kind === 'd2f') {
          const k = lv === 1 ? 1 : pick([1, 2, 2]), N = k === 1 ? rnd(1, 9) : nz(1, 99), Dn = P10(k), x = R(N / Dn), [n, d] = simp(N, Dn), xs = num(x);
          const ST = pick([
            { story: 'Запиши десятичную дробь в виде обыкновенной.', question: `${xs} = ?` },
            { story: `В бутылке ${xs} л воды.`, question: 'Какая это часть литра? Запиши обыкновенной дробью.' },
            { story: `Длина дорожки в парке — ${xs} км.`, question: 'Какая это часть километра? Запиши обыкновенной дробью.' },
          ]);
          return Object.assign(ST, {
            answer: `${n}/${d}`, accept: 'equivalent', placeholder: 'например, 3/4',
            hints: [`Прочитай число вслух: ${xs} — это ${N} ${k === 1 ? desyat(N) : sotyh(N)}.`, `${xs} = ${fr(N, Dn)}${n !== N ? '. Эту дробь можно сократить' : ''}.`],
            solution: `${xs} = ${fr(N, Dn)}${n !== N ? ` = ${fr(n, d)}` : ''}.`,
            wrongs: wf(x, { 'digit-den': k === 1 && N >= 2 ? [1, N] : null, 'always-ten': k === 2 ? [N, 10] : null }),
            data: { kind: 'd2f', N, k },
          });
        }

        // dw: десятичная с целой частью → неправильная дробь или смешанное число
        const w = rnd(1, 9), dd = rnd(1, 9), N = 10 * w + dd, [n, d] = simp(N, 10), x = R(N / 10), xs = num(x), g = gcd(dd, 10);
        const ST = pick([
          { story: 'Запиши десятичную дробь в виде смешанного числа или неправильной дроби.', question: `${xs} = ?` },
          { story: `Пакет муки весит ${xs} кг.`, question: 'Запиши эту массу смешанным числом или неправильной дробью (в кг).' },
        ]);
        return Object.assign(ST, {
          answer: `${n}/${d}`, accept: 'equivalent', placeholder: 'например, 3 2/5',
          hints: [`${xs} — это ${w} ${pl(w, 'целая', 'целых', 'целых')} и ${dd} ${desyat(dd)}.`, `${xs} = ${w} ${fr(dd, 10)}${g > 1 ? '. Дробную часть можно сократить' : ''}.`],
          solution: `${xs} = ${w} ${fr(dd, 10)}${g > 1 ? ` = ${w} ${fr(dd / g, 10 / g)}` : ''} = ${fr(n, d)}.`,
          wrongs: wf(x, { glued: [w, dd], 'digit-den': dd >= 2 ? [w * dd + 1, dd] : null }),
          data: { kind: 'd2f', N, k: 1 },
        });
      },
      verify(t) {
        const d = t.data;
        if (d.kind === 'f2d') return sc(+t.answer, 2) * d.b === (d.w * d.b + d.a) * 100;
        const [n, m] = String(t.answer).split('/').map(Number);
        return Number.isInteger(n) && Number.isInteger(m) && m > 0 && n * P10(d.k) === d.N * m;
      },
    },

    /* 7. t5-units ------------------------------------------------ */
    {
      id: 't5-units', strand: 'Текстовые задачи', short: 'Единицы величин',
      title: 'Единицы измерения длины, массы и времени',
      frp: ['Единицы измерения: массы, расстояния, времени; связь между единицами измерения каждой величины'],
      goal: 'Переводить километры в метры, тонны и килограммы в граммы, часы в минуты и обратно, в том числе составные и десятичные значения.',
      requires: ['n5-place', 'd5-notation'],
      explain: {
        model: 'Фильм идёт 2 ч 15 мин. Сколько это минут? Хочется написать 215, но в часе не 100 минут, а 60! Значит, 2 ч — это 120 мин, и ещё 15: всего 135 мин. У длины и массы свои «переходы»: «кило» значит «тысяча» — в километре 1000 метров, в килограмме 1000 граммов, а в тонне 1000 килограммов.',
        rule: '<ul class="rule-list"><li><b>Время:</b> 1 ч = 60 мин, 1 мин = 60 с. Время не десятичное: 1,5 ч = 1 ч 30 мин = 90 мин.</li><li><b>Длина:</b> 1 км = 1000 м, 1 м = 100 см.</li><li><b>Масса:</b> 1 т = 1000 кг, 1 кг = 1000 г.</li><li>Из крупных единиц в мелкие — <b>умножаем</b>, из мелких в крупные — <b>делим</b>.</li><li>Составное значение переводи по частям: 3 км 50 м = 3000 м + 50 м = 3050 м.</li></ul>',
        examples: [
          { q: 'Фильм идёт 2 ч 15 мин. Сколько это минут?', choices: ['135', '215'], correct: 0, wrong: { 1: 'hour-100' },
            steps: ['2 ч = 2 · 60 = 120 мин.', '120 + 15 = 135 мин.'] },
          { q: 'Лыжная трасса — 3 км 50 м. Сколько это метров?', choices: ['3050', '350'], correct: 0, wrong: { 1: 'kilo-100' },
            steps: ['3 км = 3 · 1000 = 3000 м.', '3000 + 50 = 3050 м.'] },
          { q: 'Доска — 4 м 7 см. Сколько это сантиметров?', choices: ['407', '47'], correct: 0, wrong: { 1: 'concat' },
            steps: ['4 м = 4 · 100 = 400 см.', '400 + 7 = 407 см. А 47 см — меньше полуметра!'] },
        ],
      },
      mistakes: [
        { id: 'hour-100', title: 'Считает, что в часе 100 минут', kidName: 'Стоминутка',
          kidRule: 'ты переводишь часы в минуты так, будто в часе 100 минут: 2 ч 15 мин = 215 мин',
          say: 'В часе 60 минут, а не 100. Время нельзя переводить, как десятичные дроби.',
          fixIdea: '1 ч = 60 мин. Часы умножай на 60: 2 ч 15 мин = 120 + 15 = 135 мин.',
          explainOptions: ['Минутная стрелка делает полный круг за 60 минут — это и есть час', 'В часе 100 минут, как в рубле 100 копеек', 'Часы и минуты просто записывают рядом'],
          conflicts: [
            { text: 'По твоему правилу полтора часа (1,5 ч) — это 150 мин. Но полтора часа — это час (60 мин) и ещё полчаса (30 мин).', ask: 'Сколько минут в полутора часах?', choices: ['90', '150'], right: '90', verify: () => 60 + 30 === 90 && 1.5 * 60 === 90 },
          ] },
        { id: 'kilo-100', title: 'Считает, что в километре 100 метров (в килограмме 100 г, в тонне 100 кг)', kidName: 'Сотник',
          kidRule: 'ты думаешь, что в километре 100 метров, а в килограмме 100 граммов — как в метре 100 сантиметров',
          say: 'Приставка «кило» означает «тысяча»: километр — 1000 метров, килограмм — 1000 граммов. В тонне тоже 1000 кг.',
          fixIdea: '«Кило» = 1000: 1 км = 1000 м, 1 кг = 1000 г. И 1 т = 1000 кг.',
          explainOptions: ['«Кило» значит «тысяча»: в километре 1000 метров', 'Во всех единицах по 100 частей, как в метре', 'В километре 10 метров'],
          conflicts: [
            { text: 'Пакет сахара весит 1 кг. По твоему правилу это 100 г. Но 100 г весит обычная плитка шоколада.', ask: 'Пакет сахара весит столько же, сколько плитка шоколада?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 1000 !== 100 },
          ] },
        { id: 'concat', title: 'Приписывает числа друг к другу: 4 м 7 см = 47 см', kidName: 'Слипалка',
          kidRule: 'ты просто пишешь числа рядом: 4 м 7 см превращаешь в 47 см',
          say: 'Сначала переведи крупные единицы: 4 м — это 400 см. Потом прибавь остальное.',
          fixIdea: 'Переводи по частям и складывай: 4 м 7 см = 400 см + 7 см = 407 см.',
          explainOptions: ['4 м — это 400 см, к ним прибавляют 7 см: 407 см', 'Числа можно просто записать рядом', '4 м 7 см = 4 + 7 = 11 см'],
          conflicts: [
            { text: 'Доска длиной 4 м 7 см. По твоему правилу это 47 см — меньше половины метра. А в доске больше 4 метров!', ask: 'Может доска длиннее 4 м оказаться 47 см?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 47 < 400 && 4 * 100 + 7 === 407 },
          ],
          root: 'n5-place' },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['hm', 'big', 'cm', 'hdec'], ['hm', 'hdec', 'mh', 'big', 'big', 'cm', 'rev'], ['hdec', 'mh', 'big', 'rev', 'sum', 'sum']));

        if (kind === 'hm') {
          const S = pick([
            { story: (h, m) => `Поезд был в пути ${h} ч ${m} мин.`, q: 'Сколько это минут?', h: 9 },
            { story: (h, m) => `Фильм идёт ${h} ч ${m} мин.`, q: 'Сколько минут длится фильм?', h: 3 },
            { story: (h, m) => `Поход длился ${h} ч ${m} мин.`, q: 'Сколько минут длился поход?', h: 6 },
          ]);
          const h = rnd(1, Math.min(S.h, L3(lv, 3, 5, 9))), m = 5 * rnd(1, 11), x = 60 * h + m;
          return {
            story: S.story(h, m), question: S.q, answer: ans(x),
            hints: ['В одном часе 60 минут. Сначала переведи в минуты целые часы.', `${h} ч = ${h} · 60 = ${60 * h} мин. Прибавь ещё ${m} мин.`],
            solution: `${h} · 60 + ${m} = ${60 * h} + ${m} = ${x} мин.`,
            wrongs: wr(x, { 'hour-100': 100 * h + m }),
            data: { kind: 'sum', parts: [[h, 60], [m, 1]] },
          };
        }
        if (kind === 'hdec') {
          const [x, S] = pick([[0.5, 'Тренировка длится'], [1.5, 'Тренировка длится'], [0.75, 'Урок в музыкальной школе длится'], [0.25, 'Дорога до школы занимает'],
            [0.2, 'Дорога до школы занимает'], [0.4, 'Дорога до школы занимает'], [1.25, 'Дорога до бабушки занимает'], [2.5, 'Дорога до бабушки занимает'],
            [1.2, 'Поездка на дачу занимает'], [3.5, 'Поездка на дачу занимает'], [1.75, 'Фильм идёт'], [2.25, 'Поход длился']]), mins = R(x * 60);
          return {
            story: `${S} ${num(x)} ч.`, question: 'Сколько это минут?', answer: ans(mins),
            hints: ['1 ч = 60 мин. Чтобы перевести часы в минуты, умножь на 60.', `${num(x)} ч — это ${num(x)} · 60 мин.`],
            solution: `${num(x)} · 60 = ${num(mins)} мин.`,
            wrongs: wr(mins, { 'hour-100': R(x * 100) }),
            data: { kind: 'hdec', x },
          };
        }
        if (kind === 'mh') {
          const m = pick([30, 45, 90, 150, 72, 84, 18, 36, 105, 135, 75, 15]), x = R(m / 60), [a, b] = simp(m, 60);
          const S = pick(['Мультфильм идёт', 'Урок плавания длится', 'Дорога на дачу занимает']);
          return {
            story: `${S} ${m} мин.`, question: 'Сколько это часов? Запиши ответ десятичной дробью.', answer: ans(x),
            hints: ['1 ч = 60 мин. Чтобы перевести минуты в часы, раздели на 60.', `${m} : 60 = ? Можно так: ${m} мин — это ${b === 1 ? a : a > b ? `${Math.floor(a / b)} ${fr(a % b, b)}` : fr(a, b)} ч.`],
            solution: `${m} : 60 = ${num(x)} ч.`,
            wrongs: wr(x, { 'hour-100': R(m / 100) }),
            data: { kind: 'mh', m },
          };
        }
        if (kind === 'big') {
          const U = pick([
            { big: 'км', small: 'м', story: (a, b) => `Длина лыжной трассы — ${a} км ${b} м.`, q: 'Сколько это метров?' },
            { big: 'т', small: 'кг', story: (a, b) => `Грузовик везёт ${a} т ${b} кг груза.`, q: 'Сколько это килограммов?' },
            { big: 'кг', small: 'г', story: (a, b) => `Арбуз весит ${a} кг ${b} г.`, q: 'Сколько это граммов?' },
          ]);
          const a = rnd(1, L3(lv, 5, 9, 15)), b = lv === 1 ? 100 * rnd(1, 9) : pick([rnd(1, 9), rnd(10, 99), 10 * rnd(11, 99), rnd(101, 999)]), x = 1000 * a + b;
          return {
            story: U.story(a, b), question: U.q, answer: ans(x),
            hints: [`Приставка «кило» значит «тысяча». 1 ${U.big} = 1000 ${U.small}.`, `${a} ${U.big} = ${num(1000 * a)} ${U.small}. Прибавь ещё ${b} ${U.small}.`],
            solution: `${a} · 1000 + ${b} = ${num(1000 * a)} + ${b} = ${num(x)} ${U.small}.`,
            wrongs: wr(x, { 'kilo-100': 100 * a + b, concat: b < 100 ? +`${a}${b}` : null }),
            data: { kind: 'sum', parts: [[a, 1000], [b, 1]] },
          };
        }
        if (kind === 'cm') {
          const S = pick([
            { story: (a, b) => `Длина доски — ${a} м ${b} см.`, max: 6 },
            { story: (a, b) => `Длина прыжка — ${a} м ${b} см.`, max: 5 },
            { story: (a, b) => `Длина ковра — ${a} м ${b} см.`, max: 4 },
          ]);
          const a = rnd(1, S.max), b = Math.random() < 0.6 ? rnd(1, 9) : rnd(10, 99), x = 100 * a + b;
          return {
            story: S.story(a, b), question: 'Сколько это сантиметров?', answer: ans(x),
            hints: ['1 м = 100 см. Сначала переведи в сантиметры целые метры.', `${a} м = ${100 * a} см. Прибавь ещё ${b} см.`],
            solution: `${a} · 100 + ${b} = ${100 * a} + ${b} = ${x} см.`,
            wrongs: wr(x, { concat: b < 10 ? +`${a}${b}` : null }),
            data: { kind: 'sum', parts: [[a, 100], [b, 1]] },
          };
        }
        if (kind === 'rev') {
          const U = pick([
            { small: 'г', big: 'кг', story: X => `Пакет муки весит ${num(X)} г.`, q: 'Сколько это килограммов?', r: [50, 300] },
            { small: 'м', big: 'км', story: X => `От дома до парка ${num(X)} м.`, q: 'Сколько это километров?', r: [11, 999] },
            { small: 'кг', big: 'т', story: X => `Машина везёт ${num(X)} кг груза.`, q: 'Сколько это тонн?', r: [101, 999] },
          ]);
          let X;
          do X = 10 * rnd(...U.r); while (X % 1000 === 0);
          const x = R(X / 1000);
          return {
            story: U.story(X), question: U.q, answer: ans(x),
            hints: [`1 ${U.big} = 1000 ${U.small}. Из мелких единиц в крупные переводят делением.`, `${num(X)} : 1000 — перенеси запятую на 3 знака влево.`],
            solution: `${num(X)} : 1000 = ${num(x)} ${U.big}.`,
            wrongs: wr(x, { 'kilo-100': R(X / 100) }),
            data: { kind: 'rev', X },
          };
        }
        // sum: сложение составных величин
        if (Math.random() < 0.5) {
          const h = rnd(1, 2), m1 = 5 * rnd(1, 11), m2 = 5 * rnd(4, 11), x = 60 * h + m1 + m2;
          return {
            story: `Первый фильм идёт ${h} ч ${m1} мин, а второй — ${m2} мин.`, question: 'Сколько минут идут оба фильма вместе?', answer: ans(x),
            hints: ['Переведи всё в минуты: 1 ч = 60 мин.', `${h} ч ${m1} мин = ${60 * h + m1} мин. Прибавь ${m2} мин.`],
            solution: `${60 * h} + ${m1} + ${m2} = ${x} мин.`,
            wrongs: wr(x, { 'hour-100': 100 * h + m1 + m2 }),
            data: { kind: 'sum', parts: [[h, 60], [m1, 1], [m2, 1]] },
          };
        }
        const a1 = rnd(2, 9), b1 = 50 * rnd(2, 19), a2 = rnd(1, 4), b2 = 50 * rnd(2, 19), x = 1000 * (a1 + a2) + b1 + b2;
        return {
          story: `Арбуз весит ${a1} кг ${b1} г, а дыня — ${a2} кг ${b2} г.`, question: 'Сколько граммов весят арбуз и дыня вместе?', answer: ans(x),
          hints: ['Переведи обе массы в граммы: 1 кг = 1000 г.', `${a1} кг ${b1} г = ${num(1000 * a1 + b1)} г, ${a2} кг ${b2} г = ${num(1000 * a2 + b2)} г. Сложи.`],
          solution: `${num(1000 * a1 + b1)} + ${num(1000 * a2 + b2)} = ${num(x)} г.`,
          wrongs: wr(x, { 'kilo-100': 100 * (a1 + a2) + b1 + b2 }),
          data: { kind: 'sum', parts: [[a1, 1000], [b1, 1], [a2, 1000], [b2, 1]] },
        };
      },
      verify(t) {
        const d = t.data, x = +t.answer;
        if (d.kind === 'sum') { let s = 0; for (const [v, k] of d.parts) for (let i = 0; i < v; i++) s += k; return x === s; }
        if (d.kind === 'hdec') return sc(x / 60, 4) === sc(d.x, 4);
        if (d.kind === 'mh') return sc(x * 60, 3) === d.m * 1000;
        return sc(x * 1000, 3) === d.X * 1000;
      },
    },

    /* 8. t5-motion ----------------------------------------------- */
    {
      id: 't5-motion', strand: 'Текстовые задачи', short: 'Скорость и путь',
      title: 'Скорость, время, расстояние',
      frp: ['Решение текстовых задач, содержащих зависимости, связывающие величины: скорость, время, расстояние', 'Единицы измерения расстояния, времени, скорости; связь между единицами измерения каждой величины'],
      goal: 'Находить путь, скорость и время по двум известным величинам, следить за единицами измерения, решать задачи на движение навстречу и в одном направлении.',
      requires: ['f4-longdiv', 't5-units'],
      explain: {
        model: 'Велосипедист едет со скоростью 15 км/ч — значит, за каждый час он проезжает 15 км. За 3 часа: 15 + 15 + 15 = 45 км, то есть 15 · 3. Отсюда все три формулы: путь = скорость · время, а скорость и время находят делением.',
        figure: { type: 'road5d', kind: 'one', v: ['15 км/ч'], s: '45 км', t: 'время: 3 ч' },
        figureCaption: 'Каждый час — по 15 км: за 3 часа 15 · 3 = 45 км',
        rule: `<ul class="rule-list"><li><b>s = v · t</b> — путь равен скорости, умноженной на время.</li><li><b>v = s : t</b>, <b>t = s : v</b> — скорость и время находят делением. Проверка: скорость · время = путь.</li><li><b>Единицы должны совпадать:</b> км/ч — с часами и километрами. Если время в минутах, сначала переведи его в часы: 30 мин = ${fr(1, 2)} ч, 20 мин = ${fr(1, 3)} ч.</li><li><b>Навстречу или в противоположные стороны</b> — скорости складывают. <b>В одну сторону</b> — вычитают.</li></ul>`,
        examples: [
          { q: 'Поезд прошёл 240 км за 3 ч. Найди его скорость.', choices: ['80 км/ч', '720 км/ч'], correct: 0, wrong: { 1: 'formula-mix' },
            steps: ['Скорость = путь : время.', '240 : 3 = 80 км/ч. Проверка: 80 · 3 = 240.'] },
          { q: 'Из двух сёл навстречу друг другу вышли пешеходы: 4 км/ч и 5 км/ч. Встретились через 2 ч. Каково расстояние между сёлами?', fig: { type: 'road5d', kind: 'meet', v: ['4 км/ч', '5 км/ч'], s: '? км', t: 'встретились через 2 ч' },
            choices: ['18 км', '2 км'], correct: 0, wrong: { 1: 'closing-minus' },
            steps: ['Каждый час они сближаются на 4 + 5 = 9 км.', 'За 2 часа: 9 · 2 = 18 км.'] },
          { q: 'Велосипедист ехал 30 мин со скоростью 12 км/ч. Сколько километров он проехал?', choices: ['6 км', '360 км'], correct: 0, wrong: { 1: 'units-mix' },
            steps: ['30 мин — это половина часа.', 'За целый час — 12 км, за половину — 12 : 2 = 6 км.'] },
        ],
      },
      mistakes: [
        { id: 'formula-mix', title: 'Путает формулы: умножает, когда надо делить, и наоборот', kidName: 'Формулопут',
          kidRule: 'ты берёшь два числа из условия и перемножаешь их, даже когда ищешь скорость или время',
          say: 'Проверь ответ на здравый смысл: скорость — это сколько километров приходится на один час. Подставь свой ответ в «скорость · время = путь».',
          fixIdea: 'Путь = скорость · время. Скорость = путь : время. Время = путь : скорость. Проверяй: скорость · время должно дать путь.',
          explainOptions: ['Скорость — путь за 1 час, поэтому весь путь делят на число часов', 'Чтобы найти скорость, путь умножают на время', 'Все три величины находят умножением'],
          conflicts: [
            { text: 'Поезд прошёл 240 км за 3 ч. По твоему правилу его скорость 240 · 3 = 720 км/ч. Тогда за 3 ч он прошёл бы 720 · 3 = 2160 км, а не 240.', ask: 'Подходит скорость 720 км/ч?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 720 * 3 === 2160 && 80 * 3 === 240 },
          ],
          root: 'f4-table' },
        { id: 'units-mix', title: 'Не переводит единицы: км/ч умножает на минуты', kidName: 'Минутник',
          kidRule: 'ты берёшь скорость в км/ч и время в минутах и сразу перемножаешь или делишь их',
          say: 'Скорость дана в километрах в час, а время — в минутах. Сначала переведи всё в одни единицы.',
          fixIdea: 'Перед вычислением приведи всё к одним единицам: км/ч — с часами и километрами, м/мин — с минутами и метрами.',
          explainOptions: ['12 км/ч — это 12 км за целый час, а 30 минут — только половина часа', 'Единицы можно не смотреть, главное — числа', 'Минуты и часы — одно и то же'],
          conflicts: [
            { text: 'Велосипедист едет 12 км/ч — это 12 км за целый час. По твоему правилу за 30 минут он проедет 12 · 30 = 360 км.', ask: 'Можно за полчаса проехать больше, чем за целый час?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 12 * 30 > 12 && 12 / 2 === 6 },
          ],
          root: 't5-units' },
        { id: 'closing-minus', title: 'При движении навстречу вычитает скорости (а в одну сторону — складывает)', kidName: 'Встречный Минус',
          kidRule: 'ты вычитаешь скорости, когда двое едут навстречу друг другу, а когда в одну сторону — складываешь',
          say: 'Когда движутся навстречу, за час расстояние сокращается и за счёт одного, и за счёт другого — скорости складывают. В одну сторону — вычитают.',
          fixIdea: 'Навстречу или в противоположные стороны — скорости складывают. В одну сторону — вычитают: важна разница.',
          explainOptions: ['Навстречу каждый проходит свою часть пути, поэтому за час они сближаются на сумму скоростей', 'Навстречу скорости вычитают, ведь едут в разные стороны', 'Скорости никогда не складывают'],
          conflicts: [
            { text: 'Два пешехода идут навстречу друг другу, оба со скоростью 5 км/ч. По твоему правилу они сближаются на 5 − 5 = 0 км/ч — то есть никогда не встретятся.', ask: 'Если два человека идут навстречу друг другу, они встретятся?', choices: ['Да', 'Нет'], right: 'Да', verify: () => 5 - 5 === 0 && 5 + 5 > 0, figure: { type: 'road5d', kind: 'meet', v: ['5 км/ч', '5 км/ч'] } },
          ] },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['s', 'v', 't', 's'], ['s', 'v', 't', 'units', 'meet', 'apart'], ['units', 'units', 'meet', 'meet', 'apart', 'same', 'v', 't']));

        if (kind === 's' || kind === 'v' || kind === 't') {
          const M = pick(MOVERS), t = rnd(...L3(lv, [2, 4], [2, 6], [3, 9]));
          let v = speedOf(M);
          if (kind === 's' && Math.random() < 0.5) for (let g = 0; g < 20 && v % t; g++) v = speedOf(M);
          const s = v * t;
          const ST = {
            s: { story: `${M.who} ${M.past} ${t} ${hours(t)} со скоростью ${v} км/ч.`, question: 'Какое расстояние он преодолел? Ответ в км.', answer: s,
              hints: ['Путь = скорость · время.', `Каждый час — по ${v} км, а часов ${t}: ${v} · ${t}.`], solution: `${v} · ${t} = ${num(s)} км.`, w: v % t === 0 ? v / t : null },
            v: { story: `${M.who} ${M.perf} ${num(s)} км за ${t} ${hours(t)}.`, question: 'С какой скоростью он двигался? Ответ в км/ч.', answer: v,
              hints: ['Скорость — это сколько километров проходят за 1 час: путь : время.', `${num(s)} км за ${t} ${hours(t)}: ${num(s)} : ${t}.`], solution: `${num(s)} : ${t} = ${v} км/ч.`, w: s * t },
            t: { story: `${M.who} движется со скоростью ${v} км/ч. Ему нужно преодолеть ${num(s)} км.`, question: 'Сколько часов займёт путь?', answer: t,
              hints: ['Время = путь : скорость.', `Каждый час — по ${v} км. Сколько раз по ${v} помещается в ${num(s)}? ${num(s)} : ${v}.`], solution: `${num(s)} : ${v} = ${t} ${hours(t)}.`, w: s * v },
          }[kind];
          const showFig = lv === 1 || Math.random() < 0.4;
          return {
            story: ST.story, question: ST.question,
            figure: showFig ? { type: 'road5d', kind: 'one', v: [kind === 'v' ? '? км/ч' : `${v} км/ч`], s: kind === 's' ? '? км' : `${num(s)} км`, t: `время: ${kind === 't' ? '?' : `${t} ч`}` } : undefined,
            answer: ans(ST.answer), hints: ST.hints, solution: ST.solution,
            wrongs: wr(ST.answer, { 'formula-mix': ST.w }),
            data: { kind: 'svt', find: kind, s, v, t },
          };
        }

        if (kind === 'units') {
          const sub = pick(['a', 'b', 'c']);
          if (sub === 'a') {   // км/ч и минуты → км
            const m = pick([10, 12, 15, 20, 30, 40, 45]), g = gcd(m, 60), A = m / g, Bd = 60 / g;
            let M, lo, hi;
            do { M = pick(MOVERS); lo = Math.ceil(M.v[0] / Bd); hi = Math.floor(M.v[1] / Bd); } while (lo > hi);
            const v = Bd * rnd(lo, hi), s = (v / Bd) * A;
            return {
              story: `${M.who} ${M.past} ${m} ${minut(m)} со скоростью ${v} км/ч.`, question: 'Какое расстояние он преодолел? Ответ в км.',
              answer: ans(s),
              hints: ['Скорость дана в километрах в час, а время — в минутах. Сначала переведи минуты в часы.', `${m} мин — это ${fr(A, Bd)} часа. Найди ${fr(A, Bd)} от ${v} км: ${v} : ${Bd}${A > 1 ? ` · ${A}` : ''}.`],
              solution: `${m} мин = ${fr(A, Bd)} ч; ${v} : ${Bd}${A > 1 ? ` · ${A}` : ''} = ${s} км.`,
              wrongs: wr(s, { 'units-mix': v * m }),
              data: { kind: 'units', sub, v, m },
            };
          }
          if (sub === 'b') {   // м/мин, минуты → км
            const who = pick([{ who: 'Пешеход', fut: 'пройдёт', v: [6, 9] }, { who: 'Лыжник', fut: 'пробежит', v: [15, 25] }]);
            let v, m;
            do { v = 10 * rnd(...who.v); m = rnd(5, 60); } while ((v * m) % 100 !== 0 || ((v * m) % 1000 === 0 && Math.random() < 0.7));
            const s = R((v * m) / 1000);
            return {
              story: `${who.who} движется со скоростью ${v} м/мин.`, question: `Сколько километров он ${who.fut} за ${m} ${minut(m)}?`,
              answer: ans(s),
              hints: ['Сначала найди путь в метрах, а потом переведи его в километры: 1 км = 1000 м.', `${v} · ${m} = ${num(v * m)} м. Сколько это километров?`],
              solution: `${v} · ${m} = ${num(v * m)} м = ${num(s)} км.`,
              wrongs: wr(s, { 'units-mix': v * m }),
              data: { kind: 'units', sub, v, m },
            };
          }
          // км и минуты → км/ч
          const m = pick([10, 12, 15, 20, 30]), Bd = 60 / m;
          let M, lo, hi;
          do { M = pick(MOVERS); lo = Math.ceil(M.v[0] / Bd); hi = Math.floor(M.v[1] / Bd); } while (lo > hi);
          const s = rnd(lo, hi), v = s * Bd;
          return {
            story: `${M.who} ${M.perf} ${s} км за ${m} минут.`, question: 'С какой скоростью он двигался? Ответ в км/ч.',
            answer: ans(v),
            hints: [`Скорость нужна в километрах в час, а время дано в минутах. Сколько раз по ${m} минут помещается в часе?`, `В часе ${Bd} ${pl(Bd, 'раз', 'раза', 'раз')} по ${m} минут. За час он пройдёт в ${Bd} ${pl(Bd, 'раз', 'раза', 'раз')} больше: ${s} · ${Bd}.`],
            solution: `60 : ${m} = ${Bd}; ${s} · ${Bd} = ${v} км/ч.`,
            wrongs: wr(v, { 'units-mix': R(s / m) }),
            data: { kind: 'units', sub, s, m },
          };
        }

        // два участника: навстречу, в противоположные стороны, в одну сторону
        const D = pick(DUO), t = rnd(...L3(lv, [2, 3], [2, 4], [2, 5]));
        let v1, v2;
        do { v1 = D.v(); v2 = D.v(); } while (v1 === v2);
        if (kind === 'same' && v1 < v2) [v1, v2] = [v2, v1];
        const sum = v1 + v2, diff = Math.abs(v1 - v2);
        const mode = kind === 'meet' ? (Math.random() < 0.5 ? 'meet-s' : 'meet-t') : kind;
        const vv = [`${v1} км/ч`, `${v2} км/ч`];
        let ST;
        if (mode === 'meet-s') {
          const s = sum * t;
          ST = { story: `Из ${D.from} навстречу друг другу одновременно ${D.go} ${D.two}. Скорость ${D.gen[0]} — ${v1} км/ч, ${D.gen[1]} — ${v2} км/ч. Они встретились через ${t} ${hours(t)}.`,
            question: `Какое расстояние между ${D.btw}? Ответ в км.`, answer: s,
            hints: ['Когда движутся навстречу, за каждый час они сближаются на сумму своих скоростей.', `Скорость сближения: ${v1} + ${v2} = ${sum} км/ч. Теперь умножь её на время.`],
            solution: `(${v1} + ${v2}) · ${t} = ${sum} · ${t} = ${num(s)} км.`, w: diff * t,
            figure: { type: 'road5d', kind: 'meet', v: vv, s: '? км', t: `встретились через ${t} ч` } };
        } else if (mode === 'meet-t') {
          const s = sum * t;
          ST = { story: `Расстояние между ${D.btw} — ${num(s)} км. Из них навстречу друг другу одновременно ${D.go} ${D.two}: ${D.one[0]} со скоростью ${v1} км/ч, ${D.one[1]} — ${v2} км/ч.`,
            question: 'Через сколько часов они встретятся?', answer: t,
            hints: ['Когда движутся навстречу, за каждый час расстояние между ними сокращается на сумму скоростей.', `Скорость сближения: ${v1} + ${v2} = ${sum} км/ч. Раздели на неё расстояние.`],
            solution: `${num(s)} : (${v1} + ${v2}) = ${num(s)} : ${sum} = ${t} ${hours(t)}.`, w: (s % diff === 0 ? s / diff : null),
            figure: { type: 'road5d', kind: 'meet', v: vv, s: `${num(s)} км`, t: 'через сколько часов встретятся?' } };
        } else if (mode === 'apart') {
          const s = sum * t;
          ST = { story: `Из ${D.fromOne} в противоположных направлениях одновременно ${D.go} ${D.two}. Скорость ${D.gen[0]} — ${v1} км/ч, ${D.gen[1]} — ${v2} км/ч.`,
            question: `Какое расстояние будет между ними через ${t} ${hours(t)}? Ответ в км.`, answer: s,
            hints: ['Когда движутся в противоположные стороны, за каждый час расстояние между ними растёт на сумму скоростей.', `Скорость удаления: ${v1} + ${v2} = ${sum} км/ч. Теперь умножь её на время.`],
            solution: `(${v1} + ${v2}) · ${t} = ${sum} · ${t} = ${num(s)} км.`, w: diff * t,
            figure: { type: 'road5d', kind: 'apart', v: vv, s: '? км', t: `через ${t} ч` } };
        } else {
          const s = diff * t;
          ST = { story: `Из ${D.fromOne} в одном направлении одновременно ${D.go} ${D.two}: ${D.one[0]} со скоростью ${v1} км/ч, ${D.one[1]} — ${v2} км/ч.`,
            question: `Какое расстояние будет между ними через ${t} ${hours(t)}? Ответ в км.`, answer: s,
            hints: ['Они движутся в одну сторону: за каждый час быстрый уходит вперёд на разницу скоростей.', `${v1} − ${v2} = ${diff} км/ч — на столько растёт расстояние за час. Умножь на время.`],
            solution: `(${v1} − ${v2}) · ${t} = ${diff} · ${t} = ${num(s)} км.`, w: sum * t,
            figure: { type: 'road5d', kind: 'same', v: vv, s: '? км', t: `через ${t} ч` } };
        }
        return {
          story: ST.story, question: ST.question, figure: lv < 3 || Math.random() < 0.5 ? ST.figure : undefined,
          answer: ans(ST.answer), hints: ST.hints, solution: ST.solution,
          wrongs: wr(ST.answer, { 'closing-minus': ST.w }),
          data: { kind: 'two', mode, v1, v2, t },
        };
      },
      verify(task) {
        const d = task.data, x = +task.answer;
        if (d.kind === 'svt') return d.s === d.v * d.t && x === { s: d.s, v: d.v, t: d.t }[d.find] && (d.find !== 's' || x === d.v * d.t);
        if (d.kind === 'units') {
          if (d.sub === 'a') return sc(x * 60, 3) === sc(d.v * d.m, 3);
          if (d.sub === 'b') return sc(x * 1000, 3) === d.v * d.m * 1000;
          return x * d.m === d.s * 60;
        }
        let dist = 0, h = 0;
        if (d.mode === 'meet-t') { const s = (d.v1 + d.v2) * d.t; while (dist < s) { dist += d.v1 + d.v2; h++; } return dist === s && x === h; }
        for (let i = 0; i < d.t; i++) dist += d.mode === 'same' ? d.v1 - d.v2 : d.v1 + d.v2;
        return x === dist;
      },
    },

    /* 9. t5-price ------------------------------------------------ */
    {
      id: 't5-price', strand: 'Текстовые задачи', short: 'Цена и стоимость',
      title: 'Цена, количество, стоимость',
      frp: ['Решение текстовых задач, содержащих зависимости, связывающие величины: цена, количество, стоимость', 'Решение текстовых задач арифметическим способом'],
      goal: 'Находить стоимость, цену и количество, считать сдачу и сравнивать покупки по цене одной штуки.',
      requires: ['f4-longdiv', 'd5-mult'],
      explain: {
        model: 'Ты покупаешь 3 тетради по 45 руб. и платишь купюрой 200 руб. Сначала узнаём стоимость всей покупки: 45 · 3 = 135 руб. Потом сдачу: 200 − 135 = 65 руб. Цена — сколько стоит одна вещь, стоимость — сколько стоят все купленные вещи вместе.',
        rule: '<ul class="rule-list"><li><b>Стоимость = цена · количество.</b></li><li><b>Цена = стоимость : количество</b>, <b>количество = стоимость : цена</b>.</li><li><b>Сдача</b> = сколько заплатили − стоимость <b>всей</b> покупки.</li><li><b>Где выгоднее</b> — сравнивай цену одной штуки (или 1 кг), а не сумму за всю упаковку.</li></ul>',
        examples: [
          { q: 'Купили 3 тетради по 45 руб. и заплатили 200 руб. Сколько сдачи?', choices: ['65 руб.', '155 руб.'], correct: 0, wrong: { 1: 'one-item' },
            steps: ['Стоимость покупки: 45 · 3 = 135 руб.', 'Сдача: 200 − 135 = 65 руб.'] },
          { q: 'За 4 одинаковых блокнота заплатили 360 руб. Сколько стоит один блокнот?', choices: ['90 руб.', '1440 руб.'], correct: 0, wrong: { 1: 'mult-div' },
            steps: ['Цена = стоимость : количество.', '360 : 4 = 90 руб. Проверка: 90 · 4 = 360.'] },
          { q: 'Карандаши: набор из 6 штук за 120 руб. и набор из 12 штук за 216 руб. Где один карандаш дешевле?', choices: ['В наборе из 12', 'В наборе из 6'], correct: 0, wrong: { 1: 'totals' },
            steps: ['Маленький набор: 120 : 6 = 20 руб. за карандаш.', 'Большой набор: 216 : 12 = 18 руб. за карандаш.', '18 < 20 — в большом наборе карандаш дешевле, хотя весь набор стоит дороже.'] },
        ],
      },
      mistakes: [
        { id: 'mult-div', title: 'Умножает, когда надо делить', kidName: 'Умножун',
          kidRule: 'ты перемножаешь стоимость и количество, чтобы найти цену одной вещи',
          say: 'Цена одной вещи не может быть больше, чем стоимость всей покупки. Подставь свой ответ: цена · количество должно дать стоимость.',
          fixIdea: 'Стоимость = цена · количество. Значит, цена = стоимость : количество, а количество = стоимость : цена.',
          explainOptions: ['Одна вещь стоит меньше, чем все вместе, — значит, нужно делить', 'Чтобы найти цену, стоимость умножают на количество', 'Цена и стоимость — одно и то же'],
          conflicts: [
            { text: 'За 4 блокнота заплатили 360 руб. По твоему правилу один блокнот стоит 360 · 4 = 1440 руб.', ask: 'Может один блокнот стоить дороже, чем четыре таких же вместе?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 360 * 4 > 360 && 90 * 4 === 360 },
          ],
          root: 'f4-table' },
        { id: 'one-item', title: 'Считает по цене одной вещи, забывая про количество', kidName: 'Одноштучник',
          kidRule: 'ты считаешь сдачу или стоимость по цене одной вещи, а количество не учитываешь',
          say: 'Платили за все вещи, а не за одну. Сначала найди стоимость всей покупки: цена · количество.',
          fixIdea: 'Сначала стоимость всей покупки (цена · количество), потом всё остальное — сдача, общая сумма.',
          explainOptions: ['Платят за все купленные вещи, поэтому цену умножают на количество', 'Сдачу всегда считают от цены одной вещи', 'Количество в такой задаче неважно'],
          conflicts: [
            { text: 'Купили 3 тетради по 45 руб. и заплатили 200 руб. По твоему правилу сдача 200 − 45 = 155 руб. Тогда за три тетради отдали всего 45 руб.', ask: 'Можно купить три тетради по 45 руб. за 45 руб.?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 200 - 155 === 45 && 3 * 45 > 45 },
          ] },
        { id: 'totals', title: 'Сравнивает общие суммы, а не цену одной штуки', kidName: 'Большой Чек',
          kidRule: 'ты думаешь: где сумма за упаковку меньше, там и дешевле, — не глядя, сколько штук внутри',
          say: 'В упаковках разное количество. Узнай, сколько стоит одна штука в каждой, и сравни.',
          fixIdea: 'Выгоднее там, где дешевле одна штука: раздели стоимость на количество в каждой упаковке.',
          explainOptions: ['В больших упаковках больше штук, поэтому сравнивают цену одной штуки', 'Где сумма меньше, там всегда дешевле', 'Дешевле там, где меньше штук'],
          conflicts: [
            { text: 'Набор из 6 карандашей — 120 руб., из 12 — 216 руб. По твоему правилу дешевле маленький набор. Но два маленьких набора — это те же 12 карандашей, только за 240 руб.', ask: '12 карандашей за 240 руб. — это дешевле, чем 12 карандашей за 216 руб.?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 2 * 120 > 216 } ,
          ] },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['change', 'price', 'qty'], ['change', 'price', 'qty', 'two', 'cheaper'], ['two', 'cheaper', 'kgprice', 'kgchange', 'change']));
        const cnt = () => rnd(...L3(lv, [2, 4], [2, 6], [3, 9]));

        if (kind === 'change') {
          const g = pick(GOODS), n = cnt(), p = priceOf(g), cost = n * p;
          const bills = [100, 200, 500, 1000, 2000, 5000].filter(b => b > cost), M = bills[Math.random() < 0.7 || bills.length < 2 ? 0 : 1];
          return {
            story: `Купили ${n} ${acc(g, n)} по ${p} руб. и заплатили купюрой ${M} руб.`, question: 'Сколько рублей сдачи должны дать?',
            answer: ans(M - cost),
            hints: ['Сначала найди стоимость всей покупки: цена · количество.', `${p} · ${n} = ${num(cost)} руб. Теперь вычти это из ${num(M)}.`],
            solution: `${p} · ${n} = ${num(cost)} руб.; ${num(M)} − ${num(cost)} = ${num(M - cost)} руб.`,
            wrongs: wr(M - cost, { 'one-item': M - p }),
            data: { kind: 'change', n, p, M },
          };
        }
        if (kind === 'price') {
          const g = pick(GOODS), n = cnt(), p = priceOf(g), C = n * p;
          return {
            story: `За ${n} ${acc(g, n)} заплатили ${num(C)} руб.`, question: `Сколько стоит ${g.one}? Ответ в рублях.`,
            answer: ans(p),
            hints: ['Цена одной вещи = стоимость : количество.', `Раздели стоимость на количество: ${num(C)} : ${n}.`],
            solution: `${num(C)} : ${n} = ${p} руб. Проверка: ${p} · ${n} = ${num(C)}.`,
            wrongs: wr(p, { 'mult-div': C * n }),
            data: { kind: 'price', n, C },
          };
        }
        if (kind === 'qty') {
          const g = pick(GOODS), n = cnt(), p = priceOf(g), C = n * p;
          return {
            story: `${cap(g.nom)} стоит ${p} руб. За несколько ${g.f[2]} заплатили ${num(C)} руб.`, question: `Сколько ${g.f[2]} купили?`,
            answer: ans(n),
            hints: ['Количество = стоимость : цена.', `Сколько раз по ${p} руб. помещается в ${num(C)} руб.? ${num(C)} : ${p}.`],
            solution: `${num(C)} : ${p} = ${n}.`,
            wrongs: wr(n, { 'mult-div': C * p }),
            data: { kind: 'qty', p, C },
          };
        }
        if (kind === 'two') {
          let g1, g2;
          do { g1 = pick(GOODS); g2 = pick(GOODS); } while (g1 === g2);
          const n1 = cnt(), n2 = cnt(), p1 = priceOf(g1), p2 = priceOf(g2), C = n1 * p1 + n2 * p2;
          return {
            story: `Купили ${n1} ${acc(g1, n1)} по ${p1} руб. и ${n2} ${acc(g2, n2)} по ${p2} руб.`, question: 'Сколько стоит вся покупка? Ответ в рублях.',
            answer: ans(C),
            hints: ['Найди стоимость каждой части покупки отдельно: цена · количество.', `${p1} · ${n1} = ${num(n1 * p1)} руб., ${p2} · ${n2} = ${num(n2 * p2)} руб. Сложи.`],
            solution: `${p1} · ${n1} + ${p2} · ${n2} = ${num(n1 * p1)} + ${num(n2 * p2)} = ${num(C)} руб.`,
            wrongs: wr(C, { 'one-item': p1 + p2 }),
            data: { kind: 'two', items: [[n1, p1], [n2, p2]] },
          };
        }
        if (kind === 'cheaper') {
          const S = pick([
            { what: 'Карандаши', pack: 'набор', Pack: 'Набор', of: 'карандашей', q: 'Где один карандаш дешевле?', sizes: [[6, 12], [6, 18], [12, 24], [10, 24]], u: [10, 30] },
            { what: 'Яйца', pack: 'упаковка', Pack: 'Упаковка', of: 'яиц', q: 'Где одно яйцо дешевле?', sizes: [[6, 10], [10, 20], [6, 12], [10, 30]], u: [8, 15] },
            { what: 'Тетради', pack: 'пачка', Pack: 'Пачка', of: 'тетрадей', q: 'Где одна тетрадь дешевле?', sizes: [[5, 10], [5, 20], [10, 20], [4, 12]], u: [20, 40] },
          ]);
          const [n1, n2] = pick(S.sizes), equal = Math.random() < 0.15;
          let u1, u2;
          do { u1 = rnd(S.u[0] + 1, S.u[1]); u2 = equal ? u1 : rnd(S.u[0], u1 - 1); } while (n2 * u2 <= n1 * u1);
          const c1 = n1 * u1, c2 = n2 * u2, ch = [`${S.Pack} из ${n1}`, `${S.Pack} из ${n2}`, 'Одинаково'];
          const answer = u1 === u2 ? ch[2] : u1 > u2 ? ch[1] : ch[0];
          return {
            story: `${S.what} продают двумя способами: ${S.pack} из ${n1} ${S.of} за ${num(c1)} руб. и ${S.pack} из ${n2} ${S.of} за ${num(c2)} руб.`, question: S.q,
            accept: 'choice', choices: ch, answer,
            hints: ['Сравнивать надо цену одной штуки, а не сумму за всю упаковку.', `${num(c1)} : ${n1} = ? и ${num(c2)} : ${n2} = ? Сравни результаты.`],
            solution: `${num(c1)} : ${n1} = ${u1} руб., ${num(c2)} : ${n2} = ${u2} руб. ${u1 === u2 ? 'Цена одной штуки одинаковая.' : `${u2} < ${u1}, значит, выгоднее ${S.pack} из ${n2}.`}`,
            wrongs: wc(answer, { totals: ch[0] }),
            data: { kind: 'cheaper', n1, c1, n2, c2, ch },
          };
        }
        // kgprice / kgchange: дробная масса
        const food = pick([{ gen: 'яблок', P: [8, 20] }, { gen: 'сыра', P: [40, 90] }, { gen: 'конфет', P: [30, 70] }, { gen: 'черешни', P: [30, 60] }]);
        const m = pick([0.5, 1.5, 2.5, 0.4, 0.6, 0.8, 1.2]), P = 10 * rnd(...food.P), C = R(P * m);
        if (kind === 'kgprice') {
          return {
            story: `За ${num(m)} кг ${food.gen} заплатили ${num(C)} руб.`, question: `Сколько стоит 1 кг ${food.gen}? Ответ в рублях.`,
            answer: ans(P),
            hints: ['Цена 1 кг = стоимость : масса.', `${num(C)} : ${num(m)} — сделай делитель целым: ${num(C * 10)} : ${num(m * 10)}.`],
            solution: `${num(C)} : ${num(m)} = ${num(C * 10)} : ${num(m * 10)} = ${P} руб.`,
            wrongs: wr(P, { 'mult-div': R(C * m) }),
            data: { kind: 'kgprice', m, C },
          };
        }
        const M = [100, 200, 500, 1000, 2000, 5000].find(b => b > C && b > P);
        return {
          story: `Купили ${num(m)} кг ${food.gen} по ${P} руб. за килограмм и заплатили ${num(M)} руб.`, question: 'Сколько рублей сдачи должны дать?',
          answer: ans(M - C),
          hints: ['Сначала найди стоимость покупки: цена 1 кг · масса.', `${P} · ${num(m)} = ${num(C)} руб. Теперь вычти это из ${num(M)}.`],
          solution: `${P} · ${num(m)} = ${num(C)} руб.; ${num(M)} − ${num(C)} = ${num(M - C)} руб.`,
          wrongs: wr(M - C, { 'one-item': M - P }),
          data: { kind: 'kgchange', m, P, M },
        };
      },
      verify(t) {
        const d = t.data, x = t.answer;
        if (d.kind === 'change') { let c = 0; for (let i = 0; i < d.n; i++) c += d.p; return +x + c === d.M; }
        if (d.kind === 'price') return +x * d.n === d.C;
        if (d.kind === 'qty') return +x * d.p === d.C;
        if (d.kind === 'two') return +x === d.items.reduce((s, [n, p]) => s + n * p, 0);
        if (d.kind === 'cheaper') { const l = d.c1 * d.n2, r = d.c2 * d.n1; return x === d.ch[l === r ? 2 : l > r ? 1 : 0]; }
        if (d.kind === 'kgprice') return sc(+x * d.m, 3) === sc(d.C, 3);
        return sc(+x + d.P * d.m, 3) === sc(d.M, 3);
      },
    },

    /* 10. t5-enum ------------------------------------------------ */
    {
      id: 't5-enum', strand: 'Текстовые задачи', short: 'Считаем варианты',
      title: 'Перебор вариантов',
      frp: ['Решение задач перебором всех возможных вариантов', 'Использование при решении задач таблиц и схем'],
      goal: 'Находить число вариантов перебором и правилом умножения, отличать пары, где порядок важен, от пар, где он неважен.',
      requires: ['f4-table'],
      explain: {
        model: 'У Маши 3 юбки и 2 кофты. Сколько разных нарядов? Возьмём первую юбку — к ней подходит любая из 2 кофт: 2 наряда. Со второй юбкой — ещё 2, с третьей — ещё 2. Всего 3 · 2 = 6 нарядов, а не 3 + 2 = 5. Чтобы ничего не пропустить и не посчитать дважды, перебирай варианты по порядку — таблицей или списком.',
        figure: { type: 'grid', rows: 3, cols: 2, r: 3, c: 2 },
        figureCaption: 'Строки — 3 юбки, столбцы — 2 кофты. Каждая клетка — один наряд: 3 · 2 = 6',
        rule: '<ul class="rule-list"><li><b>Правило умножения:</b> если первое можно выбрать a способами, а второе — b способами, то пару — a · b способами.</li><li><b>Порядок важен</b> (двузначные числа, староста и заместитель, 1-е и 2-е место): n · (n − 1). Числа 13 и 31 — разные.</li><li><b>Порядок неважен</b> (рукопожатия, партии «каждый с каждым»): n · (n − 1) : 2 — каждая пара в произведении посчитана дважды.</li><li>Если цифры <b>могут повторяться</b>, не забудь 11, 22, 33…</li></ul>',
        examples: [
          { q: 'Сколько двузначных чисел можно составить из цифр 1, 2, 3, если цифры в числе не повторяются?', choices: ['6', '3'], correct: 0, wrong: { 1: 'order-ignored' },
            steps: ['На 1 начинаются: 12, 13.', 'На 2: 21, 23. На 3: 31, 32.', 'Всего 6 чисел: 12 и 21 — разные числа.'] },
          { q: 'Встретились 4 друга, и каждый пожал руку каждому. Сколько было рукопожатий?', choices: ['6', '12'], correct: 0, wrong: { 1: 'double-count' },
            steps: ['Каждый пожал руки 3 другим: 4 · 3 = 12.', 'Но рукопожатие Ани с Борей — то же самое, что Бори с Аней: каждое посчитано дважды.', '12 : 2 = 6 рукопожатий.'] },
        ],
      },
      mistakes: [
        { id: 'add-mult', title: 'Складывает число вариантов вместо умножения', kidName: 'Складун',
          kidRule: 'ты складываешь число юбок и число кофт, хотя каждую юбку можно надеть с каждой кофтой',
          say: 'Возьми один вариант первого: с ним сочетается каждый вариант второго. И так с каждым.',
          fixIdea: 'Каждый вариант первого сочетается с каждым вариантом второго — число пар равно произведению.',
          explainOptions: ['С каждой из 3 юбок — по 2 кофты: 3 раза по 2', 'Нарядов столько, сколько всего вещей', 'Нужно сложить юбки и кофты и вычесть 1'],
          conflicts: [
            { text: '3 юбки и 2 кофты. По твоему правилу нарядов 3 + 2 = 5. Выпишем все: Ю1+К1, Ю1+К2, Ю2+К1, Ю2+К2, Ю3+К1, Ю3+К2.', ask: 'Сколько нарядов в этом списке?', choices: ['5', '6'], right: '6', verify: () => 3 * 2 === 6 && 3 + 2 === 5, figure: { type: 'grid', rows: 3, cols: 2, r: 3, c: 2 } },
          ],
          root: 'f4-table' },
        { id: 'double-count', title: 'Считает каждую пару дважды, когда порядок неважен', kidName: 'Двойник',
          kidRule: 'ты считаешь рукопожатие Ани с Борей и Бори с Аней как два разных',
          say: 'Пара «Аня — Боря» и «Боря — Аня» — одно рукопожатие (одна партия). Каждая пара у тебя посчитана два раза.',
          fixIdea: 'Когда порядок неважен, раздели n · (n − 1) на 2: каждая пара попала в счёт дважды.',
          explainOptions: ['Рукопожатие Ани с Борей и Бори с Аней — одно и то же', 'Каждое рукопожатие считают дважды — за каждого участника', 'Рукопожатий столько же, сколько людей'],
          conflicts: [
            { text: 'Встретились двое: Аня и Боря. По твоему правилу рукопожатий 2 · 1 = 2.', ask: 'Сколько раз пожмут друг другу руки два человека?', choices: ['1', '2'], right: '1', verify: () => (2 * 1) / 2 === 1 },
          ] },
        { id: 'order-ignored', title: 'Не учитывает порядок, когда он важен', kidName: 'Без Порядка',
          kidRule: 'ты считаешь числа 13 и 31 одним вариантом, хотя это разные числа',
          say: 'Здесь порядок важен: 13 и 31 — разные числа, староста и заместитель — разные должности.',
          fixIdea: 'Если от перестановки получается другой вариант, считай оба: n · (n − 1).',
          explainOptions: ['13 и 31 — разные числа, поэтому это два варианта', '13 и 31 — одно и то же, ведь цифры те же', 'Порядок никогда не важен'],
          conflicts: [
            { text: 'Цифры 1 и 3, без повторов. По твоему правилу двузначное число из них только одно. Но можно написать и 13, и 31.', ask: '13 и 31 — одно и то же число?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 13 !== 31 },
          ],
          root: 'n5-place' },
        { id: 'missed-same', title: 'Забывает варианты с одинаковыми цифрами, когда повторять можно', kidName: 'Забывайка',
          kidRule: 'ты забываешь числа вроде 11 и 22, хотя цифры по условию могут повторяться',
          say: 'Цифры могут повторяться — значит, подходят и 11, 22, 33. Проверь, не пропустил ли ты их.',
          fixIdea: 'Если повторять можно, на второе место годится любая цифра, даже та же самая: n · n вариантов.',
          explainOptions: ['Когда повторять можно, 11 и 22 тоже считаются', 'Числа с одинаковыми цифрами не считаются', 'Цифры повторять нельзя никогда'],
          conflicts: [
            { text: 'Цифры 1 и 2, повторять можно. По твоему правилу чисел два: 12 и 21. А ещё есть 11 и 22.', ask: 'Сколько всего таких чисел?', choices: ['2', '4'], right: '4', verify: () => 2 * 2 === 4 },
          ] },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['outfit', 'outfit', 'games', 'ordered'], ['outfit', 'games', 'ordered', 'repeat'], ['outfit3', 'games', 'ordered', 'repeat']));
        const someDigits = n => shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, n).sort((p, q) => p - q);

        if (kind === 'outfit') {
          const a = rnd(2, L3(lv, 4, 6, 6)), b = rnd(2, L3(lv, 4, 6, 6)), x = a * b;
          const ST = pick([
            { story: `У Маши ${a} ${pl(a, 'юбка', 'юбки', 'юбок')} и ${b} ${pl(b, 'кофта', 'кофты', 'кофт')}.`, question: 'Сколько разных нарядов «юбка + кофта» она может составить?' },
            { story: `В столовой на выбор ${a} ${pl(a, 'суп', 'супа', 'супов')} и ${b} ${pl(b, 'второе блюдо', 'вторых блюда', 'вторых блюд')}.`, question: 'Сколькими способами можно выбрать обед из супа и второго?' },
            { story: `Из города А в город Б ведут ${a} ${pl(a, 'дорога', 'дороги', 'дорог')}, а из Б в В — ${b} ${pl(b, 'дорога', 'дороги', 'дорог')}.`, question: 'Сколькими путями можно добраться из А в В через Б?' },
            { story: `В кафе ${a} ${pl(a, 'вид', 'вида', 'видов')} мороженого и ${b} ${pl(b, 'сироп', 'сиропа', 'сиропов')}.`, question: 'Сколько разных порций «мороженое + сироп» можно заказать?' },
          ]);
          return Object.assign(ST, {
            answer: ans(x),
            hints: ['Возьми один вариант первого — с ним можно соединить любой вариант второго. Сколько пар получится с ним одним?', `С каждым из ${a} вариантов — по ${b} ${pl(b, 'пара', 'пары', 'пар')}: ${a} · ${b}.`],
            solution: `${a} · ${b} = ${x}.`,
            wrongs: wr(x, { 'add-mult': a + b }),
            data: { kind: 'prod', f: [a, b] },
          });
        }
        if (kind === 'outfit3') {
          const a = rnd(2, 4), b = rnd(2, 4), c = rnd(2, 3), x = a * b * c;
          const ST = pick([
            { story: `К обеду можно выбрать ${a} ${pl(a, 'салат', 'салата', 'салатов')}, ${b} ${pl(b, 'суп', 'супа', 'супов')} и ${c} ${pl(c, 'напиток', 'напитка', 'напитков')}.`, question: 'Сколько разных обедов «салат + суп + напиток» можно составить?' },
            { story: `У Оли ${a} ${pl(a, 'шапка', 'шапки', 'шапок')}, ${b} ${pl(b, 'шарф', 'шарфа', 'шарфов')} и ${c} ${pl(c, 'пара варежек', 'пары варежек', 'пар варежек')}.`, question: 'Сколькими способами она может выбрать комплект «шапка + шарф + варежки»?' },
          ]);
          return Object.assign(ST, {
            answer: ans(x),
            hints: ['Сначала посчитай пары из первых двух, а потом каждую пару соедини с каждым вариантом третьего.', `${a} · ${b} = ${a * b} ${pl(a * b, 'пара', 'пары', 'пар')}, и каждую — с любым из ${c} вариантов: ${a * b} · ${c}.`],
            solution: `${a} · ${b} · ${c} = ${x}.`,
            wrongs: wr(x, { 'add-mult': a + b + c }),
            data: { kind: 'prod', f: [a, b, c] },
          });
        }
        if (kind === 'games') {
          const n = rnd(...L3(lv, [3, 4], [4, 6], [5, 8])), x = (n * (n - 1)) / 2, seq = Array.from({ length: n - 1 }, (_, i) => n - 1 - i);
          const ST = pick([
            { story: `В шахматном турнире ${n} ${pl(n, 'участник', 'участника', 'участников')}. Каждый сыграл с каждым по одной партии.`, question: 'Сколько всего партий было сыграно?' },
            { story: `Встретились ${n} ${pl(n, 'друг', 'друга', 'друзей')}, и каждый пожал руку каждому.`, question: 'Сколько всего было рукопожатий?' },
            { story: `На столе ${n} ${pl(n, 'разное яблоко', 'разных яблока', 'разных яблок')}.`, question: 'Сколькими способами можно выбрать из них два яблока?' },
          ]);
          return Object.assign(ST, {
            answer: ans(x),
            hints: ['Выписывай пары по порядку: первого — с каждым, потом второго — с теми, с кем он ещё не в паре, и так далее.', `Получится ${seq.join(' + ')}. Или ${n} · ${n - 1} : 2 — в произведении каждая пара посчитана дважды.`],
            solution: `${seq.join(' + ')} = ${x}. Или ${n} · ${n - 1} : 2 = ${x}.`,
            wrongs: wr(x, { 'double-count': n * (n - 1) }),
            data: { kind: 'pairs', n, ordered: false },
          });
        }
        if (kind === 'ordered') {
          const n = rnd(...L3(lv, [3, 3], [3, 5], [4, 6])), x = n * (n - 1), dg = someDigits(n), ds = listRu(dg);
          const ST = pick([
            { story: `Есть цифры ${ds}.`, question: 'Сколько разных двузначных чисел можно из них составить, если цифры в числе не повторяются?', why: `${dg[0]}${dg[1]} и ${dg[1]}${dg[0]} — разные числа`, first: 'первой цифры', second: 'второй' },
            { story: `В кружке ${n} ${pl(n, 'человек', 'человека', 'человек')}.`, question: 'Сколькими способами можно выбрать старосту и его заместителя?', why: 'староста и заместитель — разные должности', first: 'старосты', second: 'заместителя' },
            { story: `Флаг шьют из двух горизонтальных полос разного цвета. Есть ткань ${n} цветов.`, question: 'Сколько разных флагов можно сшить?', why: 'флаг «красный сверху, синий снизу» и «синий сверху, красный снизу» — разные', first: 'верхней полосы', second: 'нижней' },
            { story: `В забеге участвуют ${n} ${pl(n, 'бегун', 'бегуна', 'бегунов')}.`, question: 'Сколькими способами могут распределиться первое и второе места?', why: 'первое и второе место — не одно и то же', first: 'первого места', second: 'второго' },
          ]);
          return {
            story: ST.story, question: ST.question, answer: ans(x),
            hints: [`Здесь порядок важен: ${ST.why}. Сколько вариантов для ${ST.first}?`, `Для ${ST.first} — ${n} ${pl(n, 'вариант', 'варианта', 'вариантов')}, для ${ST.second} — любой из оставшихся ${n - 1}. Всего ${n} · ${n - 1}.`],
            solution: `${n} · ${n - 1} = ${x}.`,
            wrongs: wr(x, { 'order-ignored': x / 2 }),
            data: { kind: 'pairs', n, ordered: true },
          };
        }
        // repeat
        const n = rnd(2, L3(lv, 3, 4, 5)), x = n * n, dg = someDigits(n), ds = listRu(dg);
        const ST = pick([
          { story: `Есть цифры ${ds}.`, question: 'Сколько разных двузначных чисел можно из них составить, если цифры в числе могут повторяться?', what: 'числа' },
          { story: `Код замка состоит из двух цифр. Каждая из них может быть любой из цифр ${ds}, и цифры могут повторяться.`, question: 'Сколько разных кодов можно набрать?', what: 'коды' },
        ]);
        return Object.assign(ST, {
          answer: ans(x),
          hints: [`Цифры могут повторяться — значит, подходят и ${ST.what} вроде ${dg[0]}${dg[0]} и ${dg[1]}${dg[1]}. Сколько вариантов для первой цифры? А для второй?`, `Первая цифра — любая из ${n}, вторая — тоже любая из ${n}: ${n} · ${n}.`],
          solution: `${n} · ${n} = ${x}.`,
          wrongs: wr(x, { 'missed-same': n * (n - 1) }),
          data: { kind: 'rep', n },
        });
      },
      verify(t) {
        const d = t.data, x = +t.answer;
        let c = 0;
        if (d.kind === 'prod') { const go = (i) => { if (i === d.f.length) { c++; return; } for (let j = 0; j < d.f[i]; j++) go(i + 1); }; go(0); return x === c; }
        for (let i = 0; i < d.n; i++) for (let j = 0; j < d.n; j++) {
          if (d.kind === 'rep') c++;
          else if (d.ordered ? i !== j : i < j) c++;
        }
        return x === c;
      },
    },
  ];

  K.course({ id: 'm5d', grade: 5, title: 'Десятичные дроби и задачи, 5 класс', topics });
})();
