/* =========================================================
   Курс g7: геометрия, 7 класс.
   Опора: ФРП «Математика. 5–9 классы (базовый уровень)», курс «Геометрия»,
   7 класс: смежные и вертикальные углы, биссектриса; сумма углов треугольника
   и внешний угол; равнобедренный треугольник; признаки равенства;
   параллельные прямые и секущая; прямоугольный треугольник, угол 30°;
   неравенство треугольника; окружность, касательная, вписанная и описанная.
   Ошибки — классические, описанные в методике: «смежные углы равны»,
   «вертикальные в сумме 180°», «сумма углов треугольника 360°»,
   «равенство по трём углам», «односторонние углы равны», «катет против 30° —
   не тот», «треугольник есть при c = a + b», «R = гипотенуза» и т. п.
   Тексты — черновик на вычитку методисту.
   Свои рисунки: rays7, tri7, par7, tan7, pair7, sticks7, ssa7.
   Формат — docs/content-spec.md.
   ========================================================= */
(function () {
  'use strict';
  const K = window.VEKTOR_KIT, V = window.VEKTOR_VISUALS;
  const { rnd, pick, shuffle, L3, pl, num, ans } = K.h;
  const SG = 'Геометрия';

  /* ---------- Общие помощники ---------- */
  const RAD = Math.PI / 180;
  const same = (a, b) => Math.abs(a - b) < 1e-6;
  const isAns = (task, v) => same(Number(task.answer), v);
  const deg = x => num(x) + '°';
  const inDeg = s => s.replace(/([.?])$/, ' (в градусах)$1');
  // неверные ответы-числа: совпавшие с верным и «не числа» отбрасываем
  const wr = (right, m) => { const o = {}; for (const [k, v] of Object.entries(m)) if (v != null && Number.isFinite(v) && v > 0 && !same(v, right)) o[k] = ans(v); return o; };
  // неверные ответы-варианты
  const wc = (right, m) => { const o = {}; for (const [k, v] of Object.entries(m)) if (v != null && v !== right) o[k] = v; return o; };
  // целый угол из [lo, hi] с шагом step, проходящий проверку ok
  function pickAng(lo, hi, step, ok = () => true) {
    for (let i = 0; i < 2000; i++) { const x = step * rnd(Math.ceil(lo / step), Math.floor(hi / step)); if (ok(x)) return x; }
    throw new Error('g7: не подобрать угол');
  }
  const times = k => `${k} ${pl(k, 'раз', 'раза', 'раз')}`;
  // угол между векторами (в градусах)
  const angBetween = (u, v) => Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v))))) / RAD;
  const sub2 = (p, q) => [p[0] - q[0], p[1] - q[1]];

  /* ---------- Рисунки курса ---------- */
  const esc = V.esc || (s => String(s));
  const q1 = n => Math.round(n * 10) / 10;
  const txt = (x, y, s, anchor = 'middle') => `<text x="${q1(x)}" y="${q1(y + 4.5)}" text-anchor="${anchor}" fill="currentColor" stroke="none" font-size="13">${esc(s)}</text>`;
  const seg = (p, r, extra = '') => `<line x1="${q1(p[0])}" y1="${q1(p[1])}" x2="${q1(r[0])}" y2="${q1(r[1])}"${extra}/>`;
  const dot = p => `<circle cx="${q1(p[0])}" cy="${q1(p[1])}" r="3" fill="currentColor" stroke="none"/>`;
  // экранные координаты (y вниз), углы — против часовой стрелки, как в математике
  const at = (c, d, r) => [c[0] + r * Math.cos(d * RAD), c[1] - r * Math.sin(d * RAD)];
  const dirTo = (p, r) => Math.atan2(p[1] - r[1], r[0] - p[0]) / RAD;
  const n360 = d => ((d % 360) + 360) % 360;
  function arc(c, d1, d2, r) { const s = n360(d2 - d1), p = at(c, d1, r), e = at(c, d1 + s, r); return `<path d="M${q1(p[0])} ${q1(p[1])}A${r} ${r} 0 ${s > 180 ? 1 : 0} 0 ${q1(e[0])} ${q1(e[1])}"/>`; }
  function angLabel(c, d1, d2, s, r, cap = 84) {
    const sp = n360(d2 - d1), rl = Math.min(cap, 84, Math.max(r + 16, 17 / Math.sin(Math.max(8, Math.min(sp, 180)) / 2 * RAD)));
    const p = at(c, d1 + sp / 2, rl); return txt(p[0], p[1], s);
  }
  function mark(c, d1, d2, t, r = 22, n = 1, cap = 84) { const k = Math.max(1, n); let s = ''; for (let i = 0; i < k; i++) s += arc(c, d1, d2, r + 4 * i); return s + (t ? angLabel(c, d1, d2, t, r + 4 * (k - 1), Math.max(cap, r + 4 * (k - 1) + 14)) : ''); }
  function rightMark(c, d1, d2, s = 11) { const p = at(c, d1, s), e = at(c, d2, s), m = [p[0] + e[0] - c[0], p[1] + e[1] - c[1]]; return `<path d="M${q1(p[0])} ${q1(p[1])}L${q1(m[0])} ${q1(m[1])}L${q1(e[0])} ${q1(e[1])}"/>`; }
  function ticks(p, r, n) {
    if (!n) return '';
    const L = Math.hypot(r[0] - p[0], r[1] - p[1]), u = [(r[0] - p[0]) / L, (r[1] - p[1]) / L], nv = [-u[1], u[0]], m = [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2];
    let s = ''; for (let k = 0; k < n; k++) { const o = (k - (n - 1) / 2) * 5, c = [m[0] + u[0] * o, m[1] + u[1] * o]; s += seg([c[0] - nv[0] * 6, c[1] - nv[1] * 6], [c[0] + nv[0] * 6, c[1] + nv[1] * 6]); }
    return s;
  }
  // направление «свободного места» среди лучей — туда ставим подпись точки
  function freeDir(dirs) {
    const d = dirs.map(n360).sort((a, b) => a - b); if (!d.length) return 270;
    let best = 0, mid = 270; for (let i = 0; i < d.length; i++) { const a = d[i], b = i + 1 < d.length ? d[i + 1] : d[0] + 360; if (b - a > best) { best = b - a; mid = (a + b) / 2; } }
    return mid;
  }
  const SVG = (w, h, label, body) => V.svgWrap(w, h, label, `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g>`);
  const said = s => (s === '?' ? 'неизвестен' : String(s));
  const fin = (...xs) => xs.every(v => typeof v === 'number' && Number.isFinite(v));
  const SIDE_OF = d => ['справа', 'справа сверху', 'сверху', 'слева сверху', 'слева', 'слева снизу', 'снизу', 'справа снизу'][Math.round(n360(d) / 45) % 8];

  // Лучи с общим началом: { rays: [градусы], names?, o?, kind?: 'cross'|'adj'|'bis', arcs: [{ a, b, t, r?, n? }] } — дуга от луча a до луча b против часовой
  function raysDesc(f) {
    const o = f.o || 'O', nm = i => (f.names && f.names[i]) || '';
    const head = f.kind === 'cross' ? 'две прямые пересекаются' : f.kind === 'adj' ? 'развёрнутый угол разделён лучом' : `лучи с общим началом${f.o ? ' ' + f.o : ''}`;
    return head + (f.arcs || []).filter(a => a.t).map(a => {
      const name = nm(a.a) && nm(a.b) ? `угол ${nm(a.a)}${o}${nm(a.b)}` : `угол ${SIDE_OF(f.rays[a.a] + n360(f.rays[a.b] - f.rays[a.a]) / 2)}`;
      return `; ${name} — ${said(a.t)}`;
    }).join('');
  }
  V.register('rays7', {
    describe: raysDesc,
    render(f) {
      const rays = f.rays;
      if (!Array.isArray(rays) || !rays.length || rays.length > 8 || !rays.every(d => fin(d))) return '';
      const half = rays.every(d => d >= 0 && d <= 180), H = half ? 164 : 240, c = half ? [150, 136] : [150, 120], L = half ? 112 : 96;
      let b = rays.map(d => seg(c, at(c, d, L))).join('');
      for (const a of f.arcs || []) { if (!fin(rays[a.a], rays[a.b])) return ''; b += mark(c, rays[a.a], rays[a.b], a.t || '', a.r || 22, a.n || 1); }
      rays.forEach((d, i) => { const s = f.names && f.names[i]; if (s) { const p = at(c, d, L + 13); b += txt(p[0], p[1], s); } });
      b += dot(c);
      if (f.o) { const p = half ? [c[0], c[1] + 16] : at(c, freeDir(rays), 17); b += txt(p[0], p[1], f.o); }
      return SVG(300, H, raysDesc(f), b);
    },
  });

  // Треугольник по углам: { ang: [A, B, C] (форма), names?, labels?, am? (число дуг), right?, sides?, ticks?, ext?: [{ at, t, name? }],
  //   circle?: 'in'|'out', cname?, cev?: [{ from, kind: 'mid'|'foot'|'bis'|'center', name?, t?, side? }] }
  // Вершины: 0 — левая нижняя, 1 — правая нижняя, 2 — верхняя. Стороны: 0 = (0,1), 1 = (1,2), 2 = (2,0).
  function triBase(ang) {
    if (!Array.isArray(ang) || !fin(ang[0], ang[1])) return null;
    const [A, B] = ang, C = 180 - A - B; if (!(A > 0 && B > 0 && C > 0)) return null;
    const k = Math.sin(B * RAD) / Math.sin(C * RAD); return [[0, 0], [1, 0], [k * Math.cos(A * RAD), k * Math.sin(A * RAD)]];
  }
  // углы для рисунка: слишком острые углы чуть расширяем (рисунок схематичный), прямой угол не трогаем
  function dispAng(ang, keep) {
    if (!Array.isArray(ang) || !fin(ang[0], ang[1])) return ang;
    const a = [ang[0], ang[1], 180 - ang[0] - ang[1]], MIN = 26;
    if (Math.min(...a) >= MIN || Math.min(...a) <= 0) return a;
    const low = a.map((x, i) => x < MIN && i !== keep), need = a.reduce((p, x, i) => p + (low[i] ? MIN - x : 0), 0);
    const free = a.map((x, i) => (!low[i] && i !== keep ? x - MIN : 0)), fs = free.reduce((p, x) => p + x, 0);
    if (fs <= need) return a;
    return a.map((x, i) => (low[i] ? MIN : i === keep ? x : x - need * free[i] / fs));
  }
  const EXT_FROM = [1, 0, 0]; // внешний угол при вершине i: продолжаем сторону EXT_FROM[i] → i за вершину i
  function circumOf(P) {
    const [[ax, ay], [bx, by], [cx, cy]] = P, d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    return { c: [ux, uy], r: Math.hypot(ax - ux, ay - uy) };
  }
  function inOf(P) {
    const a = Math.hypot(P[1][0] - P[2][0], P[1][1] - P[2][1]), b = Math.hypot(P[0][0] - P[2][0], P[0][1] - P[2][1]), c = Math.hypot(P[0][0] - P[1][0], P[0][1] - P[1][1]), s = a + b + c;
    const I = [(a * P[0][0] + b * P[1][0] + c * P[2][0]) / s, (a * P[0][1] + b * P[1][1] + c * P[2][1]) / s];
    const area = Math.abs((P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1])) / 2;
    return { c: I, r: 2 * area / s };
  }
  function cevEnd(P, e, circ) {
    const i = e.from, j = (i + 1) % 3, k = (i + 2) % 3, A = P[i], B = P[j], C = P[k];
    if (e.kind === 'mid') return [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2];
    if (e.kind === 'center') return circ ? circ.c : null;
    if (e.kind === 'bis') { const lb = Math.hypot(...sub2(B, A)), lc = Math.hypot(...sub2(C, A)), t = lb / (lb + lc); return [B[0] + (C[0] - B[0]) * t, B[1] + (C[1] - B[1]) * t]; }
    if (e.kind === 'foot') { const u = sub2(C, B), t = ((A[0] - B[0]) * u[0] + (A[1] - B[1]) * u[1]) / (u[0] * u[0] + u[1] * u[1]); return [B[0] + u[0] * t, B[1] + u[1] * t]; }
    return null;
  }
  const VERT_WORD = ['левой нижней', 'правой нижней', 'верхней'];
  function triDesc(f) {
    const N = f.names || null, vn = i => (N ? N[i] : VERT_WORD[i] + ' вершине');
    const sn = i => (N ? N[i] + N[(i + 1) % 3] : ['нижняя сторона', 'правая сторона', 'левая сторона'][i]);
    let s = `треугольник${N ? ' ' + N.join('') : ''}`;
    if (f.right != null && f.right >= 0) s += `, прямой угол при ${N ? 'вершине ' : ''}${vn(f.right)}`;
    (f.labels || []).forEach((t, i) => { if (t) s += `; угол при ${N ? 'вершине ' : ''}${vn(i)} — ${said(t)}`; });
    (f.sides || []).forEach((t, i) => { if (t) s += `; ${N ? 'сторона ' : ''}${sn(i)} — ${said(t)}`; });
    if ((f.ticks || []).some(Boolean)) s += '; равные стороны отмечены чёрточками';
    for (const e of f.ext || []) s += `; внешний угол при ${N ? 'вершине ' : ''}${vn(e.at)}${e.t ? ' — ' + said(e.t) : ''}`;
    if (f.circle) s += `; ${f.circle === 'in' ? 'вписанная' : 'описанная'} окружность${f.cname ? ' с центром ' + f.cname : ''}`;
    for (const e of f.cev || []) s += `; ${{ mid: 'медиана', foot: 'высота', bis: 'биссектриса', center: 'отрезок к центру окружности' }[e.kind]} из ${N ? 'вершины ' + N[e.from] : VERT_WORD[e.from].replace(/ой$/, 'ей') + ' вершины'}${e.name ? ' ' + (N ? N[e.from] : '') + e.name : ''}${e.t ? ', отмеченный угол — ' + said(e.t) : ''}`;
    return s;
  }
  V.register('tri7', {
    describe: triDesc,
    render(f) {
      const P0 = triBase(dispAng(f.ang, f.right)); if (!P0) return '';
      const pts = P0.slice();
      const ext = (f.ext || []).map(e => {
        const i = e.at, j = EXT_FROM[i]; if (![0, 1, 2].includes(i)) return null;
        const v = sub2(P0[i], P0[j]), L = Math.hypot(...v), E = [P0[i][0] + v[0] / L * 0.45, P0[i][1] + v[1] / L * 0.45]; pts.push(E); return Object.assign({}, e, { E });
      });
      if (ext.includes(null)) return '';
      const circ = f.circle === 'out' ? circumOf(P0) : f.circle === 'in' ? inOf(P0) : null;
      if (circ) pts.push([circ.c[0] - circ.r, circ.c[1] - circ.r], [circ.c[0] + circ.r, circ.c[1] + circ.r]);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
      const fitW = (f.sides || []).some(Boolean) ? 196 : 232, s = Math.min(fitW / (maxx - minx), 170 / Math.max(1e-6, maxy - miny)), H = Math.round((maxy - miny) * s + 64);
      const T = p => [150 + (p[0] - (minx + maxx) / 2) * s, H - 32 - (p[1] - miny) * s];
      const P = P0.map(T), G = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3];
      let b = `<path d="M${P.map(p => q1(p[0]) + ' ' + q1(p[1])).join('L')}Z"/>`;
      if (circ) { const c = T(circ.c); b += `<circle cx="${q1(c[0])}" cy="${q1(c[1])}" r="${q1(circ.r * s)}" stroke-width="1.5"/>` + dot(c) + (f.cname ? txt(c[0] + 11, c[1] - 10, f.cname) : ''); }
      for (let i = 0; i < 3; i++) b += ticks(P[i], P[(i + 1) % 3], (f.ticks || [])[i] || 0);
      const inner = i => { let d1 = dirTo(P[i], P[(i + 1) % 3]), d2 = dirTo(P[i], P[(i + 2) % 3]); if (n360(d2 - d1) > 180) [d1, d2] = [d2, d1]; return [d1, d2]; };
      for (let i = 0; i < 3; i++) {
        const [d1, d2] = inner(i), t = (f.labels || [])[i] || '', n = (f.am || [])[i] || 0;
        if (f.right === i) b += rightMark(P[i], d1, d2) + (t ? angLabel(P[i], d1, d2, t, 14) : '');
        else if (t || n) b += mark(P[i], d1, d2, t, 20, n, 0.42 * Math.min(Math.hypot(...sub2(P[(i + 1) % 3], P[i])), Math.hypot(...sub2(P[(i + 2) % 3], P[i]))));
      }
      for (const e of ext) {
        const i = e.at, E = T(e.E), k = 3 - i - EXT_FROM[i]; b += seg(P[i], E);
        let d1 = dirTo(P[i], E), d2 = dirTo(P[i], P[k]); if (n360(d2 - d1) > 180) [d1, d2] = [d2, d1];
        b += mark(P[i], d1, d2, e.t || '', 24);
        if (e.name) { const u = sub2(E, P[i]), L = Math.hypot(...u); b += txt(E[0] + u[0] / L * 11, E[1] + u[1] / L * 11, e.name); }
      }
      for (const e of f.cev || []) {
        if (![0, 1, 2].includes(e.from)) return '';
        const X0 = cevEnd(P0, e, circ); if (!X0) return '';
        const X = T(X0), A = P[e.from]; b += seg(A, X);
        if (e.kind === 'foot') { const j = (e.from + 1) % 3; b += rightMark(X, dirTo(X, A), dirTo(X, P[j]), 8); }
        if (e.name) { const u = sub2(X, A), L = Math.hypot(...u); b += txt(X[0] + u[0] / L * 13, X[1] + u[1] / L * 13, e.name); }
        if (e.t && e.side != null) { let d1 = dirTo(A, P[e.side]), d2 = dirTo(A, X); if (n360(d2 - d1) > 180) [d1, d2] = [d2, d1]; b += mark(A, d1, d2, e.t, 30); }
      }
      (f.sides || []).forEach((t, i) => {
        if (!t) return; const p = P[i], r = P[(i + 1) % 3], busy = (f.cev || []).some(e => e.from === (i + 2) % 3 && e.kind !== 'center') || (f.circle === 'out' && f.right === (i + 2) % 3), k = busy ? 0.27 : 0.5, m = [p[0] + (r[0] - p[0]) * k, p[1] + (r[1] - p[1]) * k], L = Math.hypot(...sub2(r, p));
        let nv = [-(r[1] - p[1]) / L, (r[0] - p[0]) / L]; if (nv[0] * (G[0] - m[0]) + nv[1] * (G[1] - m[1]) > 0) nv = [-nv[0], -nv[1]];
        b += txt(m[0] + nv[0] * 12, m[1] + nv[1] * 12, t, nv[0] > 0.35 ? 'start' : nv[0] < -0.35 ? 'end' : 'middle');
      });
      if (f.names) P.forEach((p, i) => { const u = sub2(p, G), L = Math.hypot(...u); b += txt(p[0] + u[0] / L * 15, p[1] + u[1] / L * 15, f.names[i]); });
      return SVG(300, H, triDesc(f), b);
    },
  });

  // Две параллельные прямые a, b и секущая c: { deg — угол «вправо-вверх» секущей, labels: [{ p: 1..8, t }], par? }
  // Нумерация углов: у прямой a — 1 сверху справа, 2 сверху слева, 3 снизу слева, 4 снизу справа; у прямой b — 5, 6, 7, 8 так же.
  const PAR_POS = ['сверху справа', 'сверху слева', 'снизу слева', 'снизу справа'];
  const parDesc = f => (f.par === false ? 'прямые a и b пересечены секущей c' : 'параллельные прямые a и b пересечены секущей c') +
    (f.labels || []).map(l => `; угол у прямой ${l.p <= 4 ? 'a' : 'b'} ${PAR_POS[(l.p - 1) % 4]} от секущей — ${said(l.t)}`).join('');
  V.register('par7', {
    describe: parDesc,
    render(f) {
      if (!fin(f.deg) || f.deg <= 0 || f.deg >= 180) return '';
      const th = Math.min(140, Math.max(40, f.deg)), ya = 78, yb = 163, t = (yb - ya) / Math.sin(th * RAD), dx = Math.cos(th * RAD) * t;
      const Pp = [150 + dx / 2, ya], Qp = [150 - dx / 2, yb], e = 60 / Math.sin(th * RAD), top = at(Pp, th, e), bot = at(Qp, th + 180, e);
      let b = seg([14, ya], [286, ya]) + seg([14, yb], [286, yb]) + seg(top, bot);
      b += txt(280, ya - 12, 'a') + txt(280, yb - 12, 'b') + txt(top[0] - 12, top[1] + 6, 'c');
      const dirs = [0, th, 180, 180 + th, 360];
      for (const l of f.labels || []) { if (!(l.p >= 1 && l.p <= 8)) return ''; const k = (l.p - 1) % 4; b += mark(l.p <= 4 ? Pp : Qp, dirs[k], dirs[k + 1], l.t || '', 17); }
      return SVG(300, 236, parDesc(f), b);
    },
  });

  // Касательная: окружность с центром O, A — точка касания, B — на касательной. { deg = ∠AOB, two?, lab: { AOB, ABO, ABC, AOC }, right?, sides: { OA, AB, BC } }
  const tanDesc = f => `окружность с центром O, ${f.two ? 'из точки B проведены касательные BA и BC' : 'прямая AB касается окружности в точке A'}, проведены ${f.two ? 'радиусы OA, OC и отрезок OB' : 'радиус OA и отрезок OB'}` +
    Object.entries(f.lab || {}).filter(([, t]) => t).map(([k, t]) => `; угол ${k} — ${said(t)}`).join('') + Object.entries(f.sides || {}).filter(([, t]) => t).map(([k, t]) => `; ${k} — ${said(t)}`).join('');
  V.register('tan7', {
    describe: tanDesc,
    render(f) {
      if (!fin(f.deg) || f.deg <= 0 || f.deg >= 90) return '';
      const al = Math.min(66, Math.max(50, f.deg)), O = [80, 112], r = 52, B = [O[0] + r / Math.cos(al * RAD), O[1]], A = at(O, al, r), C = at(O, -al, r);
      let b = `<circle cx="${O[0]}" cy="${O[1]}" r="${r}"/>` + seg(O, A) + seg(O, B) + dot(O);
      b += seg(at(A, 90 + al, 42), at(B, 270 + al, f.two ? 26 : 30));
      if (f.two) b += seg(at(C, 270 - al, 42), at(B, 90 - al, 26)) + seg(O, C);
      const L = f.lab || {};
      if (L.AOB) b += mark(O, 0, al, L.AOB, 14, 1, 30);
      if (L.AOC) b += mark(O, -al, al, L.AOC, 14, 1, 30);
      if (L.ABO) b += mark(B, 90 + al, 180, L.ABO, 14, 1, 30);
      if (L.ABC) b += mark(B, 90 + al, 270 - al, L.ABC, 16, 1, 32);
      if (f.right) b += rightMark(A, 180 + al, 270 + al, 10);
      const S = f.sides || {}, mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      if (S.OA) { const m = mid(O, A), p = at(m, al + 90, 12); b += txt(p[0], p[1], S.OA); }
      if (S.AB) { const m = mid(A, B), p = at(m, al, 13); b += txt(p[0], p[1], S.AB); }
      if (S.BC && f.two) { const m = mid(C, B), p = at(m, -al, 13); b += txt(p[0], p[1], S.BC); }
      const pA = at(O, al, r + 13), pB = at(B, freeDir(f.two ? [180, 90 + al, 270 - al, 270 + al, 90 - al] : [180, 90 + al, 270 + al]), 15);
      b += txt(pA[0], pA[1], 'A') + txt(pB[0], pB[1], 'B') + txt(O[0] - 8, O[1] + 15, 'O');
      if (f.two) { const pC = at(O, -al, r + 13); b += txt(pC[0], pC[1], 'C'); }
      return SVG(300, 214, tanDesc(f), b);
    },
  });

  // Два треугольника с отметками равных элементов: { ang, n1, n2, st: [чёрточки на сторонах], an: [дуги в углах], k? — масштаб второго }
  function pairDesc(f) {
    const n1 = f.n1 || ['A', 'B', 'C'], n2 = f.n2 || ['K', 'L', 'M'], eq = [];
    (f.st || []).forEach((k, i) => { if (k) eq.push(`${n1[i]}${n1[(i + 1) % 3]} = ${n2[i]}${n2[(i + 1) % 3]}`); });
    (f.an || []).forEach((k, i) => { if (k) eq.push(`угол ${n1[i]} = угол ${n2[i]}`); });
    return `два треугольника ${n1.join('')} и ${n2.join('')}${eq.length ? '; отмечены равные элементы: ' + eq.join(', ') : ''}`;
  }
  V.register('pair7', {
    describe: pairDesc,
    render(f) {
      const P0 = triBase(dispAng(f.ang)); if (!P0) return '';
      const n1 = f.n1 || ['A', 'B', 'C'], n2 = f.n2 || ['K', 'L', 'M'], k2 = fin(f.k) && f.k > 0.2 && f.k <= 1 ? f.k : 1;
      const xs = P0.map(p => p[0]), ys = P0.map(p => p[1]), mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = Math.min(...ys);
      const s = Math.min(98 / (Math.max(...xs) - Math.min(...xs)), 100 / (Math.max(...ys) - my)), H = 172;
      const place = (cx, sc) => P0.map(p => [cx + (p[0] - mx) * sc, H - 34 - (p[1] - my) * sc]);
      let b = '';
      for (const [P, N] of [[place(76, s), n1], [place(226, s * k2), n2]]) {
        const G = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3];
        b += `<path d="M${P.map(p => q1(p[0]) + ' ' + q1(p[1])).join('L')}Z"/>`;
        for (let i = 0; i < 3; i++) {
          b += ticks(P[i], P[(i + 1) % 3], (f.st || [])[i] || 0);
          const n = (f.an || [])[i] || 0;
          if (n) { let d1 = dirTo(P[i], P[(i + 1) % 3]), d2 = dirTo(P[i], P[(i + 2) % 3]); if (n360(d2 - d1) > 180) [d1, d2] = [d2, d1]; b += mark(P[i], d1, d2, '', 13, n); }
          const u = sub2(P[i], G), L = Math.hypot(...u); b += txt(P[i][0] + u[0] / L * 14, P[i][1] + u[1] / L * 14, N[i]);
        }
      }
      return SVG(300, H, pairDesc(f), b);
    },
  });

  // Палочки: { lens: [a, b, c], unit? } — складывается ли из них треугольник
  function sticksDesc(f) {
    const L = (f.lens || []).slice().sort((x, y) => x - y), u = f.unit ? ' ' + f.unit : '';
    return `палочки ${L.map(num).join(', ')}${u}` + (L[0] + L[1] > L[2] ? ': из них сложен треугольник' : L[0] + L[1] === L[2] ? ': две короткие ложатся на длинную без зазора — получается отрезок' : ': две короткие не дотягиваются друг до друга');
  }
  V.register('sticks7', {
    describe: sticksDesc,
    render(f) {
      const L = (f.lens || []).slice().sort((x, y) => x - y); if (L.length !== 3 || !L.every(x => fin(x) && x > 0)) return '';
      const [a, b, c] = L, u = f.unit ? ' ' + f.unit : '';
      if (a + b > c) {
        const x = (a * a - b * b + c * c) / (2 * c), y = Math.sqrt(Math.max(0, a * a - x * x)), s = Math.min(230 / c, 120 / Math.max(y, 1e-6)), H = Math.round(y * s + 60);
        const P = [150 - c * s / 2, H - 32], Q = [150 + c * s / 2, H - 32], R = [P[0] + x * s, H - 32 - y * s];
        let body = `<path d="M${q1(P[0])} ${q1(P[1])}L${q1(Q[0])} ${q1(Q[1])}L${q1(R[0])} ${q1(R[1])}Z" stroke-width="4"/>`;
        body += txt(150, H - 14, num(c) + u) + txt((P[0] + R[0]) / 2 - 16, (P[1] + R[1]) / 2, num(a) + u, 'end') + txt((Q[0] + R[0]) / 2 + 16, (Q[1] + R[1]) / 2, num(b) + u, 'start');
        return SVG(300, H, sticksDesc(f), body);
      }
      const s = 240 / c, x0 = 30, x1 = 270, y0 = 84, y1 = 58;
      let body = `<g stroke-width="5">${seg([x0, y0], [x1, y0])}${seg([x0, y1], [x0 + a * s, y1])}${seg([x1 - b * s, y1], [x1, y1])}</g>`;
      body += seg([x0, y1], [x0, y0], ' stroke-dasharray="3 3"') + seg([x1, y1], [x1, y0], ' stroke-dasharray="3 3"');
      body += txt(150, y0 + 18, num(c) + u) + txt(x0 + a * s / 2, y1 - 16, num(a) + u) + txt(x1 - b * s / 2, y1 - 16, num(b) + u);
      return SVG(300, 116, sticksDesc(f), body);
    },
  });

  // Две стороны и угол не между ними: { A — угол, ab — сторона угла, bc — отрезок из B до другой стороны угла }
  function ssaPts(f) {
    if (!fin(f.A, f.ab, f.bc) || f.A <= 0 || f.A >= 90) return null;
    const h = f.ab * Math.sin(f.A * RAD), dx = f.ab * Math.cos(f.A * RAD); if (!(f.bc > h && f.bc < f.ab)) return null;
    const w = Math.sqrt(f.bc * f.bc - h * h); return { B: [dx, h], c1: dx - w, c2: dx + w };
  }
  const ssaDesc = f => `угол A = ${num(f.A)}°, на одной его стороне AB = ${num(f.ab)}; из точки B до другой стороны угла проведены два отрезка BC₁ и BC₂ по ${num(f.bc)}`;
  V.register('ssa7', {
    describe: ssaDesc,
    render(f) {
      const g = ssaPts(f); if (!g) return '';
      const s = Math.min(230 / (g.c2 * 1.12), 110 / g.B[1]), H = Math.round(g.B[1] * s + 62), T = p => [36 + p[0] * s, H - 34 - p[1] * s];
      const A = T([0, 0]), B = T(g.B), C1 = T([g.c1, 0]), C2 = T([g.c2, 0]), E = T([g.c2 * 1.12, 0]);
      let b = seg(A, E) + seg(A, B) + seg(B, C1) + seg(B, C2, ' stroke-dasharray="6 4"') + ticks(B, C1, 1) + ticks(B, C2, 1);
      b += mark(A, 0, f.A, deg(f.A), 22) + txt(A[0] - 10, A[1] + 6, 'A') + txt(B[0], B[1] - 13, 'B') + txt(C1[0], C1[1] + 15, 'C₁') + txt(C2[0], C2[1] + 15, 'C₂');
      return SVG(300, H, ssaDesc(f), b);
    },
  });

  /* ---------- Фигуры-заготовки ---------- */
  const ADJ = (a, l1, l2, names) => ({ type: 'rays7', kind: 'adj', rays: [0, a, 180], names: names || null, o: names ? 'O' : '', arcs: [{ a: 0, b: 1, t: l1 }, { a: 1, b: 2, t: l2, r: 28 }] });
  const CROSS = (d, labels) => ({ type: 'rays7', kind: 'cross', rays: [0, d, 180, 180 + d], arcs: labels.map((t, i) => (t == null ? 0 : { a: i, b: (i + 1) % 4, t })).filter(Boolean) });
  const ISO = ['A', 'C', 'B']; // равнобедренный: основание AC, вершина B

  /* =========================================================
     1. Смежные и вертикальные углы
     ========================================================= */
  const angles = {
    id: 'g7-angles', strand: SG, short: 'Смежные углы', title: 'Смежные и вертикальные углы',
    frp: ['Вертикальные и смежные углы', 'Биссектриса угла'],
    goal: 'Находить смежные и вертикальные углы и углы, которые получаются при проведении биссектрисы.',
    requires: ['g-angles', 'g5-angle-types'],
    explain: {
      model: 'Раскрой ножницы: лезвия и ручки — это две пересекающиеся прямые. Угол между лезвиями и угол между ручками раскрываются одинаково — это вертикальные углы, они равны. А угол между лезвием и ручкой рядом с ним вместе с углом между лезвиями составляет прямую линию, 180°, — это смежные углы.',
      figure: CROSS(40, ['40°', '140°', '40°', '140°']),
      figureCaption: 'Вертикальные углы равны: 40° и 40°. Смежные вместе дают 180°: 40° + 140° = 180°',
      rule: '<ul class="rule-list"><li><b>Смежные углы</b>: одна сторона общая, а две другие лежат на одной прямой. <b>Сумма смежных углов — 180°.</b></li><li><b>Вертикальные углы</b> стоят друг напротив друга при пересечении двух прямых. <b>Вертикальные углы равны.</b></li><li><b>Биссектриса</b> делит пополам <b>свой</b> угол — тот, внутри которого она проходит.</li></ul>',
      examples: [
        { q: 'Один из смежных углов равен 65°. Найди другой.', fig: ADJ(65, '65°', '?'),
          choices: ['115°', '65°'], correct: 0, wrong: { 1: 'adjacent-equal' },
          steps: ['Смежные углы вместе образуют развёрнутый угол — 180°.', '180° − 65° = 115°.'] },
        { q: 'Две прямые пересекаются, один из углов — 50°. Найди угол, вертикальный с ним.', fig: CROSS(50, ['50°', null, '?', null]),
          choices: ['50°', '130°'], correct: 0, wrong: { 1: 'vertical-sum-180' },
          steps: ['Вертикальные углы стоят напротив друг друга — они равны.', 'Ответ: 50°. А соседний, смежный угол был бы 180° − 50° = 130°.'] },
        { q: '∠AOB и ∠BOC — смежные, ∠BOC = 70°. Луч OD — биссектриса угла AOB. Найди ∠AOD.',
          fig: { type: 'rays7', kind: 'bis', rays: [0, 70, 125, 180], names: ['C', 'B', 'D', 'A'], o: 'O', arcs: [{ a: 0, b: 1, t: '70°' }, { a: 1, b: 2, t: '', r: 30 }, { a: 2, b: 3, t: '?', r: 30 }] },
          choices: ['55°', '35°'], correct: 0, wrong: { 1: 'bisector-wrong-angle' },
          steps: ['Биссектриса OD делит угол AOB, а не BOC. Сначала найдём ∠AOB: 180° − 70° = 110°.', 'Половина: 110° : 2 = 55°.'] },
      ],
    },
    mistakes: [
      { id: 'adjacent-equal', title: 'Считает смежные углы равными', kidName: 'Копировщик',
        kidRule: 'ты считаешь соседние, смежные углы равными и просто переписываешь данный угол',
        say: 'Смежные углы вместе составляют развёрнутый угол — прямую линию. Они равны, только если оба по 90°. Вычти данный угол из 180°.',
        fixIdea: 'Смежные углы вместе дают 180°: другой угол = 180° − данный.',
        explainOptions: ['Смежные углы вместе образуют развёрнутый угол, поэтому их сумма 180°', 'Смежные углы равны, потому что у них общая сторона', 'Смежные углы равны, потому что стоят рядом'],
        conflicts: [{ text: 'Один из смежных углов — 30°. По твоему правилу другой тоже 30°. Но вместе они должны дать прямую линию — развёрнутый угол 180°, а 30° + 30° = 60°.', ask: 'Может другой угол быть 30°?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 30 + 30 !== 180, figure: ADJ(30, '30°', '?') }],
        root: 'g-angles' },
      { id: 'vertical-sum-180', title: 'Считает, что вертикальные углы в сумме дают 180°', kidName: 'Дополняшка',
        kidRule: 'ты думаешь, что вертикальные углы вместе дают 180°, как смежные',
        say: 'Вертикальные углы стоят напротив друг друга — как угол между лезвиями и угол между ручками ножниц. Они равны. 180° в сумме дают соседние, смежные углы.',
        fixIdea: 'Вертикальные углы равны; до 180° дополняют друг друга только смежные.',
        explainOptions: ['Оба вертикальных угла смежны с одним и тем же углом, поэтому они равны', 'Вертикальные углы лежат на одной прямой, поэтому вместе дают 180°', 'Вертикальные углы равны, только если прямые перпендикулярны'],
        conflicts: [{ text: 'Две прямые пересеклись, один угол — 40°. По твоему правилу вертикальный с ним угол равен 180° − 40° = 140°. Но угол 40° и вертикальный с ним угол оба смежны с одним и тем же углом 140°. Значит, каждый из них равен 180° − 140° = 40°.', ask: 'Чему равен вертикальный угол?', choices: ['40°', '140°'], right: '40°', verify: () => 180 - (180 - 40) === 40, figure: CROSS(40, ['40°', '140°', '?', null]) }],
        root: 'g5-angle-types' },
      { id: 'bisector-wrong-angle', title: 'Делит пополам не тот угол: данный, а не тот, где проведена биссектриса', kidName: 'Половинщик',
        kidRule: 'ты делишь пополам данный угол, хотя биссектриса проведена в соседнем, смежном угле',
        say: 'Биссектриса делит пополам только свой угол. Посмотри, между какими лучами она проходит, найди этот угол целиком и только потом раздели его на 2.',
        fixIdea: 'Сначала найди угол, внутри которого проходит биссектриса, — потом дели его пополам.',
        explainOptions: ['Биссектриса делит пополам только тот угол, внутри которого проходит', 'Биссектриса делит пополам любой угол на рисунке', 'Биссектриса всегда делит пополам данный в задаче угол'],
        conflicts: [{ text: '∠BOC = 60°, а OD — биссектриса смежного с ним угла AOB. По твоему правилу ∠AOD = 60° : 2 = 30°. Но ∠AOB = 180° − 60° = 120°, и его половина — 60°, а не 30°.', ask: 'Сколько градусов в ∠AOD?', choices: ['60°', '30°'], right: '60°', verify: () => (180 - 60) / 2 === 60,
          figure: { type: 'rays7', kind: 'bis', rays: [0, 60, 120, 180], names: ['C', 'B', 'D', 'A'], o: 'O', arcs: [{ a: 0, b: 1, t: '60°' }, { a: 1, b: 2, t: '', r: 30 }, { a: 2, b: 3, t: '?', r: 30 }] } }],
        root: 'g-angles' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['adj', 'vert', 'cross'], ['adj', 'vert', 'cross', 'bis'], ['cross', 'bis', 'bis3', 'vsum', 'ratio']));
      const step = L3(lv, 10, 5, 1);
      if (kind === 'adj') {
        const a = pickAng(20, 160, step, x => x !== 90), v = rnd(0, 2), b = 180 - a;
        const story = [`Прямая тропинка отходит от прямой аллеи под углом ${deg(a)}.`, `Флагшток наклонён и образует с ровной землёй угол ${deg(a)}.`, `∠AOB и ∠BOC — смежные, ∠BOC = ${deg(a)}.`][v];
        const question = inDeg(['Какой угол тропинка образует с другой частью аллеи?', 'Какой угол он образует с землёй с другой стороны?', 'Найди ∠AOB.'][v]);
        return {
          story, question, figure: ADJ(a, deg(a), '?', v === 2 ? ['C', 'B', 'A'] : null), answer: ans(b),
          hints: ['Данный угол и искомый вместе образуют развёрнутый угол — прямую линию. Сколько в нём градусов?', `Развёрнутый угол — 180°. Вычти из него ${deg(a)}.`],
          solution: `Углы смежные, их сумма 180°: 180° − ${deg(a)} = ${deg(b)}.`,
          wrongs: wr(b, { 'adjacent-equal': a }), data: { kind, a },
        };
      }
      if (kind === 'vert') {
        const a = pickAng(20, 160, step, x => x !== 90), v = rnd(0, 2);
        const story = [`Прямые AB и CD пересекаются в точке O, ∠AOC = ${deg(a)}.`, `Две прямые дороги пересекаются. Один из углов перекрёстка — ${deg(a)}.`, `Две вязальные спицы скрещены. Один из углов между ними — ${deg(a)}.`][v];
        const question = inDeg(['Найди ∠BOD.', 'Найди угол перекрёстка, который лежит напротив него.', 'Найди угол, вертикальный с ним.'][v]);
        const figure = { type: 'rays7', kind: 'cross', rays: [0, 180 - a, 180, 360 - a], names: v === 0 ? ['B', 'C', 'A', 'D'] : null, o: v === 0 ? 'O' : '', arcs: [{ a: 1, b: 2, t: deg(a) }, { a: 3, b: 0, t: '?' }] };
        return {
          story, question, figure, answer: ans(a),
          hints: ['Эти углы стоят напротив друг друга при пересечении прямых. Как называются такие углы и что про них известно?', `Вертикальные углы равны. Проверь: оба смежны с одним и тем же углом ${deg(180 - a)}.`],
          solution: `Углы вертикальные, а вертикальные углы равны: ${deg(a)}.`,
          wrongs: wr(a, { 'vertical-sum-180': 180 - a }), data: { kind, a },
        };
      }
      if (kind === 'cross') {
        const a = pickAng(20, 160, step, x => x !== 90), g = rnd(0, 3); let t; do { t = rnd(0, 3); } while (t === g);
        const d = g % 2 === 0 ? a : 180 - a, vals = [d, 180 - d, d, 180 - d], vertical = (t - g + 4) % 4 === 2, r = vals[t];
        const labels = [null, null, null, null]; labels[g] = deg(a); labels[t] = '?';
        return {
          story: pick([`Две прямые пересекаются, один из углов — ${deg(a)}.`, `Две прямые улицы пересекаются, один из углов перекрёстка — ${deg(a)}.`]),
          question: 'Найди угол, отмеченный знаком «?» (в градусах).', figure: CROSS(d, labels), answer: ans(r),
          hints: ['Отмеченные углы вертикальные или смежные? Посмотри, есть ли у них общая сторона.', vertical ? 'Углы вертикальные — общей стороны у них нет, они стоят напротив друг друга.' : `Углы смежные — вместе они дают 180°. Вычти ${deg(a)} из 180°.`],
          solution: vertical ? `Углы вертикальные, значит, равны: ${deg(a)}.` : `Углы смежные: 180° − ${deg(a)} = ${deg(180 - a)}.`,
          wrongs: vertical ? wr(r, { 'vertical-sum-180': 180 - a }) : wr(r, { 'adjacent-equal': a }), data: { kind, a, g, t },
        };
      }
      if (kind === 'bis' || kind === 'bis3') {
        const a = kind === 'bis3' ? pickAng(40, 110, 2, x => x !== 90) : pickAng(20, 160, lv === 2 ? 10 : 2, x => x !== 90), half = (180 - a) / 2;
        const ask = kind === 'bis3' ? 'COD' : pick(['BOD', 'AOD']), r = kind === 'bis3' ? a + half : half;
        const figure = { type: 'rays7', kind: 'bis', rays: [0, a, (a + 180) / 2, 180], names: ['C', 'B', 'D', 'A'], o: 'O',
          arcs: [{ a: 0, b: 1, t: deg(a) }, { a: 1, b: 2, t: ask === 'BOD' ? '?' : '', r: 32 }, { a: 2, b: 3, t: ask === 'AOD' ? '?' : '', r: 32 }] };
        return {
          story: `∠AOB и ∠BOC — смежные, ∠BOC = ${deg(a)}. Луч OD — биссектриса угла AOB.`, question: `Найди ∠${ask} (в градусах).`, figure, answer: ans(r),
          hints: kind === 'bis3' ? ['∠COD = ∠COB + ∠BOD. Какой угол делит биссектриса OD?', `∠AOB = 180° − ${deg(a)} = ${deg(180 - a)}, ∠BOD = ${deg(half)}. Прибавь ∠BOC.`]
            : ['Какой угол делит биссектриса OD? Сначала найди его целиком.', `∠AOB = 180° − ${deg(a)} = ${deg(180 - a)}. Теперь раздели его пополам.`],
          solution: `∠AOB = 180° − ${deg(a)} = ${deg(180 - a)}; ∠BOD = ∠AOD = ${deg(180 - a)} : 2 = ${deg(half)}.` + (kind === 'bis3' ? ` ∠COD = ${deg(a)} + ${deg(half)} = ${deg(r)}.` : ''),
          wrongs: wr(r, { 'bisector-wrong-angle': kind === 'bis3' ? a + a / 2 : a / 2 }), data: { kind, a, ask },
        };
      }
      if (kind === 'vsum') {
        const h = pickAng(20, 160, 1, x => x !== 90), r = 180 - h;
        return {
          story: `Две прямые пересекаются. Сумма двух вертикальных углов равна ${deg(2 * h)}.`, question: 'Найди один из двух других углов (в градусах).',
          figure: CROSS(h, ['', '?', '', null]), answer: ans(r),
          hints: ['Вертикальные углы равны. Сколько градусов в каждом из них?', `Каждый — ${deg(2 * h)} : 2 = ${deg(h)}. Искомый угол смежный с ним.`],
          solution: `Каждый из вертикальных углов: ${deg(2 * h)} : 2 = ${deg(h)}. Другой угол смежный с ним: 180° − ${deg(h)} = ${deg(r)}.`,
          wrongs: wr(r, { 'adjacent-equal': h }), data: { kind, h },
        };
      }
      // ratio: один из углов при пересечении прямых в k раз больше другого
      const k = pick([2, 3, 4, 5, 8]), small = 180 / (k + 1), big = 180 - small, wantBig = Math.random() < 0.5, r = wantBig ? big : small;
      return {
        story: `Две прямые пересекаются, и один из образовавшихся углов в ${times(k)} больше другого.`, question: `Найди ${wantBig ? 'больший' : 'меньший'} из этих двух углов (в градусах).`,
        answer: ans(r),
        hints: ['Вертикальные углы равны, значит, эти два угла смежные. Сколько они дают вместе?', `Меньший угол — x, больший — ${k}x. x + ${k}x = 180°, то есть ${k + 1}x = 180°.`],
        solution: `x + ${k}x = 180°, x = 180° : ${k + 1} = ${deg(small)}; больший угол — ${deg(big)}.`,
        wrongs: {}, data: { kind, k, wantBig },
      };
    },
    verify(task) {
      const d = task.data, A = Number(task.answer);
      if (d.kind === 'adj') return same(n360(180 - d.a), A) && same(A + d.a, 180);
      if (d.kind === 'vert') return same(n360(0 - (360 - d.a)), A);
      if (d.kind === 'cross') { const dd = d.g % 2 === 0 ? d.a : 180 - d.a, rays = [0, dd, 180, 180 + dd], v = i => n360(rays[(i + 1) % 4] - rays[i]); return same(v(d.g), d.a) && same(v(d.t), A); }
      if (d.kind === 'bis' || d.kind === 'bis3') {
        const bdir = Math.atan2(Math.sin(d.a * RAD) + Math.sin(Math.PI), Math.cos(d.a * RAD) + Math.cos(Math.PI)) / RAD; // направление биссектрисы угла между OB и OA
        return same(d.kind === 'bis3' ? bdir : bdir - d.a, A);
      }
      if (d.kind === 'vsum') return same(A + d.h, 180);
      if (d.kind === 'ratio') return d.wantBig ? same(A + A / d.k, 180) : same(A + A * d.k, 180);
      return false;
    },
  };

  /* =========================================================
     2. Сумма углов треугольника, внешний угол
     ========================================================= */
  const kx = k => (k === 1 ? 'x' : k + 'x');
  const triSum = {
    id: 'g7-triangle-sum', strand: SG, short: 'Сумма углов', title: 'Сумма углов треугольника, внешний угол',
    frp: ['Сумма углов треугольника', 'Внешние углы треугольника'],
    goal: 'Находить неизвестный угол треугольника по двум другим и внешний угол — по двум внутренним, не смежным с ним.',
    requires: ['g7-angles', 'g6-triangles'],
    explain: {
      model: 'Нарисуй на бумаге любой треугольник, оторви у него три уголка и приложи их вершинами друг к другу. Они всегда сложатся в прямую линию — развёрнутый угол 180°. Так у любого треугольника: у паруса, у фронтона крыши, у треугольника из трёх городов на карте.',
      figure: { type: 'tri7', ang: [50, 60, 70], labels: ['50°', '60°', '70°'] },
      figureCaption: '50° + 60° + 70° = 180°',
      rule: '<ul class="rule-list"><li><b>Сумма углов любого треугольника — 180°.</b> Неизвестный угол = 180° − (сумма двух известных).</li><li><b>Внешний угол</b> треугольника — смежный с его углом: сторону продолжили за вершину. Внешний угол = 180° − <b>смежный</b> с ним внутренний.</li><li>Внешний угол равен <b>сумме двух внутренних углов, не смежных с ним</b>.</li></ul>',
      examples: [
        { q: 'В треугольнике два угла: 45° и 75°. Найди третий угол.', fig: { type: 'tri7', ang: [45, 75, 60], labels: ['45°', '75°', '?'] },
          choices: ['60°', '240°'], correct: 0, wrong: { 1: 'sum-360' },
          steps: ['Все три угла вместе — 180°.', '180° − 45° − 75° = 60°.'] },
        { q: 'В треугольнике ABC ∠A = 40°, ∠C = 70°. Найди внешний угол при вершине B.', fig: { type: 'tri7', ang: [40, 70, 70], names: ['A', 'B', 'C'], labels: ['40°', '', '70°'], ext: [{ at: 1, t: '?' }] },
          choices: ['110°', '70°', '140°'], correct: 0, wrong: { 1: 'ext-interior', 2: 'ext-nonadjacent' },
          steps: ['Внешний угол при B равен сумме двух внутренних углов, не смежных с ним: ∠A и ∠C.', '40° + 70° = 110°. Проверка: внутренний ∠B = 180° − 110° = 70°, и 70° + 110° = 180°.'] },
      ],
    },
    mistakes: [
      { id: 'sum-360', title: 'Считает, что сумма углов треугольника — 360°', kidName: 'Круговик',
        kidRule: 'ты считаешь, что углы треугольника вместе дают 360°, как полный оборот',
        say: '360° — это полный оборот или сумма углов четырёхугольника. Три угла треугольника вместе дают развёрнутый угол — 180°.',
        fixIdea: 'Три угла любого треугольника вместе — 180°, ровно развёрнутый угол.',
        explainOptions: ['Три угла треугольника, приложенные друг к другу, образуют развёрнутый угол — 180°', 'Сумма углов треугольника — 360°, как у полного круга', 'Сумма углов зависит от размера треугольника'],
        conflicts: [{ text: 'Разрежь квадрат по диагонали — получатся два одинаковых треугольника. У квадрата четыре угла по 90°, вместе 360°, и все они поделились между двумя треугольниками. В каждом: 90° + 45° + 45°.', ask: 'Сколько градусов в сумме углов одного такого треугольника?', choices: ['180°', '360°'], right: '180°', verify: () => 90 + 45 + 45 === 180 && 2 * 180 === 4 * 90,
          figure: { type: 'tri7', ang: [45, 45, 90], labels: ['45°', '45°', ''], right: 2 } }],
        root: 'g6-triangles' },
      { id: 'ext-interior', title: 'Находит внутренний угол вместо внешнего', kidName: 'Полпути',
        kidRule: 'ты находишь внутренний угол при вершине и на этом останавливаешься, хотя спрашивают внешний',
        say: 'Ты нашёл внутренний угол при этой вершине. Внешний — смежный с ним, по другую сторону от стороны треугольника; вместе они дают 180°.',
        fixIdea: 'Внешний угол = сумма двух внутренних, не смежных с ним (или 180° − смежный внутренний).',
        explainOptions: ['Внешний угол смежен с внутренним при той же вершине, вместе они дают 180°', 'Внешний угол равен внутреннему при той же вершине', 'Внешний угол равен разности двух других углов'],
        conflicts: [{ text: 'В треугольнике ∠A = 30°, ∠C = 40°. Внутренний ∠B = 180° − 30° − 40° = 110°. По твоему правилу внешний угол при B тоже 110°. Но внешний и внутренний углы при B — смежные, а 110° + 110° = 220°, не 180°.', ask: 'Чему равен внешний угол при вершине B?', choices: ['70°', '110°'], right: '70°', verify: () => 180 - (180 - 30 - 40) === 30 + 40,
          figure: { type: 'tri7', ang: [30, 110, 40], names: ['A', 'B', 'C'], labels: ['30°', '110°', '40°'], ext: [{ at: 1, t: '?' }] } }],
        root: 'g-angles' },
      { id: 'ext-nonadjacent', title: 'Считает, что внешний угол и несмежный с ним внутренний вместе дают 180°', kidName: 'Не тот сосед',
        kidRule: 'ты вычитаешь внешний угол из 180° и считаешь, что получился несмежный с ним угол треугольника',
        say: 'До 180° внешний угол дополняет только смежный с ним внутренний угол — тот, что при той же вершине. С двумя другими углами связь другая: внешний угол равен их сумме.',
        fixIdea: 'Внешний угол = сумма двух несмежных с ним углов; 180° он даёт только со смежным.',
        explainOptions: ['180° внешний угол даёт только со смежным углом, а двум несмежным он равен в сумме', 'Внешний угол вместе с любым углом треугольника даёт 180°', 'Внешний угол равен любому несмежному с ним углу'],
        conflicts: [{ text: 'Треугольник с углами 50°, 70° и 60°. Внешний угол при вершине с углом 70° равен 180° − 70° = 110°. По твоему правилу он и с углом 50° должен дать 180°. Но 110° + 50° = 160°.', ask: 'Дают ли вместе 180° внешний угол и несмежный с ним внутренний?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => (180 - 70) + 50 !== 180 && 180 - 70 === 50 + 60,
          figure: { type: 'tri7', ang: [50, 70, 60], labels: ['50°', '70°', '60°'], ext: [{ at: 1, t: '110°' }] } }],
        root: 'g-angles' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['two', 'two', 'ext2'], ['two', 'diff', 'ext2', 'efind'], ['ratio', 'diff', 'efind', 'ext2x']));
      const step = L3(lv, 10, 5, 1);
      if (kind === 'two') {
        const v = rnd(0, 3); let a, b; do { a = pickAng(20, 140, step); b = pickAng(20, 140, step); } while (180 - a - b < 20 || (v === 3 && (a >= 90 || b >= 90)));
        const c = 180 - a - b, N = v === 0 ? ['A', 'B', 'C'] : null;
        const story = [`В треугольнике ABC ∠A = ${deg(a)}, ∠B = ${deg(b)}.`, `У треугольного паруса два угла — ${deg(a)} и ${deg(b)}.`,
          `Три города на карте соединены прямыми дорогами и образуют треугольник. Угол при первом городе — ${deg(a)}, при втором — ${deg(b)}.`,
          `Фронтон крыши — треугольник. Углы у основания — ${deg(a)} и ${deg(b)}.`][v];
        const question = inDeg(['Найди ∠C.', 'Найди третий угол паруса.', 'Найди угол при третьем городе.', 'Найди угол у конька, наверху.'][v]);
        return {
          story, question, figure: { type: 'tri7', ang: [a, b, c], names: N, labels: [deg(a), deg(b), '?'] }, answer: ans(c),
          hints: ['Сколько градусов в сумме у всех трёх углов треугольника?', `Все три угла — 180°. Вычти из 180° углы ${deg(a)} и ${deg(b)}.`],
          solution: `180° − ${deg(a)} − ${deg(b)} = ${deg(c)}.`,
          wrongs: wr(c, { 'sum-360': 360 - a - b }), data: { kind, a, b },
        };
      }
      if (kind === 'diff') {
        let a, d; do { a = pickAng(20, 80, step); d = pickAng(5, 60, L3(lv, 10, 5, 1)); } while (180 - 2 * a - d < 20);
        const c = 180 - 2 * a - d;
        return {
          story: `В треугольнике ABC ∠A = ${deg(a)}, а ∠B на ${deg(d)} больше ∠A.`, question: 'Найди ∠C (в градусах).',
          figure: { type: 'tri7', ang: [a, a + d, c], names: ['A', 'B', 'C'], labels: [deg(a), '', '?'] }, answer: ans(c),
          hints: ['Сначала найди ∠B, потом вспомни, сколько градусов у трёх углов вместе.', `∠B = ${deg(a)} + ${deg(d)} = ${deg(a + d)}. Все три угла — 180°.`],
          solution: `∠B = ${deg(a + d)}; ∠C = 180° − ${deg(a)} − ${deg(a + d)} = ${deg(c)}.`,
          wrongs: wr(c, { 'sum-360': 360 - 2 * a - d }), data: { kind, a, d },
        };
      }
      if (kind === 'ratio') {
        const R = pick([[1, 2, 3], [2, 3, 4], [3, 4, 5], [1, 3, 5], [2, 3, 7], [4, 5, 9], [1, 2, 6], [1, 4, 7]]), sum = R[0] + R[1] + R[2], u = 180 / sum;
        const wantBig = Math.random() < 0.5, r = (wantBig ? R[2] : R[0]) * u;
        return {
          story: `Углы треугольника относятся как ${R.join(' : ')}.`, question: `Найди ${wantBig ? 'наибольший' : 'наименьший'} угол (в градусах).`,
          figure: { type: 'tri7', ang: [R[0] * u, R[1] * u, R[2] * u], labels: R.map(kx) }, answer: ans(r),
          hints: [`Обозначь углы ${R.map(kx).join(', ')}. Чему равна их сумма?`, `${sum}x = 180°, значит, x = ${deg(u)}.`],
          solution: `${sum}x = 180°, x = ${deg(u)}; ${wantBig ? 'наибольший' : 'наименьший'} угол — ${kx(wantBig ? R[2] : R[0])} = ${deg(r)}.`,
          wrongs: wr(r, { 'sum-360': 2 * r }), data: { kind, R, wantBig },
        };
      }
      if (kind === 'ext2') {
        let a, c; do { a = pickAng(20, 140, step); c = pickAng(20, 140, step); } while (180 - a - c < 20 || a + c === 90);
        const e = a + c, v = rnd(0, 1);
        return {
          story: v === 0 ? `В треугольнике ABC ∠A = ${deg(a)}, ∠C = ${deg(c)}.` : `Велосипедист едет по треугольному маршруту A → B → C → A. Угол маршрута при A — ${deg(a)}, при C — ${deg(c)}.`,
          question: inDeg(v === 0 ? 'Найди внешний угол при вершине B.' : 'На какой угол он поворачивает в пункте B?'),
          figure: { type: 'tri7', ang: [a, 180 - a - c, c], names: ['A', 'B', 'C'], labels: [deg(a), '', deg(c)], ext: [{ at: 1, t: '?' }] }, answer: ans(e),
          hints: ['Внешний угол при B связан с двумя углами треугольника, не смежными с ним. Какие это углы?', `Внешний угол равен сумме ∠A и ∠C: ${deg(a)} + ${deg(c)}.`],
          solution: `Внешний угол при B = ∠A + ∠C = ${deg(a)} + ${deg(c)} = ${deg(e)}. Проверка: ∠B = 180° − ${deg(e)} = ${deg(180 - e)}.`,
          wrongs: wr(e, { 'ext-interior': 180 - a - c }), data: { kind, a, c },
        };
      }
      if (kind === 'efind') {
        let e, a; do { e = pickAng(60, 165, step); a = pickAng(15, 150, step); } while (e - a < 15 || 180 - e < 15 || e - a === 180 - e);
        const c = e - a, v = rnd(0, 1);
        return {
          story: v === 0 ? `Внешний угол треугольника ABC при вершине B равен ${deg(e)}, ∠A = ${deg(a)}.` : `Велосипедист едет по треугольному маршруту A → B → C → A. В пункте B он повернул на ${deg(e)}, угол маршрута при A — ${deg(a)}.`,
          question: inDeg(v === 0 ? 'Найди ∠C.' : 'Найди угол маршрута при C.'),
          figure: { type: 'tri7', ang: [a, 180 - e, c], names: ['A', 'B', 'C'], labels: [deg(a), '', '?'], ext: [{ at: 1, t: deg(e) }] }, answer: ans(c),
          hints: ['Внешний угол при B равен сумме двух углов треугольника, не смежных с ним. Каких?', `${deg(e)} = ∠A + ∠C, значит, ∠C = ${deg(e)} − ${deg(a)}.`],
          solution: `Внешний угол при B = ∠A + ∠C, поэтому ∠C = ${deg(e)} − ${deg(a)} = ${deg(c)}.`,
          wrongs: wr(c, { 'ext-nonadjacent': 180 - e }), data: { kind, e, a },
        };
      }
      // ext2x: внешние углы при двух вершинах
      let x, y; do { x = pickAng(25, 160, 1); y = pickAng(25, 160, 1); } while (180 - x < 20 || 180 - y < 20 || x + y - 180 < 20);
      const c = x + y - 180;
      return {
        story: `Внешние углы треугольника ABC при вершинах A и B равны ${deg(x)} и ${deg(y)}.`, question: 'Найди ∠C (в градусах).',
        figure: { type: 'tri7', ang: [180 - x, 180 - y, c], names: ['A', 'B', 'C'], labels: ['', '', '?'], ext: [{ at: 0, t: deg(x) }, { at: 1, t: deg(y) }] }, answer: ans(c),
        hints: ['Сначала найди внутренние углы при A и B: каждый смежен со своим внешним.', `∠A = 180° − ${deg(x)} = ${deg(180 - x)}, ∠B = 180° − ${deg(y)} = ${deg(180 - y)}. Сколько остаётся на ∠C?`],
        solution: `∠A = ${deg(180 - x)}, ∠B = ${deg(180 - y)}; ∠C = 180° − ${deg(180 - x)} − ${deg(180 - y)} = ${deg(c)}.`,
        wrongs: wr(c, { 'sum-360': x + y }), data: { kind, x, y },
      };
    },
    verify(task) {
      const d = task.data, A = Number(task.answer);
      if (d.kind === 'two') return same(A + d.a + d.b, 180);
      if (d.kind === 'diff') return same(d.a + (d.a + d.d) + A, 180);
      if (d.kind === 'ratio') { const s = d.R.reduce((p, v) => p + v, 0), k = d.wantBig ? Math.max(...d.R) : Math.min(...d.R); return same(A * s / k, 180); }
      if (d.kind === 'ext2') { const B = 180 - d.a - d.c; return same(180 - B, A); }
      if (d.kind === 'efind') { const B = 180 - d.e; return same(180 - d.a - B, A); }
      if (d.kind === 'ext2x') return same((180 - d.x) + (180 - d.y) + A, 180);
      return false;
    },
  };

  /* =========================================================
     3. Равнобедренный и равносторонний треугольник
     ========================================================= */
  const isoShape = (a, c) => { const b = Math.acos(Math.min(0.999, c / 2 / a)) / RAD; return [b, b, 180 - 2 * b]; };
  const iso = {
    id: 'g7-isosceles', strand: SG, short: 'Равнобедренный', title: 'Равнобедренный и равносторонний треугольник',
    frp: ['Равнобедренный и равносторонний треугольники', 'Свойства и признаки равнобедренного треугольника'],
    goal: 'Находить углы и стороны равнобедренного треугольника, зная, что углы при основании равны.',
    requires: ['g7-triangle-sum'],
    explain: {
      model: 'Посмотри на двускатную крышу дома: два ската одинаковой длины — это боковые стороны, а низ фронтона — основание. Скаты наклонены к основанию одинаково: углы при основании равны. А угол наверху, у конька, — угол при вершине — может быть каким угодно.',
      figure: { type: 'tri7', ang: [35, 35, 110], names: ISO, labels: ['35°', '35°', '110°'], ticks: [0, 1, 1] },
      figureCaption: 'Боковые стороны равны — и углы при основании равны, по 35°. Угол при вершине: 180° − 35° − 35° = 110°',
      rule: '<ul class="rule-list"><li><b>Равнобедренный</b> треугольник: две равные стороны — <b>боковые</b>, третья — <b>основание</b>.</li><li><b>Углы при основании равны.</b> Угол при вершине лежит между боковыми сторонами, напротив основания.</li><li>Знаешь угол при вершине — угол при основании = (180° − угол при вершине) : 2. Знаешь угол при основании — угол при вершине = 180° − 2 · угол при основании.</li><li>Периметр = 2 · боковая сторона + основание.</li><li>Медиана, проведённая к основанию, — это и биссектриса, и высота.</li><li><b>Равносторонний</b> треугольник: все стороны равны, каждый угол — 60°.</li></ul>',
      examples: [
        { q: 'Угол при вершине равнобедренного треугольника — 40°. Найди угол при основании.', fig: { type: 'tri7', ang: [70, 70, 40], names: ISO, labels: ['?', '', '40°'], ticks: [0, 1, 1] },
          choices: ['70°', '140°', '100°'], correct: 0, wrong: { 1: 'no-half', 2: 'apex-base-swap' },
          steps: ['Углы при основании равны, вместе они 180° − 40° = 140°.', 'Каждый — 140° : 2 = 70°.'] },
        { q: 'Боковая сторона равнобедренного треугольника — 7 см, основание — 4 см. Найди периметр.', fig: { type: 'tri7', ang: isoShape(7, 4), names: ISO, sides: ['4 см', '7 см', ''], ticks: [0, 1, 1] },
          choices: ['18 см', '15 см'], correct: 0, wrong: { 1: 'perimeter-swap' },
          steps: ['Боковых сторон две, основание одно.', '7 + 7 + 4 = 18 см.'] },
      ],
    },
    mistakes: [
      { id: 'apex-base-swap', title: 'Путает угол при вершине и угол при основании', kidName: 'Перевёртыш',
        kidRule: 'ты принимаешь угол при вершине за угол при основании или наоборот',
        say: 'Угол при вершине — между двумя равными, боковыми сторонами, напротив основания. Углов при основании два, и они равны. Проверь, какой угол тебе дан.',
        fixIdea: 'Равны два угла при основании; угол при вершине — третий, между боковыми сторонами.',
        explainOptions: ['Равные углы прилегают к основанию, а угол при вершине лежит между боковыми сторонами', 'Угол при вершине — один из двух равных углов', 'Неважно, какой угол назвать углом при вершине, — ответ будет тот же'],
        conflicts: [{ text: 'Угол при вершине равнобедренного треугольника — 120°. По твоему правилу это угол при основании. Но углов при основании два, и они равны: 120° + 120° = 240° — больше, чем 180° у всего треугольника.', ask: 'Может угол при основании быть 120°?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 120 + 120 > 180,
          figure: { type: 'tri7', ang: [30, 30, 120], names: ISO, labels: ['', '', '120°'], ticks: [0, 1, 1] } }],
        root: 'g6-triangles' },
      { id: 'no-half', title: 'Забывает разделить пополам', kidName: 'Неделимый',
        kidRule: 'ты находишь сумму двух равных углов и пишешь её как ответ, не разделив пополам',
        say: 'Здесь два равных угла (или две равные половинки угла), и остаток делится между ними поровну. Не забудь разделить на 2.',
        fixIdea: 'Если на два равных угла приходится сумма S, каждый из них — S : 2.',
        explainOptions: ['Остаток приходится на два равных угла, поэтому его делят на 2', 'Угол при основании равен 180° − угол при вершине, потому что они смежные', 'Остаток делят на 3, потому что у треугольника три угла'],
        conflicts: [{ text: 'Угол при вершине — 40°. По твоему правилу угол при основании 180° − 40° = 140°. Но таких углов два: 40° + 140° + 140° = 320°, а не 180°.', ask: 'Может угол при основании быть 140°?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 40 + 140 + 140 !== 180 && 40 + 70 + 70 === 180,
          figure: { type: 'tri7', ang: [70, 70, 40], names: ISO, labels: ['?', '?', '40°'], ticks: [0, 1, 1] } }] },
      { id: 'perimeter-swap', title: 'Путает боковую сторону и основание при подсчёте периметра', kidName: 'Не та пара',
        kidRule: 'ты удваиваешь основание, а не боковую сторону',
        say: 'Равных сторон две, и это боковые. Основание одно. Значит, в периметре дважды берут боковую сторону.',
        fixIdea: 'Периметр равнобедренного треугольника = 2 · боковая сторона + основание.',
        explainOptions: ['Боковых сторон две, а основание одно', 'Основание берут дважды, потому что оно внизу', 'Все стороны разные, поэтому P = боковая + основание'],
        conflicts: [{ text: 'Боковые стороны — по 5 см, основание — 2 см. Обойди треугольник: 5 + 5 + 2 = 12 см. По твоему правилу вышло бы 2 + 2 + 5 = 9 см — но у этого треугольника нет двух сторон по 2 см.', ask: 'Чему равен периметр?', choices: ['12 см', '9 см'], right: '12 см', verify: () => 5 + 5 + 2 === 12,
          figure: { type: 'tri7', ang: isoShape(5, 2), names: ISO, sides: ['2 см', '5 см', '5 см'], ticks: [0, 1, 1] } }],
        root: 'g6-triangles' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['a2b', 'b2a', 'per', 'equi'], ['a2b', 'b2a', 'per', 'prev', 'med'], ['a2b', 'b2a', 'prev', 'med', 'ext']));
      if (kind === 'a2b') {
        const v = lv === 1 ? pickAng(20, 140, 20, x => x !== 60) : pickAng(10, 160, 2, x => x !== 60), b = (180 - v) / 2, s = rnd(0, 3);
        const story = [`В равнобедренном треугольнике ABC с основанием AC ∠B = ${deg(v)}.`, `Фронтон дома — равнобедренный треугольник. Угол у конька, при вершине, — ${deg(v)}.`,
          `Вход в палатку — равнобедренный треугольник с углом при вершине ${deg(v)}.`, `Вешалка-плечики — равнобедренный треугольник с углом у крючка, при вершине, ${deg(v)}.`][s];
        const question = inDeg(['Найди ∠A.', 'Под каким углом скаты крыши наклонены к основанию?', 'Найди угол при основании.', 'Найди угол при основании.'][s]);
        return {
          story, question, figure: { type: 'tri7', ang: [b, b, v], names: s === 0 ? ISO : null, labels: ['?', '', deg(v)], ticks: [0, 1, 1] }, answer: ans(b),
          hints: ['Какие углы равнобедренного треугольника равны? Сколько градусов приходится на них вместе?', `На два равных угла при основании: 180° − ${deg(v)} = ${deg(180 - v)}. Раздели пополам.`],
          solution: `Углы при основании равны: (180° − ${deg(v)}) : 2 = ${deg(180 - v)} : 2 = ${deg(b)}.`,
          wrongs: wr(b, { 'no-half': 180 - v, 'apex-base-swap': v < 90 ? 180 - 2 * v : null }), data: { kind, v },
        };
      }
      if (kind === 'b2a') {
        const b = lv === 1 ? pickAng(20, 80, 10, x => x !== 60) : pickAng(16, 86, 2, x => x !== 60), v = 180 - 2 * b, s = rnd(0, 2);
        const story = [`В равнобедренном треугольнике ABC с основанием AC ∠A = ${deg(b)}.`, `Скаты двускатной крыши наклонены к основанию под углом ${deg(b)}, фронтон — равнобедренный треугольник.`, `Флажок — равнобедренный треугольник, угол при основании — ${deg(b)}.`][s];
        const question = inDeg(['Найди ∠B.', 'Найди угол у конька, наверху.', 'Найди угол при вершине флажка.'][s]);
        return {
          story, question, figure: { type: 'tri7', ang: [b, b, v], names: s === 0 ? ISO : null, labels: [deg(b), '', '?'], ticks: [0, 1, 1] }, answer: ans(v),
          hints: ['Сколько в треугольнике углов, равных данному?', `Углов при основании два, по ${deg(b)}: 180° − 2 · ${deg(b)}.`],
          solution: `Углы при основании равны, поэтому угол при вершине = 180° − 2 · ${deg(b)} = ${deg(v)}.`,
          wrongs: wr(v, { 'apex-base-swap': (180 - b) / 2 }), data: { kind, b },
        };
      }
      if (kind === 'per') {
        let a, c; do { a = rnd(L3(lv, 3, 5, 8), L3(lv, 9, 25, 40)); c = rnd(2, 2 * a - 1); } while (a === c);
        const P = 2 * a + c, s = rnd(0, 2), u = ['см', 'см', 'м'][s];
        const story = [`Флажок — равнобедренный треугольник: боковые стороны по ${a} см, основание ${c} см.`, `Боковая сторона равнобедренного треугольника — ${a} см, основание — ${c} см.`, `Клумба — равнобедренный треугольник: основание ${c} м, боковая сторона ${a} м.`][s];
        const question = ['Сколько сантиметров тесьмы нужно, чтобы обшить флажок по краю?', 'Найди периметр (в см).', 'Сколько метров бордюра нужно, чтобы обложить клумбу по краю?'][s];
        return {
          story, question, figure: { type: 'tri7', ang: isoShape(a, c), names: s === 1 ? ISO : null, sides: [`${c} ${u}`, `${a} ${u}`, ''], ticks: [0, 1, 1] }, answer: ans(P),
          hints: ['Сколько у треугольника боковых сторон и сколько оснований?', `Две боковые по ${a} и одно основание ${c}: ${a} + ${a} + ${c}.`],
          solution: `P = ${a} + ${a} + ${c} = ${P} ${u}.`,
          wrongs: wr(P, { 'perimeter-swap': a + 2 * c }), data: { kind, a, c },
        };
      }
      if (kind === 'prev') {
        let a, c; do { a = rnd(L3(lv, 3, 4, 6), L3(lv, 9, 20, 35)); c = rnd(2, 2 * a - 1); } while (a === c || (a + c) % 2);
        const P = 2 * a + c, byBase = Math.random() < 0.5, r = byBase ? a : c;
        return {
          story: `Периметр равнобедренного треугольника — ${P} см, ${byBase ? `основание — ${c} см` : `боковая сторона — ${a} см`}.`,
          question: `Найди ${byBase ? 'боковую сторону' : 'основание'} (в см).`,
          figure: { type: 'tri7', ang: isoShape(a, c), sides: byBase ? [`${c} см`, '?', ''] : ['?', `${a} см`, ''], ticks: [0, 1, 1] }, answer: ans(r),
          hints: ['Из каких сторон складывается периметр? Какие из них равны?', byBase ? `На две равные боковые стороны приходится ${P} − ${c} = ${P - c} см.` : `Две боковые стороны вместе: 2 · ${a} = ${2 * a} см. Остальное — основание.`],
          solution: byBase ? `Боковая сторона = (${P} − ${c}) : 2 = ${a} см.` : `Основание = ${P} − 2 · ${a} = ${c} см.`,
          wrongs: wr(r, { 'perimeter-swap': byBase ? P - 2 * c : (P - a) / 2, 'no-half': byBase ? P - c : null }), data: { kind, P, a, c, byBase },
        };
      }
      if (kind === 'med') {
        const byApex = lv === 2 || Math.random() < 0.5;
        const v = byApex ? pickAng(20, 160, 2, x => x !== 60) : 0, b = byApex ? 0 : pickAng(20, 80, 1), apex = byApex ? v : 180 - 2 * b, r = apex / 2, s = rnd(0, 1);
        const given = byApex ? `∠ABC = ${deg(v)}` : `∠BAC = ${deg(b)}`;
        return {
          story: s === 0 ? `В равнобедренном треугольнике ABC с основанием AC проведена медиана BM, ${given}.` : `Фронтон крыши — равнобедренный треугольник ABC с основанием AC. От конька B к середине M основания поставили стойку BM, ${given}.`,
          question: s === 0 ? 'Найди ∠ABM (в градусах).' : 'Какой угол стойка BM образует со скатом BA (в градусах)?',
          figure: { type: 'tri7', ang: [(180 - apex) / 2, (180 - apex) / 2, apex], names: ISO, labels: [byApex ? '' : deg(b), '', ''], ticks: [0, 1, 1], cev: [{ from: 2, kind: 'mid', name: 'M', t: '?', side: 0 }] }, answer: ans(r),
          hints: ['Чем ещё является медиана, проведённая к основанию равнобедренного треугольника?', byApex ? `Медиана BM — это и биссектриса: она делит ∠ABC = ${deg(v)} пополам.` : `Сначала найди ∠ABC = 180° − 2 · ${deg(b)} = ${deg(apex)}; медиана BM делит его пополам.`],
          solution: (byApex ? '' : `∠ABC = 180° − 2 · ${deg(b)} = ${deg(apex)}. `) + `Медиана к основанию — биссектриса: ∠ABM = ${deg(apex)} : 2 = ${deg(r)}.`,
          wrongs: wr(r, { 'no-half': apex }), data: { kind, byApex, v, b },
        };
      }
      if (kind === 'ext') {
        const e = pickAng(30, 160, 2, x => x !== 120), apex = 180 - e, r = e / 2;
        return {
          story: `Внешний угол при вершине B равнобедренного треугольника ABC с основанием AC равен ${deg(e)}.`, question: 'Найди угол при основании (в градусах).',
          figure: { type: 'tri7', ang: [r, r, apex], names: ISO, labels: ['?', '', ''], ticks: [0, 1, 1], ext: [{ at: 2, t: deg(e) }] }, answer: ans(r),
          hints: ['Найди сначала внутренний угол при вершине B — он смежный с внешним.', `∠B = 180° − ${deg(e)} = ${deg(apex)}. На два равных угла при основании остаётся ${deg(180 - apex)}.`],
          solution: `∠B = 180° − ${deg(e)} = ${deg(apex)}; угол при основании = (180° − ${deg(apex)}) : 2 = ${deg(r)}.`,
          wrongs: wr(r, { 'no-half': e, 'apex-base-swap': e > 90 ? 2 * e - 180 : null }), data: { kind, e },
        };
      }
      // equi: равносторонний треугольник
      const a = rnd(L3(lv, 2, 5, 10), L3(lv, 12, 30, 60)), P = 3 * a;
      return {
        story: pick([`Дорожный знак «Уступи дорогу» — равносторонний треугольник с периметром ${P} см.`, `Периметр равностороннего треугольника — ${P} см.`]), question: 'Найди его сторону (в см).',
        figure: { type: 'tri7', ang: [60, 60, 60], ticks: [1, 1, 1] }, answer: ans(a),
        hints: ['Сколько сторон у треугольника и какие они в равностороннем треугольнике?', `Три равные стороны: ${P} : 3.`],
        solution: `${P} : 3 = ${a} см.`, wrongs: {}, data: { kind, P },
      };
    },
    verify(task) {
      const d = task.data, A = Number(task.answer);
      if (d.kind === 'a2b') return same(A + A + d.v, 180);
      if (d.kind === 'b2a') return same(d.b + d.b + A, 180);
      if (d.kind === 'per') return same([d.a, d.a, d.c].reduce((p, v) => p + v, 0), A) && d.c < 2 * d.a;
      if (d.kind === 'prev') return d.byBase ? same(2 * A + d.c, d.P) : same(2 * d.a + A, d.P);
      if (d.kind === 'med') { const apex = d.byApex ? d.v : 180 - 2 * d.b; return same(2 * A, apex); }
      if (d.kind === 'ext') { const apex = 180 - d.e; return same(2 * A + apex, 180); }
      if (d.kind === 'equi') return same(3 * A, d.P);
      return false;
    },
  };

  /* =========================================================
     4. Признаки равенства треугольников
     ========================================================= */
  const C_SAS = 'по двум сторонам и углу между ними', C_ASA = 'по стороне и двум прилежащим углам', C_SSS = 'по трём сторонам', C_AAA = 'по трём углам', C_NO = 'данных недостаточно';
  const NAMES = [[['A', 'B', 'C'], ['K', 'L', 'M']], [['A', 'B', 'C'], ['A₁', 'B₁', 'C₁']], [['D', 'E', 'F'], ['M', 'N', 'K']], [['M', 'N', 'P'], ['R', 'S', 'T']]];
  const SHAPES = [[50, 72], [64, 48], [40, 75]];
  // что доказывают данные равенства: sides — пары вершин, angs — вершины
  function criterion(sides, angs) {
    const key = s => [...s].sort().join(''), S = new Set(sides.map(key));
    if (S.size === 3) return C_SSS;
    for (const v of angs) for (const s1 of sides) for (const s2 of sides) if (key(s1) !== key(s2) && s1.includes(v) && s2.includes(v)) return C_SAS;
    for (const s of sides) if (angs.includes(s[0]) && angs.includes(s[1])) return C_ASA;
    return C_NO;
  }
  // случай → данные (индексы вершин 0, 1, 2) и, может быть, числа
  function congCase(kind, withNums) {
    const v = rnd(0, 2), v1 = (v + 1) % 3, v2 = (v + 2) % 3;
    let sides = [], angs = [], vals = {};
    if (kind === 'sas') { sides = [[v, v1], [v, v2]]; angs = [v]; if (withNums) vals = { s0: rnd(3, 15), s1: rnd(3, 15), a0: rnd(20, 150) }; }
    if (kind === 'asa') { sides = [[v, v1]]; angs = [v, v1]; if (withNums) { const x = rnd(20, 100); vals = { s0: rnd(3, 15), a0: x, a1: rnd(20, 160 - x) }; } }
    if (kind === 'sss') { sides = [[v, v1], [v1, v2], [v2, v]]; if (withNums) { let p, q, r; do { p = rnd(3, 15); q = rnd(3, 15); r = rnd(3, 15); } while (p + q <= r || p + r <= q || q + r <= p); vals = { s0: p, s1: q, s2: r }; } }
    if (kind === 'ssa') { sides = [[v, v1], [v1, v2]]; angs = [v]; if (withNums) { let th, c, a; do { th = rnd(25, 65); c = rnd(6, 15); a = rnd(2, c - 1); } while (!(a > c * Math.sin(th * RAD) + 0.3)); vals = { s0: c, s1: a, a0: th }; } }
    if (kind === 'aaa') { angs = [v, v1, v2]; if (withNums) { let x, y; do { x = rnd(20, 120); y = rnd(20, 120); } while (180 - x - y < 20); vals = { a0: x, a1: y, a2: 180 - x - y }; } }
    return { sides, angs, vals };
  }
  function congText(T1, T2, cs) {
    const parts = [];
    cs.sides.forEach((s, i) => { const x = cs.vals['s' + i], [p, q] = [Math.min(...s), Math.max(...s)]; parts.push(`${T1[p]}${T1[q]} = ${T2[p]}${T2[q]}${x ? ` = ${x} см` : ''}`); });
    cs.angs.forEach((a, i) => { const x = cs.vals['a' + i]; parts.push(`∠${T1[a]} = ∠${T2[a]}${x ? ` = ${deg(x)}` : ''}`); });
    return shuffle(parts).join(', ');
  }
  function congFig(T1, T2, cs) {
    const st = [0, 0, 0], an = [0, 0, 0];
    cs.sides.forEach((s, i) => { const lo = Math.min(...s), hi = Math.max(...s), idx = lo === 0 && hi === 2 ? 2 : lo; st[idx] = i + 1; });
    cs.angs.forEach((a, i) => { an[a] = i + 1; });
    return { type: 'pair7', ang: pick(SHAPES), n1: T1, n2: T2, st, an };
  }
  const cong = {
    id: 'g7-congruence', strand: SG, short: 'Равенство треуг.', title: 'Признаки равенства треугольников',
    frp: ['Признаки равенства треугольников'],
    goal: 'Узнавать, по какому признаку равны треугольники, и видеть, когда данных для равенства не хватает.',
    requires: ['g6-triangles', 'g7-angles'],
    explain: {
      model: 'Чтобы сделать точную копию треугольной детали, не нужно мерить всё. Хватит двух сторон и угла между ними: приложил угол, отмерил стороны — третья сторона получится сама. А вот одинаковые углы ничего не гарантируют: большой угольник у доски и маленький из пенала имеют одни и те же углы, но они разного размера.',
      figure: { type: 'pair7', ang: [50, 72], n1: ['A', 'B', 'C'], n2: ['K', 'L', 'M'], st: [1, 0, 2], an: [1, 0, 0] },
      figureCaption: 'AB = KL, AC = KM и ∠A = ∠K — две стороны и угол между ними: треугольники равны',
      rule: '<ul class="rule-list"><li><b>Первый признак</b>: две стороны и <b>угол между ними</b>.</li><li><b>Второй признак</b>: сторона и <b>два прилежащих к ней угла</b>.</li><li><b>Третий признак</b>: три стороны.</li><li>Три равных угла — <b>не признак</b>: треугольники могут быть разного размера.</li><li>Две стороны и угол <b>не между ними</b> — тоже не признак.</li></ul>',
      examples: [
        { q: 'У треугольников ABC и KLM: AB = KL, AC = KM, ∠A = ∠K. Равны ли треугольники?', fig: { type: 'pair7', ang: [50, 72], st: [1, 0, 2], an: [1, 0, 0] },
          choices: ['Да, по первому признаку', 'Нельзя утверждать'], correct: 0,
          steps: ['∠A лежит между сторонами AB и AC.', 'Две стороны и угол между ними равны — это первый признак.'] },
        { q: 'У треугольников ABC и KLM все углы попарно равны: ∠A = ∠K, ∠B = ∠L, ∠C = ∠M. Равны ли треугольники?', fig: { type: 'pair7', ang: [50, 72], an: [1, 2, 3], k: 0.6 },
          choices: ['Нельзя утверждать', 'Да, по трём углам'], correct: 0, wrong: { 1: 'three-angles' },
          steps: ['Признака «по трём углам» нет.', 'Угольник у доски и угольник в пенале: углы одинаковые, а размеры разные.'] },
        { q: 'AB = KL, BC = LM, ∠A = ∠K. Можно ли утверждать, что треугольники ABC и KLM равны?', fig: { type: 'pair7', ang: [50, 72], st: [1, 2, 0], an: [1, 0, 0] },
          choices: ['Нельзя', 'Да, по первому признаку'], correct: 0, wrong: { 1: 'angle-not-between' },
          steps: ['∠A лежит между сторонами AB и AC, а не между AB и BC.', 'Равны две стороны и угол не между ними — такого признака нет.'] },
      ],
    },
    mistakes: [
      { id: 'three-angles', title: 'Считает треугольники равными по трём углам', kidName: 'Только углы',
        kidRule: 'ты думаешь, что если все углы треугольников равны, то равны и сами треугольники',
        say: 'Одинаковые углы задают только форму, а не размер. В каждом признаке равенства есть хотя бы одна сторона, а признака «по трём углам» нет.',
        fixIdea: 'Признак равенства всегда включает хотя бы одну сторону; одни углы размер не задают.',
        explainOptions: ['Треугольники с одинаковыми углами могут быть разного размера', 'Если углы равны, то и стороны равны', 'Три угла — это третий признак равенства'],
        conflicts: [{ text: 'Большой угольник у доски и маленький из пенала: у обоих углы 30°, 60° и 90°. По твоему правилу они равны, и их можно совместить наложением. Но гипотенуза у одного 60 см, а у другого 16 см.', ask: 'Равны ли эти угольники?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 60 !== 16 && 30 + 60 + 90 === 180,
          figure: { type: 'pair7', ang: [30, 90], n1: ['A', 'B', 'C'], n2: ['K', 'L', 'M'], an: [1, 2, 3], k: 0.45 } }],
        root: 'g6-triangles' },
      { id: 'angle-not-between', title: 'Применяет первый признак, когда угол не лежит между равными сторонами', kidName: 'Не тот угол',
        kidRule: 'ты берёшь две стороны и любой угол и считаешь, что это первый признак',
        say: 'В первом признаке угол должен лежать между двумя данными сторонами — обе стороны выходят из его вершины. Проверь, где вершина данного угла.',
        fixIdea: 'Первый признак: угол образован именно этими двумя сторонами.',
        explainOptions: ['Угол должен быть образован двумя данными сторонами, иначе треугольник задаётся не однозначно', 'Подходит любой угол треугольника', 'Угол должен лежать напротив одной из данных сторон'],
        conflicts: [{ text: 'Угол A = 30°, AB = 8 см. Отрезок длиной 5 см из точки B достаёт до другой стороны угла в двух точках — C₁ и C₂. У треугольников ABC₁ и ABC₂ сторона AB общая, BC₁ = BC₂ = 5 см, ∠A общий. Но AC₁ ≈ 3,9 см, а AC₂ ≈ 9,9 см.', ask: 'Равны ли треугольники ABC₁ и ABC₂?', choices: ['Да', 'Нет'], right: 'Нет',
          verify: () => { const g = ssaPts({ A: 30, ab: 8, bc: 5 }); return !!g && Math.abs(g.c1 - 3.93) < 0.01 && Math.abs(g.c2 - 9.93) < 0.01 && Math.abs(Math.hypot(g.B[0] - g.c1, g.B[1]) - 5) < 1e-9 && Math.abs(Math.hypot(g.B[0] - g.c2, g.B[1]) - 5) < 1e-9; },
          figure: { type: 'ssa7', A: 30, ab: 8, bc: 5 } }],
        root: 'g-angles' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['which', 'yesno', 'corr'], ['which', 'yesno', 'need', 'perim'], ['which', 'yesno', 'need', 'pond', 'angle']));
      const [T1, T2] = pick(NAMES), n1 = T1.join(''), n2 = T2.join('');
      if (kind === 'which' || kind === 'yesno') {
        const c = pick(['sas', 'asa', 'sss', 'ssa', 'aaa', lv >= 2 ? 'ssa' : 'aaa']), cs = congCase(c, lv >= 2 && Math.random() < 0.6), right = criterion(cs.sides, cs.angs);
        const figure = congFig(T1, T2, cs);
        if (kind === 'which') {
          const choices = c === 'aaa' ? [C_ASA, C_SSS, C_AAA, C_NO] : [C_SAS, C_ASA, C_SSS, C_NO];
          return {
            story: `У треугольников ${n1} и ${n2}: ${congText(T1, T2, cs)}.`, question: 'По какому признаку можно доказать равенство этих треугольников?',
            figure, answer: right, accept: 'choice', choices,
            hints: ['Выпиши, что равно: сколько сторон и сколько углов? Где лежат углы — между данными сторонами или у концов данной стороны?', right === C_NO ? 'Проверь каждый признак: две стороны и угол между ними? сторона и два прилежащих угла? три стороны? Подходит ли хоть один?' : `Подходит признак: ${right}.`],
            solution: right === C_NO ? (c === 'aaa' ? 'Даны только углы — признака «по трём углам» нет: треугольники могут быть разного размера. Данных недостаточно.' : 'Даны две стороны и угол, который не лежит между ними. Такого признака нет — данных недостаточно.') : `Равенство доказывается ${right}.`,
            wrongs: wc(right, { 'three-angles': c === 'aaa' ? C_AAA : null, 'angle-not-between': c === 'ssa' ? C_SAS : null }), data: { kind, c, sides: cs.sides, angs: cs.angs, vals: cs.vals },
          };
        }
        const yes = right !== C_NO, A = yes ? 'Да' : 'Нет';
        let story = `У треугольников ${n1} и ${n2}: ${congText(T1, T2, cs)}.`, question = 'Можно ли утверждать, что треугольники равны?';
        const V0 = cs.vals;
        if (Object.keys(V0).length && Math.random() < 0.6) {
          if (c === 'aaa') { story = `Два треугольных флажка: у каждого углы ${deg(V0.a0)}, ${deg(V0.a1)} и ${deg(V0.a2)}.`; question = 'Можно ли утверждать, что флажки равны (совпадут при наложении)?'; }
          if (c === 'sss') { story = `Петя и Маша сколотили по треугольной раме из реек длиной ${V0.s0}, ${V0.s1} и ${V0.s2} дм.`; question = 'Совпадут ли рамы при наложении?'; }
          if (c === 'sas') { story = `У двух треугольных участков две стороны по ${V0.s0} м и ${V0.s1} м, а угол между этими сторонами — ${deg(V0.a0)}.`; question = 'Можно ли утверждать, что участки одинаковые?'; }
          if (c === 'ssa') { story = `У двух треугольных участков есть стороны ${V0.s0} м и ${V0.s1} м, а угол ${deg(V0.a0)} лежит напротив стороны ${V0.s1} м.`; question = 'Можно ли утверждать, что участки одинаковые?'; }
          if (c === 'asa') { story = `У двух треугольных деталей есть сторона ${V0.s0} см, а углы при её концах — ${deg(V0.a0)} и ${deg(V0.a1)}.`; question = 'Можно ли утверждать, что детали одинаковые?'; }
        }
        return {
          story, question, figure, answer: A, accept: 'choice', choices: ['Да', 'Нет'],
          hints: ['Сравни данные с тремя признаками: две стороны и угол между ними; сторона и два прилежащих к ней угла; три стороны.', yes ? `Подходит признак: ${right}.` : (c === 'aaa' ? 'Даны только углы. Есть ли признак, в котором нет ни одной стороны?' : 'Лежит ли данный угол между данными сторонами?')],
          solution: yes ? `Да: треугольники равны ${right}.` : (c === 'aaa' ? 'Нет: одни углы не задают размер треугольника, признака «по трём углам» нет.' : 'Нет: угол не лежит между данными сторонами, такого признака нет — треугольники могут быть разными.'),
          wrongs: wc(A, { 'three-angles': c === 'aaa' ? 'Да' : null, 'angle-not-between': c === 'ssa' ? 'Да' : null }), data: { kind, c, sides: cs.sides, angs: cs.angs, vals: cs.vals },
        };
      }
      if (kind === 'need') {
        const v = rnd(0, 2), v1 = (v + 1) % 3, v2 = (v + 2) % 3, nm = (T, i, j) => (i < j ? T[i] + T[j] : T[j] + T[i]);
        const right = `${nm(T1, v, v2)} = ${nm(T2, v, v2)}`, wrong = `${nm(T1, v1, v2)} = ${nm(T2, v1, v2)}`;
        return {
          story: `Известно, что ${nm(T1, v, v1)} = ${nm(T2, v, v1)} и ∠${T1[v]} = ∠${T2[v]}.`, question: `Какое равенство нужно добавить, чтобы треугольники ${n1} и ${n2} были равны по двум сторонам и углу между ними?`,
          figure: { type: 'pair7', ang: pick(SHAPES), n1: T1, n2: T2, st: [v, v1].includes(0) && [v, v1].includes(1) ? [1, 0, 0] : [v, v1].includes(1) && [v, v1].includes(2) ? [0, 1, 0] : [0, 0, 1], an: [0, 1, 2].map(i => (i === v ? 1 : 0)) },
          answer: right, accept: 'choice', choices: shuffle([right, wrong]),
          hints: [`Угол ${T1[v]} образован двумя сторонами, которые выходят из вершины ${T1[v]}. Какие это стороны?`, `Из вершины ${T1[v]} выходят стороны ${nm(T1, v, v1)} и ${nm(T1, v, v2)}. Одна уже дана.`],
          solution: `Угол ${T1[v]} лежит между сторонами ${nm(T1, v, v1)} и ${nm(T1, v, v2)}, поэтому нужно ${right}.`,
          wrongs: { 'angle-not-between': wrong }, data: { kind, v, T1, T2, right },
        };
      }
      if (kind === 'corr' || kind === 'perim') {
        let p, q, r; do { p = rnd(3, L3(lv, 12, 20, 30)); q = rnd(3, L3(lv, 12, 20, 30)); r = rnd(3, L3(lv, 12, 20, 30)); } while (p + q <= r || p + r <= q || q + r <= p || new Set([p, q, r]).size < 3);
        const L = [p, q, r]; // AB, BC, CA
        if (kind === 'corr') {
          const i = rnd(0, 2), nm = j => T2[j] + T2[(j + 1) % 3];
          return {
            story: `Треугольники ${n1} и ${n2} равны. ${T1[0]}${T1[1]} = ${p} см, ${T1[1]}${T1[2]} = ${q} см, ${T1[0]}${T1[2]} = ${r} см.`, question: `Найди сторону ${i === 2 ? T2[0] + T2[2] : nm(i)} (в см).`,
            answer: ans(L[i]),
            hints: ['В записи равных треугольников соответствующие вершины стоят на одинаковых местах. Какой вершине первого треугольника соответствует каждая вершина второго?', `${T2[0]} ↔ ${T1[0]}, ${T2[1]} ↔ ${T1[1]}, ${T2[2]} ↔ ${T1[2]}.`],
            solution: `Соответственные стороны равных треугольников равны: ${i === 2 ? T2[0] + T2[2] : nm(i)} = ${i === 2 ? T1[0] + T1[2] : T1[i] + T1[(i + 1) % 3]} = ${L[i]} см.`,
            wrongs: {}, data: { kind, L, i },
          };
        }
        return {
          story: `Треугольники ${n1} и ${n2} равны. ${T1[0]}${T1[1]} = ${p} см, ${T1[1]}${T1[2]} = ${q} см, ${T2[0]}${T2[2]} = ${r} см.`, question: `Найди периметр треугольника ${n1} (в см).`,
          answer: ans(p + q + r),
          hints: [`Какой стороне треугольника ${n1} равна сторона ${T2[0]}${T2[2]}?`, `${T1[0]}${T1[2]} = ${T2[0]}${T2[2]} = ${r} см. Сложи три стороны.`],
          solution: `${T1[0]}${T1[2]} = ${T2[0]}${T2[2]} = ${r} см; P = ${p} + ${q} + ${r} = ${p + q + r} см.`,
          wrongs: {}, data: { kind, L },
        };
      }
      if (kind === 'pond') {
        const d = rnd(25, 140);
        return {
          story: `Чтобы узнать ширину пруда AB, выбрали точку O, на продолжении AO за точку O отложили OC = AO, а на продолжении BO — OD = BO. Расстояние CD измерили: ${d} м.`,
          question: 'Чему равно AB (в м)?', answer: ans(d),
          hints: ['Сравни треугольники AOB и COD: какие стороны равны и какие углы при O?', '∠AOB = ∠COD как вертикальные, AO = OC, BO = OD — треугольники равны по первому признаку.'],
          solution: `Треугольники AOB и COD равны по двум сторонам и углу между ними (углы при O вертикальные), поэтому AB = CD = ${d} м.`,
          wrongs: {}, data: { kind, d },
        };
      }
      // angle: соответственные углы равных треугольников
      let x, y; do { x = rnd(20, 110); y = rnd(20, 110); } while (180 - x - y < 15);
      return {
        story: `Треугольники ${n1} и ${n2} равны, ∠${T1[0]} = ${deg(x)}, ∠${T1[1]} = ${deg(y)}.`, question: `Найди ∠${T2[2]} (в градусах).`, answer: ans(180 - x - y),
        hints: [`Какому углу треугольника ${n1} равен ∠${T2[2]}?`, `∠${T2[2]} = ∠${T1[2]} = 180° − ${deg(x)} − ${deg(y)}.`],
        solution: `∠${T2[2]} = ∠${T1[2]} = 180° − ${deg(x)} − ${deg(y)} = ${deg(180 - x - y)}.`,
        wrongs: {}, data: { kind, x, y },
      };
    },
    verify(task) {
      const d = task.data, A = task.answer;
      if (d.kind === 'which') return criterion(d.sides, d.angs) === A;
      if (d.kind === 'yesno') { if (d.c === 'ssa' && d.vals.a0) { const ok = d.vals.s1 < d.vals.s0 && d.vals.s1 > d.vals.s0 * Math.sin(d.vals.a0 * RAD); if (!ok) return false; } return (criterion(d.sides, d.angs) !== C_NO ? 'Да' : 'Нет') === A; }
      if (d.kind === 'need') { const v = d.v, v2 = (v + 2) % 3, pair = [v, v2].sort((a, b) => a - b); return A === `${d.T1[pair[0]]}${d.T1[pair[1]]} = ${d.T2[pair[0]]}${d.T2[pair[1]]}` && criterion([[v, (v + 1) % 3], [v, v2]], [v]) === C_SAS; }
      if (d.kind === 'corr') return same(Number(A), d.L[d.i]);
      if (d.kind === 'perim') return same(Number(A), d.L.reduce((p, v) => p + v, 0));
      if (d.kind === 'pond') return same(Number(A), d.d);
      if (d.kind === 'angle') return same(Number(A) + d.x + d.y, 180);
      return false;
    },
  };

  /* =========================================================
     5. Параллельные прямые и секущая
     ========================================================= */
  const parVal = (p, th) => (p % 2 === 1 ? th : 180 - th);
  // угол на месте p по направлениям лучей (независимый пересчёт)
  const parGeo = (p, th) => { const dirs = [0, th, 180, 180 + th, 360], k = (p - 1) % 4; return n360(dirs[k + 1] - dirs[k]) || 360; };
  const PAIRS = { alt: [[3, 5], [4, 6]], corr: [[1, 5], [2, 6], [3, 7], [4, 8]], one: [[3, 6], [4, 5]], altExt: [[1, 7], [2, 8]], oneExt: [[1, 8], [2, 7]] };
  const PNAME = { alt: 'накрест лежащие', corr: 'соответственные', one: 'односторонние' };
  const PNAMES = ['накрест лежащие', 'соответственные', 'односторонние'];
  function pairKind(a, b) { // по положению: внутри/снаружи и с какой стороны от секущей
    const inner = p => [3, 4, 5, 6].includes(p), right = p => [1, 4, 5, 8].includes(p);
    if ((a <= 4) === (b <= 4)) return null;
    if ((a - 1) % 4 === (b - 1) % 4) return 'соответственные';
    if (inner(a) && inner(b)) return right(a) === right(b) ? 'односторонние' : 'накрест лежащие';
    return null;
  }
  const parallel = {
    id: 'g7-parallel', strand: SG, short: 'Параллельные', title: 'Параллельные прямые и секущая',
    frp: ['Свойства и признаки параллельных прямых', 'Накрест лежащие, соответственные и односторонние углы'],
    goal: 'Находить углы при параллельных прямых и секущей и проверять, параллельны ли прямые.',
    requires: ['g7-angles', 'g6-lines'],
    explain: {
      model: 'Железная дорога: два рельса — параллельные прямые, а шоссе пересекает их наискосок — это секущая. У каждого рельса картина углов одна и та же: прямое шоссе «режет» оба рельса одинаково. Поэтому соответственные и накрест лежащие углы равны, а односторонние вместе дают 180°.',
      figure: { type: 'par7', deg: 60, labels: [1, 2, 3, 4, 5, 6, 7, 8].map(p => ({ p, t: String(p) })) },
      figureCaption: 'Накрест лежащие: 3 и 5, 4 и 6. Соответственные: 1 и 5, 2 и 6, 3 и 7, 4 и 8. Односторонние: 3 и 6, 4 и 5',
      rule: '<ul class="rule-list"><li>Если a ∥ b, то <b>накрест лежащие углы равны</b> (∠3 = ∠5, ∠4 = ∠6).</li><li><b>Соответственные углы равны</b> (∠1 = ∠5, ∠2 = ∠6, ∠3 = ∠7, ∠4 = ∠8).</li><li><b>Односторонние углы в сумме дают 180°</b> (∠3 + ∠6 = 180°, ∠4 + ∠5 = 180°).</li><li>Признак параллельности: если накрест лежащие или соответственные углы равны или односторонние в сумме дают 180°, то прямые параллельны.</li></ul>',
      examples: [
        { q: 'a ∥ b, ∠4 = 115°. Найди ∠5.', fig: { type: 'par7', deg: 65, labels: [{ p: 4, t: '115°' }, { p: 5, t: '?' }] },
          choices: ['65°', '115°'], correct: 0, wrong: { 1: 'one-sided-equal' },
          steps: ['∠4 и ∠5 — односторонние: оба между прямыми, по одну сторону от секущей.', 'Их сумма 180°: 180° − 115° = 65°.'] },
        { q: 'a ∥ b, ∠3 = 70°. Найди ∠5.', fig: { type: 'par7', deg: 70, labels: [{ p: 3, t: '70°' }, { p: 5, t: '?' }] },
          choices: ['70°', '110°'], correct: 0, wrong: { 1: 'alternate-180' },
          steps: ['∠3 и ∠5 — накрест лежащие: между прямыми, по разные стороны от секущей.', 'При параллельных прямых накрест лежащие углы равны: 70°.'] },
      ],
    },
    mistakes: [
      { id: 'one-sided-equal', title: 'Считает односторонние углы равными (вместо суммы 180°)', kidName: 'Уравнитель',
        kidRule: 'ты думаешь, что односторонние углы равны, как накрест лежащие',
        say: 'Односторонние углы лежат между прямыми по одну сторону от секущей: если прямые не перпендикулярны секущей, один угол острый, другой тупой. Они не равны — вместе они дают 180°.',
        fixIdea: 'Односторонние углы при параллельных прямых в сумме дают 180°.',
        explainOptions: ['Односторонний угол смежен с углом, накрест лежащим со вторым, поэтому их сумма 180°', 'Односторонние углы равны, потому что прямые параллельны', 'Односторонние углы равны, потому что лежат по одну сторону'],
        conflicts: [{ text: 'a ∥ b, ∠4 = 120°. По твоему правилу односторонний с ним ∠5 тоже 120°. Но ∠5 и ∠3 — накрест лежащие, значит, равны, а ∠3 смежный с ∠4: ∠3 = 180° − 120° = 60°.', ask: 'Чему равен ∠5?', choices: ['60°', '120°'], right: '60°', verify: () => parGeo(4, 60) === 120 && parGeo(5, 60) === 60,
          figure: { type: 'par7', deg: 60, labels: [{ p: 4, t: '120°' }, { p: 3, t: '3' }, { p: 5, t: '?' }] } }],
        root: 'g-angles' },
      { id: 'alternate-180', title: 'Считает, что накрест лежащие (соответственные) углы в сумме дают 180°', kidName: 'Наоборотик',
        kidRule: 'ты вычитаешь угол из 180°, хотя накрест лежащие и соответственные углы равны',
        say: 'Накрест лежащие и соответственные углы при параллельных прямых равны: оба острые или оба тупые. До 180° дополняют друг друга только односторонние.',
        fixIdea: 'Накрест лежащие и соответственные углы равны; 180° в сумме дают только односторонние.',
        explainOptions: ['Секущая пересекает параллельные прямые под одним и тем же углом, поэтому соответственные и накрест лежащие углы равны', 'Любые два угла при параллельных прямых в сумме дают 180°', 'Накрест лежащие углы смежные, поэтому их сумма 180°'],
        conflicts: [{ text: 'Шоссе пересекает два параллельных рельса. У первого рельса угол 50°. По твоему правилу соответственный угол у второго рельса — 130°. Но шоссе прямое, а рельсы параллельны: оно пересекает их одинаково, и картина у второго рельса та же, что у первого.', ask: 'Чему равен угол у второго рельса?', choices: ['50°', '130°'], right: '50°', verify: () => parGeo(1, 50) === parGeo(5, 50) && parGeo(5, 50) === 50,
          figure: { type: 'par7', deg: 50, labels: [{ p: 1, t: '50°' }, { p: 5, t: '?' }] } }],
        root: 'g5-angle-types' },
      { id: 'pair-names', title: 'Путает названия пар углов: накрест лежащие, соответственные, односторонние', kidName: 'Путаник',
        kidRule: 'ты путаешь, какие углы называются накрест лежащими, а какие — односторонними или соответственными',
        say: 'Смотри на два признака: где углы — между прямыми или снаружи — и с какой стороны от секущей. Накрест лежащие — оба между прямыми, по разные стороны от секущей. Односторонние — оба между прямыми, по одну сторону. Соответственные — на одинаковых местах у каждой из прямых.',
        fixIdea: 'Между прямыми и по разные стороны — накрест лежащие; между прямыми и по одну сторону — односторонние; на одинаковых местах — соответственные.',
        explainOptions: ['Название зависит от того, лежат ли углы между прямыми и по какую сторону от секущей', 'Название зависит от величины углов', 'Все углы между прямыми называются накрест лежащими'],
        conflicts: [{ text: 'Углы 4 и 5 оба лежат между прямыми a и b, и оба справа от секущей. По твоему правилу они накрест лежащие. Но «накрест» — значит по разные стороны от секущей, а эти углы по одну.', ask: 'Как называются углы 4 и 5?', choices: ['односторонние', 'накрест лежащие'], right: 'односторонние', verify: () => pairKind(4, 5) === 'односторонние',
          figure: { type: 'par7', deg: 60, labels: [{ p: 4, t: '4' }, { p: 5, t: '5' }] } }],
        root: 'g6-lines' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['find', 'find', 'name'], ['find', 'find', 'name', 'test'], ['find', 'sum', 'ratio', 'test']));
      const step = L3(lv, 10, 5, 1), th = pickAng(30, 150, step, x => x !== 90);
      if (kind === 'find') {
        const pk = pick(lv === 3 ? ['alt', 'one', 'altExt', 'oneExt', 'corr'] : ['alt', 'corr', 'one']), pr = shuffle(pick(PAIRS[pk])), g = pr[0], t = pr[1];
        const x = parVal(g, th), r = parVal(t, th), eqKind = ['alt', 'corr', 'altExt'].includes(pk), s = rnd(0, 3);
        const story = [`Прямые a и b параллельны, c — секущая. Один из углов — ${deg(x)}.`, `Шоссе c пересекает железную дорогу, рельсы a и b параллельны. Один из углов — ${deg(x)}.`,
          `В тетради в линейку строчки a и b параллельны. Ты провёл прямую c, которая их пересекает, и измерил угол: ${deg(x)}.`, `Две параллельные улицы a и b пересекает проспект c. Один из углов перекрёстка — ${deg(x)}.`][s];
        const how = { alt: 'Углы накрест лежащие — они равны.', corr: 'Углы соответственные — они равны.', one: `Углы односторонние — вместе они дают 180°: 180° − ${deg(x)}.`,
          altExt: 'Найди угол, вертикальный с данным, — он будет накрест лежащим или соответственным с искомым.', oneExt: 'Найди угол, вертикальный с данным: с искомым он будет односторонним или смежным.' }[pk];
        return {
          story, question: 'Найди угол, отмеченный знаком «?» (в градусах).', figure: { type: 'par7', deg: th, labels: [{ p: g, t: deg(x) }, { p: t, t: '?' }] }, answer: ans(r),
          hints: ['Как называются отмеченные углы? Оба ли они между прямыми, по одну ли сторону от секущей?', how],
          solution: eqKind ? `Угол «?» равен данному: ${deg(r)}.` : `Угол «?» вместе с данным даёт 180°: 180° − ${deg(x)} = ${deg(r)}.`,
          wrongs: eqKind ? wr(r, { 'alternate-180': 180 - x }) : wr(r, { 'one-sided-equal': x }), data: { kind, th, g, t },
        };
      }
      if (kind === 'name') {
        const pk = pick(['alt', 'corr', 'one']), pr = shuffle(pick(PAIRS[pk])), right = PNAME[pk];
        return {
          story: 'Прямые a и b пересечены секущей c.', question: 'Как называются углы 1 и 2?',
          figure: { type: 'par7', deg: th, par: false, labels: [{ p: pr[0], t: '1' }, { p: pr[1], t: '2' }] }, answer: right, accept: 'choice', choices: PNAMES,
          hints: ['Лежат ли оба угла между прямыми a и b? По одну или по разные стороны от секущей?', pk === 'corr' ? 'Углы на одинаковых местах у каждой из прямых: один у прямой a, другой у b, «смотрят» в одну сторону.' : pk === 'alt' ? 'Оба угла между прямыми и по разные стороны от секущей.' : 'Оба угла между прямыми и по одну сторону от секущей.'],
          solution: `Углы 1 и 2 — ${right}.`,
          wrongs: wc(right, { 'pair-names': { alt: 'односторонние', one: 'накрест лежащие', corr: 'накрест лежащие' }[pk] }), data: { kind, a: pr[0], b: pr[1] },
        };
      }
      if (kind === 'sum') {
        const pk = pick(['alt', 'corr']), pr = pick(PAIRS[pk]), v = parVal(pr[0], th);
        const tgt = PAIRS.one.map(o => (o[0] === pr[0] || o[0] === pr[1] ? o[1] : o[1] === pr[0] || o[1] === pr[1] ? o[0] : null)).filter(Boolean);
        const t = pick(tgt), r = parVal(t, th);
        return {
          story: `Прямые a и b параллельны, c — секущая. ∠${pr[0]} + ∠${pr[1]} = ${deg(2 * v)}.`, question: `Найди ∠${t} (в градусах).`,
          figure: { type: 'par7', deg: th, labels: [{ p: pr[0], t: String(pr[0]) }, { p: pr[1], t: String(pr[1]) }, { p: t, t: String(t) }] }, answer: ans(r),
          hints: [`Как связаны ∠${pr[0]} и ∠${pr[1]}? Чему равен каждый из них?`, `∠${pr[0]} = ∠${pr[1]} = ${deg(2 * v)} : 2 = ${deg(v)}. С каким из них ∠${t} односторонний?`],
          solution: `∠${pr[0]} и ∠${pr[1]} — ${PNAME[pk]}, они равны: по ${deg(v)}. ∠${t} односторонний с одним из них: 180° − ${deg(v)} = ${deg(r)}.`,
          wrongs: wr(r, { 'one-sided-equal': v }), data: { kind, th, pr, t },
        };
      }
      if (kind === 'ratio') {
        const [m, n] = pick([[1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [4, 5], [2, 7], [5, 7], [7, 11], [4, 11]]), u = 180 / (m + n), wantBig = Math.random() < 0.5, r = (wantBig ? n : m) * u;
        return {
          story: `Прямые a и b параллельны, c — секущая. Два односторонних угла относятся как ${m} : ${n}.`, question: `Найди ${wantBig ? 'больший' : 'меньший'} из них (в градусах).`, answer: ans(r),
          hints: ['Чему равна сумма односторонних углов при параллельных прямых?', `${kx(m)} + ${kx(n)} = 180°, то есть ${m + n}x = 180°.`],
          solution: `${m + n}x = 180°, x = ${deg(u)}; ${wantBig ? 'больший' : 'меньший'} угол — ${deg(r)}.`,
          wrongs: {}, data: { kind, m, n, wantBig },
        };
      }
      // test: параллельны ли прямые
      const pk = pick(['alt', 'corr', 'one']), isPar = Math.random() < 0.55, x = pickAng(25, 155, step, z => z !== 90);
      const y = pk === 'one' ? (isPar ? 180 - x : x) : (isPar ? x : 180 - x), A = isPar ? 'Да' : 'Нет', s = rnd(0, 1);
      const kidSays = pk === 'one' ? (x === y ? 'Да' : 'Нет') : (x + y === 180 ? 'Да' : 'Нет');
      return {
        story: s === 0 ? `Прямые a и b пересечены секущей c. ∠1 и ∠2 — ${PNAME[pk]} углы, ∠1 = ${deg(x)}, ∠2 = ${deg(y)}.` : `Плотник проверяет, параллельны ли две доски: он прибил к ним наискосок рейку и измерил углы. ∠1 и ∠2 — ${PNAME[pk]}: ${deg(x)} и ${deg(y)}.`,
        question: s === 0 ? 'Параллельны ли прямые a и b?' : 'Параллельны ли доски?', answer: A, accept: 'choice', choices: ['Да', 'Нет'],
        hints: ['Вспомни признак параллельности: что должно быть верно для таких углов?', pk === 'one' ? 'Для односторонних углов прямые параллельны, если сумма углов 180°.' : `Для ${pk === 'alt' ? 'накрест лежащих' : 'соответственных'} углов прямые параллельны, если углы равны.`],
        solution: pk === 'one' ? `${deg(x)} + ${deg(y)} = ${deg(x + y)}${isPar ? ' — односторонние углы дают 180°, прямые параллельны.' : ', а не 180°, — прямые не параллельны.'}` : `${isPar ? 'Углы равны' : 'Углы не равны'} — прямые ${isPar ? '' : 'не '}параллельны.`,
        wrongs: wc(A, { [pk === 'one' ? 'one-sided-equal' : 'alternate-180']: kidSays }), data: { kind, pk, x, y },
      };
    },
    verify(task) {
      const d = task.data, A = task.answer;
      if (d.kind === 'find') return same(parGeo(d.t, d.th), Number(A));
      if (d.kind === 'name') return pairKind(d.a, d.b) === A;
      if (d.kind === 'sum') return same(parGeo(d.pr[0], d.th) + parGeo(d.pr[1], d.th), 2 * parVal(d.pr[0], d.th)) && same(parGeo(d.t, d.th), Number(A));
      if (d.kind === 'ratio') { const r = Number(A), other = 180 - r; return d.wantBig ? same(r * d.m, other * d.n) : same(r * d.n, other * d.m); }
      if (d.kind === 'test') return ((d.pk === 'one' ? same(d.x + d.y, 180) : same(d.x, d.y)) ? 'Да' : 'Нет') === A;
      return false;
    },
  };

  /* =========================================================
     6. Прямоугольный треугольник
     ========================================================= */
  const RT_NAMES = [['A', 'B', 'C'], ['M', 'N', 'K'], ['D', 'E', 'F'], ['P', 'Q', 'R']];
  const sideNm = (N, i, j) => (i < j ? N[i] + N[j] : N[j] + N[i]);
  const right = {
    id: 'g7-right', strand: SG, short: 'Прямоугольный', title: 'Прямоугольный треугольник',
    frp: ['Прямоугольный треугольник: сумма острых углов', 'Прямоугольный треугольник с углом в 30°'],
    goal: 'Находить острые углы прямоугольного треугольника и пользоваться свойством катета, лежащего против угла 30°.',
    requires: ['g7-triangle-sum'],
    explain: {
      model: 'Лестницу прислонили к стене. Стена и пол образуют прямой угол, 90°, и лестница вместе со стеной и полом — прямоугольный треугольник. На два острых угла остаётся 180° − 90° = 90°. А если лестница стоит к полу под углом 30°, её верх окажется на высоте ровно в половину длины лестницы.',
      figure: { type: 'tri7', ang: [30, 90, 60], right: 1, labels: ['30°', '', '60°'], sides: ['', '2 м', '4 м'] },
      figureCaption: 'Лестница 4 м под углом 30° к полу: верх на высоте 2 м — половина длины лестницы',
      rule: '<ul class="rule-list"><li>В прямоугольном треугольнике один угол 90°, поэтому <b>сумма острых углов — 90°</b>.</li><li><b>Гипотенуза</b> — сторона напротив прямого угла, самая длинная. <b>Катеты</b> — стороны прямого угла.</li><li><b>Катет, лежащий против угла 30°, равен половине гипотенузы.</b> И наоборот: если катет равен половине гипотенузы, то против него лежит угол 30°.</li></ul>',
      examples: [
        { q: 'В прямоугольном треугольнике один острый угол — 35°. Найди другой.', fig: { type: 'tri7', ang: [35, 55, 90], right: 2, labels: ['35°', '?', ''] },
          choices: ['55°', '145°'], correct: 0, wrong: { 1: 'acute-sum-180' },
          steps: ['Прямой угол забирает 90° из 180°, на два острых угла остаётся 90°.', '90° − 35° = 55°.'] },
        { q: 'В треугольнике ABC ∠C = 90°, ∠A = 30°, гипотенуза AB = 14 см. Найди BC.', fig: { type: 'tri7', ang: [30, 60, 90], names: ['A', 'B', 'C'], right: 2, labels: ['30°', '', ''], sides: ['14 см', '?', ''] },
          choices: ['7 см', '28 см'], correct: 0, wrong: { 1: 'half-double' },
          steps: ['BC лежит напротив угла A, равного 30°.', 'Значит, BC — половина гипотенузы: 14 : 2 = 7 см.'] },
        { q: 'В треугольнике ABC ∠C = 90°, ∠B = 30°. Какой катет равен половине гипотенузы AB?', fig: { type: 'tri7', ang: [60, 30, 90], names: ['A', 'B', 'C'], right: 2, labels: ['', '30°', ''] },
          choices: ['AC', 'BC'], correct: 0, wrong: { 1: 'leg-confuse' },
          steps: ['Против угла B лежит сторона, которая не выходит из вершины B, — это AC.', 'Значит, AC = AB : 2.'] },
      ],
    },
    mistakes: [
      { id: 'acute-sum-180', title: 'Забывает про прямой угол: другой острый угол = 180° − данный', kidName: 'Без прямого',
        kidRule: 'ты вычитаешь острый угол из 180° и забываешь, что 90° уже занял прямой угол',
        say: 'В треугольнике три угла, и один из них прямой — 90°. На два острых угла остаётся только 90°.',
        fixIdea: 'Острые углы прямоугольного треугольника вместе дают 90°.',
        explainOptions: ['Прямой угол забирает 90° из 180°, на два острых остаётся 90°', 'Острые углы вместе дают 180°, потому что они смежные', 'Острые углы всегда по 45°'],
        conflicts: [{ text: 'Острый угол — 40°. По твоему правилу второй угол равен 180° − 40° = 140°. Но тогда в треугольнике 90° + 40° + 140° = 270°, а не 180°. Да и 140° — совсем не острый угол.', ask: 'Может второй угол быть 140°?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 90 + 40 + 140 !== 180 && 90 + 40 + 50 === 180,
          figure: { type: 'tri7', ang: [40, 50, 90], right: 2, labels: ['40°', '?', ''] } }],
        root: 'g6-triangles' },
      { id: 'half-double', title: 'Путает, что вдвое больше: катет или гипотенуза', kidName: 'Вверх ногами',
        kidRule: 'ты удваиваешь там, где надо делить пополам, или наоборот — и катет выходит длиннее гипотенузы',
        say: 'Гипотенуза — самая длинная сторона прямоугольного треугольника. Катет против угла 30° — её половина: катет = гипотенуза : 2, гипотенуза = катет · 2.',
        fixIdea: 'Гипотенуза — самая длинная сторона: катет против 30° вдвое короче её.',
        explainOptions: ['Гипотенуза лежит напротив прямого угла — самого большого, поэтому она длиннее катета', 'Катет против 30° вдвое длиннее гипотенузы', 'Катет против 30° равен гипотенузе'],
        conflicts: [{ text: 'Лестница длиной 6 м стоит под углом 30° к полу. По твоему правилу её верх окажется на высоте 6 · 2 = 12 м — выше, чем длина самой лестницы.', ask: 'Может верх лестницы длиной 6 м оказаться на высоте 12 м?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 12 > 6 && same(6 * Math.sin(30 * RAD), 3),
          figure: { type: 'tri7', ang: [30, 90, 60], right: 1, labels: ['30°', '', ''], sides: ['', '?', '6 м'] } }],
        root: 'g6-triangles' },
      { id: 'leg-confuse', title: 'Путает катеты: берёт половиной гипотенузы катет, прилежащий к углу 30°', kidName: 'Не тот катет',
        kidRule: 'ты считаешь половиной гипотенузы катет, который выходит из вершины угла 30°, а не лежит напротив него',
        say: 'Против угла лежит сторона, которая его не касается. Найди угол 30° и посмотри на сторону напротив — она и равна половине гипотенузы.',
        fixIdea: 'Половина гипотенузы — катет напротив угла 30°: он не выходит из вершины этого угла.',
        explainOptions: ['Против угла лежит сторона, которая не выходит из его вершины', 'Против угла лежит сторона, выходящая из его вершины', 'Любой катет равен половине гипотенузы'],
        conflicts: [{ text: 'Чертёжный угольник с углами 30°, 60° и 90°, гипотенуза 20 см. Его короткий катет — 10 см, длинный — около 17 см. По твоему правилу половина гипотенузы — катет у вершины угла 30°, то есть длинный. Но 10 см — короткий катет, и он лежит напротив угла 30°: напротив самого маленького угла — самая короткая сторона.', ask: 'Какой катет равен 10 см?', choices: ['напротив угла 30°', 'у вершины угла 30°'], right: 'напротив угла 30°',
          verify: () => same(20 * Math.sin(30 * RAD), 10) && Math.abs(20 * Math.cos(30 * RAD) - 17.32) < 0.01,
          figure: { type: 'tri7', ang: [30, 60, 90], right: 2, labels: ['30°', '', ''], sides: ['20 см', '', ''] } }],
        root: 'g6-triangles' },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['acute', 'h2l', 'l2h'], ['acute', 'h2l', 'l2h', 'which'], ['acute', 'which', 'sum', 'alt', 'h2l60']));
      if (kind === 'acute') {
        const a = pickAng(L3(lv, 10, 5, 1), L3(lv, 80, 85, 89), L3(lv, 10, 5, 1)), r = 90 - a, s = rnd(0, 3);
        const story = [`Лестница прислонена к стене и образует с полом угол ${deg(a)}.`, `Солнечные лучи падают на землю под углом ${deg(a)}. Рядом стоит вертикальный столб.`, `Пандус наклонён к земле под углом ${deg(a)}, а опора под ним вертикальна.`, `В треугольнике ABC ∠C = 90°, ∠A = ${deg(a)}.`][s];
        const question = inDeg(['Какой угол лестница образует со стеной?', 'Найди угол между лучом и столбом.', 'Найди угол между пандусом и опорой.', 'Найди ∠B.'][s]);
        const figure = s === 3 ? { type: 'tri7', ang: [a, 90 - a, 90], names: ['A', 'B', 'C'], right: 2, labels: [deg(a), '?', ''] } : { type: 'tri7', ang: [a, 90, 90 - a], right: 1, labels: [deg(a), '', '?'] };
        return {
          story, question, figure, answer: ans(r),
          hints: ['Найди в этой картинке прямоугольный треугольник. Сколько градусов остаётся на два острых угла?', `Прямой угол — 90°, на острые углы — тоже 90°: 90° − ${deg(a)}.`],
          solution: `Сумма острых углов прямоугольного треугольника — 90°: 90° − ${deg(a)} = ${deg(r)}.`,
          wrongs: wr(r, { 'acute-sum-180': 180 - a }), data: { kind, a },
        };
      }
      if (kind === 'h2l' || kind === 'h2l60') {
        const s = kind === 'h2l60' ? 4 : rnd(0, 3), c = [pick([4, 6, 8, 10, 12]), 2 * rnd(5, 30), 2 * rnd(1, 6), 2 * rnd(2, L3(lv, 10, 20, 30)), 2 * rnd(3, 25)][s], r = c / 2;
        const story = [`Лестница длиной ${c} м стоит под углом 30° к полу.`, `Нитка воздушного змея длиной ${c} м натянута под углом 30° к земле. Нитку держат у самой земли.`, `Пандус длиной ${c} м поднимается под углом 30° к земле.`,
          `В треугольнике ABC ∠C = 90°, ∠A = 30°, гипотенуза AB = ${c} см.`, `В треугольнике ABC ∠C = 90°, ∠A = 60°, гипотенуза AB = ${c} см.`][s];
        const question = ['На какой высоте её верхний конец (в м)?', 'На какой высоте змей (в м)?', 'На какую высоту он поднимает (в м)?', 'Найди BC (в см).', 'Найди AC (в см).'][s];
        const u = s >= 3 ? 'см' : 'м';
        const figure = s === 3 ? { type: 'tri7', ang: [30, 60, 90], names: ['A', 'B', 'C'], right: 2, labels: ['30°', '', ''], sides: [`${c} см`, '?', ''] }
          : s === 4 ? { type: 'tri7', ang: [60, 30, 90], names: ['A', 'B', 'C'], right: 2, labels: ['60°', '', ''], sides: [`${c} см`, '', '?'] }
            : { type: 'tri7', ang: [30, 90, 60], right: 1, labels: ['30°', '', ''], sides: ['', '?', `${c} м`] };
        return {
          story, question, figure, answer: ans(r),
          hints: s === 4 ? ['Найди второй острый угол. Против какого катета лежит угол 30°?', `∠B = 90° − 60° = 30°, а против него лежит AC. AC — половина гипотенузы.`]
            : ['Что известно про катет, который лежит против угла 30°?', `Этот катет — половина гипотенузы: ${c} : 2.`],
          solution: (s === 4 ? '∠B = 90° − 60° = 30°, против него лежит AC. ' : 'Искомый катет лежит против угла 30°. ') + `Он равен половине гипотенузы: ${c} : 2 = ${num(r)} ${u}.`,
          wrongs: wr(r, { 'half-double': 2 * c }), data: { kind, c, s },
        };
      }
      if (kind === 'l2h') {
        const s = rnd(0, 2), a = [rnd(2, 6), rnd(2, L3(lv, 10, 20, 40)), rnd(2, 8)][s], r = 2 * a;
        const story = [`Верх ската детской горки — на высоте ${a} м, скат наклонён к земле под углом 30°.`, `В треугольнике ABC ∠C = 90°, ∠B = 30°, AC = ${a} см.`, `Конёк крыши на ${a} м выше перекрытия, скат наклонён к перекрытию под углом 30°.`][s];
        const question = ['Найди длину ската (в м).', 'Найди AB (в см).', 'Найди длину ската крыши (в м).'][s];
        const figure = s === 1 ? { type: 'tri7', ang: [60, 30, 90], names: ['A', 'B', 'C'], right: 2, labels: ['', '30°', ''], sides: ['?', '', `${a} см`] } : { type: 'tri7', ang: [30, 90, 60], right: 1, labels: ['30°', '', ''], sides: ['', `${a} м`, '?'] };
        return {
          story, question, figure, answer: ans(r),
          hints: ['Данный катет лежит против угла 30°. Какая это часть гипотенузы?', `Катет — половина гипотенузы, значит, гипотенуза вдвое длиннее: ${a} · 2.`],
          solution: `Катет против угла 30° — половина гипотенузы, поэтому гипотенуза = ${a} · 2 = ${r} ${s === 1 ? 'см' : 'м'}.`,
          wrongs: wr(r, { 'half-double': a / 2 }), data: { kind, a },
        };
      }
      if (kind === 'which') {
        const N = pick(RT_NAMES), rv = rnd(0, 2), others = [0, 1, 2].filter(i => i !== rv), sv = pick(others), uv = others.find(i => i !== sv), by60 = lv === 3 && Math.random() < 0.5;
        const ang = [0, 0, 0]; ang[rv] = 90; ang[sv] = 30; ang[uv] = 60;
        const labels = ['', '', '']; if (by60) labels[uv] = '60°'; else labels[sv] = '30°';
        const opp = sideNm(N, rv, uv), adj = sideNm(N, rv, sv), hyp = sideNm(N, sv, uv);
        return {
          story: `В треугольнике ${N.join('')} ∠${N[rv]} = 90°, ∠${by60 ? N[uv] : N[sv]} = ${by60 ? '60°' : '30°'}.`, question: `Какой катет равен половине гипотенузы ${hyp}?`,
          figure: { type: 'tri7', ang, names: N, right: rv, labels }, answer: opp, accept: 'choice', choices: [opp, adj].sort(),
          hints: [by60 ? `Сначала найди угол 30°: ∠${N[sv]} = 90° − 60°. Какая сторона лежит напротив него?` : `Какая сторона лежит напротив угла ${N[sv]} — то есть не выходит из вершины ${N[sv]}?`, `Из вершины ${N[sv]} выходят ${adj} и ${hyp}. Напротив неё — ${opp}.`],
          solution: (by60 ? `∠${N[sv]} = 90° − 60° = 30°. ` : '') + `Против угла ${N[sv]} = 30° лежит катет ${opp}, он равен половине гипотенузы ${hyp}.`,
          wrongs: { 'leg-confuse': adj }, data: { kind, N, rv, sv, by60 },
        };
      }
      if (kind === 'sum') {
        const S = 3 * rnd(3, 30), r = 2 * S / 3;
        return {
          story: `В прямоугольном треугольнике один из острых углов равен 30°, а сумма гипотенузы и меньшего катета — ${S} см.`, question: 'Найди гипотенузу (в см).',
          figure: { type: 'tri7', ang: [30, 90, 60], right: 1, labels: ['30°', '', ''] }, answer: ans(r),
          hints: ['Меньший катет лежит против угла 30°. Как он связан с гипотенузой?', `Пусть меньший катет — x, тогда гипотенуза — 2x. x + 2x = ${S}.`],
          solution: `x + 2x = ${S}, x = ${S / 3}; гипотенуза = 2 · ${S / 3} = ${r} см.`,
          wrongs: wr(r, { 'half-double': S / 3 }), data: { kind, S },
        };
      }
      // alt: высота из прямого угла
      const a = 2 * rnd(2, 15), r = a / 2;
      return {
        story: `В треугольнике ABC ∠C = 90°, ∠A = 30°, BC = ${a} см. CH — высота.`, question: 'Найди BH (в см).',
        figure: { type: 'tri7', ang: [30, 60, 90], names: ['A', 'B', 'C'], right: 2, labels: ['30°', '', ''], sides: ['', `${a} см`, ''], cev: [{ from: 2, kind: 'foot', name: 'H' }] }, answer: ans(r),
        hints: ['Рассмотри треугольник BCH: он прямоугольный. Какой в нём угол при вершине C?', `∠B = 60°, поэтому ∠BCH = 90° − 60° = 30°. BH лежит против него.`],
        solution: `∠B = 90° − 30° = 60°, в треугольнике BCH ∠BCH = 30°. BH лежит против угла 30°: BH = BC : 2 = ${r} см.`,
        wrongs: wr(r, { 'half-double': 2 * a }), data: { kind, a },
      };
    },
    verify(task) {
      const d = task.data, A = task.answer;
      if (d.kind === 'acute') return same(180 - 90 - d.a, Number(A));
      if (d.kind === 'h2l' || d.kind === 'h2l60') return same(d.c * Math.sin(30 * RAD), Number(A));
      if (d.kind === 'l2h') return same(d.a / Math.sin(30 * RAD), Number(A));
      if (d.kind === 'which') { const opp = [0, 1, 2].filter(i => i !== d.sv); return A === sideNm(d.N, opp[0], opp[1]) && opp.includes(d.rv); }
      if (d.kind === 'sum') return same(Number(A) * (1 + Math.sin(30 * RAD)), d.S);
      if (d.kind === 'alt') return same(d.a * Math.cos(60 * RAD), Number(A));
      return false;
    },
  };

  /* =========================================================
     7. Неравенство треугольника
     ========================================================= */
  const exists = (a, b, c) => a < b + c && b < a + c && c < a + b;
  const thirdRange = (a, b) => { const xs = []; for (let x = 1; x <= a + b + 5; x++) if (exists(a, b, x)) xs.push(x); return xs; };
  const TI_NAMES = [['A', 'B', 'C'], ['K', 'L', 'M'], ['D', 'E', 'F'], ['M', 'N', 'P']];
  const ineq = {
    id: 'g7-triangle-ineq', strand: SG, short: 'Неравенство', title: 'Неравенство треугольника',
    frp: ['Неравенство треугольника', 'Теорема о большем угле и большей стороне треугольника'],
    goal: 'Проверять, существует ли треугольник с данными сторонами, и находить, какой может быть третья сторона.',
    requires: ['g6-triangles', 'g7-isosceles'],
    explain: {
      model: 'Возьми три палочки: 3 см, 4 см и 9 см. Положи длинную, а короткие пристрой к её концам — сколько ни поворачивай, они не дотянутся друг до друга: вместе они 3 + 4 = 7 см, а перекрыть нужно 9 см. Треугольник получится, только если две короткие палочки вместе длиннее третьей.',
      figure: { type: 'sticks7', lens: [3, 4, 9], unit: 'см' },
      figureCaption: '3 + 4 < 9: короткие палочки не сходятся — треугольника нет',
      rule: '<ul class="rule-list"><li><b>Каждая сторона треугольника меньше суммы двух других.</b></li><li>Проверять достаточно <b>самую длинную</b> сторону: если она меньше суммы двух других, треугольник существует.</li><li>Если наибольшая сторона <b>равна</b> сумме двух других, треугольника нет: все три точки лежат на одной прямой.</li><li>Третья сторона x при сторонах a и b (a ≥ b): <b>a − b &lt; x &lt; a + b</b> — неравенства строгие.</li><li><b>Против большей стороны лежит больший угол</b>, против большего угла — большая сторона.</li></ul>',
      examples: [
        { q: 'Существует ли треугольник со сторонами 2, 5 и 8?', fig: { type: 'sticks7', lens: [2, 5, 8] },
          choices: ['Нет', 'Да'], correct: 0, wrong: { 1: 'not-largest' },
          steps: ['Самая длинная сторона — 8.', '2 + 5 = 7 < 8 — короткие стороны не дотягиваются. Треугольника нет.'] },
        { q: 'Две стороны треугольника — 4 и 7. Какую наибольшую целую длину может иметь третья сторона?',
          choices: ['10', '11'], correct: 0, wrong: { 1: 'equal-ok' },
          steps: ['Третья сторона меньше 4 + 7 = 11.', 'Неравенство строгое: 11 не подходит, наибольшее целое — 10.'] },
        { q: 'В треугольнике ABC стороны BC = 7 и AC = 5. Какой угол больше: ∠A или ∠B?',
          choices: ['∠A', '∠B'], correct: 0, wrong: { 1: 'angle-at-side' },
          steps: ['Против ∠A лежит BC = 7, против ∠B лежит AC = 5.', 'Против большей стороны — больший угол: ∠A больше.'] },
      ],
    },
    mistakes: [
      { id: 'not-largest', title: 'Проверяет неравенство не для наибольшей стороны', kidName: 'Малая проверка',
        kidRule: 'ты сравниваешь с суммой двух других не самую длинную сторону — и проверка всегда проходит',
        say: 'Короткая сторона почти всегда меньше суммы двух других — такая проверка ничего не говорит. Сравни самую длинную сторону с суммой двух коротких.',
        fixIdea: 'Проверяй самую длинную сторону: она должна быть меньше суммы двух других.',
        explainOptions: ['Если самая длинная сторона меньше суммы двух других, то для остальных сторон это верно тем более', 'Достаточно проверить любую сторону', 'Нужно проверить самую короткую сторону'],
        conflicts: [{ text: 'Стороны 1, 2 и 10. По твоему правилу проверяем короткую сторону: 1 < 2 + 10 — верно, значит, треугольник есть. Но попробуй сложить: палочки 1 и 2 вместе дают 3, а им надо дотянуться друг до друга через 10.', ask: 'Сложится треугольник из палочек 1, 2 и 10?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 1 < 2 + 10 && !exists(1, 2, 10),
          figure: { type: 'sticks7', lens: [1, 2, 10] } }],
        root: 'g5-segments' },
      { id: 'equal-ok', title: 'Считает, что треугольник есть и при равенстве: наибольшая сторона = сумме двух других', kidName: 'Впритык',
        kidRule: 'ты считаешь, что треугольник получится, даже если длинная сторона ровно равна сумме двух других',
        say: 'Если длинная сторона ровно равна сумме двух других, короткие стороны лягут прямо на неё — получится отрезок, а не треугольник. Неравенство строгое: нужно «меньше».',
        fixIdea: 'Треугольник есть, только если наибольшая сторона строго меньше суммы двух других.',
        explainOptions: ['Если длинная сторона равна сумме двух других, вершина ложится на неё — получается отрезок', 'Получается очень плоский, но всё-таки треугольник', 'Равенство не важно, важна только сумма'],
        conflicts: [{ text: 'Палочки 3, 5 и 8. По твоему правилу треугольник есть: 8 = 3 + 5. Пристрой 3 и 5 к концам восьмёрки: чтобы дотянуться друг до друга, им придётся лечь прямо на неё. Вершина окажется на стороне — это отрезок, а не треугольник.', ask: 'Получится треугольник?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 3 + 5 === 8 && !exists(3, 5, 8),
          figure: { type: 'sticks7', lens: [3, 5, 8] } }],
        root: 'g5-segments' },
      { id: 'no-lower-bound', title: 'Забывает нижнюю границу: третья сторона больше разности двух других', kidName: 'Без дна',
        kidRule: 'ты помнишь только, что третья сторона меньше суммы двух других, и забываешь, что она должна быть больше их разности',
        say: 'Третья сторона не может быть слишком короткой: тогда уже длинная из данных сторон окажется больше суммы двух других. Поэтому третья сторона больше разности данных сторон.',
        fixIdea: 'Третья сторона больше разности и меньше суммы двух данных сторон.',
        explainOptions: ['Длинная из данных сторон тоже должна быть меньше суммы двух других — отсюда нижняя граница', 'Третья сторона может быть сколь угодно маленькой', 'Третья сторона должна быть больше суммы двух данных'],
        conflicts: [{ text: 'Стороны 2 и 9, третья — 1. По твоему правилу подходит: 1 < 2 + 9. Но тогда сторона 9 длиннее двух других вместе: 1 + 2 = 3.', ask: 'Может третья сторона быть равна 1?', choices: ['Да', 'Нет'], right: 'Нет', verify: () => 1 < 2 + 9 && !exists(1, 2, 9),
          figure: { type: 'sticks7', lens: [1, 2, 9] } }],
        root: 'g5-segments' },
      { id: 'angle-at-side', title: 'Ищет больший угол у конца большей стороны, а не напротив неё', kidName: 'Не напротив',
        kidRule: 'ты думаешь, что больший угол лежит у большей стороны, а не напротив неё',
        say: 'Больший угол лежит напротив большей стороны: чем шире раскрыт угол, тем длиннее отрезок, который соединяет концы его сторон.',
        fixIdea: 'Против большей стороны лежит больший угол, против большего угла — большая сторона.',
        explainOptions: ['Чем шире раскрыт угол, тем длиннее сторона напротив него', 'Больший угол прилегает к большей стороне', 'Углы и стороны треугольника не связаны'],
        conflicts: [{ text: 'Раскрой ножницы шире — концы лезвий разойдутся дальше. Треугольник ABC: AB = 3, BC = 4, AC = 6. Самая длинная сторона — AC, против неё лежит ∠B. По твоему правилу наибольший угол у концов AC — ∠A или ∠C. Но ∠B ≈ 117°, ∠A ≈ 36°, ∠C ≈ 26°.', ask: 'Какой угол треугольника наибольший?', choices: ['∠B', '∠A'], right: '∠B',
          verify: () => { const B = Math.acos((16 + 9 - 36) / 24) / RAD, A = Math.acos((36 + 9 - 16) / 36) / RAD; return Math.round(B) === 117 && Math.round(A) === 36 && Math.round(180 - A - B) === 26; } }] },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['exists', 'exists', 'max', 'angle'], ['exists', 'max', 'min', 'count', 'angle', 'iso'], ['exists', 'min', 'count', 'iso', 'angle']));
      const M = L3(lv, 12, 25, 60);
      if (kind === 'exists') {
        const t = pick(['ok', 'ok', 'flat', 'no']); let a, b, c;
        do { a = rnd(1, M); b = rnd(1, M); c = t === 'ok' ? rnd(Math.max(a, b), a + b - 1) : t === 'flat' ? a + b : a + b + rnd(1, L3(lv, 4, 8, 12)); } while (a === b || c === Math.max(a, b) || (t === 'ok' && !exists(a, b, c)));
        const L = shuffle([a, b, c]), A = t === 'ok' ? 'Да' : 'Нет', s = rnd(0, 2);
        const story = [`У тебя три палочки длиной ${L[0]}, ${L[1]} и ${L[2]} см.`, `Из трёх реек длиной ${L[0]}, ${L[1]} и ${L[2]} дм хотят сколотить треугольную раму.`, `Даны три отрезка: ${L[0]}, ${L[1]} и ${L[2]}.`][s];
        const question = ['Можно ли сложить из них треугольник?', 'Получится ли рама?', 'Существует ли треугольник с такими сторонами?'][s];
        return {
          story, question, answer: A, accept: 'choice', choices: ['Да', 'Нет'],
          hints: ['Найди самую длинную сторону и сравни её с суммой двух других.', `Самая длинная — ${c}; ${a} + ${b} = ${a + b}. Меньше ли ${c}, чем ${a + b}?`],
          solution: t === 'ok' ? `${c} < ${a} + ${b} = ${a + b} — треугольник существует.` : t === 'flat' ? `${c} = ${a} + ${b} — стороны лягут на одну прямую, треугольника нет.` : `${c} > ${a} + ${b} = ${a + b} — короткие стороны не дотягиваются, треугольника нет.`,
          wrongs: wc(A, { 'not-largest': t === 'no' ? 'Да' : null, 'equal-ok': t === 'flat' ? 'Да' : null }), data: { kind, L },
        };
      }
      if (kind === 'max' || kind === 'min' || kind === 'count') {
        let a, b; do { a = rnd(2, M); b = rnd(2, M); } while (a === b || (kind === 'min' && Math.abs(a - b) < 2));
        const lo = Math.abs(a - b), hi = a + b, s = rnd(0, 1);
        const story = s === 0 ? `Две стороны треугольника — ${a} см и ${b} см.` : `Из двух реек длиной ${a} дм и ${b} дм и третьей рейки сколачивают треугольную раму.`, u = s === 0 ? 'см' : 'дм';
        if (kind === 'max') return {
          story, question: s === 0 ? `Какую наибольшую целую длину может иметь третья сторона (в ${u})?` : `Какой наибольшей целой длины может быть третья рейка (в ${u})?`, answer: ans(hi - 1),
          hints: ['Третья сторона должна быть меньше суммы двух данных. Неравенство строгое или нет?', `Третья сторона меньше ${a} + ${b} = ${hi}. Наибольшее целое число, меньшее ${hi}, — ?`],
          solution: `Третья сторона меньше ${a} + ${b} = ${hi}, и равной ${hi} быть не может. Наибольшее целое — ${hi - 1} ${u}.`,
          wrongs: wr(hi - 1, { 'equal-ok': hi }), data: { kind, a, b },
        };
        if (kind === 'min') return {
          story, question: s === 0 ? `Какую наименьшую целую длину может иметь третья сторона (в ${u})?` : `Какой наименьшей целой длины может быть третья рейка (в ${u})?`, answer: ans(lo + 1),
          hints: ['Может ли третья сторона быть совсем маленькой? Проверь неравенство для длинной из данных сторон.', `Длинная сторона ${Math.max(a, b)} должна быть меньше ${Math.min(a, b)} + x, значит, x > ${lo}.`],
          solution: `x > ${Math.max(a, b)} − ${Math.min(a, b)} = ${lo}, и равной ${lo} быть не может. Наименьшее целое — ${lo + 1} ${u}.`,
          wrongs: wr(lo + 1, { 'equal-ok': lo, 'no-lower-bound': 1 }), data: { kind, a, b },
        };
        const r = hi - lo - 1;
        return {
          story, question: `Сколько существует различных целых значений длины третьей ${s === 0 ? 'стороны' : 'рейки'}?`, answer: ans(r),
          hints: ['Найди границы: третья сторона больше разности и меньше суммы двух данных.', `${lo} < x < ${hi}. Сколько целых чисел строго между ${lo} и ${hi}?`],
          solution: `${lo} < x < ${hi}: подходят целые числа от ${lo + 1} до ${hi - 1}, их ${r}.`,
          wrongs: wr(r, { 'no-lower-bound': hi - 1, 'equal-ok': r + 2 }), data: { kind, a, b },
        };
      }
      if (kind === 'iso') {
        const p = rnd(2, L3(lv, 6, 10, 20)), q = rnd(2 * p + 1, 2 * p + L3(lv, 6, 10, 20)), r = 2 * q + p, s = rnd(0, 1);
        return {
          story: s === 0 ? `Две стороны равнобедренного треугольника — ${p} см и ${q} см.` : `Клумба — равнобедренный треугольник, две её стороны — ${p} м и ${q} м.`,
          question: s === 0 ? 'Найди его периметр (в см).' : 'Сколько метров бордюра нужно, чтобы обложить клумбу по краю?', answer: ans(r),
          hints: ['Какая из сторон может быть боковой? Проверь оба варианта неравенством треугольника.', `Если боковые по ${p}: ${p} + ${p} = ${2 * p} < ${q} — не годится. Значит, боковые стороны по ${q}.`],
          solution: `Стороны ${p}, ${p}, ${q} не годятся: ${2 * p} < ${q}. Значит, стороны ${q}, ${q}, ${p}, периметр ${q} + ${q} + ${p} = ${r}.`,
          wrongs: wr(r, { 'not-largest': 2 * p + q }), data: { kind, p, q },
        };
      }
      // angle: больший угол — против большей стороны
      const N = pick(TI_NAMES), [X, Y, Z] = N;
      if (Math.random() < 0.5) {
        let a, b, c; do { a = rnd(3, M); b = rnd(3, M); c = rnd(2, M + 10); } while (a === b || !exists(a, b, c) || c === a || c === b);
        const big = Math.random() < 0.6, Aside = a > b; // a = YZ против X, b = XZ против Y
        const right = (big === Aside) ? `∠${X}` : `∠${Y}`, wrong = right === `∠${X}` ? `∠${Y}` : `∠${X}`;
        return {
          story: `В треугольнике ${N.join('')} стороны ${Y}${Z} = ${a}, ${X}${Z} = ${b}, ${X}${Y} = ${c}.`, question: `Какой угол ${big ? 'больше' : 'меньше'}: ∠${X} или ∠${Y}?`,
          answer: right, accept: 'choice', choices: [`∠${X}`, `∠${Y}`],
          hints: [`Какая сторона лежит напротив угла ${X}, а какая — напротив угла ${Y}?`, `Напротив ∠${X} — ${Y}${Z} = ${a}, напротив ∠${Y} — ${X}${Z} = ${b}.`],
          solution: `Против ∠${X} лежит ${Y}${Z} = ${a}, против ∠${Y} — ${X}${Z} = ${b}. Против большей стороны — больший угол, поэтому ${big ? 'больше' : 'меньше'} ${right}.`,
          wrongs: { 'angle-at-side': wrong }, data: { kind, mode: 'sides', a, b, c, big, N },
        };
      }
      let al, be; do { al = rnd(20, 120); be = rnd(20, 120); } while (al === be || 180 - al - be < 15);
      const big = Math.random() < 0.6, right = (big === (al > be)) ? `${Y}${Z}` : `${X}${Z}`;
      const wrong = (big === (al > be)) ? `${X}${Z}` : `${Y}${Z}`;
      return {
        story: `В треугольнике ${N.join('')} ∠${X} = ${deg(al)}, ∠${Y} = ${deg(be)}.`, question: `Какая сторона ${big ? 'больше' : 'меньше'}: ${Y}${Z} или ${X}${Z}?`,
        answer: right, accept: 'choice', choices: [`${Y}${Z}`, `${X}${Z}`],
        hints: [`Какой угол лежит напротив стороны ${Y}${Z}, а какой — напротив ${X}${Z}?`, `Напротив ${Y}${Z} — ∠${X} = ${deg(al)}, напротив ${X}${Z} — ∠${Y} = ${deg(be)}.`],
        solution: `Против ${Y}${Z} лежит ∠${X} = ${deg(al)}, против ${X}${Z} — ∠${Y} = ${deg(be)}. Против большего угла — большая сторона, поэтому ${big ? 'больше' : 'меньше'} ${right}.`,
        wrongs: { 'angle-at-side': wrong }, data: { kind, mode: 'angles', al, be, big, N },
      };
    },
    verify(task) {
      const d = task.data, A = task.answer;
      if (d.kind === 'exists') return (exists(...d.L) ? 'Да' : 'Нет') === A;
      if (d.kind === 'max') { const xs = thirdRange(d.a, d.b); return same(Math.max(...xs), Number(A)); }
      if (d.kind === 'min') { const xs = thirdRange(d.a, d.b); return same(Math.min(...xs), Number(A)); }
      if (d.kind === 'count') return same(thirdRange(d.a, d.b).length, Number(A));
      if (d.kind === 'iso') { const P = [[d.p, d.p, d.q], [d.q, d.q, d.p]].filter(t => exists(...t)).map(t => t[0] + t[1] + t[2]); return P.length === 1 && same(P[0], Number(A)); }
      if (d.kind === 'angle') {
        const [X, Y, Z] = d.N;
        if (d.mode === 'sides') { // углы по теореме косинусов: a = YZ, b = XZ, c = XY
          const angX = Math.acos((d.b * d.b + d.c * d.c - d.a * d.a) / (2 * d.b * d.c)), angY = Math.acos((d.a * d.a + d.c * d.c - d.b * d.b) / (2 * d.a * d.c));
          return A === ((angX > angY) === d.big ? `∠${X}` : `∠${Y}`);
        }
        const yz = Math.sin(d.al * RAD), xz = Math.sin(d.be * RAD); // теорема синусов: стороны пропорциональны синусам противолежащих углов
        return A === ((yz > xz) === d.big ? `${Y}${Z}` : `${X}${Z}`);
      }
      return false;
    },
  };

  /* =========================================================
     8. Окружность: касательная, вписанная и описанная окружности
     ========================================================= */
  const CEN_IN = 'в точке пересечения биссектрис', CEN_OUT = 'в точке пересечения серединных перпендикуляров', CEN_MED = 'в точке пересечения медиан';
  const circle = {
    id: 'g7-circle', strand: SG, short: 'Касательная', title: 'Окружность: касательная, вписанная и описанная окружности',
    frp: ['Касательная к окружности', 'Окружность, вписанная в угол', 'Вписанная и описанная окружности треугольника', 'Свойство медианы прямоугольного треугольника, проведённой к гипотенузе'],
    goal: 'Пользоваться тем, что касательная перпендикулярна радиусу, и находить центры и радиусы вписанной и описанной окружностей.',
    requires: ['g-circle', 'g7-isosceles', 'g7-right'],
    explain: {
      model: 'Колесо велосипеда касается дороги в одной точке. Спица, которая смотрит прямо в эту точку, стоит к дороге под прямым углом: радиус — кратчайший путь от центра до дороги, а кратчайший путь до прямой — перпендикуляр. Так всегда: радиус, проведённый в точку касания, перпендикулярен касательной.',
      figure: { type: 'tan7', deg: 50, right: true },
      figureCaption: 'Радиус OA перпендикулярен касательной AB: ∠OAB = 90°',
      rule: '<ul class="rule-list"><li><b>Касательная перпендикулярна радиусу</b>, проведённому в точку касания: ∠OAB = 90°.</li><li>Отрезки касательных, проведённых из одной точки, равны, а прямая через эту точку и центр делит угол между касательными пополам.</li><li>Центр <b>вписанной</b> окружности — точка пересечения <b>биссектрис</b> треугольника.</li><li>Центр <b>описанной</b> окружности — точка пересечения <b>серединных перпендикуляров</b> к сторонам.</li><li>У прямоугольного треугольника центр описанной окружности — <b>середина гипотенузы</b>: гипотенуза — диаметр, R = гипотенуза : 2. Медиана, проведённая к гипотенузе, тоже равна её половине.</li></ul>',
      examples: [
        { q: 'AB — касательная к окружности с центром O, A — точка касания, ∠AOB = 50°. Найди ∠ABO.', fig: { type: 'tan7', deg: 50, lab: { AOB: '50°', ABO: '?' } },
          choices: ['40°', '65°'], correct: 0, wrong: { 1: 'tangent-no-right' },
          steps: ['Радиус OA перпендикулярен касательной: ∠OAB = 90°.', 'В треугольнике OAB: 180° − 90° − 50° = 40°.'] },
        { q: 'Гипотенуза прямоугольного треугольника — 10 см. Найди радиус описанной окружности.', fig: { type: 'tri7', ang: [37, 53, 90], right: 2, circle: 'out', cname: 'O', sides: ['10 см', '', ''] },
          choices: ['5 см', '10 см'], correct: 0, wrong: { 1: 'hyp-radius' },
          steps: ['Центр описанной окружности — середина гипотенузы, значит, гипотенуза — диаметр.', 'R = 10 : 2 = 5 см.'] },
        { q: 'Где находится центр окружности, вписанной в треугольник?',
          choices: ['в точке пересечения биссектрис', 'в точке пересечения серединных перпендикуляров'], correct: 0, wrong: { 1: 'centers-swap' },
          steps: ['Вписанная окружность касается всех трёх сторон, её центр одинаково удалён от сторон.', 'Точки, одинаково удалённые от сторон угла, лежат на его биссектрисе. Значит, центр — пересечение биссектрис.'] },
      ],
    },
    mistakes: [
      { id: 'tangent-no-right', title: 'Не видит прямого угла между радиусом и касательной и считает треугольник равнобедренным', kidName: 'Пропавший прямой',
        kidRule: 'ты не замечаешь прямого угла в точке касания и делишь оставшиеся градусы поровну, будто треугольник равнобедренный',
        say: 'В точке касания радиус и касательная образуют прямой угол — 90°. Отрезок до центра из точки вне окружности — не радиус, поэтому треугольник не равнобедренный.',
        fixIdea: 'Радиус, проведённый в точку касания, перпендикулярен касательной: в треугольнике есть угол 90°.',
        explainOptions: ['Касательная перпендикулярна радиусу, проведённому в точку касания', 'Треугольник с вершиной в центре окружности всегда равнобедренный', 'Касательная образует с радиусом угол 45°'],
        conflicts: [{ text: 'AB — касательная, ∠AOB = 60°. По твоему правилу треугольник OAB равнобедренный: ∠OAB = ∠OBA = (180° − 60°) : 2 = 60°. Тогда все углы по 60°, OB = OA, и точка B лежит на окружности. Но B лежит на касательной, а у касательной с окружностью только одна общая точка — A.', ask: 'Может точка B лежать на окружности?', choices: ['Да', 'Нет'], right: 'Нет',
          verify: () => (180 - 60) / 2 === 60 && 1 / Math.cos(60 * RAD) > 1 + 1e-9,
          figure: { type: 'tan7', deg: 60, lab: { AOB: '60°' } } }],
        root: 'g6-lines' },
      { id: 'hyp-radius', title: 'Считает гипотенузу радиусом описанной окружности, а не диаметром', kidName: 'Диаметрик',
        kidRule: 'ты считаешь, что радиус описанной окружности прямоугольного треугольника (и медиана к гипотенузе) равен всей гипотенузе',
        say: 'Центр описанной окружности прямоугольного треугольника — середина гипотенузы. Гипотенуза проходит через центр от края до края — это диаметр, а радиус и медиана к гипотенузе вдвое короче.',
        fixIdea: 'Гипотенуза — диаметр описанной окружности: R = гипотенуза : 2.',
        explainOptions: ['Центр описанной окружности — середина гипотенузы, поэтому гипотенуза — диаметр', 'Центр описанной окружности — в вершине прямого угла, поэтому R равен гипотенузе', 'Радиус описанной окружности равен катету'],
        conflicts: [{ text: 'Гипотенуза — 10 см. По твоему правилу R = 10 см. Но гипотенуза проходит через центр окружности — середину гипотенузы — и соединяет две точки окружности. Отрезок через центр с концами на окружности — диаметр, значит, диаметр 10 см.', ask: 'Чему равен радиус?', choices: ['5 см', '10 см'], right: '5 см',
          verify: () => { const P = [[0, 0], [10, 0], [6.4, 4.8]], c = circumOf(P); return same(c.r, 5) && same(c.c[0], 5) && same(c.c[1], 0); },
          figure: { type: 'tri7', ang: [37, 53, 90], right: 2, circle: 'out', cname: 'O', sides: ['10 см', '', ''] } }],
        root: 'g-circle' },
      { id: 'centers-swap', title: 'Путает центры вписанной и описанной окружностей', kidName: 'Не тот центр',
        kidRule: 'ты ищешь центр вписанной окружности на серединных перпендикулярах, а центр описанной — на биссектрисах',
        say: 'Вписанная окружность касается сторон — её центр одинаково удалён от сторон, это биссектрисы. Описанная проходит через вершины — её центр одинаково удалён от вершин, это серединные перпендикуляры.',
        fixIdea: 'Вписанная касается сторон — биссектрисы; описанная проходит через вершины — серединные перпендикуляры.',
        explainOptions: ['Центр вписанной окружности равноудалён от сторон, центр описанной — от вершин', 'Оба центра — точка пересечения медиан', 'Центр вписанной — пересечение серединных перпендикуляров, описанной — биссектрис'],
        conflicts: [{ text: 'У прямоугольного треугольника серединные перпендикуляры к сторонам пересекаются в середине гипотенузы — прямо на стороне. По твоему правилу это центр вписанной окружности. Но окружность с центром на стороне треугольника не может лежать внутри него и касаться всех трёх сторон.', ask: 'Может центр вписанной окружности лежать на стороне треугольника?', choices: ['Да', 'Нет'], right: 'Нет',
          verify: () => { const P = [[0, 0], [10, 0], [6.4, 4.8]], i = inOf(P); return same(i.r, 2) && i.c[1] > 1; },
          figure: { type: 'tri7', ang: [37, 53, 90], right: 2, circle: 'out', cname: 'O' } }] },
    ],
    generate(lv) {
      const kind = pick(L3(lv, ['tan', 'circR', 'centers', 'seg'], ['tan', 'tanRev', 'circR', 'circHyp', 'median', 'centers', 'inc'], ['two', 'twoEq', 'circ30', 'median', 'centers', 'tanRev']));
      if (kind === 'tan' || kind === 'tanRev') {
        const g = pickAng(20, 76, lv === 1 ? 10 : 2), s = rnd(0, 1);
        const story = s === 0 ? 'Прямая AB касается окружности с центром O в точке A.' : 'Из точки B к окружности с центром O проведена касательная BA, A — точка касания.';
        if (kind === 'tan') {
          const r = 90 - g;
          return {
            story: `${story} ∠AOB = ${deg(g)}.`, question: 'Найди ∠ABO (в градусах).', figure: { type: 'tan7', deg: g, lab: { AOB: deg(g), ABO: '?' } }, answer: ans(r),
            hints: ['Какой угол образует радиус OA с касательной AB?', `∠OAB = 90°. В треугольнике OAB: 180° − 90° − ${deg(g)}.`],
            solution: `Радиус OA перпендикулярен касательной, ∠OAB = 90°; ∠ABO = 180° − 90° − ${deg(g)} = ${deg(r)}.`,
            wrongs: wr(r, { 'tangent-no-right': (180 - g) / 2 }), data: { kind, g },
          };
        }
        const r = 90 - g;
        return {
          story: `${story} ∠ABO = ${deg(g)}.`, question: 'Найди ∠AOB (в градусах).', figure: { type: 'tan7', deg: r, lab: { AOB: '?', ABO: deg(g) } }, answer: ans(r),
          hints: ['Какой угол образует радиус OA с касательной AB?', `∠OAB = 90°. В треугольнике OAB: 180° − 90° − ${deg(g)}.`],
          solution: `Радиус OA перпендикулярен касательной, ∠OAB = 90°; ∠AOB = 180° − 90° − ${deg(g)} = ${deg(r)}.`,
          wrongs: wr(r, { 'tangent-no-right': 180 - 2 * g }), data: { kind, g },
        };
      }
      if (kind === 'two') {
        const b = pickAng(30, 140, 2), r = 90 - b / 2;
        return {
          story: `Из точки B к окружности с центром O проведены касательные BA и BC, A и C — точки касания. Угол между касательными ∠ABC = ${deg(b)}.`, question: 'Найди ∠AOB (в градусах).',
          figure: { type: 'tan7', deg: r, two: true, lab: { ABC: deg(b), AOB: '?' } }, answer: ans(r),
          hints: ['Отрезок BO делит угол между касательными пополам. А какой угол между радиусом OA и касательной BA?', `∠ABO = ${deg(b)} : 2 = ${deg(b / 2)}, ∠OAB = 90°.`],
          solution: `∠ABO = ${deg(b / 2)}, ∠OAB = 90°; ∠AOB = 180° − 90° − ${deg(b / 2)} = ${deg(r)}.`,
          wrongs: wr(r, { 'tangent-no-right': 180 - b }), data: { kind, b },
        };
      }
      if (kind === 'twoEq' || kind === 'seg') {
        const x = rnd(3, L3(lv, 15, 25, 40));
        if (kind === 'seg') return {
          story: `Из точки B к окружности проведены касательные BA и BC, A и C — точки касания. BA = ${x} см.`, question: 'Найди BC (в см).',
          figure: { type: 'tan7', deg: 55, two: true, sides: { AB: `${x} см`, BC: '?' } }, answer: ans(x),
          hints: ['Что известно про отрезки касательных, проведённых из одной точки?', 'Отрезки касательных из одной точки равны.'],
          solution: `Отрезки касательных из одной точки равны: BC = BA = ${x} см.`, wrongs: {}, data: { kind, x },
        };
        return {
          story: `Из точки B к окружности проведены касательные BA и BC, A и C — точки касания. BA = ${x} см, ∠ABC = 60°.`, question: 'Найди AC (в см).',
          figure: { type: 'tan7', deg: 60, two: true, lab: { ABC: '60°' }, sides: { AB: `${x} см` } }, answer: ans(x),
          hints: ['Какие отрезки равны в треугольнике ABC? Какой это треугольник?', `BA = BC, значит, треугольник ABC равнобедренный с углом 60° при вершине. Чему равны углы при основании?`],
          solution: `BA = BC = ${x} см, треугольник ABC равнобедренный, углы при основании (180° − 60°) : 2 = 60°. Он равносторонний: AC = ${x} см.`,
          wrongs: {}, data: { kind, x },
        };
      }
      const shape = pick([[35, 55, 90], [40, 50, 90], [30, 60, 90], [50, 40, 90]]);
      if (kind === 'circR' || kind === 'circHyp') {
        const R = rnd(2, L3(lv, 10, 25, 40)), c = 2 * R, s = rnd(0, 2);
        if (kind === 'circHyp') return {
          story: `Около прямоугольного треугольника описана окружность радиусом ${R} см.`, question: 'Найди гипотенузу (в см).',
          figure: { type: 'tri7', ang: shape, right: 2, circle: 'out', cname: 'O', sides: ['?', '', ''] }, answer: ans(c),
          hints: ['Где лежит центр окружности, описанной около прямоугольного треугольника?', 'Центр — середина гипотенузы, гипотенуза — диаметр.'],
          solution: `Гипотенуза — диаметр описанной окружности: ${R} · 2 = ${c} см.`,
          wrongs: wr(c, { 'hyp-radius': R }), data: { kind, R },
        };
        const story = [`Прямоугольный треугольник вписан в окружность. Его гипотенуза — ${c} см.`, `Из круглой заготовки вырезают треугольную деталь с прямым углом так, что все три вершины лежат на краю заготовки. Гипотенуза детали — ${c} см.`, `Гипотенуза прямоугольного треугольника — ${c} см.`][s];
        return {
          story, question: ['Найди радиус окружности (в см).', 'Найди радиус заготовки (в см).', 'Найди радиус описанной окружности (в см).'][s],
          figure: { type: 'tri7', ang: shape, right: 2, circle: 'out', cname: 'O', sides: [`${c} см`, '', ''] }, answer: ans(R),
          hints: ['Где лежит центр окружности, описанной около прямоугольного треугольника?', 'Центр — середина гипотенузы, значит, гипотенуза — диаметр.'],
          solution: `Гипотенуза — диаметр описанной окружности: R = ${c} : 2 = ${R} см.`,
          wrongs: wr(R, { 'hyp-radius': c }), data: { kind, c },
        };
      }
      if (kind === 'median') {
        const R = rnd(2, L3(lv, 10, 25, 40)), c = 2 * R;
        return {
          story: `В треугольнике ABC ∠C = 90°, гипотенуза AB = ${c} см, CM — медиана.`, question: 'Найди CM (в см).',
          figure: { type: 'tri7', ang: shape, names: ['A', 'B', 'C'], right: 2, sides: [`${c} см`, '', ''], cev: [{ from: 2, kind: 'mid', name: 'M' }] }, answer: ans(R),
          hints: ['Точка M — середина гипотенузы. Что это за точка для окружности, описанной около треугольника?', 'M — центр описанной окружности, MA, MB и MC — её радиусы.'],
          solution: `M — центр описанной окружности, CM — радиус: CM = AB : 2 = ${R} см.`,
          wrongs: wr(R, { 'hyp-radius': c }), data: { kind, c },
        };
      }
      if (kind === 'circ30') {
        const a = rnd(2, 25);
        return {
          story: `В треугольнике ABC ∠C = 90°, ∠A = 30°, BC = ${a} см.`, question: 'Найди радиус окружности, описанной около этого треугольника (в см).',
          figure: { type: 'tri7', ang: [30, 60, 90], names: ['A', 'B', 'C'], right: 2, labels: ['30°', '', ''], circle: 'out', sides: ['', `${a} см`, ''] }, answer: ans(a),
          hints: ['Найди гипотенузу: BC лежит против угла 30°.', `AB = 2 · ${a} = ${2 * a} см. Гипотенуза — диаметр описанной окружности.`],
          solution: `AB = 2 · BC = ${2 * a} см; R = AB : 2 = ${a} см.`,
          wrongs: wr(a, { 'hyp-radius': 2 * a }), data: { kind, a },
        };
      }
      if (kind === 'inc') {
        let A, B; do { A = rnd(30, 100); B = 2 * rnd(15, 50); } while (180 - A - B < 25);
        return {
          story: `O — центр окружности, вписанной в треугольник ABC, ∠ABC = ${deg(B)}.`, question: 'Найди ∠OBC (в градусах).',
          figure: { type: 'tri7', ang: [A, B, 180 - A - B], names: ['A', 'B', 'C'], circle: 'in', cname: 'O', cev: [{ from: 1, kind: 'center', t: '?', side: 2 }] }, answer: ans(B / 2),
          hints: ['Центр вписанной окружности лежит на пересечении каких линий треугольника?', `BO — биссектриса угла ABC: ${deg(B)} : 2.`],
          solution: `Центр вписанной окружности — пересечение биссектрис, BO — биссектриса: ∠OBC = ${deg(B)} : 2 = ${deg(B / 2)}.`,
          wrongs: {}, data: { kind, A, B },
        };
      }
      // centers
      const v = rnd(0, 4), inner = [true, false, true, false, true][v], rightC = inner ? CEN_IN : CEN_OUT;
      const story = ['Где находится центр окружности, вписанной в треугольник?', 'Где находится центр окружности, описанной около треугольника?',
        'На треугольной площади нужно поставить фонтан так, чтобы он был одинаково далеко от всех трёх прямых дорожек-сторон.',
        'Три дома стоят в вершинах треугольника. Колодец хотят вырыть так, чтобы до каждого дома было одинаково далеко.',
        'Из треугольного листа фанеры нужно выпилить самый большой круг.'][v];
      const question = v < 2 ? story : v === 4 ? 'Где будет центр круга?' : v === 2 ? 'Где поставить фонтан?' : 'Где вырыть колодец?';
      return {
        story: v < 2 ? '' : story, question, answer: rightC, accept: 'choice', choices: [CEN_IN, CEN_OUT, CEN_MED],
        figure: v < 2 ? { type: 'tri7', ang: [55, 65, 60], circle: inner ? 'in' : 'out' } : undefined,
        hints: [inner ? 'Окружность касается сторон: её центр одинаково удалён от сторон треугольника. Где лежат точки, равноудалённые от сторон угла?' : 'Окружность проходит через вершины: её центр одинаково удалён от вершин. Где лежат точки, равноудалённые от концов отрезка?',
          inner ? 'Точки, равноудалённые от сторон угла, лежат на биссектрисе.' : 'Точки, равноудалённые от концов отрезка, лежат на серединном перпендикуляре к нему.'],
        solution: inner ? 'Центр одинаково удалён от сторон — это точка пересечения биссектрис (центр вписанной окружности).' : 'Центр одинаково удалён от вершин — это точка пересечения серединных перпендикуляров (центр описанной окружности).',
        wrongs: { 'centers-swap': inner ? CEN_OUT : CEN_IN }, data: { kind, inner },
      };
    },
    verify(task) {
      const d = task.data, A = task.answer;
      if (d.kind === 'tan' || d.kind === 'tanRev') {
        // O(0;0), r = 1, A на окружности, касательная в A пересекает луч OB
        const phi = d.kind === 'tan' ? d.g : Number(A), Ap = [Math.cos(phi * RAD), Math.sin(phi * RAD)], Bp = [1 / Math.cos(phi * RAD), 0];
        const tangentOk = same((Bp[0] - Ap[0]) * Ap[0] + (Bp[1] - Ap[1]) * Ap[1], 0);
        const abo = angBetween(sub2(Ap, Bp), sub2([0, 0], Bp));
        return tangentOk && (d.kind === 'tan' ? same(abo, Number(A)) : same(abo, d.g));
      }
      if (d.kind === 'two') { const phi = Number(A), Ap = [Math.cos(phi * RAD), Math.sin(phi * RAD)], Cp = [Ap[0], -Ap[1]], Bp = [1 / Math.cos(phi * RAD), 0]; return same(angBetween(sub2(Ap, Bp), sub2(Cp, Bp)), d.b); }
      if (d.kind === 'seg' || d.kind === 'twoEq') return same(Number(A), d.x);
      if (d.kind === 'circR' || d.kind === 'median') { const P = [[0, 0], [d.c, 0], [d.c * Math.cos(40 * RAD) ** 2, d.c * Math.cos(40 * RAD) * Math.sin(40 * RAD)]]; return same(circumOf(P).r, Number(A)); }
      if (d.kind === 'circHyp') return same(Number(A) / 2, d.R);
      if (d.kind === 'circ30') { const hyp = d.a / Math.sin(30 * RAD); return same(hyp / 2, Number(A)); }
      if (d.kind === 'inc') { const P = triBase([d.A, d.B]), I = inOf(P).c; return same(angBetween(sub2(I, P[1]), sub2(P[2], P[1])), Number(A)); }
      if (d.kind === 'centers') return A === (d.inner ? CEN_IN : CEN_OUT);
      return false;
    },
  };

  K.course({ id: 'g7', grade: 7, title: 'Геометрия, 7 класс', topics: [angles, triSum, iso, cong, parallel, right, ineq, circle] });
})();
