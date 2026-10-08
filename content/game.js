/* =========================================================
   Геймификация «Вектора»: звёзды, звание, цель дня, серия дней,
   достижения. Награждаем усилие и понимание, а не скорость:
   звёзды даются за решённую задачу всегда, больше — за решение
   с первой попытки без подсказок. Штрафов нет.
   Все функции получают g = state.game и сегодняшнюю дату.
   ========================================================= */
(function () {
  'use strict';

  const RANKS = [
    { min: 0, name: 'Новичок' },
    { min: 40, name: 'Исследователь' },
    { min: 120, name: 'Знаток дробей' },
    { min: 260, name: 'Мастер дробей' },
    { min: 500, name: 'Гроссмейстер дробей' },
  ];

  // Иконки достижений — простые SVG-символы
  const ICON = {
    step: '<path d="M6 18l6-12 6 12"/><path d="M8.5 13h7"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    flame: '<path d="M12 21c-4 0-6.5-2.8-6.5-6.3 0-3.6 3-5.6 3.6-9.2 2.3 1.4 3.5 3.7 3.5 5.8 1-1 1.6-2.4 1.7-3.8 2.4 1.9 4.2 4.5 4.2 7.2 0 3.5-2.5 6.3-6.5 6.3z"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
    book: '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z"/><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    crown: '<path d="M4 18h16l-1.5-9-4.5 4-2-6-2 6-4.5-4z"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    repeat: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
    rocket: '<path d="M12 3c3 2 5 5.5 5 9l-2 4H9l-2-4c0-3.5 2-7 5-9z"/><circle cx="12" cy="10" r="1.6"/><path d="M9 16l-2 4M15 16l2 4"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  };
  const icon = (k, size = 26) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" class="ico">${ICON[k] || ICON.star}</svg>`;

  // Достижения: условие проверяется по накопленным счётчикам
  const BADGES = [
    { id: 'first', icon: 'step', title: 'Первый шаг', desc: 'Решить первую задачу', test: g => g.solved >= 1 },
    { id: 'clean5', icon: 'star', title: 'Сам справлюсь', desc: '5 задач подряд с первой попытки и без подсказок', test: g => g.bestClean >= 5 },
    { id: 'comeback', icon: 'rocket', title: 'Не сдаюсь', desc: 'Решить задачу после двух неудачных попыток', test: g => g.comebacks >= 1 },
    { id: 'goal', icon: 'target', title: 'Цель дня', desc: 'Выполнить цель дня', test: g => g.goalsDone >= 1 },
    { id: 'streak3', icon: 'flame', title: 'Три дня подряд', desc: 'Заниматься три дня подряд', test: g => g.bestStreak >= 3 },
    { id: 'streak7', icon: 'flame', title: 'Неделя без пропусков', desc: 'Заниматься семь дней подряд', test: g => g.bestStreak >= 7 },
    { id: 'topic1', icon: 'book', title: 'Первая тема', desc: 'Сдать проверку по любой теме', test: g => g.mastered >= 1 },
    { id: 'half', icon: 'flag', title: 'Полпути', desc: 'Освоить 5 тем маршрута', test: g => g.mastered >= 5 },
    { id: 'all', icon: 'crown', title: 'Покоритель дробей', desc: 'Освоить все 9 тем раздела', test: g => g.mastered >= 9 },
    { id: 'review', icon: 'repeat', title: 'Ничего не забыл', desc: 'Пройти повторение без ошибок', test: g => g.reviews >= 1 },
    { id: 'curious', icon: 'chat', title: 'Любопытный', desc: 'Задать наставнику 10 вопросов', test: g => g.questions >= 10 },
    { id: 'diag', icon: 'compass', title: 'Разведчик', desc: 'Пройти диагностику', test: g => g.diags >= 1 },
  ];

  const blank = () => ({ stars: 0, earned: [], goal: 5, day: null, dayTasks: 0, goalDoneDay: null, streak: 0, lastDay: null, bestStreak: 0,
    solved: 0, clean: 0, bestClean: 0, comebacks: 0, goalsDone: 0, mastered: 0, reviews: 0, questions: 0, diags: 0 });
  function ensure(state) {
    const b = blank();
    if (!state.game || typeof state.game !== 'object') state.game = b;
    for (const k in b) if (state.game[k] === undefined || typeof state.game[k] !== typeof b[k] && b[k] !== null) state.game[k] = b[k];
    if (!Array.isArray(state.game.earned)) state.game.earned = [];
    return state.game;
  }

  const rank = stars => { let r = RANKS[0], next = null; for (let k = 0; k < RANKS.length; k++) if (stars >= RANKS[k].min) { r = RANKS[k]; next = RANKS[k + 1] || null; } return { ...r, next }; };

  const prevDay = iso => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  // Отметить занятие сегодня: серия дней и счётчик цели дня
  function touchDay(g, today) {
    if (g.day !== today) { g.day = today; g.dayTasks = 0; }
    if (g.lastDay !== today) {
      g.streak = g.lastDay === prevDay(today) ? g.streak + 1 : 1;
      g.lastDay = today; g.bestStreak = Math.max(g.bestStreak, g.streak);
    }
  }
  // Серия прервалась, если вчера и сегодня не занимались
  const liveStreak = (g, today) => (g.lastDay === today || g.lastDay === prevDay(today) ? g.streak : 0);

  function newBadges(g) {
    const ev = [];
    for (const b of BADGES) if (!g.earned.includes(b.id) && b.test(g)) { g.earned.push(b.id); ev.push({ type: 'badge', badge: b }); }
    return ev;
  }

  function addStars(g, n, why) { g.stars += n; return { type: 'stars', n, why }; }

  /* ---------- События ---------- */
  function solved(g, today, { firstTry, hints, wrongBefore }) {
    touchDay(g, today);
    const ev = [];
    const clean = firstTry && hints === 0;
    ev.push(addStars(g, clean ? 3 : firstTry ? 2 : 1, clean ? 'с первой попытки' : firstTry ? 'с подсказкой' : 'за упорство'));
    g.solved++; g.dayTasks++;
    g.clean = clean ? g.clean + 1 : 0; g.bestClean = Math.max(g.bestClean, g.clean);
    if (wrongBefore >= 2) g.comebacks++;
    if (g.dayTasks >= g.goal && g.goalDoneDay !== today) { g.goalDoneDay = today; g.goalsDone++; ev.push(addStars(g, 5, 'цель дня')); ev.push({ type: 'goal' }); }
    return ev.concat(newBadges(g));
  }
  function wrong(g) { g.clean = 0; return []; }
  function checkAnswer(g, today, ok) { touchDay(g, today); return ok ? [addStars(g, 2, 'проверка')] : []; }
  function mastered(g, total) { g.mastered = total; return [addStars(g, 10, 'тема освоена'), { type: 'mastered' }].concat(newBadges(g)); }
  function reviewed(g, today, ok) { touchDay(g, today); if (!ok) return []; g.reviews++; return [addStars(g, 5, 'повторение')].concat(newBadges(g)); }
  function asked(g) { g.questions++; return newBadges(g); }
  function diag(g, today) { touchDay(g, today); g.diags++; return newBadges(g); }

  window.VEKTOR_GAME = { RANKS, BADGES, icon, ensure, rank, liveStreak, solved, wrong, checkAnswer, mastered, reviewed, asked, diag };
})();
