/* =========================================================
   Курс g56: наглядная геометрия, 5–6 класс.
   Опора: ФРП «Математика. 5–9 классы (базовый уровень)», раздел
   «Наглядная геометрия» 5 и 6 класса.
   Заменяет content/geometry.js: темы g-angles, g-perimeter, g-area,
   g-volume, g-circle перенесены с теми же id (сюжеты и объяснения
   сохранены), добавлены 10 новых тем (docs/content-ids.md).
   Ошибки — классические, описанные в методике: периметр вместо площади,
   «1 дм² = 10 см²», не та шкала транспортира, наклонная вместо
   перпендикуляра, «квадрат — не прямоугольник», C = π · r, путаница
   призмы и пирамиды и т. п. Тексты — черновик на вычитку методисту.
   Свои рисунки: grid56, protractor56, circle56, net56, tri56, solid56.
   Формат — docs/content-spec.md.
   ========================================================= */
(function () {
  'use strict';
  const K = window.VEKTOR_KIT, V = window.VEKTOR_VISUALS;
  const { rnd, pick, shuffle, L3, pl, round, num, ans } = K.h;
  const SG = 'Наглядная геометрия';

  /* ---------- Общие помощники ---------- */
  const same = (a, b) => Math.abs(a - b) < 1e-9;
  const isAns = (task, v) => same(Number(task.answer), v);
  const times = k => `${k} ${pl(k, 'раз', 'раза', 'раз')}`;
  const LET = 'ABCDEFGHIJKLMN'.split('');
  const cellsW = k => pl(k, 'клетку', 'клетки', 'клеток');
  const H = x => round(x / 100, 2); // из сотых: H(314) = 3.14
  // неверные ответы-числа: совпавшие с верным и «не числа» отбрасываем
  const wr = (right, m) => { const o = {}; for (const [k, v] of Object.entries(m)) if (v != null && Number.isFinite(v) && !same(v, right)) o[k] = ans(v); return o; };
  // неверные ответы-варианты
  const wc = (right, m) => { const o = {}; for (const [k, v] of Object.entries(m)) if (v != null && v !== right) o[k] = v; return o; };
  const pt = (x, y) => `(${num(x)}; ${num(y)})`;

  /* ---------- Рисунки курса ---------- */
  const esc = V.esc || (s => String(s));
  const fin = (...xs) => xs.every(v => typeof v === 'number' && Number.isFinite(v));
  const r1 = v => Math.round(v * 10) / 10;
  const txt = (x, y, s, o = {}) => `<text x="${r1(x)}" y="${r1(y)}" text-anchor="${o.a || 'middle'}" font-size="${o.fs || 13}" fill="currentColor" stroke="none">${esc(s)}</text>`;
  const ln = (x1, y1, x2, y2, extra = '') => `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"${extra}/>`;
  const GREEN = ' stroke="var(--green,currentColor)"';
  const G = inner => `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;

  // Чертёж на клетчатой бумаге (или без клеток, grid: false). Координаты в клетках, ось y вверх.
  // { w, h, grid, segs: [{ p: [x1,y1,x2,y2], bold, dash, green, label, side }], polys: [{ pts, hole?, fill, dash }],
  //   pts: [{ x, y, label, dx, dy }], texts: [{ x, y, t, dx, dy, a }], arcs: [{ x, y, r, a1, a2 }], desc }
  V.register('grid56', {
    describe: f => String(f.desc || 'чертёж на клетчатой бумаге'),
    render(f) {
      const w = f.w, h = f.h;
      if (!fin(w, h) || w < 1 || h < 1 || w > 30 || h > 30) return '';
      const nums = [];
      for (const q of f.segs || []) nums.push(...q.p);
      for (const p of f.polys || []) for (const c of [...p.pts, ...(p.hole || [])]) nums.push(...c);
      for (const p of f.pts || []) nums.push(p.x, p.y);
      for (const t of f.texts || []) nums.push(t.x, t.y);
      for (const a of f.arcs || []) nums.push(a.x, a.y, a.a1, a.a2);
      if (!nums.every(v => fin(v))) return '';
      const k = Math.min(260 / w, 190 / h, 34), mx = 46, mt = 24, mb = 30;
      const X = x => mx + x * k, Y = y => mt + (h - y) * k, P = (x, y) => `${r1(X(x))} ${r1(Y(y))}`;
      let s = '';
      if (f.grid !== false) {
        let g = '';
        for (let i = 0; i <= w; i++) g += ln(X(i), Y(0), X(i), Y(h));
        for (let j = 0; j <= h; j++) g += ln(X(0), Y(j), X(w), Y(j));
        s += `<g opacity=".22" stroke-width="1">${g}</g>`;
      }
      for (const p of f.polys || []) {
        const d = 'M' + p.pts.map(c => P(...c)).join('L') + 'Z' + (p.hole ? 'M' + p.hole.map(c => P(...c)).join('L') + 'Z' : '');
        s += `<path d="${d}" fill-rule="evenodd"${p.fill ? ' fill="currentColor" fill-opacity=".14"' : ''} stroke-width="2.5"${p.dash ? ' stroke-dasharray="6 4"' : ''}/>`;
      }
      for (const a of f.arcs || []) {
        const R = a.ru != null ? a.ru * k : a.r || 18, rad = Math.PI / 180, cx = X(a.x), cy = Y(a.y);
        s += `<path d="M${r1(cx + R * Math.cos(a.a1 * rad))} ${r1(cy - R * Math.sin(a.a1 * rad))}A${R} ${R} 0 ${a.a2 - a.a1 > 180 ? 1 : 0} 0 ${r1(cx + R * Math.cos(a.a2 * rad))} ${r1(cy - R * Math.sin(a.a2 * rad))}" stroke-width="1.5"/>`;
      }
      for (const q of f.segs || []) {
        const [x1, y1, x2, y2] = q.p;
        s += ln(X(x1), Y(y1), X(x2), Y(y2), `${q.green ? GREEN : ''}${q.dash ? ' stroke-dasharray="6 4"' : ''} stroke-width="${q.bold ? 3 : 2}"`);
        if (q.label != null) {
          const dx = X(x2) - X(x1), dy = Y(y2) - Y(y1), L = Math.hypot(dx, dy) || 1, sd = q.side || 1;
          const off = 9 + String(q.label).length * 3.6 * Math.abs(dy / L) + 5 * Math.abs(dx / L); // текст не должен ложиться на свой отрезок
          s += txt((X(x1) + X(x2)) / 2 - dy / L * off * sd, (Y(y1) + Y(y2)) / 2 + dx / L * off * sd + 4, q.label);
        }
      }
      for (const p of f.pts || []) {
        s += `<circle cx="${r1(X(p.x))}" cy="${r1(Y(p.y))}" r="3.5" fill="currentColor"/>`;
        if (p.label) s += txt(X(p.x) + (p.dx == null ? 10 : p.dx), Y(p.y) + (p.dy == null ? -8 : p.dy), p.label);
      }
      for (const t of f.texts || []) s += txt(X(t.x) + (t.dx || 0), Y(t.y) + (t.dy || 0) + 4, t.t, { a: t.a });
      return V.svgWrap(Math.round(w * k + 2 * mx), Math.round(h * k + mt + mb), String(f.desc || 'чертёж'), G(s));
    },
  });

  // Транспортир, приложенный к углу AOB: { deg, side: 'right' | 'left' } — сторона OA идёт вправо (0 внутренней шкалы) или влево (0 внешней)
  const protDesc = f => { const th = f.side === 'left' ? 180 - f.deg : f.deg; return `транспортир приложен к углу AOB: сторона OA проходит через 0 ${f.side === 'left' ? 'внешней' : 'внутренней'} шкалы, сторона OB — через отметку ${th} внутренней шкалы и ${180 - th} внешней`; };
  V.register('protractor56', {
    describe: protDesc,
    render(f) {
      const d = f.deg;
      if (!fin(d) || d <= 0 || d >= 180 || !['left', 'right'].includes(f.side)) return '';
      const cx = 168, cy = 174, R = 140, rad = Math.PI / 180, P = (r, t) => [cx + r * Math.cos(t * rad), cy - r * Math.sin(t * rad)];
      let s = `<path d="M${cx - R} ${cy}A${R} ${R} 0 0 1 ${cx + R} ${cy}Z" fill="currentColor" fill-opacity=".05" stroke-width="1.5"/>`;
      let tk = '';
      for (let t = 0; t <= 180; t += 5) { const [x1, y1] = P(R, t), [x2, y2] = P(R - (t % 10 ? 6 : 11), t); tk += ln(x1, y1, x2, y2); }
      s += `<g stroke-width="1.2">${tk}</g>`;
      for (let t = 0; t <= 180; t += 20) {
        const tt = Math.min(176, Math.max(4, t)), [ox, oy] = P(R - 24, tt), [ix, iy] = P(R - 46, tt);
        s += txt(ox, oy + 4, String(180 - t), { fs: 12 }) + txt(ix, iy + 4, String(t), { fs: 11 });
      }
      const a0 = f.side === 'left' ? 180 : 0, th = f.side === 'left' ? 180 - d : d;
      const [ax, ay] = P(R + 12, a0), [bx, by] = P(R + 12, th);
      s += ln(cx, cy, ax, ay, GREEN + ' stroke-width="3"') + ln(cx, cy, bx, by, GREEN + ' stroke-width="3"');
      const lo = Math.min(a0, th), hi = Math.max(a0, th), [s1x, s1y] = P(30, lo), [s2x, s2y] = P(30, hi);
      s += `<path d="M${r1(s1x)} ${r1(s1y)}A30 30 0 0 0 ${r1(s2x)} ${r1(s2y)}" stroke-width="1.5"/>`;
      const [lx, ly] = P(R + 24, th);
      s += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="currentColor"/>` + txt(cx, cy + 18, 'O') + txt(f.side === 'left' ? ax + 6 : ax - 6, ay + 18, 'A') + txt(lx, ly + 5, 'B');
      return V.svgWrap(336, 198, protDesc(f), G(s));
    },
  });

  // Круг с центром O: { lr: подпись радиуса | null, ld: подпись диаметра | null, fill }
  const circDesc = f => String(f.desc || `круг с центром O${f.lr != null ? ', радиус ' + f.lr : ''}${f.ld != null ? ', диаметр ' + f.ld : ''}`);
  V.register('circle56', {
    describe: circDesc,
    render(f) {
      const cx = 150, cy = 116, R = 92;
      let s = `<circle cx="${cx}" cy="${cy}" r="${R}"${f.fill ? ' fill="currentColor" fill-opacity=".1"' : ''}/>`;
      if (f.ld != null) s += ln(cx - R, cy, cx + R, cy, GREEN + ' stroke-width="2.5"') + txt(cx, cy + 22, 'd = ' + f.ld);
      if (f.lr != null) {
        if (f.ld != null) { const a = 50 * Math.PI / 180, x2 = cx + R * Math.cos(a), y2 = cy - R * Math.sin(a); s += ln(cx, cy, x2, y2, ' stroke-width="2.5"') + txt((cx + x2) / 2 - 32, (cy + y2) / 2, 'r = ' + f.lr); }
        else s += ln(cx, cy, cx + R, cy, GREEN + ' stroke-width="2.5"') + txt(cx + R / 2, cy - 10, 'r = ' + f.lr);
      }
      s += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="currentColor"/>` + txt(cx - 12, cy + (f.ld != null ? -8 : 18), 'O');
      return V.svgWrap(300, 232, circDesc(f), G(s));
    },
  });

  // Развёртка прямоугольного параллелепипеда a × b × c (a — длина, b — ширина, c — высота): { a, b, c, la, lb, lc }
  const netDesc = f => `развёртка ${f.a === f.b && f.b === f.c ? 'куба с ребром ' + (f.la ?? f.a) : `прямоугольного параллелепипеда ${f.la ?? f.a} × ${f.lb ?? f.b} × ${f.lc ?? f.c}`}: шесть граней, три пары одинаковых`;
  V.register('net56', {
    describe: netDesc,
    render(f) {
      const { a, b, c } = f;
      if (!fin(a, b, c) || a <= 0 || b <= 0 || c <= 0 || Math.max(a, b, c) > 100) return '';
      const W = 2 * a + 2 * b, Ht = 2 * b + c, k = Math.min(250 / W, 196 / Ht), ox = 44, oy = 24;
      const rc = (x, y, w, h) => `<rect x="${r1(ox + x * k)}" y="${r1(oy + y * k)}" width="${r1(w * k)}" height="${r1(h * k)}" fill="currentColor" fill-opacity=".08"/>`;
      let s = rc(0, b, b, c) + rc(b, b, a, c) + rc(b + a, b, b, c) + rc(2 * b + a, b, a, c) + rc(b, 0, a, b) + rc(b, b + c, a, b);
      s += txt(ox + (b + a / 2) * k, oy - 7, String(f.la ?? a)) + txt(ox + b * k - 6, oy + b / 2 * k + 4, String(f.lb ?? b), { a: 'end' }) + txt(ox - 6, oy + (b + c / 2) * k + 4, String(f.lc ?? c), { a: 'end' });
      return V.svgWrap(Math.round(W * k + ox + 14), Math.round(Ht * k + oy + 10), netDesc(f), G(s));
    },
  });

  // Треугольник ABC по углам A и B (основание AB снизу): { A, B, al?: подписи углов [A, B, C], sl?: подписи сторон [AB, BC, CA] }
  const triDesc = f => String(f.desc || `треугольник ABC: угол A ${f.A}°, угол B ${f.B}°, угол C ${180 - f.A - f.B}°`);
  V.register('tri56', {
    describe: triDesc,
    render(f) {
      const A = f.A, B = f.B, C = 180 - A - B;
      if (!fin(A, B) || A <= 0 || B <= 0 || C <= 0) return '';
      const rad = Math.PI / 180, bb = Math.sin(B * rad) / Math.sin(C * rad);
      const p = [[0, 0], [1, 0], [bb * Math.cos(A * rad), bb * Math.sin(A * rad)]];
      const xs = p.map(q => q[0]), minX = Math.min(...xs), spanX = Math.max(...xs) - minX, spanY = p[2][1];
      const angs = [A, B, C], names = ['A', 'B', 'C'];
      const labs = angs.map((g, i) => (f.al ? f.al[i] : g + '°'));
      // tight — подписи углов не помещаются внутри: тогда треугольник мельче, а подписи «∠A = …» снаружи
      const layout = wMax => {
        const k = Math.min(wMax / spanX, 136 / spanY), ox = 155 - spanX * k / 2;
        const S = p.map(([x, y]) => [ox + (x - minX) * k, 172 - y * k]);
        const gx = (S[0][0] + S[1][0] + S[2][0]) / 3, gy = (S[0][1] + S[1][1] + S[2][1]) / 3;
        const U = S.map(([x, y]) => { const ux = gx - x, uy = gy - y, L = Math.hypot(ux, uy) || 1; return [ux / L, uy / L]; });
        const dIn = g => (g >= 45 ? 31 : 31 + (45 - g) * 1.6); // у острого угла подпись глубже, где клин шире
        const inPos = S.map(([x, y], i) => [x + U[i][0] * dIn(angs[i]), y + U[i][1] * dIn(angs[i])]);
        const tight = angs.some((g, i) => labs[i] && g < 18) || [[0, 1], [1, 2], [0, 2]].some(([i, j]) => labs[i] && labs[j] && Math.abs(inPos[i][0] - inPos[j][0]) < 34 && Math.abs(inPos[i][1] - inPos[j][1]) < 16);
        return { S, gx, gy, U, inPos, tight };
      };
      let Lt = layout(220);
      if (Lt.tight) Lt = Object.assign(layout(150), { tight: true });
      const { S, gx, gy, U, inPos, tight } = Lt;
      let s = `<path d="M${S.map(q => r1(q[0]) + ' ' + r1(q[1])).join('L')}Z" stroke-width="2.5"/>`;
      S.forEach(([x, y], i) => {
        const [ux, uy] = U[i], lab = labs[i];
        if (tight && lab) { const a = ux > 0.35 ? 'end' : ux < -0.35 ? 'start' : 'middle'; s += txt(x - ux * 13, y - uy * 13 + (uy < 0 ? 10 : 2), `∠${names[i]} = ${lab}`, { a }); }
        else { s += txt(x - ux * 15, y - uy * 15 + 5, names[i]); if (lab) s += txt(inPos[i][0], inPos[i][1] + 4, lab, { fs: 12 }); }
        if (angs[i] === 90) {
          const u = S[(i + 1) % 3], v = S[(i + 2) % 3], lu = Math.hypot(u[0] - x, u[1] - y), lv = Math.hypot(v[0] - x, v[1] - y);
          const e1 = [(u[0] - x) / lu * 12, (u[1] - y) / lu * 12], e2 = [(v[0] - x) / lv * 12, (v[1] - y) / lv * 12];
          s += `<path d="M${r1(x + e1[0])} ${r1(y + e1[1])}L${r1(x + e1[0] + e2[0])} ${r1(y + e1[1] + e2[1])}L${r1(x + e2[0])} ${r1(y + e2[1])}" stroke-width="1.5"/>`;
        }
      });
      if (f.sl) [[0, 1], [1, 2], [2, 0]].forEach(([i, j], n) => {
        if (!f.sl[n]) return;
        // внешняя нормаль к стороне: перпендикуляр, направленный от центра треугольника
        const mx = (S[i][0] + S[j][0]) / 2, my = (S[i][1] + S[j][1]) / 2, ex = S[j][0] - S[i][0], ey = S[j][1] - S[i][1], L = Math.hypot(ex, ey) || 1;
        let nx = -ey / L, ny = ex / L; if (nx * (mx - gx) + ny * (my - gy) < 0) { nx = -nx; ny = -ny; }
        s += txt(mx + nx * 10, my + ny * 10 + (ny > 0.5 ? 12 : 4), f.sl[n], { fs: 12, a: nx > 0.4 ? 'start' : nx < -0.4 ? 'end' : 'middle' });
      });
      return V.svgWrap(310, 204, triDesc(f), G(s));
    },
  });

  // Призма или пирамида с n-угольным основанием: { kind: 'prism' | 'pyramid', n }. Невидимые рёбра — пунктиром.
  const NG = { 3: 'треугольная', 4: 'четырёхугольная', 5: 'пятиугольная', 6: 'шестиугольная', 7: 'семиугольная', 8: 'восьмиугольная', 9: 'девятиугольная', 10: 'десятиугольная', 12: 'двенадцатиугольная' };
  const NGG = { 3: 'треугольной', 4: 'четырёхугольной', 5: 'пятиугольной', 6: 'шестиугольной', 7: 'семиугольной', 8: 'восьмиугольной', 9: 'девятиугольной', 10: 'десятиугольной', 12: 'двенадцатиугольной' };
  const solidDesc = f => `${NG[f.n] || f.n + '-угольная'} ${f.kind === 'prism' ? 'призма' : 'пирамида'}`;
  V.register('solid56', {
    describe: solidDesc,
    render(f) {
      const n = f.n;
      if (!Number.isInteger(n) || n < 3 || n > 12 || !['prism', 'pyramid'].includes(f.kind)) return '';
      const cx = 150, by = 172, R = 95, sq = 0.33, Hh = 118, off = 0.3;
      const th = Array.from({ length: n }, (_, i) => off + 2 * Math.PI * i / n);
      const bot = th.map(t => [cx + R * Math.cos(t), by + R * sq * Math.sin(t)]);
      const cs = th.map(Math.cos), L = cs.indexOf(Math.min(...cs)), Rm = cs.indexOf(Math.max(...cs));
      const hidden = i => Math.sin(th[i]) < 0 && i !== L && i !== Rm;
      const dash = ' stroke-dasharray="5 4" opacity=".55"';
      const top = bot.map(([x, y]) => [x, y - Hh]), apex = [cx, by - Hh - 12];
      let s = '';
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, back = Math.sin(th[i] + Math.PI / n) < 0;
        s += ln(...bot[i], ...bot[j], back ? dash : '');
        if (f.kind === 'prism') s += ln(...top[i], ...top[j]) + ln(...bot[i], ...top[i], hidden(i) ? dash : '');
        else s += ln(...bot[i], ...apex, hidden(i) ? dash : '');
      }
      return V.svgWrap(300, 212, solidDesc(f), G(s));
    },
  });

  /* ---------- Чертежи-заготовки ---------- */
  // Ломаная по точкам [[x,y], …] с буквами у вершин
  function polyFig(pts, grid, desc, labels) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const w = Math.max(...xs) + 1, h = Math.max(...ys) + 1;
    return {
      type: 'grid56', w, h, grid, desc,
      segs: pts.slice(1).map((p, i) => ({ p: [...pts[i], ...p], bold: true, green: true, label: labels ? labels[i] : undefined, side: -1 })),
      pts: pts.map((p, i) => {
        // букву ставим против суммы направлений на соседние вершины — она не ложится на звенья
        let sx = 0, sy = 0;
        for (const q of [pts[i - 1], pts[i + 1]]) if (q) { const vx = q[0] - p[0], vy = q[1] - p[1], L = Math.hypot(vx, vy) || 1; sx += vx / L; sy += vy / L; }
        let L = Math.hypot(sx, sy);
        if (L < 0.2) { const q = pts[i + 1] || pts[i - 1]; sx = -(q[1] - p[1]); sy = q[0] - p[0]; L = Math.hypot(sx, sy) || 1; sx = -sx; sy = -sy; }
        return { x: p[0], y: p[1], label: LET[i], dx: r1(-sx / L * 13), dy: r1(sy / L * 13 + 4) };
      }),
    };
  }
  const zigzag = m => Array.from({ length: m }, (_, i) => [1 + 2 * i, i % 2 ? 3 : 1]);
  // Расстояние от точки до прямой (или между параллельными прямыми) на клетках. d — перпендикуляр, t — сдвиг, L — наклонная
  function distFig(d, t, horiz, two, label) {
    const W = t + 4, Ht = d + 2, F = horiz ? (x, y) => [x, y] : (x, y) => [y, x];
    const [w, h] = horiz ? [W, Ht] : [Ht, W];
    const P = F(2, 1 + d), A = F(2 + t, 1);
    const segs = [{ p: [...F(0, 1), ...F(W, 1)], bold: true }, { p: [...P, ...A], dash: true, green: true, label, side: horiz ? -1 : 1 }];
    if (two) segs.unshift({ p: [...F(0, 1 + d), ...F(W, 1 + d)], bold: true });
    const texts = [{ x: F(W - 0.4, 1.5)[0], y: F(W - 0.4, 1.5)[1], t: 'a' }];
    if (two) { const q = F(W - 0.4, 1.5 + d); texts.push({ x: q[0], y: q[1], t: 'b' }); }
    return {
      type: 'grid56', w, h, segs, texts,
      pts: [{ x: P[0], y: P[1], label: two ? 'B' : 'P' }, { x: A[0], y: A[1], label: 'A', dx: horiz ? 0 : -12, dy: horiz ? 18 : 4 }],
      desc: two ? `две параллельные прямые a и b на клетчатой бумаге, между ними ${d} ${cellsW(d)}; наклонный отрезок AB` : `прямая a и точка P на клетчатой бумаге, P на ${d} ${cellsW(d)} от прямой; наклонный отрезок PA к прямой`,
    };
  }
  // Прямоугольник ABCD с диагоналями (A — слева внизу, по часовой: B слева вверху, C справа вверху, D справа внизу)
  const rectDiagFig = (w = 6, h = 4, desc = 'прямоугольник ABCD с диагоналями AC и BD, пересекающимися в точке O') => ({
    type: 'grid56', w: w + 2, h: h + 2, grid: false, desc,
    polys: [{ pts: [[1, 1], [1, 1 + h], [1 + w, 1 + h], [1 + w, 1]] }],
    segs: [{ p: [1, 1, 1 + w, 1 + h], green: true }, { p: [1, 1 + h, 1 + w, 1], green: true }],
    pts: [{ x: 1, y: 1, label: 'A', dx: -10, dy: 14 }, { x: 1, y: 1 + h, label: 'B', dx: -10, dy: -6 }, { x: 1 + w, y: 1 + h, label: 'C', dx: 10, dy: -6 }, { x: 1 + w, y: 1, label: 'D', dx: 10, dy: 14 }, { x: 1 + w / 2, y: 1 + h / 2, label: 'O', dx: 0, dy: -10 }],
  });
  // Фигура-«уголок»: прямоугольник W × H без угла cw × ch (вверху справа или слева)
  function lFig(W, Ht, cw, ch, flip, grid) {
    const mx = x => (flip ? W - x : x);
    const raw = [[0, 0], [W, 0], [W, Ht - ch], [W - cw, Ht - ch], [W - cw, Ht], [0, Ht]];
    const A = (a, b) => (flip ? b : a);
    return {
      type: 'grid56', w: W, h: Ht, grid, desc: `фигура: прямоугольник ${W} на ${Ht} без угла ${cw} на ${ch}`,
      polys: [{ pts: raw.map(([x, y]) => [mx(x), y]), fill: true }],
      texts: [
        { x: W / 2, y: 0, dy: 18, t: String(W) },
        { x: mx(0), y: Ht / 2, dx: flip ? 8 : -8, a: A('end', 'start'), t: String(Ht) },
        { x: mx((W - cw) / 2), y: Ht, dy: -12, t: String(W - cw) },
        { x: mx(W), y: (Ht - ch) / 2, dx: flip ? -8 : 8, a: A('start', 'end'), t: String(Ht - ch) },
        { x: mx(W - cw / 2), y: Ht - ch, dy: 14, t: String(cw) },
        { x: mx(W - cw), y: Ht - ch / 2, dx: flip ? 8 : -8, a: A('end', 'start'), t: String(ch) },
      ],
    };
  }
  // площадь фигуры на клетках перебором клеток: inside(i, j) — клетка [i, i+1] × [j, j+1] внутри
  const countCells = (w, h, inside) => { let c = 0; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) if (inside(i, j)) c++; return c; };

  /* ======================================================================
     Темы
     ====================================================================== */
  const topics = [
    /* ---------------- 5 класс ---------------- */
    {
      id: 'g5-segments', strand: SG, grade: 5, short: 'Ломаная', title: 'Отрезок, ломаная, единицы длины',
      frp: ['Наглядные представления о фигурах на плоскости: точка, прямая, отрезок, луч, ломаная', 'Длина отрезка, метрические единицы длины', 'Длина ломаной, периметр многоугольника'],
      goal: 'Находить длину ломаной как сумму длин звеньев, считать звенья и промежутки, переводить метры и сантиметры.',
      requires: ['t5-units'],
      explain: {
        model: 'Муравей ползёт из A в D не напрямик, а вдоль линий тетради: A → B → C → D. Его путь — ломаная, а кусочки AB, BC и CD — её звенья. Длина пути — сумма всех звеньев: 3 + 4 + 2 = 9 см.',
        figure: { type: 'grid56', w: 7, h: 6, desc: 'ломаная ABCD на клетках: звенья 3, 4 и 2 клетки', segs: [{ p: [1, 1, 4, 1], bold: true, green: true, label: '3 см', side: 1 }, { p: [4, 1, 4, 5], bold: true, green: true, label: '4 см', side: 1 }, { p: [4, 5, 6, 5], bold: true, green: true, label: '2 см', side: -1 }], pts: [{ x: 1, y: 1, label: 'A' }, { x: 4, y: 1, label: 'B', dy: 16 }, { x: 4, y: 5, label: 'C', dx: -10 }, { x: 6, y: 5, label: 'D', dy: 16 }] },
        figureCaption: 'Ломаная ABCD: три звена, длина 3 + 4 + 2 = 9 см (сторона клетки — 1 см)',
        rule: '<ul class="rule-list"><li><b>Отрезок</b> — самый короткий путь между двумя точками. <b>Ломаная</b> — несколько отрезков-звеньев, идущих друг за другом.</li><li><b>Длина ломаной</b> = сумма длин всех её звеньев.</li><li>Звеньев на одно <b>меньше</b>, чем вершин: у ломаной ABCDE 5 вершин и 4 звена. Так же и с забором: между 5 столбами 4 пролёта.</li><li>1 см = 10 мм, 1 дм = 10 см, <b>1 м = 100 см</b> = 10 дм, 1 км = 1000 м.</li></ul>',
        examples: [
          { q: 'Доска — 2 м 35 см. Сколько это сантиметров?', choices: ['235 см', '55 см'], correct: 0, wrong: { 1: 'm-is-10cm' },
            steps: ['В метре 100 см, значит, 2 м = 200 см.', '200 + 35 = 235 см.'] },
          { q: 'Вдоль дорожки стоят 6 фонарей, между соседними — 10 м. Какое расстояние от первого фонаря до последнего?', choices: ['50 м', '60 м'], correct: 0, wrong: { 1: 'count-vertices' },
            steps: ['Фонари — как вершины ломаной, промежутки между ними — как звенья.', 'Промежутков на один меньше, чем фонарей: 6 − 1 = 5.', '5 · 10 = 50 м.'] },
          { q: 'Звенья ломаной — 2 см, 5 см и 4 см. Найди её длину.', choices: ['11 см', '6 см'], correct: 0, wrong: { 1: 'one-link-times' },
            steps: ['Звенья разные, поэтому складываем все три.', '2 + 5 + 4 = 11 см.'] },
        ],
      },
      mistakes: [
        { id: 'm-is-10cm', title: 'Считает, что в метре 10 сантиметров', kidName: 'Десятиметр',
          kidRule: 'ты думаешь, что в одном метре 10 сантиметров',
          say: 'В метре не 10, а 100 сантиметров: метр — это 10 дециметров, а в каждом дециметре 10 см.',
          fixIdea: '1 м = 100 см: десять дециметров по 10 сантиметров.',
          explainOptions: ['В метре 100 см, а 10 см — это дециметр', 'Метры и сантиметры можно просто сложить', 'В метре 1000 см'],
          conflicts: [{ text: 'Школьная линейка — 30 см. По твоему правилу 1 м = 10 см, и тогда метр втрое короче линейки. А ведь метр — это примерно от пола до пояса.', ask: 'Метр короче школьной линейки?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 100 > 30 && 10 < 30 }],
          root: 't5-units' },
        { id: 'count-vertices', title: 'Считает точки (вершины, столбы) вместо промежутков', kidName: 'Столбосчёт',
          kidRule: 'ты умножаешь длину промежутка на число точек, а промежутков на один меньше',
          say: 'Сосчитай промежутки, а не точки: между 2 столбами один пролёт, между 3 столбами — два.',
          fixIdea: 'Звеньев (промежутков) на одно меньше, чем вершин (столбов).',
          explainOptions: ['Промежутков на один меньше, чем точек', 'Промежутков столько же, сколько точек', 'Промежутков на один больше, чем точек'],
          conflicts: [{ text: 'Два столба, между ними один пролёт забора длиной 3 м. По твоему правилу длина забора 2 · 3 = 6 м — будто пролётов два.', ask: 'Сколько пролётов между двумя столбами?', choices: ['1', '2'], right: '1', verify: () => 2 - 1 === 1 }] },
        { id: 'one-link-times', title: 'Умножает одно звено на число звеньев, хотя звенья разные', kidName: 'Копирка',
          kidRule: 'ты берёшь длину одного звена и умножаешь на число звеньев, будто все звенья одинаковые',
          say: 'Звенья этой ломаной разной длины. Измерь каждое и сложи все длины.',
          fixIdea: 'Длина ломаной — сумма длин всех звеньев, а не одно звено, повторённое несколько раз.',
          explainOptions: ['Звенья разные, поэтому их длины надо сложить', 'Длина ломаной — это её самое длинное звено', 'Длину звена всегда умножают на число звеньев'],
          conflicts: [{ text: 'Ломаная из двух звеньев: 1 см и 9 см. По твоему правилу её длина 1 · 2 = 2 см. А одно только второе звено уже 9 см.', ask: 'Может ломаная быть короче своего звена?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 1 * 2 < 9 }] },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['grid', 'grid', 'equal', 'units', 'count'], ['grid', 'equal', 'fence', 'units', 'units'], ['grid', 'equal', 'fence', 'units', 'mixed', 'mixed']));

        if (kind === 'grid') {
          const n = rnd(...L3(lv, [2, 3], [3, 4], [4, 5])), mx = L3(lv, 4, 5, 5);
          let raw, lens;
          do {
            const startV = Math.random() < 0.5;
            raw = [[0, rnd(0, 5)]]; lens = [];
            for (let i = 0; i < n; i++) {
              const [x, y] = raw[i];
              if ((i % 2 === 0) !== startV) { const d = rnd(1, mx); raw.push([x + d, y]); lens.push(d); }
              else { let d; do d = rnd(1, mx) * pick([1, -1]); while (y + d < 0 || y + d > 6); raw.push([x, y + d]); lens.push(Math.abs(d)); }
            }
          } while (raw[n][0] > 10 || lens.every(l => l === lens[0]));
          const minY = Math.min(...raw.map(p => p[1])), pts = raw.map(([x, y]) => [x + 1, y - minY + 1]);
          const C = lv === 3 ? { cell: 5, unit: 'мм', ct: '5 мм' } : pick([{ cell: 1, unit: 'см', ct: '1 см' }, { cell: 1, unit: 'м', ct: '1 м', robot: true }]);
          const name = LET.slice(0, n + 1).join(''), last = LET[n], L = lens.reduce((a, b) => a + b, 0) * C.cell;
          const S = C.robot ? [`Робот-пылесос проехал по комнате по ломаной ${name}. На плане сторона клетки — 1 м.`, 'Сколько метров проехал робот?']
            : pick([[`На клетчатой бумаге нарисована ломаная ${name}. Сторона клетки — ${C.ct}.`, `Найди длину ломаной (в ${C.unit}).`],
              [`Муравей прополз по линиям клетчатого листа от точки A до точки ${last} по ломаной ${name}. Сторона клетки — ${C.ct}.`, `Какой путь проделал муравей (в ${C.unit})?`],
              [`Улитка ползла по клеточкам тетради по ломаной ${name}. Сторона клетки — ${C.ct}.`, `Какой путь проползла улитка (в ${C.unit})?`]]);
          return {
            story: S[0], question: S[1], placeholder: C.unit,
            figure: polyFig(pts, true, `ломаная ${name} на клетчатой бумаге из ${n} ${pl(n, 'звена', 'звеньев', 'звеньев')}`),
            answer: ans(L),
            hints: ['Посчитай клетки вдоль каждого звена отдельно, а потом сложи.', `Звенья по клеткам: ${lens.join(', ')}.${C.cell !== 1 ? ` Каждая клетка — ${C.ct}.` : ''}`],
            solution: `${lens.map(l => num(l * C.cell)).join(' + ')} = ${num(L)} ${C.unit}.`,
            wrongs: wr(L, { 'one-link-times': lens[0] * n * C.cell }),
            data: { kind, pts, cell: C.cell },
          };
        }

        if (kind === 'equal' || kind === 'count') {
          const m = rnd(...L3(lv, [3, 6], [4, 7], [5, 9])), name = LET.slice(0, m).join('');
          const fig = polyFig(zigzag(m), false, `ломаная ${name}, все звенья одинаковые`);
          if (kind === 'count') {
            return {
              story: `Нарисована ломаная ${name}.`, question: 'Сколько у неё звеньев?', figure: fig, answer: ans(m - 1), placeholder: 'звеньев',
              hints: ['Звено — отрезок между двумя соседними вершинами. Считай отрезки, а не буквы.', `Вершин ${m}. Сколько отрезков между ними?`],
              solution: `Звеньев на одно меньше, чем вершин: ${m} − 1 = ${m - 1}.`,
              wrongs: wr(m - 1, { 'count-vertices': m }),
              data: { kind, m },
            };
          }
          const a = rnd(...L3(lv, [2, 6], [3, 12], [6, 25])), L = a * (m - 1);
          const S = pick([[`Все звенья ломаной ${name} равны, каждое — ${a} см.`, 'Найди длину ломаной (в см).'],
            [`Гусеница ползла по ломаной ${name}, у которой все звенья по ${a} см.`, 'Какой путь проползла гусеница (в см)?'],
            [`Змейку выложили из палочек по ломаной ${name}; каждое звено — палочка длиной ${a} см.`, 'Какова длина змейки (в см)?']]);
          return {
            story: S[0], question: S[1], figure: fig, answer: ans(L), placeholder: 'см',
            hints: ['Сколько звеньев у этой ломаной? Считай отрезки между соседними буквами, а не сами буквы.', `Вершин ${m}, значит, звеньев ${m - 1}. Каждое по ${a} см.`],
            solution: `Звеньев ${m} − 1 = ${m - 1}; длина ${m - 1} · ${a} = ${L} см.`,
            wrongs: wr(L, { 'count-vertices': a * m }),
            data: { kind, m, a },
          };
        }

        if (kind === 'fence') {
          const m = rnd(...L3(lv, [3, 6], [4, 10], [8, 16])), a = rnd(...L3(lv, [2, 5], [2, 10], [3, 15])), L = a * (m - 1);
          const S = pick([
            [`Вдоль дорожки поставили ${m} ${pl(m, 'фонарь', 'фонаря', 'фонарей')} на расстоянии ${a} м друг от друга.`, 'Какое расстояние от первого фонаря до последнего (в м)?', 'м'],
            [`Вдоль забора посадили в ряд ${m} ${pl(m, 'куст', 'куста', 'кустов')}, между соседними — ${a} дм.`, 'Какое расстояние от первого куста до последнего (в дм)?', 'дм'],
            [`Для забора вкопали в ряд ${m} ${pl(m, 'столб', 'столба', 'столбов')}, расстояние между соседними — ${a} м.`, 'Какой длины получится забор от первого до последнего столба (в м)?', 'м'],
          ]);
          const pts = Array.from({ length: m }, (_, i) => ({ x: 1 + i, y: 1 }));
          return {
            story: S[0], question: S[1], placeholder: S[2],
            figure: { type: 'grid56', w: m + 1, h: 2, grid: false, desc: `${m} точек в ряд на равных расстояниях`, segs: [{ p: [1, 1, m, 1] }, { p: [1, 1, 2, 1], green: true, bold: true, label: `${a} ${S[2]}`, side: -1 }], pts },
            answer: ans(L),
            hints: ['Сколько промежутков между первым и последним? Нарисуй 3 точки и посчитай промежутки — их меньше, чем точек.', `Промежутков ${m} − 1 = ${m - 1}, каждый по ${a} ${S[2]}.`],
            solution: `Промежутков ${m - 1}; ${m - 1} · ${a} = ${L} ${S[2]}.`,
            wrongs: wr(L, { 'count-vertices': a * m }),
            data: { kind, m, a },
          };
        }

        if (kind === 'units') {
          const S = pick([
            [x => `Длина доски — ${x}`, 'Сколько это сантиметров?', 6],
            [x => `Для бантов купили ленту длиной ${x}`, 'Сколько сантиметров ленты купили?', 15],
            [x => `Ширина окна — ${x}`, 'Сколько это сантиметров?', 2],
            [x => `Длина ковровой дорожки — ${x}`, 'Какова её длина в сантиметрах?', 15],
            [x => `Папа прыгнул в длину на ${x}`, 'Сколько это сантиметров?', 4],
          ]);
          // сантиметры двузначные: при «1 м 9 см» ответ 19 дал бы и тот, кто просто приписал цифры, — ошибку не различить
          const x = rnd(...L3(lv, [1, Math.min(3, S[2])], [1, Math.min(9, S[2])], [Math.min(2, S[2]), S[2]])), y = lv === 1 ? rnd(1, 9) * 10 : rnd(11, 99), L = 100 * x + y;
          S[0] = S[0](`${x} м ${y} см.`);
          return {
            story: S[0], question: S[1], answer: ans(L), placeholder: 'см',
            hints: ['Сколько сантиметров в одном метре?', `${x === 1 ? '1 м = 100 см.' : `1 м = 100 см, значит, ${x} м = ${100 * x} см.`} Прибавь ${y} см.`],
            solution: `${x} м = ${x} · 100 = ${100 * x} см; ${100 * x} + ${y} = ${L} см.`,
            wrongs: wr(L, { 'm-is-10cm': 10 * x + y }),
            data: { kind, parts: [[x, 100], [y, 1]] },
          };
        }

        // mixed: звенья в разных единицах
        const x1 = rnd(1, 3), y1 = rnd(1, 9) * 10, y2 = rnd(15, 95), x3 = rnd(1, 4);
        const L = 100 * x1 + y1 + y2 + 100 * x3;
        const S = pick([
          [`Звенья ломаной равны ${x1} м ${y1} см, ${y2} см и ${x3} м.`, 'Найди длину ломаной в сантиметрах.'],
          [`Гирлянду развесили ломаной из трёх кусков: ${x1} м ${y1} см, ${y2} см и ${x3} м.`, 'Какова длина гирлянды в сантиметрах?'],
          [`Дорожка в саду — ломаная из трёх звеньев: ${x1} м ${y1} см, ${y2} см и ${x3} м.`, 'Какова длина дорожки в сантиметрах?'],
        ]);
        return {
          story: S[0], question: S[1], answer: ans(L), placeholder: 'см',
          hints: ['Переведи все звенья в сантиметры, а потом сложи. В метре 100 см.', `${x1} м ${y1} см = ${100 * x1 + y1} см, ${x3} м = ${100 * x3} см.`],
          solution: `${100 * x1 + y1} + ${y2} + ${100 * x3} = ${L} см.`,
          wrongs: wr(L, { 'm-is-10cm': 10 * x1 + y1 + y2 + 10 * x3 }),
          data: { kind, parts: [[x1, 100], [y1, 1], [y2, 1], [x3, 100]] },
        };
      },
      verify(task) {
        const d = task.data;
        if (d.kind === 'grid') { let s = 0; for (let i = 1; i < d.pts.length; i++) s += Math.abs(d.pts[i][0] - d.pts[i - 1][0]) + Math.abs(d.pts[i][1] - d.pts[i - 1][1]); return isAns(task, s * d.cell); }
        if (d.kind === 'count') { let gaps = 0; for (let i = 1; i < d.m; i++) gaps++; return isAns(task, gaps); }
        if (d.kind === 'equal' || d.kind === 'fence') { let s = 0; for (let i = 1; i < d.m; i++) s += d.a; return isAns(task, s); }
        return isAns(task, d.parts.reduce((s, [v, k]) => s + v * k, 0));
      },
    },

    {
      id: 'g-angles', strand: SG, grade: 5, short: 'Углы', title: 'Углы: прямой, развёрнутый, градусы',
      frp: ['Угол. Прямой, острый, тупой и развёрнутый углы', 'Измерение и построение углов с помощью транспортира'],
      goal: 'Знать, что прямой угол — 90°, развёрнутый — 180°, и находить неизвестную часть угла.',
      requires: [],
      explain: {
        model: 'Открой дверь так, чтобы она встала поперёк стены, — получится прямой угол, 90°. Распахни её так, чтобы она стала продолжением стены, — это развёрнутый угол, 180°: две половинки прямой линии.',
        figure: { type: 'angle_split', total: 180, a: 90 },
        figureCaption: 'Развёрнутый угол — это два прямых: 90° + 90° = 180°',
        rule: '<ul class="rule-list"><li><b>Прямой угол</b> = 90°. Как уголок тетради.</li><li><b>Развёрнутый угол</b> = 180°. Его стороны лежат на одной прямой.</li><li>Луч делит угол на две части: <b>части вместе дают весь угол</b>. Неизвестная часть = весь угол − известная.</li><li>Циферблат часов — полный круг, 360°. Между соседними числами 360° : 12 = 30°.</li></ul>',
        examples: [
          { q: 'Развёрнутый угол разделили лучом. Одна часть — 50°. Сколько градусов в другой?', fig: { type: 'angle_split', total: 180, a: 50 },
            choices: ['130°', '40°', '50°'], correct: 0, wrong: { 1: 'straight-as-right', 2: 'copied-given' },
            steps: ['Развёрнутый угол — 180°.', 'Вторая часть: 180° − 50° = 130°.'] },
          { q: 'Часы показывают 3:00. Какой угол между стрелками?', fig: { type: 'clock', h: 3 },
            choices: ['90°', '15°'], correct: 0, wrong: { 1: 'clock-minutes' },
            steps: ['Циферблат — полный круг, 360°. На нём 12 часовых делений.', 'Одно деление — 360° : 12 = 30°.', 'От 12 до 3 — три деления: 3 · 30° = 90°.'] },
        ],
      },
      mistakes: [
        { id: 'straight-as-right', title: 'Путает развёрнутый угол с прямым', kidName: 'Уголок-путаник',
          kidRule: 'ты думаешь, что в развёрнутом угле 90°, а в прямом — 180°',
          say: 'Развёрнутый угол — это прямая линия, 180°. Прямой — уголок тетради, 90°. Два прямых угла рядом как раз дают прямую линию.',
          fixIdea: 'Прямой угол — 90° (уголок тетради), развёрнутый — 180° (прямая линия).',
          explainOptions: ['Развёрнутый угол — это прямая линия, в нём 180°, а в прямом 90°', 'В развёрнутом угле всегда 90°', 'Развёрнутый и прямой угол — одно и то же'],
          conflicts: [{ text: 'Развёрнутый угол разделили на части 30° и ещё одну. По твоему правилу вторая часть 90° − 30° = 60°. Сложи: 30° + 60° = 90° — получился уголок тетради, а не прямая линия.', ask: 'Получилась прямая линия?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 30 + 60 !== 180, figure: { type: 'angle_split', total: 180, a: 30 } }] },
        { id: 'copied-given', title: 'Повторил данный угол вместо ответа', kidName: 'Копировщик',
          kidRule: 'ты считаешь, что луч всегда делит угол на две одинаковые части',
          say: 'Части равны, только если луч делит угол пополам. Здесь вычти известную часть из всего угла.',
          fixIdea: 'Части вместе дают весь угол: неизвестная часть = весь угол − известная часть.',
          explainOptions: ['Части вместе должны дать весь угол, а не быть одинаковыми', 'Луч всегда делит угол пополам', 'Надо сложить угол и часть'],
          conflicts: [{ text: 'Прямой угол разделили на 20° и ещё одну часть. По твоему правилу вторая часть тоже 20°. Тогда весь угол 20° + 20° = 40°, а прямой угол — 90°.', ask: 'Части дают весь прямой угол?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 20 + 20 !== 90, figure: { type: 'angle_split', total: 90, a: 20 } }] },
        { id: 'clock-minutes', title: 'Считает деления часов как минуты (по 5°)', kidName: 'Минутник',
          kidRule: 'ты считаешь, что между соседними числами на часах 5 градусов, как 5 минут',
          say: 'Между соседними цифрами на часах не 5°, а 30°: весь круг 360° делят на 12 часов.',
          fixIdea: 'Полный круг — 360°, на часах 12 делений: одно деление — 30°.',
          explainOptions: ['Одно часовое деление — это 360° : 12 = 30°', 'Одно деление — 5°, как 5 минут', 'Одно деление — 1°'],
          conflicts: [{ text: 'В 6:00 стрелки смотрят в разные стороны — это развёрнутый угол, 180°. По твоему правилу 6 делений по 5° — всего 30°, почти закрытый угол.', ask: 'Сколько градусов между стрелками в 6:00?', choices: ['30°', '180°'], right: '180°', verify: () => 6 * 30 === 180, figure: { type: 'clock', h: 6 } }] },
      ],
      generate(lv) {
        const kind = lv === 1 ? 'split' : pick(['split', 'split', 'clock']);
        if (kind === 'clock') {
          const h = rnd(1, 6), x = h * 30;
          const S = pick([`Часы показывают ровно ${h}:00.`, `На часах ровно ${h}:00.`, `Кукушка в часах прокуковала ${h} ${pl(h, 'раз', 'раза', 'раз')} — сейчас ровно ${h}:00.`]);
          return {
            story: S, question: 'Сколько градусов между часовой и минутной стрелками?', placeholder: 'градусы',
            figure: { type: 'clock', h }, answer: ans(x),
            hints: ['Весь циферблат — 360°, на нём 12 делений. Сколько градусов в одном?', `Одно деление — 30°. Стрелки разделяют ${h} ${pl(h, 'деление', 'деления', 'делений')}.`],
            solution: `360° : 12 = 30°; ${h} · 30° = ${x}°.`,
            wrongs: wr(x, { 'clock-minutes': h * 5 }),
            data: { kind, h },
          };
        }
        const T = pick([180, 90]), step = L3(lv, 10, 5, 1);
        let a; do a = rnd(1, Math.floor((T - 1) / step)) * step; while (a * 2 === T || a < 10 || T - a < 10);
        const x = T - a;
        const S = T === 180 ? pick([
          [`Развёрнутый угол разделили лучом на две части. Одна часть — ${a}°.`, 'Сколько градусов в другой части?'],
          [`Робот смотрит вперёд. Ему нужно развернуться и смотреть строго назад. Он уже повернулся на ${a}°.`, 'На сколько градусов ему ещё повернуться?'],
          [`От прямой дороги отходит тропинка. С одним направлением дороги она образует угол ${a}°.`, 'Какой угол (в градусах) тропинка образует с другим направлением дороги?'],
        ]) : pick([
          [`Прямой угол разделили лучом на две части. Одна часть — ${a}°.`, 'Сколько градусов в другой части?'],
          [`Дверь приоткрыли на ${a}° от стены. Её хотят открыть так, чтобы она встала под прямым углом к стене.`, 'На сколько градусов ещё надо открыть дверь?'],
          [`Велосипедист ехал на север и сворачивает на восток — это поворот на прямой угол. Он уже повернул на ${a}°.`, 'На сколько градусов ему ещё повернуть?'],
        ]);
        return {
          story: S[0], question: S[1], placeholder: 'градусы',
          figure: { type: 'angle_split', total: T, a }, answer: ans(x),
          hints: [`Сколько градусов во всём ${T === 180 ? 'развёрнутом' : 'прямом'} угле?`, `Весь угол — ${T}°. Вычти ${a}°.`],
          solution: `${T}° − ${a}° = ${x}°.`,
          wrongs: wr(x, { 'straight-as-right': T === 180 ? (a < 90 ? 90 - a : null) : 180 - a, 'copied-given': a }),
          data: { kind, T, a },
        };
      },
      verify(task) {
        const d = task.data, x = Number(task.answer);
        if (d.kind === 'clock') return same(x, Math.min(30 * d.h, 360 - 30 * d.h));
        return x > 0 && same(x + d.a, d.T);
      },
    },

    {
      id: 'g5-angle-types', strand: SG, grade: 5, short: 'Виды углов', title: 'Виды углов и транспортир',
      frp: ['Угол. Прямой, острый, тупой и развёрнутый углы', 'Измерение и построение углов с помощью транспортира'],
      goal: 'Различать острый, прямой, тупой и развёрнутый углы и правильно читать шкалу транспортира.',
      requires: ['g-angles'],
      explain: {
        model: 'Открывай ноутбук понемногу. Пока крышка наклонена к клавиатуре, угол между ними острый — меньше 90°. Крышка стоит вертикально — угол прямой, 90°. Откинул дальше — угол тупой: больше 90°, но меньше 180°. А если бы крышка легла плоско в одну линию с клавиатурой, угол стал бы развёрнутым — 180°.',
        figure: { type: 'protractor56', deg: 50, side: 'right' },
        figureCaption: 'Сторона OA проходит через 0 внутренней шкалы — значит, читаем внутреннюю: угол AOB = 50°',
        rule: '<ul class="rule-list"><li><b>Острый</b> угол меньше 90°, <b>прямой</b> — ровно 90°, <b>тупой</b> — больше 90°, но меньше 180°, <b>развёрнутый</b> — 180°.</li><li><b>Транспортир:</b> центр — в вершину угла, одна сторона — через 0. Читай ту шкалу, на которой эта сторона стоит на нуле.</li><li>Проверь глазами: острый угол не может оказаться больше 90°, а тупой — меньше.</li><li>Величина угла <b>не зависит от длины сторон</b>: продли стороны — угол останется тем же.</li></ul>',
        examples: [
          { q: 'Сторона OA проходит через 0 внешней шкалы, а сторона OB — через 70 по внутренней и 110 по внешней. Чему равен угол AOB?', fig: { type: 'protractor56', deg: 110, side: 'left' },
            choices: ['110°', '70°'], correct: 0, wrong: { 1: 'protractor-scale' },
            steps: ['Сторона OA стоит на нуле внешней шкалы — значит, читаем внешнюю.', 'По внешней шкале сторона OB показывает 110°.', 'Угол на рисунке тупой — 110° подходит.'] },
          { q: 'Угол 40° рассматривают в лупу, которая увеличивает в 3 раза. Сколько градусов в угле, который видно в лупу?',
            choices: ['40°', '120°'], correct: 0, wrong: { 1: 'longer-sides-bigger' },
            steps: ['Лупа делает стороны угла длиннее, но не разводит их шире.', 'Значит, угол остаётся 40°.'] },
          { q: 'Ножницы раскрыли на 35°. Какой это угол?', fig: { type: 'angle', degrees: 35 },
            choices: ['острый', 'тупой'], correct: 0, wrong: { 1: 'acute-obtuse-swap' },
            steps: ['35° меньше 90°.', 'Угол меньше прямого — острый.'] },
        ],
      },
      mistakes: [
        { id: 'protractor-scale', title: 'Читает не ту шкалу транспортира', kidName: 'Двушкальник',
          kidRule: 'ты смотришь на шкалу транспортира, которая попалась первой, а не на ту, где сторона угла идёт через 0',
          say: 'У транспортира две шкалы. Читай ту, на которой первая сторона угла проходит через 0, и проверь глазами: острый угол не может быть больше 90°.',
          fixIdea: 'Найди шкалу, где одна сторона угла стоит на нуле, — и считай градусы только по ней.',
          explainOptions: ['Отсчёт надо вести по той шкале, где сторона угла проходит через 0', 'Транспортир приложили не к той стороне угла', 'Всегда читают внешнюю шкалу'],
          conflicts: [{ text: 'Угол на рисунке узкий — сразу видно, что он острый. По твоему правилу (читать первую попавшуюся шкалу) выходит 160° — почти прямая линия.', ask: 'Может острый угол быть 160°?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 160 > 90 && 180 - 160 === 20, figure: { type: 'protractor56', deg: 20, side: 'right' } }] },
        { id: 'longer-sides-bigger', title: 'Считает угол больше, если его стороны длиннее', kidName: 'Длинноног',
          kidRule: 'ты думаешь, что чем длиннее стороны угла, тем больше сам угол',
          say: 'Величина угла — это то, насколько разведены его стороны, а не их длина. Длинные стороны можно провести у любого угла.',
          fixIdea: 'Угол меряют раскрытием сторон, а не их длиной: продлил стороны — угол тот же.',
          explainOptions: ['Длина сторон не меняет угол — важно только, насколько они разведены', 'Угол растёт вместе со сторонами', 'Лупа уменьшает угол'],
          conflicts: [
            { text: 'Нарисуй угол 30° и продли его стороны хоть до края тетради. Транспортир всё равно покажет 30°: раскрытие сторон не изменилось. По твоему правилу угол должен был вырасти.', ask: 'Изменится угол, если продлить его стороны?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => true },
            { text: 'Посмотри на угол 60° в лупу, которая увеличивает в 2 раза. По твоему правилу он станет 120° — тупым. Но лупа не меняет форму: острый угол остаётся острым.', ask: 'Станет острый угол тупым под лупой?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 60 < 90 && 60 * 2 > 90 },
          ] },
        { id: 'acute-obtuse-swap', title: 'Путает острый и тупой угол', kidName: 'Наоборотик',
          kidRule: 'ты путаешь названия: угол меньше 90° называешь тупым, а больше 90° — острым',
          say: 'Острый угол меньше прямого — он «колется», как кончик ножниц. Тупой — больше прямого, но меньше развёрнутого.',
          fixIdea: 'Меньше 90° — острый, больше 90° (но меньше 180°) — тупой.',
          explainOptions: ['Острый угол меньше 90°, тупой — больше 90°', 'Острый угол больше 90°', 'Тупым называют угол ровно 90°'],
          conflicts: [{ text: 'У кончика иголки стороны почти слились — угол совсем маленький, например 10°. Иголка колется, она острая. По твоему правилу такой маленький угол — тупой.', ask: 'Угол 10° — какой?', choices: ['острый', 'тупой'], right: 'острый', verify: () => 10 < 90, figure: { type: 'angle', degrees: 10 } }] },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['measure', 'classify', 'classify', 'compare'], ['measure', 'classify', 'magnify'], ['measure', 'measure', 'classify', 'magnify']));
        const TYPE = d => (d < 90 ? 'острый' : d === 90 ? 'прямой' : d < 180 ? 'тупой' : 'развёрнутый');

        if (kind === 'measure') {
          const step = L3(lv, 20, 10, 5);
          let d; do d = rnd(1, Math.floor(175 / step)) * step; while (d === 90 || d < 10 || d > 170);
          const side = pick(['right', 'left']), scale = side === 'right' ? 'внутренней' : 'внешней';
          return {
            story: pick(['К углу AOB приложили транспортир.', 'Маша измеряет угол AOB транспортиром.', 'На чертеже угол AOB, центр транспортира — в вершине O.']),
            question: 'Сколько градусов в угле AOB?', placeholder: 'градусы',
            figure: { type: 'protractor56', deg: d, side }, answer: ans(d),
            hints: ['Найди шкалу, на которой сторона OA проходит через 0. Читай только её.', `Сторона OA стоит на нуле ${scale} шкалы. И посмотри на угол: он ${d < 90 ? 'острый — значит, меньше 90°' : 'тупой — значит, больше 90°'}.`],
            solution: `Сторона OA идёт через 0 ${scale} шкалы. По этой шкале сторона OB показывает ${d}°. Угол ${TYPE(d)} — сходится. Ответ: ${d}°.`,
            wrongs: wr(d, { 'protractor-scale': 180 - d }),
            data: { kind, side, th: side === 'right' ? d : 180 - d },
          };
        }

        if (kind === 'classify') {
          let d, S;
          if (Math.random() < 0.25) {
            const h = rnd(1, lv === 1 ? 6 : 5); d = 30 * h;
            S = { story: `Часы показывают ${h}:00.`, q: 'Какой угол образуют часовая и минутная стрелки?', fig: { type: 'clock', h } };
          } else {
            const t = pick(lv === 1 ? ['ac', 'ob', 'ac', 'ob', 'rt', 'st'] : ['ac', 'ob', 'ac', 'ob', 'rt']);
            d = t === 'rt' ? 90 : t === 'st' ? 180
              : t === 'ac' ? (lv === 1 ? rnd(2, 8) * 10 : lv === 2 ? rnd(1, 17) * 5 : pick([rnd(1, 89), rnd(80, 89)]))
                : (lv === 1 ? rnd(10, 17) * 10 : lv === 2 ? rnd(19, 35) * 5 : pick([rnd(91, 179), rnd(91, 100)]));
            const C = [
              [`Угол равен ${d}°.`, 'Какой это угол?', true],
              [`Веер раскрыли на ${d}°.`, 'Какой угол между крайними пластинками веера?', true],
              [`Ножницы раскрыли на ${d}°.`, 'Какой угол между лезвиями?', d < 90],
              [`Крышку ноутбука откинули на ${d}° от клавиатуры.`, 'Какой угол между крышкой и клавиатурой?', d < 180],
              [`Две улицы пересекаются под углом ${d}°.`, 'Какой это угол?', d < 180],
            ].filter(c => c[2]);
            const c = pick(C);
            S = { story: c[0], q: c[1], fig: { type: 'angle', degrees: d } };
          }
          const right = TYPE(d);
          return {
            story: S.story, question: S.q, figure: S.fig, accept: 'choice',
            choices: ['острый', 'прямой', 'тупой', 'развёрнутый'], answer: right,
            hints: ['Вспомни: острый — меньше 90°, прямой — ровно 90°, тупой — от 90° до 180°, развёрнутый — ровно 180°.', S.fig.type === 'clock' ? `Стрелки разделяют ${d / 30} ${pl(d / 30, 'деление', 'деления', 'делений')} по 30°. Сколько это градусов? Сравни с 90°.` : `Сравни ${d}° с 90° и со 180°.`],
            solution: `${S.fig.type === 'clock' ? `${d / 30} · 30° = ${d}°. ` : ''}Угол ${d}° ${d < 90 ? 'меньше 90°' : d === 90 ? 'равен 90°' : d < 180 ? 'больше 90°, но меньше 180°' : 'равен 180°'}, значит, он ${right}.`,
            wrongs: wc(right, { 'acute-obtuse-swap': right === 'острый' ? 'тупой' : right === 'тупой' ? 'острый' : null }),
            data: { kind, deg: d },
          };
        }

        if (kind === 'magnify') {
          const d = rnd(...L3(lv, [2, 8], [2, 17], [3, 33])) * 5, k = rnd(2, L3(lv, 3, 4, 10));
          const S = pick([
            [`Угол ${d}° рассматривают в лупу, которая увеличивает в ${times(k)}.`, 'Сколько градусов в угле, который видно в лупу?'],
            [`У угла ${d}° продлили обе стороны: каждая стала в ${times(k)} длиннее.`, 'Сколько градусов теперь в угле?'],
            [`Чертёж с углом ${d}° увеличили на экране в ${times(k)}.`, 'Сколько градусов в угле на экране?'],
          ]);
          return {
            story: S[0], question: S[1], answer: ans(d), placeholder: 'градусы',
            hints: ['Что меняется у угла, когда его стороны становятся длиннее? А насколько они разведены — меняется?', 'Величина угла — это раскрытие сторон, а не их длина.'],
            solution: `Стороны стали длиннее, но разведены так же. Угол остаётся ${d}°.`,
            wrongs: wr(d, { 'longer-sides-bigger': k * d }),
            data: { kind, deg: d },
          };
        }

        // compare: угол с длинными сторонами — меньше (или равен)
        const x = rnd(2, 6) * 10, y = Math.random() < 0.25 ? x : x + rnd(2, 3) * 10, longA = Math.random() < 0.5;
        const [dA, dB] = longA ? [x, y] : [y, x], p = rnd(6, 10), q = rnd(2, 3);
        const right = dA === dB ? 'они равны' : dA > dB ? 'угол A' : 'угол B';
        const draw = (vx, deg, L) => [{ p: [vx, 0.6, vx + L, 0.6] }, { p: [vx, 0.6, vx + L * Math.cos(deg * Math.PI / 180), 0.6 + L * Math.sin(deg * Math.PI / 180)] }];
        const LA = longA ? 6 : 2.5, LB = longA ? 2.5 : 6, bx = LA + 2;
        return {
          story: `Угол A равен ${dA}°, его стороны по ${longA ? p : q} см. Угол B равен ${dB}°, его стороны по ${longA ? q : p} см.`,
          question: 'Какой угол больше?', accept: 'choice', choices: ['угол A', 'угол B', 'они равны'], answer: right,
          figure: { type: 'grid56', w: bx + LB + 1, h: 6.6, grid: false, desc: `угол A ${dA}° с ${longA ? 'длинными' : 'короткими'} сторонами и угол B ${dB}° с ${longA ? 'короткими' : 'длинными'} сторонами`,
            segs: [...draw(0.5, dA, LA), ...draw(bx, dB, LB)], arcs: [{ x: 0.5, y: 0.6, r: 16, a1: 0, a2: dA }, { x: bx, y: 0.6, r: 16, a1: 0, a2: dB }],
            pts: [{ x: 0.5, y: 0.6, label: 'A', dx: -10, dy: 14 }, { x: bx, y: 0.6, label: 'B', dx: -10, dy: 14 }] },
          hints: ['Что показывает величина угла — длину сторон или то, насколько они разведены?', `Сравни градусы: ${dA}° и ${dB}°.`],
          solution: `Длина сторон не важна. ${dA === dB ? `${dA}° = ${dB}° — углы равны.` : `${Math.max(dA, dB)}° > ${Math.min(dA, dB)}°, больше ${right}.`}`,
          wrongs: wc(right, { 'longer-sides-bigger': longA ? 'угол A' : 'угол B' }),
          data: { kind, dA, dB },
        };
      },
      verify(task) {
        const d = task.data;
        if (d.kind === 'measure') return isAns(task, d.side === 'right' ? d.th : 180 - d.th); // читаем шкалу, где OA стоит на нуле
        if (d.kind === 'classify') { const g = d.deg; return task.answer === (g === 180 ? 'развёрнутый' : g > 90 ? 'тупой' : g === 90 ? 'прямой' : 'острый'); }
        if (d.kind === 'magnify') return isAns(task, d.deg);
        return task.answer === (d.dA > d.dB ? 'угол A' : d.dB > d.dA ? 'угол B' : 'они равны');
      },
    },

    {
      id: 'g-perimeter', strand: SG, grade: 5, short: 'Периметр', title: 'Периметр прямоугольника и квадрата',
      frp: ['Длина ломаной, периметр многоугольника', 'Использование свойств сторон и углов прямоугольника, квадрата'],
      goal: 'Находить периметр как длину забора вокруг фигуры: сумму всех сторон. Решать обратную задачу.',
      requires: ['g5-segments'],
      explain: {
        model: 'Огород 6 м на 4 м. Чтобы поставить вокруг забор, надо пройти все четыре стороны: 6 + 4 + 6 + 4 = 20 м. Это и есть периметр — длина пути вокруг фигуры.',
        figure: { type: 'rect', a: 6, b: 4, la: '6 м', lb: '4 м' },
        figureCaption: 'Обойди огород по краю: 6 + 4 + 6 + 4 = 20 м',
        rule: '<ul class="rule-list"><li><b>Периметр</b> — сумма длин всех сторон.</li><li>Прямоугольник: P = (a + b) · 2 — у него две пары одинаковых сторон.</li><li>Квадрат: P = a · 4 — все четыре стороны равны.</li><li>Обратная задача: длина и ширина вместе — это половина периметра. Ширина = P : 2 − длина.</li></ul>',
        examples: [
          { q: 'Прямоугольник 7 см на 3 см. Найди периметр.', fig: { type: 'rect', a: 7, b: 3, la: '7 см', lb: '3 см' },
            choices: ['20 см', '10 см', '21 см'], correct: 0, wrong: { 1: 'half-perimeter', 2: 'area-not-perimeter' },
            steps: ['Длина и ширина вместе: 7 + 3 = 10 см — это только половина пути.', 'Таких пар две: 10 · 2 = 20 см.'] },
          { q: 'У квадрата сторона 5 см. Найди периметр.', fig: { type: 'rect', a: 5, b: 5, la: '5 см', lb: '5 см' },
            choices: ['20 см', '10 см', '25 см'], correct: 0, wrong: { 1: 'square-two-sides', 2: 'area-not-perimeter' },
            steps: ['У квадрата 4 равные стороны.', '5 · 4 = 20 см.'] },
        ],
      },
      mistakes: [
        { id: 'half-perimeter', title: 'Сложил только длину и ширину', kidName: 'Полпути',
          kidRule: 'ты складываешь только длину и ширину — две стороны из четырёх',
          say: 'Ты прошёл только половину пути: длина и ширина — это две стороны из четырёх. Обойди фигуру целиком.',
          fixIdea: 'У прямоугольника две длины и две ширины: P = (a + b) · 2.',
          explainOptions: ['Сторон четыре: длину и ширину надо взять по два раза', 'Периметр — это длина плюс ширина', 'Периметр — это длина, умноженная на ширину'],
          conflicts: [{ text: 'Комната 5 м на 3 м. По твоему правилу плинтуса вокруг нужно 5 + 3 = 8 м. Но 8 м хватит только на одну длинную и одну короткую стену, а стен четыре.', ask: 'Хватит 8 м плинтуса на всю комнату?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 5 + 3 < 2 * (5 + 3) }] },
        { id: 'area-not-perimeter', title: 'Умножил стороны — это площадь, а не периметр', kidName: 'Умножайка',
          kidRule: 'ты умножаешь стороны, когда нужна длина пути вокруг фигуры',
          say: 'Умножение сторон даёт площадь — сколько клеток внутри. Периметр — длина забора вокруг, стороны складывают.',
          fixIdea: 'Периметр — это длина края: стороны складывают, а не умножают.',
          explainOptions: ['Периметр — длина края, его получают сложением сторон', 'Периметр всегда равен площади', 'Стороны надо умножить и разделить на 2'],
          conflicts: [{ text: 'Полоска 10 см на 1 см. По твоему правилу её периметр 10 · 1 = 10 см. А ведь только две длинные стороны полоски вместе уже 20 см.', ask: 'Может периметр быть меньше двух сторон фигуры?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 10 * 1 < 10 + 10 }] },
        { id: 'square-two-sides', title: 'У квадрата посчитал две стороны вместо четырёх', kidName: 'Двухсторонник',
          kidRule: 'ты считаешь у квадрата только две стороны',
          say: 'У квадрата четыре стороны, все равные. Сосчитай каждую.',
          fixIdea: 'Квадрат — четыре равные стороны: P = a · 4.',
          explainOptions: ['У квадрата четыре равные стороны, а не две', 'У квадрата две стороны', 'Периметр квадрата — сторона, умноженная на сторону'],
          conflicts: [{ text: 'Квадрат со стороной 3 см. По твоему правилу его периметр 3 · 2 = 6 см. Обведи квадрат пальцем: сколько сторон ты прошёл?', ask: 'Сколько сторон у квадрата?', choices: ['2', '4'], right: '4', verify: () => 3 * 4 !== 3 * 2 }] },
      ],
      generate(lv) {
        const kind = lv === 1 ? pick(['rect', 'rect', 'square']) : pick(['rect', 'rect', 'square', 'back', 'sqback']);
        const max = L3(lv, 9, 15, 40);
        if (kind === 'square' || kind === 'sqback') {
          const a = rnd(2, max), P = 4 * a;
          if (kind === 'square') {
            const C = pick([
              ['м', `Квадратная площадка со стороной ${a} м.`, 'Найди её периметр (в м).'],
              ['см', `Квадратную салфетку со стороной ${a} см обшивают тесьмой по краю.`, 'Сколько сантиметров тесьмы нужно?'],
              ['дм', `Квадратный стол со стороной ${a} дм.`, 'Найди периметр столешницы (в дм).'],
            ]);
            return {
              story: C[1], question: C[2], placeholder: C[0],
              figure: { type: 'rect', a, b: a, la: `${a} ${C[0]}`, lb: `${a} ${C[0]}`, grid: false }, answer: ans(P),
              hints: ['Сколько сторон у квадрата и какие они?', `4 стороны по ${a} ${C[0]}.`],
              solution: `P = ${a} · 4 = ${P} ${C[0]}.`,
              wrongs: wr(P, { 'square-two-sides': 2 * a, 'area-not-perimeter': a * a }),
              data: { kind, a },
            };
          }
          const C = pick([
            ['см', `Из проволоки длиной ${P} см согнули квадрат.`, 'Какая у квадрата сторона (в см)?'],
            ['м', `Периметр квадратной клумбы — ${P} м.`, 'Найди сторону клумбы (в м).'],
            ['дм', `Квадратную рамку обклеили по краю лентой длиной ${P} дм.`, 'Какая у рамки сторона (в дм)?'],
          ]);
          return {
            story: C[1], question: C[2], placeholder: C[0],
            figure: { type: 'rect', a, b: a, la: `? ${C[0]}`, lb: '', grid: false }, answer: ans(a),
            hints: ['Сколько равных сторон у квадрата?', `Периметр — 4 равные стороны: ${P} : 4.`],
            solution: `a = ${P} : 4 = ${a} ${C[0]}.`,
            wrongs: wr(a, { 'square-two-sides': P / 2 }),
            data: { kind, P },
          };
        }
        let a, b; do { a = rnd(2, max); b = rnd(1, max); } while (a === b);
        if (a < b) [a, b] = [b, a];
        const P = 2 * (a + b);
        if (kind === 'back') {
          const C = pick([
            ['м', `Периметр прямоугольного участка — ${P} м, его длина — ${a} м.`, 'Найди ширину участка (в м).'],
            ['см', `На прямоугольную рамку ушло ${P} см багета. Длина рамки — ${a} см.`, 'Какая у рамки ширина (в см)?'],
            ['дм', `Периметр прямоугольника — ${P} дм, одна его сторона — ${a} дм.`, 'Найди соседнюю сторону (в дм).'],
          ]);
          return {
            story: C[1], question: C[2], placeholder: C[0],
            figure: { type: 'rect', a, b, la: `${a} ${C[0]}`, lb: `? ${C[0]}`, grid: false }, answer: ans(b),
            hints: ['Периметр — это две длины и две ширины. Сколько приходится на одну длину и одну ширину вместе?', `Половина периметра: ${P} : 2 = ${P / 2}. Вычти длину.`],
            solution: `${P} : 2 = ${P / 2} — это длина и ширина вместе; ${P / 2} − ${a} = ${b} ${C[0]}.`,
            wrongs: wr(b, { 'half-perimeter': P - a, 'area-not-perimeter': P % a === 0 ? P / a : null }),
            data: { kind, P, a },
          };
        }
        const C = pick([
          ['м', `Огород имеет форму прямоугольника ${a} м на ${b} м. Вокруг ставят забор.`, 'Сколько метров забора нужно?', true],
          ['см', `Фотография — прямоугольник ${a} см на ${b} см. По краю наклеивают ленту.`, 'Сколько сантиметров ленты нужно?', true],
          ['м', `Комната — прямоугольник ${a} м на ${b} м. Вдоль всех стен кладут плинтус (про дверь забудем).`, 'Сколько метров плинтуса нужно?', a <= 9],
          ['дм', `Прямоугольник со сторонами ${a} дм и ${b} дм.`, 'Найди его периметр (в дм).', true],
        ].filter(c => c[3]));
        return {
          story: C[1], question: C[2], placeholder: C[0],
          figure: { type: 'rect', a, b, la: `${a} ${C[0]}`, lb: `${b} ${C[0]}`, grid: false }, answer: ans(P),
          hints: ['Сколько сторон надо обойти?', `Две стороны по ${a} и две по ${b}: (${a} + ${b}) · 2.`],
          solution: `P = (${a} + ${b}) · 2 = ${P} ${C[0]}.`,
          wrongs: wr(P, { 'half-perimeter': a + b, 'area-not-perimeter': a * b }),
          data: { kind, a, b },
        };
      },
      verify(task) {
        const d = task.data, x = Number(task.answer);
        if (d.kind === 'rect') return same(x, d.a + d.b + d.a + d.b);
        if (d.kind === 'square') return same(x, d.a + d.a + d.a + d.a);
        if (d.kind === 'back') return x > 0 && same(d.a + x + d.a + x, d.P);
        return same(x * 4, d.P);
      },
    },

    {
      id: 'g-area', strand: SG, grade: 5, short: 'Площадь', title: 'Площадь прямоугольника и квадрата',
      frp: ['Площадь прямоугольника и многоугольников, составленных из прямоугольников', 'Единицы измерения площади'],
      goal: 'Находить площадь как число единичных квадратиков внутри фигуры, переводить квадратные единицы и решать обратную задачу.',
      requires: ['g-perimeter'],
      explain: {
        model: 'Пол в комнате выложили плиткой 1 × 1 м: 3 ряда по 5 плиток. Всего 5 · 3 = 15 плиток — площадь пола 15 м². Площадь — сколько квадратиков помещается внутри, а не длина края.',
        figure: { type: 'rect', a: 5, b: 3, la: '5 м', lb: '3 м' },
        figureCaption: '3 ряда по 5 клеток: 5 · 3 = 15 м²',
        rule: '<ul class="rule-list"><li>Прямоугольник: <b>S = a · b</b> (длина · ширина).</li><li>Квадрат: <b>S = a · a</b>.</li><li>Площадь меряют в <b>квадратных</b> единицах: см², дм², м². 1 дм² = 10 · 10 = 100 см², 1 м² = 100 дм².</li><li>Известны площадь и одна сторона — другая сторона = S : a.</li></ul>',
        examples: [
          { q: 'Прямоугольник 6 см на 4 см. Найди площадь.', fig: { type: 'rect', a: 6, b: 4, la: '6 см', lb: '4 см' },
            choices: ['24 см²', '20 см²', '10 см²'], correct: 0, wrong: { 1: 'perimeter-not-area', 2: 'sum-sides' },
            steps: ['4 ряда по 6 клеток.', '6 · 4 = 24 см².'] },
          { q: 'Сколько квадратных сантиметров в 1 дм²?', fig: { type: 'rect', a: 10, b: 10, la: '10 см', lb: '10 см' },
            choices: ['100', '10'], correct: 0, wrong: { 1: 'units-linear' },
            steps: ['1 дм² — квадрат 10 см на 10 см.', 'Внутри 10 рядов по 10 клеток: 100 см².'] },
        ],
      },
      mistakes: [
        { id: 'perimeter-not-area', title: 'Нашёл периметр вместо площади', kidName: 'Обходчик',
          kidRule: 'ты считаешь длину края фигуры, когда спрашивают, сколько места внутри',
          say: 'Ты сложил стороны — это длина края. Площадь — сколько клеток внутри: рядов столько-то, в каждом по столько-то. У квадрата сторона · 4 — тоже периметр, а площадь — сторона · сторона.',
          fixIdea: 'Площадь — сколько квадратиков внутри: длину умножают на ширину.',
          explainOptions: ['Это длина края (периметр), а площадь — число клеток внутри', 'Площадь и периметр — одно и то же', 'Площадь — это сумма всех сторон'],
          conflicts: [{ text: 'Полоска 4 см на 1 см — в ней ровно 4 клетки по 1 см². По твоему правилу её площадь (4 + 1) · 2 = 10 см² — десять клеток там, где их четыре.', ask: 'Сколько клеток в полоске?', choices: ['4', '10'], right: '4', verify: () => 4 * 1 === 4 && 2 * (4 + 1) === 10, figure: { type: 'rect', a: 4, b: 1, la: '4 см', lb: '1 см' } }] },
        { id: 'sum-sides', title: 'Сложил длину и ширину', kidName: 'Складушка',
          kidRule: 'ты складываешь длину и ширину, когда нужна площадь',
          say: 'Сумма сторон — это даже не периметр, а его половина. Площадь — произведение: ряды умножь на клетки в ряду.',
          fixIdea: 'Площадь — это ряды клеток: число рядов умножь на число клеток в ряду.',
          explainOptions: ['Клетки идут рядами, поэтому длину умножают на ширину', 'Площадь — это длина плюс ширина', 'Площадь — это сумма всех четырёх сторон'],
          conflicts: [{ text: 'Прямоугольник 3 см на 2 см: на рисунке 2 ряда по 3 клетки. По твоему правилу площадь 3 + 2 = 5 см². Посчитай клетки сам.', ask: 'Сколько клеток на рисунке?', choices: ['5', '6'], right: '6', verify: () => 3 * 2 === 6, figure: { type: 'rect', a: 3, b: 2, la: '3 см', lb: '2 см' } }] },
        { id: 'units-linear', title: 'Переводит квадратные единицы как обычные (×10)', kidName: 'Плоскоед',
          kidRule: 'ты переводишь квадратные единицы, как обычные: умножаешь на 10',
          say: '1 дм = 10 см, но 1 дм² — это квадрат 10 на 10 клеток, то есть 100 см². В квадратных единицах множитель 100.',
          fixIdea: 'Квадратная единица — квадрат 10 × 10 меньших клеток: 1 дм² = 100 см², 1 м² = 100 дм².',
          explainOptions: ['В квадрате 10 рядов по 10 клеток — множитель 100, а не 10', 'Квадратные единицы переводят, как обычные: на 10', 'В 1 дм² — 1000 см²'],
          conflicts: [{ text: '1 дм² — квадрат 10 см на 10 см. По твоему правилу в нём 10 см² — это только один ряд клеток, а рядов 10.', ask: 'Сколько см² в 1 дм²?', choices: ['10', '100'], right: '100', verify: () => 10 * 10 === 100, figure: { type: 'rect', a: 10, b: 10, la: '10 см', lb: '10 см' } }],
          root: 't5-units' },
        { id: 'reverse-subtract', title: 'В обратной задаче вычел вместо деления', kidName: 'Вычиталка',
          kidRule: 'ты вычитаешь длину из площади, чтобы найти ширину',
          say: 'Площадь = длина · ширина. Чтобы найти ширину, площадь надо разделить на длину, а не вычесть.',
          fixIdea: 'Неизвестный множитель находят делением: ширина = S : длину.',
          explainOptions: ['Площадь — произведение сторон, значит, нужна не разность, а деление', 'Ширина = площадь − длина', 'Ширина = площадь + длина'],
          conflicts: [{ text: 'Площадь прямоугольника 12 м², длина 4 м. По твоему правилу ширина 12 − 4 = 8 м. Проверь: 4 · 8 = 32 м², а не 12.', ask: 'Подходит ширина 8 м?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 4 * 8 !== 12 && 12 / 4 === 3 }],
          root: 'f4-table' },
      ],
      generate(lv) {
        const max = L3(lv, 9, 12, 25);
        const kind = lv === 1 ? pick(['rect', 'rect', 'square']) : pick(['rect', 'rect', 'square', 'back', 'units']);
        if (kind === 'square') {
          const a = rnd(2, Math.min(max, 20)), S = a * a;
          const C = pick([['см', `Квадрат со стороной ${a} см.`, 'Найди его площадь (в см²).'], ['дм', `Квадратная плитка со стороной ${a} дм.`, 'Какая у неё площадь (в дм²)?'], ['м', `Квадратная клумба со стороной ${a} м.`, 'Найди её площадь (в м²).']]);
          return {
            story: C[1], question: C[2], placeholder: `${C[0]}²`,
            figure: { type: 'rect', a, b: a, la: `${a} ${C[0]}`, lb: `${a} ${C[0]}` }, answer: ans(S),
            hints: ['Сколько рядов клеток и сколько клеток в ряду?', `${a} ${pl(a, 'ряд', 'ряда', 'рядов')} по ${a} ${pl(a, 'клетке', 'клетки', 'клеток')}: ${a} · ${a}.`],
            solution: `S = ${a} · ${a} = ${S} ${C[0]}².`,
            wrongs: wr(S, { 'perimeter-not-area': 4 * a, 'sum-sides': 2 * a }),
            data: { kind, a, b: a },
          };
        }
        if (kind === 'units') {
          const k = rnd(2, L3(lv, 9, 9, 40)), x = 100 * k;
          const C = pick([
            [`Плитка имеет площадь ${k} дм².`, 'Сколько это квадратных сантиметров?', 'см', 'см²'],
            [`Картина занимает на стене ${k} дм².`, 'Сколько это квадратных сантиметров?', 'см', 'см²'],
            [`Площадь коврика — ${k} м².`, 'Сколько это квадратных дециметров?', 'дм', 'дм²'],
          ]);
          return {
            story: C[0], question: C[1], placeholder: C[3],
            figure: { type: 'rect', a: 10, b: 10, la: `10 ${C[2]}`, lb: `10 ${C[2]}` }, answer: ans(x),
            hints: [`Сколько ${C[3]} в одной большой квадратной единице? Посмотри на квадрат 10 на 10.`, `В ней 10 рядов по 10 клеток — 100 ${C[3]}. А больших единиц ${k}.`],
            solution: `1 ${C[2] === 'см' ? 'дм²' : 'м²'} = 10 · 10 = 100 ${C[3]}; ${k} · 100 = ${x} ${C[3]}.`,
            wrongs: wr(x, { 'units-linear': 10 * k }),
            data: { kind, k },
          };
        }
        let a, b; do { a = rnd(2, max); b = rnd(2, max); } while (a === b);
        if (a < b) [a, b] = [b, a];
        if (kind === 'back') {
          const S = a * b;
          const C = pick([
            ['м', `Площадь прямоугольной клумбы — ${S} м², её длина — ${a} м.`, 'Какая у клумбы ширина (в м)?'],
            ['дм', `Ковёр площадью ${S} дм² имеет длину ${a} дм.`, 'Какая у ковра ширина (в дм)?'],
            ['см', `Прямоугольный лист бумаги площадью ${S} см² имеет длину ${a} см.`, 'Найди его ширину (в см).'],
          ]);
          return {
            story: C[1], question: C[2], placeholder: C[0],
            figure: { type: 'rect', a, b, la: `${a} ${C[0]}`, lb: `? ${C[0]}` }, answer: ans(b),
            hints: ['Площадь — это длина · ширина. Какое число на что умножили?', `${a} · ? = ${S}. Раздели ${S} на ${a}.`],
            solution: `${S} : ${a} = ${b} ${C[0]}. Проверка: ${a} · ${b} = ${S}.`,
            wrongs: wr(b, { 'reverse-subtract': S - a }),
            data: { kind, S, a },
          };
        }
        const S = a * b;
        const C = pick([
          ['м', `Комната ${a} м на ${b} м. Пол хотят застелить ковролином.`, 'Сколько квадратных метров ковролина нужно?', a <= 9],
          ['см', `Прямоугольник ${a} см на ${b} см.`, 'Найди его площадь (в см²).', true],
          ['см', `Шоколадка — прямоугольник из долек: ${a} в длину и ${b} в ширину, каждая долька — квадратик 1 см на 1 см.`, 'Найди площадь шоколадки (в см²).', a <= 12],
          ['м', `Грядка — прямоугольник ${a} м на ${b} м.`, 'Найди площадь грядки (в м²).', true],
        ].filter(c => c[3]));
        return {
          story: C[1], question: C[2], placeholder: `${C[0]}²`,
          figure: { type: 'rect', a, b, la: `${a} ${C[0]}`, lb: `${b} ${C[0]}` }, answer: ans(S),
          hints: ['Сколько рядов клеток и сколько клеток в каждом ряду?', `${b} ${pl(b, 'ряд', 'ряда', 'рядов')} по ${a}: ${a} · ${b}.`],
          solution: `S = ${a} · ${b} = ${S} ${C[0]}².`,
          wrongs: wr(S, { 'perimeter-not-area': 2 * (a + b), 'sum-sides': a + b }),
          data: { kind, a, b },
        };
      },
      verify(task) {
        const d = task.data, x = Number(task.answer);
        if (d.kind === 'rect' || d.kind === 'square') return same(x, countCells(d.a, d.b, () => true));
        if (d.kind === 'units') return same(x / d.k, countCells(10, 10, () => true));
        return x > 0 && same(d.a * x, d.S);
      },
    },

    {
      id: 'g5-composite', strand: SG, grade: 5, short: 'Сложные фигуры', title: 'Площадь фигур из прямоугольников',
      frp: ['Площадь прямоугольника и многоугольников, составленных из прямоугольников, в том числе фигур, изображённых на клетчатой бумаге'],
      goal: 'Находить площадь фигуры, разрезая её на прямоугольники или достраивая до прямоугольника и вычитая лишнее.',
      requires: ['g-area'],
      explain: {
        model: 'Комната в форме буквы Г: одной формулой S = a · b её не измерить. Зато её можно разрезать на два прямоугольника, найти площадь каждого и сложить. Или достроить до большого прямоугольника и вычесть лишний угол — ответ получится тот же.',
        figure: lFig(8, 6, 3, 2, false, true),
        figureCaption: 'Дострой до прямоугольника 8 × 6 и вычти угол 3 × 2: 48 − 6 = 42',
        rule: '<ul class="rule-list"><li><b>Разрежь</b> фигуру на прямоугольники, которые не перекрываются, и <b>сложи</b> их площади.</li><li>Или <b>дострой</b> до большого прямоугольника и <b>вычти</b> площадь лишнего куска.</li><li>Если два прямоугольника лежат внахлёст, их общая часть посчитана дважды — один раз её надо вычесть.</li><li>Площадь рамки = площадь всего прямоугольника − площадь окошка. Вычитают <b>площади</b>, а не стороны.</li></ul>',
        examples: [
          { q: 'Найди площадь фигуры на рисунке: прямоугольник 8 × 6 без угла 3 × 2.', fig: lFig(8, 6, 3, 2, false, true),
            choices: ['42', '28', '62'], correct: 0, wrong: { 1: 'add-sides', 2: 'double-overlap' },
            steps: ['Нижний прямоугольник: 8 · 4 = 32.', 'Над ним слева кусок 5 · 2 = 10.', '32 + 10 = 42. Проверка: 8 · 6 − 3 · 2 = 48 − 6 = 42.'] },
          { q: 'Фото 10 × 15 см вставили в рамку 14 × 19 см. Найди площадь самой рамки.',
            choices: ['116 см²', '16 см²'], correct: 0, wrong: { 1: 'wrong-subtract' },
            steps: ['Вся рамка вместе с фото: 14 · 19 = 266 см².', 'Фото: 10 · 15 = 150 см².', 'Рамка: 266 − 150 = 116 см².'] },
        ],
      },
      mistakes: [
        { id: 'add-sides', title: 'Складывает стороны фигуры вместо площадей', kidName: 'Обводилка',
          kidRule: 'ты складываешь все стороны фигуры, а это длина её края',
          say: 'Сумма сторон — это периметр, длина края. Площадь — сколько клеток внутри: разрежь фигуру на прямоугольники и сложи их площади.',
          fixIdea: 'Площадь сложной фигуры — сумма площадей прямоугольников, из которых она состоит.',
          explainOptions: ['Сумма сторон — это периметр, а нужна площадь', 'Площадь любой фигуры — сумма её сторон', 'Стороны надо было перемножить все подряд'],
          conflicts: [{ text: 'Квадрат 1 см на 1 см — это одна клетка, 1 см². По твоему правилу (сложить стороны) его площадь 1 + 1 + 1 + 1 = 4 см² — четыре клетки там, где одна.', ask: 'Сколько клеток в квадрате 1 на 1?', choices: ['1', '4'], right: '1', verify: () => 1 * 1 === 1 && 1 + 1 + 1 + 1 === 4 }],
          root: 'g-area' },
        { id: 'double-overlap', title: 'Считает общий кусок дважды', kidName: 'Двойняшка',
          kidRule: 'ты складываешь площади кусков, которые перекрываются, и общая часть попадает в сумму два раза',
          say: 'Куски перекрываются: общая часть вошла в обе площади. Её надо посчитать один раз — либо режь фигуру без нахлёста, либо вычти общий кусок.',
          fixIdea: 'Каждая клетка фигуры считается ровно один раз: общий кусок вычти.',
          explainOptions: ['Общая часть посчитана два раза — её надо вычесть один раз', 'При нахлёсте площади просто складывают', 'Общую часть надо прибавить ещё раз'],
          conflicts: [{ text: 'Два листа 2 × 2 дм положили так, что они совпали целиком. Видно один лист — 4 дм². По твоему правилу они закрывают 4 + 4 = 8 дм².', ask: 'Какую площадь закрывают совпавшие листы?', choices: ['4 дм²', '8 дм²'], right: '4 дм²', verify: () => 2 * 2 === 4 && 4 + 4 === 8 }] },
        { id: 'wrong-subtract', title: 'Вычитает стороны, а не площади', kidName: 'Обрезалка',
          kidRule: 'ты сначала вычитаешь стороны окошка из сторон рамки и только потом умножаешь',
          say: 'Сначала найди площадь всего прямоугольника и площадь окошка, а потом вычти одну площадь из другой.',
          fixIdea: 'Вычитают площади: S = (большой прямоугольник) − (вырезанный кусок).',
          explainOptions: ['Вычитать надо площади, а не стороны', 'Стороны вычитают, потом умножают — так всегда верно', 'Площади надо сложить'],
          conflicts: [{ text: 'Из листа 10 × 10 см вырезали окошко 1 × 1 см — пропала одна клетка, осталось 100 − 1 = 99 см². По твоему правилу (10 − 1) · (10 − 1) = 81 см² — будто вырезали 19 клеток.', ask: 'Сколько см² картона осталось?', choices: ['81', '99'], right: '99', verify: () => 10 * 10 - 1 * 1 === 99 && 9 * 9 === 81 }],
          root: 'n5-order' },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['L', 'L', 'hole'], ['L', 'hole', 'overlap'], ['L', 'hole', 'overlap']));
        if (kind === 'L') {
          const big = L3(lv, 7, 10, 15);
          const W = rnd(4, big), Ht = rnd(3, Math.min(big, 10)), cw = rnd(1, W - 2), ch = rnd(1, Ht - 1), flip = Math.random() < 0.5;
          const S = W * Ht - cw * ch, grid = W <= 12 && Ht <= 10;
          const C = pick([
            ['м', 'План комнаты показан на рисунке, размеры — в метрах.', 'Найди площадь пола (в м²).'],
            ['м', 'Участок земли имеет форму, как на рисунке (размеры в метрах).', 'Какая площадь участка (в м²)?'],
            ['см', 'Фигуру вырезали из бумаги, размеры на рисунке — в сантиметрах.', 'Найди её площадь (в см²).'],
            ['дм', 'Столешница углового стола показана на рисунке, размеры — в дециметрах.', 'Какая площадь столешницы (в дм²)?'],
          ]);
          return {
            story: C[1], question: C[2], placeholder: `${C[0]}²`,
            figure: lFig(W, Ht, cw, ch, flip, grid), answer: ans(S),
            hints: ['Разрежь фигуру на два прямоугольника, которые не перекрываются. Или дострой её до большого прямоугольника и вычти лишний угол.', `Большой прямоугольник ${W} × ${Ht}, лишний угол ${cw} × ${ch}.`],
            solution: `${W} · ${Ht} − ${cw} · ${ch} = ${W * Ht} − ${cw * ch} = ${S} ${C[0]}². По частям: ${W} · ${Ht - ch} + ${W - cw} · ${ch} = ${W * (Ht - ch)} + ${(W - cw) * ch} = ${S}.`,
            wrongs: wr(S, { 'add-sides': 2 * (W + Ht), 'double-overlap': W * (Ht - ch) + (W - cw) * Ht }),
            data: { kind, W, H: Ht, cw, ch },
          };
        }
        if (kind === 'hole') {
          const w = rnd(...L3(lv, [1, 4], [2, 8], [4, 15])), h = rnd(...L3(lv, [1, 4], [2, 8], [4, 15]));
          const m1 = rnd(1, L3(lv, 2, 3, 4)), m2 = rnd(1, L3(lv, 2, 3, 4)), W = w + 2 * m1, Ht = h + 2 * m2, S = W * Ht - w * h;
          const C = pick([
            ['см', `Фотографию ${w} × ${h} см вставили в рамку размером ${W} × ${Ht} см.`, 'Найди площадь самой рамки (в см²).'],
            ['м', `Вокруг прямоугольного бассейна ${w} × ${h} м посеяли газон. Вместе с бассейном это прямоугольник ${W} × ${Ht} м.`, 'Какая площадь газона (в м²)?'],
            ['см', `Из листа картона ${W} × ${Ht} см вырезали прямоугольное окошко ${w} × ${h} см.`, 'Сколько квадратных сантиметров картона осталось?'],
          ]);
          const grid = W <= 12 && Ht <= 12;
          return {
            story: C[1], question: C[2], placeholder: `${C[0]}²`,
            figure: { type: 'grid56', w: W, h: Ht, grid, desc: `прямоугольник ${W} на ${Ht}, внутри вырезан прямоугольник ${w} на ${h}`,
              polys: [{ pts: [[0, 0], [W, 0], [W, Ht], [0, Ht]], hole: [[m1, m2], [m1 + w, m2], [m1 + w, m2 + h], [m1, m2 + h]], fill: true }],
              texts: [{ x: W / 2, y: 0, dy: 18, t: String(W) }, { x: 0, y: Ht / 2, dx: -8, a: 'end', t: String(Ht) }, { x: m1 + w / 2, y: m2 + h / 2, t: `${w} × ${h}` }] },
            answer: ans(S),
            hints: ['Найди площадь всего большого прямоугольника и площадь окошка.', `${W} · ${Ht} = ${W * Ht} и ${w} · ${h} = ${w * h}. Что дальше?`],
            solution: `${W} · ${Ht} − ${w} · ${h} = ${W * Ht} − ${w * h} = ${S} ${C[0]}².`,
            wrongs: wr(S, { 'wrong-subtract': (W - w) * (Ht - h) }),
            data: { kind, W, H: Ht, w, h, m1, m2 },
          };
        }
        // overlap: два прямоугольника внахлёст
        let a1, b1, a2, b2, ox, oy;
        do {
          a1 = rnd(...L3(lv, [3, 6], [3, 8], [4, 12])); b1 = rnd(...L3(lv, [2, 5], [2, 7], [3, 10]));
          a2 = rnd(...L3(lv, [3, 6], [3, 8], [4, 12])); b2 = rnd(...L3(lv, [2, 5], [2, 7], [3, 10]));
          ox = rnd(1, Math.min(a1, a2) - 1); oy = rnd(1, Math.min(b1, b2) - 1);
        } while (a1 + a2 - ox > 18 || b1 + b2 - oy > 14);
        const S = a1 * b1 + a2 * b2 - ox * oy, Wt = a1 + a2 - ox, Ht = b1 + b2 - oy;
        const C = pick([
          ['дм', `Два прямоугольных коврика ${a1} × ${b1} дм и ${a2} × ${b2} дм лежат на полу внахлёст: они перекрываются по прямоугольнику ${ox} × ${oy} дм.`, 'Какую площадь пола закрывают коврики (в дм²)?'],
          ['см', `Две наклейки ${a1} × ${b1} см и ${a2} × ${b2} см наклеили так, что одна заходит на другую: общая часть — прямоугольник ${ox} × ${oy} см.`, 'Какую площадь обложки они закрывают (в см²)?'],
          ['см', `Два листа бумаги ${a1} × ${b1} см и ${a2} × ${b2} см положили на стол внахлёст, общая часть — ${ox} × ${oy} см.`, 'Какую площадь стола закрывают листы (в см²)?'],
        ]);
        return {
          story: C[1], question: C[2], placeholder: `${C[0]}²`,
          figure: { type: 'grid56', w: Wt, h: Ht, grid: Wt <= 14 && Ht <= 12, desc: `два прямоугольника ${a1} на ${b1} и ${a2} на ${b2}, перекрываются по прямоугольнику ${ox} на ${oy}`,
            polys: [{ pts: [[0, 0], [a1, 0], [a1, b1], [0, b1]], fill: true }, { pts: [[a1 - ox, b1 - oy], [Wt, b1 - oy], [Wt, Ht], [a1 - ox, Ht]], fill: true }] },
          answer: ans(S),
          hints: ['Сложи площади двух прямоугольников. Какой кусок при этом попал в сумму дважды?', `${a1} · ${b1} + ${a2} · ${b2} = ${a1 * b1 + a2 * b2}, а общая часть ${ox} · ${oy} = ${ox * oy} посчитана два раза.`],
          solution: `${a1 * b1} + ${a2 * b2} − ${ox * oy} = ${S} ${C[0]}².`,
          wrongs: wr(S, { 'double-overlap': a1 * b1 + a2 * b2 }),
          data: { kind, a1, b1, a2, b2, ox, oy },
        };
      },
      verify(task) {
        const d = task.data;
        if (d.kind === 'L') return isAns(task, countCells(d.W, d.H, (i, j) => !(i >= d.W - d.cw && j >= d.H - d.ch)));
        if (d.kind === 'hole') return isAns(task, countCells(d.W, d.H, (i, j) => !(i >= d.m1 && i < d.m1 + d.w && j >= d.m2 && j < d.m2 + d.h)));
        const Wt = d.a1 + d.a2 - d.ox, Ht = d.b1 + d.b2 - d.oy;
        return isAns(task, countCells(Wt, Ht, (i, j) => (i < d.a1 && j < d.b1) || (i >= d.a1 - d.ox && j >= d.b1 - d.oy)));
      },
    },

    {
      id: 'g-volume', strand: SG, grade: 5, short: 'Объём', title: 'Объём прямоугольного параллелепипеда и куба',
      frp: ['Объём прямоугольного параллелепипеда, куба. Единицы измерения объёма'],
      goal: 'Находить объём коробки как число единичных кубиков внутри и переводить кубические единицы.',
      requires: ['g-area'],
      explain: {
        model: 'В коробку кладут кубики 1 × 1 × 1 см. Дно 4 на 3 — это 12 кубиков в одном слое. Слоёв 2 — всего 12 · 2 = 24 кубика. Объём коробки — 24 см³.',
        figure: { type: 'box', a: 4, b: 3, c: 2, la: '4 см', lb: '3 см', lc: '2 см' },
        figureCaption: 'Слой из 4 · 3 = 12 кубиков, слоёв 2: всего 24 см³',
        rule: '<ul class="rule-list"><li>Параллелепипед: <b>V = a · b · c</b> (длина · ширина · высота).</li><li>Куб: <b>V = a · a · a</b> — ребро умножают на себя три раза, а не на 3.</li><li>Объём — в <b>кубических</b> единицах. 1 дм³ = 10 · 10 · 10 = 1000 см³ = 1 литр. 1 м³ = 1000 дм³.</li></ul>',
        examples: [
          { q: 'Коробка 5 см на 2 см на 3 см. Найди объём.', fig: { type: 'box', a: 5, b: 2, c: 3, la: '5 см', lb: '2 см', lc: '3 см' },
            choices: ['30 см³', '10 см³', '10 см'], correct: 0, wrong: { 1: 'one-face', 2: 'sum-of-edges' },
            steps: ['Один слой: 5 · 2 = 10 кубиков.', 'Слоёв 3: 10 · 3 = 30 см³.'] },
          { q: 'Ребро куба — 3 см. Найди объём.', fig: { type: 'box', a: 3, b: 3, c: 3, la: '3 см', lb: '3 см', lc: '3 см' },
            choices: ['27 см³', '9 см³'], correct: 0, wrong: { 1: 'cube-times-3' },
            steps: ['Слой: 3 · 3 = 9 кубиков.', 'Три слоя: 9 · 3 = 27 см³.'] },
        ],
      },
      mistakes: [
        { id: 'sum-of-edges', title: 'Сложил измерения вместо умножения', kidName: 'Цепочка',
          kidRule: 'ты складываешь длину, ширину и высоту, будто выкладываешь кубики в одну линию',
          say: 'Сложить — значит выстроить кубики в одну линию. А коробку заполняют слоями: кубики в ряд, ряды в слой, слои друг на друга — это умножение.',
          fixIdea: 'Объём — слои кубиков: длина · ширина · высота.',
          explainOptions: ['Кубики лежат рядами и слоями, поэтому измерения перемножают', 'Объём — это сумма длины, ширины и высоты', 'Объём — это сумма всех рёбер'],
          conflicts: [{ text: 'Коробка 2 × 2 × 2 см. По твоему правилу объём 2 + 2 + 2 = 6 см³. Но только нижний слой — это уже 2 · 2 = 4 кубика, а слоёв два.', ask: 'Сколько кубиков 1 см³ в коробке?', choices: ['6', '8'], right: '8', verify: () => 2 * 2 * 2 === 8 && 2 + 2 + 2 === 6, figure: { type: 'box', a: 2, b: 2, c: 2, la: '2 см', lb: '2 см', lc: '2 см' } }] },
        { id: 'one-face', title: 'Посчитал только один слой (площадь дна)', kidName: 'Донышко',
          kidRule: 'ты считаешь только кубики на дне коробки и забываешь про высоту',
          say: 'Ты заполнил только дно. Сколько таких слоёв поместится в высоту?',
          fixIdea: 'Площадь дна — это один слой. Умножь его на число слоёв, то есть на высоту.',
          explainOptions: ['Это только один слой, а слоёв столько, какова высота', 'Объём равен площади дна', 'Высоту надо прибавить к площади дна'],
          conflicts: [{ text: 'Коробка 3 × 2 × 5 см. По твоему правилу объём 3 · 2 = 6 см³ — это кубики только на дне. А коробка высотой 5 см.', ask: 'Сколько слоёв по 6 кубиков поместится?', choices: ['1', '5'], right: '5', verify: () => 3 * 2 * 5 === 30 }] },
        { id: 'cube-times-3', title: 'Путает куб числа с умножением на 3', kidName: 'Трёшка',
          kidRule: 'ты думаешь, что «в кубе» значит «умножить на 3»',
          say: 'Ребро · 3 — это просто три ребра подряд. Объём куба — ребро · ребро · ребро.',
          fixIdea: 'a³ = a · a · a, а не a · 3.',
          explainOptions: ['Куб числа — это число, умноженное само на себя три раза', 'Куб числа — это число, умноженное на 3', 'Куб числа — это число, умноженное на 2'],
          conflicts: [{ text: 'Куб с ребром 1 см — это ровно один кубик 1 см³. По твоему правилу его объём 1 · 3 = 3 см³ — три кубика в одном.', ask: 'Сколько кубиков 1 см³ в кубе с ребром 1 см?', choices: ['1', '3'], right: '1', verify: () => 1 * 1 * 1 === 1 && 1 * 3 === 3 }],
          root: 'n5-power' },
        { id: 'units-volume', title: 'Переводит кубические единицы как квадратные (×100)', kidName: 'Стокубик',
          kidRule: 'ты переводишь кубические единицы, умножая на 100, как квадратные',
          say: '1 дм³ — куб 10 на 10 на 10 сантиметровых кубиков: в слое 100 кубиков, слоёв 10. Всего 1000 см³, а не 100.',
          fixIdea: 'Кубическая единица — 10 слоёв по 100 кубиков: 1 дм³ = 1000 см³, 1 м³ = 1000 дм³.',
          explainOptions: ['В кубе 10 слоёв по 100 кубиков — множитель 1000', 'Кубические единицы переводят на 100, как квадратные', 'В 1 дм³ — 10 см³'],
          conflicts: [{ text: '1 дм³ — куб 10 × 10 × 10 см. Только нижний слой — это 10 · 10 = 100 кубиков по 1 см³. По твоему правилу во всём кубе тоже 100 см³ — будто слой всего один.', ask: 'Сколько см³ в 1 дм³?', choices: ['100', '1000'], right: '1000', verify: () => 10 ** 3 === 1000 }],
          root: 't5-units' },
      ],
      generate(lv) {
        const max = L3(lv, 5, 9, 15);
        const kind = lv === 1 ? pick(['box', 'box', 'cube']) : pick(['box', 'box', 'cube', 'units', 'liters']);
        if (kind === 'cube') {
          const a = rnd(2, Math.min(max, 10)), V3 = a * a * a;
          const C = pick([['см', `Кубик из конструктора: ребро ${a} см.`, 'Найди его объём (в см³).'], ['дм', `Коробка в форме куба с ребром ${a} дм.`, 'Какой у неё объём (в дм³)?'], ['см', `Кубик льда с ребром ${a} см.`, 'Найди его объём (в см³).']]);
          return {
            story: C[1], question: C[2], placeholder: `${C[0]}³`,
            figure: { type: 'box', a, b: a, c: a, la: `${a} ${C[0]}`, lb: `${a} ${C[0]}`, lc: `${a} ${C[0]}` }, answer: ans(V3),
            hints: ['Сколько кубиков поместится в один слой? А сколько слоёв?', `Слой: ${a} · ${a} = ${a * a}. Слоёв ${a}.`],
            solution: `V = ${a} · ${a} · ${a} = ${V3} ${C[0]}³.`,
            wrongs: wr(V3, { 'cube-times-3': 3 * a, 'one-face': a * a }),
            data: { kind, a, b: a, c: a },
          };
        }
        if (kind === 'units') {
          const k = rnd(2, L3(lv, 9, 9, 25)), x = 1000 * k;
          const C = pick([
            [`Объём аквариума — ${k} дм³.`, 'Сколько это кубических сантиметров?', 'см'],
            [`Объём коробки — ${k} дм³.`, 'Сколько это кубических сантиметров?', 'см'],
            [`Объём кучи песка — ${k} м³.`, 'Сколько это кубических дециметров?', 'дм'],
          ]);
          return {
            story: C[0], question: C[1], placeholder: `${C[2]}³`,
            figure: { type: 'box', a: 10, b: 10, c: 10, la: `10 ${C[2]}`, lb: `10 ${C[2]}`, lc: `10 ${C[2]}` }, answer: ans(x),
            hints: [`Сколько ${C[2]}³ в одной большой кубической единице? Это куб 10 на 10 на 10.`, `Слой — 10 · 10 = 100 кубиков, слоёв 10: 1000 ${C[2]}³. А больших единиц ${k}.`],
            solution: `10 · 10 · 10 = 1000; ${k} · 1000 = ${num(x)} ${C[2]}³.`,
            wrongs: wr(x, { 'units-volume': 100 * k }),
            data: { kind, k },
          };
        }
        let a, b, c; do { a = rnd(2, max); b = rnd(2, max); c = rnd(2, max); } while (a === b && b === c);
        if (a < b) [a, b] = [b, a]; // длина не меньше ширины
        const V3 = a * b * c;
        if (kind === 'liters') {
          return {
            story: `Аквариум имеет длину ${a} дм, ширину ${b} дм и высоту ${c} дм.`, question: 'Сколько литров воды в него помещается? (1 дм³ = 1 л)', placeholder: 'л',
            figure: { type: 'box', a, b, c, la: `${a} дм`, lb: `${b} дм`, lc: `${c} дм` }, answer: ans(V3),
            hints: ['Найди объём аквариума в дм³ — столько же будет литров.', `Слой на дне: ${a} · ${b} = ${a * b} дм³. Слоёв ${c}.`],
            solution: `V = ${a} · ${b} · ${c} = ${V3} дм³ = ${V3} л.`,
            wrongs: wr(V3, { 'sum-of-edges': a + b + c, 'one-face': a * b }),
            data: { kind, a, b, c },
          };
        }
        const C = pick([
          ['дм', `Коробка для обуви: длина ${a} дм, ширина ${b} дм, высота ${c} дм.`, a <= 4 && c <= 3],
          ['см', `Брусок: ${a} см на ${b} см на ${c} см.`, true],
          ['м', `Кузов грузовика: длина ${a} м, ширина ${b} м, высота ${c} м.`, Math.max(a, b, c) <= 8 && Math.min(a, b, c) <= 3],
          ['см', `Коробка конфет: ${a} см в длину, ${b} см в ширину и ${c} см в высоту.`, true],
        ].filter(x => x[2]));
        return {
          story: C[1], question: `Найди объём (в ${C[0]}³).`, placeholder: `${C[0]}³`,
          figure: { type: 'box', a, b, c, la: `${a} ${C[0]}`, lb: `${b} ${C[0]}`, lc: `${c} ${C[0]}` }, answer: ans(V3),
          hints: ['Сколько кубиков поместится в один слой на дне?', `Слой: ${a} · ${b} = ${a * b}. Сколько слоёв в высоту?`],
          solution: `V = ${a} · ${b} · ${c} = ${V3} ${C[0]}³.`,
          wrongs: wr(V3, { 'sum-of-edges': a + b + c, 'one-face': a * b }),
          data: { kind, a, b, c },
        };
      },
      verify(task) {
        const d = task.data;
        if (d.kind === 'units') return isAns(task, d.k * 10 * 10 * 10);
        let layers = 0; for (let z = 0; z < d.c; z++) layers += countCells(d.a, d.b, () => true);
        return isAns(task, layers);
      },
    },

    {
      id: 'g5-nets', strand: SG, grade: 5, short: 'Развёртки', title: 'Многогранники и развёртки',
      frp: ['Наглядные представления о пространственных фигурах: прямоугольный параллелепипед, куб, многогранники', 'Развёртки куба и параллелепипеда'],
      goal: 'Знать, сколько у куба и параллелепипеда граней, рёбер и вершин, и находить площадь поверхности по развёртке.',
      requires: ['g-volume'],
      explain: {
        model: 'Разрежь картонную коробку по рёбрам и разложи на столе — получится развёртка: 6 прямоугольников. Чтобы обклеить коробку бумагой, нужно закрыть все 6 граней, а не только 3, которые видно на картинке.',
        figure: { type: 'net56', a: 4, b: 3, c: 2 },
        figureCaption: 'Развёртка коробки 4 × 3 × 2: три пары одинаковых граней',
        rule: '<ul class="rule-list"><li>У прямоугольного параллелепипеда (и у куба) <b>6 граней, 12 рёбер, 8 вершин</b>.</li><li>Грани идут парами: верх и низ, перед и зад, левая и правая — в каждой паре грани одинаковые.</li><li><b>Площадь поверхности</b> = 2 · (a · b + b · c + a · c). У куба — 6 · a · a.</li><li>Площадь поверхности меряют в см², м², а объём — в см³, м³. Это разные величины.</li></ul>',
        examples: [
          { q: 'Сколько бумаги нужно, чтобы оклеить со всех сторон кубик с ребром 2 см?', fig: { type: 'box', a: 2, b: 2, c: 2, la: '2 см', lb: '2 см', lc: '2 см' },
            choices: ['24 см²', '12 см²', '8 см²'], correct: 0, wrong: { 1: 'three-faces', 2: 'surface-as-volume' },
            steps: ['Одна грань: 2 · 2 = 4 см².', 'Граней у куба 6: 4 · 6 = 24 см².'] },
          { q: 'Сколько рёбер у кубика Рубика?', choices: ['12', '6'], correct: 0, wrong: { 1: 'cube-edges-6' },
            steps: ['4 ребра у верхней грани и 4 у нижней.', 'И ещё 4 вертикальных ребра по бокам.', '4 + 4 + 4 = 12.'] },
        ],
      },
      mistakes: [
        { id: 'three-faces', title: 'Считает только видимые грани (3 вместо 6)', kidName: 'Трёхгранник',
          kidRule: 'ты считаешь только те грани, которые видно на рисунке, — три вместо шести',
          say: 'На рисунке видно три грани, но у коробки есть ещё дно, задняя стенка и вторая боковая. Граней шесть — три пары одинаковых.',
          fixIdea: 'У коробки 6 граней: каждую видимую грань возьми дважды.',
          explainOptions: ['Невидимых граней тоже три — всего шесть', 'У коробки три грани', 'Грани считают только сверху'],
          conflicts: [{ text: 'Игральный кубик: на гранях числа от 1 до 6 — по одному на каждой грани. По твоему правилу граней у кубика три. Куда же делись ещё три числа?', ask: 'Сколько граней у кубика?', choices: ['3', '6'], right: '6', verify: () => 1 + 1 + 1 + 1 + 1 + 1 === 6 }] },
        { id: 'cube-edges-6', title: 'Считает, что у куба 6 рёбер (путает рёбра с гранями)', kidName: 'Шестерёбрик',
          kidRule: 'ты думаешь, что у куба 6 рёбер, — но 6 у него граней',
          say: 'Рёбра — отрезки, по которым сходятся грани. У куба 4 ребра сверху, 4 снизу и 4 по бокам: 12. Шесть — это число граней.',
          fixIdea: 'У куба 6 граней, но 12 рёбер: 4 сверху, 4 снизу, 4 сбоку.',
          explainOptions: ['Шесть — это грани, а рёбер 12', 'У куба 6 рёбер', 'У куба 8 рёбер'],
          conflicts: [{ text: 'Посчитай рёбра кубика: 4 у верхней грани, 4 у нижней и 4 вертикальных. По твоему правилу их всего 6 — столько у куба граней, а не рёбер.', ask: 'Сколько рёбер у куба?', choices: ['6', '12'], right: '12', verify: () => 4 + 4 + 4 === 12 }] },
        { id: 'surface-as-volume', title: 'Находит объём вместо площади поверхности', kidName: 'Наполнялка',
          kidRule: 'ты перемножаешь три измерения, когда нужна площадь всех граней',
          say: 'a · b · c — это объём, сколько кубиков внутри. Чтобы оклеить коробку, нужна площадь её граней: сложи площади всех шести.',
          fixIdea: 'Площадь поверхности — сумма площадей шести граней, а не объём.',
          explainOptions: ['a · b · c — это объём, а нужна площадь граней', 'Площадь поверхности равна объёму', 'Нужно сложить три измерения'],
          conflicts: [{ text: 'Кубик с ребром 1 см. По твоему правилу бумаги на оклейку нужно 1 · 1 · 1 = 1 см² — как на одну грань. А граней у кубика шесть.', ask: 'Хватит 1 см² бумаги на все грани?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 6 * 1 * 1 > 1 }],
          root: 'g-volume' },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['count', 'surface', 'surface'], ['count', 'wire', 'surface', 'surface'], ['count', 'wire', 'surface', 'surface']));
        if (kind === 'count') {
          const O = pick([['игрального кубика', true], ['кубика Рубика', true], ['коробки из-под обуви', false], ['кирпича', false], ['спичечного коробка', false]]);
          const what = pick(['e', 'f', 'v']), x = { e: 12, f: 6, v: 8 }[what];
          const word = { e: 'рёбер', f: 'граней', v: 'вершин' }[what];
          const HN = {
            e: ['Рёбра — отрезки, по которым сходятся грани. Считай по слоям: сверху, снизу и сбоку.', '4 ребра у верхней грани, 4 — у нижней и 4 вертикальных.'],
            f: ['Грани — это стенки: сверху, снизу и по бокам. Сосчитай и те, что не видно на рисунке.', 'Верх и низ — 2, перед и зад — 2, левая и правая — 2.'],
            v: ['Вершины — это углы. Сколько их у верхней грани и сколько у нижней?', '4 вершины сверху и 4 снизу.'],
          }[what];
          return {
            story: '', question: `Сколько ${word} у ${O[0]}?`, placeholder: word,
            figure: O[1] ? { type: 'box', a: 3, b: 3, c: 3, la: '', lb: '', lc: '' } : { type: 'box', a: 5, b: 3, c: 2, la: '', lb: '', lc: '' },
            answer: ans(x), hints: HN,
            solution: { e: '4 + 4 + 4 = 12 рёбер.', f: '2 + 2 + 2 = 6 граней.', v: '4 + 4 = 8 вершин.' }[what],
            wrongs: wr(x, { 'cube-edges-6': what === 'e' ? 6 : null, 'three-faces': what === 'f' ? 3 : null }),
            data: { kind, what },
          };
        }
        if (kind === 'wire') {
          const a = rnd(2, L3(lv, 9, 20, 40)), x = 12 * a;
          const S = pick([
            [`Из проволоки сделали каркас куба с ребром ${a} см.`, 'Сколько сантиметров проволоки ушло?', 'см'],
            [`Для модели куба склеили каркас из палочек по ${a} см — по одной палочке на каждое ребро.`, 'Какова общая длина палочек (в см)?', 'см'],
            [`Аквариум-куб с ребром ${a} дм обклеили по всем рёбрам декоративной лентой.`, 'Сколько дециметров ленты понадобилось?', 'дм'],
          ]);
          return {
            story: S[0], question: S[1], placeholder: S[2],
            figure: { type: 'box', a: 3, b: 3, c: 3, la: `${a} ${S[2]}`, lb: `${a} ${S[2]}`, lc: `${a} ${S[2]}` }, answer: ans(x),
            hints: ['Сколько рёбер у куба? Посчитай сверху, снизу и сбоку.', `У куба 12 рёбер по ${a} ${S[2]}.`],
            solution: `12 · ${a} = ${x} ${S[2]}.`,
            wrongs: wr(x, { 'cube-edges-6': 6 * a }),
            data: { kind, a },
          };
        }
        const cube = Math.random() < 0.4;
        let a, b, c;
        if (cube) { a = b = c = rnd(2, L3(lv, 6, 9, 15)); }
        else { do { a = rnd(2, L3(lv, 6, 9, 15)); b = rnd(2, L3(lv, 5, 8, 12)); c = rnd(2, L3(lv, 5, 8, 12)); } while ((a === b && b === c) || a < b || a * b * c > 999); }
        const tops = a * b + b * c + a * c, S2 = 2 * tops;
        const net = !cube && Math.random() < 0.35;
        const C = cube ? pick([
          ['см', `Кубик с ребром ${a} см оклеивают со всех сторон цветной бумагой.`, 'Сколько квадратных сантиметров бумаги нужно?'],
          ['дм', `Деревянный куб с ребром ${a} дм красят со всех сторон.`, 'Какую площадь надо покрасить (в дм²)?'],
        ]) : net ? ['см', `Из картона вырезали развёртку коробки ${a} × ${b} × ${c} см (рисунок).`, 'Найди площадь развёртки (в см²).']
          : pick([
            ['см', `Коробку ${a} × ${b} × ${c} см оклеивают со всех сторон подарочной бумагой (без нахлёстов).`, 'Сколько квадратных сантиметров бумаги нужно?'],
            ['дм', `Ящик длиной ${a} дм, шириной ${b} дм и высотой ${c} дм красят снаружи со всех сторон.`, 'Какую площадь покрасят (в дм²)?'],
          ]);
        return {
          story: C[1], question: C[2], placeholder: `${C[0]}²`,
          figure: net ? { type: 'net56', a, b, c } : { type: 'box', a, b, c, la: `${a} ${C[0]}`, lb: `${b} ${C[0]}`, lc: `${c} ${C[0]}` },
          answer: ans(S2),
          hints: ['Сколько граней у коробки? Какие из них одинаковые?', cube ? `Шесть одинаковых квадратов по ${a} · ${a} = ${a * a} ${C[0]}².` : `Три пары одинаковых граней: ${a} · ${b}, ${b} · ${c} и ${a} · ${c} — каждую возьми дважды.`],
          solution: cube ? `Одна грань ${a * a} ${C[0]}², граней 6: ${a * a} · 6 = ${S2} ${C[0]}².` : `2 · (${a * b} + ${b * c} + ${a * c}) = 2 · ${tops} = ${S2} ${C[0]}².`,
          wrongs: wr(S2, { 'three-faces': tops, 'surface-as-volume': a * b * c }),
          data: { kind, a, b, c },
        };
      },
      verify(task) {
        const d = task.data;
        if (d.kind === 'count') return isAns(task, { e: 4 + 4 + 4, f: 2 + 2 + 2, v: 2 * 4 }[d.what]);
        if (d.kind === 'wire') { let s = 0; for (let i = 0; i < 12; i++) s += d.a; return isAns(task, s); }
        const faces = [[d.a, d.b], [d.a, d.b], [d.b, d.c], [d.b, d.c], [d.a, d.c], [d.a, d.c]];
        return isAns(task, faces.reduce((s, [x, y]) => s + countCells(x, y, () => true), 0));
      },
    },

    /* ---------------- 6 класс ---------------- */
    {
      id: 'g6-lines', strand: SG, grade: 6, short: 'Прямые', title: 'Параллельные и перпендикулярные прямые, расстояние',
      frp: ['Взаимное расположение двух прямых на плоскости, параллельные прямые, перпендикулярные прямые', 'Измерение расстояний: между двумя точками, от точки до прямой, длина маршрута на квадратной сетке'],
      goal: 'Различать параллельные и перпендикулярные прямые и находить расстояние от точки до прямой и между параллельными прямыми.',
      requires: ['g5-angle-types', 'g5-segments'],
      explain: {
        model: 'Ты стоишь в поле, а рядом прямая дорога. К ней можно идти наискосок, а можно — прямо, под прямым углом. Прямой путь самый короткий, и его длина — это расстояние от тебя до дороги.',
        figure: { type: 'grid56', w: 7, h: 6, desc: 'прямая a, точка P на 4 клетки выше; перпендикуляр PH — 4 клетки, наклонная PA — 5', segs: [{ p: [0, 1, 7, 1], bold: true }, { p: [2, 5, 2, 1], bold: true, green: true, label: '4', side: 1 }, { p: [2, 5, 5, 1], dash: true, label: '5', side: -1 }], pts: [{ x: 2, y: 5, label: 'P' }, { x: 2, y: 1, label: 'H', dx: -10, dy: 16 }, { x: 5, y: 1, label: 'A', dx: 0, dy: 18 }], texts: [{ x: 6.6, y: 1.5, t: 'a' }] },
        figureCaption: 'Перпендикуляр PH = 4 — это расстояние до прямой; наклонная PA = 5 длиннее',
        rule: '<ul class="rule-list"><li><b>Параллельные прямые</b> лежат в одной плоскости и не пересекаются, как рельсы.</li><li><b>Перпендикулярные прямые</b> пересекаются под прямым углом, как линии тетрадной клетки.</li><li><b>Расстояние от точки до прямой</b> — длина перпендикуляра из точки на прямую. Любая наклонная длиннее.</li><li><b>Расстояние между параллельными прямыми</b> — длина перпендикуляра между ними.</li><li>На клетках считай <b>клетки</b> (промежутки), а не линии сетки.</li></ul>',
        examples: [
          { q: 'Точка P на 3 клетки выше прямой a (сторона клетки 1 см). Отрезок PA к прямой равен 5 см. Чему равно расстояние от P до прямой a?', fig: distFig(3, 4, true, false, '5 см'),
            choices: ['3 см', '5 см', '4 см'], correct: 0, wrong: { 1: 'slant-not-perp', 2: 'count-nodes' },
            steps: ['Расстояние — длина перпендикуляра, а PA — наклонная.', 'Перпендикуляр из P идёт по линии сетки вниз: 3 клетки по 1 см.', 'Ответ: 3 см.'] },
          { q: 'Рельсы прямой железной дороги — какие это прямые?', choices: ['параллельные', 'перпендикулярные'], correct: 0, wrong: { 1: 'par-perp-swap' },
            steps: ['Рельсы никогда не пересекаются.', 'Непересекающиеся прямые на плоскости — параллельные.'] },
        ],
      },
      mistakes: [
        { id: 'slant-not-perp', title: 'Берёт наклонную вместо перпендикуляра', kidName: 'Наискосок',
          kidRule: 'ты считаешь расстоянием любой отрезок от точки до прямой, даже наклонный',
          say: 'Расстояние — это самый короткий путь до прямой, то есть перпендикуляр. Наклонная всегда длиннее.',
          fixIdea: 'Расстояние до прямой меряют по перпендикуляру — под прямым углом к ней.',
          explainOptions: ['Расстояние — это перпендикуляр, а наклонная длиннее', 'Расстоянием можно считать любой отрезок до прямой', 'Расстояние — это самый длинный отрезок до прямой'],
          conflicts: [{ text: 'Из точки P к прямой можно провести сколько угодно отрезков: 4 см, 5 см, 10 см… По твоему правилу у точки было бы много разных расстояний до одной прямой. Поэтому берут самый короткий отрезок — перпендикуляр.', ask: 'Что короче: перпендикуляр или наклонная?', choices: ['перпендикуляр', 'наклонная'], right: 'перпендикуляр', verify: () => 4 < 5 && 3 * 3 + 4 * 4 === 5 * 5, figure: distFig(4, 3, true, false, '5') }] },
        { id: 'count-nodes', title: 'Считает линии сетки, а не клетки', kidName: 'Узелок',
          kidRule: 'ты считаешь линии сетки вместо клеток, и выходит на одну больше',
          say: 'Считай клетки — промежутки между линиями. Линий всегда на одну больше, чем клеток между ними.',
          fixIdea: 'Длину на клетках считают по клеткам (промежуткам), а не по линиям.',
          explainOptions: ['Линий на одну больше, чем клеток между ними', 'Надо считать все линии сетки', 'Надо считать клетки и прибавить одну'],
          conflicts: [{ text: 'Точка P лежит на соседней линии сетки над прямой — между ними ровно одна клетка, 1 см. По твоему правилу считаются линии сетки: их две, и выходит 2 см.', ask: 'Сколько клеток между P и прямой?', choices: ['1', '2'], right: '1', verify: () => 2 - 1 === 1 }],
          root: 'g5-segments' },
        { id: 'par-perp-swap', title: 'Путает параллельные и перпендикулярные прямые', kidName: 'Перепутик',
          kidRule: 'ты путаешь слова: непересекающиеся прямые называешь перпендикулярными, а пересекающиеся под прямым углом — параллельными',
          say: 'Параллельные — как рельсы: никогда не встречаются. Перпендикулярные — как линии клетки: пересекаются под прямым углом.',
          fixIdea: 'Параллельные не пересекаются, перпендикулярные пересекаются под прямым углом.',
          explainOptions: ['Параллельные не пересекаются, а перпендикулярные пересекаются под прямым углом', 'Параллельные пересекаются под прямым углом', 'Это одно и то же'],
          conflicts: [{ text: 'Рельсы идут рядом и никогда не сходятся — иначе поезд сошёл бы с них. По твоему правилу рельсы перпендикулярны, то есть пересекаются под прямым углом.', ask: 'Рельсы пересекаются?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => true }] },
      ],
      generate(lv) {
        const TRI = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]]; // [перпендикуляр, сдвиг, наклонная]
        const kind = pick(L3(lv, ['dist', 'dist', 'kind'], ['dist', 'between', 'kind'], ['dist', 'between', 'between', 'kind']));
        if (kind === 'kind') {
          const par = Math.random() < 0.5;
          const obj = par ? pick(['два рельса прямой железной дороги', 'соседние строчки в тетради', 'противоположные края линейки', 'полоски пешеходного перехода «зебра»', 'края прямой дороги'])
            : pick(['стрелки часов в 3:00', 'вертикальную и горизонтальную линии тетрадной клетки', 'две улицы, пересекающиеся под прямым углом,', 'перекладины знака «плюс»', 'соседние края листа бумаги']);
          const right = par ? 'параллельные' : 'перпендикулярные';
          return {
            story: `Посмотри на ${obj} и представь, что это части прямых.`, question: 'Какие это прямые?', accept: 'choice',
            choices: ['параллельные', 'перпендикулярные'], answer: right,
            hints: ['Параллельные прямые никогда не пересекаются. Перпендикулярные пересекаются под прямым углом.', 'Пересекутся ли эти линии, если их продолжить? Если да, то под каким углом?'],
            solution: par ? 'Эти линии не пересекаются, сколько их ни продолжай, — прямые параллельные.' : 'Эти линии пересекаются под прямым углом — прямые перпендикулярные.',
            wrongs: wc(right, { 'par-perp-swap': par ? 'перпендикулярные' : 'параллельные' }),
            data: { kind, par },
          };
        }
        const [d, t, L] = pick(L3(lv, TRI.slice(0, 2), TRI.slice(0, 4), TRI)), horiz = Math.random() < 0.6;
        if (kind === 'dist') {
          const C = pick([
            { cell: 1, unit: 'см', ct: '1 см' }, { cell: 5, unit: 'мм', ct: '5 мм' }, { cell: 2, unit: 'см', ct: '2 см' },
            { cell: 100, unit: 'м', ct: '100 м', house: true }, { cell: 50, unit: 'м', ct: '50 м', house: true },
            { cell: 1, unit: 'км', ct: '1 км', lake: true }, { cell: 2, unit: 'км', ct: '2 км', lake: true },
          ].filter(c => lv > 1 || c.cell === 1 || c.cell === 100));
          C.s = C.house ? `Дом P стоит недалеко от прямой дороги a. Тропинка от дома до остановки A идёт наискосок, её длина — ${L * C.cell} м. На плане сторона клетки — ${C.ct}.`
            : C.lake ? `Лодка P плывёт по озеру, a — прямой берег. До пристани A на берегу ${L * C.cell} км. На карте сторона клетки — ${C.ct}.`
              : `На клетчатой бумаге проведена прямая a и отмечена точка P. Сторона клетки — ${C.ct}. Точку P соединили с точкой A на прямой: PA = ${L * C.cell} ${C.unit}.`;
          C.q = C.house ? 'Какое кратчайшее расстояние от дома до дороги (в м)?' : C.lake ? 'Какое кратчайшее расстояние от лодки до берега (в км)?' : `Чему равно расстояние от точки P до прямой a (в ${C.unit})?`;
          const x = d * C.cell;
          return {
            story: C.s, question: C.q, placeholder: C.unit,
            figure: distFig(d, t, horiz, false, `${num(L * C.cell)} ${C.unit}`), answer: ans(x),
            hints: ['Расстояние от точки до прямой — длина перпендикуляра, самого короткого отрезка до прямой.', `Опусти из P перпендикуляр на прямую a по линии сетки и посчитай клетки${C.cell !== 1 ? `, а потом умножь на ${C.cell}` : ''}.`],
            solution: `Перпендикуляр из P к прямой a занимает ${d} ${cellsW(d)}: ${C.cell !== 1 ? `${d} · ${C.cell} = ` : ''}${num(x)} ${C.unit}. Наклонная PA длиннее — это не расстояние.`,
            wrongs: wr(x, { 'slant-not-perp': L * C.cell, 'count-nodes': (d + 1) * C.cell }),
            data: { kind, d, t, L, cell: C.cell },
          };
        }
        const C = pick([
          { cell: 1, unit: 'см', s: `На клетчатой бумаге (сторона клетки 1 см) проведены параллельные прямые a и b. Отрезок AB соединяет их наискосок: AB = ${L} см.`, q: 'Чему равно расстояние между прямыми a и b (в см)?' },
          { cell: 5, unit: 'мм', s: `В тетради (сторона клетки 5 мм) проведены параллельные прямые a и b. Отрезок AB соединяет их наискосок: AB = ${L * 5} мм.`, q: 'Чему равно расстояние между прямыми a и b (в мм)?' },
          { cell: 10, unit: 'м', s: `Берега канала — параллельные прямые a и b. Лодка переплыла канал наискосок от A до B и прошла ${L * 10} м. На плане сторона клетки — 10 м.`, q: 'Какова ширина канала (в м)?' },
          { cell: 5, unit: 'м', s: `Берега реки — параллельные прямые a и b. Паром переплыл реку наискосок от A до B и прошёл ${L * 5} м. На плане сторона клетки — 5 м.`, q: 'Какова ширина реки (в м)?' },
          { cell: 1, unit: 'м', s: `Между двумя прямыми параллельными заборами a и b натянули верёвку AB наискосок, её длина — ${L} м. На плане сторона клетки — 1 м.`, q: 'Какое расстояние между заборами (в м)?' },
        ]);
        const x = d * C.cell;
        return {
          story: C.s, question: C.q, placeholder: C.unit,
          figure: distFig(d, t, horiz, true, `${num(L * C.cell)} ${C.unit}`), answer: ans(x),
          hints: ['Расстояние между параллельными прямыми — длина перпендикуляра между ними, а не наклонного отрезка.', `Посчитай клетки между прямыми по перпендикуляру${C.cell !== 1 ? ` и умножь на ${C.cell}` : ''}.`],
          solution: `Между прямыми по перпендикуляру ${d} ${cellsW(d)}: ${C.cell !== 1 ? `${d} · ${C.cell} = ` : ''}${num(x)} ${C.unit}. Отрезок AB наклонный, он длиннее.`,
          wrongs: wr(x, { 'slant-not-perp': L * C.cell, 'count-nodes': (d + 1) * C.cell }),
          data: { kind, d, t, L, cell: C.cell },
        };
      },
      verify(task) {
        const d = task.data;
        if (d.kind === 'kind') return task.answer === (d.par ? 'параллельные' : 'перпендикулярные');
        return d.d * d.d + d.t * d.t === d.L * d.L && d.d < d.L && isAns(task, d.d * d.cell);
      },
    },

    {
      id: 'g6-triangles', strand: SG, grade: 6, short: 'Треугольники', title: 'Виды треугольников',
      frp: ['Виды треугольников: остроугольный, прямоугольный, тупоугольный; равнобедренный, равносторонний', 'Периметр многоугольника'],
      goal: 'Определять вид треугольника по углам и по сторонам и находить периметр равнобедренного треугольника.',
      requires: ['g5-angle-types', 'g-perimeter'],
      explain: {
        model: 'Чертёжный угольник — это треугольник. Один его угол прямой, поэтому угольник — прямоугольный треугольник, хотя одна его сторона вдвое длиннее другой. Вид треугольника по углам определяет самый большой угол, а не длина сторон.',
        figure: { type: 'tri56', A: 60, B: 90 },
        figureCaption: 'Угольник: углы 60°, 90° и 30° — прямоугольный треугольник',
        rule: '<ul class="rule-list"><li>По углам: <b>остроугольный</b> — все углы острые; <b>прямоугольный</b> — есть прямой угол; <b>тупоугольный</b> — есть тупой угол.</li><li>Смотри на <b>самый большой угол</b>: меньше 90° — остроугольный, 90° — прямоугольный, больше 90° — тупоугольный.</li><li>По сторонам: <b>разносторонний</b> — все стороны разные; <b>равнобедренный</b> — две стороны равны (боковые), третья — основание; <b>равносторонний</b> — все три стороны равны.</li></ul>',
        examples: [
          { q: 'Углы треугольника: 80°, 80° и 20°. Какой он по углам?', fig: { type: 'tri56', A: 80, B: 80 },
            choices: ['остроугольный', 'тупоугольный'], correct: 0, wrong: { 1: 'long-side-obtuse' },
            steps: ['Самый большой угол — 80°.', '80° меньше 90° — все углы острые.', 'Треугольник остроугольный, хотя две его стороны длинные.'] },
          { q: 'Боковая сторона равнобедренного треугольника — 7 см, основание — 4 см. Найди периметр.', fig: { type: 'tri56', A: 73, B: 73, al: ['', '', ''], sl: ['4 см', '7 см', '7 см'] },
            choices: ['18 см', '21 см'], correct: 0, wrong: { 1: 'iso-equi-swap' },
            steps: ['У равнобедренного треугольника две боковые стороны по 7 см и основание 4 см.', '7 + 7 + 4 = 18 см.'] },
        ],
      },
      mistakes: [
        { id: 'long-side-obtuse', title: 'Считает треугольник тупоугольным, если одна сторона длинная', kidName: 'Тупоглаз',
          kidRule: 'ты называешь треугольник тупоугольным, если одна его сторона заметно длиннее других',
          say: 'Вид по углам определяет самый большой угол, а не длина сторон. Если он меньше 90°, треугольник остроугольный; если 90° — прямоугольный.',
          fixIdea: 'Смотри на самый большой угол: тупоугольный — только если он больше 90°.',
          explainOptions: ['Длинная сторона не делает угол тупым — смотри на градусы', 'Если одна сторона длинная, треугольник тупоугольный', 'Тупоугольный — это вытянутый треугольник'],
          conflicts: [{ text: 'Чертёжный угольник: углы 90°, 60° и 30°, и одна его сторона вдвое длиннее самой короткой. По твоему правилу он тупоугольный. Но в нём нет ни одного угла больше 90°.', ask: 'Есть у угольника тупой угол?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => [90, 60, 30].every(x => x <= 90) && 90 + 60 + 30 === 180, figure: { type: 'tri56', A: 60, B: 90 } }],
          root: 'g5-angle-types' },
        { id: 'iso-equi-swap', title: 'Путает равнобедренный и равносторонний треугольник', kidName: 'Близнецы',
          kidRule: 'ты считаешь треугольник с двумя равными сторонами равносторонним — будто все три стороны равны',
          say: 'Равнобедренный — две равные стороны, а основание может быть другим. Равносторонний — все три стороны равны.',
          fixIdea: 'Равнобедренный: две стороны равны. Равносторонний: равны все три.',
          explainOptions: ['Равны только две стороны, третья другая — это равнобедренный', 'Если две стороны равны, то равны и все три', 'Равнобедренный — это когда все стороны разные'],
          conflicts: [{ text: 'Треугольник со сторонами 5 см, 5 см и 8 см. По твоему правилу он равносторонний — но тогда все стороны были бы по 5 см, а одна из них 8 см.', ask: 'Все стороны этого треугольника равны?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 8 !== 5 }] },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['angles', 'angles', 'sides', 'perim'], ['angles', 'sides', 'perim'], ['angles', 'sides', 'perim', 'back']));
        const sinD = x => Math.sin(x * Math.PI / 180);
        if (kind === 'angles') {
          let ang, t, ctx = null;
          if (Math.random() < 0.15) { ang = pick([[90, 60, 30], [90, 45, 45]]); t = 'rt'; ctx = [`Чертёжный угольник — треугольник с углами ${ang[0]}°, ${ang[1]}° и ${ang[2]}°.`, 'Какой это треугольник по углам?']; }
          else {
            t = pick(['ac', 'rt', 'ob']);
            const st = L3(lv, 10, 5, 5);
            do {
              if (t === 'rt') { const x = rnd(Math.ceil(15 / st), Math.floor(75 / st)) * st; ang = [90, x, 90 - x]; }
              else if (t === 'ob') { const big = rnd(Math.ceil(95 / st), Math.floor(150 / st)) * st, x = rnd(1, (180 - big) / st - 1) * st; ang = [big, x, 180 - big - x]; }
              else { const x = rnd(Math.ceil(15 / st), Math.floor(85 / st)) * st, y = rnd(Math.ceil(15 / st), Math.floor(85 / st)) * st; ang = [x, y, 180 - x - y]; }
            } while (ang.some(v => v < 10) || (t === 'ac' && ang.some(v => v >= 90)) || (lv === 1 && t === 'ac' && Math.max(...ang) > 80));
            ang = shuffle(ang);
          }
          const big = Math.max(...ang), right = big < 90 ? 'остроугольный' : big === 90 ? 'прямоугольный' : 'тупоугольный';
          const sides = ang.map(sinD), long = Math.max(...sides) / Math.min(...sides) >= 1.5;
          const [A, B, C] = ang;
          ctx = ctx || pick([
            [`Углы треугольника равны ${A}°, ${B}° и ${C}°.`, 'Какой это треугольник по углам?'],
            [`Треугольный флажок имеет углы ${A}°, ${B}° и ${C}°.`, 'Какой это треугольник по углам?'],
            [`Парус яхты — треугольник с углами ${A}°, ${B}° и ${C}°.`, 'Какой это треугольник по углам?'],
            [`Треугольный кусок сыра имеет углы ${A}°, ${B}° и ${C}°.`, 'Какой это треугольник по углам?'],
          ]);
          return {
            story: ctx[0], question: ctx[1], accept: 'choice',
            figure: { type: 'tri56', A, B }, choices: ['остроугольный', 'прямоугольный', 'тупоугольный'], answer: right,
            hints: ['Найди самый большой угол треугольника и сравни его с 90°.', `Самый большой угол — ${big}°.`],
            solution: `Самый большой угол — ${big}°: ${big < 90 ? 'он меньше 90°, значит, все углы острые' : big === 90 ? 'это прямой угол' : 'он больше 90°, это тупой угол'}. Треугольник ${right}.`,
            wrongs: wc(right, { 'long-side-obtuse': right !== 'тупоугольный' && long ? 'тупоугольный' : null }),
            data: { kind, ang },
          };
        }
        if (kind === 'sides') {
          const iso = Math.random() < 0.65;
          let s;
          if (iso) { const a = rnd(3, L3(lv, 9, 15, 30)); let b; do b = rnd(2, 2 * a - 1); while (b === a); s = [a, a, b]; }
          else { do s = [rnd(3, L3(lv, 9, 15, 30)), rnd(3, L3(lv, 9, 15, 30)), rnd(3, L3(lv, 9, 15, 30))]; while (new Set(s).size < 3 || 2 * Math.max(...s) >= s[0] + s[1] + s[2]); }
          const right = iso ? 'равнобедренный' : 'разносторонний', sh = shuffle(s);
          const C = pick([
            [`Стороны треугольника равны ${sh[0]} см, ${sh[1]} см и ${sh[2]} см.`, 'Какой это треугольник по сторонам?'],
            [`Треугольный вымпел имеет стороны ${sh[0]} см, ${sh[1]} см и ${sh[2]} см.`, 'Какой это треугольник по сторонам?'],
            [`Из трёх палочек длиной ${sh[0]} см, ${sh[1]} см и ${sh[2]} см сложили треугольник.`, 'Какой это треугольник по сторонам?'],
          ]);
          return {
            story: C[0], question: C[1], accept: 'choice',
            choices: ['разносторонний', 'равнобедренный', 'равносторонний'], answer: right,
            hints: ['Сколько сторон равны между собой: ни одной пары, две или все три?', iso ? `Две стороны по ${s[0]} см, а третья — ${s[2]} см.` : 'Сравни длины всех трёх сторон попарно.'],
            solution: iso ? `Две стороны равны (${s[0]} см), а третья — ${s[2]} см. Треугольник равнобедренный, но не равносторонний.` : 'Все стороны разные — треугольник разносторонний.',
            wrongs: wc(right, { 'iso-equi-swap': iso ? 'равносторонний' : null }),
            data: { kind, s },
          };
        }
        const a = rnd(kind === 'back' ? 5 : 3, L3(lv, 9, 20, 40));
        let b; do b = rnd(Math.max(2, Math.ceil(0.4 * a)), Math.min(2 * a - 1, Math.floor(1.6 * a))); while (b === a || (kind === 'back' && b % 3 !== a % 3));
        const P = 2 * a + b;
        const fig = { type: 'tri56', A: Math.round(Math.acos(Math.min(0.99, b / (2 * a))) * 180 / Math.PI), B: 0, al: ['', '', ''] };
        fig.B = fig.A;
        if (kind === 'back') {
          fig.sl = [`${b} см`, '?', '?'];
          return {
            story: `Периметр равнобедренного треугольника — ${P} см, его основание — ${b} см.`, question: 'Найди боковую сторону (в см).', placeholder: 'см',
            figure: fig, answer: ans(a),
            hints: ['У равнобедренного треугольника две боковые стороны равны. Сколько приходится на них обе вместе?', `На две боковые стороны: ${P} − ${b} = ${P - b} см.`],
            solution: `${P} − ${b} = ${P - b} см — две боковые стороны; ${P - b} : 2 = ${a} см.`,
            wrongs: wr(a, { 'iso-equi-swap': P / 3 }),
            data: { kind, P, b },
          };
        }
        const C = pick([
          ['см', `Равнобедренный треугольник: боковая сторона ${a} см, основание ${b} см.`, 'Найди его периметр (в см).'],
          ['дм', `Фронтон крыши — равнобедренный треугольник: скаты по ${a} дм, основание ${b} дм. По краю фронтона прибивают рейку.`, 'Сколько дециметров рейки нужно?'],
          ['см', `Вешалка — равнобедренный треугольник с боковыми сторонами ${a} см и основанием ${b} см.`, 'Сколько сантиметров проволоки ушло на вешалку?'],
        ]);
        fig.sl = [`${b} ${C[0]}`, `${a} ${C[0]}`, `${a} ${C[0]}`];
        return {
          story: C[1], question: C[2], placeholder: C[0],
          figure: fig, answer: ans(P),
          hints: ['Сколько у равнобедренного треугольника равных сторон?', `Две боковые по ${a} ${C[0]} и основание ${b} ${C[0]}.`],
          solution: `P = ${a} + ${a} + ${b} = ${P} ${C[0]}.`,
          wrongs: wr(P, { 'iso-equi-swap': 3 * a }),
          data: { kind, a, b },
        };
      },
      verify(task) {
        const d = task.data;
        if (d.kind === 'angles') { const o = d.ang.filter(x => x > 90).length, r = d.ang.filter(x => x === 90).length; return d.ang[0] + d.ang[1] + d.ang[2] === 180 && task.answer === (o ? 'тупоугольный' : r ? 'прямоугольный' : 'остроугольный'); }
        if (d.kind === 'sides') { const [x, y, z] = d.s, eqs = (x === y) + (y === z) + (x === z); return task.answer === (eqs === 3 ? 'равносторонний' : eqs === 1 ? 'равнобедренный' : 'разносторонний'); }
        if (d.kind === 'back') { const x = Number(task.answer); return x > 0 && same(x + x + d.b, d.P) && d.b < 2 * x; }
        return isAns(task, d.a + d.a + d.b);
      },
    },

    {
      id: 'g6-quads', strand: SG, grade: 6, short: 'Четырёхугольники', title: 'Четырёхугольники: прямоугольник и квадрат',
      frp: ['Четырёхугольник, примеры четырёхугольников', 'Прямоугольник, квадрат: использование свойств сторон, углов, диагоналей'],
      goal: 'Использовать свойства прямоугольника и квадрата: равенство и деление диагоналей пополам, стороны и периметр.',
      requires: ['g-perimeter', 'g6-lines'],
      explain: {
        model: 'Калитка — прямоугольник. Чтобы она не перекосилась, плотник прибивает две планки по диагоналям. Он режет их одинаковой длины: у прямоугольника диагонали равны. А скрепляет планки точно посередине: точка пересечения делит каждую диагональ пополам.',
        figure: rectDiagFig(),
        figureCaption: 'AC = BD, а точка O — середина каждой диагонали: AO = OC = BO = OD',
        rule: '<ul class="rule-list"><li><b>Прямоугольник</b> — четырёхугольник, у которого все углы прямые. Противоположные стороны равны; P = 2 · (a + b).</li><li><b>Диагонали прямоугольника равны</b> и точкой пересечения <b>делятся пополам</b>.</li><li><b>Квадрат</b> — прямоугольник, у которого все стороны равны. Значит, квадрат — тоже прямоугольник. P = 4 · a.</li><li>У квадрата диагонали ещё и <b>перпендикулярны</b>. У прямоугольника, который не квадрат, — нет.</li></ul>',
        examples: [
          { q: 'Диагонали прямоугольника ABCD пересекаются в точке O, AC = 12 см. Найди BO.', fig: rectDiagFig(),
            choices: ['6 см', '12 см'], correct: 0, wrong: { 1: 'half-diag' },
            steps: ['Диагонали прямоугольника равны: BD = AC = 12 см.', 'Точка O делит BD пополам: BO = 12 : 2 = 6 см.'] },
          { q: 'Квадрат — это прямоугольник?', choices: ['да', 'нет'], correct: 0, wrong: { 1: 'square-not-rect' },
            steps: ['Прямоугольник — четырёхугольник, у которого все углы прямые.', 'У квадрата все углы прямые — значит, он прямоугольник (особый: с равными сторонами).'] },
          { q: 'Длина прямоугольника 8 см, ширина на 3 см меньше. Найди периметр.', choices: ['26 см', '13 см'], correct: 0, wrong: { 1: 'half-perimeter' },
            steps: ['Ширина: 8 − 3 = 5 см.', 'P = 2 · (8 + 5) = 26 см.'] },
        ],
      },
      mistakes: [
        { id: 'square-not-rect', title: 'Считает, что квадрат — не прямоугольник', kidName: 'Квадратный упрямец',
          kidRule: 'ты думаешь, что квадрат — не прямоугольник, раз у него все стороны равны',
          say: 'Прямоугольник — четырёхугольник, у которого все углы прямые. У квадрата все углы прямые, значит, он прямоугольник — просто с равными сторонами.',
          fixIdea: 'Квадрат — частный случай прямоугольника: все углы прямые, а стороны ещё и равны.',
          explainOptions: ['У квадрата все углы прямые — значит, он прямоугольник', 'У прямоугольника стороны обязательно разные', 'Квадрат и прямоугольник — совсем разные фигуры'],
          conflicts: [{ text: 'Прямоугольник — это четырёхугольник, у которого все углы прямые. У квадрата все четыре угла прямые. По твоему правилу квадрат всё равно не прямоугольник.', ask: 'Все углы квадрата прямые?', choices: ['Да', 'Нет'], right: 'Да', verify: () => true }] },
        { id: 'rect-diag-perp', title: 'Считает, что диагонали любого прямоугольника перпендикулярны', kidName: 'Крестик',
          kidRule: 'ты думаешь, что диагонали любого прямоугольника пересекаются под прямым углом, как у квадрата',
          say: 'Перпендикулярны диагонали только у квадрата. У вытянутого прямоугольника они пересекаются под острым и тупым углом.',
          fixIdea: 'Диагонали прямоугольника равны и делятся пополам, но перпендикулярны — только у квадрата.',
          explainOptions: ['Под прямым углом пересекаются диагонали только квадрата', 'Диагонали всех прямоугольников перпендикулярны', 'Диагонали прямоугольника параллельны'],
          conflicts: [{ text: 'Возьми длинную узкую полоску 10 × 2 см и проведи диагонали. Они почти лежат друг на друге и пересекаются под маленьким углом. По твоему правилу этот угол прямой.', ask: 'Диагонали узкой полоски перпендикулярны?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 10 !== 2, figure: rectDiagFig(10, 2, 'узкий прямоугольник 10 на 2 с диагоналями') }] },
        { id: 'half-diag', title: 'Путает половину диагонали с целой диагональю', kidName: 'Половинкин',
          kidRule: 'ты забываешь, что точка пересечения делит диагональ пополам, и путаешь отрезок AO с целой диагональю AC',
          say: 'Точка O — середина диагонали: AO — половина AC. Из целой диагонали половину получают делением на 2, а из половины целую — умножением на 2.',
          fixIdea: 'AO = OC = AC : 2, и так же BO = OD = BD : 2. А AC = BD.',
          explainOptions: ['Точка O делит диагональ пополам, AO — только половина', 'AO и AC — одно и то же', 'Точка O делит диагональ на три части'],
          conflicts: [{ text: 'Диагонали прямоугольника пересекаются ровно посередине. Если AC = 10 см, а по твоему правилу AO тоже 10 см, то точка O оказалась бы в конце диагонали — в точке C.', ask: 'Где точка O на диагонали AC?', choices: ['в середине', 'на конце'], right: 'в середине', verify: () => 10 / 2 === 5 }] },
        { id: 'half-perimeter', title: 'Находит периметр как сумму двух сторон', kidName: 'Полпути',
          kidRule: 'ты складываешь только две стороны прямоугольника, а их четыре',
          say: 'У прямоугольника две длины и две ширины. Длина + ширина — это только половина периметра.',
          fixIdea: 'P = 2 · (a + b): каждую сторону бери дважды. У квадрата P = 4 · a.',
          explainOptions: ['Сторон четыре: длину и ширину надо взять по два раза', 'Периметр — это длина плюс ширина', 'Периметр — это длина, умноженная на ширину'],
          conflicts: [{ text: 'Прямоугольник 5 см на 3 см. По твоему правилу периметр 5 + 3 = 8 см. Но это только две стороны из четырёх — обойди прямоугольник целиком.', ask: 'Сколько сторон у прямоугольника?', choices: ['2', '4'], right: '4', verify: () => 2 * (5 + 3) === 16 }],
          root: 'g-perimeter' },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['diag', 'perim', 'prop'], ['diag', 'perim', 'prop', 'prop'], ['diag', 'diag', 'perim', 'prop']));
        if (kind === 'diag') {
          const mode = lv === 3 ? pick(['f2h', 'h2f', 'tri']) : pick(['f2h', 'h2f']), u = pick(['см', 'дм']);
          const pre = pick(['Диагонали прямоугольника ABCD пересекаются в точке O.', 'Калитка ABCD — прямоугольник. Её укрепили двумя планками по диагоналям AC и BD, они пересекаются в точке O.', 'На прямоугольной раме ABCD натянули две нити по диагоналям AC и BD, они пересеклись в точке O.']);
          if (mode === 'f2h') {
            const dd = 2 * rnd(2, L3(lv, 8, 15, 30)), [gv, ask] = pick([['AC', 'BO'], ['AC', 'OD'], ['BD', 'AO'], ['BD', 'CO']]), x = dd / 2;
            return {
              story: `${pre} ${gv} = ${dd} ${u}.`, question: `Найди длину отрезка ${ask} (в ${u}).`, placeholder: u, figure: rectDiagFig(), answer: ans(x),
              hints: ['Какие свойства у диагоналей прямоугольника? Они равны и…', `Диагонали равны, значит, вторая тоже ${dd} ${u}. А точка O делит её пополам.`],
              solution: `Диагонали равны: обе по ${dd} ${u}. O — середина каждой: ${ask} = ${dd} : 2 = ${x} ${u}.`,
              wrongs: wr(x, { 'half-diag': dd }),
              data: { kind, mode, given: dd },
            };
          }
          if (mode === 'h2f') {
            const hh = rnd(2, L3(lv, 9, 20, 40)), [gv, ask] = pick([['AO', 'BD'], ['CO', 'BD'], ['BO', 'AC'], ['OD', 'AC']]), x = 2 * hh;
            return {
              story: `${pre} ${gv} = ${hh} ${u}.`, question: `Найди длину диагонали ${ask} (в ${u}).`, placeholder: u, figure: rectDiagFig(), answer: ans(x),
              hints: [`Какую часть диагонали составляет отрезок ${gv}?`, `${gv} — половина диагонали, а диагонали прямоугольника равны.`],
              solution: `${gv} — половина диагонали, вся диагональ ${hh} · 2 = ${x} ${u}. Диагонали равны: ${ask} = ${x} ${u}.`,
              wrongs: wr(x, { 'half-diag': hh }),
              data: { kind, mode, given: hh },
            };
          }
          const dd = 2 * rnd(3, 20), s = rnd(2, dd - 1), x = dd + s;
          return {
            story: `${pre} AC = ${dd} ${u}, AB = ${s} ${u}.`, question: `Найди периметр треугольника AOB (в ${u}).`, placeholder: u, figure: rectDiagFig(), answer: ans(x),
            hints: ['Периметр треугольника AOB = AO + OB + AB. Чему равны AO и OB?', `AO и OB — половины равных диагоналей: по ${dd} : 2 = ${dd / 2} ${u}.`],
            solution: `AO = OB = ${dd} : 2 = ${dd / 2} ${u}; P = ${dd / 2} + ${dd / 2} + ${s} = ${x} ${u}.`,
            wrongs: wr(x, { 'half-diag': 2 * dd + s }),
            data: { kind, mode, given: dd, s },
          };
        }
        if (kind === 'perim') {
          const mode = pick(['rel', 'rel', 'sq', 'back']);
          if (mode === 'sq') {
            const a = rnd(2, L3(lv, 12, 25, 60)), P = 4 * a;
            const C = pick([['см', `Периметр квадрата — ${P} см.`, 'Найди его сторону (в см).'], ['м', `Квадратный участок обнесли забором длиной ${P} м.`, 'Какая длина у стороны участка (в м)?'], ['см', `Из проволоки длиной ${P} см согнули квадрат без остатка.`, 'Какая у него сторона (в см)?']]);
            return {
              story: C[1], question: C[2], placeholder: C[0], answer: ans(a),
              hints: ['Сколько равных сторон у квадрата?', `Четыре стороны: ${P} : 4.`],
              solution: `a = ${P} : 4 = ${a} ${C[0]}.`,
              wrongs: wr(a, { 'half-perimeter': P / 2 }),
              data: { kind, mode, P },
            };
          }
          if (mode === 'back') {
            let a, b; do { a = rnd(3, L3(lv, 12, 25, 50)); b = rnd(2, L3(lv, 12, 25, 50)); } while (a <= b);
            const P = 2 * (a + b);
            const C = pick([['см', `Периметр прямоугольника — ${P} см, его длина — ${a} см.`, 'Найди ширину (в см).'], ['дм', `Прямоугольную грядку обнесли бортиком длиной ${P} дм; длина грядки — ${a} дм.`, 'Какая ширина у грядки (в дм)?'], ['м', `Прямоугольный двор обнесён забором длиной ${P} м, длина двора — ${a} м.`, 'Найди ширину двора (в м).']]);
            return {
              story: C[1], question: C[2], placeholder: C[0], answer: ans(b),
              figure: { type: 'rect', a, b, la: `${a} ${C[0]}`, lb: `? ${C[0]}`, grid: false },
              hints: ['Длина и ширина вместе — это половина периметра.', `${P} : 2 = ${P / 2}. Вычти длину.`],
              solution: `${P} : 2 = ${P / 2} — длина и ширина вместе; ${P / 2} − ${a} = ${b} ${C[0]}.`,
              wrongs: wr(b, { 'half-perimeter': P - a }),
              data: { kind, mode, P, a },
            };
          }
          const byK = Math.random() < 0.5, k = rnd(2, L3(lv, 3, 4, 6));
          let a, b;
          if (byK) { b = rnd(2, L3(lv, 6, 12, 20)); a = b * k; } else { a = rnd(k + 2, L3(lv, 12, 25, 50)); b = a - k; }
          const P = 2 * (a + b);
          const rel = byK ? `в ${times(k)} меньше` : `на ${k} меньше`;
          const C = pick([
            ['м', `Длина прямоугольного участка — ${a} м, а ширина ${byK ? rel : `на ${k} м меньше`}.`, 'Найди периметр участка (в м).'],
            ['см', `Экран планшета — прямоугольник: длина ${a} см, а ширина ${byK ? rel : `на ${k} см меньше`}.`, 'Найди периметр экрана (в см).'],
            ['дм', `Длина прямоугольного стола — ${a} дм, ширина ${byK ? rel : `на ${k} дм меньше`}. Край стола окантовывают лентой.`, 'Сколько дециметров ленты нужно?'],
          ]);
          return {
            story: C[1], question: C[2], placeholder: C[0], answer: ans(P),
            figure: { type: 'rect', a, b, la: `${a} ${C[0]}`, lb: `? ${C[0]}`, grid: false },
            hints: ['Сначала найди ширину, потом обойди все четыре стороны.', `Ширина: ${byK ? `${a} : ${k}` : `${a} − ${k}`} = ${b} ${C[0]}. Сторон четыре.`],
            solution: `Ширина ${b} ${C[0]}; P = 2 · (${a} + ${b}) = ${P} ${C[0]}.`,
            wrongs: wr(P, { 'half-perimeter': a + b }),
            data: { kind, mode, a, b },
          };
        }
        let a, b; do { a = rnd(3, 20); b = rnd(2, 20); } while (a === b);
        const s = rnd(3, 30);
        const items = [
          { id: 'sq-rect', story: `ABCD — квадрат со стороной ${s} см.`, q: 'Можно ли назвать его прямоугольником?', w: 'square-not-rect' },
          { id: 'sq-rect', story: 'Шахматная доска — квадрат.', q: 'Является ли она прямоугольником?', w: 'square-not-rect' },
          { id: 'sq-rect', story: `У прямоугольника ABCD все стороны оказались по ${s} см.`, q: 'Это по-прежнему прямоугольник?', w: 'square-not-rect' },
          { id: 'perp', story: `Экран телефона — прямоугольник ${rnd(6, 8)} × ${rnd(14, 17)} см.`, q: 'Перпендикулярны ли его диагонали?', w: 'rect-diag-perp' },
          { id: 'perp', story: `Прямоугольник ${Math.max(a, b)} × ${Math.min(a, b)} см — не квадрат.`, q: 'Пересекаются ли его диагонали под прямым углом?', w: 'rect-diag-perp' },
          { id: 'perp', story: `Прямоугольная дверь ${rnd(19, 21)} × ${rnd(7, 9)} дм. Её диагонали провели мелом.`, q: 'Перпендикулярны ли эти диагонали?', w: 'rect-diag-perp' },
          { id: 'eq', story: `Прямоугольный лист бумаги ${Math.max(a, b)} × ${Math.min(a, b)} см.`, q: 'Равны ли его диагонали?' },
          { id: 'sq-perp', story: `Квадратная плитка со стороной ${s} см.`, q: 'Перпендикулярны ли её диагонали?' },
        ];
        const it = pick(items), right = it.id === 'perp' ? 'нет' : 'да';
        const H2 = {
          'sq-rect': ['Что значит «прямоугольник»? Какие у него углы?', 'Прямоугольник — четырёхугольник, у которого все углы прямые. Проверь это для квадрата.'],
          perp: ['Чем прямоугольник, который не квадрат, отличается от квадрата?', 'Представь очень длинный узкий прямоугольник и его диагонали: под каким углом они пересекаются?'],
          eq: ['Вспомни свойства диагоналей прямоугольника.', 'Диагонали прямоугольника равны и делятся точкой пересечения пополам.'],
          'sq-perp': ['Вспомни особые свойства квадрата.', 'Квадрат — прямоугольник с равными сторонами, и его диагонали ещё и перпендикулярны.'],
        }[it.id];
        const SOL = {
          'sq-rect': 'У квадрата все углы прямые, значит, он прямоугольник. Ответ: да.',
          perp: 'Прямоугольник не квадрат — его диагонали пересекаются не под прямым углом. Ответ: нет.',
          eq: 'Диагонали любого прямоугольника равны. Ответ: да.',
          'sq-perp': 'Диагонали квадрата перпендикулярны. Ответ: да.',
        }[it.id];
        return {
          story: it.story, question: it.q, accept: 'choice', choices: ['да', 'нет'], answer: right,
          hints: H2, solution: SOL,
          wrongs: it.w ? wc(right, { [it.w]: right === 'да' ? 'нет' : 'да' }) : {},
          data: { kind, item: it.id, a, b },
        };
      },
      verify(task) {
        const d = task.data, x = Number(task.answer);
        if (d.kind === 'diag') {
          if (d.mode === 'f2h') return same(x + x, d.given);
          if (d.mode === 'h2f') return same(x / 2, d.given);
          return same(x, d.given / 2 + d.given / 2 + d.s) && d.s < d.given;
        }
        if (d.kind === 'perim') {
          if (d.mode === 'sq') return same(x + x + x + x, d.P);
          if (d.mode === 'back') return same(2 * (d.a + x), d.P);
          return same(x, d.a + d.b + d.a + d.b);
        }
        // квадрат (все углы прямые) — прямоугольник; диагонали прямоугольника a × b перпендикулярны только при a = b
        const want = { 'sq-rect': true, perp: d.a === d.b, eq: true, 'sq-perp': true }[d.item];
        return task.answer === (want ? 'да' : 'нет');
      },
    },

    {
      id: 'g-circle', strand: SG, grade: 6, short: 'Окружность', title: 'Окружность и круг: радиус и диаметр',
      frp: ['Наглядные представления о фигурах на плоскости: окружность, круг', 'Изображение геометрических фигур на нелинованной бумаге с использованием циркуля, линейки'],
      goal: 'Различать радиус и диаметр и переходить от одного к другому.',
      requires: ['g5-segments'],
      explain: {
        model: 'Циркуль: иголка стоит в центре, грифель рисует окружность. Расстояние между ножками циркуля — радиус. Палка, которая проходит через центр от края до края, — диаметр: это два радиуса подряд.',
        figure: { type: 'circle_geo', r: 4, chord: false },
        figureCaption: 'Диаметр — два радиуса: d = 4 + 4 = 8',
        rule: '<ul class="rule-list"><li><b>Радиус r</b> — отрезок от центра до окружности.</li><li><b>Диаметр d</b> — отрезок через центр, от края до края: <b>d = r · 2</b>.</li><li>Значит, <b>r = d : 2</b>.</li></ul>',
        examples: [
          { q: 'Радиус колеса велосипеда — 35 см. Найди диаметр.', fig: { type: 'circle56', lr: '35 см', ld: '?' },
            choices: ['70 см', '35 см', '17,5 см'], correct: 0, wrong: { 1: 'r-is-d', 2: 'r-d-swap' },
            steps: ['Диаметр — два радиуса.', '35 · 2 = 70 см.'] },
          { q: 'Диаметр тарелки — 24 см. Какой у неё радиус?', fig: { type: 'circle56', lr: '?', ld: '24 см' },
            choices: ['12 см', '48 см'], correct: 0, wrong: { 1: 'r-d-swap' },
            steps: ['Радиус — половина диаметра.', '24 : 2 = 12 см.'] },
        ],
      },
      mistakes: [
        { id: 'r-d-swap', title: 'Путает, что больше: радиус или диаметр', kidName: 'Наоборотник',
          kidRule: 'ты думаешь, что радиус в 2 раза больше диаметра',
          say: 'Диаметр проходит через весь круг, а радиус — только от центра до края. Диаметр всегда в 2 раза больше радиуса.',
          fixIdea: 'Диаметр — два радиуса: d = r · 2, r = d : 2.',
          explainOptions: ['Диаметр — это два радиуса, он длиннее', 'Радиус длиннее диаметра', 'Радиус и диаметр равны'],
          conflicts: [{ text: 'Колесо радиусом 30 см. По твоему правилу диаметр 15 см — короче радиуса. Но диаметр проходит через центр от края до края, а радиус — только от центра до края.', ask: 'Что длиннее?', choices: ['радиус', 'диаметр'], right: 'диаметр', verify: () => 2 * 30 > 30, figure: { type: 'circle56', lr: '30 см', ld: '?' } }] },
        { id: 'r-is-d', title: 'Считает радиус и диаметр одинаковыми', kidName: 'Одинаковик',
          kidRule: 'ты считаешь, что радиус и диаметр — одно и то же',
          say: 'Радиус — от центра до края, диаметр — от края до края через центр. В диаметре два радиуса.',
          fixIdea: 'В диаметре помещаются два радиуса.',
          explainOptions: ['Диаметр — от края до края, в нём два радиуса', 'Радиус и диаметр — одно и то же', 'В диаметре три радиуса'],
          conflicts: [{ text: 'Радиус тарелки — 10 см. По твоему правилу диаметр тоже 10 см. Приложи линейку через центр: от края до центра 10 см и от центра до другого края ещё 10 см.', ask: 'Сколько сантиметров от края до края через центр?', choices: ['10', '20'], right: '20', verify: () => 10 + 10 === 20 }] },
      ],
      generate(lv) {
        const max = L3(lv, 20, 50, 200);
        const kind = pick(L3(lv, ['r2d', 'd2r'], ['r2d', 'd2r', 'row'], ['r2d', 'd2r', 'row', 'box']));
        if (kind === 'row') {
          const n = rnd(2, L3(lv, 2, 3, 5));
          const S = pick([
            [r => `В ряд вплотную друг к другу лежат ${n} ${pl(n, 'монета', 'одинаковые монеты', 'одинаковых монет')} радиусом ${r} мм.`, 'Какая длина у этого ряда (в мм)?', 'мм', 8, 15],
            [r => `На полку в ряд вплотную поставили ${n} ${pl(n, 'тарелку', 'одинаковые тарелки', 'одинаковых тарелок')} радиусом ${r} см.`, 'Какой длины должна быть полка (в см)?', 'см', 8, 16],
            [r => `В ряд вплотную положили ${n} ${pl(n, 'колесо', 'одинаковых колеса', 'одинаковых колёс')} радиусом ${r} см.`, 'Какая длина у этого ряда (в см)?', 'см', 10, L3(lv, 20, 30, 45)],
          ]);
          const r = rnd(S[3], S[4]), x = 2 * r * n;
          S[0] = S[0](r);
          return {
            story: S[0], question: S[1], placeholder: S[2],
            figure: { type: 'circle56', lr: `${r} ${S[2]}`, ld: null }, answer: ans(x),
            hints: ['Сколько места в длину занимает один круг?', `Один круг в длину — диаметр, ${2 * r} ${S[2]}. Кругов ${n}.`],
            solution: `d = ${r} · 2 = ${2 * r} ${S[2]}; ${2 * r} · ${n} = ${x} ${S[2]}.`,
            wrongs: wr(x, { 'r-is-d': r * n, 'r-d-swap': r * n / 2 }),
            data: { kind, r, n },
          };
        }
        if (kind === 'box') {
          const s = 2 * rnd(5, 25), x = s / 2;
          const S = pick([
            [`Круглая пицца лежит в квадратной коробке со стороной ${s} см и касается всех четырёх стенок.`, 'Какой радиус у пиццы (в см)?'],
            [`В квадрат со стороной ${s} см вписали круг — он касается всех сторон квадрата.`, 'Найди радиус круга (в см).'],
            [`Круглый торт стоит в квадратной коробке со стороной ${s} см вплотную к стенкам.`, 'Какой радиус у торта (в см)?'],
          ]);
          return {
            story: S[0], question: S[1], placeholder: 'см',
            figure: { type: 'grid56', w: 4, h: 4, grid: false, desc: `круг, вписанный в квадрат со стороной ${s} см`, polys: [{ pts: [[0, 0], [4, 0], [4, 4], [0, 4]] }], texts: [{ x: 2, y: 0, dy: 18, t: `${s} см` }], segs: [{ p: [0, 2, 4, 2], dash: true }], pts: [{ x: 2, y: 2, label: 'O', dx: 0, dy: -8 }], arcs: [{ x: 2, y: 2, ru: 2, a1: 0, a2: 359.9 }] },
            answer: ans(x),
            hints: ['Какая часть круга равна стороне квадрата: радиус или диаметр?', `Сторона квадрата — это диаметр круга, ${s} см. А радиус?`],
            solution: `Диаметр круга равен стороне квадрата: d = ${s} см; r = ${s} : 2 = ${x} см.`,
            wrongs: wr(x, { 'r-is-d': s, 'r-d-swap': 2 * s }),
            data: { kind, s },
          };
        }
        if (kind === 'd2r') {
          const S = pick([[d => `Диаметр круглого стола — ${d} см.`, 'см', 30, 90], [d => `Диаметр тарелки — ${d} мм.`, 'мм', 50, 150], [d => `Диаметр круглой клумбы — ${d} дм.`, 'дм', 2, 40], [d => `Диаметр монеты — ${d} мм.`, 'мм', 5, 15], [d => `Диаметр круглого пруда — ${d} м.`, 'м', 3, 200]].filter(c => c[2] < max));
          const r = rnd(S[2], Math.min(S[3], max)), d = 2 * r;
          S[0] = S[0](d);
          return {
            story: S[0], question: `Найди радиус (в ${S[1]}).`, placeholder: S[1],
            figure: { type: 'circle56', lr: '?', ld: `${d} ${S[1]}` }, answer: ans(r),
            hints: ['Что длиннее — радиус или диаметр?', `Радиус — половина диаметра: ${d} : 2.`],
            solution: `r = ${d} : 2 = ${r} ${S[1]}.`,
            wrongs: wr(r, { 'r-d-swap': 2 * d, 'r-is-d': d }),
            data: { kind, r, d },
          };
        }
        const S = pick([[r => `Радиус колеса — ${r} см.`, 'см', 10, 45], [r => `Циркуль раздвинули на ${r} мм и нарисовали окружность.`, 'мм', 5, 120], [r => `Радиус круглой клумбы — ${r} дм.`, 'дм', 2, 40], [r => `Радиус круглого пруда — ${r} м.`, 'м', 3, 200], [r => `Радиус арены цирка — ${r} м.`, 'м', 6, 7]].filter(c => c[2] < max));
        const r = rnd(S[2], Math.min(S[3], max)), d = 2 * r;
        S[0] = S[0](r);
        return {
          story: S[0], question: `Найди диаметр (в ${S[1]}).`, placeholder: S[1],
          figure: { type: 'circle56', lr: `${r} ${S[1]}`, ld: '?' }, answer: ans(d),
          hints: ['Сколько радиусов помещается в диаметре?', `Два радиуса: ${r} · 2.`],
          solution: `d = ${r} · 2 = ${d} ${S[1]}.`,
          wrongs: wr(d, { 'r-is-d': r, 'r-d-swap': r / 2 }),
          data: { kind, r, d },
        };
      },
      verify(task) {
        const d = task.data, x = Number(task.answer);
        if (d.kind === 'row') return same(x, (d.r + d.r) * d.n);
        if (d.kind === 'box') return same(x + x, d.s);
        if (d.kind === 'd2r') return same(x + x, d.d);
        return same(x / 2, d.r);
      },
    },

    {
      id: 'g6-circle-length', strand: SG, grade: 6, short: 'Длина и площадь', title: 'Длина окружности и площадь круга',
      frp: ['Приближённое измерение длины окружности, площади круга'],
      goal: 'Находить длину окружности и площадь круга по радиусу или диаметру, считая π ≈ 3,14.',
      requires: ['g-circle', 'd5-mult'],
      explain: {
        model: 'Обмотай нитку вокруг банки и измерь: нитка окажется примерно в 3,14 раза длиннее диаметра банки. Это число называют π («пи»). Для любой окружности — от монетки до колеса обозрения — длина больше диаметра примерно в 3,14 раза.',
        figure: { type: 'circle_geo', r: 5, chord: false },
        figureCaption: 'C = π · d = 2 · π · r; для r = 5: C ≈ 3,14 · 10 = 31,4',
        rule: '<ul class="rule-list"><li><b>Длина окружности:</b> C = π · d = 2 · π · r.</li><li><b>Площадь круга:</b> S = π · r · r = π · r<sup>2</sup>. В формуле площади — <b>радиус</b>, а не диаметр.</li><li>π ≈ 3,14. Если дан диаметр, а нужна площадь, сначала найди радиус: r = d : 2.</li><li>Длина — в см, м; площадь — в см², м². Длина — нитка вокруг, площадь — то, что внутри.</li></ul>',
        examples: [
          { q: 'Радиус колеса — 30 см. Какой путь оно проходит за один оборот? (π ≈ 3,14)', fig: { type: 'circle56', lr: '30 см', ld: null },
            choices: ['188,4 см', '94,2 см'], correct: 0, wrong: { 1: 'c-pi-r' },
            steps: ['За оборот колесо проходит длину своей окружности: C = 2 · π · r.', 'C ≈ 2 · 3,14 · 30 = 188,4 см.'] },
          { q: 'Найди площадь круга радиусом 10 см. (π ≈ 3,14)', fig: { type: 'circle56', lr: '10 см', ld: null, fill: true },
            choices: ['314 см²', '62,8 см²', '1256 см²'], correct: 0, wrong: { 1: 's-2pi-r', 2: 's-pi-d2' },
            steps: ['S = π · r · r.', 'S ≈ 3,14 · 10 · 10 = 314 см².'] },
        ],
      },
      mistakes: [
        { id: 'c-pi-r', title: 'Длина окружности как π · r (забывает умножить на 2)', kidName: 'Полкруга',
          kidRule: 'ты считаешь длину окружности как π · r — без двойки',
          say: 'C = π · d, а диаметр — это два радиуса. Если дан радиус, длина окружности C = 2 · π · r.',
          fixIdea: 'C = π · d = 2 · π · r: если дан радиус, не забудь умножить на 2.',
          explainOptions: ['В формуле стоит диаметр, а он равен двум радиусам', 'Длина окружности равна π · r', 'Длина окружности равна r · r'],
          conflicts: [{ text: 'Обмотай нитку вокруг колеса радиусом 1 м. Его диаметр 2 м, а нитка вокруг всегда примерно в 3,14 раза длиннее диаметра: около 6,28 м. По твоему правилу вышло 3,14 · 1 = 3,14 м — нитка всего в полтора раза длиннее диаметра.', ask: 'Во сколько раз длина окружности больше диаметра?', choices: ['примерно в 3,14 раза', 'примерно в 1,57 раза'], right: 'примерно в 3,14 раза', verify: () => Math.abs(3.14 * 1 / 2 - 1.57) < 1e-9 }],
          root: 'g-circle' },
        { id: 's-pi-d2', title: 'В формуле площади берёт диаметр вместо радиуса', kidName: 'Раздувайка',
          kidRule: 'ты подставляешь в формулу площади круга диаметр вместо радиуса',
          say: 'S = π · r · r — здесь радиус. Если взять диаметр, площадь выйдет в 4 раза больше настоящей.',
          fixIdea: 'В формуле S = π · r² только радиус. Дан диаметр — сначала раздели его на 2.',
          explainOptions: ['В формуле площади радиус, а диаметр вдвое больше — площадь вышла в 4 раза больше', 'В формуле площади всегда диаметр', 'Площадь круга равна π · d'],
          conflicts: [{ text: 'Круг диаметром 2 см помещается в квадрат 2 × 2 см, площадь которого 4 см². По твоему правилу площадь круга 3,14 · 2 · 2 = 12,56 см² — больше, чем у квадрата, в который он влез.', ask: 'Может круг быть больше квадрата, в котором лежит?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 3.14 * 2 * 2 > 2 * 2 && 3.14 * 1 * 1 < 4 }],
          root: 'g-circle' },
        { id: 's-2pi-r', title: 'Путает площадь круга с длиной окружности (S = 2πr)', kidName: 'Ниточник',
          kidRule: 'ты считаешь площадь круга по формуле длины окружности 2 · π · r',
          say: '2 · π · r — это длина окружности, нитка вокруг. Площадь — сколько места внутри: S = π · r · r.',
          fixIdea: 'Длина: C = 2 · π · r (в см). Площадь: S = π · r · r (в см²).',
          explainOptions: ['2πr — это длина окружности, а площадь — π · r · r', 'Площадь и длина окружности считаются одинаково', 'Площадь круга равна π · d'],
          conflicts: [{ text: 'Круг радиусом 10 см почти заполняет квадрат 20 × 20 см — это 400 см². По твоему правилу его площадь 2 · 3,14 · 10 = 62,8 см² — меньше шестой части квадрата.', ask: 'Похоже, что круг занимает меньше шестой части квадрата?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => Math.abs(2 * 3.14 * 10 - 62.8) < 1e-9 && 3.14 * 100 > 400 / 6 }],
          root: 'g-area' },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['Cr', 'Cd', 'Sr'], ['Cr', 'Cd', 'Sr', 'Sd'], ['Cr', 'Sr', 'Sd', 'rev', 'wheel']));
        const PI = 'Считай π ≈ 3,14.';
        // сюжет с реалистичным диапазоном [lo, hi]; число не больше предела уровня
        const ctx = (list, max) => { const c = pick(list.filter(x => x[3] <= max)); return [c, rnd(c[3], Math.min(c[4], max))]; };
        if (kind === 'Cr') {
          const [S0, r] = ctx([
            ['см', r => `Колесо самоката имеет радиус ${r} см.`, 'Какой путь оно проходит за один оборот (в см)?', 5, 12],
            ['м', r => `Круглую клумбу радиусом ${r} м обкладывают бордюром.`, 'Сколько метров бордюра нужно?', 1, 10],
            ['см', r => `Нарисовали окружность радиусом ${r} см.`, 'Найди её длину (в см).', 1, 50],
            ['м', r => `Пони на манеже ходит по кругу радиусом ${r} м.`, 'Какой путь пони проходит за один круг (в м)?', 5, 15],
          ], L3(lv, 10, 20, 50));
          const S = [S0[0], S0[1](r), S0[2]], C = H(628 * r);
          return {
            story: `${S[1]} ${PI}`, question: S[2], placeholder: S[0],
            figure: { type: 'circle56', lr: `${r} ${S[0]}`, ld: null }, answer: ans(C),
            hints: ['Длина окружности C = 2 · π · r = π · d.', `C ≈ 2 · 3,14 · ${r} = 6,28 · ${r}.`],
            solution: `C = 2 · π · r ≈ 2 · 3,14 · ${r} = ${num(C)} ${S[0]}.`,
            wrongs: wr(C, { 'c-pi-r': H(314 * r) }),
            data: { kind, r },
          };
        }
        if (kind === 'Cd') {
          const [S0, d] = ctx([
            ['м', d => `Диаметр арены цирка — ${d} м.`, 'Какова длина бортика вокруг арены (в м)?', 10, 15],
            ['см', d => `Торт диаметром ${d} см обвязывают лентой.`, 'Сколько сантиметров ленты нужно (без бантика)?', 14, 40],
            ['см', d => `Обруч имеет диаметр ${d} см.`, 'Найди длину обруча (в см).', 50, 99],
            ['м', d => `Круглый бассейн имеет диаметр ${d} м.`, 'Какова длина бортика бассейна (в м)?', 2, 30],
            ['см', d => `Окружность имеет диаметр ${d} см.`, 'Найди её длину (в см).', 2, 99],
          ], L3(lv, 10, 30, 99));
          const S = [S0[0], S0[1](d), S0[2]], C = H(314 * d);
          return {
            story: `${S[1]} ${PI}`, question: S[2], placeholder: S[0],
            figure: { type: 'circle56', lr: null, ld: `${d} ${S[0]}` }, answer: ans(C),
            hints: ['Длина окружности C = π · d.', `C ≈ 3,14 · ${d}.`],
            solution: `C = π · d ≈ 3,14 · ${d} = ${num(C)} ${S[0]}.`,
            wrongs: wr(C, { 'c-pi-r': H(157 * d) }),
            data: { kind, d },
          };
        }
        if (kind === 'Sr') {
          const [S0, r] = ctx([
            ['см', r => `Пицца имеет радиус ${r} см.`, 'Найди её площадь (в см²).', 10, 20],
            ['м', r => `Дождевальная установка поливает круг радиусом ${r} м.`, 'Какую площадь она поливает (в м²)?', 2, 20],
            ['дм', r => `Круглое зеркало имеет радиус ${r} дм.`, 'Найди площадь зеркала (в дм²).', 1, 6],
            ['см', r => `Круг имеет радиус ${r} см.`, 'Найди его площадь (в см²).', 1, 20],
          ], L3(lv, 6, 10, 20));
          const S = [S0[0], S0[1](r), S0[2]], Sq = H(314 * r * r);
          return {
            story: `${S[1]} ${PI}`, question: S[2], placeholder: `${S[0]}²`,
            figure: { type: 'circle56', lr: `${r} ${S[0]}`, ld: null, fill: true }, answer: ans(Sq),
            hints: ['Площадь круга S = π · r · r.', `S ≈ 3,14 · ${r} · ${r} = 3,14 · ${r * r}.`],
            solution: `S = π · r · r ≈ 3,14 · ${r} · ${r} = ${num(Sq)} ${S[0]}².`,
            wrongs: wr(Sq, { 's-2pi-r': H(628 * r), 's-pi-d2': H(314 * 4 * r * r) }),
            data: { kind, r },
          };
        }
        if (kind === 'Sd') {
          const [S0, r] = ctx([
            ['дм', d => `Круглый коврик имеет диаметр ${d} дм.`, 'Какую площадь пола он закрывает (в дм²)?', 3, 15],
            ['см', d => `Блин имеет диаметр ${d} см.`, 'Найди площадь блина (в см²).', 5, 15],
            ['м', d => `Круглая клумба имеет диаметр ${d} м.`, 'Найди площадь клумбы (в м²).', 1, 10],
          ], L3(lv, 5, 10, 15));
          const d = 2 * r, S = [S0[0], S0[1](d), S0[2]], Sq = H(314 * r * r);
          return {
            story: `${S[1]} ${PI}`, question: S[2], placeholder: `${S[0]}²`,
            figure: { type: 'circle56', lr: null, ld: `${d} ${S[0]}`, fill: true }, answer: ans(Sq),
            hints: ['В формуле площади S = π · r · r нужен радиус. Найди его по диаметру.', `r = ${d} : 2 = ${r} ${S[0]}; S ≈ 3,14 · ${r} · ${r}.`],
            solution: `r = ${d} : 2 = ${r} ${S[0]}; S ≈ 3,14 · ${r} · ${r} = ${num(Sq)} ${S[0]}².`,
            wrongs: wr(Sq, { 's-pi-d2': H(314 * d * d), 's-2pi-r': H(314 * d) }),
            data: { kind, d },
          };
        }
        if (kind === 'rev') {
          const askR = Math.random() < 0.4, d = askR ? 2 * rnd(1, 20) : rnd(2, 40), C = H(314 * d);
          const S = askR ? [`Длина окружности — ${num(C)} см.`, 'Найди её радиус (в см).', 'см']
            : pick([[`Длина обода колеса — ${num(C)} см.`, 'Найди диаметр колеса (в см).', 'см'], [`Чтобы один раз обмотать бочку верёвкой, понадобилось ${num(C)} дм верёвки.`, 'Какой диаметр у бочки (в дм)?', 'дм']]);
          const x = askR ? d / 2 : d;
          return {
            story: `${S[0]} ${PI}`, question: S[1], placeholder: S[2], answer: ans(x),
            hints: ['C = π · d, значит, d = C : π.', `d = ${num(C)} : 3,14.${askR ? ' А радиус — половина диаметра.' : ''}`],
            solution: `d = ${num(C)} : 3,14 = ${d} ${S[2]}${askR ? `; r = ${d} : 2 = ${x} ${S[2]}` : ''}.`,
            wrongs: wr(x, { 'c-pi-r': askR ? d : 2 * d }),
            data: { kind, C, askR },
          };
        }
        // wheel: путь за n оборотов
        const n = rnd(2, 10), scooter = Math.random() < 0.5, u = scooter ? 'см' : 'мм', r = scooter ? rnd(5, 12) : rnd(8, 30), Dst = H(628 * r * n);
        const S = scooter ? [`Колесо самоката радиусом ${r} см сделало ${n} ${pl(n, 'оборот', 'оборота', 'оборотов')}.`, 'Какое расстояние проехал самокат (в см)?']
          : [`Нитку наматывают на катушку радиусом ${r} мм. Сделали ${n} ${pl(n, 'оборот', 'оборота', 'оборотов')}.`, 'Сколько миллиметров нитки намоталось?'];
        return {
          story: `${S[0]} ${PI}`, question: S[1], placeholder: u,
          figure: { type: 'circle56', lr: `${r} ${u}`, ld: null }, answer: ans(Dst),
          hints: ['За один оборот проходится длина окружности: C = 2 · π · r.', `C ≈ 2 · 3,14 · ${r} = ${num(H(628 * r))} ${u}. Оборотов ${n}.`],
          solution: `C ≈ 2 · 3,14 · ${r} = ${num(H(628 * r))} ${u}; ${num(H(628 * r))} · ${n} = ${num(Dst)} ${u}.`,
          wrongs: wr(Dst, { 'c-pi-r': H(314 * r * n) }),
          data: { kind, r, n },
        };
      },
      verify(task) {
        const d = task.data, x = Number(task.answer), pi = 3.14, ok = v => Math.abs(x - v) < 1e-6;
        if (d.kind === 'Cr') return ok(pi * (d.r + d.r));
        if (d.kind === 'Cd') return ok(pi * d.d);
        if (d.kind === 'Sr') return ok(pi * d.r * d.r);
        if (d.kind === 'Sd') return ok(pi * (d.d / 2) ** 2);
        if (d.kind === 'rev') return Math.abs(pi * (d.askR ? 2 * x : x) - d.C) < 1e-6;
        return ok(pi * 2 * d.r * d.n);
      },
    },

    {
      id: 'g6-symmetry', strand: SG, grade: 6, short: 'Симметрия', title: 'Осевая и центральная симметрия',
      frp: ['Симметрия: центральная, осевая и зеркальная симметрии. Построение симметричных фигур'],
      goal: 'Находить координаты точки, симметричной данной относительно осей координат и начала координат, и оси симметрии фигур.',
      requires: ['z6-coords'],
      explain: {
        model: 'Поставь зеркало вдоль оси Ox: точка над осью отразится под осью на том же расстоянии. Влево-вправо она не сдвинется — абсцисса та же, а ордината меняет знак. А центральная симметрия — это поворот на 180° вокруг точки O: точка «перелетает» через O на другую сторону, и обе координаты меняют знак.',
        figure: { type: 'coord', points: [{ x: 3, y: 2, label: 'A' }, { x: 3, y: -2, label: 'B' }, { x: -3, y: -2, label: 'C' }] },
        figureCaption: 'B(3; −2) симметрична A(3; 2) относительно оси Ox, а C(−3; −2) — относительно точки O',
        rule: '<ul class="rule-list"><li>Относительно <b>оси Ox</b>: (x; y) → (x; −y) — знак меняет ордината.</li><li>Относительно <b>оси Oy</b>: (x; y) → (−x; y) — знак меняет абсцисса.</li><li>Относительно <b>начала координат O</b>: (x; y) → (−x; −y) — знак меняют обе координаты.</li><li><b>Ось симметрии</b> фигуры — прямая, по которой фигуру можно сложить так, чтобы половинки совпали. У прямоугольника (не квадрата) 2 оси, у квадрата — 4.</li></ul>',
        examples: [
          { q: 'Найди точку, симметричную A(4; −1) относительно оси Ox.', choices: ['(4; 1)', '(−4; −1)'], correct: 0, wrong: { 1: 'wrong-coord-sign' },
            steps: ['Зеркало — ось Ox: точка уходит «вверх-вниз», абсцисса не меняется.', 'Ордината меняет знак: −1 → 1. Ответ: (4; 1).'] },
          { q: 'Найди точку, симметричную B(−2; 5) относительно начала координат.', choices: ['(2; −5)', '(2; 5)'], correct: 0, wrong: { 1: 'central-one-sign' },
            steps: ['При центральной симметрии знак меняют обе координаты.', '(−2; 5) → (2; −5).'] },
          { q: 'Сколько осей симметрии у прямоугольника 4 × 6?', fig: { type: 'rect', a: 6, b: 4, la: '6', lb: '4' }, choices: ['2', '4'], correct: 0, wrong: { 1: 'rect-diag-axis' },
            steps: ['Сложи пополам вдоль и поперёк — половинки совпадут: 2 оси.', 'По диагонали половинки не совпадут — диагональ не ось симметрии.'] },
        ],
      },
      mistakes: [
        { id: 'wrong-coord-sign', title: 'Меняет знак не той координаты', kidName: 'Путаник осей',
          kidRule: 'ты при отражении в оси меняешь знак не у той координаты',
          say: 'При отражении в оси Ox точка уходит вверх-вниз — меняется ордината. При отражении в оси Oy точка уходит влево-вправо — меняется абсцисса.',
          fixIdea: 'Ось Ox — меняется y; ось Oy — меняется x. Знак меняет та координата, что отвечает за движение «через зеркало».',
          explainOptions: ['Отражение в оси Ox меняет ординату, а не абсциссу', 'При отражении в Ox всегда меняется абсцисса', 'При отражении знаки не меняются'],
          conflicts: [{ text: 'Точка A(3; 2) лежит над осью Ox. Её отражение в оси Ox должно оказаться под осью — значит, ордината станет отрицательной. По твоему правилу вышло (−3; 2) — точка снова над осью, только с другой стороны от Oy.', ask: 'Где должно быть отражение A в оси Ox?', choices: ['над осью Ox', 'под осью Ox'], right: 'под осью Ox', verify: () => 2 > 0 && -2 < 0, figure: { type: 'coord', points: [{ x: 3, y: 2, label: 'A' }, { x: -3, y: 2, label: '?' }] } }],
          root: 'z6-coords' },
        { id: 'central-one-sign', title: 'При центральной симметрии меняет знак только одной координаты', kidName: 'Полуповорот',
          kidRule: 'ты при симметрии относительно начала координат меняешь знак только у одной координаты',
          say: 'Симметрия относительно точки O — поворот на 180°: точка уходит и влево-вправо, и вверх-вниз. Знак меняют обе координаты.',
          fixIdea: 'Относительно O: (x; y) → (−x; −y) — обе координаты меняют знак.',
          explainOptions: ['Поворот на 180° меняет знаки обеих координат', 'Знак меняется только у абсциссы', 'Знаки не меняются, координаты меняются местами'],
          conflicts: [{ text: 'Центральная симметрия — поворот на 180° вокруг O. Точка A(4; 1) справа вверху должна попасть влево вниз. По твоему правилу вышло (−4; 1) — влево, но всё ещё вверху.', ask: 'Куда попадает A при повороте на 180° вокруг O?', choices: ['влево вверх', 'влево вниз'], right: 'влево вниз', verify: () => -4 < 0 && -1 < 0, figure: { type: 'coord', points: [{ x: 4, y: 1, label: 'A' }, { x: -4, y: -1, label: 'B' }] } }],
          root: 'z6-integers' },
        { id: 'rect-diag-axis', title: 'Считает диагонали прямоугольника осями симметрии', kidName: 'Диагональщик',
          kidRule: 'ты думаешь, что у прямоугольника 4 оси симметрии, считая и диагонали',
          say: 'Сложи прямоугольный лист по диагонали — половинки не совпадут, уголки торчат. У прямоугольника, который не квадрат, только 2 оси: вдоль и поперёк.',
          fixIdea: 'Ось симметрии — линия сгиба, при котором половинки совпадают. Диагональ прямоугольника такой линией не является.',
          explainOptions: ['При сгибе по диагонали половинки прямоугольника не совпадают', 'Любая линия через центр — ось симметрии', 'У любого четырёхугольника 4 оси'],
          conflicts: [{ text: 'Сложи прямоугольный лист бумаги по диагонали — уголки будут торчать, половинки не совпадут. По твоему правилу диагональ — ось симметрии.', ask: 'Совпали половинки при сгибе по диагонали?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => true }] },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['num', 'choice', 'axes'], ['num', 'num', 'choice', 'axes'], ['num', 'num', 'choice', 'axes']));
        const M = L3(lv, 6, 9, 15), nz = () => rnd(1, M) * pick([1, -1]);
        const AX = { Ox: 'относительно оси абсцисс (Ox)', Oy: 'относительно оси ординат (Oy)', O: 'относительно начала координат — точки O' };
        const RULE = { Ox: 'При симметрии относительно оси Ox абсцисса остаётся, а ордината меняет знак.', Oy: 'При симметрии относительно оси Oy ордината остаётся, а абсцисса меняет знак.', O: 'При симметрии относительно начала координат обе координаты меняют знак.' };
        const img = (ax, x, y) => (ax === 'Ox' ? [x, -y] : ax === 'Oy' ? [-x, y] : [-x, -y]);
        if (kind === 'num' || kind === 'choice') {
          const x = nz(), y = nz(), ax = pick(['Ox', 'Oy', 'O']), [bx, by] = img(ax, x, y);
          const S = pick([
            `Отмечена точка A${pt(x, y)}. Точка B симметрична ей ${AX[ax]}.`,
            `В компьютерной игре герой стоит в точке A${pt(x, y)}. Второй герой стоит в точке B, симметричной A ${AX[ax]}.`,
            `Муха сидит в точке A${pt(x, y)}. Паук сидит в точке B, симметричной A ${AX[ax]}.`,
          ]);
          if (kind === 'num') {
            const askX = Math.random() < 0.5, x0 = askX ? bx : by;
            // неверное правило: оси — меняет знак другой координаты; центр — меняет знак только одной (спрошенная остаётся)
            const wrongImg = ax === 'Ox' ? [-x, y] : ax === 'Oy' ? [x, -y] : null;
            const w = wrongImg ? (askX ? wrongImg[0] : wrongImg[1]) : null;
            return {
              story: S, question: askX ? 'Найди абсциссу точки B (её первую координату).' : 'Найди ординату точки B (её вторую координату).',
              figure: { type: 'coord', points: [{ x, y, label: 'A' }] }, answer: ans(x0), placeholder: askX ? 'x' : 'y',
              hints: [RULE[ax], `Сейчас ${askX ? 'абсцисса' : 'ордината'} точки A равна ${num(askX ? x : y)}. Меняет ли она знак при этой симметрии?`],
              solution: `B${pt(bx, by)}. ${askX ? 'Абсцисса' : 'Ордината'} B равна ${num(x0)}.`,
              wrongs: wr(x0, { 'wrong-coord-sign': w, 'central-one-sign': ax === 'O' ? (askX ? x : y) : null }),
              data: { kind, x, y, ax, askX },
            };
          }
          const right = pt(bx, by);
          let wrongP, other;
          if (ax === 'O') { wrongP = Math.random() < 0.5 ? pt(-x, y) : pt(x, -y); other = pt(-y, -x); }
          else { wrongP = ax === 'Ox' ? pt(-x, y) : pt(x, -y); other = pt(-x, -y); }
          const ch = [...new Set([right, wrongP, other])];
          return {
            story: S, question: 'Какие координаты у точки B?', accept: 'choice',
            figure: { type: 'coord', points: [{ x, y, label: 'A' }] }, choices: shuffle(ch), answer: right,
            hints: [RULE[ax], 'Отметь точку A на рисунке и представь, куда она попадёт.'],
            solution: `${RULE[ax]} A${pt(x, y)} → B${right}.`,
            wrongs: wc(right, ax === 'O' ? { 'central-one-sign': wrongP } : { 'wrong-coord-sign': wrongP }),
            data: { kind, x, y, ax },
          };
        }
        // axes: число осей симметрии
        const shape = pick(['rect', 'rect', 'rect', 'square', 'equi', 'iso']);
        let a, b; do { a = rnd(3, 12); b = rnd(2, 10); } while (a <= b);
        const N = { rect: 2, square: 4, equi: 3, iso: 1 }[shape];
        const C = {
          rect: pick([[`Прямоугольник ${a} × ${b} см.`, { type: 'rect', a, b, la: `${a} см`, lb: `${b} см`, grid: false }], ['Футбольное поле — прямоугольник 100 × 64 м (разметку не учитываем).', { type: 'rect', a: 100, b: 64, la: '100 м', lb: '64 м' }], ['Лист бумаги — прямоугольник 21 × 30 см.', { type: 'rect', a: 30, b: 21, la: '30 см', lb: '21 см' }], ['Дверь — прямоугольник 200 × 80 см (ручку не учитываем).', { type: 'rect', a: 80, b: 200, la: '80 см', lb: '200 см' }]]),
          square: pick([['Квадратная салфетка без узора.', { type: 'rect', a: 5, b: 5, la: '', lb: '', grid: false }], [`Квадрат со стороной ${a} см.`, { type: 'rect', a, b: a, la: `${a} см`, lb: `${a} см`, grid: false }]]),
          equi: [['Знак «Уступи дорогу» — равносторонний треугольник (надписи не учитываем).', { type: 'tri56', A: 60, B: 60, al: ['', '', ''] }]][0],
          iso: [['Фронтон крыши — равнобедренный треугольник, но не равносторонний.', { type: 'tri56', A: 35, B: 35, al: ['', '', ''] }]][0],
        }[shape];
        return {
          story: C[0], question: 'Сколько у этой фигуры осей симметрии?', figure: C[1], answer: ans(N), placeholder: 'осей',
          hints: ['Ось симметрии — прямая, по которой фигуру можно сложить так, чтобы половинки совпали.', shape === 'rect' ? 'Сложи прямоугольник пополам вдоль и поперёк. А по диагонали — совпадут ли половинки?' : shape === 'square' ? 'Квадрат можно сложить пополам вдоль, поперёк и по каждой диагонали.' : shape === 'equi' ? 'Через каждую вершину равностороннего треугольника и середину противоположной стороны.' : 'Сложи треугольник через вершину между равными сторонами.'],
          solution: { rect: 'У прямоугольника две оси: через середины противоположных сторон. Диагонали — не оси. Ответ: 2.', square: 'У квадрата 4 оси: две через середины сторон и две по диагоналям. Ответ: 4.', equi: 'У равностороннего треугольника 3 оси — по одной через каждую вершину. Ответ: 3.', iso: 'У равнобедренного (не равностороннего) треугольника одна ось — через вершину между равными сторонами. Ответ: 1.' }[shape],
          wrongs: wr(N, { 'rect-diag-axis': shape === 'rect' ? 4 : null }),
          data: { kind, shape, a: C[1].type === 'rect' ? C[1].a : null, b: C[1].type === 'rect' ? C[1].b : null },
        };
      },
      verify(task) {
        const d = task.data;
        if (d.kind === 'axes') {
          // сгибы прямоугольника: две средние линии — всегда оси; диагональ переводит вершину (a; 0) в (0; a),
          // а та лежит на прямоугольнике a × b, только если a = b
          if (d.shape === 'rect' || d.shape === 'square') return (d.shape === 'square') === (d.a === d.b) && isAns(task, 2 + (d.a === d.b ? 2 : 0));
          return isAns(task, d.shape === 'equi' ? 3 : 1);
        }
        // отражение как умножение на ±1; поворот на 180° — косинус 180° = −1
        const kx = d.ax === 'Oy' || d.ax === 'O' ? Math.round(Math.cos(Math.PI)) : 1, ky = d.ax === 'Ox' || d.ax === 'O' ? Math.round(Math.cos(Math.PI)) : 1;
        const bx = kx * d.x, by = ky * d.y;
        if (d.kind === 'num') return isAns(task, d.askX ? bx : by);
        return task.answer === pt(bx, by);
      },
    },

    {
      id: 'g6-solids', strand: SG, grade: 6, short: 'Тела', title: 'Призма, пирамида, цилиндр, конус, шар',
      frp: ['Наглядные представления о пространственных фигурах: параллелепипед, куб, призма, пирамида, конус, цилиндр, шар и сфера', 'Примеры развёрток многогранников, цилиндра и конуса'],
      goal: 'Различать призму и пирамиду, считать их вершины, рёбра и грани и узнавать тело по развёртке.',
      requires: ['g5-nets'],
      explain: {
        model: 'Карандаш — призма: у него два одинаковых шестиугольных торца-основания и шесть граней-прямоугольников по бокам. Египетская пирамида — пирамида: внизу одно основание-квадрат, а все боковые грани-треугольники сходятся в одной вершине наверху. Банка — цилиндр, рожок мороженого — конус, мяч — шар.',
        figure: { type: 'solid56', kind: 'prism', n: 6 },
        figureCaption: 'Шестиугольная призма: 12 вершин, 18 рёбер, 8 граней',
        rule: '<ul class="rule-list"><li><b>Призма</b>: два одинаковых основания-многоугольника и боковые грани-прямоугольники. У n-угольной призмы 2 · n вершин, 3 · n рёбер, n + 2 грани.</li><li><b>Пирамида</b>: одно основание-многоугольник и боковые грани-треугольники с общей вершиной. У n-угольной пирамиды n + 1 вершина, 2 · n рёбер, n + 1 грань.</li><li>Считая грани, не забудь основания.</li><li><b>Цилиндр</b> (развёртка — прямоугольник и два круга), <b>конус</b> (круг и сектор), <b>шар</b> — круглые тела.</li></ul>',
        examples: [
          { q: 'Сколько вершин у треугольной призмы (как у палатки)?', fig: { type: 'solid56', kind: 'prism', n: 3 },
            choices: ['6', '4'], correct: 0, wrong: { 1: 'prism-pyramid-swap' },
            steps: ['У призмы два основания-треугольника.', 'В каждом по 3 вершины: 3 · 2 = 6.'] },
          { q: 'Сколько граней у четырёхугольной пирамиды?', fig: { type: 'solid56', kind: 'pyramid', n: 4 },
            choices: ['5', '4'], correct: 0, wrong: { 1: 'forgot-bases' },
            steps: ['Боковых граней-треугольников 4.', 'И ещё основание-квадрат: 4 + 1 = 5.'] },
        ],
      },
      mistakes: [
        { id: 'prism-pyramid-swap', title: 'Путает призму и пирамиду', kidName: 'Пирамизма',
          kidRule: 'ты путаешь призму и пирамиду и считаешь одну по правилам другой',
          say: 'У призмы два одинаковых основания и боковые грани-прямоугольники. У пирамиды основание одно, а боковые грани-треугольники сходятся в одной вершине.',
          fixIdea: 'Призма — два основания (как карандаш). Пирамида — одно основание и вершина наверху.',
          explainOptions: ['У призмы два основания, у пирамиды — одно и вершина наверху', 'Призма и пирамида — одно и то же', 'У пирамиды два основания'],
          conflicts: [{ text: 'Треугольная пирамида (как пакет «тетрапак») — 4 вершины: три внизу и одна наверху. Треугольная призма (как палатка) — 6 вершин: по три в двух основаниях. По твоему правилу у них одинаковое строение.', ask: 'У какого тела два основания?', choices: ['у призмы', 'у пирамиды'], right: 'у призмы', verify: () => 2 * 3 === 6 && 3 + 1 === 4 }] },
        { id: 'forgot-bases', title: 'Считая грани, забывает основания', kidName: 'Бездонка',
          kidRule: 'ты считаешь только боковые грани и забываешь про основания',
          say: 'Основания — тоже грани. У призмы к боковым граням прибавь два основания, у пирамиды — одно.',
          fixIdea: 'Грани = боковые грани + основания: у призмы n + 2, у пирамиды n + 1.',
          explainOptions: ['Основания — тоже грани, их надо прибавить', 'Грани — только боковые стенки', 'Основания считают как рёбра'],
          conflicts: [{ text: 'Коробку-кубик красят со всех сторон: 4 боковые стенки, а ещё верх и низ. По твоему правилу граней у куба 4 — тогда дно и крышка остались бы некрашеными.', ask: 'Сколько граней у куба?', choices: ['4', '6'], right: '6', verify: () => 4 + 2 === 6 }],
          root: 'g5-nets' },
      ],
      generate(lv) {
        const kind = pick(L3(lv, ['count', 'count', 'net', 'name'], ['count', 'count', 'wire', 'net', 'name'], ['count', 'count', 'wire', 'net']));
        const cnt = (s, n) => (s === 'prism' ? { v: 2 * n, e: 3 * n, f: n + 2 } : { v: n + 1, e: 2 * n, f: n + 1 });
        const other = s => (s === 'prism' ? 'pyramid' : 'prism');
        const nm = s => (s === 'prism' ? 'призмы' : 'пирамиды');
        if (kind === 'count') {
          const OBJ = [
            ['prism', 3, 'Туристическая палатка имеет форму треугольной призмы.'], ['prism', 6, 'Карандаш без заточки — шестиугольная призма.'],
            ['prism', 4, 'Брусок имеет форму четырёхугольной призмы.'], ['prism', 5, 'Коробка конфет имеет форму пятиугольной призмы.'],
            ['prism', 8, 'Подарочная коробка имеет форму восьмиугольной призмы.'], ['pyramid', 4, 'Египетская пирамида — четырёхугольная пирамида.'],
            ['pyramid', 3, 'Пакет молока «тетрапак» имеет форму треугольной пирамиды.'], ['pyramid', 8, 'Крыша башни — восьмиугольная пирамида.'],
            ['pyramid', 6, 'Крыша беседки — шестиугольная пирамида.'], ['pyramid', 5, 'Ёлочная игрушка имеет форму пятиугольной пирамиды.'],
          ];
          let s, n, story;
          if (lv === 3 && Math.random() < 0.4) { s = pick(['prism', 'pyramid']); n = pick([7, 9, 10, 12]); story = `Дана ${NG[n]} ${s === 'prism' ? 'призма' : 'пирамида'}.`; }
          else { [s, n, story] = pick(lv === 1 ? OBJ.filter(o => o[1] <= 4) : OBJ); }
          const what = pick(['v', 'e', 'f']), c = cnt(s, n), x = c[what], co = cnt(other(s), n);
          const word = { v: 'вершин', e: 'рёбер', f: 'граней' }[what];
          const h2 = s === 'prism'
            ? { v: `В каждом основании ${n} ${pl(n, 'вершина', 'вершины', 'вершин')}, а оснований два.`, e: `${n} ${pl(n, 'ребро', 'ребра', 'рёбер')} у нижнего основания, ${n} — у верхнего и ${n} боковых.`, f: `${n} ${pl(n, 'боковая грань', 'боковые грани', 'боковых граней')} и ещё два основания.` }[what]
            : { v: `${n} ${pl(n, 'вершина', 'вершины', 'вершин')} в основании и ещё одна наверху.`, e: `${n} ${pl(n, 'ребро', 'ребра', 'рёбер')} у основания и ${n} боковых.`, f: `${n} ${pl(n, 'боковая грань', 'боковые грани', 'боковых граней')}-треугольников и основание.` }[what];
          return {
            story, question: `Сколько ${word} у этой ${nm(s)}?`, placeholder: word,
            figure: { type: 'solid56', kind: s, n }, answer: ans(x),
            hints: [s === 'prism' ? 'У призмы два одинаковых основания — снизу и сверху — и боковые грани-прямоугольники.' : 'У пирамиды одно основание и вершина наверху, где сходятся боковые рёбра.', h2],
            solution: `${{ v: s === 'prism' ? `${n} · 2` : `${n} + 1`, e: s === 'prism' ? `${n} + ${n} + ${n}` : `${n} + ${n}`, f: s === 'prism' ? `${n} + 2` : `${n} + 1` }[what]} = ${x} ${pl(x, ...{ v: ['вершина', 'вершины', 'вершин'], e: ['ребро', 'ребра', 'рёбер'], f: ['грань', 'грани', 'граней'] }[what])}.`,
            wrongs: wr(x, { 'prism-pyramid-swap': co[what], 'forgot-bases': what === 'f' ? n : null }),
            data: { kind, s, n, what },
          };
        }
        if (kind === 'wire') {
          const s = pick(['prism', 'pyramid']), n = pick([3, 4, 5, 6]), a = rnd(2, L3(lv, 10, 15, 25)), E = cnt(s, n).e, x = E * a;
          return {
            story: `Из проволоки сделали каркас ${NGG[n]} ${nm(s)}, все рёбра которой равны ${a} см.`, question: 'Сколько сантиметров проволоки ушло?', placeholder: 'см',
            figure: { type: 'solid56', kind: s, n }, answer: ans(x),
            hints: [`Сколько рёбер у ${NGG[n]} ${nm(s)}?`, s === 'prism' ? `У призмы ${n} + ${n} + ${n} = ${E} рёбер.` : `У пирамиды ${n} + ${n} = ${E} рёбер.`],
            solution: `Рёбер ${E}, каждое по ${a} см: ${E} · ${a} = ${x} см.`,
            wrongs: wr(x, { 'prism-pyramid-swap': cnt(other(s), n).e * a }),
            data: { kind, s, n, a },
          };
        }
        const CH = ['призма', 'пирамида', 'цилиндр', 'конус'];
        if (kind === 'net') {
          const POLY = { 3: ['треугольников', 'треугольника'], 4: ['квадратов', 'квадрата'], 5: ['пятиугольников', 'пятиугольника'], 6: ['шестиугольников', 'шестиугольника'] };
          const t = pick(['prism', 'pyramid', 'prism', 'pyramid', 'cyl', 'cone']), n = pick([3, 4, 5, 6]);
          const desc = {
            prism: `Она состоит из двух одинаковых ${POLY[n][0]} и ${n} ${pl(n, 'прямоугольника', 'прямоугольников', 'прямоугольников')}.`,
            pyramid: n === 3 ? 'Она состоит из 4 треугольников: один в середине, а к каждой его стороне приложено ещё по треугольнику.' : `Она состоит из одного ${POLY[n][1]} и ${n} ${pl(n, 'треугольника', 'треугольников', 'треугольников')}, приложенных к его сторонам.`,
            cyl: 'Она состоит из прямоугольника и двух одинаковых кругов.',
            cone: 'Она состоит из круга и куска другого круга — сектора, похожего на кусок пиццы.',
          }[t];
          const right = { prism: 'призма', pyramid: 'пирамида', cyl: 'цилиндр', cone: 'конус' }[t];
          return {
            story: `${pick(['Маша вырезала из картона развёртку.', 'На уроке технологии сделали развёртку.', 'Для модели вырезали развёртку.'])} ${desc}`,
            question: 'Какое тело можно из неё склеить?', accept: 'choice', choices: CH, answer: right,
            hints: ['Сколько в развёртке оснований: два одинаковых, одно или они круглые?', { prism: 'Два одинаковых основания и боковые прямоугольники — так устроена…', pyramid: 'Одно основание и треугольники, которые сойдутся в одной вершине, — так устроена…', cyl: 'Два круга — основания, прямоугольник свернётся в трубку.', cone: 'Круг — основание, сектор свернётся в «рожок».' }[t]],
            solution: { prism: 'Два одинаковых основания и боковые грани-прямоугольники — это призма.', pyramid: 'Одно основание и боковые треугольники с общей вершиной — это пирамида.', cyl: 'Прямоугольник сворачивается в боковую поверхность, круги — основания: цилиндр.', cone: 'Сектор сворачивается в «рожок», круг — основание: конус.' }[t],
            wrongs: wc(right, { 'prism-pyramid-swap': t === 'prism' ? 'пирамида' : t === 'pyramid' ? 'призма' : null }),
            data: { kind, t },
          };
        }
        // name: тело по описанию
        const IT = [
          { d: 'У тела два одинаковых основания-многоугольника, а все боковые грани — прямоугольники.', a: 'призма', w: 'пирамида', ch: ['призма', 'пирамида', 'цилиндр'] },
          { d: 'У тела одно основание-многоугольник, а все боковые грани — треугольники с общей вершиной.', a: 'пирамида', w: 'призма', ch: ['призма', 'пирамида', 'конус'] },
          { d: 'Палатка: пол — прямоугольник, спереди и сзади — одинаковые треугольники, по бокам — два ската-прямоугольника.', a: 'призма', w: 'пирамида', ch: ['призма', 'пирамида', 'конус'] },
          { d: 'Консервная банка.', a: 'цилиндр', ch: ['цилиндр', 'конус', 'шар'] },
          { d: 'Вафельный рожок для мороженого.', a: 'конус', ch: ['цилиндр', 'конус', 'шар'] },
          { d: 'Футбольный мяч.', a: 'шар', ch: ['цилиндр', 'конус', 'шар'] },
        ];
        const it = pick(IT);
        return {
          story: it.d, question: 'Какое это тело?', accept: 'choice', choices: it.ch, answer: it.a,
          hints: ['Сколько у тела оснований и какой они формы? Есть ли вершина, где всё сходится?', 'Два одинаковых основания — призма или цилиндр; одно основание и вершина — пирамида или конус; совсем без оснований — шар.'],
          solution: `Это ${it.a}.`,
          wrongs: it.w ? wc(it.a, { 'prism-pyramid-swap': it.w }) : {},
          data: { kind, idx: IT.indexOf(it), a: it.a },
        };
      },
      verify(task) {
        const d = task.data;
        if (d.kind === 'count' || d.kind === 'wire') {
          // вершины и грани по строению, рёбра — по формуле Эйлера: В − Р + Г = 2
          const v = d.s === 'prism' ? d.n + d.n : d.n + 1, f = d.s === 'prism' ? d.n + 2 : d.n + 1, e = v + f - 2;
          if (d.kind === 'wire') return isAns(task, e * d.a);
          return isAns(task, { v, e, f }[d.what]);
        }
        if (d.kind === 'net') return task.answer === { prism: 'призма', pyramid: 'пирамида', cyl: 'цилиндр', cone: 'конус' }[d.t];
        return task.answer === ['призма', 'пирамида', 'призма', 'цилиндр', 'конус', 'шар'][d.idx];
      },
    },
  ];

  K.course({ id: 'g56', grade: 5, title: 'Наглядная геометрия, 5–6 класс', topics });
})();
