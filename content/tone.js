/* =========================================================
   Возрастной язык. 5–7 класс — «жучки мысли» с именами и рисунками;
   с 8 класса — спокойный взрослый тон: «ошибка», методическое
   название, без мультяшной графики.
   window.VEKTOR_TONE = { setGrade, grade, senior, t, name, art }
   ========================================================= */
(function (root) {
  'use strict';
  const SENIOR_FROM = 8;
  let grade = 5;
  const senior = () => grade >= SENIOR_FROM;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // имя ошибки для текущего возраста
  const name = bug => (bug ? (senior() ? bug.title : bug.kidName) : '');
  const N = bug => esc(name(bug));

  const J = {
    catchBtn: () => 'Поймать жучка',
    draftTitle: () => 'Давай поймаем жучка! Запиши, как считал',
    found: b => `Поймали жучка! Это ${N(b)}.`,
    reviewBtn: () => 'Разобраться с жучком',
    findHead: b => `Поймали! Это ${N(b)}`,
    conflictOk: () => 'Вот! Правило жучка даёт ерунду. Значит, оно неверное.',
    fixOk: () => 'Верно! Жучок больше не мешает.',
    fixAgain: n => `Посмотри на строку ${n} — там жучок снова пролез.`,
    twinHead: () => 'Жучок пойман!',
    twinText: b => `Проверим его завтра. Если не попадёшься — ${N(b)} побеждён.`,
    twinFail: b => `Ой, ${N(b)} снова тут. Посмотрим на него с другой стороны.`,
    trapOk: b => `Ты не попался жучку ${N(b)}! Ещё одна проверка — и он побеждён.`,
    trapBeaten: b => `${N(b)} побеждён! +10 ★`,
    trapBack: b => `Ой, ${N(b)} вернулся. Ничего — поймаем ещё раз.`,
    warmupSub: () => 'Пара задач, чтобы размять голову.',
  };
  const S = {
    catchBtn: () => 'Найти ошибку',
    draftTitle: () => 'Разберём, где ошибка. Запиши ход решения по шагам',
    found: b => `Ошибка найдена: ${N(b).toLowerCase()}.`,
    reviewBtn: () => 'Разобрать ошибку',
    findHead: b => `Типичная ошибка: ${N(b).toLowerCase()}`,
    conflictOk: () => 'Правило приводит к противоречию — значит, оно неверное.',
    fixOk: () => 'Верно.',
    fixAgain: n => `Проверь строку ${n} — ошибка повторилась там.`,
    twinHead: () => 'Ошибка разобрана',
    twinText: () => 'Завтра короткая проверка. Две верные проверки подряд — и ошибка закрыта.',
    twinFail: () => 'Ошибка повторилась. Разберём её с другой стороны.',
    trapOk: () => 'Верно. Ещё одна проверка — и ошибка закрыта.',
    trapBeaten: b => `Ошибка «${N(b).toLowerCase()}» закрыта. +10 ★`,
    trapBack: b => `Ошибка «${N(b).toLowerCase()}» вернулась. Разберём ещё раз.`,
    warmupSub: () => 'Пара задач на то, что уже разобрали.',
  };
  const t = (key, ...a) => (senior() ? S : J)[key](...a);
  // рисунок ошибки: младшим — жучок, старшим — нейтральный значок
  function art(bug, opts = {}) {
    if (!senior()) return root.VEKTOR_ART ? root.VEKTOR_ART.bug(bug ? bug.key : '?', opts) : '';
    const s = opts.size || 32, c = opts.status === 'beaten' ? '#1E7358' : opts.status === 'healing' ? '#B8860B' : '#C44E43';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="${c}" stroke-width="2"/>`
      + (opts.status === 'beaten' ? `<path d="M7 12.5l3 3 7-7" fill="none" stroke="${c}" stroke-width="2"/>` : `<path d="M12 7v6M12 16.5v.5" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`) + '</svg>';
  }
  root.VEKTOR_TONE = { setGrade: g => { grade = Math.min(9, Math.max(5, +g || 5)); }, grade: () => grade, senior, t, name, art, SENIOR_FROM };
})(typeof window !== 'undefined' ? window : globalThis);
