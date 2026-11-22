/* =========================================================
   Курс m6b: положительные и отрицательные числа, координатная плоскость,
   буквенные выражения, диаграммы и прикидка (6 класс).
   Опора: ФРП «Математика. 5–9 классы (базовый уровень)», 6 класс:
     «Положительные и отрицательные числа» — целые числа, модуль, сравнение,
       действия с положительными и отрицательными числами, координатная плоскость;
     «Буквенные выражения» — числовые подстановки, формулы, свойства действий
       (раскрытие скобок, подобные слагаемые);
     «Решение текстовых задач» — чтение столбчатых и круговых диаграмм,
       оценка и прикидка, округление результата.
   Ошибки — классические, описанные в методике (−8 > −3 «потому что 8 больше»,
   |−5| = −5, −7 + 3 = −10, 5 − (−2) = 3, минус на минус — минус, 3a = 34 при a = 4,
   −(a − 3) = −a − 3, 2a + 3b = 5ab, путаница абсциссы и ординаты, доля вместо
   количества на круговой диаграмме, «умножение всегда увеличивает»).
   Формат — docs/content-spec.md. Тексты — черновик на вычитку методисту.
   ========================================================= */
(function () {
  'use strict';
  const K = window.VEKTOR_KIT, { rnd, pick, shuffle, L3, pl, gcd, lcm, round, num, ans, fr, sign } = K.h;
  const V = window.VEKTOR_VISUALS;

  /* ---------- Общие помощники ---------- */
  const eq = (a, b) => Math.abs(a - b) < 1e-9;
  const R = x => round(x, 6);
  const sg = () => (Math.random() < 0.5 ? -1 : 1);
  // склонение и для дробных чисел: «4,5 очка»
  const plx = (k, one, few, many) => (Number.isInteger(k) ? pl(k, one, few, many) : few);
  const nw = (k, w) => `${num(k)} ${plx(k, w[0], w[1], w[2])}`;
  const WD = {
    point: ['очко', 'очка', 'очков'], hour: ['час', 'часа', 'часов'], deg: ['градус', 'градуса', 'градусов'],
    transfer: ['перевод', 'перевода', 'переводов'], sticker: ['наклейку', 'наклейки', 'наклеек'], book: ['книгу', 'книги', 'книг'],
    portion: ['порцию', 'порции', 'порций'], kg: ['килограмм', 'килограмма', 'килограммов'], person: ['человек', 'человека', 'человек'],
  };
  // wrongs: только правдоподобные числа (до 2 знаков после запятой) и не совпадающие с ответом
  function W(answer, obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      if (typeof v === 'string') { if (v !== answer) out[k] = v; continue; }
      if (!Number.isFinite(v) || Math.abs(round(v, 2) - v) > 1e-9 || Math.abs(v) > 1e5) continue;
      if (eq(v, +answer)) continue;
      out[k] = ans(v);
    }
    return out;
  }
  // n разных чисел
  function distinct(n, gen) { const s = new Set(); let t = 0; while (s.size < n && t++ < 500) s.add(gen()); return [...s]; }
  // варианты ответа: верный + неверные, без повторов, перемешаны
  const opts = (right, others) => shuffle([right, ...[...new Set(others)].filter(x => x != null && x !== right)].slice(0, 4));
  // дроби: [числитель, знаменатель] в несократимом виде
  const F = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return [n / g, d / g]; };
  const fadd = (a, b) => F(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
  const fstr = f => (f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`);
  const fhtml = f => (f[1] === 1 ? num(f[0]) : (f[0] < 0 ? '−' : '') + fr(Math.abs(f[0]), f[1]));
  const fsigned = f => (f[0] < 0 ? `(${fhtml(f)})` : fhtml(f));
  const parse = s => { const p = window.VEKTOR_CHECK && window.VEKTOR_CHECK.parse(String(s)); return p ? p.v : NaN; };
  // знаков после запятой
  const places = x => { const s = String(R(Math.abs(x))); return s.includes('.') ? s.split('.')[1].length : 0; };

  /* ---------- Рисунки курса ---------- */
  if (V && V.register) {
    const esc = V.esc || (s => String(s));
    const T = (x, y, s, anchor = 'middle', extra = '') => `<text x="${round(x, 1)}" y="${round(y, 1)}" text-anchor="${anchor}" fill="currentColor" stroke="none" font-size="13"${extra}>${esc(s)}</text>`;
    const reg = (type, def) => { try { V.register(type, def); } catch (e) { /* уже зарегистрирован */ } };

    // Координатная прямая с целыми делениями, точками и «шагами»-дугами: { min, max, points: [{ x, label }], jumps: [{ from, to, label }] }
    reg('zline6', {
      describe: f => `координатная прямая от ${num(f.min)} до ${num(f.max)}` + (f.points || []).map(p => `, точка ${p.label ? p.label + ' ' : ''}${num(p.x)}`).join('') + (f.jumps || []).map(j => `, шаг от ${num(j.from)} до ${num(j.to)}`).join(''),
      render(f) {
        const min = f.min, max = f.max, pts = f.points || [], jumps = f.jumps || [];
        if (!Number.isInteger(min) || !Number.isInteger(max) || max - min < 4 || max - min > 30) return '';
        const inside = v => Number.isFinite(v) && v >= min && v <= max;
        if (pts.some(p => !inside(p.x)) || jumps.some(j => !inside(j.from) || !inside(j.to) || j.from === j.to)) return '';
        const top = jumps.length ? 50 : 24, y = top + 20, H = y + 34, range = max - min;
        const X = v => 18 + (v - min) * 264 / range, lab = range <= 14 ? 1 : range <= 24 ? 2 : 5;
        let s = `<line x1="8" y1="${y}" x2="292" y2="${y}"/><path d="M294 ${y}l-9 -4.5v9z" fill="currentColor"/>`;
        for (let k = min; k <= max; k++) {
          const z = k === 0;
          s += `<line x1="${round(X(k), 1)}" y1="${y - (z ? 8 : 5)}" x2="${round(X(k), 1)}" y2="${y + (z ? 8 : 5)}"${z ? ' stroke-width="2.5"' : ''}/>`;
          if (k % lab === 0 || z) s += T(X(k), y + 24, num(k), 'middle', z ? ' font-weight="700"' : '');
        }
        for (const j of jumps) {
          const a = X(j.from), b = X(j.to), m = (a + b) / 2, h = 28, y0 = y - 6, cy = y0 - 2 * h;
          // касательная в конце дуги — для стрелки
          const dx = b - m, dy = y0 - cy, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
          const p1 = [b - 9 * ux + 5 * uy, y0 - 9 * uy - 5 * ux], p2 = [b - 9 * ux - 5 * uy, y0 - 9 * uy + 5 * ux];
          s += `<g stroke="var(--green,currentColor)" stroke-width="2.5"><path d="M${round(a, 1)} ${y0}Q${round(m, 1)} ${cy} ${round(b, 1)} ${y0}"/><path d="M${round(p1[0], 1)} ${round(p1[1], 1)}L${round(b, 1)} ${y0}L${round(p2[0], 1)} ${round(p2[1], 1)}"/></g>`;
          if (j.label) s += T(m, y0 - h - 6, j.label, 'middle', ' font-weight="700"');
        }
        for (const p of pts) {
          s += `<circle cx="${round(X(p.x), 1)}" cy="${y}" r="5" fill="currentColor"/>`;
          if (p.label && !jumps.length) s += T(X(p.x), y - 12, p.label, 'middle', ' font-weight="700"');
        }
        return V.svgWrap(300, H, this.describe(f), `<g fill="none" stroke="currentColor" stroke-width="2">${s}</g>`);
      },
    });

    // Столбчатая диаграмма с сеткой по цене деления: { items: [{ label, v }], step, unit }
    reg('bars6', {
      describe: f => `столбчатая диаграмма${f.unit ? ' (' + f.unit + ')' : ''}: ` + (f.items || []).map(i => `${i.label} — ${num(i.v)}`).join(', ') + `; одна клетка шкалы — ${num(f.step)}`,
      render(f) {
        const it = f.items, step = f.step;
        if (!Array.isArray(it) || it.length < 2 || it.length > 7 || !(step > 0)) return '';
        if (it.some(i => !Number.isFinite(i.v) || i.v < 0 || i.v > 1e6)) return '';
        const n = Math.max(1, Math.ceil(Math.max(...it.map(i => i.v)) / step));
        if (n > 12) return '';
        const x0 = 50, x1 = 292, yb = 186, yt = 24, u = (yb - yt) / n, w = (x1 - x0) / it.length, bw = Math.min(40, w * 0.6);
        let s = '';
        for (let k = 0; k <= n; k++) {
          const yy = yb - k * u;
          s += `<line x1="${x0}" y1="${round(yy, 1)}" x2="${x1}" y2="${round(yy, 1)}" opacity="${k ? 0.25 : 1}" stroke-width="${k ? 1 : 2}"/>` + T(x0 - 7, yy + 4, num(k * step), 'end');
        }
        s += `<line x1="${x0}" y1="${yb}" x2="${x0}" y2="${yt - 6}"/>`;
        if (f.unit) s += T(x0 - 7, 12, f.unit, 'end');
        it.forEach((i, k) => {
          const cx = x0 + w * (k + 0.5), hgt = i.v / step * u;
          if (hgt > 0) s += `<rect x="${round(cx - bw / 2, 1)}" y="${round(yb - hgt, 1)}" width="${round(bw, 1)}" height="${round(hgt, 1)}" fill="currentColor" fill-opacity=".22"/>`;
          s += T(cx, yb + 19, i.label);
        });
        return V.svgWrap(300, 212, this.describe(f), `<g fill="none" stroke="currentColor" stroke-width="2">${s}</g>`);
      },
    });

    // Круговая диаграмма с подписями процентов и легендой: { items: [{ label, p }] }, сумма p = 100
    reg('pie6', {
      describe: f => 'круговая диаграмма: ' + (f.items || []).map(i => `${i.label} — ${num(i.p)} %`).join(', '),
      render(f) {
        const it = f.items;
        if (!Array.isArray(it) || it.length < 2 || it.length > 6) return '';
        if (it.some(i => !Number.isFinite(i.p) || i.p <= 0) || !eq(it.reduce((s, i) => s + i.p, 0), 100)) return '';
        const OP = [0.05, 0.28, 0.5, 0.16, 0.38, 0.62], cx = 84, cy = 86, r = 74;
        let s = '', a = -Math.PI / 2;
        const P = t => `${round(cx + r * Math.cos(t), 1)},${round(cy + r * Math.sin(t), 1)}`;
        it.forEach((i, k) => {
          const b = a + i.p / 100 * 2 * Math.PI, mid = (a + b) / 2;
          s += `<path d="M${cx},${cy} L${P(a)} A${r},${r} 0 ${i.p > 50 ? 1 : 0} 1 ${P(b)} Z" fill="currentColor" fill-opacity="${OP[k]}"/>`;
          const rr = i.p < 15 ? 0.72 : 0.6;
          if (i.p >= 8) s += T(cx + r * rr * Math.cos(mid), cy + r * rr * Math.sin(mid) + 4, `${num(i.p)} %`, 'middle', ' font-weight="700"');
          a = b;
        });
        const y0 = cy - it.length * 13 + 13;
        it.forEach((i, k) => {
          const yy = y0 + k * 26;
          s += `<rect x="172" y="${yy - 10}" width="14" height="14" fill="currentColor" fill-opacity="${OP[k]}" stroke-width="1.5"/>` + T(192, yy + 2, `${i.label} ${num(i.p)} %`, 'start');
        });
        return V.svgWrap(300, 172, this.describe(f), `<g fill="none" stroke="currentColor" stroke-width="2">${s}</g>`);
      },
    });
  }
  const LINE = (min, max, points, jumps) => ({ type: 'zline6', min, max, points: points || [], jumps: jumps || [] });

  /* =========================================================
     1. z6-integers — сравнение, модуль, противоположные числа
     ========================================================= */
  const CITIES = [['Мурманск', 'Мурманске'], ['Норильск', 'Норильске'], ['Якутск', 'Якутске'], ['Воркута', 'Воркуте'], ['Анадырь', 'Анадыре'], ['Салехард', 'Салехарде'], ['Сургут', 'Сургуте'], ['Тикси', 'Тикси']];
  const negs = (n, lv) => distinct(n, () => L3(lv, -rnd(1, 9), -rnd(2, 60), -rnd(11, 99) / 10));

  const integers = {
    id: 'z6-integers', strand: 'Положительные и отрицательные числа', short: 'Знак и модуль',
    title: 'Положительные и отрицательные числа, модуль',
    frp: ['Положительные и отрицательные числа. Целые числа', 'Модуль числа, геометрическая интерпретация модуля числа', 'Изображение чисел на координатной прямой. Сравнение чисел'],
    goal: 'Сравнивать положительные и отрицательные числа, находить модуль числа и число, противоположное данному.',
    requires: ['n5-place'],
    explain: {
      model: 'Утром за окном было −8°, а днём −3°. Когда теплее? Днём: столбик термометра поднялся. Термометр — это та же координатная прямая, только стоит вертикально: чем выше (на прямой — правее) число, тем оно больше. Поэтому −3 > −8, хотя 8 больше 3.',
      figure: LINE(-10, 2, [{ x: -8, label: 'утро' }, { x: -3, label: 'день' }]),
      figureCaption: '−3 правее, чем −8, значит, −3 больше: днём теплее',
      rule: '<ul class="rule-list"><li><b>Больше то число, которое на координатной прямой правее.</b> Любое положительное число больше нуля, а ноль больше любого отрицательного.</li><li>Из двух отрицательных больше то, <b>у которого модуль меньше</b>: −3 > −8, потому что 3 меньше 8.</li><li><b>Модуль</b> |a| — расстояние от числа до нуля. Расстояние не бывает отрицательным: |−5| = 5, |5| = 5, |0| = 0.</li><li><b>Противоположные числа</b> отличаются только знаком: 7 и −7. Минус перед числом даёт противоположное число: −(−7) = 7.</li></ul>',
      examples: [
        { q: 'Что больше: −12 или −5?', fig: LINE(-13, 1, [{ x: -12, label: '−12' }, { x: -5, label: '−5' }]), choices: ['−5', '−12'], correct: 0, wrong: { 1: 'neg-compare-by-abs' },
          steps: ['Отметь оба числа на прямой: −12 левее, −5 правее.', 'Правее — значит больше. Ответ: −5 > −12.'] },
        { q: 'Водолаз опустился на отметку −14 м. На сколько метров он ниже поверхности воды?', choices: ['14 м', '−14 м'], correct: 0, wrong: { 1: 'abs-keeps-sign' },
          steps: ['Поверхность воды — это отметка 0. Расстояние от −14 до 0 — это модуль: |−14| = 14.', 'Расстояние не бывает отрицательным. Ответ: на 14 м.'] },
        { q: 'Чему равно −(−9)?', choices: ['9', '−9'], correct: 0, wrong: { 1: 'opposite-stays-neg' },
          steps: ['−(−9) — это число, противоположное числу −9.', 'Противоположное к −9 стоит на таком же расстоянии от нуля, но по другую сторону: это 9.'] },
      ],
    },
    mistakes: [
      { id: 'neg-compare-by-abs', title: 'Сравнивает отрицательные числа по модулю', kidName: 'Большой минус',
        kidRule: 'ты сравниваешь отрицательные числа как обычные: −8 > −3, «потому что 8 больше 3»',
        say: 'Из двух отрицательных чисел больше то, которое ближе к нулю: на прямой оно правее. Вспомни термометр: −3° теплее, чем −8°.',
        fixIdea: 'Больше то число, которое на прямой правее. У отрицательных правее то, у которого модуль меньше.',
        explainOptions: ['Правее на прямой — больше, поэтому −3 > −8', 'Сравниваем без минусов: 8 > 3, значит, −8 > −3', 'Отрицательные числа сравнивать нельзя'],
        conflicts: [{ text: 'Утром было −8°, днём −3°. По твоему правилу −8 > −3, значит, утром было теплее. Но при −8° на улице холоднее, чем при −3°!', ask: 'Какая температура выше?', choices: ['−3°', '−8°'], right: '−3°', verify: () => -3 > -8, figure: LINE(-10, 2, [{ x: -8, label: '−8' }, { x: -3, label: '−3' }]) }],
        root: 'n5-place' },
      { id: 'abs-keeps-sign', title: 'Оставляет модуль отрицательного числа отрицательным', kidName: 'Липкий минус',
        kidRule: 'ты снимаешь только палочки модуля, а минус оставляешь: |−5| = −5',
        say: 'Модуль — это расстояние от числа до нуля, а расстояние не бывает отрицательным.',
        fixIdea: 'Модуль — расстояние от числа до нуля, поэтому он всегда положительный или равен нулю.',
        explainOptions: ['|−5| = 5: от −5 до нуля 5 шагов', '|−5| = −5: палочки убираем, число остаётся как было', '|−5| = −5, потому что модуль меняет только положительные числа'],
        conflicts: [{ text: 'Точка стоит на −5. По твоему правилу |−5| = −5, то есть от неё до нуля «минус пять шагов». Посчитай по прямой: от −5 до 0 ровно 5 шагов.', ask: 'Сколько шагов от −5 до 0?', choices: ['5', '−5'], right: '5', verify: () => Math.abs(-5) === 5, figure: LINE(-6, 2, [{ x: -5, label: '−5' }]) }] },
      { id: 'opposite-stays-neg', title: 'Считает, что число с минусом впереди всегда отрицательное: −(−7) = −7', kidName: 'Вечный минус',
        kidRule: 'ты думаешь, что минус перед числом всегда делает его отрицательным: −(−7) = −7',
        say: 'Минус перед числом даёт противоположное число. Противоположное к отрицательному — положительное.',
        fixIdea: 'Минус перед числом — это «перепрыгнуть на другую сторону от нуля». Два раза перепрыгнуть — вернуться обратно.',
        explainOptions: ['−(−7) = 7: противоположное к −7 стоит по другую сторону от нуля', '−(−7) = −7: два минуса — всё равно минус', '−(−7) = 0: минусы уничтожают друг друга'],
        conflicts: [{ text: 'Число, противоположное 7, — это −7. А какое число противоположно −7? По твоему правилу −(−7) = −7, то есть −7 противоположно самому себе. Но противоположные числа стоят по разные стороны от нуля!', ask: 'Какое число противоположно −7?', choices: ['7', '−7'], right: '7', verify: () => -(-7) === 7 }] },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['sign', 'sign', 'bigger', 'abs', 'opp'], ['sign', 'bigger', 'cities', 'extreme', 'abs', 'abs', 'opp', 'opp'], ['sign', 'extreme', 'cities', 'abs', 'opp']));
      if (kind === 'sign') {
        let a, b;
        if (lv === 2 && Math.random() < 0.2) { a = 0; b = -rnd(2, 15); if (Math.random() < 0.5) [a, b] = [b, a]; } else [a, b] = negs(2, lv);
        const right = a < b ? '<' : '>', byAbs = Math.abs(a) < Math.abs(b) ? '<' : '>', hi = Math.max(a, b), lo = Math.min(a, b);
        const temp = a !== 0 && b !== 0 && Math.random() < 0.4;
        return {
          story: temp ? `Термометр утром показывал ${num(a)}°, а вечером — ${num(b)}°.` : '',
          question: `Какой знак поставить${temp ? ' между этими числами' : ''}: ${num(a)} … ${num(b)}?`,
          answer: right, accept: 'choice', choices: ['<', '>', '='],
          hints: [hi === 0 ? 'Где на координатной прямой ноль, а где отрицательные числа?' : 'Представь оба числа на координатной прямой (или на термометре). Какое из них правее (выше)?',
            `На координатной прямой ${num(hi)} правее, чем ${num(lo)}.`],
          solution: `${num(hi)} правее на координатной прямой, значит, ${num(hi)} больше, чем ${num(lo)}. Ставим знак «${right}».`,
          wrongs: W(right, { 'neg-compare-by-abs': byAbs }), data: { kind, a, b },
        };
      }
      if (kind === 'bigger') {
        const [a, b] = negs(2, lv), hi = Math.max(a, b), lo = Math.min(a, b);
        const st = pick(['pure', 'game', 'mine']);
        const [story, question] = {
          pure: ['', `Какое из чисел больше: ${num(a)} или ${num(b)}? Запиши его.`],
          game: [`В игре у Пети ${nw(a, WD.point)}, у Димы — ${nw(b, WD.point)}.`, 'У кого больше очков, тот и впереди. Сколько очков у того, кто впереди?'],
          mine: [`Дно одной шахты находится на отметке ${num(a)} м, другой — на отметке ${num(b)} м.`, 'Дно какой шахты выше? Запиши его отметку в метрах.'],
        }[st];
        return {
          story, question, answer: ans(hi),
          hints: ['Больше то число, которое на координатной прямой правее. У отрицательных правее то, что ближе к нулю.', `Сравни модули: |${num(a)}| = ${num(-a)}, |${num(b)}| = ${num(-b)}. Ближе к нулю число с меньшим модулем.`],
          solution: `${num(hi)} ближе к нулю, чем ${num(lo)}, — на прямой оно правее. Значит, ${num(hi)} > ${num(lo)}. Ответ: ${num(hi)}.`,
          wrongs: W(ans(hi), { 'neg-compare-by-abs': lo }), data: { kind, a, b },
        };
      }
      if (kind === 'cities') {
        const [c1, c2] = shuffle(CITIES).slice(0, 2), [t1, t2] = distinct(2, () => (lv === 3 ? -rnd(11, 450) / 10 : -rnd(1, 45)));
        const warm = Math.random() < 0.5, right = (warm ? t1 > t2 : t1 < t2) ? c1[0] : c2[0], other = right === c1[0] ? c2[0] : c1[0];
        return {
          story: `Утром в ${c1[1]} было ${num(t1)}°, а в ${c2[1]} — ${num(t2)}°.`,
          question: warm ? 'Где было теплее?' : 'Где было холоднее?',
          answer: right, accept: 'choice', choices: [c1[0], c2[0]],
          hints: ['Чем выше столбик термометра, тем теплее. На координатной прямой «выше» — это правее.', `${num(Math.max(t1, t2))}° ближе к нулю, чем ${num(Math.min(t1, t2))}°, — эта температура выше.`],
          solution: `${num(Math.max(t1, t2))} > ${num(Math.min(t1, t2))}, значит, теплее там, где ${num(Math.max(t1, t2))}°. ${warm ? 'Теплее' : 'Холоднее'} было: ${right}.`,
          wrongs: W(right, { 'neg-compare-by-abs': other }), data: { kind, t1, t2, c1: c1[0], c2: c2[0], warm },
        };
      }
      if (kind === 'extreme') {
        const xs = negs(4, lv), hi = Math.max(...xs), lo = Math.min(...xs), wantMax = Math.random() < 0.5, temp = Math.random() < 0.5;
        const list = xs.map(x => num(x) + (temp ? '°' : '')).join('; ');
        const right = wantMax ? hi : lo, wrong = wantMax ? lo : hi;
        return {
          story: temp ? `Температура в полночь четыре дня подряд: ${list}.` : '',
          question: temp ? `Какой была самая ${wantMax ? 'тёплая' : 'холодная'} ночь? Запиши её температуру.` : `Найди ${wantMax ? 'наибольшее' : 'наименьшее'} из чисел: ${list}.`,
          answer: ans(right),
          hints: [`${wantMax ? 'Наибольшее' : 'Наименьшее'} число стоит на координатной прямой ${wantMax ? 'правее' : 'левее'} всех.`, `У отрицательных чисел ${wantMax ? 'больше то, у которого модуль меньше' : 'меньше то, у которого модуль больше'}.`],
          solution: `${wantMax ? 'Ближе всех к нулю' : 'Дальше всех от нуля'} число ${num(right)} — оно ${wantMax ? 'наибольшее' : 'наименьшее'}. Ответ: ${num(right)}.`,
          wrongs: W(ans(right), { 'neg-compare-by-abs': wrong }), data: { kind, xs, wantMax },
        };
      }
      if (kind === 'abs') {
        if (lv === 1) {
          const a = rnd(2, 25), dive = Math.random() < 0.5;
          return {
            story: dive ? `Водолаз опустился на отметку ${num(-a)} м.` : '',
            question: dive ? 'На сколько метров он ниже поверхности воды?' : `Чему равно |${num(-a)}|?`, answer: ans(a),
            hints: [dive ? 'Поверхность воды — отметка 0. Найди расстояние от отметки водолаза до нуля.' : 'Модуль — это расстояние от числа до нуля.', `От ${num(-a)} до 0 — ${num(a)} шагов по прямой. Может ли расстояние быть отрицательным?`],
            solution: `|${num(-a)}| = ${num(a)}: расстояние до нуля не бывает отрицательным. Ответ: ${num(a)}.`,
            wrongs: W(ans(a), { 'abs-keeps-sign': -a }), data: { kind, op: 'one', a },
          };
        }
        const dec = lv === 3;
        let [a, b] = distinct(2, () => (dec ? rnd(11, 99) / 10 : rnd(2, 30)));
        const minus = Math.random() < 0.5;
        if (minus && a < b) [a, b] = [b, a];
        const bNeg = minus || dec;
        const right = R(minus ? a - b : a + b), wrong = R(minus ? -a - (-b) : -a + (bNeg ? -b : b));
        const e = `|${num(-a)}| ${minus ? '−' : '+'} |${num(bNeg ? -b : b)}|`;
        return {
          story: '', question: `Чему равно ${e}?`, answer: ans(right),
          hints: ['Сначала найди каждый модуль: это расстояние от числа до нуля, оно не бывает отрицательным.', `|${num(-a)}| = ${num(a)}, |${num(bNeg ? -b : b)}| = ${num(b)}.`],
          solution: `${e} = ${num(a)} ${minus ? '−' : '+'} ${num(b)} = ${num(right)}.`,
          wrongs: W(ans(right), { 'abs-keeps-sign': wrong }), data: { kind, op: minus ? 'minus' : 'plus', a, b },
        };
      }
      // opp
      if (lv === 3) {
        const [a, b] = distinct(2, () => rnd(2, 30)), right = a + b;
        return {
          story: '', question: `Чему равно −(${num(-a)}) + |${num(-b)}|?`, answer: ans(right),
          hints: ['−(−a) — это число, противоположное −a. А модуль — расстояние до нуля.', `−(${num(-a)}) = ${num(a)}, |${num(-b)}| = ${num(b)}.`],
          solution: `−(${num(-a)}) = ${num(a)}, |${num(-b)}| = ${num(b)}. ${num(a)} + ${num(b)} = ${num(right)}.`,
          wrongs: W(ans(right), { 'opposite-stays-neg': -a + b, 'abs-keeps-sign': a - b }), data: { kind, op: 'mix', a, b },
        };
      }
      const a = rnd(2, L3(lv, 20, 60, 60)), form = lv === 1 ? 'opp' : pick(['minus', 'x']);
      const question = { opp: `Какое число противоположно числу ${num(-a)}?`, minus: `Чему равно −(${num(-a)})?`, x: `x = ${num(-a)}. Чему равно −x?` }[form];
      return {
        story: '', question, answer: ans(a),
        hints: [form === 'x' ? '−x — это число, противоположное x. Подставь x со своим знаком.' : 'Противоположное число — на таком же расстоянии от нуля, но по другую сторону.', `${num(-a)} лежит левее нуля на ${num(a)}. Где число на таком же расстоянии справа?`],
        solution: `${form === 'x' ? `−x = −(${num(-a)}) = ${num(a)}` : form === 'minus' ? `−(${num(-a)}) = ${num(a)}` : `Противоположное число — ${num(a)}`}: оно на том же расстоянии от нуля, но по другую сторону. Ответ: ${num(a)}.`,
        wrongs: W(ans(a), { 'opposite-stays-neg': -a }), data: { kind, op: 'one', a },
      };
    },
    verify(t) {
      const d = t.data;
      switch (d.kind) {
        case 'sign': return t.answer === (d.a - d.b < 0 ? '<' : d.a - d.b > 0 ? '>' : '=');
        case 'bigger': return eq(+t.answer, d.a - d.b > 0 ? d.a : d.b);
        case 'cities': return t.answer === ((d.warm ? d.t1 - d.t2 > 0 : d.t1 - d.t2 < 0) ? d.c1 : d.c2);
        case 'extreme': { const s = d.xs.slice().sort((x, y) => x - y); return eq(+t.answer, d.wantMax ? s[s.length - 1] : s[0]); }
        case 'abs': return d.op === 'one' ? eq(+t.answer, Math.abs(-d.a)) : eq(+t.answer, d.op === 'minus' ? Math.abs(-d.a) - Math.abs(-d.b) : Math.abs(-d.a) + Math.abs(d.b));
        case 'opp': return d.op === 'mix' ? eq(+t.answer, 0 - -d.a + Math.abs(-d.b)) : eq(+t.answer, 0 - -d.a);
      }
      return false;
    },
  };

  /* =========================================================
     2. z6-addsub — сложение и вычитание с разными знаками
     ========================================================= */
  const ADD = (x, y, bug) => {
    if (bug === 'diff-signs-add-moduli' && x < 0 && y > 0) return -(Math.abs(x) + y);
    if (bug === 'sign-of-first' && x * y < 0) return Math.sign(x) * Math.abs(Math.abs(x) - Math.abs(y));
    return x + y;
  };
  const SUB = (x, y, bug) => {
    if (bug === 'minus-neg-no-flip' && y < 0) return x - Math.abs(y);
    if (bug === 'small-minus-big' && x >= 0 && y > 0 && x < y) return y - x;
    return x - y;
  };
  const runChain = (x0, steps, bug) => steps.reduce((acc, [op, v]) => R(op === '+' ? ADD(acc, v, bug) : SUB(acc, v, bug)), x0);
  const chainText = (x0, steps) => num(x0) + steps.map(([op, v]) => ` ${op} ${sign(v)}`).join('');
  function addText(x, op, y) {
    let s = '';
    if (op === '−') { s = `Вычитание заменяем прибавлением противоположного числа: ${num(x)} − ${sign(y)} = ${num(x)} + ${sign(-y)}. `; y = -y; }
    const r = R(x + y), ax = Math.abs(x), ay = Math.abs(y);
    if (x === 0 || y === 0) return s + `${num(x)} + ${sign(y)} = ${num(r)}.`;
    if (r === 0) return s + 'Модули равны, а знаки разные — числа противоположные, их сумма 0.';
    if ((x > 0) === (y > 0)) return s + `Знаки одинаковые: складываем модули (${num(ax)} + ${num(ay)} = ${num(Math.abs(r))}) и ставим общий знак: ${num(r)}.`;
    return s + `Знаки разные: из большего модуля вычитаем меньший (${num(Math.max(ax, ay))} − ${num(Math.min(ax, ay))} = ${num(Math.abs(r))}) и ставим знак числа с большим модулем (${num(ax > ay ? x : y)}): ${num(r)}.`;
  }
  const addHint = (x, op, y) => (op === '−' ? (y < 0 ? 'Вычесть отрицательное число — то же самое, что прибавить противоположное ему.' : 'Вычитание замени прибавлением противоположного числа: a − b = a + (−b).')
    : (x > 0) === (y > 0) ? 'Знаки одинаковые: сложи модули и поставь общий знак.' : 'Знаки у чисел разные. Чей модуль больше — тот знак и будет у ответа.');

  const addsub = {
    id: 'z6-addsub', strand: 'Положительные и отрицательные числа', short: 'Плюс и минус',
    title: 'Сложение и вычитание чисел с разными знаками',
    frp: ['Арифметические действия с положительными и отрицательными числами'],
    goal: 'Складывать и вычитать положительные и отрицательные числа: по правилу знаков и по координатной прямой.',
    requires: ['z6-integers'],
    explain: {
      model: 'На телефоне баланс −40 ₽: ты должен оператору 40 ₽. Ты кладёшь 100 ₽. Сначала 40 ₽ уходят на долг, остаётся 60 ₽. Значит, −40 + 100 = 60. Числа с разными знаками «гасят» друг друга, а побеждает то, у которого модуль больше. На прямой прибавить число — шагнуть вправо, вычесть — влево.',
      figure: LINE(-9, 1, [{ x: -7 }, { x: -4 }], [{ from: -7, to: -4, label: '+3' }]),
      figureCaption: 'Прибавить 3 — шагнуть на 3 вправо: −7 + 3 = −4',
      rule: '<ul class="rule-list"><li><b>Знаки одинаковые:</b> сложи модули и поставь общий знак. −5 + (−3) = −8.</li><li><b>Знаки разные:</b> из большего модуля вычти меньший и поставь знак числа с большим модулем. −7 + 3 = −4; −3 + 8 = 5.</li><li><b>Вычитание</b> — это прибавление противоположного числа: a − b = a + (−b). 5 − (−2) = 5 + 2 = 7; 3 − 8 = 3 + (−8) = −5.</li></ul>',
      examples: [
        { q: 'Термометр показывал −7°. Потеплело на 3°. Сколько градусов стало?', fig: LINE(-9, 1, [{ x: -7 }, { x: -4 }], [{ from: -7, to: -4, label: '+3' }]), choices: ['−4°', '−10°', '4°'], correct: 0, wrong: { 1: 'diff-signs-add-moduli' },
          steps: ['Потеплело — прибавляем: −7 + 3.', 'Знаки разные: 7 − 3 = 4, знак у −7 (его модуль больше).', 'Ответ: −4°. Стало теплее, чем −7°, но всё ещё мороз.'] },
        { q: 'Днём было 5°, ночью −2°. На сколько градусов днём было теплее?', choices: ['на 7°', 'на 3°'], correct: 0, wrong: { 1: 'minus-neg-no-flip' },
          steps: ['Разница — это вычитание: 5 − (−2).', 'Вычесть −2 — то же, что прибавить 2: 5 + 2 = 7.', 'Проверь по термометру: от −2 до 0 — 2 градуса, от 0 до 5 — ещё 5. Всего 7°.'] },
        { q: 'Чему равно 3 − 8?', choices: ['−5', '5'], correct: 0, wrong: { 1: 'small-minus-big' },
          steps: ['3 − 8 = 3 + (−8).', 'Знаки разные: 8 − 3 = 5, знак у −8 (его модуль больше). Ответ: −5.'] },
      ],
    },
    mistakes: [
      { id: 'diff-signs-add-moduli', title: 'При разных знаках складывает модули', kidName: 'Складун',
        kidRule: 'ты складываешь числа с разными знаками как с одинаковыми: −7 + 3 = −10',
        say: 'Когда знаки разные, числа «гасят» друг друга: модули не складывают, а вычитают.',
        fixIdea: 'Знаки разные — вычитай из большего модуля меньший и ставь знак числа с большим модулем.',
        explainOptions: ['−7 + 3 = −4: от −7 три шага вправо', '−7 + 3 = −10: модули складываем, минус оставляем', '−7 + 3 = 10: минус и плюс дают плюс'],
        conflicts: [{ text: 'На улице −7°. Потеплело на 3°. По твоему правилу стало −7 + 3 = −10°. Но потеплело — значит, должно стать теплее, а −10° холоднее, чем −7°!', ask: 'После потепления стало теплее или холоднее, чем −7°?', choices: ['теплее', 'холоднее'], right: 'теплее', verify: () => -7 + 3 > -7, figure: LINE(-11, 1, [{ x: -7 }, { x: -4 }], [{ from: -7, to: -4, label: '+3' }]) }] },
      { id: 'minus-neg-no-flip', title: 'Вычитает отрицательное число как положительное: 5 − (−2) = 3', kidName: 'Минус-невидимка',
        kidRule: 'ты вычитаешь отрицательное число так, будто у него нет минуса: 5 − (−2) = 3',
        say: 'Вычесть отрицательное число — то же, что прибавить противоположное ему: 5 − (−2) = 5 + 2.',
        fixIdea: 'a − (−b) = a + b: вычитание заменяем прибавлением противоположного числа.',
        explainOptions: ['5 − (−2) = 5 + 2 = 7', '5 − (−2) = 5 − 2 = 3: скобки ничего не меняют', '5 − (−2) = −7: два минуса — ответ отрицательный'],
        conflicts: [{ text: 'Днём 5°, ночью −2°. По твоему правилу разница 5 − (−2) = 3°. Посчитай по термометру: от −2 до 0 — 2 градуса, от 0 до 5 — ещё 5.', ask: 'На сколько градусов днём теплее?', choices: ['на 7', 'на 3'], right: 'на 7', verify: () => 5 - (-2) === 7, figure: LINE(-3, 6, [{ x: -2 }, { x: 5 }], [{ from: -2, to: 5, label: '7' }]) }] },
      { id: 'sign-of-first', title: 'Ставит в ответе знак первого числа', kidName: 'Первознак',
        kidRule: 'ты ставишь в ответе знак того числа, которое стоит первым: −3 + 8 = −5',
        say: 'Знак ответа — у числа с большим модулем, а не у того, которое стоит первым.',
        fixIdea: 'Сравни модули: чей модуль больше, того и знак.',
        explainOptions: ['−3 + 8 = 5: модуль 8 больше, знак плюс', '−3 + 8 = −5: первое число отрицательное — и ответ отрицательный', '−3 + 8 = −11: знак первого, модули складываем'],
        conflicts: [{ text: 'Баланс телефона −3 ₽ (долг 3 ₽), ты положил 8 ₽. По твоему правилу баланс стал −3 + 8 = −5 ₽, то есть долг вырос. Но ты положил денег больше, чем был должен!', ask: 'Остался ли долг?', choices: ['нет, на счёте 5 ₽', 'да, долг 5 ₽'], right: 'нет, на счёте 5 ₽', verify: () => -3 + 8 === 5 }] },
      { id: 'small-minus-big', title: 'Вычитает из большего меньшее и теряет знак: 3 − 8 = 5', kidName: 'Переставляка',
        kidRule: 'ты вычитаешь из большего числа меньшее, даже если большее стоит вторым: 3 − 8 = 5',
        say: 'Из 3 вычесть 8 можно — ответ будет отрицательным. Переставлять числа при вычитании нельзя.',
        fixIdea: 'Если вычитаемое больше уменьшаемого, ответ отрицательный: 3 − 8 = −(8 − 3) = −5.',
        explainOptions: ['3 − 8 = −5: от 3 шагаем на 8 влево', '3 − 8 = 5: из большего вычитаем меньшее', '3 − 8 = 0: нельзя вычесть больше, чем есть'],
        conflicts: [{ text: 'На карте 3 ₽, а покупка стоит 8 ₽, и банк разрешает уйти в минус. По твоему правилу после покупки на карте 3 − 8 = 5 ₽ — денег стало больше, чем было! Так не бывает.', ask: 'Сколько на карте после покупки?', choices: ['−5 ₽', '5 ₽'], right: '−5 ₽', verify: () => 3 - 8 === -5 }],
        root: 'f4-column' },
    ],
    generate(lv) {
      const BUGS = ['diff-signs-add-moduli', 'minus-neg-no-flip', 'sign-of-first', 'small-minus-big'];
      if (lv === 3 && Math.random() < 0.7) {
        // цепочка из трёх чисел
        let x0, steps, res, wr;
        for (let t = 0; t < 400; t++) {
          x0 = rnd(1, 30) * sg(); steps = [0, 1].map(() => [pick(['+', '−']), rnd(1, 30) * sg()]);
          res = runChain(x0, steps); wr = W(ans(res), Object.fromEntries(BUGS.map(b => [b, runChain(x0, steps, b)])));
          if (Object.keys(wr).length && steps.some(s => s[1] < 0)) break;
        }
        const r1 = runChain(x0, steps.slice(0, 1)), e = chainText(x0, steps);
        return {
          story: '', question: `Чему равно ${e}?`, answer: ans(res),
          hints: ['Считай по порядку слева направо. Каждое вычитание замени прибавлением противоположного числа.', `Первое действие: ${chainText(x0, steps.slice(0, 1))} = ${num(r1)}.`],
          solution: `${addText(x0, steps[0][0], steps[0][1])} Дальше. ${addText(r1, steps[1][0], steps[1][1])} Ответ: ${num(res)}.`,
          wrongs: wr, data: { x0, steps },
        };
      }
      const M = L3(lv, 10, 40, 60);
      const form = pick(['A', 'A', 'B', 'C', 'D', 'E']);
      let a, b;
      do { a = rnd(1, M); b = rnd(1, M); } while (a === b || (form === 'C' && a > b) || (form === 'E' && a > b));
      const story = lv < 3 && Math.random() < 0.65;
      const ST = {
        A: [['temp', `Утром термометр показывал ${num(-a)}°. К обеду потеплело на ${nw(b, WD.deg)}.`, 'Какая температура стала в обед? Ответ в градусах.', 1],
          ['phone', `Баланс телефона ${num(-a * 10)} ₽ — ты должен оператору. Ты положил на счёт ${num(b * 10)} ₽.`, 'Какой стал баланс? Ответ в рублях.', 10],
          ['game', `В игре у тебя было ${nw(-a, WD.point)}. За выполненный квест дали ${nw(b, WD.point)}.`, 'Сколько очков стало?', 1]],
        B: [['game', `В игре у тебя было ${nw(a, WD.point)}. За ошибку начислили ${nw(-b, WD.point)}.`, 'Сколько очков стало?', 1],
          ['temp', `Вечером было ${num(a)}°. За ночь температура изменилась на ${num(-b)}°.`, 'Какой стала температура утром? Ответ в градусах.', 1]],
        C: [['temp', `Днём было ${num(a)}°. К ночи похолодало на ${nw(b, WD.deg)}.`, 'Какая температура стала ночью? Ответ в градусах.', 1],
          ['card', `На карте ${num(a * 10)} ₽. Ты купил игру за ${num(b * 10)} ₽ — банк разрешает уйти в минус.`, 'Какой стал баланс карты? Ответ в рублях.', 10]],
        D: [['temp', `Днём было ${num(a)}°, а ночью ${num(-b)}°.`, 'На сколько градусов днём было теплее, чем ночью?', 1],
          ['hill', `Вершина холма находится на высоте ${num(a)} м, а дно оврага — на отметке ${num(-b)} м.`, 'На сколько метров вершина выше дна оврага?', 1]],
        E: [['temp', `Днём было ${num(-a)}°, а ночью ${num(-b)}°.`, 'На сколько градусов днём было теплее, чем ночью?', 1]],
      };
      const st = story ? pick(ST[form]) : null, k = st ? st[3] : 1;
      const A = a * k, B = b * k;
      const [x0, op, y] = { A: [-A, '+', B], B: [A, '+', -B], C: [A, '−', B], D: [A, '−', -B], E: [-A, '−', -B] }[form];
      const steps = [[op, y]], res = runChain(x0, steps), e = chainText(x0, steps);
      const wr = W(ans(res), Object.fromEntries(BUGS.map(bg => [bg, runChain(x0, steps, bg)])));
      return {
        story: st ? st[1] : '', question: st ? st[2] : `Чему равно ${e}?`, answer: ans(res),
        hints: [st ? `Составь выражение: ${e}. ${addHint(x0, op, y)}` : addHint(x0, op, y),
          op === '−' ? `${e} = ${num(x0)} + ${sign(-y)}. ${(x0 > 0) === (-y > 0) ? 'Знаки одинаковые — сложи модули.' : 'Теперь сравни модули.'}` : `Модули: ${num(Math.abs(x0))} и ${num(Math.abs(y))}. ${(x0 > 0) === (y > 0) ? 'Знаки одинаковые — сложи модули.' : `Больший модуль у числа ${num(Math.abs(x0) > Math.abs(y) ? x0 : y)}.`}`],
        solution: `${st ? `Выражение: ${e}. ` : ''}${addText(x0, op, y)} Ответ: ${num(res)}.`,
        wrongs: wr, data: { x0, steps },
      };
    },
    verify(t) {
      // шагаем по координатной прямой по одному делению
      const { x0, steps } = t.data; let pos = Math.round(x0);
      for (const [op, v] of steps) { const d = op === '+' ? v : -v; for (let i = 0; i < Math.abs(d); i++) pos += Math.sign(d); }
      return eq(+t.answer, pos);
    },
  };

  /* =========================================================
     3. z6-muldiv — умножение и деление
     ========================================================= */
  const MUL = (x, y, bug) => {
    if (bug === 'neg-times-neg-neg' && x < 0 && y < 0) return -Math.abs(x * y);
    if (bug === 'sign-by-bigger-abs' && x * y < 0 && Math.abs(x) !== Math.abs(y)) return (Math.abs(x) > Math.abs(y) ? Math.sign(x) : Math.sign(y)) * Math.abs(x * y);
    return x * y;
  };
  const DIV = (x, y, bug) => {
    if (bug === 'neg-times-neg-neg' && x < 0 && y < 0) return -Math.abs(x / y);
    if (bug === 'sign-by-bigger-abs' && x * y < 0 && Math.abs(x) !== Math.abs(y)) return (Math.abs(x) > Math.abs(y) ? Math.sign(x) : Math.sign(y)) * Math.abs(x / y);
    return x / y;
  };
  const prodText = xs => xs.map(sign).join(' · ');
  const signWord = k => `отрицательных множителей ${k} — ${k % 2 ? 'нечётное количество, ответ отрицательный' : 'чётное количество, ответ положительный'}`;

  const muldiv = {
    id: 'z6-muldiv', strand: 'Положительные и отрицательные числа', short: 'Умножение знаков',
    title: 'Умножение и деление чисел с разными знаками',
    frp: ['Арифметические действия с положительными и отрицательными числами'],
    goal: 'Умножать и делить положительные и отрицательные числа, определять знак произведения нескольких множителей.',
    requires: ['z6-addsub', 'f4-table'],
    explain: {
      model: 'Из бассейна сливают воду: каждый час уровень меняется на −2 см. Сейчас уровень на отметке 0. Где он был 3 часа назад? Выше, на отметке +6 см! «3 часа назад» — это −3 часа, и (−2) · (−3) = 6. «Вода убывает» и «смотрим назад во времени» вместе дают «раньше воды было больше». Отсюда правило: минус на минус — плюс.',
      rule: '<ul class="rule-list"><li>Сначала перемножь (раздели) <b>модули</b>, потом поставь знак.</li><li><b>Знаки одинаковые — плюс, разные — минус:</b> (−4) · (−5) = 20, (−4) · 5 = −20, (−20) : (−4) = 5, 20 : (−4) = −5.</li><li>Знак не зависит от того, чей модуль больше. Это при сложении знак берут у большего модуля, а при умножении и делении — нет.</li><li>Несколько множителей: <b>чётное число минусов — плюс, нечётное — минус</b>. (−1) · (−2) · (−3) = −6.</li></ul>',
      examples: [
        { q: 'Найди (−6) · (−4).', choices: ['24', '−24'], correct: 0, wrong: { 1: 'neg-times-neg-neg' },
          steps: ['Модули: 6 · 4 = 24.', 'Знаки одинаковые (оба минуса) — ответ положительный: 24.'] },
        { q: 'Каждый час температура понижалась на 3°, то есть менялась на −3°. Как изменилась температура за 8 часов?', choices: ['на −24°', 'на 24°'], correct: 0, wrong: { 1: 'sign-by-bigger-abs' },
          steps: ['Изменение за 8 часов: 8 · (−3).', 'Модули: 8 · 3 = 24. Знаки разные — ответ отрицательный, хотя 8 больше 3.', 'Ответ: −24°, похолодало на 24°.'] },
        { q: 'Найди (−2) · (−3) · (−5).', choices: ['−30', '30'], correct: 0, wrong: { 1: 'many-negs-plus' },
          steps: ['Модули: 2 · 3 · 5 = 30.', 'Минусов три — нечётное число. Пара минусов даёт плюс, а третий остаётся без пары.', 'Ответ: −30.'] },
      ],
    },
    mistakes: [
      { id: 'neg-times-neg-neg', title: 'Считает, что минус на минус даёт минус', kidName: 'Двойной минус',
        kidRule: 'ты считаешь, что минус на минус — тоже минус: (−4) · (−5) = −20',
        say: 'При умножении и делении двух отрицательных чисел получается положительное: одинаковые знаки — плюс.',
        fixIdea: 'Одинаковые знаки — плюс, разные — минус.',
        explainOptions: ['(−4) · (−5) = 20: знаки одинаковые', '(−4) · (−5) = −20: оба отрицательные, значит, и ответ отрицательный', '(−4) · (−5) = −9: минусы складываются'],
        conflicts: [
          { text: '(−4) · 5 = −20: пять раз по −4. А (−4) · (−5) — это число, противоположное (−4) · 5. По твоему правилу (−4) · (−5) = −20, то есть столько же, сколько (−4) · 5. Но противоположное к −20 — не −20!', ask: 'Какое число противоположно −20?', choices: ['20', '−20'], right: '20', verify: () => (-4) * (-5) === -((-4) * 5) },
          { text: 'Уровень воды каждый час меняется на −2 см. По твоему правилу 3 часа назад (−3 ч) уровень был (−2) · (−3) = −6 см, то есть ниже, чем сейчас. Но вода всё время убывала — раньше её было больше!', ask: '3 часа назад вода была выше или ниже, чем сейчас?', choices: ['выше', 'ниже'], right: 'выше', verify: () => (-2) * (-3) > 0 },
        ] },
      { id: 'sign-by-bigger-abs', title: 'Ставит знак произведения по большему модулю, как при сложении', kidName: 'Знак-силач',
        kidRule: 'ты ставишь знак числа с большим модулем, как при сложении: 8 · (−3) = 24',
        say: 'При умножении и делении знак не зависит от того, чей модуль больше: разные знаки — всегда минус.',
        fixIdea: 'Правило «знак большего модуля» — только для сложения. При умножении и делении смотри лишь на знаки.',
        explainOptions: ['8 · (−3) = −24: знаки разные — минус', '8 · (−3) = 24: у 8 модуль больше, значит, плюс', '8 · (−3) = 5: модули вычитаем, как при сложении'],
        conflicts: [{ text: '8 · (−3) — это (−3) + (−3) + … восемь раз, сумма восьми отрицательных чисел. По твоему правилу получается 24 — положительное число.', ask: 'Может ли сумма отрицательных чисел быть положительной?', choices: ['нет', 'да'], right: 'нет', verify: () => 8 * (-3) < 0 }],
        root: 'z6-addsub' },
      { id: 'many-negs-plus', title: 'Считает произведение нескольких отрицательных чисел всегда положительным', kidName: 'Плюсовщик',
        kidRule: 'ты думаешь: раз минус на минус — плюс, то сколько бы минусов ни было, ответ будет с плюсом',
        say: 'Считай минусы: каждая пара минусов даёт плюс, но если минусов нечётное количество, один остаётся без пары.',
        fixIdea: 'Чётное число минусов — плюс, нечётное — минус.',
        explainOptions: ['(−1) · (−2) · (−3) = −6: три минуса — один без пары', '(−1) · (−2) · (−3) = 6: минус на минус — плюс', '(−1) · (−2) · (−3) = 0: минусы уничтожают друг друга'],
        conflicts: [{ text: 'Считай по шагам: (−1) · (−2) = 2. Осталось 2 · (−3). По твоему правилу всё произведение положительное. А 2 · (−3) — это плюс на минус.', ask: 'Чему равно 2 · (−3)?', choices: ['−6', '6'], right: '−6', verify: () => (-1) * (-2) * (-3) === -6 }] },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['mul', 'mul', 'div', 'story'], ['mul', 'div', 'mul3', 'mul3', 'story'], ['mul', 'div', 'mul3', 'mul4', 'story']));
      const pattern = () => pick(['nn', 'nn', 'pn', 'pn', 'np']); // nn — оба минуса; pn — положительный множитель с большим модулем
      if (kind === 'mul' || kind === 'div') {
        let big = rnd(...L3(lv, [2, 9], [11, 25], [11, 19])), small = rnd(...L3(lv, [2, 9], [2, 9], [11, 15]));
        if (big === small) big++;
        if (big < small) [big, small] = [small, big];
        const p = pattern();
        if (kind === 'mul') {
          const xy = p === 'nn' ? [-big, -small] : p === 'pn' ? [big, -small] : [-big, small];
          const [x, y] = Math.random() < 0.5 ? xy : [xy[1], xy[0]], res = x * y;
          return {
            story: '', question: `Чему равно ${prodText([x, y])}?`, answer: ans(res),
            hints: ['Сначала перемножь модули, потом поставь знак: одинаковые знаки — плюс, разные — минус.', `Модули: ${num(big)} · ${num(small)} = ${num(big * small)}. Знаки ${x * y > 0 ? 'одинаковые' : 'разные'}.`],
            solution: `${num(big)} · ${num(small)} = ${num(big * small)}; знаки ${res > 0 ? 'одинаковые — плюс' : 'разные — минус'}. Ответ: ${num(res)}.`,
            wrongs: W(ans(res), { 'neg-times-neg-neg': MUL(x, y, 'neg-times-neg-neg'), 'sign-by-bigger-abs': x < 0 && y < 0 ? null : MUL(x, y, 'sign-by-bigger-abs') }), data: { xs: [x, y], op: 'mul' },
          };
        }
        const q = big, dv = small, X = q * dv;
        const [x, y] = p === 'nn' ? [-X, -dv] : p === 'pn' ? [X, -dv] : [-X, dv], res = x / y;
        return {
          story: '', question: `Чему равно ${num(x)} : ${sign(y)}?`, answer: ans(res),
          hints: ['Раздели модули, потом поставь знак: одинаковые знаки — плюс, разные — минус.', `Модули: ${num(X)} : ${num(dv)} = ${num(q)}. Знаки ${x * y > 0 ? 'одинаковые' : 'разные'}.`],
          solution: `${num(X)} : ${num(dv)} = ${num(q)}; знаки ${res > 0 ? 'одинаковые — плюс' : 'разные — минус'}. Проверка: ${sign(res)} · ${sign(y)} = ${num(x)}. Ответ: ${num(res)}.`,
          wrongs: W(ans(res), { 'neg-times-neg-neg': DIV(x, y, 'neg-times-neg-neg'), 'sign-by-bigger-abs': x < 0 && y < 0 ? null : DIV(x, y, 'sign-by-bigger-abs') }), data: { x, y, op: 'div' },
        };
      }
      if (kind === 'mul3' || kind === 'mul4') {
        const n = kind === 'mul3' ? 3 : 4, negCnt = kind === 'mul3' ? pick([3, 3, 2, 1]) : pick([3, 3, 2]);
        const abs = Array.from({ length: n }, () => rnd(1, L3(lv, 5, 6, 5)));
        if (abs.every(v => v === 1)) abs[0] = 2;
        const negIdx = shuffle([...Array(n).keys()]).slice(0, negCnt), xs = abs.map((v, i) => (negIdx.includes(i) ? -v : v));
        const res = xs.reduce((s, v) => s * v, 1), stepBug = xs.slice(1).reduce((s, v) => MUL(s, v, 'neg-times-neg-neg'), xs[0]);
        return {
          story: '', question: `Чему равно ${prodText(xs)}?`, answer: ans(res),
          hints: ['Перемножь модули, а знак определи по числу минусов.', `Модули: ${abs.join(' · ')} = ${num(Math.abs(res))}. Сколько здесь отрицательных множителей?`],
          solution: `Модули: ${abs.join(' · ')} = ${num(Math.abs(res))}. ${signWord(negCnt)[0].toUpperCase() + signWord(negCnt).slice(1)}. Ответ: ${num(res)}.`,
          wrongs: W(ans(res), { 'neg-times-neg-neg': stepBug, 'many-negs-plus': negCnt >= 2 ? Math.abs(res) : null }), data: { xs, op: 'mul' },
        };
      }
      // сюжетные задачи
      const st = pick(['temp', 'pool', 'fee', 'avg']);
      if (st === 'pool') {
        const d = rnd(1, L3(lv, 5, 9, 15)), h = rnd(2, L3(lv, 5, 8, 12)), res = d * h;
        return {
          story: `Воду из бассейна сливают: каждый час уровень меняется на ${num(-d)} см. Сейчас уровень воды на отметке 0.`,
          question: `На какой отметке был уровень ${nw(h, WD.hour)} назад? Ответ в сантиметрах.`, answer: ans(res),
          hints: [`Время назад запиши со знаком минус: −${h} ч. Изменение в час умножь на время.`, `(${num(-d)}) · (${num(-h)}) — знаки одинаковые.`],
          solution: `${prodText([-d, -h])} = ${num(res)}. Раньше воды было больше — уровень был на отметке ${num(res)} см.`,
          wrongs: W(ans(res), { 'neg-times-neg-neg': -res }), data: { xs: [-d, -h], op: 'mul' },
        };
      }
      if (st === 'avg') {
        const d = rnd(2, L3(lv, 4, 6, 9)), h = rnd(2, L3(lv, 5, 8, 12)), X = d * h;
        return {
          story: `За ${nw(h, WD.hour)} температура изменилась на ${num(-X)}°, каждый час — на одно и то же число градусов.`,
          question: 'На сколько градусов менялась температура каждый час? Запиши изменение со знаком.', answer: ans(-d),
          hints: ['Общее изменение раздели на число часов.', `${num(-X)} : ${num(h)} — знаки разные.`],
          solution: `${num(-X)} : ${num(h)} = ${num(-d)}. Каждый час температура понижалась на ${num(d)}°.`,
          wrongs: W(ans(-d), { 'sign-by-bigger-abs': DIV(-X, h, 'sign-by-bigger-abs'), 'neg-times-neg-neg': null }), data: { x: -X, y: h, op: 'div' },
        };
      }
      // temp и fee: положительный множитель с большим модулем — ловушка «знак по большему модулю»
      const d = rnd(2, L3(lv, 4, 6, 9)), h = rnd(d + 1, L3(lv, 9, 12, 15)), res = h * -d;
      const [story, question] = st === 'temp'
        ? [`Каждый час температура понижалась на ${num(d)}°, то есть менялась на ${num(-d)}°.`, `На сколько градусов изменилась температура за ${nw(h, WD.hour)}? Запиши изменение со знаком.`]
        : [`За каждый перевод банк берёт комиссию ${num(d)} ₽: баланс меняется на ${num(-d)} ₽.`, `Как изменится баланс за ${nw(h, WD.transfer)}? Запиши изменение в рублях со знаком.`];
      return {
        story, question, answer: ans(res),
        hints: ['Изменение за один раз умножь на число раз.', `${num(h)} · ${sign(-d)}: модули ${num(h)} · ${num(d)} = ${num(h * d)}, знаки разные.`],
        solution: `${num(h)} · ${sign(-d)} = ${num(res)}: знаки разные — минус, хотя ${num(h)} больше ${num(d)}.`,
        wrongs: W(ans(res), { 'sign-by-bigger-abs': MUL(h, -d, 'sign-by-bigger-abs') }), data: { xs: [h, -d], op: 'mul' },
      };
    },
    verify(t) {
      const d = t.data;
      if (d.op === 'div') return eq(+t.answer * d.y, d.x);
      const negCnt = d.xs.filter(v => v < 0).length, m = d.xs.reduce((s, v) => s * Math.abs(v), 1);
      return eq(+t.answer, negCnt % 2 ? -m : m);
    },
  };

  /* =========================================================
     4. z6-rational — все действия, порядок действий
     ========================================================= */
  const dec1 = (lo, hi) => { let x; do x = rnd(lo, hi) / 10; while (Number.isInteger(x)); return x; };
  const FRAC_D = [[2, 3, 4, 6], [2, 3, 4, 5, 6, 8, 10], [3, 4, 5, 6, 8, 9, 10, 12]];

  const rational = {
    id: 'z6-rational', strand: 'Положительные и отрицательные числа', short: 'Все действия',
    title: 'Все действия с рациональными числами',
    frp: ['Арифметические действия с положительными и отрицательными числами', 'Арифметические действия с обыкновенными и десятичными дробями'],
    goal: 'Выполнять все действия с положительными и отрицательными дробями (десятичными и обыкновенными), соблюдая порядок действий.',
    requires: ['z6-muldiv', 'n5-order', 'd5-mult', 'add-diff'],
    explain: {
      model: 'Уровень воды в реке за три дня менялся так: −0,4 м, потом +0,25 м, потом −0,15 м. Как он изменился за всё время? Числа дробные, но правила знаков те же, что для целых: −0,4 + 0,25 − 0,15 = −0,3 м. Вода опустилась на 30 см.',
      rule: `<ul class="rule-list"><li><b>Правила знаков те же</b>, что для целых чисел: сначала действие с модулями, потом знак.</li><li><b>Порядок действий:</b> скобки, потом умножение и деление, потом сложение и вычитание. −3 + 4 · (−2) = −3 + (−8) = −11.</li><li><b>Десятичные:</b> при умножении в ответе после запятой столько знаков, сколько у обоих множителей вместе: −0,3 · 0,2 = −0,06.</li><li><b>Обыкновенные дроби</b> складывают через общий знаменатель: −${fr(1, 2)} + ${fr(1, 3)} = −${fr(3, 6)} + ${fr(2, 6)} = −${fr(1, 6)}.</li></ul>`,
      examples: [
        { q: 'Чему равно −3 + 4 · (−2)?', choices: ['−11', '−2'], correct: 0, wrong: { 1: 'order-left-to-right' },
          steps: ['Сначала умножение: 4 · (−2) = −8.', 'Потом сложение: −3 + (−8) = −11.'] },
        { q: 'Чему равно −0,3 · 0,2?', choices: ['−0,06', '−0,6'], correct: 0, wrong: { 1: 'dec-mult-comma' },
          steps: ['Без запятых: 3 · 2 = 6. Знаки разные — минус.', 'После запятой у множителей 1 + 1 = 2 знака: −0,06.'] },
        { q: `Чему равно −${fr(1, 2)} + ${fr(1, 3)}?`, choices: [`−${fr(1, 6)}`, '0'], correct: 0, wrong: { 1: 'frac-add-across' },
          steps: [`Общий знаменатель 6: −${fr(1, 2)} = −${fr(3, 6)}, ${fr(1, 3)} = ${fr(2, 6)}.`, `−${fr(3, 6)} + ${fr(2, 6)} = −${fr(1, 6)}: знаки разные, модуль ${fr(3, 6)} больше.`] },
      ],
    },
    mistakes: [
      { id: 'order-left-to-right', title: 'Считает слева направо, забывая, что умножение и деление выполняют раньше', kidName: 'Слева-направо',
        kidRule: 'ты считаешь всё подряд слева направо: −3 + 4 · (−2) = 1 · (−2) = −2',
        say: 'Умножение и деление делают раньше сложения и вычитания, даже если они стоят правее.',
        fixIdea: 'Сначала умножение и деление, потом сложение и вычитание.',
        explainOptions: ['−3 + 4 · (−2) = −3 + (−8) = −11', '−3 + 4 · (−2) = 1 · (−2) = −2: считаем по порядку', '−3 + 4 · (−2) = −3 + 4 − 2 = −1'],
        conflicts: [{ text: 'Баланс телефона −3 ₽, и ты купил 4 стикера по 2 ₽: баланс −3 + 4 · (−2). По твоему правилу получится −2 ₽, то есть после покупок долг уменьшился!', ask: 'Долг после покупок стал больше или меньше 3 ₽?', choices: ['больше', 'меньше'], right: 'больше', verify: () => -3 + 4 * (-2) < -3 }],
        root: 'n5-order' },
      { id: 'dec-mult-comma', title: 'Отделяет запятой слишком мало знаков при умножении десятичных', kidName: 'Запятушка',
        kidRule: 'ты ставишь в произведении запятую так же, как в одном из множителей: 0,3 · 0,2 = 0,6',
        say: 'После запятой в произведении столько знаков, сколько у обоих множителей вместе.',
        fixIdea: 'Посчитай знаки после запятой у обоих множителей и сложи: столько же будет в ответе.',
        explainOptions: ['−0,3 · 0,2 = −0,06: в ответе два знака после запятой', '−0,3 · 0,2 = −0,6: как у множителей, один знак', '−0,3 · 0,2 = −6: запятые сокращаются'],
        conflicts: [{ text: 'Умножить на 0,2 — значит взять две десятых от числа, то есть меньше его половины. По твоему правилу 0,3 · 0,2 = 0,6 — это вдвое больше, чем 0,3!', ask: 'Может ли 0,3 · 0,2 быть больше 0,3?', choices: ['нет', 'да'], right: 'нет', verify: () => 0.3 * 0.2 < 0.3 }],
        root: 'd5-mult' },
      { id: 'frac-add-across', title: 'Складывает числители с числителями, знаменатели со знаменателями', kidName: 'Склейщик',
        kidRule: 'ты складываешь дроби «верх с верхом, низ с низом»: −1/2 + 1/3 = 0/5 = 0',
        say: 'Складывать можно только одинаковые доли: сначала приведи дроби к общему знаменателю.',
        fixIdea: 'Приведи дроби к общему знаменателю, потом складывай числители, а знаменатель оставь.',
        explainOptions: ['−1/2 + 1/3 = −3/6 + 2/6 = −1/6', '−1/2 + 1/3 = (−1 + 1)/(2 + 3) = 0', '−1/2 + 1/3 = −2/5'],
        conflicts: [{ text: 'Ты должен другу полпиццы (−1/2), а отдал только треть пиццы (+1/3). По твоему правилу −1/2 + 1/3 = 0 — долг закрыт. Но треть меньше половины!', ask: 'Закрыт ли долг?', choices: ['нет, ещё должен', 'да, закрыт'], right: 'нет, ещё должен', verify: () => -1 / 2 + 1 / 3 < 0 }],
        root: 'add-diff' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['order', 'order', 'decmul', 'frac'], ['order', 'order', 'decmul', 'frac'], ['order', 'order', 'decmul', 'frac']));
      if (kind === 'order') {
        const form = pick(['+·', '−·', '+·', '+:', '−:']);
        let x, y, z, w = 0, res, ltr, e;
        for (let t = 0; t < 300; t++) {
          if (form.endsWith('·')) {
            x = L3(lv, rnd(1, 9), dec1(1, 99), dec1(1, 99)) * sg(); y = rnd(2, 9) * sg(); z = L3(lv, rnd(2, 9), rnd(2, 9), pick([0.5, 1.5, 2.5, 0.2, 0.4])) * sg();
            if (lv === 2 && Math.random() < 0.5) [y, z] = [y, dec1(1, 9) * sg()];
            if (lv === 3) w = rnd(1, 9) * sg();
            const mid = R(y * z);
            res = R((form[0] === '+' ? x + mid : x - mid) + w); ltr = R((form[0] === '+' ? x + y : x - y) * z + w);
            e = `${num(x)} ${form[0] === '+' ? '+' : '−'} ${sign(y)} · ${sign(z)}${w ? ` ${w > 0 ? '+' : '−'} ${num(Math.abs(w))}` : ''}`;
          } else {
            z = rnd(2, L3(lv, 5, 8, 9)) * sg(); const m = rnd(1, L3(lv, 6, 9, 12)) * sg(), k = rnd(1, L3(lv, 6, 9, 12)) * sg();
            x = z * m; y = z * k;
            res = R(form[0] === '+' ? x + k : x - k); ltr = R((form[0] === '+' ? x + y : x - y) / z);
            e = `${num(x)} ${form[0] === '+' ? '+' : '−'} ${sign(y)} : ${sign(z)}`;
          }
          if (!eq(res, ltr) && [x, y, z].some(v => v < 0) && Math.abs(res) < 1000) break;
        }
        const isMul = form.endsWith('·'), mid = R(isMul ? y * z : y / z);
        const can = !w && isMul && lv < 3 && Math.random() < 0.5 && y > 0 && z < 0 && form[0] === '+';
        const sx = can && Number.isInteger(x) && Number.isInteger(z) && Math.random() < 0.6, tempOk = can && Math.abs(z) <= 2 && y <= 6;
        const st = !(sx || tempOk) ? null : sx
          ? [`Баланс телефона был ${num(x)} ₽. Ты купил ${nw(y, WD.sticker)} по ${num(-z)} ₽ за штуку.`, 'Какой стал баланс? Ответ в рублях.']
          : [`Вечером термометр показывал ${num(x)}°. Ночью ${nw(y, WD.hour)} подряд температура менялась на ${num(z)}° в час.`, 'Какой стала температура? Ответ в градусах.'];
        return {
          story: st ? st[0] : '', question: st ? st[1] : `Чему равно ${e}?`, answer: ans(res),
          hints: [`${st ? `Выражение: ${e}. ` : ''}Сначала ${isMul ? 'умножение' : 'деление'}, потом сложение и вычитание.`, `${sign(y)} ${isMul ? '·' : ':'} ${sign(z)} = ${num(mid)}.`],
          solution: `${isMul ? 'Умножение' : 'Деление'}: ${sign(y)} ${isMul ? '·' : ':'} ${sign(z)} = ${num(mid)}. Дальше: ${num(x)} ${form[0] === '+' ? '+' : '−'} ${sign(mid)}${w ? ` ${w > 0 ? '+' : '−'} ${num(Math.abs(w))}` : ''} = ${num(res)}.`,
          wrongs: W(ans(res), { 'order-left-to-right': ltr }), data: { kind, form, x, y, z, w },
        };
      }
      if (kind === 'decmul') {
        let A, B, pa, pb;
        for (let t = 0; t < 300; t++) {
          if (lv === 1) { A = rnd(1, 9); B = rnd(2, 9); pa = 1; pb = 1; }
          else if (lv === 2) { A = rnd(11, 99); B = rnd(2, 9); pa = 1; pb = 1; }
          else { A = pick([rnd(2, 9), rnd(11, 99)]); B = rnd(2, 9); pa = 2; pb = 1; }
          if (A % 10 && (lv < 3 || (A * B) % 10 === 0)) break;
        }
        const s1 = sg(), s2 = Math.random() < 0.5 ? -1 : s1 < 0 ? sg() : -1;
        const x = s1 * A / 10 ** pa, y = s2 * B / 10 ** pb, s = s1 * s2;
        const res = R(s * A * B / 10 ** (pa + pb)), wrong = R(s * A * B / 10 ** Math.max(pa, pb));
        return {
          story: '', question: pick([`Чему равно ${num(x)} · ${sign(y)}?`, `Найди произведение: ${num(x)} · ${sign(y)}.`, `Сколько будет ${num(x)} · ${sign(y)}?`]), answer: ans(res),
          hints: ['Перемножь числа без запятых, потом поставь знак и запятую.', `${A} · ${B} = ${A * B}. После запятой у множителей ${pa} + ${pb} = ${pa + pb} ${pl(pa + pb, 'знак', 'знака', 'знаков')}.`],
          solution: `${A} · ${B} = ${A * B}; знаков после запятой ${pa} + ${pb} = ${pa + pb}; знаки ${s > 0 ? 'одинаковые — плюс' : 'разные — минус'}. Ответ: ${num(res)}.`,
          wrongs: W(ans(res), { 'dec-mult-comma': wrong }), data: { kind, A, B, pa, pb, s },
        };
      }
      // frac
      const DS = FRAC_D[lv - 1];
      let f1, f2, sum, across;
      for (let t = 0; t < 400; t++) {
        const [b, d] = shuffle(DS).slice(0, 2); let a, c;
        do a = rnd(1, b - 1); while (gcd(a, b) !== 1);
        do c = rnd(1, d - 1); while (gcd(c, d) !== 1);
        const s1 = Math.random() < 0.7 ? -1 : 1, s2 = s1 < 0 ? 1 : -1;
        f1 = [s1 * a, b]; f2 = [s2 * c, d]; sum = fadd(f1, f2); across = F(f1[0] + f2[0], b + d);
        if (sum[0] !== 0 && !(across[0] === sum[0] && across[1] === sum[1])) break;
      }
      const L = lcm(f1[1], f2[1]), n1 = f1[0] * L / f1[1], n2 = f2[0] * L / f2[1];
      const river = lv < 3 && Math.random() < 0.4;
      const e = `${fhtml(f1)} + ${fsigned(f2)}`;
      return {
        story: river ? `В понедельник уровень воды в реке изменился на ${fhtml(f1)} м, а во вторник — на ${fhtml(f2)} м.` : '',
        question: river ? 'Как изменился уровень за два дня? Ответ в метрах — дробью со знаком.' : `Чему равно ${e}?`,
        answer: fstr(sum), accept: sum[1] === 1 ? 'exact' : 'equivalent',
        hints: ['Приведи дроби к общему знаменателю, потом сложи числители по правилу знаков.', `Общий знаменатель ${L}: ${[[f1, n1], [f2, n2]].filter(([f]) => f[1] !== L).map(([f, nn]) => `${fhtml(f)} = ${fhtml([nn, L])}`).join(', ')}.`],
        solution: `${river ? `Выражение: ${e}. ` : ''}Общий знаменатель ${L}: ${fhtml([n1, L])} + ${fsigned([n2, L])} = ${fhtml([n1 + n2, L])}${F(n1 + n2, L)[1] !== L ? ` = ${fhtml(sum)}` : ''}. Ответ: ${fhtml(sum)}.`,
        wrongs: { ...(across[0] === sum[0] && across[1] === sum[1] ? {} : { 'frac-add-across': fstr(across) }) }, data: { kind, f1, f2 },
      };
    },
    verify(t) {
      const d = t.data, got = parse(t.answer);
      if (d.kind === 'decmul') {
        // через целые сотые/тысячные: A·B и сдвиг запятой
        const scale = 10 ** (d.pa + d.pb);
        return Math.round(got * scale) === d.s * d.A * d.B;
      }
      if (d.kind === 'frac') { const [a, b] = d.f1, [c, e] = d.f2; return eq(got * b * e, a * e + c * b); }
      const { form, x, y, z, w } = d;
      // всё в тысячных, чтобы не зависеть от плавающей точки
      const S = v => Math.round(v * 1000);
      if (form.endsWith('·')) return Math.round(got * 1000) === S(x) + (form[0] === '+' ? 1 : -1) * S(y) * S(z) / 1000 + S(w);
      return eq(got, form[0] === '+' ? x + y / z : x - y / z);
    },
  };

  /* =========================================================
     5. z6-coords — координатная плоскость
     ========================================================= */
  const ROMAN = ['I', 'II', 'III', 'IV'];
  const quadOf = (x, y) => (x > 0 ? (y > 0 ? 'I' : 'IV') : y > 0 ? 'II' : 'III');
  const clockwise = q => ({ I: 'I', II: 'IV', III: 'III', IV: 'II' })[q];
  const pt = (x, y) => `(${num(x)}; ${num(y)})`;

  const coords = {
    id: 'z6-coords', strand: 'Положительные и отрицательные числа', short: 'Координаты',
    title: 'Координатная плоскость',
    frp: ['Прямоугольная система координат на плоскости. Координаты точки на плоскости, абсцисса и ордината', 'Построение точек и фигур на координатной плоскости'],
    goal: 'Читать и строить точки по координатам, определять четверть и находить длину отрезка, параллельного оси.',
    requires: ['z6-integers'],
    explain: {
      model: 'В игре «Морской бой» клетку называют двумя координатами: буквой и цифрой. На координатной плоскости так же: точку A(3; −2) находят так — от нуля 3 шага вправо по оси x, потом 2 шага вниз по оси y. Первое число всегда «вправо-влево», второе — «вверх-вниз».',
      figure: { type: 'coord', points: [{ x: 3, y: -2, label: 'A' }, { x: -2, y: 3, label: 'B' }] },
      figureCaption: 'A(3; −2) и B(−2; 3) — разные точки: порядок чисел важен',
      rule: '<ul class="rule-list"><li>Запись A(x; y): <b>первое число — абсцисса x</b> (вправо или влево по горизонтальной оси), <b>второе — ордината y</b> (вверх или вниз).</li><li><b>Четверти</b> нумеруют против часовой стрелки, начиная с правой верхней: I — x и y положительные, II — x отрицательный, y положительный, III — оба отрицательные, IV — x положительный, y отрицательный.</li><li>Если у двух точек одинаковые ординаты, отрезок между ними горизонтальный, его длина — разность абсцисс «большая минус меньшая»: от −3 до 5 — это 5 − (−3) = 8 клеток.</li></ul>',
      examples: [
        { q: 'Какая точка на рисунке имеет координаты (−2; 3)?', fig: { type: 'coord', points: [{ x: 3, y: -2, label: 'A' }, { x: -2, y: 3, label: 'B' }] }, choices: ['B', 'A'], correct: 0, wrong: { 1: 'swap-xy' },
          steps: ['Первое число −2: идём от нуля на 2 клетки влево.', 'Второе число 3: поднимаемся на 3 клетки вверх. Там точка B.'] },
        { q: 'В какой четверти лежит точка (−4; 2)?', choices: ['II', 'IV', 'III'], correct: 0, wrong: { 1: 'quadrant-clockwise' },
          steps: ['x = −4 — отрицательный, точка левее оси y; y = 2 — положительный, точка выше оси x.', 'Слева сверху — II четверть (считаем против часовой стрелки от правой верхней).'] },
        { q: 'Найди длину отрезка с концами (−3; 1) и (5; 1).', fig: { type: 'coord', points: [{ x: -3, y: 1, label: 'C' }, { x: 5, y: 1, label: 'D' }] }, choices: ['8', '2'], correct: 0, wrong: { 1: 'distance-ignores-sign' },
          steps: ['Ординаты одинаковые — отрезок горизонтальный.', 'От −3 до 0 — 3 клетки, от 0 до 5 — ещё 5: всего 5 − (−3) = 8.'] },
      ],
    },
    mistakes: [
      { id: 'swap-xy', title: 'Путает абсциссу и ординату', kidName: 'Перепутка',
        kidRule: 'ты читаешь координаты наоборот: сначала вверх-вниз, потом вправо-влево',
        say: 'Первое число в скобках — это x, движение вправо-влево по горизонтальной оси. Второе — y, вверх-вниз.',
        fixIdea: 'Порядок (x; y) — как в алфавите: сначала x по горизонтали, потом y по вертикали.',
        explainOptions: ['A(3; −2): 3 клетки вправо, 2 вниз', 'A(3; −2): 3 клетки вверх, 2 влево', 'Порядок чисел не важен: (3; −2) и (−2; 3) — одна точка'],
        conflicts: [{ text: 'По твоему правилу точки (3; −2) и (−2; 3) — одна и та же, ведь числа те же. Посмотри на рисунок: A справа внизу, а B слева вверху.', ask: 'Это одна и та же точка?', choices: ['нет', 'да'], right: 'нет', verify: () => 3 !== -2, figure: { type: 'coord', points: [{ x: 3, y: -2, label: 'A' }, { x: -2, y: 3, label: 'B' }] } }] },
      { id: 'quadrant-clockwise', title: 'Нумерует четверти по часовой стрелке', kidName: 'Часовщик',
        kidRule: 'ты считаешь четверти по часовой стрелке и поэтому путаешь II и IV',
        say: 'Четверти нумеруют против часовой стрелки: от правой верхней к левой верхней, потом вниз.',
        fixIdea: 'I — справа сверху, II — слева сверху, III — слева снизу, IV — справа снизу.',
        explainOptions: ['II четверть — слева сверху: x < 0, y > 0', 'II четверть — справа снизу: считаем по часовой стрелке', 'II четверть — слева снизу: там оба минуса'],
        conflicts: [{ text: 'Точка (−4; 2) стоит левее и выше нуля. По твоему правилу это IV четверть. Но в IV четверти лежат точки правее и ниже нуля, например (4; −2).', ask: 'В какой четверти точка, которая левее и выше нуля?', choices: ['II', 'IV'], right: 'II', verify: () => quadOf(-4, 2) === 'II', figure: { type: 'coord', points: [{ x: -4, y: 2, label: 'M' }, { x: 4, y: -2, label: 'N' }] } }] },
      { id: 'distance-ignores-sign', title: 'Находит длину отрезка на оси, вычитая модули координат', kidName: 'Срезатель',
        kidRule: 'ты вычитаешь координаты без знаков: от −3 до 5 будто бы 5 − 3 = 2 клетки',
        say: 'Если концы отрезка по разные стороны от нуля, расстояния до нуля складываются: от −3 до 0 — 3 клетки, от 0 до 5 — ещё 5.',
        fixIdea: 'Длина отрезка на прямой — разность координат «большая минус меньшая» со знаками: 5 − (−3) = 8.',
        explainOptions: ['От −3 до 5: 5 − (−3) = 8 клеток', 'От −3 до 5: 5 − 3 = 2 клетки', 'От −3 до 5: −3 + 5 = 2 клетки'],
        conflicts: [{ text: 'Посчитай клетки от −3 до 5: до нуля — 3, после нуля — 5. По твоему правилу всего 2 клетки — меньше, чем один только кусок от 0 до 5.', ask: 'Сколько клеток от −3 до 5?', choices: ['8', '2'], right: '8', verify: () => 5 - (-3) === 8, figure: LINE(-4, 6, [{ x: -3 }, { x: 5 }], [{ from: -3, to: 5, label: '8' }]) }],
        root: 'n5-place' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['read', 'read', 'dist'], ['read', 'which', 'quad', 'quad', 'dist'], ['which', 'quad', 'dist', 'rect', 'rect']));
      const c4 = () => rnd(1, 4) * sg();
      if (kind === 'read') {
        let x, y; do { x = c4(); y = c4(); } while (Math.abs(x) === Math.abs(y) || (x > 0 && y > 0));
        const askX = Math.random() < 0.5, L = pick(['M', 'K', 'P', 'T']), map = Math.random() < 0.5;
        const pts = [{ x, y, label: L }];
        if (lv > 1) { let ox, oy; do { ox = c4(); oy = c4(); } while ((ox === x && oy === y) || (ox === y && oy === x)); pts.push({ x: ox, y: oy, label: 'S' }); }
        const word = askX ? (lv === 1 ? 'координату x (абсциссу)' : 'абсциссу') : (lv === 1 ? 'координату y (ординату)' : 'ординату');
        const right = askX ? x : y, other = askX ? y : x;
        return {
          story: map ? `На карте игры клад отмечен точкой ${L}.` : '',
          question: `Найди ${word} точки ${L}.`, figure: { type: 'coord', points: pts }, answer: ans(right),
          hints: [askX ? 'Абсцисса — первая координата: на сколько клеток точка правее (плюс) или левее (минус) оси y.' : 'Ордината — вторая координата: на сколько клеток точка выше (плюс) или ниже (минус) оси x.',
            `Точка ${L} ${x > 0 ? 'правее' : 'левее'} оси y на ${Math.abs(x)} и ${y > 0 ? 'выше' : 'ниже'} оси x на ${Math.abs(y)}.`],
          solution: `${L}${pt(x, y)}: абсцисса ${num(x)}, ордината ${num(y)}. Ответ: ${num(right)}.`,
          wrongs: W(ans(right), { 'swap-xy': other }), data: { kind, x, y, askX },
        };
      }
      if (kind === 'which') {
        let a, b; do { a = c4(); b = c4(); } while (Math.abs(a) === Math.abs(b));
        const labels = shuffle(['K', 'L', 'M', 'N']), P = [[a, b], [b, a], [-a, b], [a, -b]];
        const pts = P.map(([x, y], i) => ({ x, y, label: labels[i] })).sort((u, v) => u.label.localeCompare(v.label));
        const right = labels[0], swapped = labels[1], treasure = Math.random() < 0.5;
        return {
          story: treasure ? `Пират спрятал клад в точке ${pt(a, b)}.` : '',
          question: treasure ? 'Под какой буквой клад?' : `Какая из отмеченных точек имеет координаты ${pt(a, b)}?`,
          figure: { type: 'coord', points: pts }, answer: right, accept: 'choice', choices: ['K', 'L', 'M', 'N'],
          hints: ['Первое число — сколько клеток вправо (плюс) или влево (минус), второе — вверх или вниз.', `От нуля: ${Math.abs(a)} ${a > 0 ? 'вправо' : 'влево'}, потом ${Math.abs(b)} ${b > 0 ? 'вверх' : 'вниз'}.`],
          solution: `${Math.abs(a)} ${pl(Math.abs(a), 'клетка', 'клетки', 'клеток')} ${a > 0 ? 'вправо' : 'влево'} и ${Math.abs(b)} ${b > 0 ? 'вверх' : 'вниз'} — это точка ${right}.`,
          wrongs: W(right, { 'swap-xy': swapped }), data: { kind, a, b, pts },
        };
      }
      if (kind === 'quad') {
        const M = L3(lv, 6, 12, 40), want = Math.random() < 0.7 ? pick(['II', 'IV']) : pick(['I', 'III']);
        const sx = want === 'I' || want === 'IV' ? 1 : -1, sy = want === 'I' || want === 'II' ? 1 : -1;
        const x = sx * rnd(1, M), y = sy * rnd(1, M), plane = Math.random() < 0.4;
        return {
          story: plane ? `Самолётик в игре стоит в точке ${pt(x, y)}.` : '',
          question: plane ? 'В какой координатной четверти он находится?' : `В какой координатной четверти лежит точка A${pt(x, y)}?`,
          answer: want, accept: 'choice', choices: ROMAN,
          hints: ['Посмотри на знаки: положительный x — справа от оси y, отрицательный — слева; положительный y — сверху, отрицательный — снизу. Четверти считают против часовой стрелки от правой верхней.', `Точка ${x > 0 ? 'справа' : 'слева'} и ${y > 0 ? 'сверху' : 'снизу'}.`],
          solution: `x ${x > 0 ? 'положительный' : 'отрицательный'}, y ${y > 0 ? 'положительный' : 'отрицательный'}: точка ${x > 0 ? 'справа' : 'слева'} ${y > 0 ? 'сверху' : 'снизу'} — это ${want} четверть.`,
          wrongs: W(want, { 'quadrant-clockwise': clockwise(want) }), data: { kind, x, y },
        };
      }
      if (kind === 'dist') {
        const M = L3(lv, 6, 9, 15);
        let p, q; do { p = -rnd(1, M); q = rnd(1, M); } while (p === -q);
        if (Math.random() < 0.5) [p, q] = [q, p];
        const horiz = Math.random() < 0.5, c = rnd(1, 5) * sg(), scale = lv === 1 ? 1 : pick([1, 10, 100]);
        const A = horiz ? [p, c] : [c, p], B = horiz ? [q, c] : [c, q];
        const right = Math.abs(q - p) * scale, wrong = Math.abs(Math.abs(q) - Math.abs(p)) * scale;
        const camp = scale > 1;
        return {
          story: camp ? `На карте лагеря палатка стоит в точке A${pt(...A)}, а костёр — в точке B${pt(...B)}. Одна клетка — ${num(scale)} м.` : '',
          question: camp ? 'Сколько метров от палатки до костра?' : `Найди длину отрезка AB, если A${pt(...A)} и B${pt(...B)}.`,
          figure: { type: 'coord', points: [{ x: A[0], y: A[1], label: 'A' }, { x: B[0], y: B[1], label: 'B' }] }, answer: ans(right),
          hints: [`У точек одинаковые ${horiz ? 'ординаты — отрезок горизонтальный' : 'абсциссы — отрезок вертикальный'}. Его длина — разность ${horiz ? 'абсцисс' : 'ординат'}: большая минус меньшая.`,
            `${num(Math.max(p, q))} − ${sign(Math.min(p, q))} = ${num(Math.abs(q - p))} ${pl(Math.abs(q - p), 'клетка', 'клетки', 'клеток')}.`],
          solution: `${num(Math.max(p, q))} − ${sign(Math.min(p, q))} = ${num(Math.abs(q - p))}${camp ? `; ${num(Math.abs(q - p))} · ${num(scale)} = ${num(right)} м` : ''}. Ответ: ${num(right)}.`,
          wrongs: W(ans(right), { 'distance-ignores-sign': wrong }), data: { kind, A, B, scale },
        };
      }
      // rect: прямоугольник с вершинами в разных четвертях
      let x1, x2, y1, y2;
      do { x1 = -rnd(1, 6); x2 = rnd(1, 6); y1 = -rnd(1, 5); y2 = rnd(1, 5); } while (x1 === -x2 || y1 === -y2);
      const w = x2 - x1, h = y2 - y1, kw = Math.abs(x2 + x1), kh = Math.abs(y2 + y1), area = Math.random() < 0.5;
      const right = area ? w * h : 2 * (w + h), wrong = area ? kw * kh : 2 * (kw + kh);
      const V4 = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
      return {
        story: `Вершины прямоугольника ABCD: ${V4.map((v, i) => 'ABCD'[i] + pt(...v)).join(', ')}.`,
        question: area ? 'Найди его площадь (одна клетка — единица площади).' : 'Найди его периметр (сторона клетки — единица длины).',
        figure: { type: 'coord', points: V4.map((v, i) => ({ x: v[0], y: v[1], label: 'ABCD'[i] })) }, answer: ans(right),
        hints: ['Длина стороны AB — разность абсцисс точек B и A, длина стороны BC — разность ординат точек C и B (большая минус меньшая).', `AB = ${num(x2)} − ${sign(x1)} = ${w}, BC = ${num(y2)} − ${sign(y1)} = ${h}.`],
        solution: `AB = ${w}, BC = ${h}. ${area ? `S = ${w} · ${h} = ${right}` : `P = 2 · (${w} + ${h}) = ${right}`}.`,
        wrongs: W(ans(right), { 'distance-ignores-sign': wrong }), data: { kind, x1, x2, y1, y2, area },
      };
    },
    verify(t) {
      const d = t.data;
      switch (d.kind) {
        case 'read': return eq(+t.answer, d.askX ? d.x : d.y);
        case 'which': { const p = d.pts.find(u => u.x === d.a && u.y === d.b); return !!p && p.label === t.answer; }
        case 'quad': return ROMAN[(d.y > 0 ? (d.x > 0 ? 0 : 1) : d.x < 0 ? 2 : 3)] === t.answer;
        case 'dist': return eq(+t.answer, Math.hypot(d.B[0] - d.A[0], d.B[1] - d.A[1]) * d.scale);
        case 'rect': { let cells = 0; for (let i = d.x1; i < d.x2; i++) for (let j = d.y1; j < d.y2; j++) cells++; return eq(+t.answer, d.area ? cells : 2 * ((d.x2 - d.x1) + (d.y2 - d.y1))); }
      }
      return false;
    },
  };

  /* =========================================================
     6. e6-substitute — значение буквенного выражения
     ========================================================= */
  const LET = ['a', 'b', 'c', 'm', 'n', 'x', 'y'];
  const sq = s => `${s}<sup>2</sup>`;

  const substitute = {
    id: 'e6-substitute', strand: 'Буквенные выражения', short: 'Подставь число',
    title: 'Значение буквенного выражения',
    frp: ['Применение букв для записи математических выражений и предложений', 'Буквенные выражения и числовые подстановки'],
    goal: 'Находить значение буквенного выражения: подставлять числа (и отрицательные — в скобках) и считать по порядку действий.',
    requires: ['z6-muldiv', 'n5-order'],
    explain: {
      model: 'Такси берёт 50 ₽ за посадку и 20 ₽ за каждый километр. Сколько стоит поездка на s км? Формула: 50 + 20s. Поездка на 7 км: подставляем s = 7 и считаем по порядку действий: 50 + 20 · 7 = 50 + 140 = 190 ₽. Буква — это окошко, куда кладут число.',
      rule: `<ul class="rule-list"><li><b>3a</b> значит 3 · a: между числом и буквой спрятан знак умножения. При a = 4: 3a = 3 · 4 = 12, а не 34.</li><li>Отрицательное число подставляй <b>в скобках</b>: ${sq('x')} при x = −3 — это (−3)<sup>2</sup> = 9; 10 − x при x = −3 — это 10 − (−3) = 13.</li><li><b>−${sq('x')}</b> — это −(${sq('x')}): сначала квадрат, потом минус. При x = −3: −(−3)<sup>2</sup> = −9.</li><li>Считай <b>по порядку действий</b>: степень, потом умножение и деление, потом сложение и вычитание.</li></ul>`,
      examples: [
        { q: 'Найди значение выражения 3a при a = 4.', choices: ['12', '34', '7'], correct: 0, wrong: { 1: 'concat-coef' },
          steps: ['3a — это 3 · a.', '3 · 4 = 12.'] },
        { q: 'Поездка на такси стоит 50 + 20s рублей, где s — километры. Сколько стоит поездка на 7 км?', choices: ['190 ₽', '490 ₽'], correct: 0, wrong: { 1: 'order-left-to-right' },
          steps: ['Подставляем s = 7: 50 + 20 · 7.', 'Сначала умножение: 20 · 7 = 140. Потом сложение: 50 + 140 = 190 ₽.'] },
        { q: `Найди значение ${sq('x')} при x = −3.`, choices: ['9', '−9'], correct: 0, wrong: { 1: 'no-brackets' },
          steps: ['Подставляем в скобках: (−3)<sup>2</sup> = (−3) · (−3).', 'Минус на минус — плюс: 9.'] },
      ],
    },
    mistakes: [
      { id: 'concat-coef', title: 'Приписывает число к коэффициенту вместо умножения: 3a при a = 4 → 34', kidName: 'Приклейка',
        kidRule: 'ты приклеиваешь число к коэффициенту: 3a при a = 4 становится 34',
        say: 'Между числом и буквой спрятан знак умножения: 3a — это 3 · a.',
        fixIdea: '3a = 3 · a: коэффициент умножают на значение буквы.',
        explainOptions: ['3a = 3 · a = 12', '3a при a = 4 — это число из цифр 3 и 4, то есть 34', '3a = 3 + a = 7'],
        conflicts: [{ text: 'Тетрадь стоит a = 4 ₽. Три тетради стоят 3a рублей. По твоему правилу — 34 ₽. Но три тетради по 4 ₽ — это 4 + 4 + 4.', ask: 'Сколько стоят 3 тетради по 4 ₽?', choices: ['12 ₽', '34 ₽'], right: '12 ₽', verify: () => 3 * 4 === 4 + 4 + 4 }] },
      { id: 'no-brackets', title: 'Подставляет отрицательное число без скобок', kidName: 'Бесскобочник',
        kidRule: 'ты подставляешь отрицательное число без скобок, и минус теряется или прилипает не туда: x² при x = −3 даёт −9',
        say: 'Отрицательное число подставляй в скобках: (−3)² = (−3) · (−3) = 9, а 10 − (−3) = 13.',
        fixIdea: 'Вместо буквы ставь число в скобках — вместе с его знаком.',
        explainOptions: ['x² при x = −3: (−3) · (−3) = 9', 'x² при x = −3: −3² = −9', 'x² при x = −3: −3 · 2 = −6'],
        conflicts: [{ text: 'x² — это x · x. При x = −3 это (−3) · (−3) — минус на минус. По твоему правилу получилось −9.', ask: 'Какой знак у произведения (−3) · (−3)?', choices: ['плюс', 'минус'], right: 'плюс', verify: () => (-3) * (-3) === 9 }],
        root: 'z6-muldiv' },
      { id: 'square-with-minus', title: 'Возводит в квадрат вместе с минусом перед буквой: −x² как (−x)²', kidName: 'Квадратный минус',
        kidRule: 'ты возводишь в квадрат вместе с минусом, который стоит перед x: −x² при x = −3 получается 9',
        say: 'В записи −x² квадрат относится только к x, а минус ставится после: −x² = −(x · x).',
        fixIdea: 'Сначала возведи x в квадрат, потом поставь минус перед результатом.',
        explainOptions: ['−x² при x = −3: −((−3) · (−3)) = −9', '−x² при x = −3: (−(−3))² = 9', '−x² при x = −3: минус на минус — плюс, будет 9'],
        conflicts: [{ text: '−x² — это число, противоположное x². А x² никогда не бывает отрицательным, значит, −x² никогда не бывает положительным. По твоему правилу при x = −3 получилось 9.', ask: 'Может ли −x² быть положительным?', choices: ['нет', 'да'], right: 'нет', verify: () => -((-3) ** 2) < 0 }],
        root: 'n5-power' },
      { id: 'order-left-to-right', title: 'Считает слева направо, забывая про порядок действий', kidName: 'Слева-направо',
        kidRule: 'ты считаешь подряд слева направо: 50 + 20 · 7 = 70 · 7 = 490',
        say: 'Умножение выполняют раньше сложения: сначала 20 · 7, потом прибавляй 50.',
        fixIdea: 'Сначала степень, потом умножение и деление, потом сложение и вычитание.',
        explainOptions: ['50 + 20 · 7 = 50 + 140 = 190', '50 + 20 · 7 = 70 · 7 = 490', '50 + 20 · 7 = 50 + 27 = 77'],
        conflicts: [{ text: 'Такси: 50 ₽ за посадку и 20 ₽ за каждый километр. За 7 км по твоему правилу 490 ₽ — будто за посадку тоже заплатили 7 раз.', ask: 'Сколько раз платят за посадку?', choices: ['один раз', '7 раз'], right: 'один раз', verify: () => 50 + 20 * 7 === 190 }],
        root: 'n5-order' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['coef', 'coef', 'ltr', 'square'], ['coef2', 'ltr', 'negsub', 'square', 'negsq'], ['ltr', 'negsub', 'negsq', 'poly', 'poly']));
      const L = pick(LET);
      if (kind === 'coef') {
        const k = rnd(2, 9), v = rnd(2, 9), res = k * v, shop = Math.random() < 0.5;
        const item = pick([['тетрадь', 'тетради', 'тетрадей'], ['ручка', 'ручки', 'ручек'], ['булочка', 'булочки', 'булочек']]);
        return {
          story: shop ? `Одна ${item[0]} стоит ${L} рублей. Тогда ${k} ${pl(k, item[0], item[1], item[2])} стоят ${k}${L} рублей.` : '',
          question: shop ? `Сколько это рублей, если ${L} = ${v}?` : `Найди значение выражения ${k}${L} при ${L} = ${v}.`, answer: ans(res),
          hints: [`${k}${L} — это ${k} · ${L}: между числом и буквой спрятан знак умножения.`, `Подставь: ${k} · ${v}.`],
          solution: `${k}${L} = ${k} · ${v} = ${res}.`,
          wrongs: W(ans(res), { 'concat-coef': Number(`${k}${v}`) }), data: { kind: 'lin', A: 0, B: k, v, sgn: 1 },
        };
      }
      if (kind === 'coef2') {
        const k = rnd(2, 9), v = rnd(2, 9), c = rnd(2, 20), res = c + k * v;
        return {
          story: '', question: `Найди значение выражения ${c} + ${k}${L} при ${L} = ${v}.`, answer: ans(res),
          hints: [`${k}${L} — это ${k} · ${L}. Сначала умножение, потом сложение.`, `${c} + ${k} · ${v} = ${c} + ${k * v}.`],
          solution: `${c} + ${k} · ${v} = ${c} + ${k * v} = ${res}.`,
          wrongs: W(ans(res), { 'concat-coef': c + Number(`${k}${v}`), 'order-left-to-right': (c + k) * v }), data: { kind: 'lin', A: c, B: k, v, sgn: 1 },
        };
      }
      if (kind === 'ltr') {
        const st = pick(lv === 3 ? ['taxi', 'club', 'save', 'save'] : ['taxi', 'club', 'phone']);
        const S = {
          taxi: () => { const A = pick([50, 60, 80, 100]), B = pick([15, 20, 25, 30]), v = rnd(2, 12); return [A, B, v, 1, 's', `Поездка на такси стоит ${A} + ${B}s рублей, где s — число километров.`, `Сколько стоит поездка на ${v} км?`]; },
          club: () => { const A = pick([200, 300, 500]), B = pick([100, 150, 200, 250]), v = rnd(2, 8); return [A, B, v, 1, 'n', `Кружок робототехники: вступительный взнос ${A} ₽ и ${B} ₽ за каждое занятие. За n занятий платят ${A} + ${B}n рублей.`, `Сколько стоят ${v} ${pl(v, 'занятие', 'занятия', 'занятий')}?`]; },
          phone: () => { const A = pick([150, 200, 250, 300]), B = pick([2, 3, 4, 5]), v = rnd(2, 9) * 10; return [A, B, v, 1, 't', `Тариф телефона: ${A} ₽ в месяц и ${B} ₽ за каждую минуту сверх пакета. За месяц платят ${A} + ${B}t рублей, где t — лишние минуты.`, `Сколько придётся заплатить, если t = ${v}?`]; },
          save: () => { const B = pick([50, 100, 150, 200]), v = rnd(2, 6), A = B * v + pick([100, 200, 300, 500]); return [A, B, v, -1, 'k', `У Лены было ${A} ₽. Каждую неделю она тратит на обеды ${B} ₽. Через k недель у неё останется ${A} − ${B}k рублей.`, `Сколько денег останется через ${v} ${pl(v, 'неделю', 'недели', 'недель')}?`]; },
        }[st]();
        const [A, B, v, sgn, letter, story, question] = S, res = A + sgn * B * v, ltr = (A + sgn * B) * v;
        return {
          story, question: `${question} Ответ в рублях.`, answer: ans(res),
          hints: [`Подставь ${letter} = ${v}. Помни: сначала умножение, потом ${sgn > 0 ? 'сложение' : 'вычитание'}.`, `${A} ${sgn > 0 ? '+' : '−'} ${B} · ${v} = ${A} ${sgn > 0 ? '+' : '−'} ${B * v}.`],
          solution: `${A} ${sgn > 0 ? '+' : '−'} ${B} · ${v} = ${A} ${sgn > 0 ? '+' : '−'} ${B * v} = ${num(res)} ₽.`,
          wrongs: W(ans(res), { 'order-left-to-right': ltr }), data: { kind: 'lin', A, B, v, sgn },
        };
      }
      if (kind === 'negsub') {
        const c = rnd(2, 20), v = rnd(2, 15), k = lv === 3 ? rnd(2, 6) : 1, res = c + k * v;
        const e = `${c} − ${k > 1 ? k : ''}${L}`;
        return {
          story: '', question: `Найди значение выражения ${e} при ${L} = ${num(-v)}.`, answer: ans(res),
          hints: ['Подставь отрицательное число в скобках.', `${c} − ${k > 1 ? `${k} · ` : ''}(${num(-v)}) = ${c} + ${num(k * v)}.`],
          solution: `${c} − ${k > 1 ? `${k} · ` : ''}(${num(-v)}) = ${c} + ${num(k * v)} = ${num(res)}.`,
          wrongs: W(ans(res), { 'no-brackets': c - k * v }), data: { kind: 'lin', A: c, B: -k, v: -v, sgn: 1 },
        };
      }
      if (kind === 'square') {
        const v = rnd(2, L3(lv, 6, 9, 12)), res = v * v;
        return {
          story: '', question: `Найди значение выражения ${sq(L)} при ${L} = ${num(-v)}.`, answer: ans(res),
          hints: [`${sq(L)} — это ${L} · ${L}. Подставь число вместе со знаком, в скобках.`, `(${num(-v)})<sup>2</sup> = (${num(-v)}) · (${num(-v)}) — минус на минус.`],
          solution: `(${num(-v)})<sup>2</sup> = (${num(-v)}) · (${num(-v)}) = ${res}.`,
          wrongs: W(ans(res), { 'no-brackets': -res }), data: { kind: 'quad', a: 1, b: 0, c: 0, v: -v },
        };
      }
      if (kind === 'negsq') {
        const v = rnd(2, 9), x = lv === 3 && Math.random() < 0.4 ? v : -v, res = -v * v;
        return {
          story: '', question: `Найди значение выражения −${sq(L)} при ${L} = ${num(x)}.`, answer: ans(res),
          hints: [`−${sq(L)} = −(${sq(L)}): сначала возведи в квадрат, потом поставь минус.`, `${sq(L)} = ${x < 0 ? `(${num(x)})` : num(x)}<sup>2</sup> = ${v * v}.`],
          solution: `${x < 0 ? `(${num(x)})` : num(x)}<sup>2</sup> = ${v * v}, а −${sq(L)} = −${v * v}.`,
          wrongs: W(ans(res), { 'square-with-minus': v * v }), data: { kind: 'quad', a: -1, b: 0, c: 0, v: x },
        };
      }
      // poly (уровень 3)
      const v = rnd(2, 6), k = rnd(2, 9), form = pick(['p1', 'p2', 'p3']);
      if (form === 'p1') {
        const res = v * v + k * v;
        return {
          story: '', question: `Найди значение выражения ${sq(L)} − ${k}${L} при ${L} = ${num(-v)}.`, answer: ans(res),
          hints: [`Подставь ${num(-v)} в скобках в оба места.`, `(${num(-v)})<sup>2</sup> − ${k} · (${num(-v)}) = ${v * v} + ${k * v}.`],
          solution: `(${num(-v)})<sup>2</sup> = ${v * v}; ${k} · (${num(-v)}) = ${num(-k * v)}; ${v * v} − (${num(-k * v)}) = ${res}.`,
          wrongs: W(ans(res), { 'no-brackets': -v * v + k * v }), data: { kind: 'quad', a: 1, b: -k, c: 0, v: -v },
        };
      }
      if (form === 'p2') {
        const res = -v * v - k * v;
        return {
          story: '', question: `Найди значение выражения −${sq(L)} + ${k}${L} при ${L} = ${num(-v)}.`, answer: ans(res),
          hints: [`−${sq(L)} = −(${sq(L)}): сначала квадрат, потом минус. Число подставляй в скобках.`, `−(${num(-v)})<sup>2</sup> = ${num(-v * v)}; ${k} · (${num(-v)}) = ${num(-k * v)}.`],
          solution: `−(${num(-v)})<sup>2</sup> + ${k} · (${num(-v)}) = ${num(-v * v)} + (${num(-k * v)}) = ${num(res)}.`,
          wrongs: W(ans(res), { 'square-with-minus': v * v - k * v }), data: { kind: 'quad', a: -1, b: k, c: 0, v: -v },
        };
      }
      const c = rnd(2, 20), res = c + k * v * v;
      return {
        story: '', question: `Найди значение выражения ${c} + ${k}${sq(L)} при ${L} = ${num(-v)}.`, answer: ans(res),
        hints: ['Порядок действий: степень, потом умножение, потом сложение. Число подставляй в скобках.', `(${num(-v)})<sup>2</sup> = ${v * v}; ${k} · ${v * v} = ${k * v * v}.`],
        solution: `(${num(-v)})<sup>2</sup> = ${v * v}; ${k} · ${v * v} = ${k * v * v}; ${c} + ${k * v * v} = ${res}.`,
        wrongs: W(ans(res), { 'order-left-to-right': (c + k) * v * v, 'no-brackets': c - k * v * v }), data: { kind: 'quad', a: k, b: 0, c, v: -v },
      };
    },
    verify(t) {
      const d = t.data;
      // повторное сложение вместо умножения
      const times = (n, x) => { let s = 0; for (let i = 0; i < Math.abs(n); i++) s += x; return n < 0 ? -s : s; };
      if (d.kind === 'lin') return eq(+t.answer, d.A + d.sgn * times(d.B, d.v));
      return eq(+t.answer, times(d.a, times(d.v, d.v)) + times(d.b, d.v) + d.c);
    },
  };

  /* =========================================================
     7. e6-formulas — P, S, V, s = vt
     ========================================================= */
  const formulas = {
    id: 'e6-formulas', strand: 'Буквенные выражения', short: 'Формулы',
    title: 'Формулы: периметр, площадь, объём, путь',
    frp: ['Формулы; формулы периметра и площади прямоугольника, квадрата, объёма параллелепипеда и куба', 'Буквенные равенства, нахождение неизвестного компонента', 'Решение задач, содержащих зависимости, связывающие величины: скорость, время, расстояние'],
    goal: 'Вычислять по формулам периметра, площади, объёма и пути и находить из формулы неизвестную величину.',
    requires: ['e6-substitute', 'g-area', 't5-motion'],
    explain: {
      model: 'Ты едешь на велосипеде со скоростью 12 км/ч. За 2 часа проедешь 12 · 2 = 24 км — это формула пути s = v · t. Из неё можно найти и время: до бабушки 36 км, значит, ехать t = s : v = 36 : 12 = 3 часа. Формула — готовый рецепт: подставь числа и посчитай.',
      figure: { type: 'rect', a: 6, b: 4, la: '6 см', lb: '4 см' },
      figureCaption: 'Прямоугольник 6 на 4: внутри S = 6 · 4 = 24 клетки, а вокруг P = 2 · (6 + 4) = 20 см',
      rule: `<ul class="rule-list"><li><b>Прямоугольник:</b> S = a · b, P = 2(a + b). <b>Квадрат:</b> S = ${sq('a')} = a · a, P = 4a.</li><li><b>Прямоугольный параллелепипед:</b> V = a · b · c, <b>куб:</b> V = a<sup>3</sup> = a · a · a.</li><li><b>Путь:</b> s = v · t, отсюда v = s : t и t = s : v.</li><li>Если неизвестная величина — <b>множитель</b>, её находят <b>делением</b>: S = a · b, значит, b = S : a.</li><li><b>Единицы должны быть согласованы:</b> скорость в км/ч — время в часах. 30 мин = 0,5 ч.</li></ul>`,
      examples: [
        { q: 'Площадь прямоугольника 48 см², одна сторона 6 см. Найди другую сторону.', fig: { type: 'rect', a: 6, b: 8, la: '6 см', lb: '?' }, choices: ['8 см', '42 см'], correct: 0, wrong: { 1: 'inverse-by-subtract' },
          steps: ['S = a · b, то есть 48 = 6 · b.', 'Неизвестный множитель находим делением: b = 48 : 6 = 8 см.', 'Проверка: 6 · 8 = 48.'] },
        { q: 'Сторона квадрата 7 см. Найди его площадь.', fig: { type: 'rect', a: 7, b: 7, la: '7 см', lb: '7 см' }, choices: ['49 см²', '14 см²', '28 см²'], correct: 0, wrong: { 1: 'square-as-double', 2: 'perimeter-area-mix' },
          steps: ['S = a² = a · a.', '7 · 7 = 49 см².'] },
        { q: 'Самокат едет со скоростью 12 км/ч. Сколько километров он проедет за 30 минут?', choices: ['6 км', '360 км'], correct: 0, wrong: { 1: 'units-mismatch' },
          steps: ['Скорость в км/ч — время переводим в часы: 30 мин = 0,5 ч.', 's = 12 · 0,5 = 6 км.'] },
      ],
    },
    mistakes: [
      { id: 'inverse-by-subtract', title: 'Находит неизвестный множитель вычитанием: из S = ab получает b = S − a', kidName: 'Вычиталка',
        kidRule: 'ты находишь неизвестный множитель вычитанием: b = S − a, t = s − v',
        say: 'Если S = a · b, то b — множитель. Неизвестный множитель находят делением: b = S : a.',
        fixIdea: 'Произведение разделить на известный множитель — получится неизвестный множитель.',
        explainOptions: ['b = S : a, потому что S = a · b', 'b = S − a: убираем a из S', 'b = S + a: переносим a в другую сторону'],
        conflicts: [{ text: 'Прямоугольник 6 на 8: S = 48. По твоему правилу вторая сторона b = 48 − 6 = 42. Проверь: 6 · 42 = 252, а не 48.', ask: 'Подходит b = 42?', choices: ['нет', 'да'], right: 'нет', verify: () => 6 * 42 !== 48 }],
        root: 'f4-table' },
      { id: 'square-as-double', title: 'Путает степень с умножением на показатель: a² = 2a, a³ = 3a', kidName: 'Удвоитель',
        kidRule: 'ты возводишь в степень, умножая на показатель: 7² = 14, 4³ = 12',
        say: 'a² = a · a: число умножают само на себя, а не на 2. И a³ = a · a · a.',
        fixIdea: 'Показатель степени — сколько раз число берут множителем: a² = a · a, a³ = a · a · a.',
        explainOptions: ['7² = 7 · 7 = 49', '7² = 7 · 2 = 14', '7² = 7 + 2 = 9'],
        conflicts: [{ text: 'Квадрат 7 на 7 клеток. По твоему правилу его площадь 7² = 14 клеток. Но в одном только верхнем ряду уже 7 клеток, а рядов — 7.', ask: 'Сколько клеток в квадрате 7 на 7?', choices: ['49', '14'], right: '49', verify: () => 7 * 7 === 49, figure: { type: 'rect', a: 7, b: 7 } }],
        root: 'n5-power' },
      { id: 'units-mismatch', title: 'Подставляет в формулу величины в несогласованных единицах', kidName: 'Минутник',
        kidRule: 'ты подставляешь минуты в формулу со скоростью в км/ч: 12 км/ч за 30 минут — 360 км',
        say: 'Скорость в км/ч — значит, время надо брать в часах. 30 минут — это 0,5 часа.',
        fixIdea: 'Сначала переведи величины в согласованные единицы, потом подставляй в формулу.',
        explainOptions: ['12 км/ч · 0,5 ч = 6 км', '12 км/ч · 30 мин = 360 км', '12 км/ч : 30 мин = 0,4 км'],
        conflicts: [{ text: 'Самокат едет 12 км/ч: за целый час он проезжает 12 км. По твоему правилу за полчаса он проедет 12 · 30 = 360 км — в 30 раз больше, чем за час!', ask: 'Можно ли за полчаса проехать больше, чем за час?', choices: ['нет', 'да'], right: 'нет', verify: () => 12 * 0.5 < 12 }],
        root: 't5-units' },
      { id: 'perimeter-area-mix', title: 'Путает периметр и площадь', kidName: 'Путаник',
        kidRule: 'ты считаешь площадь по формуле периметра или периметр по формуле площади',
        say: 'Периметр — длина забора вокруг фигуры (складываем стороны), площадь — сколько клеток внутри (умножаем стороны).',
        fixIdea: 'P — сумма длин всех сторон, S — число единичных квадратов внутри: S = a · b.',
        explainOptions: ['У прямоугольника 6 на 4 P = 20 см, S = 24 см²', 'P = 6 · 4 = 24 см, S = 2 · (6 + 4) = 20 см²', 'P и S — одно и то же, только единицы разные'],
        conflicts: [{ text: 'Прямоугольник 6 на 4 нарисован на клетках. Площадь — это число клеток внутри. По твоему правилу площадь 2 · (6 + 4) = 20.', ask: 'Сколько клеток внутри?', choices: ['24', '20'], right: '24', verify: () => 6 * 4 === 24, figure: { type: 'rect', a: 6, b: 4 } }],
        root: 'g-area' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['S', 'P', 'sq', 'invS', 'units'], ['S', 'P', 'sq', 'cube', 'invS', 'invT', 'invV', 'units', 'box'], ['units2', 'invS2', 'cube', 'invT', 'sq', 'units']));
      if (kind === 'S' || kind === 'P') {
        let a, b; do { a = rnd(2, L3(lv, 9, 15, 15)); b = rnd(2, L3(lv, 9, 15, 15)); } while (a === b || a * b === 2 * (a + b));
        const S = a * b, P = 2 * (a + b), isS = kind === 'S';
        const st = pick(isS ? ['room', 'bed', 'pure'] : ['fence', 'frame', 'pure']);
        const [story, question, u] = {
          room: [`Пол в комнате — прямоугольник ${a} м на ${b} м.`, 'Сколько квадратных метров линолеума нужно, чтобы застелить пол?', 'м²'],
          bed: [`Грядка имеет форму прямоугольника ${a} м на ${b} м.`, 'Какая у неё площадь? Ответ в м².', 'м²'],
          fence: [`Огород — прямоугольник ${a} м на ${b} м. Его обносят забором.`, 'Сколько метров забора понадобится?', 'м'],
          frame: [`Фотография размером ${a} см на ${b} см. По краю приклеивают ленту.`, 'Сколько сантиметров ленты нужно?', 'см'],
          pure: ['', `Стороны прямоугольника ${a} см и ${b} см. Найди его ${isS ? 'площадь. Ответ в см²' : 'периметр. Ответ в см'}.`, isS ? 'см²' : 'см'],
        }[st];
        const res = isS ? S : P;
        return {
          story, question, figure: { type: 'rect', a, b }, answer: ans(res),
          hints: [isS ? 'Площадь — сколько единичных квадратов внутри: S = a · b.' : 'Периметр — длина всей границы: P = 2(a + b).', isS ? `S = ${a} · ${b}.` : `P = 2 · (${a} + ${b}).`],
          solution: isS ? `S = ${a} · ${b} = ${S} ${u}.` : `P = 2 · (${a} + ${b}) = ${P} ${u}.`,
          wrongs: W(ans(res), { 'perimeter-area-mix': isS ? P : S }), data: { kind, a, b },
        };
      }
      if (kind === 'sq') {
        const a = pick(L3(lv, [3, 5, 6, 7, 8, 9], [3, 5, 6, 7, 8, 9, 10, 11, 12], [11, 12, 13, 14, 15])), S = a * a;
        const tile = Math.random() < 0.5;
        return {
          story: tile ? `Квадратная плитка имеет сторону ${a} см.` : '',
          question: tile ? 'Какова её площадь? Ответ в см².' : `Сторона квадрата ${a} см. Найди его площадь. Ответ в см².`, figure: a <= 12 ? { type: 'rect', a, b: a, la: `${a} см`, lb: `${a} см` } : undefined, answer: ans(S),
          hints: [`Площадь квадрата S = ${sq('a')} = a · a.`, `S = ${a} · ${a}.`],
          solution: `S = ${a}<sup>2</sup> = ${a} · ${a} = ${S} см².`,
          wrongs: W(ans(S), { 'square-as-double': 2 * a, 'perimeter-area-mix': 4 * a }), data: { kind, a },
        };
      }
      if (kind === 'cube') {
        const a = rnd(2, L3(lv, 5, 6, 9)), V3 = a ** 3, box = Math.random() < 0.5;
        return {
          story: box ? `Ящик для игрушек — куб с ребром ${a} дм.` : '',
          question: box ? 'Каков его объём? Ответ в дм³.' : `Ребро куба ${a} см. Найди его объём. Ответ в см³.`, figure: { type: 'box', a, b: a, c: a },
          answer: ans(V3),
          hints: ['Объём куба V = a<sup>3</sup> = a · a · a.', `V = ${a} · ${a} · ${a}.`],
          solution: `V = ${a}<sup>3</sup> = ${a} · ${a} · ${a} = ${V3} ${box ? 'дм³' : 'см³'}.`,
          wrongs: W(ans(V3), { 'square-as-double': 3 * a }), data: { kind, a },
        };
      }
      if (kind === 'box') {
        const [a, b, c] = distinct(3, () => rnd(2, 9)), res = a * b * c;
        return {
          story: `Аквариум — прямоугольный параллелепипед: длина ${a} дм, ширина ${b} дм, высота ${c} дм.`,
          question: 'Сколько литров воды в него войдёт, если налить доверху? (1 дм³ = 1 л)', figure: { type: 'box', a, b, c },
          answer: ans(res),
          hints: ['Объём параллелепипеда V = a · b · c.', `V = ${a} · ${b} · ${c} дм³.`],
          solution: `V = ${a} · ${b} · ${c} = ${res} дм³ = ${res} л.`, wrongs: {}, data: { kind, a, b, c },
        };
      }
      if (kind === 'invS' || kind === 'invS2') {
        let a, b; do { a = rnd(2, 12); b = rnd(2, 12); } while (a === b);
        const S = a * b;
        if (kind === 'invS2') {
          const P = 2 * (a + b);
          return {
            story: `Площадь прямоугольного участка ${S} м², ширина ${a} м.`, question: 'Найди периметр участка. Ответ в метрах.',
            figure: { type: 'rect', a: b, b: a, la: '?', lb: `${a} м` }, answer: ans(P),
            hints: ['Сначала найди длину: S = a · b, значит, неизвестную сторону находят делением.', `Длина: ${S} : ${a} = ${b} м. Теперь P = 2(a + b).`],
            solution: `Длина ${S} : ${a} = ${b} м. P = 2 · (${a} + ${b}) = ${P} м.`,
            wrongs: W(ans(P), { 'inverse-by-subtract': 2 * (a + S - a) }), data: { kind, S, a },
          };
        }
        const st = pick(['bed', 'photo', 'pure']);
        const [story, question] = {
          bed: [`Площадь прямоугольной клумбы ${S} м², её ширина ${a} м.`, 'Какая у клумбы длина? Ответ в метрах.'],
          photo: [`Площадь прямоугольной открытки ${S} см², одна сторона ${a} см.`, 'Найди другую сторону. Ответ в сантиметрах.'],
          pure: ['', `Площадь прямоугольника ${S} см², одна сторона ${a} см. Найди другую сторону. Ответ в сантиметрах.`],
        }[st];
        return {
          story, question, figure: { type: 'rect', a: b, b: a, la: '?', lb: String(a) }, answer: ans(b),
          hints: ['S = a · b. Неизвестная сторона — множитель. Как найти неизвестный множитель?', `${a} · ? = ${S}. Раздели ${S} на ${a}.`],
          solution: `b = S : a = ${S} : ${a} = ${b}. Проверка: ${a} · ${b} = ${S}.`,
          wrongs: W(ans(b), { 'inverse-by-subtract': S - a }), data: { kind, S, a },
        };
      }
      if (kind === 'invT' || kind === 'invV') {
        const tr = pick([['Автобус', [40, 50, 60, 70, 80, 90]], ['Велосипедист', [10, 12, 14, 15, 16, 18]], ['Поезд', [60, 70, 80, 90, 100, 120]]]);
        const v = pick(tr[1]), t = rnd(2, L3(lv, 4, 5, 6)), s = v * t, isT = kind === 'invT';
        return {
          story: isT ? `${tr[0]} едет со скоростью ${v} км/ч. Ему нужно проехать ${s} км.` : `${tr[0]} проехал ${s} км за ${nw(t, WD.hour)}, двигаясь с постоянной скоростью.`,
          question: isT ? 'Сколько часов займёт дорога?' : 'С какой скоростью он ехал? Ответ в км/ч.', answer: ans(isT ? t : v),
          hints: ['s = v · t. Неизвестная величина — множитель, её находят делением.', isT ? `t = s : v = ${s} : ${v}.` : `v = s : t = ${s} : ${t}.`],
          solution: isT ? `t = ${s} : ${v} = ${t} ч. Проверка: ${v} · ${t} = ${s}.` : `v = ${s} : ${t} = ${v} км/ч. Проверка: ${v} · ${t} = ${s}.`,
          wrongs: W(ans(isT ? t : v), { 'inverse-by-subtract': isT ? s - v : s - t }), data: { kind, s, v, t },
        };
      }
      if (kind === 'units') {
        let v, m; do { m = pick([15, 20, 30, 45]); v = rnd(L3(lv, 4, 8, 20), L3(lv, 20, 60, 90)); } while ((v * m) % 60);
        const s = v * m / 60, who = v <= 6 ? 'Пешеход' : v <= 20 ? pick(['Велосипедист', 'Самокат']) : pick(['Автобус', 'Машина']);
        return {
          story: `${who} движется со скоростью ${v} км/ч.`, question: `Сколько километров он ${who === 'Пешеход' ? 'пройдёт' : 'проедет'} за ${m} ${pl(m, 'минуту', 'минуты', 'минут')}?`,
          answer: ans(s),
          hints: ['Скорость дана в км/ч — переведи минуты в часы.', `${m} мин = ${fhtml(F(m, 60))} ч = ${num(m / 60)} ч. Теперь s = v · t.`],
          solution: `${m} мин = ${num(m / 60)} ч. s = ${v} · ${num(m / 60)} = ${num(s)} км.`,
          wrongs: W(ans(s), { 'units-mismatch': v * m }), data: { kind, v, m },
        };
      }
      // units2: скорость по пути и времени в минутах
      let s, m; do { m = pick([10, 12, 15, 20, 30, 40, 45]); s = rnd(2, 40); } while ((s * 60) % m || s * 60 / m > 120 || s * 60 / m < 4);
      const v = s * 60 / m;
      return {
        story: `${pick(['Электричка проехала', 'Велосипедист проехал', 'Моторная лодка проплыла'])} ${s} км за ${m} минут.`,
        question: 'Какой была скорость? Ответ в км/ч.', answer: ans(v),
        hints: ['Скорость нужна в км/ч — значит, время переведи в часы.', `${m} мин = ${fhtml(F(m, 60))} ч. v = s : t = ${s} : ${fhtml(F(m, 60))}.`],
        solution: `${m} мин = ${fhtml(F(m, 60))} ч. v = ${s} : ${fhtml(F(m, 60))} = ${s} · ${fhtml(F(60, m))} = ${v} км/ч.`,
        wrongs: W(ans(v), { 'units-mismatch': s / m, 'inverse-by-subtract': s - m > 0 ? s - m : null }), data: { kind, s, m },
      };
    },
    verify(t) {
      const d = t.data, x = +t.answer;
      switch (d.kind) {
        case 'S': return eq(x, d.a * d.b);
        case 'P': return eq(x, d.a + d.b + d.a + d.b);
        case 'sq': return eq(x, d.a * d.a);
        case 'cube': return eq(x, d.a * d.a * d.a);
        case 'box': return eq(x, d.a * d.b * d.c);
        case 'invS': return eq(x * d.a, d.S);
        case 'invS2': return eq(x, 2 * d.a + 2 * d.S / d.a);
        case 'invT': return eq(x * d.v, d.s);
        case 'invV': return eq(x * d.t, d.s);
        case 'units': return eq(x * 60, d.v * d.m);
        case 'units2': return eq(x * d.m, d.s * 60);
      }
      return false;
    },
  };

  /* =========================================================
     8. e6-simplify — раскрытие скобок и подобные слагаемые
     ========================================================= */
  const cx = (k, l = 'x') => (k === 1 ? l : k === -1 ? '−' + l : `${num(k)}${l}`);
  const lin = (k, c, l = 'x') => { // kx + c красиво; 18 − x вместо −x + 18
    if (k < 0 && c > 0) return `${num(c)} − ${cx(-k, l)}`;
    const parts = []; if (k) parts.push(cx(k, l)); if (c) parts.push(parts.length ? `${c > 0 ? '+' : '−'} ${num(Math.abs(c))}` : num(c));
    return parts.length ? parts.join(' ') : '0';
  };
  const ASK_C = 'В ответ запиши слагаемое без буквы (число).';

  const simplify = {
    id: 'e6-simplify', strand: 'Буквенные выражения', short: 'Скобки, подобные',
    title: 'Раскрытие скобок и подобные слагаемые',
    frp: ['Свойства арифметических действий', 'Буквенные выражения и числовые подстановки'],
    goal: 'Раскрывать скобки (и перед которыми стоит минус), приводить подобные слагаемые.',
    requires: ['e6-substitute', 'n5-props', 'z6-addsub'],
    explain: {
      model: 'В рюкзаке 3 яблока и 2 груши, мама положила ещё 4 яблока. Сколько каких фруктов? 7 яблок и 2 груши — никто не скажет «9 яблогруш». С буквами так же: 3a + 2b + 4a = 7a + 2b. Складывать можно только подобные слагаемые — с одинаковой буквенной частью.',
      rule: `<ul class="rule-list"><li><b>Подобные слагаемые</b> — с одинаковой буквенной частью: 3a и 4a, 5x и −x. Складываем только коэффициенты: 3a + 4a = 7a, 5x − x = 4x. Буква остаётся та же, без квадрата.</li><li>2a и 3b — не подобные: <b>2a + 3b</b> так и остаётся.</li><li><b>Множитель перед скобкой</b> умножаем на каждое слагаемое в скобках: 3(x + 2) = 3x + 6.</li><li><b>Минус перед скобкой</b> меняет знак каждого слагаемого в скобках: −(a − 3) = −a + 3.</li></ul>`,
      examples: [
        { q: 'Упрости выражение 3a + 2b + 4a.', choices: ['7a + 2b', '9ab', '7a² + 2b'], correct: 0, wrong: { 1: 'unlike-terms-combined', 2: 'like-terms-square' },
          steps: ['Подобные: 3a и 4a. 3a + 4a = 7a.', '2b не с чем складывать. Ответ: 7a + 2b.'] },
        { q: 'Раскрой скобки: 10 − (x − 3).', choices: ['13 − x', '7 − x'], correct: 0, wrong: { 1: 'minus-bracket-first-only' },
          steps: ['Минус перед скобкой меняет знак у обоих слагаемых: 10 − x + 3.', 'Числа: 10 + 3 = 13. Ответ: 13 − x.'] },
        { q: 'Раскрой скобки: 4(x + 5).', choices: ['4x + 20', '4x + 5'], correct: 0, wrong: { 1: 'distribute-first-only' },
          steps: ['4 умножаем на каждое слагаемое: 4 · x + 4 · 5.', 'Ответ: 4x + 20.'] },
      ],
    },
    mistakes: [
      { id: 'minus-bracket-first-only', title: 'Меняет знак только у первого слагаемого в скобках после минуса', kidName: 'Полуминус',
        kidRule: 'ты меняешь знак только у первого числа в скобках: −(a − 3) = −a − 3',
        say: 'Минус перед скобкой меняет знак у каждого слагаемого в скобках, а не только у первого.',
        fixIdea: '−(a − 3) = −a + 3: знак меняется у всех слагаемых в скобках.',
        explainOptions: ['10 − (x − 3) = 10 − x + 3', '10 − (x − 3) = 10 − x − 3', '10 − (x − 3) = 10 + x − 3'],
        conflicts: [{ text: 'Проверь на числах: пусть x = 5. 10 − (5 − 3) = 10 − 2 = 8. По твоему правилу 10 − 5 − 3 = 2.', ask: 'Чему равно 10 − (5 − 3)?', choices: ['8', '2'], right: '8', verify: () => 10 - (5 - 3) === 8 }],
        root: 'n5-props' },
      { id: 'unlike-terms-combined', title: 'Складывает неподобные слагаемые: 2a + 3b = 5ab', kidName: 'Склейка',
        kidRule: 'ты складываешь всё подряд, даже разные буквы и числа: 2a + 3b = 5ab, 7x + 2 = 9x',
        say: 'Складывать можно только слагаемые с одинаковой буквенной частью. 2a и 3b — как яблоки и груши.',
        fixIdea: 'Складывай коэффициенты только у подобных слагаемых, остальное переписывай как есть.',
        explainOptions: ['2a + 3b упростить нельзя', '2a + 3b = 5ab', '2a + 3b = 5a + 5b'],
        conflicts: [{ text: 'Проверь на числах: a = 2, b = 3. 2a + 3b = 4 + 9 = 13. По твоему правилу 5ab = 5 · 2 · 3 = 30.', ask: 'Одно и то же ли 2a + 3b и 5ab?', choices: ['нет', 'да'], right: 'нет', verify: () => 2 * 2 + 3 * 3 !== 5 * 2 * 3 }] },
      { id: 'like-terms-square', title: 'При сложении подобных слагаемых возводит букву в квадрат: 3x + 2x = 5x²', kidName: 'Квадратик',
        kidRule: 'ты складываешь подобные слагаемые и ставишь квадрат: 3x + 2x = 5x²',
        say: 'Складывая подобные слагаемые, складывают только коэффициенты. Буква остаётся такой же: 3 яблока + 2 яблока = 5 яблок.',
        fixIdea: '3x + 2x = (3 + 2)x = 5x. Квадрат x² появляется только при умножении x · x.',
        explainOptions: ['3x + 2x = 5x', '3x + 2x = 5x²', '3x + 2x = 6x²'],
        conflicts: [{ text: 'Проверь при x = 10: 3 · 10 + 2 · 10 = 50. По твоему правилу 5x² = 5 · 100 = 500.', ask: 'Чему равно 3x + 2x при x = 10?', choices: ['50', '500'], right: '50', verify: () => 3 * 10 + 2 * 10 === 50 }] },
      { id: 'distribute-first-only', title: 'Умножает множитель перед скобкой только на первое слагаемое', kidName: 'Забывашка',
        kidRule: 'ты умножаешь число перед скобкой только на первое слагаемое: 3(x + 2) = 3x + 2',
        say: 'Множитель перед скобкой умножается на каждое слагаемое в скобках.',
        fixIdea: 'a(b + c) = ab + ac — как 3 пакета, в каждом x яблок и 2 груши: груш тоже 3 · 2.',
        explainOptions: ['3(x + 2) = 3x + 6', '3(x + 2) = 3x + 2', '3(x + 2) = 3x + 5'],
        conflicts: [{ text: 'Три пакета, в каждом x яблок и 2 груши: 3(x + 2). Груш во всех пакетах 3 · 2 = 6. По твоему правилу 3x + 2 — будто груши лежат только в одном пакете.', ask: 'Сколько груш в трёх пакетах?', choices: ['6', '2'], right: '6', verify: () => 3 * 2 === 6 }],
        root: 'n5-props' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['minusBr', 'distr', 'like'], ['minusBr', 'distr', 'like', 'likeChoice', 'unlike', 'unlikeChoice'], ['combo', 'combo', 'unlike', 'minusBr2', 'unlikeChoice']));
      if (kind === 'minusBr') {
        const c = rnd(2, L3(lv, 12, 20, 20)), d = rnd(1, 9), form = pick(['m1', 'm1', 'm3']);
        const e = form === 'm1' ? `${c} − (x − ${d})` : `−(x − ${d}) + ${c}`, res = c + d;
        return {
          story: '', question: `Раскрой скобки и упрости: ${e}. ${ASK_C}`, answer: ans(res),
          hints: ['Минус перед скобкой меняет знак у каждого слагаемого в скобках.', form === 'm1' ? `${c} − (x − ${d}) = ${c} − x + ${d}.` : `−(x − ${d}) = −x + ${d}.`],
          solution: `${form === 'm1' ? `${c} − x + ${d}` : `−x + ${d} + ${c}`} = ${lin(-1, res)}. Без буквы: ${res}.`,
          wrongs: W(ans(res), { 'minus-bracket-first-only': c - d }), data: { kind: 'expr', k: -1, cst: res, q: 'c', src: { t: 'mb', c, d } },
        };
      }
      if (kind === 'distr') {
        const k = rnd(2, 9), d = rnd(1, 9) * sg(), c = rnd(1, 20) * sg(), res = k * d + c;
        const e = `${k}(x ${d > 0 ? '+' : '−'} ${Math.abs(d)}) ${c > 0 ? '+' : '−'} ${Math.abs(c)}`;
        const story = lv === 1 && d > 0 && c > 0 && Math.random() < 0.4;
        return {
          story: story ? `В каждом из ${k} пакетов лежат x яблок и ${d} ${pl(d, 'груша', 'груши', 'груш')}, а ещё ${c} ${pl(c, 'груша', 'груши', 'груш')} лежат отдельно. Всего фруктов ${e}.` : '',
          question: story ? 'Раскрой скобки. Сколько всего груш (слагаемое без буквы)?' : `Раскрой скобки и упрости: ${e}. ${ASK_C}`, answer: ans(res),
          hints: [`${k} умножь на каждое слагаемое в скобках.`, `${k}(x ${d > 0 ? '+' : '−'} ${Math.abs(d)}) = ${k}x ${d > 0 ? '+' : '−'} ${Math.abs(k * d)}.`],
          solution: `${k}x ${d > 0 ? '+' : '−'} ${Math.abs(k * d)} ${c > 0 ? '+' : '−'} ${Math.abs(c)} = ${lin(k, res)}. Без буквы: ${num(res)}.`,
          wrongs: W(ans(res), { 'distribute-first-only': d + c }), data: { kind: 'expr', k, cst: res, q: 'c', src: { t: 'd', k, d, c } },
        };
      }
      if (kind === 'like') {
        let a, b; do { a = rnd(2, 9); b = rnd(1, 8); } while (a === b);
        const minus = Math.random() < 0.4 && a > b, v = rnd(2, 5), k = minus ? a - b : a + b, res = k * v;
        const e = `${a}x ${minus ? '−' : '+'} ${cx(b)}`;
        return {
          story: '', question: `Упрости выражение ${e} и найди его значение при x = ${v}.`, answer: ans(res),
          hints: ['Слагаемые подобные: сложи (вычти) коэффициенты, буква останется такой же.', `${e} = ${cx(k)}.`],
          solution: `${e} = ${cx(k)}; при x = ${v}: ${k} · ${v} = ${res}.`,
          wrongs: W(ans(res), { 'like-terms-square': k * v * v }), data: { kind: 'expr', k, cst: 0, q: 'v', v },
        };
      }
      if (kind === 'likeChoice') {
        let a, b; do { a = rnd(2, 9); b = rnd(2, 9); } while (a === b || a + b === a * b);
        const right = cx(a + b), sqw = `${a + b}x²`;
        return {
          story: '', question: `Упрости выражение ${a}x + ${b}x.`, answer: right, accept: 'choice',
          choices: opts(right, [sqw, `${a * b}x²`, cx(a * b)]),
          hints: ['Подобные слагаемые: складываем только коэффициенты, буквенная часть не меняется.', `${a} + ${b} = ${a + b}.`],
          solution: `${a}x + ${b}x = (${a} + ${b})x = ${right}.`,
          wrongs: W(right, { 'like-terms-square': sqw }), data: { kind: 'choiceLike', a, b },
        };
      }
      if (kind === 'unlike') {
        const a = rnd(2, 9), b = rnd(2, 9), c = rnd(2, 15), res = a + b;
        const e = `${a}x + ${c} + ${b}x`;
        return {
          story: '', question: `Приведи подобные слагаемые: ${e}. Чему равен коэффициент при x?`, answer: ans(res),
          hints: ['Подобные здесь — только слагаемые с буквой x. Число без буквы к ним не прибавляют.', `${a}x + ${b}x = ?`],
          solution: `${a}x + ${b}x = ${res}x, число ${c} остаётся отдельно: ${res}x + ${c}. Коэффициент ${res}.`,
          wrongs: W(ans(res), { 'unlike-terms-combined': a + b + c }), data: { kind: 'expr', k: res, cst: c, q: 'k' },
        };
      }
      if (kind === 'unlikeChoice') {
        const [a, b, c] = distinct(3, () => rnd(2, 9));
        const right = `${a + c}x + ${b}y`, wr = `${a + b + c}xy`, sqw = `${a + c}x² + ${b}y`;
        return {
          story: '', question: `Упрости выражение ${a}x + ${b}y + ${c}x.`, answer: right, accept: 'choice',
          choices: opts(right, [wr, sqw, `${a + b + c}x`]),
          hints: ['Подобные — только слагаемые с одинаковой буквой.', `${a}x и ${c}x — подобные, ${b}y — нет.`],
          solution: `${a}x + ${c}x = ${a + c}x, а ${b}y так и остаётся: ${right}.`,
          wrongs: W(right, { 'unlike-terms-combined': wr, 'like-terms-square': sqw }), data: { kind: 'choiceUnlike', a, b, c },
        };
      }
      if (kind === 'minusBr2') {
        const c = rnd(2, 15), a = rnd(2, 6), d = rnd(1, 9), b = rnd(1, 9), v = rnd(1, 4) * sg();
        const e = `${c} − (${a}x − ${d}) + ${cx(b)}`, k = b - a, cst = c + d, res = k * v + cst;
        return {
          story: '', question: `Упрости выражение ${e} и найди его значение при x = ${num(v)}.`, answer: ans(res),
          hints: ['Раскрой скобки: минус меняет знак у каждого слагаемого. Потом приведи подобные.', `${c} − ${a}x + ${d} + ${cx(b)} = ${lin(k, cst)}.`],
          solution: `${c} − ${a}x + ${d} + ${cx(b)} = ${lin(k, cst)}; при x = ${num(v)}: ${num(k)} · ${sign(v)} + ${cst} = ${num(res)}.`,
          wrongs: W(ans(res), { 'minus-bracket-first-only': k * v + c - d }), data: { kind: 'expr', k, cst, q: 'v', v },
        };
      }
      // combo: k(ax − d) − (bx − c) — слагаемое без буквы
      const k = rnd(2, 5), a = rnd(1, 4), d = rnd(1, 6), b = rnd(1, 9), c = rnd(1, 9), cst = c - k * d, kk = k * a - b;
      const e = `${k}(${cx(a)} − ${d}) − (${cx(b)} − ${c})`;
      return {
        story: '', question: `Раскрой скобки и упрости: ${e}. ${ASK_C}`, answer: ans(cst),
        hints: ['Множитель перед скобкой умножь на каждое слагаемое, а минус перед скобкой меняет знак у каждого слагаемого.', `${cx(k * a)} − ${k * d} − ${cx(b)} + ${c}.`],
        solution: `${cx(k * a)} − ${k * d} − ${cx(b)} + ${c} = ${lin(kk, cst)}. Без буквы: ${num(cst)}.`,
        wrongs: W(ans(cst), { 'distribute-first-only': c - d, 'minus-bracket-first-only': -k * d - c }), data: { kind: 'expr', k: kk, cst, q: 'c', src: { t: 'combo', k, a, d, b, c } },
      };
    },
    verify(t) {
      const d = t.data;
      if (d.kind === 'choiceLike') return t.answer === cx(d.a + d.b);
      if (d.kind === 'choiceUnlike') return t.answer === `${d.a + d.c}x + ${d.b}y`;
      // независимо: значение исходного выражения при двух x даёт коэффициент и свободный член
      let f = null; const s = d.src;
      if (s && s.t === 'mb') f = x => s.c - (x - s.d);
      if (s && s.t === 'd') f = x => s.k * (x + s.d) + s.c;
      if (s && s.t === 'combo') f = x => s.k * (s.a * x - s.d) - (s.b * x - s.c);
      if (f) { const cst = f(0), k = f(1) - f(0); if (!eq(cst, d.cst) || !eq(k, d.k)) return false; }
      const x = +t.answer;
      return d.q === 'c' ? eq(x, d.cst) : d.q === 'k' ? eq(x, d.k) : eq(x, d.k * d.v + d.cst);
    },
  };

  /* =========================================================
     9. t6-charts — столбчатые и круговые диаграммы
     ========================================================= */
  const KIDS = [['Аня', 'f'], ['Боря', 'm'], ['Вика', 'f'], ['Гоша', 'm'], ['Дима', 'm'], ['Ева', 'f']];
  const DAYS = [['Пн', 'в понедельник'], ['Вт', 'во вторник'], ['Ср', 'в среду'], ['Чт', 'в четверг'], ['Пт', 'в пятницу'], ['Сб', 'в субботу']];
  const CLASSES = ['5А', '5Б', '5В', '5Г', '5Д'];
  const PIES = [
    { ask: 'Ребят спросили, какой вид спорта им нравится больше всего.', intro: N => `Ребят спросили, какой вид спорта им нравится больше всего. Опросили ${nw(N, WD.person)}.`, unit: WD.person, items: [['Футбол', 'футбол'], ['Плавание', 'плавание'], ['Хоккей', 'хоккей'], ['Теннис', 'теннис'], ['Гимнастика', 'гимнастику']], q: it => `Сколько человек выбрали ${it}?`, more: (a, b) => `На сколько человек больше выбрали ${a}, чем ${b}?`, N: [20, 40, 60, 80, 120, 200, 300] },
    { intro: N => `Семья потратила на поездку ${num(N)} ₽. Круговая диаграмма показывает, на что ушли деньги.`, unit: ['рубль', 'рубля', 'рублей'], items: [['Дорога', 'дорогу'], ['Жильё', 'жильё'], ['Еда', 'еду'], ['Музеи', 'музеи']], q: it => `Сколько рублей ушло на ${it}?`, more: (a, b) => `На сколько рублей больше ушло на ${a}, чем на ${b}?`, N: [20000, 40000, 60000, 80000] },
    { ask: 'Учеников спросили о любимом предмете.', intro: N => `В школе опросили ${nw(N, ['ученика', 'учеников', 'учеников'])} о любимом предмете.`, unit: WD.person, items: [['Математика', 'математику'], ['Физкультура', 'физкультуру'], ['Рисование', 'рисование'], ['История', 'историю']], q: it => `Сколько учеников выбрали ${it}?`, more: (a, b) => `На сколько учеников больше выбрали ${a}, чем ${b}?`, N: [40, 60, 80, 100, 120, 200] },
  ];
  // проценты: n частей, кратные step, сумма 100, каждая ≥ 10, все разные
  function percents(n, step) {
    for (let t = 0; t < 500; t++) {
      const p = []; let left = 100;
      for (let i = 0; i < n - 1; i++) { const v = rnd(2, Math.floor((left - (n - 1 - i) * 10) / step)) * step; p.push(v); left -= v; }
      p.push(left);
      if (p.every(v => v >= 10) && new Set(p).size === n) return p;
    }
    return n === 3 ? [50, 30, 20] : [40, 30, 20, 10];
  }

  const charts = {
    id: 't6-charts', strand: 'Текстовые задачи', short: 'Диаграммы',
    title: 'Столбчатые и круговые диаграммы',
    frp: ['Представление данных с помощью таблиц и диаграмм. Столбчатые диаграммы: чтение и построение. Чтение круговых диаграмм'],
    goal: 'Читать столбчатые диаграммы с учётом цены деления шкалы и круговые диаграммы с процентами, отвечать на вопросы по ним.',
    requires: ['p6-percent-of', 'n5-place'],
    explain: {
      model: 'Ребята записывали, сколько книг прочитали за лето. Чтобы не считать по таблице, нарисовали столбики: чем выше столбик, тем больше книг. Но высоту надо читать по шкале! Если одна клетка шкалы — 2 книги, а столбик Вики высотой 4 клетки, Вика прочитала не 4, а 4 · 2 = 8 книг.',
      figure: { type: 'bars6', items: [{ label: 'Аня', v: 6 }, { label: 'Боря', v: 10 }, { label: 'Вика', v: 8 }, { label: 'Гоша', v: 4 }], step: 2, unit: 'книги' },
      figureCaption: 'Одна клетка шкалы — 2 книги. Вика прочитала 8 книг',
      rule: '<ul class="rule-list"><li><b>Столбчатая диаграмма:</b> сначала найди цену одного деления шкалы, потом читай высоту столбика по шкале, а не в клетках.</li><li>«<b>На сколько больше</b>» — это разность значений двух столбиков, а не значение большего.</li><li><b>Круговая диаграмма</b> показывает доли целого: весь круг — 100 %. Проценты — это не количество! Чтобы найти количество, возьми процент от целого: 25 % от 40 человек — это 40 · 0,25 = 10 человек.</li></ul>',
      examples: [
        { q: 'На диаграмме одна клетка шкалы — 2 книги. Сколько книг прочитала Вика?', fig: { type: 'bars6', items: [{ label: 'Аня', v: 6 }, { label: 'Боря', v: 10 }, { label: 'Вика', v: 8 }, { label: 'Гоша', v: 4 }], step: 2, unit: 'книги' }, choices: ['8', '4'], correct: 0, wrong: { 1: 'scale-ignored' },
          steps: ['Столбик Вики доходит до деления с подписью 8.', 'Клеток 4, но каждая клетка — 2 книги: 4 · 2 = 8.'] },
        { q: 'На сколько книг больше прочитал Боря, чем Аня?', fig: { type: 'bars6', items: [{ label: 'Аня', v: 6 }, { label: 'Боря', v: 10 }, { label: 'Вика', v: 8 }, { label: 'Гоша', v: 4 }], step: 2, unit: 'книги' }, choices: ['4', '10'], correct: 0, wrong: { 1: 'diff-as-value' },
          steps: ['Боря — 10 книг, Аня — 6.', '«На сколько больше» — вычитаем: 10 − 6 = 4.'] },
        { q: 'Опросили 40 ребят. Футбол выбрали 25 %. Сколько человек выбрали футбол?', fig: { type: 'pie6', items: [{ label: 'Футбол', p: 25 }, { label: 'Плавание', p: 45 }, { label: 'Хоккей', p: 30 }] }, choices: ['10', '25'], correct: 0, wrong: { 1: 'pie-share-as-count' },
          steps: ['25 % — это доля, четверть всех опрошенных.', '40 : 4 = 10 человек.'] },
      ],
    },
    mistakes: [
      { id: 'scale-ignored', title: 'Считает клетки, не учитывая цену деления шкалы', kidName: 'Клеточник',
        kidRule: 'ты считаешь, сколько клеток в столбике, и забываешь, что одна клетка шкалы — это не 1',
        say: 'Посмотри на подписи шкалы: одна клетка может означать 2, 5, 10 и больше. Читай высоту столбика по шкале.',
        fixIdea: 'Сначала найди цену деления шкалы, потом умножь на неё число клеток (или просто читай подпись шкалы).',
        explainOptions: ['Столбик в 4 клетки при цене деления 5 — это 20', 'Столбик в 4 клетки — это всегда 4', 'Подписи шкалы — для красоты, считать надо клетки'],
        conflicts: [{ text: 'Шкала подписана 0, 10, 20, 30, 40. Столбик доходит до подписи 30, в нём 3 клетки. По твоему правилу значение столбика — 3.', ask: 'Какое число написано на шкале у верхушки столбика?', choices: ['30', '3'], right: '30', verify: () => 3 * 10 === 30, figure: { type: 'bars6', items: [{ label: 'Пн', v: 30 }, { label: 'Вт', v: 40 }], step: 10 } }],
        root: 'n5-place' },
      { id: 'diff-as-value', title: 'На вопрос «на сколько больше» отвечает значением большего столбика', kidName: 'Высотник',
        kidRule: 'ты на вопрос «на сколько больше» называешь значение самого высокого столбика',
        say: '«На сколько больше» — это разность: из большего значения вычти меньшее.',
        fixIdea: '«На сколько больше (меньше)» — всегда вычитание: большее минус меньшее.',
        explainOptions: ['Боря 10, Аня 6: на 10 − 6 = 4 книги больше', 'Боря прочитал больше на 10 книг, ведь у него 10', 'На сколько больше — это 10 + 6 = 16'],
        conflicts: [{ text: 'Боря прочитал 10 книг, Аня — 6. По твоему правилу Боря прочитал на 10 книг больше. Тогда у Ани было бы 10 − 10 = 0 книг, а у неё 6!', ask: 'На сколько книг больше прочитал Боря?', choices: ['4', '10'], right: '4', verify: () => 10 - 6 === 4 }] },
      { id: 'pie-share-as-count', title: 'Принимает процент на круговой диаграмме за количество', kidName: 'Процентик',
        kidRule: 'ты думаешь, что 25 % на круговой диаграмме — это 25 человек',
        say: 'Проценты на круговой диаграмме — это доли от всех. Чтобы найти количество, возьми этот процент от общего числа.',
        fixIdea: 'p % от N — это N · p : 100. 25 % от 40 — это 10.',
        explainOptions: ['25 % от 40 человек — это 10 человек', '25 % — это 25 человек', '25 % от 40 — это 40 − 25 = 15 человек'],
        conflicts: [{ text: 'Опросили всего 20 человек. Футбол выбрали 30 %. По твоему правилу футбол выбрали 30 человек — больше, чем опросили!', ask: 'Может ли выбрать футбол больше людей, чем опросили?', choices: ['нет', 'да'], right: 'нет', verify: () => 20 * 30 / 100 < 20, figure: { type: 'pie6', items: [{ label: 'Футбол', p: 30 }, { label: 'Плавание', p: 70 }] } }],
        root: 'part-of' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['read', 'read', 'diff', 'pie'], ['read', 'diff', 'diff', 'pie', 'piediff'], ['diff', 'total', 'maxdiff', 'pie', 'piediff', 'pieother']));
      if (kind.startsWith('pie')) {
        const S = pick(PIES), n = pick([3, 4]), ps = percents(n, L3(lv, 10, 5, 5));
        const goodN = S.N.filter(x => ps.every(p => (x * p) % 100 === 0)), N = pick(goodN.length ? goodN : [100]);
        const its = shuffle(S.items).slice(0, n), fig = { type: 'pie6', items: its.map((it, i) => ({ label: it[0], p: ps[i] })) };
        const cnt = i => N * ps[i] / 100;
        if (kind === 'pie') {
          const i = rnd(0, n - 1), res = cnt(i);
          return {
            story: S.intro(N), question: S.q(its[i][1]), figure: fig, answer: ans(res),
            hints: [`На диаграмме проценты — доли от всех. ${its[i][0]} — ${ps[i]} %. Найди ${ps[i]} % от ${num(N)}.`, `${num(N)} : 100 · ${ps[i]}.`],
            solution: `${ps[i]} % от ${num(N)}: ${num(N)} : 100 · ${ps[i]} = ${num(res)}.`,
            wrongs: W(ans(res), { 'pie-share-as-count': ps[i] }), data: { kind, N, ps, i },
          };
        }
        if (kind === 'piediff') {
          let i, j; do { i = rnd(0, n - 1); j = rnd(0, n - 1); } while (i === j || ps[i] < ps[j]);
          const res = cnt(i) - cnt(j);
          return {
            story: S.intro(N), question: S.more(its[i][1], its[j][1]), figure: fig, answer: ans(res),
            hints: [`Разница в долях: ${ps[i]} % − ${ps[j]} % = ${ps[i] - ps[j]} %. Но это проценты, а нужно количество.`, `${ps[i] - ps[j]} % от ${num(N)}: ${num(N)} : 100 · ${ps[i] - ps[j]}.`],
            solution: `${ps[i]} % − ${ps[j]} % = ${ps[i] - ps[j]} %; ${num(N)} : 100 · ${ps[i] - ps[j]} = ${num(res)}.`,
            wrongs: W(ans(res), { 'pie-share-as-count': ps[i] - ps[j], 'diff-as-value': cnt(i) }), data: { kind, N, ps, i, j },
          };
        }
        // pieother: известно количество для одного сектора — найти для другого
        let i, j; do { i = rnd(0, n - 1); j = rnd(0, n - 1); } while (i === j);
        const res = cnt(j), people = S.unit === WD.person;
        return {
          story: people ? `${S.ask} ${its[i][1][0].toUpperCase() + its[i][1].slice(1)} выбрали ${nw(cnt(i), WD.person)}.` : `Круговая диаграмма показывает, на что ушли деньги семьи в поездке. На ${its[i][1]} потратили ${num(cnt(i))} ₽.`,
          question: people ? `Сколько человек выбрали ${its[j][1]}?` : `Сколько рублей потратили на ${its[j][1]}?`, figure: fig, answer: ans(res),
          hints: [`${num(cnt(i))} — это ${ps[i]} % от всего. Найди сначала целое (100 %).`, `Всего: ${num(cnt(i))} : ${ps[i]} · 100 = ${num(N)}. Теперь найди ${ps[j]} % от ${num(N)}.`],
          solution: `Всего ${num(cnt(i))} : ${ps[i]} · 100 = ${num(N)}; ${ps[j]} % от ${num(N)} = ${num(res)}.`,
          wrongs: W(ans(res), { 'pie-share-as-count': ps[j] }), data: { kind, N, ps, i, j, given: cnt(i) },
        };
      }
      // столбчатые
      const step = pick(L3(lv, [2, 5, 10], [5, 10, 20], [20, 25, 50])), n = pick([4, 5]);
      const cells = Array.from({ length: n }, () => rnd(1, L3(lv, 8, 9, 10)));
      const vals = cells.map(c => c * step), st = pick(['books', 'ice', 'paper']);
      const labs = st === 'books' ? KIDS.slice(0, n) : st === 'ice' ? DAYS.slice(0, n) : CLASSES.slice(0, n).map(c => [c]);
      const fig = { type: 'bars6', items: labs.map((l, k) => ({ label: l[0], v: vals[k] })), step, unit: { books: 'книги', ice: 'порции', paper: 'кг' }[st] };
      const story = { books: 'Диаграмма показывает, сколько книг прочитали ребята за лето.', ice: 'Диаграмма показывает, сколько порций мороженого продало кафе за каждый день.', paper: 'Диаграмма показывает, сколько килограммов макулатуры собрали классы.' }[st];
      const who = k => (st === 'books' ? labs[k][0] : st === 'ice' ? labs[k][1] : labs[k][0]);
      const readQ = k => ({ books: `Сколько книг прочитал${labs[k][1] === 'f' ? 'а' : ''} ${labs[k][0]}?`, ice: `Сколько порций мороженого продали ${labs[k][1]}?`, paper: `Сколько килограммов макулатуры собрал ${labs[k][0]}?` })[st];
      const diffQ = (i, j) => ({ books: `На сколько книг больше прочитал${labs[i][1] === 'f' ? 'а' : ''} ${labs[i][0]}, чем ${labs[j][0]}?`, ice: `На сколько порций больше продали ${labs[i][1]}, чем ${labs[j][1]}?`, paper: `На сколько килограммов больше собрал ${labs[i][0]}, чем ${labs[j][0]}?` })[st];
      const scaleHint = `Сначала найди цену одного деления шкалы: подписи идут через ${num(step)}.`;
      if (kind === 'read') {
        const k = rnd(0, n - 1);
        return {
          story, question: readQ(k), figure: fig, answer: ans(vals[k]),
          hints: [scaleHint, `Столбик «${labs[k][0]}» высотой ${cells[k]} ${pl(cells[k], 'клетка', 'клетки', 'клеток')}, каждая клетка — ${num(step)}.`],
          solution: `${cells[k]} · ${num(step)} = ${num(vals[k])}: столбик доходит до деления ${num(vals[k])}.`,
          wrongs: W(ans(vals[k]), { 'scale-ignored': cells[k] }), data: { kind, cells, step, k },
        };
      }
      if (kind === 'diff') {
        let i, j, t = 0; do { i = rnd(0, n - 1); j = rnd(0, n - 1); } while ((i === j || cells[i] <= cells[j]) && t++ < 100);
        if (cells[i] <= cells[j]) { cells[i] = cells[j] + 1; vals[i] = cells[i] * step; fig.items[i].v = vals[i]; }
        const res = vals[i] - vals[j];
        return {
          story, question: diffQ(i, j), figure: fig, answer: ans(res),
          hints: [`${scaleHint} Потом найди оба значения и вычти.`, `«${labs[i][0]}» — ${num(vals[i])}, «${labs[j][0]}» — ${num(vals[j])}.`],
          solution: `${num(vals[i])} − ${num(vals[j])} = ${num(res)}.`,
          wrongs: W(ans(res), { 'diff-as-value': vals[i], 'scale-ignored': cells[i] - cells[j] }), data: { kind, cells, step, i, j },
        };
      }
      if (kind === 'total') {
        const res = vals.reduce((s, v) => s + v, 0), cs = cells.reduce((s, v) => s + v, 0);
        const q = { books: 'Сколько книг ребята прочитали всего?', ice: 'Сколько порций мороженого продали за все эти дни?', paper: 'Сколько килограммов макулатуры собрали все классы вместе?' }[st];
        return {
          story, question: q, figure: fig, answer: ans(res),
          hints: [`${scaleHint} Найди значение каждого столбика.`, `${vals.map(num).join(' + ')}.`],
          solution: `${vals.map(num).join(' + ')} = ${num(res)}.`,
          wrongs: W(ans(res), { 'scale-ignored': cs }), data: { kind, cells, step },
        };
      }
      // maxdiff
      if (Math.max(...cells) === Math.min(...cells)) { cells[0] = cells[0] === 1 ? 2 : 1; vals[0] = cells[0] * step; fig.items[0].v = vals[0]; }
      const hi = Math.max(...vals), lo = Math.min(...vals), res = hi - lo;
      const q = { books: 'На сколько книг больше всех прочитавший опередил того, кто прочитал меньше всех?', ice: 'На сколько порций в самый удачный день продали больше, чем в самый неудачный?', paper: 'На сколько килограммов класс-победитель собрал больше, чем класс, собравший меньше всех?' }[st];
      return {
        story, question: q, figure: fig, answer: ans(res),
        hints: [`${scaleHint} Найди самый высокий и самый низкий столбики.`, `Наибольшее — ${num(hi)}, наименьшее — ${num(lo)}.`],
        solution: `${num(hi)} − ${num(lo)} = ${num(res)}.`,
        wrongs: W(ans(res), { 'diff-as-value': hi, 'scale-ignored': (hi - lo) / step }), data: { kind, cells, step },
      };
    },
    verify(t) {
      const d = t.data, x = +t.answer;
      if (d.kind.startsWith('pie')) {
        if (!eq(d.ps.reduce((s, p) => s + p, 0), 100)) return false;
        const part = p => d.N / 100 * p;
        if (d.kind === 'pie') return eq(x, part(d.ps[d.i]));
        if (d.kind === 'piediff') return eq(x, part(d.ps[d.i]) - part(d.ps[d.j]));
        return eq(x, d.given / d.ps[d.i] * d.ps[d.j]);
      }
      const v = d.cells.map(c => c * d.step);
      if (d.kind === 'read') return eq(x, v[d.k]);
      if (d.kind === 'diff') return eq(x, v[d.i] - v[d.j]);
      if (d.kind === 'total') return eq(x, d.step * d.cells.reduce((s, c) => s + c, 0));
      return eq(x, d.step * (Math.max(...d.cells) - Math.min(...d.cells)));
    },
  };

  /* =========================================================
     10. t6-estimate — прикидка и оценка результата
     ========================================================= */
  const approx = x => `≈ ${num(x)}`;
  const big1 = () => rnd(6, 9); // дробная часть, при которой округление вверх отличается от отбрасывания

  const estimate = {
    id: 't6-estimate', strand: 'Текстовые задачи', short: 'Прикидка',
    title: 'Прикидка и оценка результата',
    frp: ['Оценка и прикидка, округление результата', 'Арифметические действия с обыкновенными и десятичными дробями'],
    goal: 'Прикидывать результат действий с десятичными дробями, округляя числа, и по прикидке замечать неверный ответ.',
    requires: ['d5-round', 'd5-mult'],
    explain: {
      model: 'В магазине черешня стоит 389 ₽ за килограмм, ты берёшь 2,1 кг. Касса показала 8 169 ₽. Ошибка? Прикинь: 389 — почти 400, 2,1 — почти 2. Значит, около 400 · 2 = 800 ₽. Чек в 10 раз больше — кассир поставил запятую не там. Верно: 816,9 ₽.',
      rule: '<ul class="rule-list"><li><b>Прикидка:</b> округли числа до удобных (до целых, десятков, сотен) и посчитай в уме — получится примерный ответ.</li><li><b>Округление до целых:</b> смотри на первую цифру после запятой: 0–4 — вниз, 5–9 — вверх. 3,9 ≈ 4, а не 3.</li><li>Умножение на число <b>меньше 1</b> уменьшает: 48 · 0,8 = 38,4 — меньше 48. Деление на число меньше 1 увеличивает: 12 : 0,4 = 30 — больше 12.</li><li>Если точный ответ далеко от прикидки (в 10 раз больше или меньше) — ищи ошибку с запятой.</li></ul>',
      examples: [
        { q: 'Примерно сколько будет 3,9 · 6,8?', choices: ['≈ 28', '≈ 18', '≈ 280'], correct: 0, wrong: { 1: 'truncate-not-round', 2: 'decimal-shift' },
          steps: ['Округляем до целых: 3,9 ≈ 4, 6,8 ≈ 7.', '4 · 7 = 28. Точно: 26,52 — близко к прикидке.'] },
        { q: 'Килограмм яблок стоит 120 ₽. Ты берёшь 0,8 кг. Заплатишь больше или меньше 120 ₽?', choices: ['меньше 120 ₽', 'больше 120 ₽'], correct: 0, wrong: { 1: 'mult-makes-bigger' },
          steps: ['0,8 кг — меньше килограмма.', 'Значит, и заплатишь меньше, чем за целый килограмм: 120 · 0,8 = 96 ₽.'] },
      ],
    },
    mistakes: [
      { id: 'mult-makes-bigger', title: 'Считает, что умножение всегда увеличивает, а деление уменьшает', kidName: 'Увеличитель',
        kidRule: 'ты думаешь, что после умножения число всегда становится больше, а после деления — меньше',
        say: 'Умножить на число меньше 1 — значит взять только часть: результат меньше. А разделить на число меньше 1 — результат больше.',
        fixIdea: 'Сравни множитель (делитель) с 1: умножение на число меньше 1 уменьшает, деление на него — увеличивает.',
        explainOptions: ['48 · 0,5 — это половина 48, то есть меньше 48', '48 · 0,5 больше 48: умножение всегда увеличивает', '48 · 0,5 = 48: на десятичную дробь число не меняется'],
        conflicts: [{ text: '48 · 0,5 — это половина от 48. По твоему правилу умножение всегда увеличивает, значит, половина от 48 больше 48.', ask: 'Половина от 48 больше 48?', choices: ['нет, меньше', 'да, больше'], right: 'нет, меньше', verify: () => 48 * 0.5 < 48 }],
        root: 'd5-mult' },
      { id: 'decimal-shift', title: 'Не замечает ошибку в порядке величины при умножении десятичных', kidName: 'Скакун-запятая',
        kidRule: 'ты не замечаешь, что ответ в 10 раз больше, чем должен быть: 4,8 · 2,1 = 100,8 кажется тебе нормальным',
        say: 'Прикинь: 4,8 — почти 5, а 2,1 — почти 2. Значит, ответ около 10, а не 100.',
        fixIdea: 'Перед точным счётом округли множители и прикинь ответ — так видно, где должна стоять запятая.',
        explainOptions: ['4,8 · 2,1 ≈ 5 · 2 = 10, поэтому верно 10,08', '4,8 · 2,1 = 100,8: цифры же правильные', '4,8 · 2,1 = 1,008: после запятой надо три знака'],
        conflicts: [{ text: '4,8 меньше 5, а 2,1 чуть больше 2. Значит, 4,8 · 2,1 — около 5 · 2 = 10. По твоему правилу вышло 100,8 — в 10 раз больше.', ask: 'Может ли 4,8 · 2,1 быть больше 100?', choices: ['нет', 'да'], right: 'нет', verify: () => 4.8 * 2.1 < 100 }],
        root: 'd5-mult' },
      { id: 'truncate-not-round', title: 'Отбрасывает дробную часть вместо округления', kidName: 'Обрубыш',
        kidRule: 'ты «округляешь», просто отбрасывая цифры после запятой: 3,9 ≈ 3',
        say: 'Округлить до целых — найти ближайшее целое. 3,9 ближе к 4, чем к 3.',
        fixIdea: 'Смотри на первую цифру после запятой: 5 и больше — округляй вверх.',
        explainOptions: ['3,9 ≈ 4: до 4 всего 0,1', '3,9 ≈ 3: всё после запятой отбрасываем', '3,9 ≈ 3,0: округляем до десятых'],
        conflicts: [{ text: 'От 3,9 до 4 — всего 0,1, а до 3 — целых 0,9. По твоему правилу 3,9 ≈ 3.', ask: 'К какому целому ближе 3,9?', choices: ['к 4', 'к 3'], right: 'к 4', verify: () => Math.abs(3.9 - 4) < Math.abs(3.9 - 3) }],
        root: 'd5-round' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['rsum', 'rsum', 'rprod'], ['bigger', 'approx', 'rprod', 'which', 'claim'], ['bigger', 'approx', 'which', 'claim', 'rsum']));
      if (kind === 'rsum') {
        const n = lv === 3 ? 4 : 3, st = pick(['shop', 'route', 'pure']), top = st === 'shop' ? 199 : L3(lv, 9, 9, 99);
        let xs; do { xs = Array.from({ length: n }, () => R(rnd(st === 'shop' ? 19 : 1, top) + rnd(1, 9) / 10)); } while (xs.filter(x => R(x % 1) >= 0.5).length < 1);
        const list = u => xs.slice(0, -1).map(x => num(x) + u).join(', ') + ' и ' + num(xs[n - 1]) + u;
        const rs = xs.map(x => Math.round(x)), res = rs.reduce((s, v) => s + v, 0), tr = xs.map(Math.floor).reduce((s, v) => s + v, 0);
        const story = { shop: `Цены товаров в корзине: ${list(' ₽')}.`, route: `Маршрут похода состоит из ${n} участков: ${list(' км')}.`, pure: '' }[st];
        return {
          story, question: st === 'pure' ? `Округли каждое число до целых и прикинь сумму: ${xs.map(num).join(' + ')}.` : `Округли каждое число до целых и прикинь, сколько это ${st === 'shop' ? 'рублей' : 'километров'} всего.`,
          answer: ans(res),
          hints: ['Округление до целых: смотри на цифру после запятой. 5 и больше — вверх, меньше 5 — вниз.', `${xs.map(x => `${num(x)} ≈ ${Math.round(x)}`).join('; ')}.`],
          solution: `${rs.join(' + ')} = ${res}. Точная сумма ${num(R(xs.reduce((s, v) => s + v, 0)))} — близко к прикидке.`,
          wrongs: W(ans(res), { 'truncate-not-round': tr }), data: { kind, xs },
        };
      }
      if (kind === 'rprod') {
        const A = rnd(1, 9), B = rnd(2, 9), a = R(A + big1() / 10), b = R(B + rnd(1, 9) / 10);
        const res = Math.round(a) * Math.round(b), tr = A * B;
        return {
          story: '', question: `Округли каждое число до целых и прикинь произведение ${num(a)} · ${num(b)}.`, answer: ans(res),
          hints: ['Округли каждый множитель до ближайшего целого: смотри на первую цифру после запятой.', `${num(a)} ≈ ${Math.round(a)}, ${num(b)} ≈ ${Math.round(b)}.`],
          solution: `${Math.round(a)} · ${Math.round(b)} = ${res}. Точно: ${num(R(a * b))}.`,
          wrongs: W(ans(res), { 'truncate-not-round': tr }), data: { kind, a, b },
        };
      }
      if (kind === 'bigger') {
        const div = lv === 3 && Math.random() < 0.6, d = pick(lv === 2 ? [0.5, 0.8, 0.9, 0.6, 0.4] : [0.3, 0.45, 0.7, 0.25, 0.8, 0.9]), over = !div && Math.random() < 0.15;
        const f = over ? pick([1.2, 1.5, 2.5]) : d, N = rnd(12, 99) * (lv === 3 ? 10 : 1);
        const st = !div && Math.random() < 0.5 ? 'shop' : div && Math.random() < 0.5 ? 'rope' : 'pure';
        const res = div ? N / f : N * f, bigger = res > N;
        const [story, q, cMore, cLess] = st === 'shop'
          ? [`Килограмм ${pick(['черешни', 'сыра', 'орехов', 'винограда'])} стоит ${num(N)} ₽. Ты берёшь ${num(f)} кг.`, `Заплатишь больше или меньше ${num(N)} ₽?`, `больше ${num(N)} ₽`, `меньше ${num(N)} ₽`]
          : st === 'rope'
            ? [`Ленту длиной ${num(N)} м режут на куски по ${num(f)} м.`, `Кусков получится больше или меньше ${num(N)}?`, `больше ${num(N)}`, `меньше ${num(N)}`]
            : ['Не вычисляя точно, сравни.', `${num(N)} ${div ? ':' : '·'} ${num(f)} — больше или меньше ${num(N)}?`, `больше ${num(N)}`, `меньше ${num(N)}`];
        const right = bigger ? cMore : cLess, mmb = div ? cLess : cMore;
        return {
          story, question: q, answer: right, accept: 'choice', choices: [cMore, cLess],
          hints: [`Сравни ${num(f)} с единицей.`, div ? `${num(f)} меньше 1: в ${num(N)} такая маленькая часть помещается больше, чем ${num(N)} раз.` : f < 1 ? `${num(f)} меньше 1 — значит, берём только часть от ${num(N)}.` : `${num(f)} больше 1 — берём больше, чем ${num(N)}.`],
          solution: `${num(N)} ${div ? ':' : '·'} ${num(f)} = ${num(R(res))} — ${bigger ? 'больше' : 'меньше'} ${num(N)}, потому что ${div ? 'делим' : 'умножаем'} на число ${f < 1 ? 'меньше' : 'больше'} 1.`,
          wrongs: W(right, { 'mult-makes-bigger': mmb }), data: { kind, N, f, div, cMore, cLess },
        };
      }
      if (kind === 'approx') {
        const A = lv === 3 ? rnd(10, 30) : rnd(1, 9), B = rnd(2, 9), a = R(A + big1() / 10), b = R(B + big1() / 10);
        const Rr = (A + 1) * (B + 1), T = A * B, right = approx(Rr);
        return {
          story: '', question: `Примерно сколько будет ${num(a)} · ${num(b)}? Округли каждый множитель до целых и выбери прикидку.`, answer: right, accept: 'choice',
          choices: opts(right, [approx(T), approx(Rr * 10), approx(Rr / 10)]),
          hints: ['Округли оба множителя до целых и перемножь в уме.', `${num(a)} ≈ ${A + 1}, ${num(b)} ≈ ${B + 1}.`],
          solution: `${A + 1} · ${B + 1} = ${Rr}. Точно: ${num(R(a * b))} — близко к ${Rr}.`,
          wrongs: W(right, { 'truncate-not-round': approx(T), 'decimal-shift': approx(Rr * 10) }), data: { kind, a, b },
        };
      }
      if (kind === 'which') {
        const a = lv === 3 ? rnd(110, 490) : rnd(12, 99), b = R(rnd(1, 4) + rnd(1, 9) / 10), exact = R(a * b), shop = Math.random() < 0.5;
        const unit = shop ? ' ₽' : '';
        const right = num(exact) + unit, big = num(R(exact * 10)) + unit, small = num(R(exact / 10)) + unit;
        const goods = pick(['черешни', 'сыра', 'конфет']);
        return {
          story: shop ? `Килограмм ${goods} стоит ${num(a)} ₽, ты купил ${num(b)} кг.` : `Петя умножил ${num(a)} на ${num(b)} на калькуляторе, но не запомнил, где стояла запятая.`,
          question: shop ? 'Какая сумма в чеке похожа на правду?' : 'Какой ответ может быть верным?', answer: right, accept: 'choice',
          choices: opts(right, [big, small]),
          hints: [`Округли: ${num(a)} ≈ ${num(a < 100 ? Math.round(a / 10) * 10 : Math.round(a / 100) * 100)}, ${num(b)} ≈ ${Math.round(b)}. Прикинь ответ.`, `Прикидка: около ${num((a < 100 ? Math.round(a / 10) * 10 : Math.round(a / 100) * 100) * Math.round(b))}. Какой вариант ближе всего?`],
          solution: `Прикидка: ${num(a < 100 ? Math.round(a / 10) * 10 : Math.round(a / 100) * 100)} · ${Math.round(b)} = ${num((a < 100 ? Math.round(a / 10) * 10 : Math.round(a / 100) * 100) * Math.round(b))}. Подходит ${right}. Точно: ${num(a)} · ${num(b)} = ${num(exact)}.`,
          wrongs: W(right, { 'decimal-shift': big }), data: { kind, a, b, unit },
        };
      }
      // claim: «Вася получил …» — может ли так быть?
      if (Math.random() < 0.5) {
        const A = rnd(2, 9), B = rnd(2, 9), a = R(A + rnd(1, 9) / 10), b = R(B + rnd(1, 4) / 10), exact = R(a * b), est = Math.round(a) * Math.round(b);
        const yes = 'да, похоже на правду', no = `нет, ответ должен быть около ${num(est)}`, lie = Math.random() < 0.75;
        const claim = lie ? R(exact * 10) : exact;
        return {
          story: `Вася посчитал ${num(a)} · ${num(b)} и получил ${num(claim)}.`, question: 'Похоже ли это на правду?', answer: lie ? no : yes, accept: 'choice',
          choices: [yes, no],
          hints: ['Округли множители до целых и прикинь ответ.', `${num(a)} ≈ ${Math.round(a)}, ${num(b)} ≈ ${Math.round(b)}: прикидка ${est}.`],
          solution: `Прикидка: ${Math.round(a)} · ${Math.round(b)} = ${est}. Точно: ${num(exact)}. ${lie ? `Вася ошибся в 10 раз — запятая не на месте.` : 'Васин ответ верный.'}`,
          wrongs: lie ? { 'decimal-shift': yes } : {}, data: { kind, sub: 'dec', a, b, claim, yes, no },
        };
      }
      const N = rnd(20, 99), f = pick([0.6, 0.7, 0.8, 0.9, 0.5]), claim = N + rnd(3, 20);
      const yes = 'да, может', no = `нет, должно получиться меньше ${num(N)}`;
      return {
        story: `Вася посчитал ${num(N)} · ${num(f)} и получил ${num(claim)}.`, question: 'Может ли так быть?', answer: no, accept: 'choice',
        choices: [yes, no],
        hints: [`Сравни множитель ${num(f)} с единицей.`, `${num(f)} меньше 1 — значит, берём только часть от ${num(N)}.`],
        solution: `${num(f)} < 1, поэтому ${num(N)} · ${num(f)} < ${num(N)}, а у Васи ${num(claim)}. Точно: ${num(R(N * f))}.`,
        wrongs: { 'mult-makes-bigger': yes }, data: { kind, sub: 'mult', N, f, claim, yes, no },
      };
    },
    verify(t) {
      const d = t.data;
      switch (d.kind) {
        case 'rsum': return eq(+t.answer, d.xs.reduce((s, x) => s + Math.floor(x + 0.5 + 1e-9), 0));
        case 'rprod': return eq(+t.answer, Math.floor(d.a + 0.5 + 1e-9) * Math.floor(d.b + 0.5 + 1e-9));
        case 'bigger': return t.answer === ((d.div ? d.f < 1 : d.f > 1) ? d.cMore : d.cLess);
        case 'approx': return t.answer === approx(Math.floor(d.a + 0.5) * Math.floor(d.b + 0.5));
        case 'which': { const v = parse(String(t.answer).replace(/[^\d,.\-−]/g, '')); return eq(v, d.a * d.b) || eq(round(v, 6), round(d.a * d.b, 6)); }
        case 'claim': {
          if (d.sub === 'mult') return t.answer === (d.claim > d.N * d.f && d.f < 1 ? d.no : d.yes);
          const ok = Math.abs(d.claim - d.a * d.b) < 1e-6; return t.answer === (ok ? d.yes : d.no);
        }
      }
      return false;
    },
  };

  K.course({
    id: 'm6b', grade: 6, title: 'Отрицательные числа, выражения и данные, 6 класс',
    topics: [integers, addsub, muldiv, rational, coords, substitute, formulas, simplify, charts, estimate],
  });
})();
