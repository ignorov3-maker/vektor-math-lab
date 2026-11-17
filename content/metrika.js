// Яндекс Метрика. Включается только если в config.js указан metrikaId.
// Вебвизор (запись экрана) выключен намеренно: на сайте дети, их ввод и экраны мы не записываем.
// Цели: intro_done (прошёл знакомство), quick (уровень старта), mastered (тема освоена) и другие события logEvent.
(function () {
  var id = window.VEKTOR_CONFIG && +window.VEKTOR_CONFIG.metrikaId;
  if (!id || navigator.webdriver) { window.VEKTOR_METRIKA = { goal: function () {} }; return; }
  window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
  window.ym.l = +new Date();
  var s = document.createElement('script'); s.async = true; s.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.appendChild(s);
  window.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, trackHash: true, webvisor: false, defer: false });
  window.VEKTOR_METRIKA = {
    goal: function (name, params) {
      try { window.ym(id, 'reachGoal', String(name), params && typeof params === 'object' ? params : undefined); } catch (e) {}
    },
  };
})();
