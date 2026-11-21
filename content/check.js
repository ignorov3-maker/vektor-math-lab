// Общая проверка ответа — тот же код подключается в app.js (см. window.VEKTOR_CHECK)
(function (root) {
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  // Точная дробь {n, d} (BigInt, d > 0): сравнение без десятичных приближений —
  // близкая, но не равная дробь (например 50000/100001 вместо 1/2) не засчитывается.
  const B = x => BigInt(x);
  const dec = s => { const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s); const f = m[3] || ''; const n = B(m[2] + f) * (m[1] ? -1n : 1n); return { n, d: 10n ** B(f.length) }; };
  function parse(raw) {
    const s = String(raw).trim().replace(/\s+/g, ' ').replace(',', '.').replace(/[−–]/g, '-').replace(/^x\s*=\s*/i, '');
    let m;
    if (['<', '>', '='].includes(s)) return { kind: 'sign', v: s };
    if ((m = s.match(/^(-?\d+) (\d+)\s*\/\s*(\d+)$/))) { if (+m[3] === 0) return { zero: true }; const w = +m[1], neg = m[1].startsWith('-');
      const q = { n: (B(m[1].replace('-', '')) * B(m[3]) + B(m[2])) * (neg ? -1n : 1n), d: B(m[3]) };
      return { kind: 'mixed', v: w + Math.sign(w || (neg ? -1 : 1)) * m[2] / m[3], w, n: +m[2], d: +m[3], q }; }
    if ((m = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/))) { if (+m[2] === 0) return { zero: true }; let n = B(m[1]), d = B(m[2]); if (d < 0n) { n = -n; d = -d; }
      return { kind: 'frac', v: m[1] / m[2], n: +m[1], d: +m[2], q: { n, d } }; }
    if (/^-?\d+(\.\d+)?$/.test(s)) return { kind: 'num', v: +s, q: dec(s) };
    return null;
  }
  const same = (a, b) => (a.q && b.q ? a.q.n * b.q.d === b.q.n * a.q.d : Math.abs(a.v - b.v) <= 1e-9);
  // вариант ответа «Острый.» = «острый»
  const choiceNorm = x => String(x == null ? '' : x).trim().toLowerCase().replace(/ё/g, 'е').replace(/[.!]+$/, '').replace(/\s+/g, ' ');
  // → { ok, almost?, msg?, note?, mistake? }
  function check(input, task) {
    if (!String(input).trim()) return { ok: false, empty: true, msg: 'Сначала впиши ответ.' };
    // выбор из вариантов (темы 5–9): сравниваем саму строку варианта
    if (task.accept === 'choice') { const v = choiceNorm(input), pickd = (task.choices || []).find(c => choiceNorm(c) === v); return v === choiceNorm(task.answer) ? { ok: true } : { ok: false, mistake: task.misc && task.misc({ kind: 'choice', v: pickd != null ? pickd : String(input).trim() }) }; }
    const got = parse(input), want = parse(task.answer);
    if (got && got.zero) return { ok: false, unreadable: true, msg: 'Знаменатель не может быть нулём: на ноль делить нельзя.' };
    if (!got) return { ok: false, unreadable: true, msg: task.generic ? 'Не получилось прочитать ответ. Впиши одно число: например 12, −3 или 2,5.' : 'Не получилось прочитать ответ. Впиши числа в клеточки: сверху числитель, снизу знаменатель.' };
    if (want.kind === 'sign') return got.v === want.v ? { ok: true } : { ok: false, mistake: task.misc && task.misc(got) };
    if (got.kind === 'sign' || !same(got, want)) return { ok: false, mistake: task.misc && task.misc(got) };
    const reducible = got.kind === 'frac' && gcd(got.n, got.d) > 1;
    // Д-08: в задачах на дроби десятичная запись (0.75 вместо 3/4) не засчитывается
    if (got.kind === 'num' && !Number.isInteger(got.v) && want.kind !== 'num')
      return { ok: false, almost: true, msg: 'Значение верное, но запиши ответ обыкновенной дробью: числитель сверху, знаменатель снизу.' };
    switch (task.accept) {
      case 'simplest':
        if (reducible) return { ok: false, almost: true, mistake: 'not-fully-reduced', msg: 'Значение верное, но дробь можно сократить ещё.' };
        return { ok: true };
      case 'fraction':
        if (got.kind !== 'frac') return { ok: false, almost: true, msg: 'Число верное, но запиши его неправильной дробью, например 7/3.' };
        return reducible ? { ok: true, note: 'Дробь можно было сократить.' } : { ok: true };
      case 'mixed':
        if (got.kind !== 'mixed' || got.n >= got.d) return { ok: false, almost: true, msg: 'Значение верное, но нужно выделить целую часть: впиши целые в левую клеточку.' };
        return { ok: true };
      case 'equivalent':
        if (reducible) return { ok: true, note: 'Дробь ещё можно сократить — в ответах её обычно сокращают.' };
        if (got.kind === 'frac' && got.n >= got.d && got.d !== 1 && want.v >= 1) return { ok: true, note: 'Можно ещё выделить целую часть.' };
        return { ok: true };
      default:
        return { ok: true };
    }
  }
  root.VEKTOR_CHECK = { parse: raw => { const p = parse(raw); return p && p.zero ? null : p; }, check, gcd, choiceNorm, same };
})(typeof window !== 'undefined' ? window : globalThis);
