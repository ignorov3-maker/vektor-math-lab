// Общая проверка ответа — тот же код подключается в app.js (см. window.VEKTOR_CHECK)
(function (root) {
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  function parse(raw) {
    const s = String(raw).trim().replace(/\s+/g, ' ').replace(',', '.').replace(/[−–]/g, '-').replace(/^x\s*=\s*/i, '');
    let m;
    if (['<', '>', '='].includes(s)) return { kind: 'sign', v: s };
    if ((m = s.match(/^(-?\d+) (\d+)\s*\/\s*(\d+)$/))) { if (+m[3] === 0) return null; const w = +m[1]; return { kind: 'mixed', v: w + Math.sign(w || 1) * m[2] / m[3], w, n: +m[2], d: +m[3] }; }
    if ((m = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/))) return +m[2] === 0 ? null : { kind: 'frac', v: m[1] / m[2], n: +m[1], d: +m[2] };
    if (/^-?\d+(\.\d+)?$/.test(s)) return { kind: 'num', v: +s };
    return null;
  }
  // → { ok, almost?, msg?, note?, mistake? }
  function check(input, task) {
    if (!String(input).trim()) return { ok: false, empty: true, msg: 'Сначала впиши ответ.' };
    const got = parse(input), want = parse(task.answer);
    if (!got) return { ok: false, unreadable: true, msg: 'Не получилось прочитать ответ. Запиши число или дробь через косую черту, например 3/4, а смешанное число — через пробел: 2 1/3.' };
    if (want.kind === 'sign') return got.v === want.v ? { ok: true } : { ok: false, mistake: task.misc && task.misc(got) };
    if (got.kind === 'sign' || Math.abs(got.v - want.v) > 1e-9) return { ok: false, mistake: task.misc && task.misc(got) };
    const reducible = got.kind === 'frac' && gcd(got.n, got.d) > 1;
    switch (task.accept) {
      case 'simplest':
        if (reducible) return { ok: false, almost: true, mistake: 'not-fully-reduced', msg: 'Значение верное, но дробь можно сократить ещё.' };
        return { ok: true };
      case 'fraction':
        if (got.kind !== 'frac') return { ok: false, almost: true, msg: 'Число верное, но запиши его неправильной дробью, например 7/3.' };
        return reducible ? { ok: true, note: 'Дробь можно было сократить.' } : { ok: true };
      case 'mixed':
        if (got.kind !== 'mixed' || got.n >= got.d) return { ok: false, almost: true, msg: 'Значение верное, но нужно выделить целую часть: целое, пробел, дробь.' };
        return { ok: true };
      case 'equivalent':
        if (reducible) return { ok: true, note: 'Дробь ещё можно сократить — в ответах её обычно сокращают.' };
        if (got.kind === 'frac' && got.n >= got.d && got.d !== 1 && want.v >= 1) return { ok: true, note: 'Можно ещё выделить целую часть.' };
        return { ok: true };
      default:
        return { ok: true };
    }
  }
  root.VEKTOR_CHECK = { parse, check, gcd };
})(typeof window !== 'undefined' ? window : globalThis);
