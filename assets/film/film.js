(function () {
  'use strict';
  var duration = 36, boundaries = [0, 4, 10, 20, 26, 32, 36];
  var lib = window.VEKTOR_DROBIK, collection = window.VEKTOR_COLLECTION;
  var scenes = Array.from(document.querySelectorAll('.scene')), pets = [], emotion, emotionState = '';
  var shop = document.getElementById('movie-shop'), bugs = document.getElementById('movie-bugs');
  var wallet, applied = 0, previous = -1, position = 0, playing = false, playStart = 0, boardIndex = 0;
  var anchors = {}, lesson = document.getElementById('lesson-frame');
  var bugData = [
    { key: 'add-diff:add-denominators', kidName: 'Складыватель', title: 'Складывал и числители, и знаменатели', status: 'caught', found: '2026-10-27' },
    { key: 'reduce:only-one-part', kidName: 'Однобокий', title: 'Сокращал только числитель', status: 'healing', found: '2026-10-26', howBeaten: 'Сравнил полоски до и после сокращения.' },
    { key: 'concept:flipped', kidName: 'Перевёртыш', title: 'Менял числитель и знаменатель местами', status: 'beaten', found: '2026-10-22', beaten: '2026-10-26', howBeaten: 'Сначала посчитал все части, потом выбранные. Дважды решил задачу-ловушку.' },
    { key: 'compare:compare-numerators-only', kidName: 'Одноглазик', title: 'Смотрел только на числители', status: 'beaten', found: '2026-10-23', beaten: '2026-10-27', howBeaten: 'Заметил: 3/8 меньше половины, а 2/3 больше половины.' }
  ];
  function pet(holder, options) { var p = lib.mount(holder, options); pets.push(p); return p; }
  function trio(id, outfits) {
    ['screen-raspberry', 'screen-turquoise', 'screen-black'].forEach(function (color, i) {
      var host = document.createElement('div'); document.getElementById(id).appendChild(host);
      pet(host, { size: i === 1 ? 260 : 218, state: i === 1 ? 'happy' : 'idle', cosmetics: Object.assign({ screen: color }, outfits && outfits[i]) });
    });
  }
  function drawShop() {
    collection.renderWorkshop(shop, Object.assign({}, wallet, {
      onBuy: function (id) {
        var item = lib.COSMETICS.find(function (c) { return c.id === id; });
        if (wallet.owned.indexOf(id) >= 0) return;
        if (!item || item.unlock || item.price > wallet.stars) throw new Error('Покупка недоступна');
        wallet.stars -= item.price; wallet.owned.push(id); drawShop();
      },
      onEquip: function (slot, id) {
        if (wallet.owned.indexOf(id) < 0) throw new Error('Сначала получи предмет');
        wallet.equipped[slot] = id; drawShop();
      }
    }));
  }
  function reset() {
    wallet = { stars: 90, owned: ['screen-turquoise', 'screen-raspberry', 'screen-black', 'net-classic'], equipped: { screen: 'screen-turquoise' } };
    drawShop(); shop.querySelector('[data-preview-reset]').click(); shop.querySelector('[data-slot=hat]').click();
    shop.querySelector('[data-shop-view=store]').click();
    collection.renderBugs(bugs, { bugs: bugData, rank: 'tracker' });
    applied = 0; anchors = {}; boardIndex = Number(lesson.contentDocument && lesson.contentDocument.getElementById('position')?.textContent.split('/')[0] || 1) - 1;
  }
  function click(selector, root) {
    var el = (root || shop).querySelector(selector);
    if (!el) throw new Error('Не найден элемент ролика: ' + selector);
    el.click();
  }
  var events = [
    { time: 10.9, target: '[data-preview-color=screen-black]', caption: 'Выбираем чёрного Бипыча', run: function () { click('[data-preview-color=screen-black]'); } },
    { time: 11.9, target: '[data-try=hat-cap]', caption: 'Примеряем кепку', run: function () { click('[data-try=hat-cap]'); } },
    { time: 13.4, target: '[data-buy=hat-cap]', caption: 'Покупаем: 90 → 55 ★', run: function () { click('[data-buy=hat-cap]'); } },
    { time: 14.8, target: '[data-equip=hat-cap]', caption: 'Кепка теперь в своих вещах', run: function () { click('[data-equip=hat-cap]'); } },
    { time: 16.4, target: '[data-slot=special]', caption: 'И ещё — особенные вещи', run: function () { click('[data-slot=special]'); } },
    { time: 17.4, target: '[data-try=pixel-ufo]', caption: 'НЛО в напарники? Легко.', run: function () { click('[data-try=pixel-ufo]'); } },
    { time: 18.7, target: '[data-try=net-comet]', caption: 'Ловец комет — примеряем трофей', run: function () { click('[data-try=net-comet]'); } },
    { time: 23.0, run: function () { click('[data-filter=beaten]', bugs); } },
    { time: 24.1, run: function () { click('.vc-how summary', bugs); } }
  ];
  function ease(value) { var v = Math.max(0, Math.min(1, value)); return v * v * (3 - 2 * v); }
  function anchor(selector) {
    var el = shop.querySelector(selector);
    if (el) {
      var box = el.getBoundingClientRect(), frame = document.getElementById('film').getBoundingClientRect(), scale = frame.width / 1280;
      anchors[selector] = { x: (box.left + box.width * .65 - frame.left) / scale, y: (box.top + box.height * .55 - frame.top) / scale };
    }
    return anchors[selector];
  }
  function scrubAnimations(doc, time) {
    doc.getAnimations().forEach(function (a) { a.pause(); a.currentTime = time * 1000; });
  }
  function boardAt(time) {
    var doc = lesson.contentDocument;
    if (!doc || !doc.getElementById('next')) return;
    var wanted = time >= 30 ? 2 : time >= 28 ? 1 : 0;
    while (boardIndex !== wanted) { doc.getElementById(boardIndex < wanted ? 'next' : 'previous').click(); boardIndex += boardIndex < wanted ? 1 : -1; }
    var reveal = doc.getElementById('show-answer'), expanded = reveal.getAttribute('aria-expanded') === 'true';
    if ((time >= 30.6) !== expanded) reveal.click();
    scrubAnimations(doc, Math.max(0, time - 26));
  }
  async function seek(time) {
    var t = Math.max(0, Math.min(duration, Number(time) || 0));
    if (t < previous) reset();
    scenes.forEach(function (scene, i) {
      var start = boundaries[i], end = boundaries[i + 1];
      var enter = i === 0 ? 1 : ease((t - start + .6) / .6);
      var exit = i === 5 ? 1 : 1 - ease((t - end + .6) / .6);
      var opacity = enter * exit;
      scene.style.visibility = opacity > 0 ? 'visible' : 'hidden'; scene.style.opacity = opacity;
      scene.style.transform = 'translateX(' + ((1 - enter) * 28 - (1 - exit) * 18) + 'px)';
    });
    document.querySelectorAll('.app-window').forEach(function (el, i) {
      var start = [10, 20, 26][i], length = [10, 6, 6][i], phase = Math.max(0, Math.min(1, (t - start) / length));
      el.style.transform = 'scale(' + (.978 + .022 * phase) + ')';
    });
    document.querySelectorAll('#intro-pets>div').forEach(function (el, i) { el.style.transform = 'translateY(' + (Math.sin(t * 1.1 + i) * 7) + 'px) rotate(' + [-9, 0, 8][i] + 'deg)'; });
    var state = t < 6 ? 'thinking' : t < 8 ? 'shy' : 'proud';
    if (state !== emotionState) { emotion.setState(state); emotionState = state; }
    document.getElementById('emotion-label').textContent = { thinking: 'Собирает мысли по пикселям', shy: 'Эм… Немного смущён', proud: 'Получилось. И он гордится!' }[state];
    while (applied < events.length && t >= events[applied].time) {
      var event = events[applied++]; if (event.target) anchor(event.target);
      event.run(); await Promise.resolve();
    }
    var grid = shop.querySelector('.vc-item-grid'), comet = shop.querySelector('[data-item=net-comet]');
    if (comet) grid.scrollTop = (comet.offsetTop - grid.offsetTop) * ease((t - 17.8) / .65);
    document.querySelector('.bugs-camera').style.transform = 'scale(.85) translateY(' + (-130 * ease((t - 23.8) / .65)) + 'px)';
    var caption = 'Начнём с примерки';
    events.forEach(function (event) { if (event.caption && t >= event.time) caption = event.caption; });
    document.getElementById('shop-caption').textContent = caption;
    document.getElementById('bugs-caption').textContent = t < 23 ? 'Все находки — в одном месте' : t < 24.1 ? 'Вот с кем уже справились' : 'Можно вспомнить, как получилось';
    var moves = events.filter(function (event) { return event.target; }), from = { x: 1160, y: 608 }, last = 10;
    var cursor = from;
    for (var i = 0; i < moves.length; i++) {
      var next = anchor(moves[i].target) || from;
      if (t <= moves[i].time) { var k = ease((t - Math.max(last, moves[i].time - .65)) / .65); cursor = { x: from.x + (next.x - from.x) * k, y: from.y + (next.y - from.y) * k }; break; }
      from = next; cursor = from; last = moves[i].time;
    }
    var clickAge = Math.min.apply(null, moves.map(function (event) { return t >= event.time ? t - event.time : 100; }));
    document.getElementById('movie-cursor').style.transform = 'translate(' + cursor.x + 'px,' + cursor.y + 'px) scale(' + (clickAge < .2 ? .8 : 1) + ')';
    boardAt(t); scrubAnimations(document, t);
    document.getElementById('scene-progress').style.width = t / duration * 100 + '%';
    document.getElementById('scrub').value = t;
    document.getElementById('time').textContent = '0:' + String(Math.floor(t)).padStart(2, '0') + ' / 0:36';
    previous = t; position = t;
    return { time: t, stars: wallet.stars, owned: wallet.owned.slice(), equipped: Object.assign({}, wallet.equipped), scene: Math.min(5, boundaries.slice(0, -1).filter(function (start) { return t >= start; }).length - 1) };
  }
  function resize() {
    var scale = document.documentElement.classList.contains('capture') ? 1 : Math.min(1, innerWidth / 1280);
    var viewport = document.getElementById('viewport'); viewport.style.width = 1280 * scale + 'px'; viewport.style.height = 720 * scale + 'px';
    document.getElementById('film').style.transform = 'scale(' + scale + ')';
  }
  async function frame(now) {
    if (!playing) return;
    await seek((now - playStart) / 1000);
    if (position >= duration) { playing = false; document.getElementById('play').textContent = 'Посмотреть ещё раз'; return; }
    requestAnimationFrame(frame);
  }
  window.filmReady = (async function () {
    if (new URLSearchParams(location.search).has('capture')) document.documentElement.classList.add('capture');
    resize(); window.addEventListener('resize', resize);
    trio('intro-pets'); trio('outro-pets', [{ hat: 'hat-mushroom' }, { hat: 'hat-cap', antenna: 'pixel-ufo', net: 'net-comet' }, { hat: 'hat-arcade' }]);
    emotion = pet(document.getElementById('emotion-pet'), { size: 390, state: 'thinking', cosmetics: { screen: 'screen-raspberry' } });
    var data = { kidName: 'Складыватель', title: 'Прибавили — стало меньше?', slides: [
      { kind: 'wrong', html: '<p>Бипыч думает, что…</p><p>1/2 + 1/3 = 2/5</p>', question: 'Какое правило он использовал?', answerHtml: '<p>Сложил числители и знаменатели.</p>' },
      { kind: 'conflict', html: '<p>Четверть плюс четверть — снова четверть?</p><p>1/4 + 1/4 → 2/8 = 1/4</p>', question: 'Может ли сумма двух одинаковых кусочков остаться прежней?', answerHtml: '<p>Нет. Две четверти — это половина.</p>' },
      { kind: 'fix', html: '<p>Сначала делаем части одинаковыми.</p><p>1/2 = 3/6; 1/3 = 2/6</p>', question: 'Сколько шестых получится вместе?', answerHtml: '<p>3/6 + 2/6 = 5/6.</p>' }
    ] };
    var source = await (await fetch('../../board.html')).text();
    var injection = '<base href="' + new URL('../../', location.href).href + '"><script>var filmLesson=' + JSON.stringify(data).replace(/</g, '\\u003c') + ';var filmGet=Storage.prototype.getItem;Storage.prototype.getItem=function(k){return k==="vektor-board"?JSON.stringify(filmLesson):filmGet.call(this,k);};<\/script>';
    await new Promise(function (resolve) { lesson.onload = resolve; lesson.srcdoc = source.replace('<head>', '<head>' + injection); });
    reset(); await seek(0);
    document.getElementById('play').addEventListener('click', function () {
      playing = !playing; document.getElementById('play').textContent = playing ? 'Пауза' : 'Продолжить';
      if (playing) { if (position >= duration) position = 0; playStart = performance.now() - position * 1000; requestAnimationFrame(frame); }
    });
    document.getElementById('scrub').addEventListener('input', async function (event) { playing = false; document.getElementById('play').textContent = 'Продолжить'; await seek(event.target.value); });
    return true;
  }());
  window.filmSeek = seek;
  window.addEventListener('pagehide', function () { playing = false; pets.forEach(function (p) { p.destroy(); }); }, { once: true });
}());
