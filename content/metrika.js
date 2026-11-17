// Яндекс Метрика: просмотры экранов, карта кликов, скроллинга и Вебвизор.
// Включается номером счётчика metrikaId в config.js; пусто — ничего не грузится.
// Личное не записываем: всё, что ребёнок вводит в поля, Вебвизор заменяет звёздочками (ym-disable-keys),
// его сообщения Бипычу и имя скрыты (ym-hide-content). В цели уходят только номера уровней и тем, без текста ответов.
(function () {
  var id = window.VEKTOR_CONFIG && +window.VEKTOR_CONFIG.metrikaId;
  // локально, в автотестах и с файла не считаем: в отчётах — только настоящие посетители сайта
  var local = location.protocol !== 'https:' || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname);
  if (!id || navigator.webdriver || (local && !window.__ymTest)) { window.VEKTOR_METRIKA = { goal: function () {} }; return; }
  window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
  window.ym.l = +new Date();
  var s = document.createElement('script'); s.async = true; s.src = 'https://mc.yandex.ru/metrika/tag.js?id=' + id;
  document.head.appendChild(s);
  window.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, trackHash: true, webvisor: true, ssr: false, referrer: document.referrer, url: location.href });

  // разметка приватных мест: поля ввода, реплики ученика, имя
  var PRIVATE = '.msg.user, [data-ym-private], #student-name, #avatar, .bip-dock .bipych-bubble';
  function mask(root) {
    try {
      root.querySelectorAll('input, textarea').forEach(function (el) { el.classList.add('ym-disable-keys'); });
      root.querySelectorAll(PRIVATE).forEach(function (el) { el.classList.add('ym-hide-content'); });
    } catch (e) {}
  }
  function start() {
    mask(document);
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) for (var j = 0; j < list[i].addedNodes.length; j++) {
        var n = list[i].addedNodes[j]; if (n.nodeType === 1) { mask(n); if (n.matches && n.matches('input, textarea')) n.classList.add('ym-disable-keys'); if (n.matches && n.matches(PRIVATE)) n.classList.add('ym-hide-content'); }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  // в параметры цели — только короткие технические поля
  var KEEP = { level: 1, topic: 1, stage: 1, step: 1, mode: 1, k: 1, from: 1, known: 1, misses: 1, right: 1, total: 1, passed: 1, ok: 1, try: 1, hints: 1, sec: 1, skip: 1, miss: 1, pick: 1, bug: 1, kind: 1, to: 1, mood: 1, mistake: 1 };
  window.VEKTOR_METRIKA = {
    goal: function (name, params) {
      var p;
      if (params && typeof params === 'object') {
        p = {}; for (var key in params) if (KEEP[key] && params[key] != null && typeof params[key] !== 'object') p[key] = typeof params[key] === 'string' ? params[key].slice(0, 40) : params[key];
      }
      try { window.ym(id, 'reachGoal', String(name), p); } catch (e) {}
    },
  };
})();
