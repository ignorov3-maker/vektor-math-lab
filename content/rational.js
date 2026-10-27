/* =========================================================
   Точная арифметика дробей и проверка шагов черновика (CL-1).
   Основа «Рентгена мышления»: верный шаг не меняет значение.
   window.VEKTOR_RATIONAL = { Q, add, sub, mul, div, eq, cmp, str,
     tokenize, parseLine, evalLine, checkSteps }
   ========================================================= */
(function (root) {
  'use strict';
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

  // Q(n, d) — несократимая дробь со знаменателем > 0
  function Q(n, d = 1) {
    if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error('Q: нужны целые');
    if (d === 0) throw new Error('Q: деление на ноль');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    return Object.freeze({ n: n / g, d: d / g });
  }
  const add = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => Q(a.n * b.n, a.d * b.d);
  const div = (a, b) => { if (b.n === 0) throw new Error('Q: деление на ноль'); return Q(a.n * b.d, a.d * b.n); };
  const eq = (a, b) => a.n === b.n && a.d === b.d;
  const cmp = (a, b) => Math.sign(a.n * b.d - b.n * a.d);
  const str = q => (q.d === 1 ? String(q.n) : `${q.n}/${q.d}`);

  /* ---- Разбор строки черновика ----
     Числа: 7 · 3/4 · 2 1/3 (смешанное). Знаки: + − - · * × : ÷.
     Строка может начинаться с «=». Скобок нет (5 класс).
     Токен числа хранит, как его записал ребёнок (raw), — это нужно
     детектору уровня 2: «2/8» и «1/4» равны по значению, но не по записи. */
  const NUM = /^(\d+)\s+(\d+)\s*\/\s*(\d+)|^(\d+)\s*\/\s*(\d+)|^(\d+)/;
  const OPS = { '+': '+', '-': '-', '−': '-', '–': '-', '·': '*', '*': '*', '×': '*', '⋅': '*', ':': '/', '÷': '/' };

  function tokenize(line) {
    let s = String(line).trim().replace(/^=\s*/, '');
    const out = [];
    while (s.length) {
      s = s.replace(/^\s+/, '');
      if (!s) break;
      const m = s.match(NUM);
      if (m) {
        let t;
        if (m[1] != null) t = { t: 'num', kind: 'mixed', w: +m[1], n: +m[2], d: +m[3] };
        else if (m[4] != null) t = { t: 'num', kind: 'frac', n: +m[4], d: +m[5] };
        else t = { t: 'num', kind: 'int', n: +m[6], d: 1 };
        if (t.d === 0) return { error: 'zero-denominator' };
        out.push(t); s = s.slice(m[0].length); continue;
      }
      const op = OPS[s[0]];
      if (op) { out.push({ t: 'op', op }); s = s.slice(1); continue; }
      return { error: 'bad-char', at: s[0] };
    }
    return { tokens: out };
  }
  const tokVal = t => (t.kind === 'mixed' ? add(Q(t.w), Q(t.n, t.d)) : Q(t.n, t.d));

  // → { ok, tokens, nums, ops } или { ok:false, error }
  function parseLine(line) {
    const r = tokenize(line);
    if (r.error) return { ok: false, error: r.error };
    let tk = r.tokens;
    if (!tk.length) return { ok: false, error: 'empty' };
    let neg = false;
    if (tk[0].t === 'op' && tk[0].op === '-') { neg = true; tk = tk.slice(1); }
    const nums = [], ops = [];
    for (let i = 0; i < tk.length; i++) {
      const want = i % 2 === 0 ? 'num' : 'op';
      if (tk[i].t !== want) return { ok: false, error: want === 'num' ? 'missing-number' : 'missing-op' };
      (want === 'num' ? nums : ops).push(tk[i]);
    }
    if (nums.length !== ops.length + 1) return { ok: false, error: 'missing-number' };
    return { ok: true, neg, nums, ops: ops.map(o => o.op) };
  }

  // значение строки: · и : раньше + и −
  function evalLine(line) {
    const p = typeof line === 'string' ? parseLine(line) : line;
    if (!p.ok) return p;
    try {
      const vals = p.nums.map(tokVal);
      if (p.neg) vals[0] = Q(-vals[0].n, vals[0].d);
      const terms = [vals[0]], sig = [];
      for (let i = 0; i < p.ops.length; i++) {
        const o = p.ops[i], v = vals[i + 1];
        if (o === '*') terms[terms.length - 1] = mul(terms[terms.length - 1], v);
        else if (o === '/') terms[terms.length - 1] = div(terms[terms.length - 1], v);
        else { sig.push(o); terms.push(v); }
      }
      let acc = terms[0];
      for (let i = 0; i < sig.length; i++) acc = sig[i] === '+' ? add(acc, terms[i + 1]) : sub(acc, terms[i + 1]);
      return { ok: true, value: acc, parsed: p };
    } catch (e) { return { ok: false, error: 'division-by-zero' }; }
  }

  /* checkSteps(lines) — lines[0] = условие, дальше строки ребёнка.
     → { ok, values: [Q|null], errorAt: индекс первой строки, где значение
         изменилось (или где строка не читается), reason } */
  function checkSteps(lines) {
    const res = lines.map(evalLine);
    if (!res[0].ok) return { ok: false, errorAt: 0, reason: 'condition-unreadable', values: [] };
    const target = res[0].value;
    const values = res.map(r => (r.ok ? r.value : null));
    for (let i = 1; i < res.length; i++) {
      if (!res[i].ok) return { ok: false, errorAt: i, reason: res[i].error, values };
      if (!eq(res[i].value, target)) return { ok: false, errorAt: i, reason: 'value-changed', values, expected: target, got: res[i].value };
    }
    return { ok: true, errorAt: -1, values };
  }

  root.VEKTOR_RATIONAL = { Q, add, sub, mul, div, eq, cmp, str, gcd, tokenize, parseLine, evalLine, checkSteps };
})(typeof window !== 'undefined' ? window : globalThis);
