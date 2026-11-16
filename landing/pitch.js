(function () {
  'use strict';
  document.querySelectorAll('[data-wave-plan]').forEach(VEKTOR_PUBLIC_PROGRAM.renderWaves);
  document.querySelectorAll('[data-program-summary]').forEach(VEKTOR_PUBLIC_PROGRAM.summary);
  var slides = Array.from(document.querySelectorAll('.slide')), index = 0;
  var pet = VEKTOR_DROBIK.mount(document.getElementById('pitch-pet'), { size: 180, state: 'confused', age: 'senior', hideCharge: true });
  function draw() {
    slides.forEach(function (slide, i) { slide.hidden = i !== index; });
    document.getElementById('position').textContent = (index + 1) + ' / ' + slides.length;
    document.getElementById('timing').textContent = slides[index].dataset.time;
    document.getElementById('prev').disabled = index === 0;
    document.getElementById('next').disabled = index === slides.length - 1;
    pet.setState(slides[index].dataset.state);
  }
  function move(delta) { index = Math.max(0, Math.min(slides.length - 1, index + delta)); draw(); }
  document.getElementById('prev').addEventListener('click', function () { move(-1); });
  document.getElementById('next').addEventListener('click', function () { move(1); });
  document.addEventListener('keydown', function (event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('button,a,input,select,textarea')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
  });
  document.getElementById('fullscreen').addEventListener('click', function () {
    var p = document.fullscreenElement ? document.exitFullscreen && document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    if (p && p.catch) p.catch(function () {});
  });
  window.addEventListener('pagehide', function () { pet.destroy(); }, { once: true }); draw();
}());
