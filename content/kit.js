/* =========================================================
   Набор для тем 5–9 класса (ФРП «Математика. 5–9 классы»).
   Курс описывается один раз — kit сам:
     • достраивает задачу (topic, text, misc по wrongs, generic-флаг);
     • регистрирует каждую ошибку темы как «жучка» в VEKTOR_BUGS —
       значит, работают разбор с контрпримером, ловушки через 1 и 3 дня,
       Пульс учителя, мини-урок на доску и задача группе;
     • хранит реестр курсов для пути ученика, «Все темы» и кабинетов.
   Формат темы и задачи — docs/content-spec.md.
   window.VEKTOR_KIT = { course, courses, topics, byId, task, fromData, h }
   ========================================================= */
(function (root) {
  'use strict';

  /* ---------- Помощники для авторов тем ---------- */
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[rnd(0, arr.length - 1)];
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const L3 = (lv, a, b, c) => [a, b, c][Math.min(3, Math.max(1, lv || 2)) - 1];
  // склонение: pl(5, 'яблоко', 'яблока', 'яблок') → 'яблок'
  const pl = (k, one, few, many) => { k = Math.abs(k); return k % 10 === 1 && k % 100 !== 11 ? one : [2, 3, 4].includes(k % 10) && ![12, 13, 14].includes(k % 100) ? few : many; };
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);
  // точное округление до k знаков (без 0.1 + 0.2 = 0.30000000000000004)
  const round = (x, k = 6) => { const m = 10 ** k; return Math.round((x + Number.EPSILON) * m) / m; };
  // число для текста задачи: десятичная запятая, настоящий минус, пробел в тысячах
  function num(x) {
    if (typeof x === 'string') return x;
    const r = round(x, 6), neg = r < 0, [i, f] = String(Math.abs(r)).split('.');
    const int = i.length > 4 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : i;
    return (neg ? '−' : '') + int + (f ? ',' + f : '');
  }
  // число для поля answer / wrongs: машинная запись, её читает VEKTOR_CHECK.parse
  const ans = x => { const r = round(x, 6); return Object.is(r, -0) ? '0' : String(r); };
  // дробь HTML (как в дробях): fr(3, 4)
  const fr = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
  const sign = x => (x < 0 ? `(${num(x)})` : num(x)); // отрицательное число в скобках внутри выражения
  const h = { rnd, pick, shuffle, L3, pl, gcd, lcm, round, num, ans, fr, sign };

  /* ---------- Проверка ответа ---------- */
  const C = () => root.VEKTOR_CHECK;
  const plain = s => String(s == null ? '' : s)
    .replace(/<span class="frac"><span>([^<]*)<\/span><span>([^<]*)<\/span><\/span>/g, '$1/$2')
    .replace(/<sup>([^<]*)<\/sup>/g, (m, x) => (/^[-−]?\d+$/.test(x) ? x.replace(/[-−]/, '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]) : '^' + x)).replace(/<\/?[a-z][^>]*>/gi, '').replace(/&nbsp;| /g, ' ').replace(/\s+/g, ' ').trim();
  // значение строки-ответа; для выбора — сама строка
  function valueOf(raw, task) {
    if (task.accept === 'choice') { const v = C().choiceNorm(raw), hit = (task.choices || []).find(c => C().choiceNorm(c) === v); return hit != null ? hit : String(raw).trim(); }
    const p = C().parse(String(raw)); return p && p.kind !== 'sign' ? p.v : p ? p.v : null;
  }
  const same = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : a === b);
  // misc по wrongs: какой ошибке соответствует ответ ребёнка
  function miscOf(task) {
    let right, ws; // считаем при первой проверке: страницы без check.js (кабинеты взрослых) задачу только показывают
    const prep = () => { if (ws) return; right = valueOf(task.answer, task); ws = Object.entries(task.wrongs || {}).map(([id, w]) => [id, valueOf(w, task)]).filter(([, v]) => v != null && !same(v, right)); };
    return got => {
      prep();
      if (!got) return null;
      const v = task.accept === 'choice' ? String(got.v) : got.kind === 'sign' ? got.v : got.v;
      if (v == null || same(v, right)) return null;
      const hit = ws.find(([, w]) => same(w, v)); return hit ? hit[0] : null;
    };
  }

  /* ---------- Задача ---------- */
  // Достраивает задачу из generate(): misc, text, topic. Данные остаются JSON-безопасными (задача уходит на сервер в «задаче группе»).
  function task(t, topic) {
    const out = Object.assign({ accept: 'exact', hints: [], wrongs: {} }, t);
    if (topic) out.topic = topic.id;
    out.generic = true;
    out.text = plain((out.story ? out.story + ' ' : '') + out.question);
    if (out.choices && !out.accept) out.accept = 'choice';
    if (!out.placeholder) out.placeholder = out.accept === 'choice' ? '' : 'число';
    if (out.signed == null) out.signed = /^-/.test(String(out.answer)) || Object.values(out.wrongs).some(w => /^-/.test(String(w)));
    if (out.decimal == null) out.decimal = /[.,]/.test(String(out.answer));
    out.solution = out.solution || `Ответ: ${out.answer}.`;
    Object.defineProperty(out, 'misc', { value: miscOf(out), enumerable: false, configurable: true, writable: true });
    return out;
  }
  // Задача, пришедшая с сервера или из хранилища (без функций), — снова рабочая
  const fromData = d => task(JSON.parse(JSON.stringify(d)), d && d.topic ? { id: d.topic } : null);

  /* ---------- Реестр курсов ---------- */
  const COURSES = [], TOPICS = [], BYID = {};
  const pending = []; // жучки ждут VEKTOR_BUGS, если он подключён позже

  function bugOf(topic, m) {
    const B = root.VEKTOR_BUGS;
    const others = () => topic.mistakes.filter(o => o.id !== m.id).map(o => o.id);
    const trapOf = (lv, tries = 300) => {
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < tries; i++) {
        const p = topic.generate(lv || 2), w = p.wrongs && p.wrongs[m.id];
        if (w == null) continue;
        const v = valueOf(w, p), r = valueOf(p.answer, p);
        if (v == null || same(v, r)) continue;
        // ловушка «чистая»: неверный ответ этой ошибки не совпадает с ответами других ошибок темы
        if (pass === 0 && others().some(id => p.wrongs[id] != null && same(valueOf(p.wrongs[id], p), v))) continue;
        // и правдоподобный: не «4,333333», а число, которое ребёнок действительно мог написать
        if (pass === 0 && typeof v === 'number' && (Math.abs(v) > 1e5 || Math.abs(round(v, 2) - v) > 1e-9)) continue;
        return p;
      }
      return null;
    };
    const b = {
      topic: topic.id, id: m.id, key: `${topic.id}:${m.id}`, generic: true, grade: topic.grade,
      kidName: m.kidName || m.title, title: m.title, kidRule: m.kidRule || m.title.toLowerCase(),
      fixIdea: m.fixIdea || m.say, explainOptions: m.explainOptions, explainRight: 0,
      conflicts: (m.conflicts || []).map(c => Object.assign({ figure: '' }, c, { figure: c.figure && typeof c.figure === 'object' && root.VEKTOR_VISUALS ? root.VEKTOR_VISUALS.figure(c.figure) : (c.figure || '') })),
      root: m.root || null,
      wrong: p => (p && p.wrongs && p.wrongs[m.id] != null ? String(p.wrongs[m.id]) : null),
      trap: lv => trapOf(lv),
    };
    const V = root.VEKTOR_VISUALS, fig = p => (p && p.figure && V ? V.figure(p.figure) : '');
    const shown = (p, w) => (p.accept === 'choice' ? w : /\//.test(String(w)) ? String(w).replace(/^-/, '−') : num(+valueOf(w, p))); // дробь показываем дробью, не 0,166667
    // мини-урок на доску собираем, только когда учитель его открывает
    const makeLesson = () => [
      (() => { const p = trapOf(1, 200) || trapOf(2, 200); const w = p && b.wrong(p);
        return { kind: 'wrong', html: p ? `<p>${p.story || ''} ${p.question}</p>${fig(p)}<p>Бипыч ответил: <b>${shown(p, w)}</b></p>` : `<p>Бипыч думает так: ${b.title.toLowerCase()}.</p>`, question: 'Согласны с Бипычем?' }; })(),
      (() => { const c = b.conflicts[0] || { text: b.title, ask: '' }; return { kind: 'conflict', html: `<p>${c.text.replace(/По твоему( правилу)?/g, 'По этому правилу').replace(/У тебя /g, 'Получилось ')}</p>${c.figure || ''}`, question: c.ask }; })(),
      (() => { const p = trapOf(2); const w = p && b.wrong(p);
        return { kind: 'fix', html: `<p><b>${b.fixIdea}</b></p>`, question: p ? 'Решим вместе: ' + p.text : '',
          answerHtml: p ? `<p>Верно: <b>${shown(p, p.answer)}</b></p>${w != null ? `<p class="board-wrong">По неверному правилу вышло бы ${shown(p, w)} — это ошибка «${b.kidName}».</p>` : ''}` : '' }; })(),
    ];
    let lesson = null;
    Object.defineProperty(b, 'lesson', { get: () => lesson || (lesson = makeLesson()), enumerable: true, configurable: true });
    return b;
  }
  function registerBugs(topic) {
    const B = root.VEKTOR_BUGS;
    if (!B || !B.register) { pending.push(topic); return; }
    for (const m of topic.mistakes) if (m.conflicts && m.conflicts.length && m.explainOptions) B.register(bugOf(topic, m));
  }
  const flush = () => { while (pending.length && root.VEKTOR_BUGS && root.VEKTOR_BUGS.register) registerBugs(pending.shift()); };

  // course({ id, grade, title, topics: [...] })
  function course(def) {
    const c = { id: def.id, title: def.title, grade: def.grade, topics: [] };
    for (const t of def.topics) {
      if (BYID[t.id]) throw new Error(`kit: тема ${t.id} уже есть`);
      const gen = t.generate;
      // check / review / idea — как у дробей: без них шаг «Проверь себя» и повторение не открываются
      const topic = Object.assign({ start: 0, section: t.strand || def.title, course: def.id, check: { count: 4, passScore: 3 }, review: { afterDays: [1, 3, 7] } }, t, { grade: t.grade || def.grade });
      if (!topic.idea && topic.explain) topic.idea = topic.explain.model;
      topic.generate = lv => task(gen.call(topic, lv), topic);
      c.topics.push(topic); TOPICS.push(topic); BYID[topic.id] = topic;
      registerBugs(topic);
    }
    COURSES.push(c);
    return c;
  }
  // Уже готовые темы (дроби, геометрия 5–6) тоже видны в реестре — для пути, карты и корней ошибок
  function adopt(id, title, grade, list, strand) {
    const c = { id, title, grade, topics: [], adopted: true };
    for (const t of list) { if (BYID[t.id]) continue; t.grade = t.grade || grade; t.strand = t.strand || strand; c.topics.push(t); TOPICS.push(t); BYID[t.id] = t; }
    COURSES.push(c); return c;
  }

  root.VEKTOR_KIT = { course, adopt, flush, task, fromData, plain, valueOf, h, courses: COURSES, topics: TOPICS, byId: BYID };
})(typeof window !== 'undefined' ? window : globalThis);
