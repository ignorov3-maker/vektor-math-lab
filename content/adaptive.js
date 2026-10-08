/* =========================================================
   Адаптивный темп: модель ученика.
   По каждой попытке в тренировке храним: верно ли с первой попытки,
   сколько подсказок открыто, сколько секунд думал, какая ошибка.
   Из этого считаем:
     • уровень сложности задач по теме (1–3);
     • норму тренировки перед проверкой (быстрый 2, обычный 3, медленный 5);
     • общий темп ученика (быстрый / обычный / бережный);
     • когда предложить сразу проверку, а когда — вернуться к базе.
   Чистые функции: состояние передаётся и возвращается явно.
   ========================================================= */
(function () {
  'use strict';

  const PACE = {
    fast:   { label: 'Быстрый',  need: 2, say: 'Задачи сложнее, к проверке можно раньше.' },
    normal: { label: 'Обычный',  need: 3, say: 'Задачи среднего уровня, три задачи перед проверкой.' },
    slow:   { label: 'Бережный', need: 5, say: 'Задачи проще, больше тренировки и подсказок — без спешки.' },
  };

  const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

  // Общий темп по последним 15 попыткам во всех темах
  function pace(attempts) {
    const last = attempts.slice(-15);
    if (last.length < 4) return 'normal';
    const clean = last.filter(a => a.firstTry && a.hints === 0).length / last.length;
    const hintRate = last.filter(a => a.hints > 0).length / last.length;
    const wrong = last.filter(a => !a.firstTry).length / last.length;
    const sec = median(last.map(a => a.sec));
    if (clean >= 0.8 && sec <= 45) return 'fast';
    if (wrong >= 0.45 || hintRate >= 0.5 || sec >= 120) return 'slow';
    return 'normal';
  }

  // Стартовый уровень темы по общему темпу
  const startLevel = p => (p === 'fast' ? 2 : p === 'slow' ? 1 : 2);

  /* После ответа в тренировке.
     m — данные темы: { level, cleanRun, wrongRun, lastMistake, mistakeRepeat }
     a — попытка: { firstTry, hints, sec, mistake, solved }
     Возвращает список событий для интерфейса. */
  function afterAttempt(m, a, p) {
    const ev = [];
    if (m.level == null) m.level = startLevel(p);
    if (!a.solved) {                                   // неверный ответ
      m.cleanRun = 0; m.wrongRun = (m.wrongRun || 0) + 1;
      if (m.wrongRun >= 2 && m.level > 1) { m.level--; m.wrongRun = 0; ev.push({ type: 'level-down', level: m.level }); }
      else if (m.wrongRun >= 2) { m.wrongRun = 0; ev.push({ type: 'struggle' }); }
    } else if (a.firstTry && a.hints === 0) {          // решил сразу и без подсказок
      m.cleanRun = (m.cleanRun || 0) + 1; m.wrongRun = 0;
      const quick = a.sec <= (p === 'fast' ? 60 : 45);
      if (m.cleanRun >= 2 && quick && m.level < 3) { m.level++; m.cleanRun = 0; ev.push({ type: 'level-up', level: m.level }); }
    } else {                                           // решил, но с попыток или с подсказкой
      m.cleanRun = 0; m.wrongRun = 0;
    }
    if (a.mistake) {
      m.mistakeRepeat = m.lastMistake === a.mistake ? (m.mistakeRepeat || 1) + 1 : 1;
      m.lastMistake = a.mistake;
      if (m.mistakeRepeat >= 2) ev.push({ type: 'same-mistake', mistake: a.mistake });
    }
    return ev;
  }

  // Сколько верных задач в тренировке советуем перед проверкой
  const need = p => PACE[p].need;

  // Можно ли предложить «сразу к проверке»: две первые задачи — чисто и быстро
  const fastTrack = (m, p) => p !== 'slow' && (m.practice || 0) >= 2 && (m.practice || 0) < need(p) && (m.cleanTotal || 0) >= 2 && (m.errorsTotal || 0) === 0;

  // Открывать ли первую подсказку автоматически
  const autoHint = (m, p) => p === 'slow' && (m.wrongRun || 0) >= 1;

  window.VEKTOR_ADAPTIVE = { PACE, pace, startLevel, afterAttempt, need, fastTrack, autoHint };
})();
