(function () {
  'use strict';
  var ALLOWED = new Set(('div span p br strong em b i u sub sup ul ol li figure figcaption h1 h2 h3 svg g rect path line circle ellipse text tspan polygon polyline defs clippath mask title desc').split(' '));
  var ATTRS = new Set(('class id viewbox width height x y x1 y1 x2 y2 cx cy r rx ry d points fill stroke stroke-width stroke-linecap stroke-linejoin stroke-opacity fill-opacity opacity transform text-anchor dominant-baseline clip-path preserveaspectratio role aria-label xmlns').split(' '));
  function safe(html) {
    var template = document.createElement('template');
    template.innerHTML = String(html || '').slice(0, 50000);
    Array.from(template.content.querySelectorAll('*')).forEach(function (el) {
      if (!ALLOWED.has(el.tagName.toLowerCase())) { el.remove(); return; }
      Array.from(el.attributes).forEach(function (a) {
        var value = a.value.trim();
        if (!ATTRS.has(a.name.toLowerCase()) || /(?:javascript:|data:|https?:|\/\/)/i.test(value) && a.name !== 'xmlns'
          || /url\s*\((?!\s*#[\w-]+\s*\))/i.test(value)) el.removeAttribute(a.name);
      });
    });
    return template.content;
  }
  var data;
  try { data = JSON.parse(localStorage.getItem('vektor-board') || 'null'); } catch (_) { data = null; }
  var slides = data && Array.isArray(data.slides) ? data.slides.filter(function (s) { return s && typeof s === 'object' && typeof s.html === 'string'; }).slice(0, 3) : [];
  var index = 0, pet;
  var labels = { wrong: 'Найти правило', conflict: 'Проверить на простом примере', fix: 'Собрать верную идею' };
  var title = document.getElementById('title'), content = document.getElementById('slide-html');
  var answer = document.getElementById('answer'), reveal = document.getElementById('show-answer');
  function draw() {
    var slide = slides[index];
    document.getElementById('phase').textContent = Object.prototype.hasOwnProperty.call(labels, slide.kind) ? labels[slide.kind] : 'Разбираемся вместе';
    title.textContent = String(data.title || 'Разберёмся вместе');
    content.replaceChildren(safe(slide.html));
    document.getElementById('question').textContent = String(slide.question || '');
    document.getElementById('question').hidden = false;
    answer.replaceChildren(safe(slide.answerHtml)); answer.hidden = true;
    reveal.hidden = !slide.answerHtml; reveal.textContent = 'Показать ответ'; reveal.setAttribute('aria-expanded', 'false');
    document.getElementById('previous').disabled = index === 0;
    document.getElementById('next').disabled = index === slides.length - 1;
    document.getElementById('position').textContent = (index + 1) + ' / ' + slides.length;
    if (pet) pet.setState(slide.kind === 'wrong' ? 'confused' : slide.kind === 'fix' ? 'proud' : 'thinking');
  }
  function move(delta) { if (slides.length) { index = Math.max(0, Math.min(slides.length - 1, index + delta)); draw(); } }
  function showAnswer() {
    if (!slides.length || !slides[index].answerHtml) return;
    answer.hidden = !answer.hidden;
    document.getElementById('question').hidden = !answer.hidden;
    reveal.textContent = answer.hidden ? 'Показать ответ' : 'Скрыть ответ'; reveal.setAttribute('aria-expanded', String(!answer.hidden));
  }
  if (!slides.length) {
    document.getElementById('empty').hidden = false;
    document.querySelector('.board-bottom').hidden = true;
    document.querySelector('.board-help').hidden = true;
  } else {
    document.getElementById('lesson').hidden = false;
    document.getElementById('bug-name').textContent = String(data.kidName || '');
    if (window.VEKTOR_DROBIK) pet = VEKTOR_DROBIK.mount(document.getElementById('pet'), { state: 'thinking', size: 210, age: 'senior' });
    draw();
  }
  document.getElementById('previous').addEventListener('click', function () { move(-1); });
  document.getElementById('next').addEventListener('click', function () { move(1); });
  reveal.addEventListener('click', showAnswer);
  content.addEventListener('click', function (e) { if (!e.target.closest('button,a,summary')) move(1); });
  document.addEventListener('keydown', function (e) {
    if (e.target.closest('button,input,select,textarea,a')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
    if (e.code === 'Space') { e.preventDefault(); showAnswer(); }
  });
  document.getElementById('fullscreen').addEventListener('click', function () {
    var promise = document.fullscreenElement ? document.exitFullscreen && document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    if (promise && promise.catch) promise.catch(function () {});
  });
  window.addEventListener('pagehide', function () { if (pet) pet.destroy(); }, { once: true });
}());
