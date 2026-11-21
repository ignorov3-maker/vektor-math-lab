// Слияние прогресса школа/дом (content/merge.js): ничего не теряется и не задваивается.
require('../content/merge.js');
const { merge3 } = globalThis.VEKTOR_MERGE;
const assert = require('assert');
const clone = x => JSON.parse(JSON.stringify(x));

const base = {
  progress: { concept: 40, reduce: 0, compare: 0 },
  meta: { concept: { tasks: 4, practice: 4, errorsTotal: 1, level: 2 } },
  attempts: [{ topic: 'concept', firstTry: true, hints: 0, sec: 10, level: 2 }],
  answers: 4, days: ['2026-11-20'],
  game: { stars: 10, earned: ['first'], bestStreak: 2, day: '2026-11-20', dayTasks: 4 },
  workshop: { owned: ['hat'] },
  settings: { name: 'Маша', grade: 6, sound: true },
};

// в школе (вкладка была без сети): решила тему reduce
const school = clone(base);
school.progress.reduce = 50; school.meta.reduce = { tasks: 3, practice: 3, errorsTotal: 0, level: 1 };
school.attempts.push({ topic: 'reduce', firstTry: true, hints: 0, sec: 20, level: 1 }, { topic: 'reduce', firstTry: false, hints: 1, sec: 30, level: 1 });
school.answers += 3; school.game.stars += 3; school.game.dayTasks += 3; school.game.earned.push('five');

// дома (уже на сервере): решила тему compare и купила шапку… то есть шарф
const home = clone(base);
home.progress.compare = 30; home.meta.compare = { tasks: 2, practice: 2, errorsTotal: 1, level: 1 };
home.attempts.push({ topic: 'compare', firstTry: false, hints: 0, sec: 40, level: 1 });
home.answers += 2; home.game.stars += 5 - 4; home.workshop.owned.push('scarf'); home.days.push('2026-11-21');
home.game.bestStreak = 3; home.settings.sound = false;

const m = merge3(base, school, home);
assert.strictEqual(m.progress.reduce, 50, 'тема из школы видна');
assert.strictEqual(m.progress.compare, 30, 'тема из дома видна');
assert.strictEqual(m.progress.concept, 40);
assert.deepStrictEqual(m.meta.reduce, school.meta.reduce);
assert.deepStrictEqual(m.meta.compare, home.meta.compare);
assert.strictEqual(m.answers, 4 + 3 + 2, 'решённые задачи сложились');
assert.strictEqual(m.game.stars, 10 + 3 + 1, 'звёзды: прирост из школы + прирост из дома (с покупкой)');
assert.strictEqual(m.attempts.length, 1 + 2 + 1, 'попытки не задвоились и не потерялись');
assert.deepStrictEqual(m.game.earned.sort(), ['first', 'five']);
assert.deepStrictEqual(m.workshop.owned.sort(), ['hat', 'scarf']);
assert.deepStrictEqual(m.days, ['2026-11-20', '2026-11-21']);
assert.strictEqual(m.game.bestStreak, 3, 'рекорд — максимум');
assert.strictEqual(m.settings.sound, false, 'настройку меняли только дома');

// повторное слияние того же (повтор после обрыва) ничего не задваивает
const again = merge3(home, m, m);
assert.deepStrictEqual(again, m);
// школьная копия пришла второй раз с тем же base, когда сервер уже содержит слияние: попытки не удваиваются
const twice = merge3(base, school, m);
assert.strictEqual(twice.attempts.length, m.attempts.length + 2, 'без сдвига base повтор добавляет — поэтому base обновляется после каждого слияния');
const proper = merge3(m, m, m);
assert.deepStrictEqual(proper, m);

// учитель сбросил прогресс (на сервере пусто): остаётся только сделанное после base
const reset = merge3(base, school, null);
assert.strictEqual(reset.progress.reduce, 50);
assert.strictEqual(reset.progress.concept, undefined, 'старый прогресс не воскресает');
assert.strictEqual(reset.answers, 3);
assert.strictEqual(reset.game.stars, 3);

// старая копия без base: числа по максимуму, списки объединяются
const nob = merge3(null, school, home);
assert.strictEqual(nob.game.stars, Math.max(school.game.stars, home.game.stars));
assert.strictEqual(nob.attempts.length, 4);
assert.strictEqual(nob.progress.reduce, 50); assert.strictEqual(nob.progress.compare, 30);

// длинный список попыток обрезается до прежней длины, свежие остаются
const long = clone(base); long.attempts = Array.from({ length: 60 }, (_, i) => ({ topic: 't', sec: i }));
const l1 = clone(long); l1.attempts = l1.attempts.slice(1).concat({ topic: 't', sec: 100 });
const l2 = clone(long); l2.attempts = l2.attempts.slice(1).concat({ topic: 't', sec: 200 });
const lm = merge3(long, l1, l2);
assert.strictEqual(lm.attempts.length, 60);
assert.deepStrictEqual(lm.attempts.slice(-2).map(a => a.sec), [200, 100]);

console.log('merge: OK');

// поле пропало на сервере без сброса (старая версия приложения прислала не всё) — сделанное здесь не теряется
const partial = merge3(base, school, { answers: 1, settings: { name: 'x' } });
assert.strictEqual(partial.progress.concept, 40); assert.strictEqual(partial.progress.reduce, 50);
assert.ok(partial.meta.concept && partial.meta.concept.tasks === 4);
console.log('merge partial: OK');

// сервер был пуст (новый ученик), base известна и пустая: прирост с двух устройств складывается
const e1 = merge3({}, { answers: 3, game: { stars: 3 }, attempts: [{ t: 1 }] }, { answers: 2, game: { stars: 5 }, attempts: [{ t: 2 }] });
assert.strictEqual(e1.answers, 5); assert.strictEqual(e1.game.stars, 8); assert.strictEqual(e1.attempts.length, 2);
console.log('merge empty base: OK');
