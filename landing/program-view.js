/* Read-only views of the shared curriculum. Curriculum data stays in content/program.js. */
(function (root) {
  'use strict';
  var serial = 0;
  function node(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function ready(topic) { return Array.isArray(topic.ready) && topic.ready.length > 0; }
  function renderProgram(host) {
    var program = root.VEKTOR_PROGRAM;
    if (!host || !program) return;
    var prefix = 'public-program-' + (++serial), controls = node('div', 'grade-select');
    controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Выбрать класс');
    var panels = node('div', 'grade-panels'), buttons = [], sections = [];
    program.GRADES.forEach(function (grade, index) {
      var b = node('button', '', grade.n + ' класс'), panel = node('section', 'grade-panel');
      b.type = 'button'; b.dataset.grade = grade.n; b.setAttribute('aria-pressed', String(index === 0));
      panel.id = prefix + '-' + grade.n; panel.dataset.gradePanel = grade.n; panel.hidden = index !== 0;
      b.setAttribute('aria-controls', panel.id);
      var title = node('h3', 'grade-title', grade.n + ' класс'); title.id = panel.id + '-title';
      panel.setAttribute('aria-labelledby', title.id); panel.appendChild(title);
      var strands = node('div', 'program-strands');
      grade.strands.forEach(function (strand) {
        var article = node('article', 'program-strand'), list = node('ul', 'topic-list');
        article.appendChild(node('h4', '', strand.name));
        strand.topics.forEach(function (topic) {
          var item = node('li'), isReady = ready(topic);
          var status = node('span', 'readiness ' + (isReady ? 'is-ready' : 'is-planned'), isReady ? 'работает сейчас' : program.WAVES[topic.wave] || 'по плану');
          status.dataset.ready = String(isReady);
          if (!isReady && topic.wave !== undefined) status.dataset.wave = topic.wave;
          item.append(node('span', 'topic-title', topic.title), status); list.appendChild(item);
        });
        article.appendChild(list);
        if (strand.bug) {
          var sample = node('div', 'rule-sample'), details = node('details', 'program-counter');
          sample.append(node('p', 'example-label', 'Пример неверного правила'), node('p', 'wrong-rule', strand.bug.rule));
          details.append(node('summary', '', 'Проверить на контрпримере'), node('p', '', strand.bug.counter));
          sample.appendChild(details); article.appendChild(sample);
        }
        strands.appendChild(article);
      });
      panel.appendChild(strands); buttons.push(b); sections.push(panel);
      b.addEventListener('click', function () {
        buttons.forEach(function (button, i) { button.setAttribute('aria-pressed', String(i === index)); sections[i].hidden = i !== index; });
      });
      controls.appendChild(b); panels.appendChild(panel);
    });
    host.replaceChildren(controls, panels);
  }
  function renderWaves(host) {
    var program = root.VEKTOR_PROGRAM;
    if (!host || !program) return;
    var copy = {
      0: 'Дроби 5–6 класса и проверка механизма в школьном пилоте.',
      1: 'Карта навыков, контент-фабрика, 5–6 класс целиком и входная диагностика.',
      2: 'Алгебра 7–8 и вычислительная геометрия с живым чертежом.',
      3: '9 класс, причины потери баллов на ОГЭ и фото решения.'
    };
    var row = node('ol', 'wave-plan');
    [0].concat(Object.keys(program.WAVES).map(Number)).forEach(function (wave) {
      var item = node('li', 'wave-item'); item.dataset.wavePlan = wave;
      item.append(node('span', 'wave-number', 'Волна ' + wave + (wave === 0 ? ' · работает' : ' · план')),
        node('h3', '', wave === 0 ? 'Сейчас' : program.WAVES[wave]),
        node('p', '', copy[wave] || 'Следующая волна программы.'));
      row.appendChild(item);
    });
    host.replaceChildren(row);
  }
  function summary(host) {
    var program = root.VEKTOR_PROGRAM;
    if (!host || !program) return;
    var ids = new Set();
    program.GRADES.forEach(function (grade) { grade.strands.forEach(function (s) { s.topics.forEach(function (t) { if (ready(t)) t.ready.forEach(function (id) { ids.add(id); }); }); }); });
    host.textContent = 'Классы: ' + program.GRADES.map(function (g) { return g.n; }).join(' · ') + '. Сейчас — ' + ids.size + ' тем дробей; остальные разделы по плану.';
  }
  root.VEKTOR_PUBLIC_PROGRAM = Object.freeze({ render: renderProgram, renderWaves: renderWaves, summary: summary });
}(window));
