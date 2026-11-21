/* Слияние прогресса ученика с двух устройств (школа и дом) — трёхстороннее.
   base — что сервер подтвердил последним на этом устройстве, mine — что получилось здесь, theirs — что сейчас на сервере.
   Счётчики (звёзды, решённые задачи, ошибки) складываются по приросту: base 10, здесь 13, на сервере 15 → 18.
   Рекорды и проценты освоения — максимум. Списки (попытки, дни, купленное) — то, что добавили здесь, дописывается
   к серверному без повторов. Остальное (строки, флаги, даты) — берём здесь, если здесь меняли, иначе с сервера.
   Без base (старая копия без ревизии) — безопасный режим: числа по максимуму, списки объединяются. */
(function (root) {
  // счётчики, которые только растут от действий ученика: прирост с обеих сторон складываем
  const ADD = new Set(['stars', 'answers', 'asked', 'solved', 'dayTasks', 'goalsDone', 'tasks', 'practice', 'errorsTotal', 'cleanTotal', 'hintsUsed', 'secTotal']);
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const key = v => JSON.stringify(v);

  // мультимножество: сколько раз каждый элемент встречается
  const counts = arr => { const m = new Map(); for (const x of arr) { const k = key(x); m.set(k, (m.get(k) || 0) + 1); } return m; };

  // наборы из строк и чисел (дни, значки, купленное) — без повторов
  const uniq = arr => arr.every(x => x === null || typeof x !== 'object') ? [...new Set(arr)] : arr;
  function mergeArr(base, mine, theirs) { return uniq(mergeArr0(base, mine, theirs)); }
  function mergeArr0(base, mine, theirs) {
    const b = Array.isArray(base) ? base : null;
    if (!b) { // без base: объединение без повторов, порядок — серверный, затем новые отсюда
      const have = counts(theirs), out = theirs.slice();
      for (const x of mine) { const k = key(x); if (have.get(k)) have.set(k, have.get(k) - 1); else out.push(x); }
      return out;
    }
    // добавленное здесь = mine − base (по количеству), дописываем к серверному
    const left = counts(b), added = [];
    for (const x of mine) { const k = key(x); if (left.get(k)) left.set(k, left.get(k) - 1); else added.push(x); }
    const out = theirs.concat(added);
    // списки в приложении обрезаются (последние 60 попыток и т. п.) — сохраняем такую же длину
    const cap = Math.max(theirs.length, mine.length);
    return out.length > cap && cap >= 30 ? out.slice(-cap) : out;
  }

  function mergeNum(k, base, mine, theirs) {
    const b = typeof base === 'number' ? base : null;
    if (b === null) return Math.max(mine, theirs);
    if (mine === b) return theirs;
    if (theirs === b) return mine;
    if (ADD.has(k)) return theirs + (mine - b); // покупка в мастерской уменьшает звёзды — это тоже прирост (отрицательный)
    return Math.max(mine, theirs);
  }

  // known — base известна (сервер подтвердил состояние, пусть и пустое): чего нет в base — того «не было», счётчики с нуля
  function merge3(base, mine, theirs, k, reset, known) {
    if (known && base === undefined) base = Array.isArray(mine) ? [] : isObj(mine) ? {} : typeof mine === 'number' && ADD.has(k) ? 0 : undefined;
    if (mine === undefined) return theirs;
    if (theirs !== undefined && key(mine) === key(theirs)) return theirs; // уже одинаково (повтор после обрыва)
    if (theirs === undefined || theirs === null) {
      // на сервере этого нет. Удалённым считаем только при полном сбросе прогресса учителем (reset):
      // иначе — поле просто ещё не дошло до сервера, и терять сделанное здесь нельзя
      if (!reset || base === undefined || base === null) return mine;
      if (key(mine) === key(base)) return undefined;
      if (typeof mine === 'number' && typeof base === 'number' && ADD.has(k)) return Math.max(0, mine - base);
      if (isObj(mine) && isObj(base)) return merge3(base, mine, {}, k, true, known);
      if (Array.isArray(mine) && Array.isArray(base)) return mergeArr(base, mine, []);
      return mine;
    }
    if (isObj(mine) && isObj(theirs)) {
      const b = isObj(base) ? base : null, out = {};
      for (const kk of new Set([...Object.keys(theirs), ...Object.keys(mine)])) {
        const v = merge3(b ? b[kk] : undefined, mine[kk], theirs[kk], kk, reset, known);
        if (v !== undefined) out[kk] = v;
      }
      return out;
    }
    if (Array.isArray(mine) && Array.isArray(theirs)) return mergeArr(base, mine, theirs);
    if (typeof mine === 'number' && typeof theirs === 'number') return mergeNum(k, base, mine, theirs);
    // строки, флаги, даты: меняли здесь — берём здесь
    if (base !== undefined && key(mine) === key(base)) return theirs;
    if (base === undefined && typeof mine === 'boolean' && typeof theirs === 'boolean') return mine || theirs;
    return mine;
  }

  root.VEKTOR_MERGE = { merge3: (base, mine, theirs) => {
    if (!isObj(mine)) return theirs;
    const b = isObj(base) ? base : undefined;
    // на сервере пусто, а здесь был подтверждённый прогресс — учитель сбросил прогресс ученика
    if (!isObj(theirs)) return b ? merge3(b, mine, {}, '', true, true) || {} : mine;
    return merge3(b, mine, theirs, '', false, !!b) || {};
  } };
})(typeof window !== 'undefined' ? window : globalThis);
