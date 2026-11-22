// Запуск: node tests/program.test.js — сверка публичной карты с доступными темами.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
globalThis.window = globalThis;

for (const f of ['check', 'rational', 'tone', 'visuals', 'bugs', 'fractions', 'kit', 'program']) require('../content/' + f + '.js');
const courses = path.join(__dirname, '../content/courses');
const files = fs.readdirSync(courses).filter(f => f.endsWith('.js')).sort();
for (const f of files) require(path.join(courses, f));

const { GRADES, WAVES, readyCount } = VEKTOR_PROGRAM;
VEKTOR_KIT.adopt('fractions', 'Обыкновенные дроби', 5, VEKTOR_FRACTIONS.topics, 'Дроби');
const available = VEKTOR_KIT.topics.filter(topic => topic.grade >= 5);
const listed = new Set();

assert.deepEqual(GRADES.map(grade => grade.n), [5, 6, 7, 8, 9]);
for (const grade of GRADES) {
  assert.ok(grade.strands.some(strand => strand.bug), 'У класса есть пример неверного правила');
  for (const strand of grade.strands) {
    for (const topic of strand.topics) {
      assert.ok(topic.title && (topic.ready?.length || WAVES[topic.wave]), 'У темы есть название и статус');
      for (const id of topic.ready || []) {
        const lesson = VEKTOR_KIT.byId[id];
        assert.ok(lesson, id + ': есть готовый урок');
        assert.equal(lesson.grade, grade.n, id + ': класс совпадает');
        assert.equal(lesson.strand, strand.name, id + ': раздел совпадает');
        assert.ok(!listed.has(id), id + ': урок указан один раз');
        listed.add(id);
      }
    }
  }
}

assert.deepEqual(listed, new Set(available.map(topic => topic.id)));
assert.equal(readyCount(), available.length);
for (const page of ['index.html', 'teacher.html', 'parent.html', 'tutor.html', 'report.html']) {
  const html = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
  const scripts = Array.from(html.matchAll(/src="content\/courses\/([^"]+\.js)"/g), m => m[1]).sort();
  assert.deepEqual(scripts, files, page + ': загружаются все существующие курсы');
}
console.log('program: OK (' + available.length + ' тем для 5–9 классов)');
