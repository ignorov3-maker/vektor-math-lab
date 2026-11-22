/* =========================================================
   Курс s79: Вероятность и статистика, 7–9 класс.
   Опора: ФРП «Математика. 5–9 классы (базовый уровень)», курс
   «Вероятность и статистика»:
     7 класс — представление данных (таблицы, столбиковые и круговые диаграммы),
       описательная статистика (среднее арифметическое, медиана, размах,
       наибольшее и наименьшее значения), случайный опыт и случайное событие,
       вероятность и частота, монета и игральная кость; графы: вершина, ребро,
       степень вершины, число рёбер и суммарная степень вершин, путь, обход
       графа (эйлеров путь);
     8 класс — множества, объединение и пересечение, круги Эйлера; дерево,
       правило умножения; противоположные события, несовместные события,
       формула сложения вероятностей;
     9 класс — комбинаторика (перестановки, факториал, сочетания), геометрическая
       вероятность, испытания Бернулли, случайная величина и математическое ожидание.
   Ошибки — классические, описанные в методике: «нули в среднем не считаются»,
   «среднее после добавления числа — пополам», медиана без упорядочивания,
   «два исхода — значит 1/2», частота вместо вероятности, n/m вместо m/n,
   сумма степеней = числу рёбер, «эйлеров путь есть всегда», |A ∪ B| = |A| + |B|,
   сложение вместо умножения, P(не A) = P(A), сложение вероятностей совместных
   событий, 0! = 0, размещения вместо сочетаний, p^k без числа сочетаний,
   среднее значений без весов-вероятностей.
   root ошибки — тема 5–6 класса, где родилось неверное правило.
   Формат — docs/content-spec.md. Тексты — черновик на вычитку методисту.
   ========================================================= */
(function () {
  'use strict';
  const K = window.VEKTOR_KIT, { rnd, pick, shuffle, L3, pl, gcd, round, num, ans, fr } = K.h;
  const V = window.VEKTOR_VISUALS;
  const ST = 'Вероятность и статистика';

  /* ---------- Общие помощники ---------- */
  const eq = (a, b) => Math.abs(a - b) < 1e-9;
  const clean2 = x => Number.isFinite(x) && Math.abs(round(x, 2) - x) < 1e-9;
  const sum = a => a.reduce((s, x) => s + x, 0);
  const val = s => { const p = window.VEKTOR_CHECK && window.VEKTOR_CHECK.parse(String(s)); return p && p.kind !== 'sign' ? p.v : NaN; };
  const F = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return [n / g, d / g]; };
  const fs = (n, d) => { const [a, b] = F(n, d); return b === 1 ? String(a) : `${a}/${b}`; };
  const fh = (n, d) => { const [a, b] = F(n, d); return b === 1 ? num(a) : (a < 0 ? '−' : '') + fr(Math.abs(a), b); };
  // доля m/n: десятичной, если хватает двух знаков, иначе — обыкновенной дробью
  const Pa = (m, n) => (clean2(m / n) ? ans(round(m / n, 2)) : fs(m, n));
  const Ph = (m, n) => (clean2(m / n) ? num(round(m / n, 2)) : fh(m, n));
  const isDec = (m, n) => clean2(m / n);
  // accept для ответа-доли
  const Pacc = (m, n) => (isDec(m, n) ? 'exact' : 'equivalent');
  const FRQ = 'Ответ запиши обыкновенной дробью.';
  const pq = (m, n) => (isDec(m, n) ? '' : ' ' + FRQ);
  // wrongs: только правдоподобные значения, не совпадающие с ответом
  function W(answer, obj, choice) {
    const out = {}, a = choice ? answer : val(answer);
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      if (choice) { if (v !== answer) out[k] = v; continue; }
      let x, s;
      if (typeof v === 'string') { x = val(v); s = v; } else { if (!clean2(v)) continue; x = v; s = ans(round(v, 2)); }
      if (!Number.isFinite(x) || Math.abs(x) > 1e5 || eq(x, a)) continue;
      out[k] = s;
    }
    return out;
  }
  // повторять генерацию, пока не получится удачный набор чисел
  function retry(f) { for (let i = 0; i < 2000; i++) { const r = f(); if (r) return r; } throw new Error('s79: не удалось подобрать числа'); }
  const list = a => a.map(num).join(a.every(Number.isInteger) ? ', ' : '; ');
  const plus = a => a.map((x, i) => (i ? (x < 0 ? ' − ' + num(-x) : ' + ' + num(x)) : num(x))).join('');
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const NAMES = [['Петя', 'm', 'Пети'], ['Оля', 'f', 'Оли'], ['Дима', 'm', 'Димы'], ['Аня', 'f', 'Ани'], ['Миша', 'm', 'Миши'], ['Катя', 'f', 'Кати'], ['Саша', 'm', 'Саши'], ['Лена', 'f', 'Лены'], ['Тимур', 'm', 'Тимура'], ['Вика', 'f', 'Вики']];
  const ed = (who, m, f) => (who[1] === 'f' ? f : m);
  const kth = (arr, k) => { // k-е по величине (с нуля) — без сортировки, подсчётом
    for (const v of arr) { const less = arr.filter(x => x < v).length, le = arr.filter(x => x <= v).length; if (less <= k && k < le) return v; }
    return NaN;
  };
  const sorted = a => a.slice().sort((x, y) => x - y);

  /* ---------- Рисунки курса ---------- */
  if (V && V.register) {
    const esc = V.esc || (s => String(s));
    const T = (x, y, s, anchor = 'middle', extra = '') => `<text x="${round(x, 1)}" y="${round(y, 1)}" text-anchor="${anchor}" fill="currentColor" stroke="none" font-size="13"${extra}>${esc(s)}</text>`;
    const G = s => `<g fill="none" stroke="currentColor" stroke-width="2">${s}</g>`;
    const reg = (type, def) => { try { V.register(type, def); } catch (e) { /* уже зарегистрирован */ } };
    const cell = c => (typeof c === 'number' ? num(c) : String(c));

    // Столбчатая диаграмма с подписанными значениями: { items: [{ label, v }], unit }
    reg('bars7', {
      describe: f => `столбчатая диаграмма${f.unit ? ' (' + f.unit + ')' : ''}: ` + (f.items || []).map(i => `${i.label} — ${num(i.v)}`).join(', '),
      render(f) {
        const it = f.items;
        if (!Array.isArray(it) || it.length < 2 || it.length > 10) return '';
        if (it.some(i => !Number.isFinite(i.v) || i.v < 0 || i.v > 1e4)) return '';
        const mx = Math.max(1, ...it.map(i => i.v));
        const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].find(s => mx / s <= 6) || 2500;
        const n = Math.max(1, Math.ceil(mx / step));
        const x0 = 46, x1 = 292, yb = 184, yt = 40, u = (yb - yt) / n, w = (x1 - x0) / it.length, bw = Math.min(36, w * 0.6);
        let s = '';
        for (let k = 0; k <= n; k++) {
          const yy = yb - k * u;
          s += `<line x1="${x0}" y1="${round(yy, 1)}" x2="${x1}" y2="${round(yy, 1)}" opacity="${k ? 0.22 : 1}" stroke-width="${k ? 1 : 2}"/>` + T(x0 - 7, yy + 4, num(k * step), 'end');
        }
        s += `<line x1="${x0}" y1="${yb}" x2="${x0}" y2="${yt - 8}"/>`;
        if (f.unit) s += T(6, 16, f.unit, 'start');
        it.forEach((i, k) => {
          const cx = x0 + w * (k + 0.5), hgt = i.v / step * u;
          if (hgt > 0) s += `<rect x="${round(cx - bw / 2, 1)}" y="${round(yb - hgt, 1)}" width="${round(bw, 1)}" height="${round(hgt, 1)}" fill="currentColor" fill-opacity=".22"/>`;
          s += T(cx, yb - hgt - 6, num(i.v), 'middle', ' font-weight="700"') + T(cx, yb + 19, i.label);
        });
        return V.svgWrap(300, 210, this.describe(f), G(s));
      },
    });

    // Круговая диаграмма; круг размечен на of равных частей: { items: [{ label, parts }], of, deg }
    const OP = [0.04, 0.3, 0.6, 0.15, 'h', 0.45];
    const FILL = k => (OP[k] === 'h' ? 'fill="url(#pie7h)"' : `fill="currentColor" fill-opacity="${OP[k]}"`);
    const HATCH = '<defs><pattern id="pie7h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" stroke-width="2.2" opacity=".6"/></pattern></defs>';
    reg('pie7', {
      describe: f => `круговая диаграмма, круг разделён на ${f.of} равных частей: ` + (f.items || []).map(i => `${i.label} — ${f.deg ? num(i.parts * 360 / f.of) + '°' : i.parts + ' ' + pl(i.parts, 'часть', 'части', 'частей')}`).join(', '),
      render(f) {
        const it = f.items, of = f.of;
        if (!Array.isArray(it) || it.length < 2 || it.length > 6 || ![4, 6, 8, 10, 12].includes(of)) return '';
        if (it.some(i => !Number.isInteger(i.parts) || i.parts <= 0) || sum(it.map(i => i.parts)) !== of) return '';
        const cx = 86, cy = 92, r = 74, A = k => -Math.PI / 2 + k * 2 * Math.PI / of;
        const P = (t, rr = r) => `${round(cx + rr * Math.cos(t), 1)},${round(cy + rr * Math.sin(t), 1)}`;
        let s = '', at = 0;
        it.forEach((i, k) => {
          const a = A(at), b = A(at + i.parts), mid = (a + b) / 2;
          s += `<path d="M${cx},${cy} L${P(a)} A${r},${r} 0 ${i.parts * 2 > of ? 1 : 0} 1 ${P(b)} Z" ${FILL(k)}/>`;
          if (f.deg && i.parts * 360 / of >= 40) s += T(cx + r * 0.6 * Math.cos(mid), cy + r * 0.6 * Math.sin(mid) + 4, num(i.parts * 360 / of) + '°', 'middle', ' font-weight="700"');
          at += i.parts;
        });
        // разметка на равные части: штрихи по краю и пунктир внутри
        const XY = (t, rr) => [round(cx + rr * Math.cos(t), 1), round(cy + rr * Math.sin(t), 1)];
        for (let k = 0; k < of; k++) {
          const [x1, y1] = XY(A(k), r), [x2, y2] = XY(A(k), r + 7);
          s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line x1="${cx}" y1="${cy}" x2="${x1}" y2="${y1}" stroke-width="1" stroke-dasharray="3 4" opacity=".35"/>`;
        }
        const y0 = cy - it.length * 13 + 13;
        it.forEach((i, k) => { const yy = y0 + k * 26; s += `<rect x="178" y="${yy - 10}" width="14" height="14" ${FILL(k)} stroke-width="1.5"/>` + T(198, yy + 2, i.label, 'start'); });
        return V.svgWrap(300, 186, this.describe(f), HATCH + G(s));
      },
    });

    // Таблица: { head: ['', 'Пн', …], rows: [['Пломбир', 3, …], …], first }
    reg('table7', {
      describe: f => 'таблица: ' + [f.head, ...(f.rows || [])].map(r => (r || []).map(cell).join(' | ')).join('; '),
      render(f) {
        const head = f.head, rows = f.rows;
        if (!Array.isArray(head) || head.length < 2 || head.length > 7 || !Array.isArray(rows) || !rows.length || rows.length > 6) return '';
        if (rows.some(r => !Array.isArray(r) || r.length !== head.length || r.some(c => c == null || (typeof c === 'number' && !Number.isFinite(c))))) return '';
        const cols = head.length, c0 = f.first || 84, cw = (296 - c0) / (cols - 1), rh = 28, H = rh * (rows.length + 1);
        let s = `<rect x="2" y="2" width="294" height="${H}" stroke-width="1.5"/>`;
        s += `<rect x="2" y="2" width="294" height="${rh}" fill="currentColor" fill-opacity=".08" stroke="none"/>`;
        for (let k = 1; k <= rows.length; k++) s += `<line x1="2" y1="${2 + k * rh}" x2="296" y2="${2 + k * rh}" stroke-width="${k === 1 ? 1.5 : 1}"/>`;
        for (let j = 0; j < cols - 1; j++) s += `<line x1="${round(2 + c0 + j * cw - (j ? 0 : 2), 1)}" y1="2" x2="${round(2 + c0 + j * cw - (j ? 0 : 2), 1)}" y2="${2 + H}" stroke-width="1"/>`;
        const cx = j => (j === 0 ? 8 : c0 + (j - 0.5) * cw), an = j => (j === 0 ? 'start' : 'middle');
        head.forEach((c, j) => { s += T(cx(j), 2 + rh / 2 + 5, cell(c), an(j), ' font-weight="700"'); });
        rows.forEach((r, i) => r.forEach((c, j) => { s += T(cx(j), 2 + (i + 1) * rh + rh / 2 + 5, cell(c), an(j), j === 0 ? ' font-weight="700"' : ''); }));
        return V.svgWrap(300, H + 4, this.describe(f), G(s));
      },
    });

    // Граф: { v: ['A', 'B', …], e: [[0, 1], …] } — вершины по готовой раскладке
    const LAY = {
      2: [[70, 110], [230, 110]], 3: [[150, 32], [252, 196], [48, 196]], 4: [[64, 42], [236, 42], [236, 190], [64, 190]],
      5: [[150, 26], [262, 98], [220, 208], [80, 208], [38, 98]], 6: [[88, 30], [214, 38], [274, 132], [206, 214], [84, 206], [26, 118]],
      7: [[150, 22], [248, 58], [276, 152], [206, 216], [94, 216], [24, 152], [52, 58]],
    };
    reg('graph7', {
      describe: f => `граф: вершины ${(f.v || []).join(', ')}; рёбра ` + ((f.e || []).length ? f.e.map(([a, b]) => f.v[a] + f.v[b]).join(', ') : 'нет'),
      render(f) {
        const vs = f.v, es = f.e, lay = LAY[vs && vs.length];
        if (!lay || !Array.isArray(es) || es.length > 21) return '';
        const key = new Set();
        for (const e of es) {
          if (!Array.isArray(e) || e.length !== 2 || !(e[0] in lay) || !(e[1] in lay) || e[0] === e[1]) return '';
          const k = Math.min(...e) + '-' + Math.max(...e); if (key.has(k)) return ''; key.add(k);
        }
        let s = es.map(([a, b]) => `<line x1="${lay[a][0]}" y1="${lay[a][1]}" x2="${lay[b][0]}" y2="${lay[b][1]}" stroke-width="2.5"/>`).join('');
        vs.forEach((name, i) => { s += `<circle cx="${lay[i][0]}" cy="${lay[i][1]}" r="13" fill="var(--paper,#fff)"/>` + T(lay[i][0], lay[i][1] + 4.5, name, 'middle', ' font-weight="700"'); });
        return V.svgWrap(300, 236, this.describe(f), G(s));
      },
    });

    // Круги Эйлера: { la, lb, onlyA, both, onlyB, out, lu } — подписи кругов и чисел в областях
    reg('venn8', {
      describe: f => `круги Эйлера: «${f.la}» и «${f.lb}»` + (f.onlyA != null ? `, только первое — ${f.onlyA}` : '') + (f.both != null ? `, общая часть — ${f.both}` : '') + (f.onlyB != null ? `, только второе — ${f.onlyB}` : '') + (f.lu ? `, ${f.lu}` : '') + (f.out != null ? `, вне кругов — ${f.out}` : ''),
      render(f) {
        if (!f.la || !f.lb) return '';
        let s = f.lu ? `<rect x="4" y="4" width="292" height="232" rx="8" stroke-width="1.5"/>` + T(14, 226, f.lu, 'start') : '';
        s += '<circle cx="114" cy="128" r="74" fill="currentColor" fill-opacity=".1"/><circle cx="186" cy="128" r="74" fill="currentColor" fill-opacity=".1"/>';
        s += T(84, 40, f.la, 'middle', ' font-weight="700"') + T(216, 40, f.lb, 'middle', ' font-weight="700"');
        if (f.onlyA != null) s += T(78, 133, String(f.onlyA), 'middle', ' font-weight="700"');
        if (f.both != null) s += T(150, 133, String(f.both), 'middle', ' font-weight="700"');
        if (f.onlyB != null) s += T(222, 133, String(f.onlyB), 'middle', ' font-weight="700"');
        if (f.out != null && f.lu) s += T(270, 226, String(f.out), 'end', ' font-weight="700"');
        return V.svgWrap(300, 240, this.describe(f), G(s));
      },
    });

    // Дерево вариантов из двух шагов: { a: [...], b: [...] } или { a: [...], norep: true }
    reg('tree8', {
      describe: f => `дерево вариантов: первый шаг — ${(f.a || []).join(', ')}; второй шаг — ${f.norep ? 'любой из оставшихся' : (f.b || []).join(', ')}`,
      render(f) {
        const A = f.a;
        if (!Array.isArray(A) || A.length < 2 || A.length > 4) return '';
        const leaves = A.map((_, i) => (f.norep ? A.filter((__, j) => j !== i) : f.b));
        if (leaves.some(l => !Array.isArray(l) || !l.length)) return '';
        const L = sum(leaves.map(l => l.length)); if (L > 12) return '';
        const rh = 19, top = 10, H = top * 2 + L * rh, rootY = H / 2;
        let s = `<circle cx="12" cy="${rootY}" r="4" fill="currentColor"/>`, k = 0;
        A.forEach((a, i) => {
          const y1 = top + (k + leaves[i].length / 2) * rh;
          s += `<line x1="16" y1="${rootY}" x2="76" y2="${round(y1, 1)}" stroke-width="1.5"/>` + T(110, y1 + 4.5, a, 'middle', ' font-weight="700"');
          leaves[i].forEach(b => { const y2 = top + (k + 0.5) * rh; s += `<line x1="146" y1="${round(y1, 1)}" x2="196" y2="${round(y2, 1)}" stroke-width="1.5"/>` + T(202, y2 + 4.5, b, 'start'); k++; });
        });
        return V.svgWrap(300, H, this.describe(f), G(s));
      },
    });
  }

  /* =========================================================
     7 класс. s7-mean — среднее арифметическое
     ========================================================= */
  const MEAN = {
    id: 's7-mean', strand: ST, grade: 7, short: 'Среднее',
    title: 'Среднее арифметическое',
    frp: ['Описательная статистика: среднее арифметическое набора числовых данных', 'Извлечение информации из таблиц и диаграмм, использование и интерпретация данных'],
    goal: 'Находить среднее арифметическое набора чисел — по списку, по таблице, по диаграмме и после добавления нового значения.',
    requires: ['d5-div', 'd5-addsub'],
    explain: {
      model: 'Вратарь школьной команды за 5 матчей пропустил 2, 0, 3, 1 и 4 гола. Если бы он в каждом матче пропускал поровну, сколько было бы за матч? Всего голов 2 + 0 + 3 + 1 + 4 = 10, матчей 5 — по 10 : 5 = 2 гола. Это и есть среднее арифметическое: всё сложили и разложили поровну на все значения.',
      figure: { type: 'bars7', items: [{ label: '1', v: 2 }, { label: '2', v: 0 }, { label: '3', v: 3 }, { label: '4', v: 1 }, { label: '5', v: 4 }], unit: 'голы' },
      figureCaption: 'Пропущенные голы по матчам: сумма 10, матчей 5 — в среднем 2 гола',
      rule: '<ul class="rule-list"><li><b>Среднее арифметическое</b> = сумма всех значений : их количество.</li><li><b>Нули считаются:</b> к сумме они ничего не добавляют, но в количестве участвуют.</li><li><b>Таблица «значение — сколько раз»:</b> сумма — это значение · сколько раз, сложенные по всем столбцам; количество — сумма всех «сколько раз».</li><li><b>Добавили число:</b> сначала верни сумму (старое среднее · старое количество), прибавь новое число и раздели на новое количество.</li></ul>',
      examples: [
        { q: 'Голы за 5 матчей: 2, 0, 3, 1, 4. Сколько голов в среднем за матч?', fig: { type: 'bars7', items: [{ label: '1', v: 2 }, { label: '2', v: 0 }, { label: '3', v: 3 }, { label: '4', v: 1 }, { label: '5', v: 4 }], unit: 'голы' },
          choices: ['2', '2,5'], correct: 0, wrong: { 1: 'mean-skip-zero' },
          steps: ['Сумма: 2 + 0 + 3 + 1 + 4 = 10.', 'Матчей 5 — матч с нулём тоже был сыгран: 10 : 5 = 2.'] },
        { q: 'За 4 контрольные средний балл Оли — 4. За пятую она получила 5. Каким стал средний балл?',
          choices: ['4,2', '4,5', '5,25'], correct: 0, wrong: { 1: 'mean-add-avg', 2: 'mean-wrong-count' },
          steps: ['Сумма четырёх оценок: 4 · 4 = 16.', 'Вместе с пятёркой: 16 + 5 = 21, а оценок теперь 5.', '21 : 5 = 4,2.'] },
      ],
    },
    mistakes: [
      { id: 'mean-wrong-count', title: 'Делит сумму на неверное количество значений', kidName: 'Сбитый счёт',
        kidRule: 'ты делишь сумму не на число всех значений, а на другое число — например, на число столбцов таблицы или на прежнее количество',
        say: 'Делить нужно на количество всех значений: в таблице — на число всех учеников или матчей, а после добавления числа — на новое количество.',
        fixIdea: 'Среднее = сумма всех значений : количество всех значений. Сначала посчитай, сколько значений на самом деле.',
        explainOptions: ['Три пятёрки и одна четвёрка — это 4 оценки, сумму 19 делим на 4', 'В таблице два столбца с оценками — значит, сумму 19 делим на 2', 'Делить можно на любое число — среднее от этого не меняется'],
        conflicts: [{ text: 'У Оли три пятёрки и одна четвёрка: сумма 5 + 5 + 5 + 4 = 19. По твоему правилу делим на число столбцов таблицы («5» и «4»): 19 : 2 = 9,5.', ask: 'Может ли средняя оценка быть больше 5?', choices: ['Нет', 'Да'], right: 'Нет', verify: () => 19 / 2 > 5 && 19 / 4 <= 5,
          figure: { type: 'table7', head: ['Оценка', '5', '4'], rows: [['Сколько', 3, 1]] } }] },
      { id: 'mean-skip-zero', title: 'Не учитывает нулевые значения в количестве', kidName: 'Нуль-невидимка',
        kidRule: 'ты думаешь, что нули можно не считать: они ведь ничего не добавляют к сумме',
        say: 'Ноль не меняет сумму, но это тоже значение: матч без голов всё равно был сыгран. Его нужно посчитать в количестве.',
        fixIdea: 'Нули к сумме ничего не добавляют, но в количестве считаются: делим на число всех значений, вместе с нулями.',
        explainOptions: ['Голы 3, 0, 0: сумма 3, матчей 3 — в среднем 1 гол', 'Голы 3, 0, 0: нули не считаем — в среднем 3 гола', 'Если есть нули, среднее найти нельзя'],
        conflicts: [{ text: 'Команда сыграла 4 матча: в первом забила 4 гола, в остальных трёх — ни одного. По твоему правилу в среднем 4 : 1 = 4 гола за матч. Тогда за 4 матча вышло бы 4 · 4 = 16 голов, а забили всего 4.', ask: 'Сколько голов в среднем за матч забивала команда?', choices: ['1', '4'], right: '1', verify: () => (4 + 0 + 0 + 0) / 4 === 1,
          figure: { type: 'bars7', items: [{ label: '1', v: 4 }, { label: '2', v: 0 }, { label: '3', v: 0 }, { label: '4', v: 0 }], unit: 'голы' } }] },
      { id: 'mean-add-avg', title: 'Находит новое среднее как полусумму старого среднего и нового числа', kidName: 'Половинщик',
        kidRule: 'ты складываешь старое среднее с новым числом и делишь пополам',
        say: 'Старое среднее — итог нескольких значений, а не одно число. Верни сначала их сумму: среднее · количество.',
        fixIdea: 'Новое среднее = (старое среднее · старое количество + новое число) : новое количество.',
        explainOptions: ['Средний балл 4 за 4 работы — это сумма 16; с пятёркой 21 : 5 = 4,2', 'Было 4, добавили 5: (4 + 5) : 2 = 4,5', 'Одно новое число среднее не меняет'],
        conflicts: [{ text: 'Девять ребят сделали в среднем по 10 отжиманий. Пришёл десятый и не сделал ни одного. По твоему правилу новое среднее (10 + 0) : 2 = 5 — как будто половина ребят ничего не сделала. А на самом деле сумма 9 · 10 = 90, ребят 10.', ask: 'Каким стало среднее?', choices: ['9', '5'], right: '9', verify: () => (9 * 10 + 0) / 10 === 9 }] },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['list', 'zeros', 'zeros', 'table', 'add'], ['list', 'zeros', 'table', 'table', 'add', 'add'], ['zeros', 'table', 'add', 'missing', 'missing', 'dec']));
      if (kind === 'list') return retry(() => {
        const st = pick(['grades', 'pages', 'push']), who = pick(NAMES);
        const n = rnd(...L3(lv, [3, 5], [5, 7], [6, 8]));
        const vs = Array.from({ length: n }, () => (st === 'grades' ? rnd(lv === 1 ? 3 : 2, 5) : st === 'pages' ? rnd(L3(lv, 10, 12, 15), L3(lv, 30, 45, 60)) : rnd(8, 30)));
        const S = sum(vs), m = S / n;
        if (!clean2(m) || (lv === 1 && !Number.isInteger(m)) || new Set(vs).size < 2) return null;
        const story = {
          grades: `${who[0]} ${ed(who, 'получил', 'получила')} за неделю по математике оценки: ${list(vs)}.`,
          pages: `${who[0]} ${n} ${pl(n, 'день', 'дня', 'дней')} ${ed(who, 'читал', 'читала')} книгу и записывал${ed(who, '', 'а')}, сколько страниц ${ed(who, 'прочитал', 'прочитала')}: ${list(vs)}.`,
          push: `${who[0]} ${n} ${pl(n, 'день', 'дня', 'дней')} подряд ${ed(who, 'записывал', 'записывала')}, сколько раз ${ed(who, 'отжался', 'отжалась')}: ${list(vs)}.`,
        }[st];
        const q = { grades: 'Найди средний балл.', pages: 'Сколько страниц в среднем в день?', push: 'Сколько отжиманий в среднем в день?' }[st];
        return {
          story, question: q, answer: ans(m),
          hints: ['Сложи все числа, а потом раздели сумму на их количество.', `Сумма: ${plus(vs)} = ${num(S)}. Чисел ${n}.`],
          solution: `${num(S)} : ${n} = ${num(m)}.`, wrongs: {}, data: { kind, vs },
        };
      });
      if (kind === 'zeros') return retry(() => {
        const st = pick(lv === 1 ? ['goals', 'tasks'] : ['goals', 'tasks', 'temp']), who = pick(NAMES);
        const n = st === 'temp' ? 7 : rnd(...L3(lv, [4, 6], [5, 8], [6, 8]));
        const z = rnd(1, Math.min(3, n - 2));
        const hi = st === 'goals' ? L3(lv, 4, 5, 6) : st === 'tasks' ? L3(lv, 6, 9, 12) : L3(lv, 7, 8, 6);
        const lo = st === 'temp' && lv === 3 ? -6 : 1;
        const rest = Array.from({ length: n - z }, () => { let v; do { v = rnd(lo, hi); } while (v === 0); return v; });
        const vs = shuffle([...rest, ...Array(z).fill(0)]);
        const S = sum(vs), m = S / n;
        if (!clean2(m) || S === 0 || (lv === 1 && !Number.isInteger(m))) return null;
        if (!clean2(S / (n - z))) return null; // неверный ответ «без нулей» тоже правдоподобный
        const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        if (st === 'goals') return {
          story: `Школьная команда сыграла ${n} ${pl(n, 'матч', 'матча', 'матчей')}. На диаграмме — сколько голов она забила в каждом.`,
          question: 'Сколько голов в среднем команда забивала за матч?',
          figure: { type: 'bars7', items: vs.map((v, i) => ({ label: String(i + 1), v })), unit: 'голы' }, answer: ans(m),
          hints: ['Сложи голы всех матчей и раздели на число матчей. Матч без голов — тоже матч.', `Сумма ${num(S)}, матчей ${n} — вместе с ${z} ${pl(z, 'матчем', 'матчами', 'матчами')} без голов.`],
          solution: `(${plus(vs)}) : ${n} = ${num(S)} : ${n} = ${num(m)}.`,
          wrongs: W(ans(m), { 'mean-skip-zero': S / (n - z) }), data: { kind, vs },
        };
        if (st === 'tasks') return {
          story: `${who[0]} ${n} ${pl(n, 'день', 'дня', 'дней')} ${ed(who, 'решал', 'решала')} задачи к олимпиаде. На диаграмме — сколько задач ${ed(who, 'он', 'она')} ${ed(who, 'решил', 'решила')} в каждый из дней.`,
          question: 'Сколько задач в среднем в день?',
          figure: { type: 'bars7', items: vs.map((v, i) => ({ label: String(i + 1), v })), unit: 'задачи' }, answer: ans(m),
          hints: ['Сложи все задачи и раздели на число дней. День без задач тоже считается.', `Сумма ${num(S)}, дней ${n}.`],
          solution: `(${plus(vs)}) : ${n} = ${num(S)} : ${n} = ${num(m)}.`,
          wrongs: W(ans(m), { 'mean-skip-zero': S / (n - z) }), data: { kind, vs },
        };
        return {
          story: `Температура воздуха в полдень всю неделю: ${vs.map((v, i) => `${DAYS[i]} ${num(v)}°`).join(', ')}.`,
          question: 'Найди среднюю температуру за неделю (в градусах).', answer: ans(m),
          hints: ['Сложи температуры всех семи дней и раздели на 7. Ноль градусов — тоже значение.', `Сумма: ${plus(vs)} = ${num(S)}.`],
          solution: `${num(S)} : 7 = ${num(m)}°.`,
          wrongs: W(ans(m), { 'mean-skip-zero': S / (n - z) }), data: { kind, vs },
        };
      });
      if (kind === 'table') return retry(() => {
        const st = pick(lv === 1 ? ['grades', 'kids'] : ['grades', 'goals', 'kids']);
        const vals = { grades: [5, 4, 3, 2], goals: [0, 1, 2, 3], kids: [1, 2, 3, 4] }[st];
        const fq = vals.map((v, i) => rnd(st === 'grades' && v === 2 ? 0 : 1, L3(lv, 5, 8, 10)));
        if (st === 'goals') fq[0] = Math.max(1, fq[0]);
        const N = sum(fq), S = sum(vals.map((v, i) => v * fq[i])), m = S / N;
        if (!clean2(m) || (lv === 1 && !clean2(m * 10)) || N < 6) return null;
        const k = vals.length;
        const head = { grades: ['Оценка', '5', '4', '3', '2'], goals: ['Голов', '0', '1', '2', '3'], kids: ['Детей', '1', '2', '3', '4'] }[st];
        const row = { grades: 'Учеников', goals: 'Матчей', kids: 'Семей' }[st];
        const story = {
          grades: 'Класс написал контрольную. В таблице — сколько учеников получили каждую оценку.',
          goals: 'В таблице — сколько матчей команда сыграла с тем или иным числом забитых голов.',
          kids: 'Учеников спросили, сколько детей в их семье. Результаты опроса — в таблице.',
        }[st];
        const q = { grades: 'Найди средний балл класса.', goals: 'Сколько голов в среднем команда забивала за матч?', kids: 'Сколько детей в среднем приходится на одну семью?' }[st];
        const terms = vals.map((v, i) => `${v} · ${fq[i]}`).join(' + ');
        return {
          story, question: q, figure: { type: 'table7', head, rows: [[row, ...fq]] }, answer: ans(m),
          hints: ['Каждое значение встречается несколько раз: умножь значение на то, сколько раз оно встретилось, и сложи. Делить нужно на число всех ' + { grades: 'учеников', goals: 'матчей', kids: 'семей' }[st] + '.', `Сумма: ${terms} = ${num(S)}. Всего: ${fq.join(' + ')} = ${N}.`],
          solution: `(${terms}) : ${N} = ${num(S)} : ${N} = ${num(m)}.`,
          wrongs: W(ans(m), { 'mean-wrong-count': S / k, 'mean-skip-zero': st === 'goals' && N > fq[0] ? S / (N - fq[0]) : null }), data: { kind, vals, fq },
        };
      });
      if (kind === 'add') return retry(() => {
        const st = pick(['grades', 'points', 'height']), who = pick(NAMES);
        const n = pick(st === 'height' ? [4, 7, 9] : [3, 4, 7, 9]);
        let m, x;
        if (st === 'grades') { m = lv === 3 ? rnd(30, 46) / 10 : rnd(3, 4); x = rnd(2, 5); }
        else if (st === 'points') { m = rnd(8, 24); x = rnd(4, 35); }
        else { m = rnd(165, 185); x = rnd(160, 199); }
        const S = round(n * m, 6), r = (S + x) / (n + 1);
        if (x === m || !clean2(r) || !Number.isInteger(round(S, 6))) return null;
        const story = {
          grades: `У ${who[2]} средний балл за ${n} ${pl(n, 'контрольную', 'контрольные', 'контрольных')} — ${num(m)}. За следующую контрольную ${ed(who, 'он', 'она')} ${ed(who, 'получил', 'получила')} ${num(x)}.`,
          points: `Баскетболист в ${n} ${pl(n, 'матче', 'матчах', 'матчах')} набирал в среднем ${num(m)} ${pl(m, 'очко', 'очка', 'очков')}. В следующем матче он набрал ${num(x)}.`,
          height: `В команде ${n} ${pl(n, 'волейболист', 'волейболиста', 'волейболистов')}, их средний рост — ${num(m)} см. В команду пришёл новый игрок ростом ${num(x)} см.`,
        }[st];
        const q = { grades: 'Каким стал средний балл?', points: 'Сколько очков в среднем за матч он набирал с учётом нового матча?', height: 'Каким стал средний рост команды (в сантиметрах)?' }[st];
        return {
          story, question: q, answer: ans(r),
          hints: [`Сначала найди сумму старых значений: среднее · количество = ${num(m)} · ${n}.`, `Сумма: ${num(S)}. Прибавь новое значение и раздели на новое количество — ${n + 1}.`],
          solution: `${num(m)} · ${n} = ${num(S)}; (${num(S)} + ${num(x)}) : ${n + 1} = ${num(S + x)} : ${n + 1} = ${num(r)}.`,
          wrongs: W(ans(r), { 'mean-add-avg': (m + x) / 2, 'mean-wrong-count': (S + x) / n }), data: { kind, n, m, x },
        };
      });
      if (kind === 'missing') return retry(() => {
        const st = pick(['points', 'pages']), who = pick(NAMES);
        const n = rnd(3, 5);
        const vs = Array.from({ length: n }, () => (st === 'points' ? rnd(6, 24) : rnd(15, 45)));
        const S = sum(vs), mo = S / n, T = rnd(Math.ceil(mo) + 1, Math.ceil(mo) + 5);
        const x = T * (n + 1) - S;
        if (!clean2(mo) || x <= 0 || x > (st === 'points' ? 40 : 80) || x === T) return null;
        const story = st === 'points'
          ? `Очки, которые ${who[0]} ${ed(who, 'набрал', 'набрала')} в первых ${n} играх: ${list(vs)}.`
          : `${who[0]} ${n} ${pl(n, 'день', 'дня', 'дней')} ${ed(who, 'читал', 'читала')} книгу и прочитывал${ed(who, '', 'а')} по ${list(vs)} страниц.`;
        const q = st === 'points'
          ? `Сколько очков нужно набрать в ${n + 1}-й игре, чтобы в среднем за ${n + 1} ${pl(n + 1, 'игру', 'игры', 'игр')} выходило ${T}?`
          : `Сколько страниц нужно прочитать в ${n + 1}-й день, чтобы в среднем за ${n + 1} ${pl(n + 1, 'день', 'дня', 'дней')} выходило ${T}?`;
        return {
          story, question: q, answer: ans(x),
          hints: [`Какой должна быть сумма за ${n + 1} ${pl(n + 1, 'раз', 'раза', 'раз')}, чтобы среднее было ${T}? Среднее · количество.`, `Нужная сумма: ${T} · ${n + 1} = ${T * (n + 1)}. Уже есть ${num(S)}.`],
          solution: `${T} · ${n + 1} = ${T * (n + 1)}; ${T * (n + 1)} − ${num(S)} = ${num(x)}.`,
          wrongs: W(ans(x), { 'mean-add-avg': 2 * T - mo, 'mean-wrong-count': T * n - S > 0 ? T * n - S : null }), data: { kind, vs, T },
        };
      });
      // dec: десятичные значения
      return retry(() => {
        const st = pick(['jump', 'run']), who = pick(NAMES), n = rnd(4, 5);
        const vs = Array.from({ length: n }, () => (st === 'jump' ? rnd(28, 45) / 10 : rnd(82, 110) / 10));
        const S = round(sum(vs), 6), m = S / n;
        if (!clean2(m)) return null;
        const story = st === 'jump' ? `${who[0]} ${ed(who, 'сделал', 'сделала')} ${n} ${pl(n, 'прыжок', 'прыжка', 'прыжков')} в длину: ${vs.map(v => num(v) + ' м').join('; ')}.` : `${who[0]} ${n} ${pl(n, 'раз', 'раза', 'раз')} ${ed(who, 'пробежал', 'пробежала')} 60 метров. Время: ${vs.map(v => num(v) + ' с').join('; ')}.`;
        return {
          story, question: st === 'jump' ? 'Найди среднюю длину прыжка (в метрах).' : 'Найди среднее время (в секундах).', answer: ans(m),
          hints: ['Сложи все значения столбиком и раздели на их количество.', `Сумма: ${num(S)}, значений ${n}.`],
          solution: `${num(S)} : ${n} = ${num(m)}.`, wrongs: {}, data: { kind, vs },
        };
      });
    },
    verify(t) {
      const d = t.data, x = val(t.answer);
      if (['list', 'zeros', 'dec'].includes(d.kind)) { let acc = 0; for (const v of d.vs) acc += v - x; return Math.abs(acc) < 1e-6; } // сумма отклонений от среднего = 0
      if (d.kind === 'table') { const all = []; d.vals.forEach((v, i) => { for (let k = 0; k < d.fq[i]; k++) all.push(v); }); return eq(round(sum(all) / all.length, 6), x); }
      if (d.kind === 'add') { const all = [...Array(d.n).fill(d.m), d.x]; return Math.abs(sum(all.map(v => v - x))) < 1e-6; }
      return eq(round((sum(d.vs) + x) / (d.vs.length + 1), 6), d.T);
    },
  };

  /* =========================================================
     7 класс. s7-median — медиана, размах, наибольшее и наименьшее
     ========================================================= */
  const MED_CTX = [
    { key: 'run', story: 'Ребята пробежали 60 метров. Время каждого (в секундах):', unit: '', gen: lv => (lv === 3 ? rnd(82, 112) / 10 : rnd(8, 14)) },
    { key: 'height', story: 'Рост игроков баскетбольной секции (в сантиметрах):', unit: '', gen: () => rnd(150, 182) },
    { key: 'push', story: 'Сколько раз отжался каждый из ребят на физкультуре:', unit: '', gen: () => rnd(5, 35) },
    { key: 'temp', story: 'Температура воздуха в полдень несколько дней подряд (в градусах):', unit: '', gen: lv => (lv === 3 ? rnd(-9, 6) : rnd(1, 18)) },
    { key: 'price', story: 'Цена одного и того же мороженого в разных магазинах (в рублях):', unit: '', gen: () => rnd(55, 99) },
  ];
  const medOf = a => { const s = sorted(a), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const MEDIAN = {
    id: 's7-median', strand: ST, grade: 7, short: 'Медиана',
    title: 'Медиана, размах, наибольшее и наименьшее',
    frp: ['Описательная статистика: медиана, размах, наибольшее и наименьшее значения набора числовых данных', 'Примеры случайной изменчивости'],
    goal: 'Упорядочивать числовой ряд и находить его медиану, размах, наибольшее и наименьшее значения; отличать медиану от среднего.',
    requires: ['s7-mean', 'n5-place'],
    explain: {
      model: 'Пятеро ребят пробежали 60 метров за 9, 11, 10, 13 и 10 секунд. Выстроим результаты по порядку: 9, 10, 10, 11, 13. Посередине стоит 10 — это медиана: половина ребят бежала не дольше 10 секунд, половина — не быстрее. Самый быстрый — 9 с, самый медленный — 13 с. Разница 13 − 9 = 4 с — это размах: насколько разбросаны результаты.',
      figure: { type: 'bars7', items: [{ label: '9', v: 9 }, { label: '10', v: 10 }, { label: '10', v: 10 }, { label: '11', v: 11 }, { label: '13', v: 13 }], unit: 'секунды' },
      figureCaption: 'Результаты по порядку: посередине 10 — медиана',
      rule: '<ul class="rule-list"><li><b>Сначала упорядочь</b> ряд — от меньшего к большему.</li><li><b>Медиана</b> — число посередине упорядоченного ряда. Если чисел чётное количество, посередине два числа — медиана равна их среднему: (a + b) : 2.</li><li><b>Размах</b> = наибольшее − наименьшее.</li><li>Медиана и среднее — <b>разные</b> числа: среднее считают через сумму, медиану — по месту в ряду.</li></ul>',
      examples: [
        { q: 'Найди медиану ряда 7, 3, 9, 4, 6.', choices: ['6', '9', '5,8'], correct: 0, wrong: { 1: 'median-unsorted', 2: 'median-as-mean' },
          steps: ['Упорядочим: 3, 4, 6, 7, 9.', 'Чисел 5, посередине третье — 6.', 'Число 9 стоит посередине записи, но не ряда; 5,8 — это среднее, а не медиана.'] },
        { q: 'Найди медиану ряда 12, 5, 8, 10.', choices: ['9', '8'], correct: 0, wrong: { 1: 'median-even-one' },
          steps: ['Упорядочим: 5, 8, 10, 12.', 'Чисел 4 — посередине два: 8 и 10.', 'Медиана: (8 + 10) : 2 = 9.'] },
      ],
    },
    mistakes: [
      { id: 'median-unsorted', title: 'Ищет медиану или размах, не упорядочив ряд', kidName: 'Беспорядок',
        kidRule: 'ты берёшь число из середины записи (или первое и последнее числа), не расставив ряд по порядку',
        say: 'Медиана — середина упорядоченного ряда, а размах — разность наибольшего и наименьшего. Сначала расставь числа от меньшего к большему.',
        fixIdea: 'Сначала упорядочь ряд по возрастанию — только потом ищи середину, наибольшее и наименьшее.',
        explainOptions: ['Ряд 9, 1, 5: по порядку 1, 5, 9 — медиана 5', 'Ряд 9, 1, 5: в середине записи 1 — это и есть медиана', 'Медиана — всегда второе число в записи'],
        conflicts: [{ text: 'Ряд 9, 1, 5. По твоему правилу медиана — 1, число из середины записи. Но 1 — самое маленькое число ряда, а медиана должна стоять посередине.', ask: 'Какое число окажется в середине, если расставить ряд по порядку?', choices: ['5', '1', '9'], right: '5', verify: () => medOf([9, 1, 5]) === 5 }], root: 'n5-place' },
      { id: 'median-even-one', title: 'При чётном количестве берёт в медиану одно из двух средних чисел', kidName: 'Одиночка',
        kidRule: 'ты при чётном количестве чисел берёшь в медиану только одно из двух средних',
        say: 'Когда чисел чётное количество, посередине стоят два числа. Медиана — их среднее арифметическое.',
        fixIdea: 'При чётном количестве медиана = (левое среднее число + правое среднее число) : 2.',
        explainOptions: ['Ряд 2, 4, 6, 8: посередине 4 и 6, медиана (4 + 6) : 2 = 5', 'Ряд 2, 4, 6, 8: медиана 4 — первое из двух средних', 'При чётном количестве чисел медианы не бывает'],
        conflicts: [{ text: 'Ряд 2, 4, 6, 8. По твоему правилу медиана — 4. Но тогда левее неё одно число, а правее — два. Медиана должна делить ряд пополам.', ask: 'Сколько чисел ряда меньше 4?', choices: ['1', '2'], right: '1', verify: () => [2, 4, 6, 8].filter(x => x < 4).length === 1 && medOf([2, 4, 6, 8]) === 5 }] },
      { id: 'median-as-mean', title: 'Путает медиану со средним арифметическим', kidName: 'Двойник',
        kidRule: 'ты считаешь медиану как среднее: складываешь все числа и делишь на их количество',
        say: 'Медиану не складывают и не делят: это число, которое стоит посередине упорядоченного ряда.',
        fixIdea: 'Среднее — это сумма : количество. Медиана — середина упорядоченного ряда. Это разные числа.',
        explainOptions: ['Ряд 1, 2, 9: среднее 4, а медиана 2', 'Медиана и среднее — одно и то же', 'Медиана — это сумма, делённая пополам'],
        conflicts: [{ text: 'Пятеро ребят прочитали 1, 2, 2, 3 и 17 книг. Среднее: 25 : 5 = 5. По твоему правилу медиана тоже 5. Но 5 книг и больше прочитал только один человек из пяти!', ask: 'Какое число стоит посередине упорядоченного ряда?', choices: ['2', '5'], right: '2', verify: () => medOf([1, 2, 2, 3, 17]) === 2 && sum([1, 2, 2, 3, 17]) / 5 === 5 }] },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['odd', 'odd', 'range', 'extreme', 'even'], ['odd', 'even', 'even', 'range'], ['odd', 'even', 'range', 'table', 'table']));
      if (kind === 'table') return retry(() => {
        const st = pick(['shoe', 'grades', 'sibs']);
        const vals = { shoe: [36, 37, 38, 39, 40], grades: [2, 3, 4, 5], sibs: [0, 1, 2, 3] }[st];
        const fq = vals.map(() => rnd(0, 6)); if (fq.filter(Boolean).length < 3) return null;
        const all = []; vals.forEach((v, i) => { for (let k = 0; k < fq[i]; k++) all.push(v); });
        const N = all.length; if (N < 8 || N > 20) return null;
        const md = medOf(all), s = sorted(all), mean = sum(all) / N;
        const head = { shoe: ['Размер', ...vals.map(String)], grades: ['Оценка', ...vals.map(String)], sibs: ['Братьев и сестёр', ...vals.map(String)] }[st];
        const row = { shoe: 'Учеников', grades: 'Учеников', sibs: 'Учеников' }[st];
        const story = { shoe: 'В классе узнали размер обуви каждого ученика.', grades: 'Класс написал контрольную работу.', sibs: 'Учеников спросили, сколько у них братьев и сестёр.' }[st];
        const pos = N % 2 ? `${(N + 1) / 2}-е` : `${N / 2}-е и ${N / 2 + 1}-е`;
        return {
          story: story + ' Результаты — в таблице.', question: `Найди медиану ${{ shoe: 'размера обуви', grades: 'оценок', sibs: 'числа братьев и сестёр' }[st]}.`, figure: { type: 'table7', head, rows: [[row, ...fq]], first: st === 'sibs' ? 132 : 84 }, answer: ans(md),
          hints: [`Всего ${N} ${pl(N, 'значение', 'значения', 'значений')}. Представь, что они выписаны по порядку: сначала все ${vals[0]}, потом все ${vals[1]} и так далее. Какое место — середина?`, `Середина — ${pos} по порядку${N % 2 ? '' : ' — нужно среднее этих двух'}.`],
          solution: `Всего ${N}; ${N % 2 ? `${(N + 1) / 2}-е значение по порядку — ${num(md)}` : `${N / 2}-е значение — ${num(s[N / 2 - 1])}, ${N / 2 + 1}-е — ${num(s[N / 2])}; медиана (${num(s[N / 2 - 1])} + ${num(s[N / 2])}) : 2 = ${num(md)}`}.`,
          wrongs: W(ans(md), { 'median-as-mean': mean, 'median-even-one': N % 2 ? null : s[N / 2 - 1] }), data: { kind, all },
        };
      });
      const C = pick(MED_CTX);
      const n = kind === 'odd' ? pick(L3(lv, [5], [5, 7], [7, 9])) : kind === 'even' ? pick(L3(lv, [4], [4, 6], [6, 8])) : pick(L3(lv, [5, 6], [6, 7], [7, 8, 9]));
      return retry(() => {
        const raw = Array.from({ length: n }, () => C.gen(lv)), s = sorted(raw);
        if (raw.every((v, i) => v === s[i]) || new Set(raw).size < n - 1) return null;
        const story = `${C.story} ${list(raw)}.`;
        const sortedTxt = `По порядку: ${list(s)}.`;
        if (kind === 'odd' || kind === 'even') {
          const md = medOf(raw), mean = sum(raw) / n, mid = n % 2 ? raw[(n - 1) / 2] : (raw[n / 2 - 1] + raw[n / 2]) / 2;
          if (!clean2(md)) return null;
          const wr = W(ans(md), { 'median-unsorted': mid, 'median-as-mean': mean, 'median-even-one': n % 2 ? null : s[n / 2 - 1] });
          if (lv > 1 && !wr['median-unsorted']) return null;
          return {
            story, question: `Найди медиану этого ряда${C.unit}.`, answer: ans(md),
            hints: [`Сначала расставь числа по возрастанию. ${n % 2 ? 'Чисел нечётное количество — посередине одно.' : 'Чисел чётное количество — посередине два.'}`, `${sortedTxt} ${n % 2 ? `Середина — ${(n + 1) / 2}-е число.` : `Посередине ${num(s[n / 2 - 1])} и ${num(s[n / 2])}.`}`],
            solution: `${sortedTxt} ${n % 2 ? `Медиана — ${(n + 1) / 2}-е число: ${num(md)}.` : `Медиана: (${num(s[n / 2 - 1])} + ${num(s[n / 2])}) : 2 = ${num(md)}.`}`,
            wrongs: wr, data: { kind, raw },
          };
        }
        if (kind === 'range') {
          const r = round(s[n - 1] - s[0], 6), fl = round(Math.abs(raw[n - 1] - raw[0]), 6);
          const wr = W(ans(r), { 'median-unsorted': fl });
          if (lv > 1 && !wr['median-unsorted']) return null;
          return {
            story, question: `Найди размах этого ряда${C.unit}.`, answer: ans(r),
            hints: ['Размах — разность между наибольшим и наименьшим числом. Найди их, просмотрев весь ряд.', `Наибольшее — ${num(s[n - 1])}, наименьшее — ${num(s[0])}.`],
            solution: `${num(s[n - 1])} − ${num(s[0])} = ${num(r)}.`, wrongs: wr, data: { kind, raw },
          };
        }
        const big = Math.random() < 0.5, v = big ? s[n - 1] : s[0];
        return {
          story, question: `Найди ${big ? 'наибольшее' : 'наименьшее'} значение в этом ряду${C.unit}.`, answer: ans(v),
          hints: [`Просмотри все числа и найди самое ${big ? 'большое' : 'маленькое'}.`, `${sortedTxt}`],
          solution: `${sortedTxt} ${big ? 'Наибольшее' : 'Наименьшее'} — ${num(v)}.`, wrongs: {}, data: { kind, raw, big },
        };
      });
    },
    verify(t) {
      const d = t.data, x = val(t.answer);
      if (d.kind === 'odd' || d.kind === 'even' || d.kind === 'table') {
        const a = d.kind === 'table' ? d.all : d.raw, n = a.length;
        const m = n % 2 ? kth(a, (n - 1) / 2) : (kth(a, n / 2 - 1) + kth(a, n / 2)) / 2;
        return eq(m, x);
      }
      if (d.kind === 'range') return eq(Math.max(...d.raw) - Math.min(...d.raw), x);
      return d.raw.includes(x) && d.raw.every(v => (d.big ? v <= x : v >= x));
    },
  };

  /* =========================================================
     7 класс. s7-tables — таблицы и круговые диаграммы
     ========================================================= */
  // таблицы «из строки — в столбец»: голы команд друг другу, сообщения, рейсы
  const TAB_CTX = [
    { key: 'goals', names: ['Факел', 'Сокол', 'Заря', 'Старт'], gen: () => rnd(0, 5),
      story: 'Четыре команды провели турнир. В таблице — сколько голов забила команда из строки команде из столбца.',
      cell: (a, b) => `Сколько голов команда «${a}» забила команде «${b}»?`,
      col: b => `Сколько всего голов пропустила команда «${b}»?`, colHint: 'Пропущенные голы — это голы, которые команде забили другие.',
      diff: a => `Найди разность забитых и пропущенных голов команды «${a}» (забитые минус пропущенные).` },
    { key: 'msg', names: ['Петя', 'Оля', 'Дима', 'Аня'], gen: () => rnd(0, 9),
      story: 'В таблице — сколько сообщений за день отправил человек из строки человеку из столбца.',
      cell: (a, b) => `Сколько сообщений ${a} ${['Оля', 'Аня'].includes(a) ? 'отправила' : 'отправил'} ${{ Петя: 'Пете', Оля: 'Оле', Дима: 'Диме', Аня: 'Ане' }[b]}?`,
      col: b => `Сколько всего сообщений ${['Оля', 'Аня'].includes(b) ? 'получила' : 'получил'} ${b}?`, colHint: 'Полученные сообщения — это сообщения, которые этому человеку отправили другие.',
      diff: a => `На сколько сообщений ${a} ${['Оля', 'Аня'].includes(a) ? 'отправила' : 'отправил'} больше, чем ${['Оля', 'Аня'].includes(a) ? 'получила' : 'получил'}? (Если меньше — ответ с минусом.)` },
    { key: 'bus', names: ['Тула', 'Орёл', 'Курск', 'Калуга'], gen: () => rnd(0, 8),
      story: 'В таблице — сколько автобусных рейсов в день идёт из города в строке в город в столбце.',
      cell: (a, b) => `Сколько рейсов в день идёт из ${{ Тула: 'Тулы', Орёл: 'Орла', Курск: 'Курска', Калуга: 'Калуги' }[a]} в ${{ Тула: 'Тулу', Орёл: 'Орёл', Курск: 'Курск', Калуга: 'Калугу' }[b]}?`,
      col: b => `Сколько всего рейсов в день приходит в ${{ Тула: 'Тулу', Орёл: 'Орёл', Курск: 'Курск', Калуга: 'Калугу' }[b]}?`, colHint: 'Приходящие рейсы — это рейсы из других городов в этот город.',
      diff: a => `Найди разность: сколько рейсов уходит из ${{ Тула: 'Тулы', Орёл: 'Орла', Курск: 'Курска', Калуга: 'Калуги' }[a]} минус сколько приходит туда.` },
  ];
  const PIE_CTX = [
    { key: 'sport', labels: ['Футбол', 'Хоккей', 'Плавание', 'Теннис', 'Бег'], unit: ['человек', 'человека', 'человек'],
      intro: N => `Опросили ${N} ${pl(N, 'ученика', 'ученика', 'учеников')}: какой вид спорта нравится больше всего? Результаты — на круговой диаграмме.`,
      q: l => `Сколько учеников выбрали ${l.toLowerCase()}?`, part: l => `Какая часть опрошенных выбрала ${l.toLowerCase()}?` },
    { key: 'road', labels: ['Пешком', 'Автобус', 'Машина', 'Велосипед'], unit: ['человек', 'человека', 'человек'],
      intro: N => `Опросили ${N} ${pl(N, 'ученика', 'ученика', 'учеников')}: как они добираются до школы? Результаты — на круговой диаграмме.`,
      q: l => ({ 'Пешком': 'Сколько учеников ходят в школу пешком?', 'Автобус': 'Сколько учеников ездят в школу на автобусе?', 'Машина': 'Сколько учеников ездят в школу на машине?', 'Велосипед': 'Сколько учеников ездят в школу на велосипеде?' })[l],
      part: l => ({ 'Пешком': 'Какая часть учеников ходит в школу пешком?', 'Автобус': 'Какая часть учеников ездит на автобусе?', 'Машина': 'Какая часть учеников ездит на машине?', 'Велосипед': 'Какая часть учеников ездит на велосипеде?' })[l] },
    { key: 'day', labels: ['Сон', 'Школа', 'Уроки', 'Прогулка', 'Другое'], unit: ['час', 'часа', 'часов'], fixedN: 24,
      // реалистичный распорядок: сон 4–5 частей (8–10 ч), школа 3, уроки 1–2, прогулка 1–2, другое — остальное
      preset: () => retry(() => { const p = [rnd(4, 5), 3, rnd(1, 2), rnd(1, 2)]; return sum(p) < 12 ? [...p, 12 - sum(p)] : null; }),
      intro: () => 'Круговая диаграмма показывает, как Тимур проводит сутки — 24 часа.',
      q: l => ({ 'Сон': 'Сколько часов в сутки Тимур спит?', 'Школа': 'Сколько часов Тимур проводит в школе?', 'Уроки': 'Сколько часов Тимур делает уроки?', 'Прогулка': 'Сколько часов Тимур гуляет?', 'Другое': 'Сколько часов уходит на всё остальное («Другое»)?' })[l],
      part: l => ({ 'Сон': 'Какую часть суток Тимур спит?', 'Школа': 'Какую часть суток Тимур проводит в школе?', 'Уроки': 'Какую часть суток Тимур делает уроки?', 'Прогулка': 'Какую часть суток Тимур гуляет?', 'Другое': 'Какую часть суток занимает «Другое»?' })[l] },
  ];
  // разбить of частей на k секторов (каждый ≥ 1, не все равны)
  function splitParts(of, k) {
    return retry(() => { const cut = shuffle(Array.from({ length: of - 1 }, (_, i) => i + 1)).slice(0, k - 1).sort((a, b) => a - b); const p = [...cut, of].map((c, i, a) => c - (i ? a[i - 1] : 0)); return new Set(p).size > 1 ? p : null; });
  }
  const TABLES = {
    id: 's7-tables', strand: ST, grade: 7, short: 'Таблицы',
    title: 'Таблицы и круговые диаграммы',
    frp: ['Представление данных в виде таблиц и диаграмм. Заполнение таблиц, чтение и построение диаграмм (столбиковых и круговых)', 'Извлечение информации из диаграмм и таблиц, использование и интерпретация данных'],
    goal: 'Находить в таблице нужную строку и столбец, считать суммы по строке и по столбцу, определять по круговой диаграмме долю и количество.',
    requires: ['t6-charts', 'part-of'],
    explain: {
      model: 'Четыре команды сыграли турнир, и судья заполнил таблицу: в строке — кто забивал, в столбце — кому. Сколько голов «Факел» забил «Соколу»? Идём по строке «Факел» до столбца «Сокол». А чтобы узнать, сколько голов пропустил «Сокол», складываем весь его столбец: это голы, которые ему забили все остальные. Строка и столбец здесь значат разное — их нельзя путать.',
      figure: { type: 'table7', head: ['', 'Факел', 'Сокол', 'Заря'], rows: [['Факел', '—', 3, 1], ['Сокол', 2, '—', 0], ['Заря', 4, 1, '—']] },
      figureCaption: 'Строка — кто забил, столбец — кому. «Факел» забил «Соколу» 3 гола, а «Сокол» «Факелу» — 2',
      rule: '<ul class="rule-list"><li><b>Таблица:</b> сначала прочитай, что означают строки и что — столбцы. Нужная клетка — на пересечении нужной строки и нужного столбца.</li><li><b>Сумма по строке и сумма по столбцу</b> — разные величины (забито и пропущено, отправлено и получено).</li><li><b>Круговая диаграмма:</b> весь круг — всё целое. Если круг размечен на 12 равных частей, а сектор занимает 3 из них, это ' + fr(3, 12) + ' = ' + fr(1, 4) + ' целого. Сектора бывают разного размера — считай части, а не сектора.</li><li>Весь круг — <b>360°</b>. Сектор 90° — это ' + fr(90, 360) + ' = ' + fr(1, 4) + ' целого, а не 90 %.</li></ul>',
      examples: [
        { q: 'По таблице турнира: сколько голов «Сокол» забил «Факелу»?', fig: { type: 'table7', head: ['', 'Факел', 'Сокол', 'Заря'], rows: [['Факел', '—', 3, 1], ['Сокол', 2, '—', 0], ['Заря', 4, 1, '—']] },
          choices: ['2', '3'], correct: 0, wrong: { 1: 'table-wrong-cell' },
          steps: ['Кто забивал — «Сокол»: берём строку «Сокол».', 'Кому — «Факелу»: столбец «Факел».', 'На пересечении — 2. Число 3 — это голы «Факела» «Соколу».'] },
        { q: 'Опросили 40 учеников. Круг разделён на 8 равных частей, футбол занимает 3 части. Сколько учеников выбрали футбол?', fig: { type: 'pie7', of: 8, items: [{ label: 'Футбол', parts: 3 }, { label: 'Хоккей', parts: 1 }, { label: 'Плавание', parts: 2 }, { label: 'Бег', parts: 2 }] },
          choices: ['15', '10'], correct: 0, wrong: { 1: 'pie-equal-sectors' },
          steps: ['Одна восьмая часть круга — это 40 : 8 = 5 учеников.', 'Футбол — 3 части: 3 · 5 = 15.', 'Секторов 4, но они разные — делить 40 на 4 нельзя.'] },
      ],
    },
    mistakes: [
      { id: 'table-wrong-cell', title: 'Путает строку и столбец таблицы', kidName: 'Перекрёсток',
        kidRule: 'ты ищешь первое название в столбцах, а второе — в строках, и попадаешь не в ту клетку',
        say: 'Прочитай, что означают строки и что — столбцы. «Кто» ищи там, где написано «кто», «кому» — там, где «кому».',
        fixIdea: 'Сначала разберись, что значат строки и столбцы; клетка «строка A, столбец B» и клетка «строка B, столбец A» — разные числа.',
        explainOptions: ['«Факел» забил «Соколу»: строка «Факел», столбец «Сокол»', 'Неважно, где строка, а где столбец, — клетка одна и та же', 'Чтобы найти, сколько пропустил «Сокол», надо сложить его строку'],
        conflicts: [{ text: 'В таблице: «Факел» забил «Соколу» 3 гола, «Сокол» «Факелу» — 2. Если не различать строку и столбец, получится, что матч закончился счётом 3 : 3 или 2 : 2. Но в одной клетке написано 3, а в другой — 2.', ask: 'Одинаковые ли числа стоят в клетках «Факел → Сокол» и «Сокол → Факел»?', choices: ['Нет', 'Да'], right: 'Нет', verify: () => 3 !== 2,
          figure: { type: 'table7', head: ['', 'Факел', 'Сокол'], rows: [['Факел', '—', 3], ['Сокол', 2, '—']] } }],
        root: 't6-charts' },
      { id: 'pie-equal-sectors', title: 'Считает все сектора круговой диаграммы равными долями', kidName: 'Уравнитель',
        kidRule: 'ты делишь целое на число секторов, как будто все сектора одинаковые',
        say: 'Сектора на диаграмме разного размера. Посчитай, сколько равных частей круга занимает нужный сектор.',
        fixIdea: 'Доля сектора = сколько равных частей круга он занимает : сколько таких частей во всём круге.',
        explainOptions: ['Сектор в 3 части из 8 — это 3/8 целого', 'Секторов 4 — значит, каждый сектор — это 1/4', 'Самый большой сектор — всегда половина круга'],
        conflicts: [{ text: 'Круг разделён на 2 сектора: один занимает 7 частей из 8, другой — 1 часть. По твоему правилу каждый сектор — половина круга.', ask: 'Равны ли эти сектора?', choices: ['Нет', 'Да'], right: 'Нет', verify: () => 7 !== 1,
          figure: { type: 'pie7', of: 8, items: [{ label: 'Да', parts: 7 }, { label: 'Нет', parts: 1 }] } }],
        root: 'concept' },
      { id: 'pie-angle-as-percent', title: 'Принимает градусную меру сектора за проценты', kidName: 'Градусник',
        kidRule: 'ты думаешь, что сектор в 90° — это 90 % круга',
        say: 'Весь круг — 360°, а не 100. Сектор в 90° — это 90 из 360, то есть четверть круга.',
        fixIdea: 'Доля сектора = его угол : 360°. Сектор 90° — это 1/4, сектор 120° — 1/3.',
        explainOptions: ['Сектор 90° — это 90/360 = 1/4 круга', 'Сектор 90° — это 90 % круга', 'Сектор 90° — это 90 человек'],
        conflicts: [{ text: 'На диаграмме два сектора: 180° и 180°. По твоему правилу это 180 % и ещё 180 % — вместе 360 %, а весь круг — это 100 %.', ask: 'Какая часть круга — сектор 180°?', choices: ['половина', '180 %'], right: 'половина', verify: () => 180 / 360 === 0.5,
          figure: { type: 'pie7', of: 4, deg: true, items: [{ label: 'Да', parts: 2 }, { label: 'Нет', parts: 2 }] } }],
        root: 'g-angles' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['cell', 'cell', 'pie', 'piefrac'], ['cell', 'col', 'pie', 'piefrac', 'pieangle'], ['col', 'diff', 'pie', 'pieangle', 'piefrac']));
      if (['cell', 'col', 'diff'].includes(kind)) return retry(() => {
        const C = pick(TAB_CTX), k = kind === 'cell' && lv === 1 ? 3 : pick([3, 4]), names = C.names.slice(0, k);
        const t = names.map((_, i) => names.map((__, j) => (i === j ? null : C.gen())));
        const head = ['', ...names], rows = names.map((nm, i) => [nm, ...t[i].map(c => (c == null ? '—' : c))]);
        const fig = { type: 'table7', head, rows, first: 70 };
        const rs = i => sum(t[i].filter(c => c != null)), cs = j => sum(t.map(r => r[j]).filter(c => c != null));
        if (kind === 'cell') {
          let i, j; do { i = rnd(0, k - 1); j = rnd(0, k - 1); } while (i === j);
          if (t[i][j] === t[j][i]) return null;
          return {
            story: C.story, question: C.cell(names[i], names[j]), figure: fig, answer: ans(t[i][j]),
            hints: ['Прочитай подпись к таблице: что означают строки и что — столбцы?', `Строка «${names[i]}», столбец «${names[j]}».`],
            solution: `На пересечении строки «${names[i]}» и столбца «${names[j]}» — ${t[i][j]}.`,
            wrongs: W(ans(t[i][j]), { 'table-wrong-cell': t[j][i] }), data: { kind, t, i, j },
          };
        }
        const j = rnd(0, k - 1);
        if (kind === 'col') {
          if (rs(j) === cs(j)) return null;
          const colVals = t.map(r => r[j]).filter(c => c != null);
          return {
            story: C.story, question: C.col(names[j]), figure: fig, answer: ans(cs(j)),
            hints: [`${C.colHint} Где они записаны — в строке «${names[j]}» или в столбце «${names[j]}»?`, `Нужен столбец «${names[j]}»: ${colVals.join(' + ')}.`],
            solution: `Складываем столбец «${names[j]}»: ${colVals.join(' + ')} = ${cs(j)}.`,
            wrongs: W(ans(cs(j)), { 'table-wrong-cell': rs(j) }), data: { kind, t, j },
          };
        }
        const dv = rs(j) - cs(j); if (dv === 0) return null;
        return {
          story: C.story, question: C.diff(names[j]), figure: fig, answer: ans(dv),
          hints: [`Сумма строки «${names[j]}» — от него, сумма столбца «${names[j]}» — к нему.`, `Строка: ${rs(j)}, столбец: ${cs(j)}.`],
          solution: `${rs(j)} − ${cs(j)} = ${num(dv)}.`,
          wrongs: W(ans(dv), { 'table-wrong-cell': -dv }), data: { kind, t, j },
        };
      });
      // круговые диаграммы
      return retry(() => {
        const C = pick(PIE_CTX), of = C.fixedN ? 12 : kind === 'pieangle' ? pick([8, 12]) : pick(L3(lv, [4, 8], [8, 12], [8, 12]));
        const k = C.preset ? 5 : rnd(3, Math.min(4, of - 1)), parts = C.preset ? C.preset() : splitParts(of, k), labels = C.preset ? C.labels : shuffle(C.labels).slice(0, k);
        const items = labels.map((l, i) => ({ label: l, parts: parts[i] }));
        const N = C.fixedN || of * rnd(...L3(lv, [2, 5], [2, 6], [3, 8]));
        const i = rnd(0, k - 1), pi = parts[i];
        if (kind === 'piefrac') {
          return {
            story: C.intro(N).replace(/ Результаты — на круговой диаграмме\./, ' Результаты — на круговой диаграмме, круг разделён на равные части.'),
            question: C.part(labels[i]) + ' ' + FRQ, figure: { type: 'pie7', of, items }, answer: fs(pi, of), accept: 'equivalent',
            hints: [`На сколько равных частей размечен круг? Сколько из них занимает сектор «${labels[i]}»?`, `Круг — ${of} равных частей, сектор «${labels[i]}» — ${pi}.`],
            solution: `${pi} из ${of}: ${fh(pi, of)}.`,
            wrongs: W(fs(pi, of), { 'pie-equal-sectors': fs(1, k) }), data: { kind, of, parts, i },
          };
        }
        if (kind === 'pieangle') {
          const deg = pi * 360 / of, cnt = N * pi / of;
          return {
            story: C.intro(N).replace(/ Результаты — на круговой диаграмме\./, ' Результаты — на круговой диаграмме, у секторов подписаны углы.'),
            question: C.q(labels[i]), figure: { type: 'pie7', of, deg: true, items }, answer: ans(cnt),
            hints: [`Весь круг — 360°. Какую часть круга составляет сектор ${num(deg)}°?`, `${num(deg)}° — это ${fh(deg, 360)} круга. Найди ${fh(deg, 360)} от ${N}.`],
            solution: `${num(deg)} : 360 = ${fh(deg, 360)}; ${N} : ${F(deg, 360)[1]} · ${F(deg, 360)[0]} = ${num(cnt)}.`,
            wrongs: W(ans(cnt), { 'pie-angle-as-percent': N * deg / 100, 'pie-equal-sectors': N / k }), data: { kind, of, parts, i, N },
          };
        }
        const cnt = N * pi / of;
        const wr = W(ans(cnt), { 'pie-equal-sectors': N / k });
        if (lv > 1 && !wr['pie-equal-sectors']) return null;
        return {
          story: C.intro(N).replace(/ Результаты — на круговой диаграмме\./, ' Результаты — на круговой диаграмме, круг разделён на равные части.'),
          question: C.q(labels[i]), figure: { type: 'pie7', of, items }, answer: ans(cnt),
          hints: [`Сколько приходится на одну равную часть круга? Всего частей ${of}.`, `Одна часть — ${N} : ${of} = ${num(N / of)}. Сектор «${labels[i]}» занимает ${pi} ${pl(pi, 'часть', 'части', 'частей')}.`],
          solution: `${N} : ${of} · ${pi} = ${num(cnt)}.`,
          wrongs: wr, data: { kind, of, parts, i, N },
        };
      });
    },
    verify(t) {
      const d = t.data, x = val(t.answer);
      if (d.kind === 'cell') return x === d.t[d.i][d.j];
      if (d.kind === 'col' || d.kind === 'diff') {
        let inc = 0, out = 0; d.t.forEach((r, i) => r.forEach((c, j) => { if (c == null) return; if (j === d.j) inc += c; if (i === d.j) out += c; }));
        return d.kind === 'col' ? x === inc : x === out - inc;
      }
      if (sum(d.parts) !== d.of) return false;
      if (d.kind === 'piefrac') return eq(x * d.of, d.parts[d.i]);
      return eq(x * 360, d.N * d.parts[d.i] * (360 / d.of));
    },
  };

  /* =========================================================
     7 класс. s7-prob — случайные события, вероятность и частота
     ========================================================= */
  const DICE_EV = [['выпадет шестёрка', [6]], ['выпадет единица', [1]], ['выпадет число больше 4', [5, 6]], ['выпадет число меньше 3', [1, 2]], ['выпадет число, кратное 3', [3, 6]], ['выпадет число больше 2', [3, 4, 5, 6]], ['выпадет не больше 4 очков', [1, 2, 3, 4]], ['выпадет число больше 1', [2, 3, 4, 5, 6]], ['выпадет пятёрка или шестёрка', [5, 6]]];
  const COLORS = [['красных', 'красный'], ['синих', 'синий'], ['зелёных', 'зелёный'], ['жёлтых', 'жёлтый']];
  const PROB = {
    id: 's7-prob', strand: ST, grade: 7, short: 'Вероятность',
    title: 'Случайные события, вероятность и частота',
    frp: ['Случайный опыт и случайное событие. Вероятность и частота события', 'Монета и игральная кость в теории вероятностей'],
    goal: 'Находить вероятность события в опыте с равновозможными исходами, частоту события по результатам опыта и отличать одно от другого.',
    requires: ['concept', 'd5-convert'],
    explain: {
      model: 'Перед матчем судья бросает монету. Стороны у монеты одинаковые по шансам, поэтому у орла вероятность 1/2. А у кубика шесть одинаковых граней — шестёрка лишь одна из шести, её вероятность 1/6. Бросишь кубик 60 раз — шестёрка выпадет примерно 10 раз, а сколько точно, покажет только опыт. Доля выпадений в настоящем опыте — это частота.',
      rule: '<ul class="rule-list"><li><b>Вероятность</b> события в опыте с равновозможными исходами: P = ' + fr('m', 'n') + ', где n — число всех исходов, m — число исходов, при которых событие наступает.</li><li>Всегда 0 ≤ P ≤ 1: подходящих исходов не больше, чем всех.</li><li>«Случится или нет» — это не два равновозможных исхода! Считай исходы опыта: грани кубика, шарики в коробке, билеты.</li><li><b>Частота</b> = ' + fr('сколько раз случилось', 'сколько было опытов') + ' — её считают по результатам опыта. При большом числе опытов частота близка к вероятности, но обычно не равна ей.</li></ul>',
      examples: [
        { q: 'Бросают кубик. Какова вероятность, что выпадет число больше 4?', choices: [fr(1, 3), fr(1, 2), '3'], correct: 0, wrong: { 1: 'two-outcomes-half', 2: 'ratio-flipped' },
          steps: ['Всего исходов 6: 1, 2, 3, 4, 5, 6.', 'Подходят 5 и 6 — два исхода.', `P = ${fr(2, 6)} = ${fr(1, 3)}.`] },
        { q: 'Монету бросили 20 раз, орёл выпал 13 раз. Найди частоту выпадения орла.', choices: ['0,65', '0,5'], correct: 0, wrong: { 1: 'freq-as-prob' },
          steps: ['Частота — по результатам опыта: орёл выпал 13 раз из 20.', '13 : 20 = 0,65. Вероятность орла 0,5, но частота в этом опыте другая.'] },
      ],
    },
    mistakes: [
      { id: 'two-outcomes-half', title: 'Считает исходы «да» и «нет» равновозможными: вероятность 1/2', kidName: 'Пополамщик',
        kidRule: 'ты думаешь: событие либо случится, либо нет — значит, вероятность 1/2',
        say: 'Исходов «случится» и «не случится» два, но шансы у них разные. Посчитай все равновозможные исходы опыта и сколько из них подходят.',
        fixIdea: 'Вероятность = подходящие исходы : все равновозможные исходы. «Да или нет» — не равновозможные исходы.',
        explainOptions: ['У кубика 6 равных граней, шестёрка — одна из них: вероятность 1/6', 'Шестёрка либо выпадет, либо нет — вероятность 1/2', 'Если не знаешь ответа, вероятность всегда 1/2'],
        conflicts: [{ text: 'По твоему правилу вероятность шестёрки — 1/2 (выпадет или нет). Так же и для пятёрки, и для любой другой грани. Тогда у шести граней вместе вышло бы 6 · 1/2 = 3. Но какая-нибудь грань выпадет наверняка — вероятность этого 1.', ask: 'Может ли сумма вероятностей всех граней быть больше 1?', choices: ['Нет', 'Да'], right: 'Нет', verify: () => 6 * 0.5 > 1 && eq(6 * (1 / 6), 1) }] },
      { id: 'freq-as-prob', title: 'Путает частоту события в опыте с его вероятностью', kidName: 'Теоретик',
        kidRule: 'ты на вопрос о частоте отвечаешь вероятностью — тем, что «должно» получиться, а не тем, что получилось в опыте',
        say: 'Частота — то, что получилось на самом деле: сколько раз событие случилось, делённое на число опытов. Её считают по результатам, а не по теории.',
        fixIdea: 'Частота = сколько раз случилось : сколько было опытов. Она бывает близка к вероятности, но обычно не равна ей.',
        explainOptions: ['Орёл выпал 13 раз из 20 — частота 13/20 = 0,65', 'Частота орла всегда 0,5: монета ведь честная', 'Частота — это просто число выпадений, 13'],
        conflicts: [{ text: 'Монету бросили 4 раза, и все 4 раза выпал орёл. По твоему правилу частота орла — 0,5. Но решка в этом опыте не выпала ни разу!', ask: 'Какая часть бросков в этом опыте дала орла?', choices: ['все', 'половина'], right: 'все', verify: () => 4 / 4 === 1 }] },
      { id: 'ratio-flipped', title: 'Делит число всех исходов на число подходящих (n/m вместо m/n)', kidName: 'Перевёртыш',
        kidRule: 'ты делишь число всех исходов на число подходящих, а не наоборот',
        say: 'Вероятность не бывает больше 1: подходящих исходов не больше, чем всех. Сверху — подходящие, снизу — все.',
        fixIdea: 'P = подходящие : все. Сверху стоит меньшее (или равное) число, поэтому 0 ≤ P ≤ 1.',
        explainOptions: ['Шестёрка — 1 исход из 6: P = 1/6', 'P = 6/1 = 6: всех исходов 6, подходящий 1', 'P = 6 − 1 = 5'],
        conflicts: [{ text: 'В коробке 10 шариков, из них 2 красных. По твоему правилу вероятность достать красный — 10 : 2 = 5. Но у события, которое случится наверняка, вероятность всего 1.', ask: 'Может ли вероятность быть больше 1?', choices: ['Нет', 'Да'], right: 'Нет', verify: () => 10 / 2 > 1 && 2 / 10 <= 1 }],
        root: 'concept' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['dice', 'bag', 'freq', 'freq', 'class'], ['dice', 'bag', 'class', 'tickets', 'freq', 'freq', 'expect'], ['dice', 'bag', 'tickets', 'freq', 'expect', 'expect']));
      if (kind === 'dice') {
        const [ev, set] = pick(lv === 1 ? DICE_EV.slice(0, 5) : DICE_EV), m = set.length;
        return {
          story: 'Бросают игральный кубик.', question: `Какова вероятность того, что ${ev}?${pq(m, 6)}`, answer: Pa(m, 6), accept: Pacc(m, 6),
          hints: ['Сколько всего равновозможных исходов у броска кубика? Сколько из них подходят?', `Всего исходов 6. Подходят: ${set.join(', ')} — ${m} ${pl(m, 'исход', 'исхода', 'исходов')}.`],
          solution: `P = ${fr(m, 6)}${F(m, 6)[1] !== 6 ? ' = ' + fh(m, 6) : ''}.`,
          wrongs: W(Pa(m, 6), { 'two-outcomes-half': 0.5, 'ratio-flipped': Pa(6, m) }), data: { kind, set },
        };
      }
      if (kind === 'bag') return retry(() => {
        const c = rnd(2, 3), cols = shuffle(COLORS).slice(0, c), cnt = cols.map(() => rnd(1, L3(lv, 6, 9, 12))), N = sum(cnt), i = rnd(0, c - 1);
        if (lv < 3 && !isDec(cnt[i], N)) return null;
        if (cnt[i] * c === N) return null;
        const thing = pick([['шарики', 'шарик'], ['кубики', 'кубик'], ['фломастеры', 'фломастер']]);
        return {
          story: `В коробке лежат одинаковые на ощупь ${thing[0]}: ${cols.map((cl, j) => `${cl[0]} — ${cnt[j]}`).join(', ')}. Наугад достают один ${thing[1]}.`,
          question: `Какова вероятность, что он ${cols[i][1]}?${pq(cnt[i], N)}`, answer: Pa(cnt[i], N), accept: Pacc(cnt[i], N),
          hints: ['Каждый предмет в коробке — отдельный равновозможный исход. Сколько их всего?', `Всего ${cnt.join(' + ')} = ${N}, подходящих — ${cnt[i]}.`],
          solution: `P = ${fr(cnt[i], N)}${clean2(cnt[i] / N) ? ' = ' + num(cnt[i] / N) : F(cnt[i], N)[1] !== N ? ' = ' + fh(cnt[i], N) : ''}.`,
          wrongs: W(Pa(cnt[i], N), { 'two-outcomes-half': Pa(1, c), 'ratio-flipped': Pa(N, cnt[i]) }), data: { kind, cnt, i },
        };
      });
      if (kind === 'class') return retry(() => {
        const b = rnd(8, 15), g = rnd(8, 15), N = b + g, girl = Math.random() < 0.5, m = girl ? g : b;
        if (!isDec(m, N) || b === g) return null;
        return {
          story: `В классе ${b} ${pl(b, 'мальчик', 'мальчика', 'мальчиков')} и ${g} ${pl(g, 'девочка', 'девочки', 'девочек')}. Дежурного выбирают жребием.`,
          question: `Какова вероятность, что дежурным окажется ${girl ? 'девочка' : 'мальчик'}?`, answer: Pa(m, N),
          hints: ['Каждый ученик — равновозможный исход. Сколько всего учеников?', `Всего ${N}, ${girl ? 'девочек' : 'мальчиков'} ${m}.`],
          solution: `P = ${fr(m, N)} = ${num(m / N)}.`,
          wrongs: W(Pa(m, N), { 'two-outcomes-half': 0.5, 'ratio-flipped': Pa(N, m) }), data: { kind, m, N },
        };
      });
      if (kind === 'tickets') return retry(() => {
        const N = pick([20, 25, 40, 50, 100]), m = rnd(1, N / 4);
        if (!isDec(m, N)) return null;
        return {
          story: `На школьном празднике гостям раздают ${N} пронумерованных ${pl(N, 'билет', 'билета', 'билетов')}, на ${m} из них — приз (книга или настольная игра).`,
          question: 'Какова вероятность, что на твоём билете будет приз?', answer: Pa(m, N),
          hints: ['Билеты раздают случайно, каждый билет — равновозможный исход.', `Всего ${N} билетов, призовых ${m}.`],
          solution: `P = ${fr(m, N)} = ${num(m / N)}.`,
          wrongs: W(Pa(m, N), { 'two-outcomes-half': 0.5, 'ratio-flipped': Pa(N, m) }), data: { kind, m, N },
        };
      });
      if (kind === 'freq') return retry(() => {
        const st = pick(['coin', 'dice', 'ball', 'bag']), N = pick(L3(lv, [10, 20, 50], [20, 25, 40, 50], [40, 50, 80, 200]));
        let k, theory = null, story, q;
        if (st === 'coin') { k = rnd(Math.round(N * 0.3), Math.round(N * 0.7)); theory = 0.5; story = `Монету бросили ${N} раз, орёл выпал ${k} ${pl(k, 'раз', 'раза', 'раз')}.`; q = 'Найди частоту выпадения орла в этом опыте.'; }
        else if (st === 'dice') { k = rnd(Math.max(1, Math.round(N / 12)), Math.round(N / 3)); theory = '1/6'; story = `Кубик бросили ${N} раз, шестёрка выпала ${k} ${pl(k, 'раз', 'раза', 'раз')}.`; q = 'Найди частоту выпадения шестёрки в этом опыте.'; }
        else if (st === 'ball') { k = rnd(Math.round(N * 0.3), N - 1); const who = pick(NAMES); story = `${who[0]} ${ed(who, 'сделал', 'сделала')} ${N} ${pl(N, 'бросок', 'броска', 'бросков')} мячом в кольцо и ${k} ${pl(k, 'раз', 'раза', 'раз')} ${ed(who, 'попал', 'попала')}.`; q = 'Найди частоту попаданий.'; }
        else { const r = rnd(1, 4), b = 10 - r; k = rnd(Math.max(1, Math.round(N * r / 10 * 0.5)), Math.round(N * r / 10 * 1.5)); theory = r / 10; story = `В мешке ${r} ${pl(r, 'красный', 'красных', 'красных')} и ${b} ${pl(b, 'синий', 'синих', 'синих')} ${pl(b, 'шар', 'шара', 'шаров')}. ${N} раз доставали шар наугад и возвращали обратно. Красный достали ${k} ${pl(k, 'раз', 'раза', 'раз')}.`; q = 'Найди частоту появления красного шара в этом опыте.'; }
        if (!isDec(k, N) || (typeof theory === 'number' && eq(theory, k / N)) || k <= 0 || k >= N) return null;
        return {
          story, question: q, answer: Pa(k, N),
          hints: ['Частоту считают по результатам опыта, а не по теории: сколько раз событие случилось, делённое на число опытов.', `${k} : ${N}.`],
          solution: `Частота = ${fr(k, N)} = ${num(k / N)}.`,
          wrongs: W(Pa(k, N), { 'freq-as-prob': theory, 'ratio-flipped': Pa(N, k) }), data: { kind, k, N },
        };
      });
      // expect: сколько примерно раз
      return retry(() => {
        const st = pick(['dice', 'bag']);
        if (st === 'dice') {
          const [ev, set] = pick(DICE_EV.filter(e => e[1].length !== 3)), m = set.length, N = 6 * rnd(L3(lv, 2, 3, 5), L3(lv, 10, 20, 50)), r = N * m / 6;
          return {
            story: `Кубик бросают ${N} раз.`, question: `Сколько примерно раз ${ev}? (Умножь число бросков на вероятность.)`, answer: ans(r),
            hints: ['Сначала найди вероятность события при одном броске.', `Вероятность ${fh(m, 6)}; ${N} · ${fh(m, 6)}.`],
            solution: `P = ${fh(m, 6)}; ${N} · ${fh(m, 6)} = ${num(r)}.`,
            wrongs: W(ans(r), { 'two-outcomes-half': N / 2 }), data: { kind, m, n: 6, N },
          };
        }
        const r0 = rnd(1, 4), tot = pick([5, 10]), N = tot * rnd(4, 20), rr = N * r0 / tot;
        if (2 * r0 === tot) return null;
        return {
          story: `В коробке ${tot} одинаковых шариков, из них ${r0} ${pl(r0, 'красный', 'красных', 'красных')}. ${N} раз достают шарик наугад и возвращают обратно.`,
          question: 'Сколько примерно раз достанут красный шарик? (Умножь число опытов на вероятность.)', answer: ans(rr),
          hints: ['Найди вероятность достать красный шарик за один раз.', `Вероятность ${fh(r0, tot)}; ${N} · ${fh(r0, tot)}.`],
          solution: `${N} · ${fh(r0, tot)} = ${num(rr)}.`,
          wrongs: W(ans(rr), { 'two-outcomes-half': N / 2 }), data: { kind, m: r0, n: tot, N },
        };
      });
    },
    verify(t) {
      const d = t.data, x = val(t.answer);
      if (d.kind === 'dice') { let m = 0; for (let f = 1; f <= 6; f++) if (d.set.includes(f)) m++; return eq(x * 6, m); }
      if (d.kind === 'bag') { const all = []; d.cnt.forEach((c, j) => { for (let q = 0; q < c; q++) all.push(j); }); return eq(x, all.filter(j => j === d.i).length / all.length); }
      if (['class', 'tickets'].includes(d.kind)) return eq(x * d.N, d.m);
      if (d.kind === 'freq') return eq(x * d.N, d.k);
      return eq(x * d.n, d.N * d.m);
    },
  };

  /* =========================================================
     7 класс. s7-graphs — графы, степени, эйлеров путь
     ========================================================= */
  const LET = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const degs = (n, e) => { const d = Array(n).fill(0); e.forEach(([a, b]) => { d[a]++; d[b]++; }); return d; };
  const connected = (n, e) => { const seen = new Set([0]), st = [0]; while (st.length) { const v = st.pop(); for (const [a, b] of e) { const w = a === v ? b : b === v ? a : -1; if (w >= 0 && !seen.has(w)) { seen.add(w); st.push(w); } } } return seen.size === n; };
  function randGraph(n, mMin, mMax) {
    return retry(() => {
      const pairs = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
      const m = rnd(mMin, Math.min(mMax, pairs.length)), e = shuffle(pairs).slice(0, m);
      return connected(n, e) ? e : null;
    });
  }
  // есть ли путь, проходящий по каждому ребру ровно один раз (перебором), при желании — из вершины start
  function eulerSearch(n, e, start) {
    const used = Array(e.length).fill(false);
    const go = (v, k) => { if (k === e.length) return true; for (let i = 0; i < e.length; i++) { if (used[i]) continue; const [a, b] = e[i]; if (a !== v && b !== v) continue; used[i] = true; if (go(a === v ? b : a, k + 1)) return true; used[i] = false; } return false; };
    const starts = start == null ? Array.from({ length: n }, (_, i) => i) : [start];
    return starts.some(s => go(s, 0));
  }
  const GRAPHS = {
    id: 's7-graphs', strand: ST, grade: 7, short: 'Графы',
    title: 'Графы: вершины, рёбра, степени, пути',
    frp: ['Граф, вершина, ребро. Степень (валентность) вершины. Число рёбер и суммарная степень вершин', 'Цепь и цикл. Путь в графе. Представление о связности графа. Обход графа (эйлеров путь)'],
    goal: 'Находить степени вершин, число рёбер по степеням, решать задачи о рукопожатиях и понимать, когда граф можно обойти, пройдя каждое ребро по одному разу.',
    requires: ['t5-enum'],
    explain: {
      model: 'Нарисуй 5 городов точками и соедини линиями те, между которыми есть дорога. Точки — это вершины графа, линии — рёбра. Степень вершины — сколько дорог выходит из города. Заметь: каждая дорога выходит сразу из двух городов, поэтому, сложив степени всех вершин, мы посчитаем каждую дорогу дважды.',
      figure: { type: 'graph7', v: ['A', 'B', 'C', 'D', 'E'], e: [[0, 1], [0, 4], [1, 2], [1, 3], [2, 3], [3, 4]] },
      figureCaption: 'Степени: A — 2, B — 3, C — 2, D — 3, E — 2. Сумма 12, рёбер 6',
      rule: '<ul class="rule-list"><li><b>Степень вершины</b> — число рёбер, выходящих из неё.</li><li><b>Сумма степеней всех вершин = 2 · число рёбер</b>: у каждого ребра два конца. Поэтому вершин нечётной степени всегда чётное число.</li><li>Каждый из n человек пожал руку каждому: рукопожатий ' + fr('n · (n − 1)', '2') + '.</li><li><b>Эйлеров путь</b> (обойти все рёбра по одному разу) есть в связном графе, только если вершин нечётной степени 0 или 2. Если их 2, путь начинается в одной из них, а заканчивается в другой.</li></ul>',
      examples: [
        { q: 'В графе 5 вершин, их степени: 2, 3, 2, 3, 2. Сколько в графе рёбер?', choices: ['6', '12'], correct: 0, wrong: { 1: 'degree-sum-edges' },
          steps: ['Сумма степеней: 2 + 3 + 2 + 3 + 2 = 12.', 'Каждое ребро посчитано дважды — у обоих концов: 12 : 2 = 6.'] },
        { q: 'Можно ли обойти этот граф, пройдя по каждому ребру ровно один раз?', fig: { type: 'graph7', v: ['A', 'B', 'C', 'D'], e: [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [1, 3]] },
          choices: ['нет', 'да'], correct: 0, wrong: { 1: 'euler-always' },
          steps: ['Степени: у каждой из четырёх вершин по 3 ребра.', 'Вершин нечётной степени 4 — больше двух. Обойти так нельзя.'] },
      ],
    },
    mistakes: [
      { id: 'degree-sum-edges', title: 'Считает, что сумма степеней вершин равна числу рёбер', kidName: 'Однобокий',
        kidRule: 'ты думаешь, что сумма степеней всех вершин равна числу рёбер',
        say: 'Каждое ребро соединяет две вершины, поэтому в сумме степеней оно посчитано дважды: у одного конца и у другого.',
        fixIdea: 'Сумма степеней всех вершин = 2 · число рёбер. Значит, рёбер — половина суммы степеней.',
        explainOptions: ['Граф из одного ребра A — B: степени 1 и 1, сумма 2 = 2 · 1', 'Сумма степеней всегда равна числу рёбер', 'Сумма степеней всегда равна числу вершин'],
        conflicts: [{ text: 'Две вершины A и B соединены одним ребром. У A степень 1, у B степень 1, сумма степеней 2. По твоему правилу рёбер тоже 2.', ask: 'Сколько рёбер на рисунке?', choices: ['1', '2'], right: '1', verify: () => sum(degs(2, [[0, 1]])) === 2, figure: { type: 'graph7', v: ['A', 'B'], e: [[0, 1]] } }], root: 't5-enum' },
      { id: 'euler-always', title: 'Считает, что эйлеров путь есть в любом графе', kidName: 'Оптимист',
        kidRule: 'ты думаешь, что любой граф можно обойти, пройдя по каждому ребру ровно один раз',
        say: 'Посчитай вершины нечётной степени. Если их больше двух, обойти все рёбра по одному разу нельзя.',
        fixIdea: 'Эйлеров путь есть в связном графе, только если вершин нечётной степени 0 или 2.',
        explainOptions: ['В графе с четырьмя вершинами нечётной степени эйлерова пути нет', 'Любой граф можно обойти, если долго пробовать', 'Эйлеров путь есть, только если все степени нечётные'],
        conflicts: [{ text: 'Граф-«звезда»: вершина A соединена с B, C и D, других рёбер нет. По твоему правилу его можно обойти, пройдя каждое ребро один раз. Попробуй: из B в A, из A в C… а дальше из C идти некуда, ребро AD так и осталось непройденным.', ask: 'Сколько вершин нечётной степени у «звезды»?', choices: ['4', '2', '0'], right: '4', verify: () => degs(4, [[0, 1], [0, 2], [0, 3]]).filter(x => x % 2).length === 4 && !eulerSearch(4, [[0, 1], [0, 2], [0, 3]]),
          figure: { type: 'graph7', v: ['A', 'B', 'C', 'D'], e: [[0, 1], [0, 2], [0, 3]] } }] },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['degree', 'odd', 'edges', 'sumdeg', 'euler', 'complete'], ['edges', 'handshake', 'sumdeg', 'euler', 'euler', 'complete'], ['edges', 'handshake', 'complete', 'euler', 'euler', 'start']));
      if (kind === 'degree' || kind === 'odd') {
        const n = rnd(4, 5), e = randGraph(n, n, n + 2), d = degs(n, e), v = LET.slice(0, n);
        if (kind === 'degree') {
          const i = rnd(0, n - 1);
          return {
            story: 'На рисунке — граф.', question: `Какова степень вершины ${v[i]}?`, figure: { type: 'graph7', v, e }, answer: ans(d[i]),
            hints: ['Степень вершины — сколько рёбер из неё выходит.', `Посчитай линии, которые касаются вершины ${v[i]}.`],
            solution: `Из ${v[i]} выходят рёбра: ${e.filter(p => p.includes(i)).map(([a, b]) => v[a] + v[b]).join(', ')} — степень ${d[i]}.`,
            wrongs: {}, data: { kind, n, e, i },
          };
        }
        const o = d.filter(x => x % 2).length;
        return {
          story: 'На рисунке — граф.', question: 'Сколько в нём вершин нечётной степени?', figure: { type: 'graph7', v, e }, answer: ans(o),
          hints: ['Найди степень каждой вершины — число выходящих из неё рёбер.', `Степени: ${v.map((x, i) => `${x} — ${d[i]}`).join(', ')}.`],
          solution: `Степени: ${v.map((x, i) => `${x} — ${d[i]}`).join(', ')}. Нечётных — ${o}.`, wrongs: {}, data: { kind, n, e },
        };
      }
      if (kind === 'edges') {
        const n = rnd(...L3(lv, [4, 5], [5, 6], [6, 7])), e = randGraph(n, n, n + 4), d = shuffle(degs(n, e)), S = sum(d);
        const ctx = pick([['В графе', 'вершин', 'Сколько в нём рёбер?'], ['Между', 'островами', 'Сколько всего мостов?']]);
        const story = ctx[0] === 'В графе' ? `В графе ${n} ${pl(n, 'вершина', 'вершины', 'вершин')}, их степени: ${d.join(', ')}.` : `Между ${n} островами построены мосты: каждый мост соединяет два острова. Число мостов, выходящих с каждого острова: ${d.join(', ')}.`;
        return {
          story, question: ctx[2], answer: ans(S / 2),
          hints: ['Сложи все степени. Сколько раз в этой сумме посчитано каждое ребро?', `Сумма степеней ${S}; каждое ребро посчитано дважды — у обоих концов.`],
          solution: `${d.join(' + ')} = ${S}; ${S} : 2 = ${S / 2}.`,
          wrongs: W(ans(S / 2), { 'degree-sum-edges': S }), data: { kind, n, e, d },
        };
      }
      if (kind === 'sumdeg') {
        const m = rnd(...L3(lv, [3, 9], [6, 15], [10, 25]));
        return {
          story: `В графе ${m} ${pl(m, 'ребро', 'ребра', 'рёбер')}.`, question: 'Чему равна сумма степеней всех его вершин?', answer: ans(2 * m),
          hints: ['Каждое ребро добавляет по единице к степени каждого из двух своих концов.', `Одно ребро даёт в сумму степеней 2. Рёбер ${m}.`],
          solution: `2 · ${m} = ${2 * m}.`, wrongs: W(ans(2 * m), { 'degree-sum-edges': m }), data: { kind, m },
        };
      }
      if (kind === 'handshake') return retry(() => {
        const n = rnd(5, 12), k = rnd(2, Math.min(5, n - 1));
        if ((n * k) % 2) return null;
        return {
          story: `На встрече было ${n} ${pl(n, 'человек', 'человека', 'человек')}, и каждый пожал руку ровно ${k} другим.`, question: 'Сколько всего было рукопожатий?', answer: ans(n * k / 2),
          hints: ['Представь граф: люди — вершины, рукопожатия — рёбра. Чему равна сумма степеней?', `Сумма степеней ${n} · ${k} = ${n * k}. Каждое рукопожатие в ней посчитано дважды.`],
          solution: `${n} · ${k} : 2 = ${n * k / 2}.`, wrongs: W(ans(n * k / 2), { 'degree-sum-edges': n * k }), data: { kind, n, k },
        };
      });
      if (kind === 'complete') {
        const n = rnd(...L3(lv, [4, 6], [5, 9], [7, 12])), st = pick(['chess', 'phone']);
        const r = n * (n - 1) / 2;
        return {
          story: st === 'chess' ? `В шахматном турнире ${n} ${pl(n, 'участник', 'участника', 'участников')}, каждый сыграл с каждым по одной партии.` : `${n} городов соединили телефонными линиями: каждый город с каждым — одной линией.`,
          question: st === 'chess' ? 'Сколько всего партий было сыграно?' : 'Сколько всего линий?', answer: ans(r),
          hints: [st === 'chess' ? 'Граф: вершины — участники, рёбра — партии. Какова степень каждой вершины?' : 'Граф: вершины — города, рёбра — линии. Какова степень каждой вершины?', `Степень каждой вершины ${n - 1}, сумма степеней ${n} · ${n - 1} = ${n * (n - 1)}.`],
          solution: `${n} · ${n - 1} : 2 = ${r}.`, wrongs: W(ans(r), { 'degree-sum-edges': n * (n - 1) }), data: { kind, n },
        };
      }
      // euler и start
      return retry(() => {
        const n = rnd(...L3(lv, [4, 5], [4, 6], [5, 6])), want = kind === 'start' ? 2 : pick([0, 2, 4, 4]);
        const e = randGraph(n, n, Math.min(n + 3, n * (n - 1) / 2)), d = degs(n, e), odd = d.map((x, i) => (x % 2 ? i : -1)).filter(i => i >= 0);
        if ((want === 4 ? odd.length < 4 : odd.length !== want)) return null;
        const v = LET.slice(0, n), fig = { type: 'graph7', v, e }, degTxt = `Степени: ${v.map((x, i) => `${x} — ${d[i]}`).join(', ')}.`;
        if (kind === 'start') {
          const evens = shuffle(v.filter((_, i) => d[i] % 2 === 0));
          if (evens.length < 2) return null;
          const right = v[pick(odd)], choices = shuffle([right, ...evens.slice(0, 2)]);
          return {
            story: 'Нужно обойти граф, пройдя по каждому ребру ровно один раз.', question: 'С какой из этих вершин можно начать обход?', figure: fig,
            answer: right, accept: 'choice', choices,
            hints: ['Посмотри на степени вершин. Если вершин нечётной степени две, путь начинается в одной из них.', degTxt],
            solution: `${degTxt} Нечётные — ${odd.map(i => v[i]).join(' и ')}: начинать нужно с одной из них, например с ${right}.`,
            wrongs: {}, data: { kind, n, e, right: v.indexOf(right) },
          };
        }
        const yes = odd.length <= 2, answer = yes ? 'да' : 'нет';
        const S = pick([['На рисунке — схема дорожек в парке.', 'Можно ли пройти по всем дорожкам, побывав на каждой ровно один раз?'], ['На рисунке — схема мостов между островами.', 'Можно ли пройти по всем мостам, побывав на каждом ровно один раз?'], ['На рисунке — граф.', 'Можно ли обойти граф, пройдя по каждому ребру ровно один раз?']]);
        return {
          story: S[0], question: S[1], figure: fig, answer, accept: 'choice', choices: ['да', 'нет'],
          hints: ['Найди степень каждой вершины и посчитай, сколько вершин нечётной степени.', degTxt],
          solution: `${degTxt} ${odd.length === 0 ? 'Вершин нечётной степени нет — путь есть, причём замкнутый.' : odd.length === 2 ? `Вершин нечётной степени ровно две (${odd.map(i => v[i]).join(' и ')}) — путь есть: он начинается в одной из них и заканчивается в другой.` : `Вершин нечётной степени ${odd.length} — больше двух, такого пути нет.`}`,
          wrongs: W(answer, { 'euler-always': 'да' }, true), data: { kind, n, e },
        };
      });
    },
    verify(t) {
      const d = t.data;
      if (d.kind === 'degree') return +t.answer === d.e.filter(([a, b]) => a === d.i || b === d.i).length;
      if (d.kind === 'odd') { let o = 0; for (let i = 0; i < d.n; i++) if (d.e.filter(p => p.includes(i)).length % 2) o++; return +t.answer === o; }
      if (d.kind === 'edges') return +t.answer === d.e.length && eq(sum(d.d), 2 * d.e.length);
      if (d.kind === 'sumdeg') { const n = d.m + 1, e = Array.from({ length: d.m }, (_, i) => [i, i + 1]); return +t.answer === sum(degs(n, e)); } // проверка на «цепочке» из m рёбер
      if (d.kind === 'handshake') { // строим граф: каждый соединён с k соседями по кругу (k чётное) или ещё с противоположным
        const e = new Set(); for (let i = 0; i < d.n; i++) for (let s = 1; s <= Math.floor(d.k / 2); s++) e.add([i, (i + s) % d.n].sort((a, b) => a - b).join('-'));
        if (d.k % 2) for (let i = 0; i < d.n / 2; i++) e.add([i, i + d.n / 2].join('-'));
        return +t.answer === e.size;
      }
      if (d.kind === 'complete') { let c = 0; for (let i = 0; i < d.n; i++) for (let j = i + 1; j < d.n; j++) c++; return +t.answer === c; }
      if (d.kind === 'start') return eulerSearch(d.n, d.e, d.right) && t.choices.filter(c => eulerSearch(d.n, d.e, LET.indexOf(c))).length === 1;
      return (t.answer === 'да') === (connected(d.n, d.e) && eulerSearch(d.n, d.e));
    },
  };

  const TOPICS = [MEAN, MEDIAN, TABLES, PROB, GRAPHS];
  /* =========================================================
     8 класс. s8-sets — множества, объединение и пересечение
     ========================================================= */
  const lcm2 = (a, b) => a * b / gcd(a, b);
  const SET_CTX = [
    { la: 'Футбол', lb: 'Плавание', intro: N => `В классе ${N} ${pl(N, 'ученик', 'ученика', 'учеников')}.`,
      giv: (a, b, c) => `Число тех, кто занимается футболом, — ${a}, плаванием — ${b}, и футболом, и плаванием — ${c}.`,
      union: 'Сколько человек занимаются хотя бы одним из этих видов спорта?', only: 'Сколько человек занимаются только футболом?', neither: 'Сколько учеников не занимаются ни футболом, ни плаванием?' },
    { la: 'Английский', lb: 'Немецкий', intro: N => `В языковом лагере ${N} ${pl(N, 'школьник', 'школьника', 'школьников')}.`,
      giv: (a, b, c) => `Число изучающих английский язык — ${a}, немецкий — ${b}, оба языка — ${c}.`,
      union: 'Сколько человек изучают хотя бы один из этих языков?', only: 'Сколько человек изучают только английский?', neither: 'Сколько школьников не изучают ни английский, ни немецкий?' },
    { la: 'Кошка', lb: 'Собака', intro: N => `Опросили ${N} ${pl(N, 'человека', 'человека', 'человек')}.`,
      giv: (a, b, c) => `Кошка есть у ${a} ${pl(a, 'человека', 'человек', 'человек')}, собака — у ${b}, и кошка, и собака — у ${c}.`,
      union: 'У скольких опрошенных есть хотя бы одно из этих животных?', only: 'У скольких опрошенных есть только кошка (без собаки)?', neither: 'У скольких опрошенных нет ни кошки, ни собаки?' },
  ];
  const SETS = {
    id: 's8-sets', strand: ST, grade: 8, short: 'Множества',
    title: 'Множества: объединение и пересечение',
    frp: ['Множество, элемент множества, подмножество. Операции над множествами: объединение, пересечение', 'Графическое представление множеств (круги Эйлера)'],
    goal: 'Находить число элементов объединения и пересечения множеств, использовать круги Эйлера и не считать общие элементы дважды.',
    requires: ['s7-tables', 'n5-divisors'],
    explain: {
      model: 'В классе 15 человек ходят на футбол, 12 — на плавание, а 4 из них — и туда, и туда. Сколько всего спортсменов? Если сложить 15 + 12 = 27, эти четверо попадут в сумму дважды: и как футболисты, и как пловцы. Поэтому лишний раз их нужно вычесть: 27 − 4 = 23.',
      figure: { type: 'venn8', la: 'Футбол — 15', lb: 'Плавание — 12', onlyA: 11, both: 4, onlyB: 8 },
      figureCaption: 'Только футбол — 11, только плавание — 8, оба — 4. Всего 11 + 4 + 8 = 23',
      rule: '<ul class="rule-list"><li><b>Пересечение</b> A ∩ B — элементы, которые есть и в A, и в B. <b>Объединение</b> A ∪ B — элементы, которые есть хотя бы в одном из них.</li><li><b>Число элементов объединения:</b> |A ∪ B| = |A| + |B| − |A ∩ B| — общие элементы иначе посчитаны дважды.</li><li><b>Только A</b> = |A| − |A ∩ B|.</li><li><b>Ни A, ни B</b> = всего − |A ∪ B|.</li></ul>',
      examples: [
        { q: 'Футболом занимаются 15 человек, плаванием — 12, обоими видами — 4. Сколько человек занимаются хотя бы одним видом?', fig: { type: 'venn8', la: 'Футбол — 15', lb: 'Плавание — 12', both: 4 },
          choices: ['23', '27'], correct: 0, wrong: { 1: 'union-no-subtract' },
          steps: ['15 + 12 = 27 — в этой сумме 4 человека посчитаны дважды.', '27 − 4 = 23.'] },
        { q: 'Там же: сколько человек занимаются только футболом?', fig: { type: 'venn8', la: 'Футбол — 15', lb: 'Плавание — 12', onlyA: '?', both: 4 },
          choices: ['11', '15'], correct: 0, wrong: { 1: 'only-as-whole' },
          steps: ['В число 15 входят и те 4, кто ещё плавает.', 'Только футбол: 15 − 4 = 11.'] },
      ],
    },
    mistakes: [
      { id: 'union-no-subtract', title: 'Находит число элементов объединения как |A| + |B|, не вычитая пересечение', kidName: 'Двойной учёт',
        kidRule: 'ты складываешь две группы и забываешь, что тех, кто в обеих, посчитал дважды',
        say: 'Элементы, которые входят в оба множества, попали и в первое число, и во второе. Их посчитали дважды — один раз нужно вычесть.',
        fixIdea: '|A ∪ B| = |A| + |B| − |A ∩ B|.',
        explainOptions: ['15 футболистов и 12 пловцов, 4 из них в обеих группах: всего 15 + 12 − 4 = 23', 'Всего 15 + 12 = 27', 'Всего 15 + 12 + 4 = 31'],
        conflicts: [{ text: 'В классе 25 человек. Английский изучают все 25, а 10 из них ещё и немецкий. По твоему правилу хотя бы один язык изучают 25 + 10 = 35 человек — больше, чем есть в классе.', ask: 'Сколько человек изучают хотя бы один язык?', choices: ['25', '35'], right: '25', verify: () => 25 + 10 - 10 === 25,
          figure: { type: 'venn8', la: 'Английский — 25', lb: 'Немецкий — 10', both: 10, onlyB: 0 } }] },
      { id: 'only-as-whole', title: 'Принимает «только A» за всё множество A', kidName: 'Весь-целиком',
        kidRule: 'ты на вопрос «сколько только в A» называешь всех, кто в A, вместе с теми, кто ещё и в B',
        say: 'В число элементов A входят и те, кто одновременно в B. «Только A» — это A без пересечения.',
        fixIdea: 'Только A = |A| − |A ∩ B|. На кругах Эйлера это часть круга A вне общей части.',
        explainOptions: ['Футболистов 15, из них 4 ещё и плавают: только футбол — 11', 'Только футболом занимаются все 15 футболистов', 'Только футбол: 15 + 4 = 19'],
        conflicts: [{ text: 'Футболом занимаются 15 человек, плаванием — 12, обоими видами — 4. По твоему правилу только футболом занимаются 15, только плаванием — 12, да ещё 4 — обоими: всего 31. Но мы уже знаем, что спортсменов 23.', ask: 'Сколько человек занимаются только футболом?', choices: ['11', '15'], right: '11', verify: () => (15 - 4) + (12 - 4) + 4 === 23,
          figure: { type: 'venn8', la: 'Футбол — 15', lb: 'Плавание — 12', both: 4 } }] },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['lists', 'union', 'union', 'only'], ['lists', 'union', 'only', 'neither', 'neither'], ['union', 'neither', 'only', 'kmul', 'kmul', 'both']));
      if (kind === 'lists') return retry(() => {
        const U = shuffle(Array.from({ length: 30 }, (_, i) => i + 1)), c = rnd(1, 3), na = rnd(4, 6), nb = rnd(4, 6);
        const common = U.slice(0, c), A = sorted([...common, ...U.slice(c, c + na - c)]), B = sorted([...common, ...U.slice(na, na + nb - c)]);
        const q = pick(['union', 'union', 'inter', 'diff']);
        const inter = A.filter(x => B.includes(x)), uni = sorted([...new Set([...A, ...B])]), diff = A.filter(x => !B.includes(x));
        const r = { union: uni.length, inter: inter.length, diff: diff.length }[q];
        const Q = { union: 'Сколько элементов в объединении A ∪ B?', inter: 'Сколько элементов в пересечении A ∩ B?', diff: 'Сколько элементов множества A не входят в B?' }[q];
        return {
          story: `Даны множества A = {${A.join('; ')}} и B = {${B.join('; ')}}.`, question: Q, answer: ans(r),
          hints: [q === 'union' ? 'В объединение каждое число входит один раз, даже если оно есть в обоих множествах.' : q === 'inter' ? 'В пересечение входят числа, которые есть и в A, и в B.' : 'Вычеркни из A числа, которые есть и в B.', `Общие элементы: ${inter.join('; ')}.`],
          solution: q === 'union' ? `A ∪ B = {${uni.join('; ')}} — ${r} ${pl(r, 'элемент', 'элемента', 'элементов')}: ${A.length} + ${B.length} − ${inter.length} = ${r}.` : q === 'inter' ? `A ∩ B = {${inter.join('; ')}} — ${r}.` : `Без общих элементов в A остаются ${diff.join('; ')} — ${r}.`,
          wrongs: W(ans(r), { 'union-no-subtract': q === 'union' ? A.length + B.length : null, 'only-as-whole': q === 'diff' ? A.length : null }), data: { kind, A, B, q },
        };
      });
      if (kind === 'kmul') return retry(() => {
        const [p, q] = pick([[2, 3], [2, 5], [3, 5], [3, 4], [4, 6], [2, 7], [3, 7]]), N = rnd(20, 60), l = lcm2(p, q);
        const nA = Math.floor(N / p), nB = Math.floor(N / q), nAB = Math.floor(N / l);
        if (nAB < 1) return null;
        const only = Math.random() < 0.4, r = only ? nA - nAB : nA + nB - nAB;
        return {
          story: `Рассмотрим натуральные числа от 1 до ${N}.`, question: only ? `Сколько среди них чисел, которые делятся на ${p}, но не делятся на ${q}?` : `Сколько среди них чисел, которые делятся на ${p} или на ${q}?`, answer: ans(r),
          hints: [`Сколько чисел делятся на ${p}? На ${q}? На оба числа сразу — то есть на ${l}?`, `На ${p}: ${nA}; на ${q}: ${nB}; на ${l}: ${nAB}.`],
          solution: only ? `${nA} − ${nAB} = ${r}.` : `${nA} + ${nB} − ${nAB} = ${r}.`,
          wrongs: W(ans(r), { 'union-no-subtract': only ? null : nA + nB, 'only-as-whole': only ? nA : null }), data: { kind, p, q, N, only },
        };
      });
      const C = pick(SET_CTX), hi = L3(lv, 15, 25, 40);
      return retry(() => {
        const a = rnd(4, hi), b = rnd(4, hi), c = rnd(1, Math.min(a, b) - 1);
        if (a === b) return null;
        if (kind === 'both') {
          const N = a + b - c;
          return {
            story: `${C.intro(N)} ${C.giv(a, b, '?').replace(/, (и [^—]+|оба языка) — (у )?\?\./, '.')} Каждый попал хотя бы в одну из этих групп.`,
            question: { Футбол: 'Сколько человек занимаются и футболом, и плаванием?', Английский: 'Сколько человек изучают оба языка?', Кошка: 'У скольких опрошенных есть и кошка, и собака?' }[C.la], answer: ans(c),
            hints: ['Если сложить обе группы, общие элементы окажутся посчитаны дважды. На сколько сумма больше общего числа?', `${a} + ${b} = ${a + b}, а всего ${N}.`],
            solution: `${a} + ${b} − ${N} = ${c}.`, wrongs: {}, data: { kind, a, b, N },
          };
        }
        const none = kind === 'neither' ? rnd(c + 1, c + 9) : 0, N = a + b - c + none;
        const fig = { type: 'venn8', la: `${C.la} — ${a}`, lb: `${C.lb} — ${b}`, both: c };
        if (kind === 'union') return {
          story: C.giv(a, b, c), question: C.union, figure: lv < 3 ? fig : undefined, answer: ans(a + b - c),
          hints: ['Если просто сложить, те, кто в обеих группах, будут посчитаны дважды.', `${a} + ${b} = ${a + b}; из них ${c} посчитаны два раза.`],
          solution: `${a} + ${b} − ${c} = ${a + b - c}.`, wrongs: W(ans(a + b - c), { 'union-no-subtract': a + b }), data: { kind, a, b, c },
        };
        if (kind === 'only') return {
          story: C.giv(a, b, c), question: C.only, figure: lv < 3 ? Object.assign(fig, { onlyA: '?' }) : undefined, answer: ans(a - c),
          hints: [`В число ${a} входят и те, кто попал в обе группы.`, `Из ${a} вычти ${c}.`],
          solution: `${a} − ${c} = ${a - c}.`, wrongs: W(ans(a - c), { 'only-as-whole': a }), data: { kind, a, b, c },
        };
        return {
          story: `${C.intro(N)} ${C.giv(a, b, c)}`, question: C.neither, figure: lv < 3 ? Object.assign(fig, { lu: `всего ${N}`, out: '?' }) : undefined, answer: ans(none),
          hints: ['Сначала найди, сколько человек попали хотя бы в одну группу, — не посчитай общих дважды.', `Хотя бы в одной группе: ${a} + ${b} − ${c} = ${a + b - c}.`],
          solution: `${a} + ${b} − ${c} = ${a + b - c}; ${N} − ${a + b - c} = ${none}.`,
          wrongs: W(ans(none), { 'union-no-subtract': N - a - b >= 0 ? N - a - b : null }), data: { kind, a, b, c, N },
        };
      });
    },
    verify(t) {
      const d = t.data, x = +t.answer;
      if (d.kind === 'lists') { const s = new Set([...d.A, ...d.B]); return x === (d.q === 'union' ? s.size : d.q === 'inter' ? d.A.filter(v => d.B.includes(v)).length : d.A.filter(v => !d.B.includes(v)).length); }
      if (d.kind === 'kmul') { let c = 0; for (let k = 1; k <= d.N; k++) { const A = k % d.p === 0, B = k % d.q === 0; if (d.only ? A && !B : A || B) c++; } return x === c; }
      if (d.kind === 'both') return x > 0 && d.a + d.b - x === d.N;
      // строим людей: c — в обеих группах, остальные — по одной, плюс никуда не вошедшие
      const ppl = []; for (let i = 0; i < d.c; i++) ppl.push([1, 1]); for (let i = 0; i < d.a - d.c; i++) ppl.push([1, 0]); for (let i = 0; i < d.b - d.c; i++) ppl.push([0, 1]);
      if (d.kind === 'union') return x === ppl.length;
      if (d.kind === 'only') return x === ppl.filter(p => p[0] && !p[1]).length;
      return x === d.N - ppl.length;
    },
  };

  /* =========================================================
     8 класс. s8-tree — дерево вариантов, правило умножения
     ========================================================= */
  const TREE_P2 = [
    { a: ['вид супа', 'вида супа', 'видов супа'], b: ['второе блюдо', 'вторых блюда', 'вторых блюд'], intro: (a, b) => `В школьной столовой ${a} и ${b}.`, q: 'Сколько разных обедов «суп + второе» можно составить?',
      na: ['Борщ', 'Щи', 'Уха', 'Рассольник'], nb: ['Котлета', 'Рыба', 'Плов', 'Гуляш'] },
    { a: ['футболка', 'футболки', 'футболок'], b: ['пара шорт', 'пары шорт', 'пар шорт'], intro: (a, b) => `У Димы ${a} и ${b}.`, q: 'Сколько разных комплектов «футболка + шорты» он может составить?' },
    { a: ['дорога', 'дороги', 'дорог'], b: ['дорога', 'дороги', 'дорог'], intro: (a, b) => `Из села в город ведут ${a}, из города в посёлок — ${b}.`, q: 'Сколькими способами можно доехать из села в посёлок через город?' },
    { a: ['вид мороженого', 'вида мороженого', 'видов мороженого'], b: ['вид посыпки', 'вида посыпки', 'видов посыпки'], intro: (a, b) => `В кафе ${a} и ${b}.`, q: 'Сколько разных порций «мороженое + одна посыпка» можно заказать?' },
  ];
  const TREE_P3 = [
    { intro: (a, b, c) => `В столовой ${a} ${pl(a, 'вид', 'вида', 'видов')} супа, ${b} ${pl(b, 'второе блюдо', 'вторых блюда', 'вторых блюд')} и ${c} ${pl(c, 'напиток', 'напитка', 'напитков')}.`, q: 'Сколько разных обедов «суп + второе + напиток» можно составить?' },
    { intro: (a, b, c) => `У Ани ${a} ${pl(a, 'блузка', 'блузки', 'блузок')}, ${b} ${pl(b, 'юбка', 'юбки', 'юбок')} и ${c} ${pl(c, 'пара туфель', 'пары туфель', 'пар туфель')}.`, q: 'Сколько разных нарядов «блузка + юбка + туфли» она может составить?' },
    { intro: (a, b, c) => `Из A в B ведут ${a} ${pl(a, 'дорога', 'дороги', 'дорог')}, из B в C — ${b}, из C в D — ${c}.`, q: 'Сколькими способами можно добраться из A в D через B и C?' },
  ];
  const TREE = {
    id: 's8-tree', strand: ST, grade: 8, short: 'Дерево вариантов',
    title: 'Дерево вариантов, правило умножения',
    frp: ['Дерево как граф без цикла. Правило умножения', 'Представление случайного эксперимента в виде дерева'],
    goal: 'Строить дерево вариантов и считать число вариантов правилом умножения, в том числе когда выбранный вариант нельзя повторить.',
    requires: ['t5-enum', 's7-graphs'],
    explain: {
      model: 'В столовой 3 супа и 4 вторых блюда. Нарисуем дерево: из корня — 3 ветки (супы), из каждой — по 4 ветки (вторые). Концов у дерева 3 · 4 = 12 — столько разных обедов. Каждый уровень дерева умножает число вариантов, а не прибавляет к нему.',
      figure: { type: 'tree8', a: ['Борщ', 'Щи', 'Уха'], b: ['Котлета', 'Рыба', 'Плов', 'Гуляш'] },
      figureCaption: '3 ветки, из каждой по 4: всего 3 · 4 = 12 обедов',
      rule: '<ul class="rule-list"><li><b>Правило умножения:</b> если первый шаг можно сделать a способами, а после него второй — b способами, то оба шага — a · b способами. Для трёх шагов — a · b · c.</li><li><b>Без повторений</b> (капитан и заместитель, 1-е и 2-е место): на втором шаге вариантов на один меньше — n · (n − 1).</li><li>Считай концы <b>всех</b> веток дерева, а не одной.</li></ul>',
      examples: [
        { q: 'В столовой 3 супа и 4 вторых блюда. Сколько разных обедов «суп + второе»?', fig: { type: 'tree8', a: ['Борщ', 'Щи', 'Уха'], b: ['Котлета', 'Рыба', 'Плов', 'Гуляш'] },
          choices: ['12', '7', '4'], correct: 0, wrong: { 1: 'add-not-multiply', 2: 'skip-branches' },
          steps: ['К каждому из 3 супов можно взять любое из 4 вторых.', '3 · 4 = 12.'] },
        { q: 'Из 4 ребят выбирают капитана и его заместителя. Сколько способов?', fig: { type: 'tree8', a: ['Аня', 'Боря', 'Вика', 'Гоша'], norep: true },
          choices: ['12', '16'], correct: 0, wrong: { 1: 'repeat-allowed' },
          steps: ['Капитана выбираем из 4 человек.', 'Заместителем не может быть сам капитан — остаётся 3.', '4 · 3 = 12.'] },
      ],
    },
    mistakes: [
      { id: 'add-not-multiply', title: 'Складывает числа вариантов на разных шагах вместо умножения', kidName: 'Складун',
        kidRule: 'ты складываешь число вариантов на каждом шаге, хотя каждый вариант первого шага сочетается с каждым вариантом второго',
        say: 'Возьми один вариант первого шага: с ним сочетается каждый вариант второго. Так с каждым — значит, умножение.',
        fixIdea: 'Варианты разных шагов перемножают: a · b (· c …).',
        explainOptions: ['3 супа и 4 вторых: к каждому супу — 4 вторых, 3 · 4 = 12', '3 супа и 4 вторых: 3 + 4 = 7 обедов', 'Обедов столько, сколько вторых блюд, — 4'],
        conflicts: [{ text: '2 супа и 3 вторых блюда. По твоему правилу обедов 2 + 3 = 5. Выпишем все: борщ с котлетой, борщ с рыбой, борщ с пловом, щи с котлетой, щи с рыбой, щи с пловом.', ask: 'Сколько обедов в этом списке?', choices: ['6', '5'], right: '6', verify: () => 2 * 3 === 6 && 2 + 3 === 5 }],
        root: 't5-enum' },
      { id: 'repeat-allowed', title: 'Не уменьшает число вариантов, когда выбранное нельзя повторить', kidName: 'Повторяшка',
        kidRule: 'ты на втором шаге считаешь все варианты, хотя один уже занят на первом',
        say: 'Тот, кто уже выбран на первом шаге (капитан, первое место), не может быть выбран снова. На втором шаге вариантов на один меньше.',
        fixIdea: 'Без повторений: n · (n − 1) · (n − 2) … — на каждом шаге на один вариант меньше.',
        explainOptions: ['Из 4 ребят капитан и заместитель: 4 · 3 = 12', 'Из 4 ребят: 4 · 4 = 16 способов', 'Из 4 ребят: 4 + 3 = 7 способов'],
        conflicts: [{ text: 'Из 2 ребят — Ани и Бори — выбирают капитана и заместителя. По твоему правилу способов 2 · 2 = 4. Но варианты «Аня — капитан и Аня — заместитель» быть не может.', ask: 'Сколько способов на самом деле?', choices: ['2', '4'], right: '2', verify: () => 2 * 1 === 2 }],
        root: 't5-enum' },
      { id: 'skip-branches', title: 'Считает концы только одной ветки дерева', kidName: 'Одна ветка',
        kidRule: 'ты рисуешь ветки второго шага только для одного варианта первого и считаешь их концы',
        say: 'Такие же ветки растут из каждого варианта первого шага, а не только из одного. Посчитай концы всего дерева.',
        fixIdea: 'Из каждой ветки первого шага растёт одинаковый «куст» — поэтому число концов умножают на число веток первого шага.',
        explainOptions: ['3 супа, к каждому 4 вторых: концов 3 · 4 = 12', 'К борщу 4 вторых — значит, обедов 4', 'Ветки первого шага не считаются'],
        conflicts: [{ text: '3 супа и 4 вторых. По твоему правилу обедов 4: борщ с котлетой, рыбой, пловом или гуляшом. Но куда тогда делись щи и уха?', ask: 'Можно ли пообедать щами с котлетой?', choices: ['Да', 'Нет'], right: 'Да', verify: () => 3 * 4 > 4,
          figure: { type: 'tree8', a: ['Борщ', 'Щи', 'Уха'], b: ['Котлета', 'Рыба', 'Плов', 'Гуляш'] } }], root: 't5-enum' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['p2', 'p2', 'coins', 'norep'], ['p2', 'p3', 'norep', 'coins', 'digits'], ['p3', 'norep3', 'norep', 'digits', 'dice']));
      if (kind === 'p2') {
        const C = pick(TREE_P2), a = rnd(2, L3(lv, 4, 6, 8)), b = rnd(2, L3(lv, 4, 7, 9));
        const fig = lv === 1 && C.na && a <= 4 && b <= 4 && a * b <= 12 ? { type: 'tree8', a: C.na.slice(0, a), b: C.nb.slice(0, b) } : undefined;
        return {
          story: C.intro(`${a} ${pl(a, ...C.a)}`, `${b} ${pl(b, ...C.b)}`), question: C.q, figure: fig, answer: ans(a * b),
          hints: ['Нарисуй дерево: сколько веток на первом шаге и сколько вырастает из каждой?', `Из каждой из ${a} веток вырастает ${b}.`],
          solution: `${a} · ${b} = ${a * b}.`, wrongs: W(ans(a * b), { 'add-not-multiply': a + b, 'skip-branches': b }), data: { kind, f: [a, b] },
        };
      }
      if (kind === 'p3') {
        const C = pick(TREE_P3), a = rnd(2, 5), b = rnd(2, 5), c = rnd(2, 4);
        return {
          story: C.intro(a, b, c), question: C.q, answer: ans(a * b * c),
          hints: ['Три шага выбора — три уровня дерева. Каждый уровень умножает число вариантов.', `${a} · ${b} · ${c}.`],
          solution: `${a} · ${b} · ${c} = ${a * b * c}.`, wrongs: W(ans(a * b * c), { 'add-not-multiply': a + b + c, 'skip-branches': b * c }), data: { kind, f: [a, b, c] },
        };
      }
      if (kind === 'norep' || kind === 'norep3') {
        const three = kind === 'norep3', n = rnd(three ? 4 : 3, L3(lv, 5, 8, 10)), r = three ? n * (n - 1) * (n - 2) : n * (n - 1);
        const st = pick(three ? ['medals', 'roles3'] : ['captain', 'places', 'duty']);
        const story = {
          captain: `В команде ${n} ${pl(n, 'игрок', 'игрока', 'игроков')}. Нужно выбрать капитана и его заместителя.`,
          places: `В турнире играют ${n} ${pl(n, 'команда', 'команды', 'команд')}.`,
          duty: `Из ${n} учеников нужно выбрать двух дежурных: один моет доску, другой поливает цветы.`,
          medals: `В забеге участвуют ${n} ${pl(n, 'спортсмен', 'спортсмена', 'спортсменов')}.`,
          roles3: `В кружке ${n} ${pl(n, 'человек', 'человека', 'человек')}. Нужно выбрать председателя, заместителя и секретаря.`,
        }[st];
        const q = { captain: 'Сколькими способами это можно сделать?', places: 'Сколькими способами могут распределиться первое и второе места?', duty: 'Сколькими способами можно это сделать?', medals: 'Сколькими способами могут распределиться золото, серебро и бронза?', roles3: 'Сколькими способами это можно сделать?' }[st];
        const f = three ? [n, n - 1, n - 2] : [n, n - 1];
        return {
          story, question: q, answer: ans(r),
          hints: ['Сколько вариантов на первом шаге? А на втором, если уже выбранного взять нельзя?', `Первый шаг — ${n}, второй — ${n - 1}${three ? `, третий — ${n - 2}` : ''}.`],
          solution: `${f.join(' · ')} = ${r}.`,
          wrongs: W(ans(r), { 'repeat-allowed': three ? n ** 3 : n * n, 'add-not-multiply': sum(f), 'skip-branches': r / n }), data: { kind, n, k: f.length },
        };
      }
      if (kind === 'coins') {
        const k = rnd(2, L3(lv, 3, 4, 5)), r = 2 ** k;
        return {
          story: `Монету бросают ${k} ${pl(k, 'раз', 'раза', 'раз')} подряд и записывают результат: орёл или решка.`, question: 'Сколько разных последовательностей результатов может получиться?', answer: ans(r),
          hints: ['Каждый бросок — новый уровень дерева, из каждой ветки растут две: орёл и решка.', `${Array(k).fill(2).join(' · ')}.`],
          solution: `${Array(k).fill(2).join(' · ')} = ${r}.`, wrongs: W(ans(r), { 'add-not-multiply': 2 * k, 'skip-branches': r / 2 }), data: { kind, f: Array(k).fill(2) },
        };
      }
      if (kind === 'dice') {
        const st = pick(['dd', 'cd']), f = st === 'dd' ? [6, 6] : [2, 6];
        return {
          story: st === 'dd' ? 'Игральный кубик бросают два раза и записывают выпавшие очки по порядку.' : 'Бросают монету и игральный кубик и записывают пару результатов.',
          question: 'Сколько разных результатов может получиться?', answer: ans(f[0] * f[1]),
          hints: ['Первый бросок — первый уровень дерева. Сколько веток растёт из каждой?', `${f[0]} · ${f[1]}.`],
          solution: `${f[0]} · ${f[1]} = ${f[0] * f[1]}.`, wrongs: W(ans(f[0] * f[1]), { 'add-not-multiply': f[0] + f[1], 'skip-branches': f[1] }), data: { kind, f },
        };
      }
      // digits
      const n = rnd(3, L3(lv, 4, 5, 6)), ds = sorted(shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, n)), rep = Math.random() < 0.4, r = rep ? n * n : n * (n - 1);
      return {
        story: `Из цифр ${ds.join(', ')} составляют двузначные числа${rep ? ' (цифры могут повторяться)' : ', в которых цифры не повторяются'}.`,
        question: 'Сколько таких чисел можно составить?', answer: ans(r),
        hints: ['Первая цифра — первый уровень дерева, вторая — второй.', rep ? `Первая цифра — любая из ${n}, вторая — тоже любая из ${n}.` : `Первая цифра — любая из ${n}, вторая — любая, кроме первой: ${n - 1}.`],
        solution: rep ? `${n} · ${n} = ${r}.` : `${n} · ${n - 1} = ${r}.`,
        wrongs: W(ans(r), rep ? { 'add-not-multiply': 2 * n, 'skip-branches': n } : { 'repeat-allowed': n * n, 'add-not-multiply': 2 * n - 1, 'skip-branches': n - 1 }), data: { kind, ds, rep },
      };
    },
    verify(t) {
      const d = t.data, x = +t.answer;
      // перебор: считаем все наборы
      const count = f => { let c = 0; const go = i => { if (i === f.length) { c++; return; } for (let k = 0; k < f[i]; k++) go(i + 1); }; go(0); return c; };
      if (d.f) return x === count(d.f);
      if (d.kind === 'digits') { let c = 0; for (const a of d.ds) for (const b of d.ds) if (d.rep || a !== b) c++; return x === c; }
      let c = 0; const go = (used) => { if (used.length === d.k) { c++; return; } for (let i = 0; i < d.n; i++) if (!used.includes(i)) go([...used, i]); }; go([]);
      return x === c;
    },
  };

  /* =========================================================
     8 класс. s8-events — противоположные и несовместные события
     ========================================================= */
  const COMP_P = [
    { r: [10, 90], s: p => `По прогнозу вероятность того, что завтра будет дождь, равна ${p}.`, q: 'Найди вероятность того, что дождя завтра не будет.' },
    { r: [60, 95], s: p => `Вероятность того, что футболист забьёт пенальти, равна ${p}.`, q: 'Найди вероятность того, что он не забьёт.' },
    { r: [2, 15], s: p => `Вероятность того, что новая шариковая ручка пишет плохо, равна ${p}.`, q: 'Найди вероятность того, что случайно выбранная новая ручка пишет хорошо.' },
    { r: [5, 40], s: p => `Вероятность того, что автобус придёт с опозданием, равна ${p}.`, q: 'Найди вероятность того, что автобус придёт вовремя.' },
  ];
  const COMP_N = [
    { s: (N, k) => `В коробке ${N} ${pl(N, 'фломастер', 'фломастера', 'фломастеров')}, ${k} из них не пишут. Наугад берут один.`, q: 'Найди вероятность того, что он пишет.' },
    { s: (N, k) => `К зачёту ${N} ${pl(N, 'билет', 'билета', 'билетов')}, Саша не выучил ${k} из них. Билет достаётся случайно.`, q: 'Найди вероятность того, что Саше достанется выученный билет.' },
    { s: (N, k) => `В классе ${N} ${pl(N, 'ученик', 'ученика', 'учеников')}, ${k} из них сегодня дежурят. Учитель наугад вызывает одного ученика к доске.`, q: 'Найди вероятность того, что вызванный ученик сегодня не дежурит.' },
  ];
  const CARD_EV = [[2, 'делится на 2'], [3, 'делится на 3'], [4, 'делится на 4'], [5, 'делится на 5']];
  const DICE_OV = [[[2, 4, 6], 'чётное число'], [[4, 5, 6], 'число больше 3'], [[1, 3, 5], 'нечётное число'], [[1, 2], 'число меньше 3'], [[3, 6], 'число, кратное 3,'], [[5, 6], 'число больше 4']];
  const h2 = x => num(x / 100); // вероятность в сотых → текст
  const EVENTS = {
    id: 's8-events', strand: ST, grade: 8, short: 'События',
    title: 'Противоположные и несовместные события',
    frp: ['Противоположные события. Диаграмма Эйлера. Объединение и пересечение событий', 'Несовместные события. Формула сложения вероятностей'],
    goal: 'Находить вероятность противоположного события, складывать вероятности несовместных событий и учитывать пересечение для совместных.',
    requires: ['s7-prob', 's8-sets'],
    explain: {
      model: 'Синоптик говорит: вероятность дождя завтра 0,3. Значит, в 3 случаях из 10 при такой погоде дождь бывает, а в остальных 7 — нет: вероятность «дождя не будет» равна 0,7. События «дождь» и «нет дождя» вместе покрывают все исходы и не случаются одновременно — их вероятности в сумме дают 1.',
      figure: { type: 'venn8', la: 'Чётное', lb: 'Больше 3', onlyA: '2', both: '4; 6', onlyB: '5', lu: 'кубик', out: '1; 3' },
      figureCaption: 'Кубик: «чётное» и «больше 3» — совместные события, общие исходы 4 и 6',
      rule: '<ul class="rule-list"><li><b>Противоположное событие:</b> P(не A) = 1 − P(A).</li><li><b>Несовместные события</b> не могут случиться одновременно. Для них P(A или B) = P(A) + P(B).</li><li><b>Совместные события</b> могут случиться вместе: P(A или B) = P(A) + P(B) − P(A и B) — иначе общие исходы посчитаны дважды.</li></ul>',
      examples: [
        { q: 'Вероятность, что автобус опоздает, — 0,15. Какова вероятность, что он придёт вовремя?', choices: ['0,85', '0,15'], correct: 0, wrong: { 1: 'complement-same' },
          steps: ['«Вовремя» — событие, противоположное «опоздает».', '1 − 0,15 = 0,85.'] },
        { q: 'Бросают кубик. Какова вероятность, что выпадет чётное число или число больше 3?', choices: [fr(2, 3), '1'], correct: 0, wrong: { 1: 'add-overlapping' },
          steps: ['Чётные: 2, 4, 6. Больше 3: 4, 5, 6. Общие — 4 и 6.', 'Подходят 2, 4, 5, 6 — 4 исхода из 6.', `P = ${fr(4, 6)} = ${fr(2, 3)}. Если сложить ${fr(3, 6)} + ${fr(3, 6)}, исходы 4 и 6 посчитаются дважды.`] },
      ],
    },
    mistakes: [
      { id: 'complement-same', title: 'Считает, что вероятность противоположного события равна вероятности самого события', kidName: 'Зеркальщик',
        kidRule: 'ты думаешь, что у события «не A» та же вероятность, что и у A',
        say: 'События A и «не A» вместе покрывают все исходы, поэтому их вероятности в сумме дают 1.',
        fixIdea: 'P(не A) = 1 − P(A).',
        explainOptions: ['Дождь с вероятностью 0,3 — значит, без дождя 0,7', 'Дождь с вероятностью 0,3 — значит, и без дождя 0,3', 'Без дождя — 0,3 : 2 = 0,15'],
        conflicts: [{ text: 'Вероятность того, что на кубике выпадет шестёрка, равна 1/6. По твоему правилу вероятность того, что шестёрка не выпадет, тоже 1/6. Но «не шестёрка» — это 1, 2, 3, 4 или 5: пять граней из шести.', ask: 'Какова вероятность, что шестёрка не выпадет?', choices: ['5/6', '1/6'], right: '5/6', verify: () => eq(1 - 1 / 6, 5 / 6) }] },
      { id: 'add-overlapping', title: 'Складывает вероятности совместных событий', kidName: 'Сумматор',
        kidRule: 'ты складываешь вероятности двух событий, даже когда они могут случиться одновременно',
        say: 'Складывать вероятности можно только для несовместных событий. Если события могут случиться вместе, общие исходы посчитаны дважды — вычти вероятность пересечения.',
        fixIdea: 'P(A или B) = P(A) + P(B) − P(A и B). Для несовместных событий P(A и B) = 0.',
        explainOptions: ['Кубик: «чётное» — 3/6, «больше 3» — 3/6, общие 4 и 6: P = 4/6', 'P = 3/6 + 3/6 = 1 — это случится наверняка', 'P = 3/6 · 3/6 = 1/4'],
        conflicts: [{ text: 'На кубике у события «чётное число» вероятность 1/2, у события «больше 3» — тоже 1/2. По твоему правилу вероятность события «чётное или больше 3» равна 1/2 + 1/2 = 1, то есть так будет всегда. Но может выпасть единица — ни то, ни другое.', ask: 'Подходит ли единица к событию «чётное или больше 3»?', choices: ['Нет', 'Да'], right: 'Нет', verify: () => !(1 % 2 === 0 || 1 > 3) }],
        root: 's8-sets' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['comp-p', 'comp-n', 'overlap', 'excl'], ['comp-p', 'comp-n', 'excl-none', 'overlap', 'overlap'], ['comp-p', 'excl-none', 'overlap', 'overlap-p', 'overlap-p']));
      if (kind === 'comp-p') return retry(() => {
        const C = pick(COMP_P), p = lv === 1 ? rnd(Math.ceil(C.r[0] / 10), Math.floor(C.r[1] / 10)) * 10 : rnd(C.r[0], C.r[1]);
        if (lv === 1 && (p < C.r[0] || p > C.r[1])) return null;
        if (p === 50) return null;
        return {
          story: C.s(h2(p)), question: C.q, answer: ans((100 - p) / 100),
          hints: ['Это событие противоположно данному: вместе они покрывают все исходы.', `P(не A) = 1 − ${h2(p)}.`],
          solution: `1 − ${h2(p)} = ${h2(100 - p)}.`, wrongs: W(ans((100 - p) / 100), { 'complement-same': p / 100 }), data: { kind, p },
        };
      });
      if (kind === 'comp-n') return retry(() => {
        const C = pick(COMP_N), N = pick([10, 20, 25, 40, 50]), k = rnd(1, N / 2 - 1);
        if (!isDec(k, N)) return null;
        return {
          story: C.s(N, k), question: C.q, answer: Pa(N - k, N),
          hints: ['Найди вероятность противоположного события и вычти её из 1 — или сразу посчитай подходящие исходы.', `Подходящих исходов ${N} − ${k} = ${N - k} из ${N}.`],
          solution: `${fr(N - k, N)} = ${Ph(N - k, N)} (или 1 − ${Ph(k, N)}).`, wrongs: W(Pa(N - k, N), { 'complement-same': Pa(k, N) }), data: { kind, N, k },
        };
      });
      if (kind === 'excl' || kind === 'excl-none') return retry(() => {
        const p5 = rnd(5, 40), p4 = rnd(20, 50), s = p5 + p4;
        if (s >= 95 || s === 50) return null;
        const none = kind === 'excl-none', r = none ? 100 - s : s;
        return {
          story: `Вероятность того, что Лена получит за контрольную «5», равна ${h2(p5)}, а «4» — ${h2(p4)}.`,
          question: none ? 'Найди вероятность того, что она не получит ни «4», ни «5».' : 'Найди вероятность того, что она получит «4» или «5».', answer: ans(r / 100),
          hints: ['Можно ли получить за одну контрольную и «4», и «5» сразу? Значит, события несовместные.', none ? `P(«4» или «5») = ${h2(p5)} + ${h2(p4)} = ${h2(s)}. Нужное событие — противоположное.` : `${h2(p5)} + ${h2(p4)}.`],
          solution: none ? `${h2(p5)} + ${h2(p4)} = ${h2(s)}; 1 − ${h2(s)} = ${h2(r)}.` : `${h2(p5)} + ${h2(p4)} = ${h2(s)}.`,
          wrongs: W(ans(r / 100), { 'complement-same': none ? s / 100 : null }), data: { kind, p5, p4 },
        };
      });
      if (kind === 'overlap-p') return retry(() => {
        const C = pick([
          [(a, b, c) => `Вероятность того, что в субботу пойдёт дождь, равна ${a}, в воскресенье — ${b}, а в оба дня — ${c}.`, 'Найди вероятность того, что дождь будет хотя бы в один из этих дней.'],
          [(a, b, c) => `Покупатель в магазине купит хлеб с вероятностью ${a}, молоко — с вероятностью ${b}, и хлеб, и молоко — с вероятностью ${c}.`, 'Найди вероятность того, что он купит хотя бы что-то одно из этого.'],
          [(a, b, c) => `На олимпиаде вероятность решить первую задачу равна ${a}, вторую — ${b}, обе — ${c}.`, 'Найди вероятность того, что будет решена хотя бы одна из этих задач.'],
        ]);
        const a = rnd(20, 70), b = rnd(20, 70), c = rnd(5, Math.min(a, b) - 5);
        if (a + b > 100 || a === b) return null;
        const r = a + b - c;
        return {
          story: C[0](h2(a), h2(b), h2(c)), question: C[1], answer: ans(r / 100),
          hints: ['Могут ли эти события случиться одновременно? Если да, при сложении их общая часть посчитается дважды.', `${h2(a)} + ${h2(b)} − ${h2(c)}.`],
          solution: `${h2(a)} + ${h2(b)} − ${h2(c)} = ${h2(r)}.`, wrongs: W(ans(r / 100), { 'add-overlapping': (a + b) / 100 }), data: { kind, a, b, c },
        };
      });
      // overlap: кубик или карточки
      return retry(() => {
        if (Math.random() < 0.5) {
          const [A, ta] = pick(DICE_OV), [B, tb] = pick(DICE_OV);
          const inter = A.filter(x => B.includes(x)), uni = [...new Set([...A, ...B])];
          if (!inter.length || inter.length === Math.min(A.length, B.length) || A.length + B.length > 6) return null;
          return {
            story: 'Бросают игральный кубик.', question: `Найди вероятность того, что выпадет ${ta} или ${tb.replace(/,$/, '')}.${pq(uni.length, 6)}`, answer: Pa(uni.length, 6), accept: Pacc(uni.length, 6),
            hints: ['Выпиши исходы, подходящие под каждое событие. Есть ли общие?', `${cap(ta.replace(/,$/, ''))}: ${A.join(', ')}; ${tb.replace(/,$/, '')}: ${B.join(', ')}; общие: ${inter.join(', ')}.`],
            solution: `Подходят ${sorted(uni).join(', ')} — ${uni.length} из 6: P = ${Ph(uni.length, 6)}.`,
            wrongs: W(Pa(uni.length, 6), { 'add-overlapping': Pa(A.length + B.length, 6) }), data: { kind, A, B, n: 6 },
          };
        }
        const [[p, tp], [q, tq]] = shuffle(CARD_EV).slice(0, 2), N = pick([10, 12, 15, 20, 24, 25, 30, 40]);
        const nA = Math.floor(N / p), nB = Math.floor(N / q), nAB = Math.floor(N / lcm2(p, q)), u = nA + nB - nAB;
        if (!nAB || nA + nB > N || !isDec(u, N) || (lv < 3 && !isDec(nA + nB, N))) return null;
        return {
          story: `На ${N} карточках написаны числа от 1 до ${N}. Наугад берут одну карточку.`, question: `Найди вероятность того, что число на ней делится на ${p} или на ${q}.`, answer: Pa(u, N),
          hints: [`Сколько чисел ${tp}? Сколько ${tq}? Не посчитай дважды те, что делятся на оба числа.`, `${cap(tp)}: ${nA}; ${tq}: ${nB}; на оба (на ${lcm2(p, q)}): ${nAB}.`],
          solution: `${nA} + ${nB} − ${nAB} = ${u}; P = ${fr(u, N)} = ${Ph(u, N)}.`,
          wrongs: W(Pa(u, N), { 'add-overlapping': Pa(nA + nB, N) }), data: { kind, cards: true, p, q, N },
        };
      });
    },
    verify(t) {
      const d = t.data, x = val(t.answer);
      if (d.kind === 'comp-p') return eq(x * 100 + d.p, 100);
      if (d.kind === 'comp-n') { let good = 0; for (let i = 0; i < d.N; i++) if (i >= d.k) good++; return eq(x * d.N, good); }
      if (d.kind === 'excl') return eq(x * 100, d.p5 + d.p4);
      if (d.kind === 'excl-none') return eq(x * 100 + d.p5 + d.p4, 100);
      if (d.kind === 'overlap-p') return eq(x * 100, d.a + d.b - d.c);
      if (d.cards) { let c = 0; for (let k = 1; k <= d.N; k++) if (k % d.p === 0 || k % d.q === 0) c++; return eq(x * d.N, c); }
      let c = 0; for (let f = 1; f <= 6; f++) if (d.A.includes(f) || d.B.includes(f)) c++; return eq(x * 6, c);
    },
  };

  TOPICS.push(SETS, TREE, EVENTS);
  /* =========================================================
     9 класс: помощники комбинаторики и рисунки
     ========================================================= */
  const fact = n => (n <= 1 ? 1 : n * fact(n - 1));
  const Cnk = (n, k) => (k < 0 || k > n ? 0 : fact(n) / (fact(k) * fact(n - k)));
  const Ank = (n, k) => fact(n) / fact(n - k);
  // перебором: число упорядоченных выборок k из n без повторений (ord) или подмножеств из k элементов
  function countPick(n, k, ord) {
    let c = 0; const go = (used, start) => { if (used.length === k) { c++; return; } for (let i = ord ? 0 : start; i < n; i++) if (!used.includes(i)) go([...used, i], i + 1); }; go([], 0); return c;
  }
  if (V && V.register) {
    const esc = V.esc || (s => String(s));
    const T = (x, y, s, anchor = 'middle', extra = '') => `<text x="${round(x, 1)}" y="${round(y, 1)}" text-anchor="${anchor}" fill="currentColor" stroke="none" font-size="13"${extra}>${esc(s)}</text>`;
    const G = s => `<g fill="none" stroke="currentColor" stroke-width="2">${s}</g>`;
    const reg = (type, def) => { try { V.register(type, def); } catch (e) { /* уже зарегистрирован */ } };
    // Отрезок числовой прямой [a; b] с выделенной частью [c; d]
    reg('seg9', {
      describe: f => `отрезок от ${num(f.a)} до ${num(f.b)}, выделена часть от ${num(f.c)} до ${num(f.d)}`,
      render(f) {
        const { a, b, c, d } = f;
        if (![a, b, c, d].every(Number.isFinite) || !(a < b) || !(a <= c && c < d && d <= b) || b - a > 60) return '';
        const X = v => 24 + (v - a) * 252 / (b - a), y = 52;
        let s = `<line x1="${X(a)}" y1="${y}" x2="${X(b)}" y2="${y}"/>`;
        const step = b - a <= 12 ? 1 : b - a <= 30 ? 5 : 10;
        for (let v = Math.ceil(a / step) * step; v <= b; v += step) s += `<line x1="${round(X(v), 1)}" y1="${y - 4}" x2="${round(X(v), 1)}" y2="${y + 4}" stroke-width="1"/>`;
        s += `<line x1="${round(X(c), 1)}" y1="${y}" x2="${round(X(d), 1)}" y2="${y}" stroke="var(--green,currentColor)" stroke-width="7" stroke-linecap="butt"/>`;
        const lab = [...new Set([a, b, c, d])];
        lab.forEach(v => { const up = (v === c || v === d) && v !== a && v !== b; s += `<line x1="${round(X(v), 1)}" y1="${y - 9}" x2="${round(X(v), 1)}" y2="${y + 9}"/>` + T(X(v), up ? y - 16 : y + 26, num(v), 'middle', up ? ' font-weight="700"' : ''); });
        return V.svgWrap(300, 90, this.describe(f), G(s));
      },
    });
    // Мишень: фигура размера R, внутри такая же фигура размера r с тем же центром
    reg('target9', {
      describe: f => (f.shape === 'circle' ? `круг радиуса ${num(f.R)}, внутри круг радиуса ${num(f.r)} с тем же центром` : `квадрат со стороной ${num(f.R)}, внутри квадрат со стороной ${num(f.r)} с тем же центром`),
      render(f) {
        const { R, r } = f;
        if (!(R > 0 && r > 0 && r < R) || !['circle', 'square'].includes(f.shape)) return '';
        const k = 100 / R, cx = 150, cy = 112;
        let s;
        if (f.shape === 'circle') {
          s = `<circle cx="${cx}" cy="${cy}" r="100"/><circle cx="${cx}" cy="${cy}" r="${round(r * k, 1)}" fill="currentColor" fill-opacity=".25"/>`;
          s += `<line x1="${cx}" y1="${cy}" x2="${cx + 100}" y2="${cy}" stroke-width="1.5" stroke-dasharray="4 3"/>` + T(cx + 60, cy - 6, `R = ${num(R)}`);
          s += `<line x1="${cx}" y1="${cy}" x2="${round(cx - r * k * 0.7071, 1)}" y2="${round(cy + r * k * 0.7071, 1)}" stroke-width="1.5"/>` + T(cx - r * k * 0.7071 - 4, cy + r * k * 0.7071 + 16, `r = ${num(r)}`, 'end');
          s += `<circle cx="${cx}" cy="${cy}" r="2.5" fill="currentColor"/>`;
        } else {
          const h = r * k;
          s = `<rect x="${cx - 100}" y="${cy - 100}" width="200" height="200"/><rect x="${round(cx - h, 1)}" y="${round(cy - h, 1)}" width="${round(2 * h, 1)}" height="${round(2 * h, 1)}" fill="currentColor" fill-opacity=".25"/>`;
          s += T(cx, cy + 118, `сторона ${num(R)}`) + T(cx, round(cy + h + 16, 1), num(r), 'middle', ' font-weight="700"');
        }
        return V.svgWrap(300, 236, this.describe(f), G(s));
      },
    });
  }

  /* =========================================================
     9 класс. s9-combinatorics — перестановки и сочетания
     ========================================================= */
  const COMB = {
    id: 's9-combinatorics', strand: ST, grade: 9, short: 'Комбинаторика',
    title: 'Перестановки и сочетания',
    frp: ['Комбинаторное правило умножения. Перестановки. Факториал', 'Сочетания и число сочетаний'],
    goal: 'Различать задачи, где порядок важен и где не важен; находить число перестановок n!, число упорядоченных выборок и число сочетаний.',
    requires: ['s8-tree'],
    explain: {
      model: 'Из 5 человек нужно выбрать двоих. Если это капитан и заместитель, пары «Аня — капитан, Боря — заместитель» и наоборот разные: 5 · 4 = 20 способов. Если же просто двое дежурных, эти пары одинаковые — каждая посчитана дважды: 20 : 2 = 10. Главный вопрос любой задачи на выбор: важен ли порядок?',
      rule: '<ul class="rule-list"><li><b>Перестановки</b> n предметов: n! = 1 · 2 · … · n. По определению 0! = 1 (а не 0).</li><li><b>Порядок важен</b> (места, должности, код): n · (n − 1) · … · (n − k + 1).</li><li><b>Порядок не важен</b> (просто группа): число сочетаний C<sub>n</sub><sup>k</sup> = ' + fr('n!', 'k! · (n − k)!') + ' — упорядоченные выборки, делённые на k! перестановок внутри группы.</li></ul>',
      examples: [
        { q: 'Из 5 человек выбирают двух дежурных. Сколько способов?', choices: ['10', '20'], correct: 0, wrong: { 1: 'order-counted' },
          steps: ['Дежурные равноправны — порядок не важен.', 'Упорядоченных пар 5 · 4 = 20, каждая группа посчитана 2 раза.', 'C₅² = 20 : 2 = 10.'] },
        { q: 'Найди значение выражения 4! + 0!.', choices: ['25', '24'], correct: 0, wrong: { 1: 'zero-factorial' },
          steps: ['4! = 1 · 2 · 3 · 4 = 24.', '0! = 1 по определению.', '24 + 1 = 25.'] },
      ],
    },
    mistakes: [
      { id: 'order-counted', title: 'Учитывает порядок там, где он не важен (упорядоченные выборки вместо сочетаний)', kidName: 'Лишний порядок',
        kidRule: 'ты считаешь пары «Аня и Боря» и «Боря и Аня» разными, хотя в группе они одинаковые',
        say: 'Если выбирают просто группу, перестановка внутри неё не даёт нового варианта. Раздели число упорядоченных выборок на k!.',
        fixIdea: 'Порядок не важен → C(n, k) = n · (n − 1) · … · (n − k + 1) : k!.',
        explainOptions: ['Двое дежурных из 5: 5 · 4 : 2 = 10', 'Двое дежурных из 5: 5 · 4 = 20', 'Двое дежурных из 5: 5 + 4 = 9'],
        conflicts: [{ text: 'Из трёх человек — А, Б, В — выбирают двух дежурных. По твоему правилу способов 3 · 2 = 6. Выпишем группы: {А, Б}, {А, В}, {Б, В}.', ask: 'Сколько разных пар дежурных?', choices: ['3', '6'], right: '3', verify: () => countPick(3, 2, false) === 3 && countPick(3, 2, true) === 6 }],
        root: 't5-enum' },
      { id: 'order-ignored', title: 'Не учитывает порядок там, где он важен (сочетания вместо упорядоченных выборок)', kidName: 'Без порядка',
        kidRule: 'ты делишь на число перестановок, хотя места или должности разные',
        say: 'Если выбранные получают разные роли (первое и второе место, капитан и заместитель), то «А, Б» и «Б, А» — разные варианты. Делить не нужно.',
        fixIdea: 'Порядок важен → n · (n − 1) · … · (n − k + 1), без деления на k!.',
        explainOptions: ['Капитан и заместитель из 5: 5 · 4 = 20', 'Капитан и заместитель из 5: C₅² = 10', 'Капитан и заместитель из 5: 5 · 5 = 25'],
        conflicts: [{ text: 'Из двух бегунов — А и Б — распределяют первое и второе места. По твоему правилу вариант один: {А, Б}. Но «А первый, Б второй» и «Б первый, А второй» — разные итоги забега.', ask: 'Сколько вариантов распределения мест?', choices: ['2', '1'], right: '2', verify: () => countPick(2, 2, true) === 2 }],
        root: 't5-enum' },
      { id: 'zero-factorial', title: 'Считает, что 0! = 0', kidName: 'Нулевой факториал',
        kidRule: 'ты думаешь, что 0! равно 0',
        say: 'По определению 0! = 1: пустой набор можно упорядочить ровно одним способом. Только так работают формулы, например n! = n · (n − 1)!.',
        fixIdea: '0! = 1 (как и 1! = 1).',
        explainOptions: ['1! = 1 · 0!, значит, 0! = 1', '0! = 0, ведь умножаем на ноль', '0! не существует'],
        conflicts: [{ text: 'Для любого n верно n! = n · (n − 1)!. При n = 1 получаем 1! = 1 · 0!. По твоему правилу это 1 · 0 = 0, а 1! = 1.', ask: 'Чему должен быть равен 0!, чтобы равенство 1! = 1 · 0! было верным?', choices: ['1', '0'], right: '1', verify: () => fact(1) === 1 * fact(0) }] },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['perm', 'comb', 'arr', 'expr', 'games'], ['perm', 'fixed', 'comb', 'arr', 'games', 'expr'], ['comb', 'arr', 'mix', 'fixed', 'expr', 'comb']));
      if (kind === 'perm' || kind === 'fixed') {
        const n = rnd(...L3(lv, [3, 5], [4, 6], [5, 7])), st = pick(['books', 'queue', 'seats']), fixed = kind === 'fixed', r = fact(fixed ? n - 1 : n);
        const story = { books: `На полку ставят ${n} разных книг${fixed ? '; словарь должен стоять первым слева' : ''}.`, queue: `Компания из ${n} друзей встаёт в очередь в столовой${fixed ? ', причём Аня (одна из них) — первой' : ''}.`, seats: `Нужно рассадить ${n} ${pl(n, 'гостя', 'гостей', 'гостей')} на ${n} ${pl(n, 'стул', 'стула', 'стульев')} в ряд${fixed ? '; хозяин (один из гостей) садится на крайний левый стул' : ''}.` }[st];
        return {
          story, question: 'Сколькими способами это можно сделать?', answer: ans(r),
          hints: [fixed ? 'Одно место уже занято. Сколько предметов осталось расставить и на сколько мест?' : 'Сколько вариантов для первого места? А для второго, когда первое уже занято?', fixed ? `Осталось расставить ${n - 1}: это ${n - 1}!.` : `${n} · ${n - 1} · … · 1 = ${n}!.`],
          solution: fixed ? `${n - 1}! = ${Array.from({ length: n - 1 }, (_, i) => i + 1).join(' · ')} = ${r}.` : `${n}! = ${Array.from({ length: n }, (_, i) => i + 1).join(' · ')} = ${r}.`,
          wrongs: {}, data: { kind, n: fixed ? n - 1 : n },
        };
      }
      if (kind === 'expr') {
        const form = pick(['plus', 'times', 'sum']), a = rnd(3, 5);
        if (form === 'plus') return { story: '', question: `Найди значение выражения ${a}! + 0!.`, answer: ans(fact(a) + 1), hints: ['Сколько равно 0!? Вспомни определение.', `${a}! = ${fact(a)}, 0! = 1.`], solution: `${fact(a)} + 1 = ${fact(a) + 1}.`, wrongs: W(ans(fact(a) + 1), { 'zero-factorial': fact(a) }), data: { kind, form, a } };
        if (form === 'times') { const b = rnd(2, 9); return { story: '', question: `Найди значение выражения ${a}! · 0! + ${b}.`, answer: ans(fact(a) + b), hints: ['Сколько равно 0!? Это не 0.', `${a}! = ${fact(a)}, 0! = 1.`], solution: `${fact(a)} · 1 + ${b} = ${fact(a) + b}.`, wrongs: W(ans(fact(a) + b), { 'zero-factorial': b }), data: { kind, form, a, b } }; }
        const terms = Array.from({ length: a + 1 }, (_, i) => i), r = sum(terms.map(fact));
        return { story: '', question: `Найди значение выражения ${terms.map(i => i + '!').join(' + ')}.`, answer: ans(r), hints: ['Вычисли каждый факториал отдельно. Начни с 0! — по определению он не равен 0.', terms.map(i => `${i}! = ${fact(i)}`).join(', ') + '.'], solution: `${terms.map(i => fact(i)).join(' + ')} = ${r}.`, wrongs: W(ans(r), { 'zero-factorial': r - 1 }), data: { kind, form, a } };
      }
      if (kind === 'mix') {
        const m = rnd(4, 7), g = rnd(4, 7), km = 2, kg = pick([1, 2]), r = Cnk(m, km) * Cnk(g, kg);
        return {
          story: `В классе ${m} мальчиков и ${g} девочек. Для поездки на олимпиаду нужно выбрать ${km} мальчиков и ${kg === 1 ? 'одну девочку' : '2 девочек'}.`,
          question: 'Сколькими способами можно составить такую команду?', answer: ans(r),
          hints: ['Выбор мальчиков и выбор девочек — два шага: перемножь. Важен ли порядок внутри группы?', `Мальчиков: C(${m}, 2) = ${Cnk(m, 2)}; девочек: ${kg === 1 ? g : `C(${g}, 2) = ${Cnk(g, 2)}`}.`],
          solution: `${Cnk(m, 2)} · ${Cnk(g, kg)} = ${r}.`, wrongs: W(ans(r), { 'order-counted': Ank(m, km) * Ank(g, kg) }), data: { kind, m, g, km, kg },
        };
      }
      if (kind === 'games') {
        const n = rnd(...L3(lv, [4, 6], [5, 9], [6, 12])), st = pick(['chess', 'hand', 'volley']), r = Cnk(n, 2);
        const story = { chess: `В шахматном турнире ${n} ${pl(n, 'участник', 'участника', 'участников')}, каждый играет с каждым одну партию.`, hand: `При встрече ${n} друзей каждый пожал руку каждому.`, volley: `В волейбольном турнире ${n} команд${n < 5 ? 'ы' : ''}, каждая встречается с каждой один раз.` }[st];
        return {
          story, question: st === 'chess' ? 'Сколько партий будет сыграно?' : st === 'hand' ? 'Сколько было рукопожатий?' : 'Сколько матчей будет сыграно?', answer: ans(r),
          hints: ['Каждая встреча — это пара участников. Важен ли порядок в паре?', `Упорядоченных пар ${n} · ${n - 1} = ${n * (n - 1)}, каждая встреча в них посчитана дважды.`],
          solution: `C(${n}, 2) = ${n} · ${n - 1} : 2 = ${r}.`, wrongs: W(ans(r), { 'order-counted': n * (n - 1) }), data: { kind, n, k: 2, ord: false },
        };
      }
      const ord = kind === 'arr', k = lv === 1 ? 2 : pick([2, 3]), n = rnd(k + 2, L3(lv, 6, 8, 10));
      const r = ord ? Ank(n, k) : Cnk(n, k), alt = ord ? Cnk(n, k) : Ank(n, k), prod = Array.from({ length: k }, (_, i) => n - i).join(' · ');
      const story = ord
        ? pick([`В забеге ${n} ${pl(n, 'бегун', 'бегуна', 'бегунов')}. Нужно распределить ${k === 2 ? 'первое и второе места' : 'золото, серебро и бронзу'}.`, `Из ${n} учеников выбирают ${k === 2 ? 'старосту и его заместителя' : 'старосту, заместителя и казначея'}.`, `Кодовый замок открывается последовательностью из ${k} разных цифр, выбранных из ${n} кнопок.`])
        : pick([`Из ${n} учеников выбирают ${k} для участия в олимпиаде.`, `Из ${n} разных фруктов нужно взять ${k} для салата.`, `Из ${n} книг нужно выбрать ${k}, чтобы взять с собой в поездку.`]);
      return {
        story, question: 'Сколькими способами это можно сделать?', answer: ans(r),
        hints: [`Важен ли порядок выбранных? ${ord ? '' : 'Если поменять выбранных местами, получится та же группа?'}`, ord ? `Порядок важен: ${prod}.` : `Порядок не важен: ${prod} : ${k}! = ${Ank(n, k)} : ${fact(k)}.`],
        solution: ord ? `${prod} = ${r}.` : `C(${n}, ${k}) = (${prod}) : ${k}! = ${Ank(n, k)} : ${fact(k)} = ${r}.`,
        wrongs: W(ans(r), ord ? { 'order-ignored': alt } : { 'order-counted': alt }), data: { kind, n, k, ord },
      };
    },
    verify(t) {
      const d = t.data, x = +t.answer;
      if (d.kind === 'perm' || d.kind === 'fixed') return x === countPick(d.n, d.n, true);
      if (d.kind === 'expr') { const f = n => { let p = 1; for (let i = 2; i <= n; i++) p *= i; return p; }; return x === (d.form === 'plus' ? f(d.a) + 1 : d.form === 'times' ? f(d.a) + d.b : Array.from({ length: d.a + 1 }, (_, i) => f(i)).reduce((s, v) => s + v, 0)); }
      if (d.kind === 'mix') return x === countPick(d.m, d.km, false) * countPick(d.g, d.kg, false);
      return x === countPick(d.n, d.k, d.ord);
    },
  };

  /* =========================================================
     9 класс. s9-geom-prob — геометрическая вероятность
     ========================================================= */
  const GEOM = {
    id: 's9-geom-prob', strand: ST, grade: 9, short: 'Точка в фигуре',
    title: 'Геометрическая вероятность',
    frp: ['Геометрическая вероятность. Случайный выбор точки из фигуры на плоскости, из отрезка и из дуги окружности'],
    goal: 'Находить вероятность случайного выбора точки из отрезка и из фигуры как отношение длин или площадей.',
    requires: ['s7-prob', 'g6-circle-length'],
    explain: {
      model: 'Светофор горит красным 40 секунд, зелёным — 20, и так по кругу. Ты подъезжаешь в случайный момент. Весь цикл — 60 секунд, из них зелёный — 20: вероятность попасть на зелёный 20/60 = 1/3. Чем больше «длина» подходящей части, тем выше вероятность — и делить нужно на длину всего, а не на остаток.',
      figure: { type: 'seg9', a: 0, b: 60, c: 40, d: 60 },
      figureCaption: 'Цикл 60 секунд: зелёный — последние 20',
      rule: '<ul class="rule-list"><li><b>Точка на отрезке:</b> P = ' + fr('длина подходящей части', 'длина всего отрезка') + '. Длина отрезка [a; b] равна b − a, а не b.</li><li><b>Точка в фигуре:</b> P = ' + fr('площадь подходящей части', 'площадь всей фигуры') + '.</li><li>Площади подобных фигур относятся как <b>квадраты</b> их размеров: круг радиуса r внутри круга радиуса R — P = ' + fr('r²', 'R²') + '.</li></ul>',
      examples: [
        { q: 'На отрезке [2; 10] наугад выбирают точку. Какова вероятность, что она попадёт на отрезок [4; 6]?', fig: { type: 'seg9', a: 2, b: 10, c: 4, d: 6 }, choices: ['0,25', '0,2', fr(1, 3)], correct: 0, wrong: { 1: 'length-by-endpoint', 2: 'part-to-rest' },
          steps: ['Длина всего отрезка: 10 − 2 = 8 (а не 10).', 'Длина подходящей части: 6 − 4 = 2.', 'P = 2 : 8 = 0,25.'] },
        { q: 'В круг радиуса 4 наугад бросают точку. Какова вероятность, что она попадёт в круг радиуса 2 с тем же центром?', fig: { type: 'target9', shape: 'circle', R: 4, r: 2 }, choices: ['0,25', '0,5'], correct: 0, wrong: { 1: 'ratio-not-squared' },
          steps: ['Площади: π · 2² = 4π и π · 4² = 16π.', 'P = 4π : 16π = 0,25 — отношение радиусов в квадрате.'] },
      ],
    },
    mistakes: [
      { id: 'length-by-endpoint', title: 'Принимает координату конца отрезка за его длину', kidName: 'Конец вместо длины',
        kidRule: 'ты делишь на координату правого конца отрезка, а не на его длину',
        say: 'Длина отрезка [a; b] — это b − a. На число b делить можно, только если отрезок начинается в нуле.',
        fixIdea: 'Длина отрезка [a; b] = b − a. P = длина подходящей части : (b − a).',
        explainOptions: ['Длина отрезка [2; 10] равна 8', 'Длина отрезка [2; 10] равна 10', 'Длина отрезка [2; 10] равна 12'],
        conflicts: [{ text: 'Точку выбирают на отрезке [8; 10]. По твоему правилу вероятность попасть на весь этот отрезок — 2 : 10 = 0,2. Но точка выбирается именно на нём, значит, попадёт на него наверняка.', ask: 'Чему равна вероятность попасть на весь отрезок [8; 10]?', choices: ['1', '0,2'], right: '1', verify: () => (10 - 8) / (10 - 8) === 1 }],
        root: 'n5-place' },
      { id: 'part-to-rest', title: 'Делит подходящую часть на оставшуюся, а не на всю фигуру', kidName: 'Часть к остатку',
        kidRule: 'ты делишь подходящую часть на неподходящую, а не на целое',
        say: 'Вероятность — доля от всего: делить нужно на длину (площадь) всей фигуры, включая подходящую часть.',
        fixIdea: 'P = часть : целое. Целое = подходящая часть + остальное.',
        explainOptions: ['Зелёный 20 с, красный 40 с: P = 20 : 60', 'Зелёный 20 с, красный 40 с: P = 20 : 40', 'Зелёный 20 с, красный 40 с: P = 40 : 60'],
        conflicts: [{ text: 'Зелёный горит 30 секунд, красный — 30. По твоему правилу вероятность зелёного 30 : 30 = 1 — будто зелёный горит всегда. Но красный тоже бывает.', ask: 'Какова вероятность попасть на зелёный?', choices: ['0,5', '1'], right: '0,5', verify: () => 30 / 60 === 0.5 }],
        root: 'part-of' },
      { id: 'ratio-not-squared', title: 'Берёт отношение линейных размеров вместо отношения площадей', kidName: 'Без квадрата',
        kidRule: 'ты делишь радиус на радиус (сторону на сторону), а не площадь на площадь',
        say: 'Точка попадает в фигуру по площади. Если размер меньше в k раз, площадь меньше в k² раз.',
        fixIdea: 'Для подобных фигур P = (r : R)², потому что площадь растёт как квадрат размера.',
        explainOptions: ['Квадрат 1 × 1 внутри квадрата 2 × 2 занимает 1/4 площади', 'Квадрат 1 × 1 внутри квадрата 2 × 2 занимает половину', 'Квадрат 1 × 1 внутри квадрата 2 × 2 занимает 1/8'],
        conflicts: [{ text: 'Квадрат 2 × 2 разрезали на клетки 1 × 1 — их 4. По твоему правилу маленькая клетка занимает 1/2 большого квадрата (сторона 1 из 2). Но таких клеток в квадрате четыре!', ask: 'Какую часть площади занимает одна клетка?', choices: ['1/4', '1/2'], right: '1/4', verify: () => (1 * 1) / (2 * 2) === 0.25 }],
        root: 'g-area' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['seg', 'seg', 'light', 'bus', 'square'], ['seg', 'light', 'bus', 'circle', 'square'], ['seg', 'seg', 'circle', 'square', 'light']));
      if (kind === 'seg') return retry(() => {
        const L = pick([4, 5, 8, 10, 20, 25]), a = lv === 1 ? 0 : lv === 2 ? rnd(1, 6) : rnd(-8, 6), b = a + L;
        const f = rnd(1, L - 1), c = rnd(a, b - f), d = c + f;
        if (c === a && d === b) return null;
        const wr = W(Pa(f, L), { 'length-by-endpoint': a !== 0 && b > 0 ? Pa(f, b) : null, 'part-to-rest': 2 * f < L ? Pa(f, L - f) : null });
        if (lv > 1 && a !== 0 && b > 0 && !wr['length-by-endpoint']) return null;
        const q = d === b && c !== a ? `больше ${num(c)}` : c === a ? `меньше ${num(d)}` : `между ${num(c)} и ${num(d)}`;
        return {
          story: `На отрезке [${num(a)}; ${num(b)}] числовой прямой наугад выбирают точку x.`, question: `Какова вероятность того, что x ${c === a || d === b ? q : 'окажется ' + q}?${pq(f, L)}`, figure: { type: 'seg9', a, b, c, d }, answer: Pa(f, L), accept: Pacc(f, L),
          hints: ['Вероятность — длина подходящей части, делённая на длину всего отрезка. Длина отрезка [a; b] — это b − a.', `Весь отрезок: ${num(b)} − ${sign9(a)} = ${L}; подходящая часть: ${num(d)} − ${sign9(c)} = ${f}.`],
          solution: `P = ${f} : ${L} = ${Ph(f, L)}.`, wrongs: wr, data: { kind, a, b, c, d },
        };
      });
      if (kind === 'light') return retry(() => {
        const red = rnd(2, 9) * 5, green = rnd(2, 9) * 5, yellow = pick([0, 0, 5]), T = red + green + yellow, ask = pick(['green', 'red']);
        const f = ask === 'green' ? green : red;
        if (red === green) return null;
        return {
          story: `Светофор по кругу горит красным ${red} секунд, ${yellow ? `жёлтым ${yellow} секунд, ` : ''}зелёным ${green} секунд. Машина подъезжает к нему в случайный момент.`,
          question: `Какова вероятность, что горит ${ask === 'green' ? 'зелёный' : 'красный'}?${pq(f, T)}`, answer: Pa(f, T), accept: Pacc(f, T),
          hints: ['Сколько длится весь цикл светофора? Подходящее время делят на весь цикл.', `Цикл: ${[red, yellow, green].filter(Boolean).join(' + ')} = ${T} с.`],
          solution: `P = ${f} : ${T} = ${Ph(f, T)}.`, wrongs: W(Pa(f, T), { 'part-to-rest': 2 * f < T ? Pa(f, T - f) : null }), data: { kind, f, T },
        };
      });
      if (kind === 'bus') return retry(() => {
        const T = pick([10, 12, 15, 20, 30]), t = rnd(2, T - 2);
        if (2 * t === T) return null;
        return {
          story: `Автобус приходит на остановку ровно каждые ${T} минут. Ты приходишь на остановку в случайный момент.`,
          question: `Какова вероятность, что ждать придётся не больше ${t} ${pl(t, 'минуты', 'минут', 'минут')}?${pq(t, T)}`, answer: Pa(t, T), accept: Pacc(t, T),
          hints: [`Между автобусами ${T} минут. В какой части этого промежутка нужно прийти, чтобы ждать не больше ${t} минут?`, `Подходит последние ${t} ${pl(t, 'минута', 'минуты', 'минут')} из ${T}.`],
          solution: `P = ${t} : ${T} = ${Ph(t, T)}.`, wrongs: W(Pa(t, T), { 'part-to-rest': 2 * t < T ? Pa(t, T - t) : null }), data: { kind, f: t, T },
        };
      });
      const circle = kind === 'circle';
      return retry(() => {
        const R = rnd(2, L3(lv, 5, 8, 10)), r = rnd(1, R - 1), A = r * r, B = R * R;
        if (!isDec(A, B) && lv === 1) return null;
        return {
          story: circle ? `Мишень — круг радиуса ${R} см, в центре — «яблочко», круг радиуса ${r} см. Стрелок попадает в мишень в случайную точку.` : `Внутри квадрата со стороной ${R} см нарисован квадрат со стороной ${r} см с тем же центром. В большой квадрат наугад ставят точку.`,
          question: `Какова вероятность, что ${circle ? 'стрелок попадёт в «яблочко»' : 'точка окажется внутри маленького квадрата'}?${pq(A, B)}`, figure: { type: 'target9', shape: circle ? 'circle' : 'square', R, r }, answer: Pa(A, B), accept: Pacc(A, B),
          hints: [`Вероятность — отношение площадей. Найди площадь ${circle ? 'каждого круга' : 'каждого квадрата'}.`, circle ? `Площади: π · ${r}² = ${pi9(A)} и π · ${R}² = ${pi9(B)}.` : `Площади: ${r}² = ${A} и ${R}² = ${B}.`],
          solution: `P = ${circle ? `${pi9(A)} : ${pi9(B)}` : `${A} : ${B}`} = ${Ph(A, B)}.`,
          wrongs: W(Pa(A, B), { 'ratio-not-squared': Pa(r, R), 'part-to-rest': 2 * A < B ? Pa(A, B - A) : null }), data: { kind, R, r },
        };
      });
    },
    verify(t) {
      const d = t.data, x = val(t.answer);
      if (d.kind === 'seg') { const over = Math.max(0, Math.min(d.b, d.d) - Math.max(d.a, d.c)); return eq(x * (d.b - d.a), over); }
      if (d.kind === 'light' || d.kind === 'bus') return eq(x * d.T, d.f);
      // площадь считаем по клеткам сетки (квадрат) или через π (круг)
      if (d.kind === 'square') { let inner = 0; const N = 4 * d.R; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const cx = (i + 0.5) / 4 - d.R / 2, cy = (j + 0.5) / 4 - d.R / 2; if (Math.abs(cx) < d.r / 2 && Math.abs(cy) < d.r / 2) inner++; } return eq(x, inner / (N * N)); }
      return eq(x, (Math.PI * d.r * d.r) / (Math.PI * d.R * d.R));
    },
  };
  // неверная «вероятность» больше 1 неправдоподобна — такой ответ ученик сам отбросит
  function lt1(m, n) { return m <= n ? Pa(m, n) : null; }
  function pi9(n) { return n === 1 ? 'π' : n + 'π'; }
  function sign9(v) { return v < 0 ? `(${num(v)})` : num(v); }

  /* =========================================================
     9 класс. s9-bernoulli — испытания Бернулли
     ========================================================= */
  const BER_CTX = [
    { s: n => `Монету бросают ${n} ${pl(n, 'раз', 'раза', 'раз')}.`, ev: (k, n) => `орёл выпадет ровно ${k} ${pl(k, 'раз', 'раза', 'раз')}`, all: 'орёл выпадет при каждом броске', one: 'орёл выпадет хотя бы один раз' },
    { s: n => `Ученик отвечает наугад на ${n} ${pl(n, 'вопрос', 'вопроса', 'вопросов')} теста; в каждом два варианта ответа, верный — один.`, ev: (k) => (k === 1 ? 'верный ответ будет ровно один' : `верных ответов будет ровно ${k}`), all: 'все ответы будут верными', one: 'хотя бы один ответ будет верным' },
    { s: n => `В семье ${n} ${pl(n, 'ребёнок', 'ребёнка', 'детей')}. Будем считать, что мальчик и девочка рождаются с одинаковой вероятностью 1/2.`, ev: (k) => (k === 1 ? 'мальчик в семье ровно один' : `мальчиков в семье ровно ${k}`), all: 'все дети — мальчики', one: 'среди детей есть хотя бы один мальчик' },
  ];
  const BERN = {
    id: 's9-bernoulli', strand: ST, grade: 9, short: 'Бернулли',
    title: 'Испытания Бернулли',
    frp: ['Испытание. Успех и неудача. Испытания Бернулли', 'Вероятности событий в серии испытаний Бернулли'],
    goal: 'Находить вероятность ровно k успехов в n независимых испытаниях с одинаковой вероятностью успеха и вероятность хотя бы одного успеха.',
    requires: ['s9-combinatorics', 's8-events'],
    explain: {
      model: 'Монету бросают 3 раза. Какова вероятность, что орёл выпадет ровно 2 раза? Цепочка «О, О, Р» имеет вероятность 1/2 · 1/2 · 1/2 = 1/8. Но таких цепочек три: ООР, ОРО, РОО — орёл может «стоять» на разных местах. Значит, P = 3 · 1/8 = 3/8. Число цепочек — это число сочетаний C₃².',
      rule: '<ul class="rule-list"><li>Серия из n одинаковых независимых испытаний, в каждом успех с вероятностью p, неудача — q = 1 − p.</li><li><b>Ровно k успехов:</b> P = C<sub>n</sub><sup>k</sup> · p<sup>k</sup> · q<sup>n − k</sup>. Не забудь ни число сочетаний (на каких местах успехи), ни множитель q<sup>n − k</sup> (остальные испытания — неудачи).</li><li><b>Хотя бы один успех:</b> P = 1 − q<sup>n</sup> — через противоположное событие «ни одного успеха». Складывать p n раз нельзя.</li></ul>',
      examples: [
        { q: 'Монету бросают 3 раза. Какова вероятность, что орёл выпадет ровно 2 раза?', choices: [fr(3, 8), fr(1, 8), fr(3, 4)], correct: 0, wrong: { 1: 'no-binom', 2: 'forgot-q' },
          steps: ['Цепочки с двумя орлами: ООР, ОРО, РОО — C₃² = 3.', 'Вероятность каждой: (1/2)² · 1/2 = 1/8.', 'P = 3 · 1/8 = 3/8.'] },
        { q: 'Кубик бросают 2 раза. Какова вероятность, что шестёрка выпадет хотя бы один раз?', choices: [fr(11, 36), fr(1, 3)], correct: 0, wrong: { 1: 'at-least-sum' },
          steps: ['Противоположное событие — шестёрки не было ни разу: (5/6)² = 25/36.', 'P = 1 − 25/36 = 11/36.', 'Сложение 1/6 + 1/6 считает случай «две шестёрки» дважды.'] },
      ],
    },
    mistakes: [
      { id: 'no-binom', title: 'Забывает число сочетаний: P = p^k · q^(n − k)', kidName: 'Одна цепочка',
        kidRule: 'ты считаешь вероятность одной цепочки, хотя успехи могут стоять на разных местах',
        say: 'p^k · q^(n − k) — вероятность одной конкретной цепочки. Таких цепочек столько, сколькими способами можно выбрать места для k успехов, — C(n, k).',
        fixIdea: 'P(ровно k) = C(n, k) · p^k · q^(n − k).',
        explainOptions: ['Два орла из трёх: цепочки ООР, ОРО, РОО — 3 · 1/8', 'Два орла из трёх: только ООР — 1/8', 'Два орла из трёх: 2/3'],
        conflicts: [{ text: 'Монету бросают 2 раза. По твоему правилу «ровно один орёл» имеет вероятность 1/2 · 1/2 = 1/4, «два орла» — 1/4, «ни одного» — 1/4. Вместе 3/4, а исходов, кроме этих, не бывает — сумма должна быть 1.', ask: 'Сколько цепочек дают ровно одного орла?', choices: ['2', '1'], right: '2', verify: () => ['ОР', 'РО', 'ОО', 'РР'].filter(s => s.split('О').length - 1 === 1).length === 2 }], root: 's8-tree' },
      { id: 'forgot-q', title: 'Забывает множитель (1 − p) для неудач', kidName: 'Без неудач',
        kidRule: 'ты учитываешь вероятность успехов, но забываешь, что остальные испытания должны быть неудачами',
        say: '«Ровно k успехов» значит, что остальные n − k испытаний — неудачи. Их вероятность тоже входит множителем: q^(n − k).',
        fixIdea: 'Каждое испытание даёт множитель: p — для успеха, q = 1 − p — для неудачи.',
        explainOptions: ['Ровно 2 орла из 3: 3 · (1/2)² · (1/2)¹', 'Ровно 2 орла из 3: 3 · (1/2)² = 3/4', 'Ровно 2 орла из 3: (1/2)²'],
        conflicts: [{ text: 'Монету бросают 3 раза. По твоему правилу «ровно 2 орла» — 3 · (1/2)² = 3/4, а «ровно 1 орёл» — 3 · 1/2 = 3/2. Вероятность больше 1 быть не может.', ask: 'Может ли вероятность быть равна 3/2?', choices: ['Нет', 'Да'], right: 'Нет', verify: () => 3 * 0.5 > 1 }] },
      { id: 'at-least-sum', title: 'Находит вероятность «хотя бы один успех» как n · p', kidName: 'Сумматор',
        kidRule: 'ты складываешь вероятности успеха во всех испытаниях, чтобы найти «хотя бы один раз»',
        say: 'Успехи в разных испытаниях могут случиться одновременно, их вероятности складывать нельзя. Найди вероятность противоположного события — «ни одного успеха».',
        fixIdea: 'P(хотя бы один успех) = 1 − q^n.',
        explainOptions: ['Хотя бы одна шестёрка за 2 броска: 1 − (5/6)² = 11/36', 'Хотя бы одна шестёрка за 2 броска: 1/6 + 1/6 = 1/3', 'Хотя бы одна шестёрка за 2 броска: (1/6)²'],
        conflicts: [{ text: 'Кубик бросают 7 раз. По твоему правилу вероятность хотя бы одной шестёрки 7 · 1/6 = 7/6 — больше 1. Но вполне можно 7 раз подряд обойтись без шестёрки.', ask: 'Может ли вероятность быть больше 1?', choices: ['Нет', 'Да'], right: 'Нет', verify: () => 7 / 6 > 1 && 1 - (5 / 6) ** 7 < 1 }],
        root: 's8-events' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['kn', 'kn', 'all', 'atleast'], ['kn', 'kn', 'atleast', 'atleast6', 'all', 'd13'], ['kn', 'd13', 'd13', 'atleast', 'atleast6']));
      if (kind === 'd13') {
        const n = rnd(2, 3), k = rnd(1, n - 1), num1 = Cnk(n, k) * 2 ** (n - k), den = 3 ** n;
        return {
          story: `Игральный кубик бросают ${n} ${pl(n, 'раз', 'раза', 'раз')}. Успех — выпало 5 или 6 очков.`,
          question: `Какова вероятность, что успех будет ровно ${k} ${pl(k, 'раз', 'раза', 'раз')}? ${FRQ}`, answer: fs(num1, den), accept: 'equivalent',
          hints: ['Вероятность успеха в одном броске p = 2/6 = 1/3, неудачи q = 2/3. Сколько цепочек с нужным числом успехов?', `C(${n}, ${k}) = ${Cnk(n, k)}; одна цепочка: (1/3)<sup>${k}</sup> · (2/3)<sup>${n - k}</sup>.`],
          solution: `P = ${Cnk(n, k)} · ${fh(1, 3 ** k)} · ${fh(2 ** (n - k), 3 ** (n - k))} = ${fh(num1, den)}.`,
          wrongs: W(fs(num1, den), { 'no-binom': fs(2 ** (n - k), den), 'forgot-q': lt1(Cnk(n, k), 3 ** k) }), data: { kind, n, k, succ: [5, 6], faces: 6 },
        };
      }
      if (kind === 'atleast6') {
        const n = rnd(2, 3), den = 6 ** n, num1 = den - 5 ** n;
        return {
          story: `Игральный кубик бросают ${n} ${pl(n, 'раз', 'раза', 'раз')}.`, question: `Какова вероятность, что шестёрка выпадет хотя бы один раз? ${FRQ}`, answer: fs(num1, den), accept: 'equivalent',
          hints: ['Найди вероятность противоположного события: шестёрка не выпала ни разу.', `Ни одной шестёрки: (5/6)<sup>${n}</sup> = ${fh(5 ** n, den)}.`],
          solution: `P = 1 − ${fh(5 ** n, den)} = ${fh(num1, den)}.`, wrongs: W(fs(num1, den), { 'at-least-sum': lt1(n, 6) }), data: { kind, n, succ: [6], faces: 6 },
        };
      }
      const C = pick(BER_CTX), n = rnd(...L3(lv, [2, 3], [3, 4], [4, 5])), den = 2 ** n;
      if (kind === 'all') return {
        story: C.s(n), question: `Какова вероятность, что ${C.all}?${pq(1, den)}`, answer: Pa(1, den), accept: Pacc(1, den),
        hints: ['Нужна одна-единственная цепочка: успех в каждом испытании.', `(1/2)<sup>${n}</sup>.`], solution: `P = (1/2)<sup>${n}</sup> = ${Ph(1, den)}.`, wrongs: {}, data: { kind, n, k: n, succ: [1], faces: 2 },
      };
      if (kind === 'atleast') { const nn = pick([2, Math.min(n, 3)]), d2 = 2 ** nn; return {
        story: C.s(nn), question: `Какова вероятность, что ${C.one}?${pq(d2 - 1, d2)}`, answer: Pa(d2 - 1, d2), accept: Pacc(d2 - 1, d2),
        hints: ['Найди вероятность противоположного события — ни одного успеха.', `Ни одного успеха: (1/2)<sup>${nn}</sup> = ${Ph(1, d2)}.`], solution: `P = 1 − ${Ph(1, d2)} = ${Ph(d2 - 1, d2)}.`,
        wrongs: W(Pa(d2 - 1, d2), { 'at-least-sum': lt1(nn, 2) }), data: { kind, n: nn, succ: [1], faces: 2 },
      }; }
      const k = rnd(1, n - 1), c = Cnk(n, k);
      return {
        story: C.s(n), question: `Какова вероятность, что ${C.ev(k, n)}?${pq(c, den)}`, answer: Pa(c, den), accept: Pacc(c, den),
        hints: [`Вероятность одной цепочки — (1/2)<sup>${n}</sup>. Сколько цепочек с нужным числом успехов?`, `Цепочек C(${n}, ${k}) = ${c}, каждая — ${Ph(1, den)}.`],
        solution: `P = C(${n}, ${k}) · (1/2)<sup>${n}</sup> = ${c} · ${Ph(1, den)} = ${Ph(c, den)}.`,
        wrongs: W(Pa(c, den), { 'no-binom': Pa(1, den), 'forgot-q': lt1(c, 2 ** k) }), data: { kind, n, k, succ: [1], faces: 2 },
      };
    },
    verify(t) {
      // перебор всех цепочек исходов
      const d = t.data, x = val(t.answer); let good = 0, all = 0;
      const go = (i, s) => { if (i === d.n) { all++; if (d.kind === 'atleast' || d.kind === 'atleast6' ? s > 0 : s === d.k) good++; return; } for (let f = 1; f <= d.faces; f++) go(i + 1, s + (d.succ.includes(f) ? 1 : 0)); };
      go(0, 0); return eq(x * all, good);
    },
  };

  /* =========================================================
     9 класс. s9-random-var — случайная величина, мат. ожидание
     ========================================================= */
  const RV_CTX = [
    { vals: [0, 1, 2, 3], s: 'Число голов X, которые команда забивает за матч, имеет распределение:', q: 'Найди математическое ожидание числа голов.' },
    { vals: [2, 3, 4, 5], s: 'Оценка X ученика за тест имеет распределение:', q: 'Найди математическое ожидание оценки.' },
    { vals: [0, 1, 2, 3], s: 'Число бракованных деталей X в случайно выбранной коробке имеет распределение:', q: 'Найди математическое ожидание X.' },
    { vals: [0, 1, 2, 3], s: 'Баскетболист выполняет серию бросков. Число очков X за одну попытку имеет распределение:', q: 'Найди математическое ожидание числа очков.' },
  ];
  const RVAR = {
    id: 's9-random-var', strand: ST, grade: 9, short: 'Мат. ожидание',
    title: 'Случайная величина, математическое ожидание',
    frp: ['Случайная величина и распределение вероятностей', 'Математическое ожидание случайной величины как теоретическое среднее значение'],
    goal: 'Читать таблицу распределения случайной величины и находить её математическое ожидание как сумму произведений значений на их вероятности.',
    requires: ['s7-mean', 's8-events'],
    explain: {
      model: 'В настольной игре бросают кубик: за шестёрку дают 12 очков, за 4 или 5 — 3 очка, иначе — 0. Сколько очков в среднем приносит бросок? Значения 12, 3 и 0 встречаются не одинаково часто: 12 — в 1 случае из 6, 3 — в 2 из 6, 0 — в 3 из 6. Взвешиваем: 12 · 1/6 + 3 · 2/6 + 0 · 3/6 = 2 + 1 + 0 = 3 очка. Это и есть математическое ожидание — среднее значение при большом числе бросков.',
      figure: { type: 'table7', head: ['Очки', '0', '3', '12'], rows: [['P', '3/6', '2/6', '1/6']], first: 60 },
      figureCaption: 'Распределение очков за бросок',
      rule: '<ul class="rule-list"><li><b>Распределение</b> — таблица: значения величины и их вероятности. Сумма вероятностей равна 1.</li><li><b>Математическое ожидание:</b> E(X) = x<sub>1</sub>p<sub>1</sub> + x<sub>2</sub>p<sub>2</sub> + … + x<sub>k</sub>p<sub>k</sub> — каждое значение умножаем на его вероятность.</li><li>Это не простое среднее значений и не самое вероятное значение.</li></ul>',
      examples: [
        { q: 'X принимает значения 0, 1, 2 с вероятностями 0,5; 0,3; 0,2. Найди E(X).', choices: ['0,7', '1', '0'], correct: 0, wrong: { 1: 'mean-no-weights', 2: 'expect-is-mode' },
          steps: ['0 · 0,5 + 1 · 0,3 + 2 · 0,2 = 0 + 0,3 + 0,4 = 0,7.', 'Простое среднее (0 + 1 + 2) : 3 = 1 не учитывает, что 0 бывает чаще; 0 — самое вероятное значение, но не ожидание.'] },
        { q: 'В игре из примера выше: сколько очков в среднем приносит бросок?', choices: ['3', '5'], correct: 0, wrong: { 1: 'mean-no-weights' },
          steps: ['12 · 1/6 + 3 · 2/6 + 0 · 3/6 = 2 + 1 = 3.', '(12 + 3 + 0) : 3 = 5 — так было бы, если бы все значения были равновероятны.'] },
      ],
    },
    mistakes: [
      { id: 'mean-no-weights', title: 'Находит среднее значений, не учитывая их вероятности', kidName: 'Без весов',
        kidRule: 'ты складываешь значения и делишь на их число, не обращая внимания на вероятности',
        say: 'Значения встречаются с разной вероятностью. Каждое нужно умножить на его вероятность — это «вес» значения.',
        fixIdea: 'E(X) = сумма произведений «значение · вероятность». Простое среднее годится, только если все значения равновероятны.',
        explainOptions: ['0 с вероятностью 0,9 и 10 с вероятностью 0,1: E = 1', '0 и 10: E = (0 + 10) : 2 = 5', 'E — это наибольшее значение, 10'],
        conflicts: [{ text: 'X равна 0 с вероятностью 0,99 и 100 с вероятностью 0,01. По твоему правилу E(X) = (0 + 100) : 2 = 50. Но почти всегда X = 0, а 100 выпадает в одном случае из ста.', ask: 'Каково E(X) на самом деле?', choices: ['1', '50'], right: '1', verify: () => eq(0 * 0.99 + 100 * 0.01, 1) }],
        root: 's7-mean' },
      { id: 'expect-is-mode', title: 'Принимает за математическое ожидание самое вероятное значение', kidName: 'Самое частое',
        kidRule: 'ты думаешь, что математическое ожидание — это значение с самой большой вероятностью',
        say: 'Самое вероятное значение — это мода. Математическое ожидание учитывает все значения с их вероятностями и может даже не совпадать ни с одним из них.',
        fixIdea: 'E(X) = x₁p₁ + x₂p₂ + … — учитываем все значения, а не одно самое частое.',
        explainOptions: ['X = 0 (0,6) или 10 (0,4): E = 4, хотя чаще выпадает 0', 'X = 0 (0,6) или 10 (0,4): E = 0 — так бывает чаще', 'E — всегда одно из значений X'],
        conflicts: [{ text: 'X равна 0 с вероятностью 0,6 и 10 с вероятностью 0,4. По твоему правилу E(X) = 0. Тогда при 100 испытаниях сумма была бы около 0, а на деле около 40 раз выпадет 10 — это примерно 400.', ask: 'Каково E(X)?', choices: ['4', '0'], right: '4', verify: () => eq(0 * 0.6 + 10 * 0.4, 4) }] },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['table', 'table', 'game'], ['table', 'game', 'missing'], ['table', 'missing', 'game', 'missing']));
      if (kind === 'game') return retry(() => {
        // грани кубика делим на группы, каждой группе — свои очки
        const sizes = pick([[1, 2, 3], [1, 1, 4], [2, 4], [1, 5], [3, 3], [1, 2, 3]]), pts = sizes.map(() => rnd(0, 6) * pick([1, 2, 3]));
        if (new Set(pts).size !== pts.length) return null;
        const tot = sum(sizes.map((s, i) => s * pts[i])), E = tot / 6;
        if (!clean2(E)) return null;
        const desc = { 1: 'одной грани', 2: 'двух гранях', 3: 'трёх гранях', 4: 'четырёх гранях', 5: 'пяти гранях' };
        let face = 1; const groups = sizes.map((s, i) => { const f = Array.from({ length: s }, () => face++); return `${f.length === 1 ? 'за ' + f[0] : 'за ' + f.join(', ').replace(/, (\d)$/, ' или $1')} — ${pts[i]} ${pl(pts[i], 'очко', 'очка', 'очков')}`; });
        const mode = sizes.indexOf(Math.max(...sizes)), unique = sizes.filter(s => s === sizes[mode]).length === 1;
        return {
          story: `В настольной игре бросают кубик и получают очки: ${groups.join('; ')}.`, question: 'Найди математическое ожидание числа очков за один бросок.', answer: ans(E),
          hints: [`Каждое значение очков выпадает с вероятностью «число граней : 6». Умножь очки на вероятность и сложи. (На ${sizes.map(s => desc[s]).join(', ')}.)`, `${sizes.map((s, i) => `${pts[i]} · ${s}/6`).join(' + ')}.`],
          solution: `E = (${sizes.map((s, i) => `${pts[i]} · ${s}`).join(' + ')}) : 6 = ${tot} : 6 = ${num(E)}.`,
          wrongs: W(ans(E), { 'mean-no-weights': sum(pts) / pts.length, 'expect-is-mode': unique ? pts[mode] : null }), data: { kind, sizes, pts },
        };
      });
      return retry(() => {
        const C = pick(RV_CTX), k = C.vals.length, unit = lv === 3 ? 5 : 10;
        const ps = splitParts(100 / unit, k).map(p => p * unit);
        const mx = Math.max(...ps); if (ps.filter(p => p === mx).length > 1) return null;
        const vals = C.vals, E = sum(vals.map((v, i) => v * ps[i])) / 100;
        const miss = kind === 'missing' ? rnd(0, k - 1) : -1;
        const cells = ps.map((p, i) => (i === miss ? '?' : p / 100));
        return {
          story: `${C.s.replace(/:$/, ', показанное в таблице')}${miss >= 0 ? '; одна вероятность в таблице стёрлась.' : '.'}`, question: C.q, figure: { type: 'table7', head: ['X', ...vals.map(String)], rows: [['P', ...cells]], first: 60 }, answer: ans(E),
          hints: [miss >= 0 ? 'Сначала найди стёртую вероятность: сумма всех вероятностей равна 1. Потом умножь каждое значение на его вероятность и сложи.' : 'Умножь каждое значение на его вероятность и сложи — не просто среднее значений.', `${miss >= 0 ? `Стёртая вероятность: 1 − ${ps.filter((_, i) => i !== miss).map(p => num(p / 100)).join(' − ')} = ${num(ps[miss] / 100)}. ` : ''}E = ${vals.map((v, i) => `${v} · ${num(ps[i] / 100)}`).join(' + ')}.`],
          solution: `E = ${vals.map((v, i) => `${v} · ${num(ps[i] / 100)}`).join(' + ')} = ${num(E)}.`,
          wrongs: W(ans(E), { 'mean-no-weights': sum(vals) / k, 'expect-is-mode': vals[ps.indexOf(mx)] }), data: { kind, vals, ps },
        };
      });
    },
    verify(t) {
      const d = t.data, x = val(t.answer);
      if (d.kind === 'game') { let s = 0, f = 0; d.sizes.forEach((sz, i) => { for (let q = 0; q < sz; q++) { s += d.pts[i]; f++; } }); return f === 6 && eq(x * 6, s); }
      if (sum(d.ps) !== 100) return false;
      // «100 испытаний»: значение v встречается ps[i] раз — среднее по ним
      const all = []; d.vals.forEach((v, i) => { for (let q = 0; q < d.ps[i]; q++) all.push(v); });
      return eq(x, sum(all) / all.length);
    },
  };

  TOPICS.push(COMB, GEOM, BERN, RVAR);
  K.course({ id: 's79', grade: 7, title: 'Вероятность и статистика, 7–9 класс', topics: TOPICS });
})();
