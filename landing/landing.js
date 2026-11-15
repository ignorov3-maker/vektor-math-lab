(function () {
  'use strict';
  VEKTOR_PUBLIC_PROGRAM.render(document.getElementById('program-view'));
  document.querySelectorAll('[data-wave-plan]').forEach(VEKTOR_PUBLIC_PROGRAM.renderWaves);
  var pet = VEKTOR_DROBIK.mount(document.getElementById('hero-pet'), { size: 86, state: 'thinking', hideCharge: true, cosmetics: { screen: 'screen-turquoise' } });
  var button = document.getElementById('example-toggle'), answer = document.getElementById('example-answer');
  button.addEventListener('click', function () {
    answer.hidden = !answer.hidden;
    button.textContent = answer.hidden ? 'Проверить правило из 7 класса' : 'Скрыть контрпример';
    button.setAttribute('aria-expanded', String(!answer.hidden));
    pet.setState(answer.hidden ? 'thinking' : 'proud');
  });
  window.addEventListener('pagehide', function () { pet.destroy(); }, { once: true });
}());
