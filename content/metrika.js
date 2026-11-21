// Яндекс Метрика: только просмотры экранов и цели, без записи сеансов.
// Включается номером счётчика metrikaId в config.js; пусто — ничего не грузится.
// Блокер 4 плана приёмки:
//  • Вебвизор выключен везде (вход, QR-переходы, кабинеты, тесты, чат) — сеансы не записываются.
//  • Карты кликов и скроллинга — только на лендинге (до входа) и в обезличенном демо-аккаунте.
//  • В адрес не попадают ключи QR (#k=…), токены почты и сброса пароля, параметры ?…: хеш берём
//    только вида #lesson/12/check, остальное отрезаем; отправку хеша делаем сами, а не трекером.
//  • В цели уходят только короткие технические поля, без текста ответов, имён и чата.
(function () {
  var id = window.VEKTOR_CONFIG && +window.VEKTOR_CONFIG.metrikaId;
  // локально, в автотестах и с файла не считаем: в отчётах — только настоящие посетители сайта
  var local = location.protocol !== 'https:' || /^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname);
  if (!id || navigator.webdriver || (local && !window.__ymTest)) { window.VEKTOR_METRIKA = { goal: function () {}, safeUrl: safeUrl }; return; }

  // адрес без секретов: только путь и маршрут приложения из латиницы, цифр и «/»
  function safeUrl(href) {
    try {
      var u = new URL(href, location.href), h = u.hash;
      if (!/^#[a-z]+(\/[a-z0-9-]+){0,3}$/.test(h)) h = '';
      return u.origin + u.pathname + h;
    } catch (e) { return location.origin + location.pathname; }
  }
  function session() { try { return JSON.parse(localStorage.getItem('vektor-session')); } catch (e) { return null; } }
  var page = location.pathname.replace(/\/+$/, '/');
  var isIndex = /\/(index\.html)?$/.test(page), s = session();
  // лендинг (никто не вошёл) или обезличенный демо-ученик — единственные места с картой кликов
  var maps = isIndex && (!s || /^демо/.test(String(s.login || '')));

  window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
  window.ym.l = +new Date();
  var sc = document.createElement('script'); sc.async = true; sc.src = 'https://mc.yandex.ru/metrika/tag.js?id=' + id;
  document.head.appendChild(sc);
  window.ym(id, 'init', { webvisor: false, clickmap: maps, trackLinks: maps, accurateTrackBounce: true, trackHash: false, ssr: false,
    url: safeUrl(location.href), referrer: document.referrer ? safeUrl(document.referrer).replace(/#.*$/, '') : '' });
  // экраны приложения (#home, #lesson/3/check) — сами, уже очищенные
  var last = safeUrl(location.href);
  addEventListener('hashchange', function () {
    var u = safeUrl(location.href); if (u === last) return; last = u;
    try { window.ym(id, 'hit', u, { title: 'Вектор' }); } catch (e) {}
  });

  // на всякий случай: поля ввода и личные места помечены для Метрики как скрытые
  var PRIVATE = '.msg.user, [data-ym-private], #student-name, #avatar, .bip-dock .bipych-bubble, .test, .login';
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
    safeUrl: safeUrl,
    goal: function (name, params) {
      var p;
      if (params && typeof params === 'object') {
        p = {}; for (var key in params) if (KEEP[key] && params[key] != null && typeof params[key] !== 'object') p[key] = typeof params[key] === 'string' ? params[key].slice(0, 40) : params[key];
      }
      try { window.ym(id, 'reachGoal', String(name), p); } catch (e) {}
    },
  };
})();
