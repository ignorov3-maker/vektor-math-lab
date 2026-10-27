(function () {
  'use strict';
  var lib = window.VEKTOR_DROBIK;
  var labels = ['Спокоен', 'Радуется', 'Думает', 'Удивлён', 'Гордится', 'Смущён', 'Ловит жучка', 'Празднует', 'Спит'];
  var descriptions = [
    'Осматривается и моргает. Всё спокойно.',
    'Подпрыгивает: получилось!',
    'Смотрит по сторонам, чешет щёку и собирает мысли по пикселям.',
    'Кажется, что-то не сходится. Посмотрим ещё раз?',
    'Выпрямился, поднял кулачок: вот это мы разобрались!',
    'Бип… Я тоже иногда путаюсь.',
    'Заметил жучка и приготовил сачок.',
    'Вот это находка! Можно немного потанцевать.',
    'Отдыхает и набирается сил.'
  ];
  var colors = ['screen-raspberry', 'screen-turquoise', 'screen-black'];
  var handles = [], main, cycle = null, index = 0, currentState = 'idle', palette = 'screen-turquoise';
  var map = {}, age = 'junior', done = 2, goal = 5, line = '';
  var wallet = window.VEKTOR_WARDROBE;
  function readOutfit() {
    var saved = wallet.getState();
    palette = saved.equipped.screen || 'screen-turquoise';
    map = Object.assign({}, saved.equipped); delete map.screen;
  }
  readOutfit();
  function byId(id) { return document.getElementById(id); }
  function make(el, opts) { var h = lib.mount(el, opts); handles.push(h); return h; }
  document.querySelectorAll('[data-hero]').forEach(function (el, i) {
    make(el, { state: i === 1 ? 'happy' : 'idle', size: 160, cosmetics: { screen: el.dataset.hero }, charge: { done: 3, goal: 5 } });
  });
  function resetMain() {
    if (main) { main.destroy(); handles.splice(handles.indexOf(main), 1); }
    main = make(byId('main-bipych'), { state: currentState, size: 280, age: age, charge: { done: done, goal: goal }, cosmetics: Object.assign({ screen: palette }, map) });
    if (line) main.say(line);
    window.demoBipych = main;
  }
  function setState(state) {
    currentState = state;
    index = lib.STATES.indexOf(state);
    main.setState(state);
    byId('state-description').textContent = descriptions[index];
    document.querySelectorAll('[data-state-button]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.stateButton === state));
    });
  }
  function stopCycle() {
    clearInterval(cycle); cycle = null;
    byId('cycle').setAttribute('aria-pressed', 'false');
    byId('cycle').textContent = 'Проиграть все состояния';
  }
  resetMain();
  lib.STATES.forEach(function (state, i) {
    var button = document.createElement('button');
    button.type = 'button'; button.textContent = labels[i];
    button.dataset.stateButton = state; button.setAttribute('aria-pressed', String(i === 0));
    button.addEventListener('click', function () { stopCycle(); setState(state); });
    byId('states').appendChild(button);
    var article = document.createElement('article');
    article.className = 'demo-state-card';
    article.dataset.galleryState = state;
    var heading = document.createElement('h3'); heading.textContent = labels[i];
    var trio = document.createElement('div'); trio.className = 'demo-state-trio';
    colors.forEach(function (color) { var holder = document.createElement('div'); trio.appendChild(holder); make(holder, { state: state, size: 96, cosmetics: { screen: color }, charge: { done: state === 'sleep' ? 0 : 3, goal: 5 } }); });
    var desc = document.createElement('p'); desc.textContent = descriptions[i];
    article.append(heading, trio, desc); byId('matrix').appendChild(article);
  });
  [32, 48, 64, 96].forEach(function (size) {
    var holder = document.createElement('div'); byId('scales').appendChild(holder);
    make(holder, { size: size, cosmetics: { screen: 'screen-turquoise' } });
  });
  var requestedState = new URLSearchParams(location.search).get('state');
  if (lib.STATES.indexOf(requestedState) >= 0) setState(requestedState);
  document.querySelectorAll('[data-palette]').forEach(function (button) {
    button.addEventListener('click', function () {
      palette = button.dataset.palette;
      main.setCosmetics(Object.assign({ screen: palette }, map));
      document.querySelectorAll('[data-palette]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
    });
  });
  ['antenna', 'hat', 'net'].forEach(function (slot) {
    var select = byId(slot);
    var none = document.createElement('option');
    none.value = ''; none.textContent = slot === 'antenna' ? 'Обычный спутник' : 'Без аксессуара';
    select.appendChild(none);
    lib.COSMETICS.filter(function (c) { return c.slot === slot; }).forEach(function (c) {
      var option = document.createElement('option');
      option.value = c.id; option.textContent = c.name + (c.unlock ? ' · награда' : '');
      select.appendChild(option);
    });
    select.addEventListener('change', function () {
      if (select.value) map[slot] = select.value; else delete map[slot];
      main.setCosmetics(Object.assign({ screen: palette }, map));
    });
  });
  byId('reset').addEventListener('click', function () {
    readOutfit();
    ['antenna', 'hat', 'net'].forEach(function (slot) { byId(slot).value = map[slot] || ''; });
    main.setCosmetics(Object.assign({ screen: palette }, map));
  });
  byId('reset').textContent = 'Вернуть свой образ';
  function notice(text) { byId('wardrobe-notice').textContent = text; }
  function syncOutfit() {
    readOutfit();
    main.setCosmetics(Object.assign({ screen: palette }, map));
    ['antenna', 'hat', 'net'].forEach(function (slot) { byId(slot).value = map[slot] || ''; });
    document.querySelectorAll('[data-palette]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.palette === palette)); });
  }
  function renderWardrobe() {
    VEKTOR_COLLECTION.renderWorkshop(byId('wardrobe'), Object.assign({}, wallet.getState(), {
      onBuy: async function (id) {
        await wallet.buy(id);
        notice(lib.COSMETICS.find(function (c) { return c.id === id; }).name + ' — теперь твоя вещь. Можно надеть!');
      },
      onEquip: async function (slot, id) { await wallet.equip(slot, id); notice('Новый образ сохранён. Бипыч доволен!'); }
    }));
  }
  var unsubscribe = wallet.subscribe(function () { syncOutfit(); renderWardrobe(); });
  byId('demo-stars').addEventListener('click', async function () {
    try { await wallet.addDemoStars(50); notice('Добавили 50 пробных звёзд для примерки.'); } catch (e) { notice(e.message); }
  });
  byId('undress').addEventListener('click', async function () {
    try { await wallet.clearAccessories(); notice('Аксессуары сняты. Покупки остались в твоих вещах.'); } catch (e) { notice(e.message); }
  });
  syncOutfit(); renderWardrobe();
  byId('senior').addEventListener('change', function (e) { age = e.target.checked ? 'senior' : 'junior'; resetMain(); });
  byId('done').addEventListener('input', function (e) { done = Number(e.target.value); main.setCharge(done, goal); });
  byId('goal').addEventListener('change', function (e) {
    goal = Number(e.target.value); done = Math.min(done, goal);
    byId('done').max = goal; byId('done').value = done; main.setCharge(done, goal);
  });
  byId('speech').addEventListener('submit', function (e) { e.preventDefault(); line = byId('line').value; main.say(line, { voice: byId('voice').checked }); });
  byId('skin').addEventListener('change', function (e) { document.documentElement.dataset.skin = e.target.value; });
  byId('cycle').addEventListener('click', function () {
    if (cycle) return stopCycle();
    byId('cycle').setAttribute('aria-pressed', 'true'); byId('cycle').textContent = 'Остановить';
    cycle = setInterval(function () { setState(lib.STATES[(index + 1) % lib.STATES.length]); }, 4500);
  });
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function updateMotion() {
    if (reduced.matches) stopCycle();
    byId('cycle').disabled = reduced.matches;
    byId('cycle').title = reduced.matches ? 'Включена настройка уменьшения движения' : '';
  }
  reduced.addEventListener('change', updateMotion); updateMotion();
  window.addEventListener('pagehide', function () { stopCycle(); unsubscribe(); handles.forEach(function (h) { h.destroy(); }); reduced.removeEventListener('change', updateMotion); }, { once: true });
}());
