(function () {
  'use strict';
  var disposers = new WeakMap();
  var workshopViews = new WeakMap();
  var RANKS = { novice: 'Новичок', tracker: 'Следопыт', catcher: 'Ловец', master: 'Мастер жучков' };
  var STATUSES = { caught: 'Пойман', healing: 'Лечится', beaten: 'Побеждён' };
  var ACHIEVEMENTS = { 'bug-master': 'Мастер жучков', 'topic-master': 'Знаток темы', 'ten-bugs': '10 побеждённых жучков' };
  function known(map, key) { return Object.prototype.hasOwnProperty.call(map, key); }
  function node(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = String(text);
    return el;
  }
  function button(text, action, cls) {
    var b = node('button', cls || 'vc-button', text); b.type = 'button';
    if (action) b.addEventListener('click', action);
    return b;
  }
  function begin(el) {
    if (!el || !el.replaceChildren) throw new TypeError('Нужен DOM-элемент');
    var previous = disposers.get(el); if (previous) previous();
    var pets = [], root = node('section', 'vcollection');
    el.replaceChildren(root);
    disposers.set(el, function () { pets.forEach(function (p) { p.destroy(); }); });
    return { root: root, pets: pets };
  }
  function mascot(el, options, pets) {
    if (!window.VEKTOR_DROBIK) return null;
    var p = window.VEKTOR_DROBIK.mount(el, options); pets.push(p); return p;
  }
  function date(value) {
    if (typeof value !== 'string' && typeof value !== 'number') return '';
    var d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString('ru-RU') : '';
  }
  function renderBugs(el, data) {
    data = data || {};
    var ctx = begin(el), root = ctx.root;
    var bugs = (Array.isArray(data.bugs) ? data.bugs : []).filter(function (b) { return b && typeof b === 'object'; });
    var head = node('header', 'vc-head'), copy = node('div');
    copy.append(node('p', 'vc-eyebrow', 'Маленькие открытия — большие победы'), node('h2', 'vc-title', 'Мои жучки'));
    copy.append(node('p', 'vc-rank', known(RANKS, data.rank) ? RANKS[data.rank] : RANKS.novice));
    var pet = node('div', 'vc-head-pet'); mascot(pet, { size: 104, state: 'proud' }, ctx.pets);
    head.append(copy, pet); root.appendChild(head);
    var stats = node('div', 'vc-stats');
    ['caught', 'healing', 'beaten'].forEach(function (status) {
      var item = node('div', 'vc-stat');
      item.append(node('strong', '', bugs.filter(function (b) { return (known(STATUSES, b.status) ? b.status : 'caught') === status; }).length), node('span', '', STATUSES[status]));
      stats.appendChild(item);
    });
    root.appendChild(stats);
    if (!bugs.length) {
      var empty = node('div', 'vc-empty');
      empty.append(node('h3', '', 'Здесь появятся твои находки'), node('p', '', 'Решай задачи и пробуй объяснять свой ход мысли. Если найдём жучка, разберёмся с ним вместе.'));
      root.appendChild(empty); return;
    }
    var filters = node('div', 'vc-filters'), grid = node('div', 'vc-bug-grid');
    var current = 'all';
    function draw() {
      grid.replaceChildren();
      var shown = bugs.filter(function (b) { return current === 'all' || (known(STATUSES, b.status) ? b.status : 'caught') === current; });
      if (!shown.length) { grid.appendChild(node('p', 'vc-empty-filter', 'Пока здесь никого.')); return; }
      shown.forEach(function (bug) {
        var status = known(STATUSES, bug.status) ? bug.status : 'caught';
        var card = node('article', 'vc-bug-card'); card.dataset.status = status;
        var art = node('div', 'vc-bug-art');
        if (window.VEKTOR_ART) art.innerHTML = window.VEKTOR_ART.bug(bug.key, { size: 112, status: status });
        var body = node('div', 'vc-bug-body');
        body.append(node('span', 'vc-status vc-status-' + status, STATUSES[status]), node('h3', '', bug.kidName || 'Новый жучок'), node('p', 'vc-bug-title', bug.title || 'Узнаём, какое правило запуталось'));
        var found = date(bug.found), beaten = date(bug.beaten);
        if (found) body.appendChild(node('p', 'vc-date', 'Найден ' + found));
        if (status === 'beaten' && beaten) body.appendChild(node('p', 'vc-date', 'Побеждён ' + beaten));
        if (bug.howBeaten) {
          var details = node('details', 'vc-how');
          details.append(node('summary', '', status === 'beaten' ? 'Как я его победил' : 'Что уже заметили'), node('p', '', bug.howBeaten));
          body.appendChild(details);
        }
        card.append(art, body); grid.appendChild(card);
      });
    }
    [['all', 'Все'], ['caught', 'Пойманы'], ['healing', 'Лечатся'], ['beaten', 'Побеждены']].forEach(function (pair) {
      var b = button(pair[1], function () {
        current = pair[0];
        filters.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        draw();
      });
      b.dataset.filter = pair[0]; b.setAttribute('aria-pressed', String(pair[0] === 'all')); filters.appendChild(b);
    });
    root.append(filters, grid); draw();
  }
  function renderWorkshop(el, data) {
    data = data || {};
    var ctx = begin(el), root = ctx.root, lib = window.VEKTOR_DROBIK;
    if (!lib) {
      root.append(node('h2', 'vc-title', 'Мастерская'), node('p', '', 'Персонаж пока загружается. Попробуй открыть мастерскую чуть позже.'));
      return;
    }
    var items = lib.COSMETICS, ids = new Set(items.map(function (c) { return c.id; }));
    var owned = new Set((Array.isArray(data.owned) ? data.owned : []).filter(function (id) { return ids.has(id); }));
    var equipped = {};
    items.forEach(function (item) { if (data.equipped && data.equipped[item.slot] === item.id && owned.has(item.id)) equipped[item.slot] = item.id; });
    var view = workshopViews.get(el) || { slot: 'hat', ownedOnly: false, outfit: Object.assign({}, equipped), equipped: {} };
    ['screen', 'antenna', 'hat', 'net'].forEach(function (slot) {
      if (view.equipped[slot] !== equipped[slot]) {
        if (equipped[slot]) view.outfit[slot] = equipped[slot]; else delete view.outfit[slot];
      }
    });
    view.equipped = Object.assign({}, equipped);
    workshopViews.set(el, view);
    var stars = Number.isFinite(Number(data.stars)) ? Math.max(0, Math.floor(Number(data.stars))) : 0;
    var head = node('header', 'vc-head'), copy = node('div');
    copy.append(node('p', 'vc-eyebrow', 'Твой напарник — твой стиль'), node('h2', 'vc-title', 'Гардеробная Бипыча'), node('p', 'vc-subtitle', 'Примерь. Выбери. Забери в свои вещи.'));
    var balance = node('div', 'vc-balance', '★ ' + stars); balance.setAttribute('aria-label', stars + ' звёзд');
    head.append(copy, balance); root.appendChild(head);
    var layout = node('div', 'vc-shop-layout'), aside = node('aside', 'vc-preview');
    var stage = node('div', 'vc-preview-stage');
    var preview = mascot(stage, { size: 208, state: 'happy', cosmetics: view.outfit, charge: { done: 3, goal: 5 } }, ctx.pets);
    var previewTitle = node('p', 'vc-preview-title', 'Твой Бипыч');
    var paletteButtons = node('div', 'vc-preview-colors'); paletteButtons.setAttribute('role', 'group'); paletteButtons.setAttribute('aria-label', 'Цвет Бипыча для примерки');
    items.filter(function (item) { return item.slot === 'screen'; }).forEach(function (item) {
      var b = button(item.name.replace(' Бипыч', ''), function () { tryOn(item); });
      b.dataset.previewColor = item.id; paletteButtons.appendChild(b);
    });
    var reset = button('Вернуть свой образ', function () { view.outfit = Object.assign({}, equipped); updatePreview('Твой Бипыч'); });
    reset.dataset.previewReset = '';
    aside.append(stage, previewTitle, paletteButtons, reset, node('p', 'vc-hint', 'Выбирай цвет и сочетай аксессуары. Примерка бесплатна; твой образ сохранится после «Надеть».'));
    var store = node('div', 'vc-store'), filters = node('div', 'vc-filters'), grid = node('div', 'vc-item-grid');
    var message = node('p', 'vc-message'); message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
    var shownSlot = view.slot, cardPets = [];
    var viewButtons = node('div', 'vc-shop-views');
    var fullDispose = disposers.get(el);
    disposers.set(el, function () { cardPets.forEach(function (p) { p.destroy(); }); fullDispose(); });
    function updatePreview(title) {
      preview.setCosmetics(view.outfit);
      previewTitle.textContent = title;
      paletteButtons.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.previewColor === (view.outfit.screen || 'screen-turquoise'))); });
      grid.querySelectorAll('[data-item]').forEach(function (card, i) {
        var item = items.find(function (c) { return c.id === card.dataset.item; });
        cardPets[i].setCosmetics(Object.assign({}, view.outfit, Object.fromEntries([[item.slot, item.id]])));
      });
    }
    function tryOn(item) {
      view.outfit[item.slot] = item.id;
      updatePreview('Примеряем: ' + item.name);
    }
    async function act(b, callback, args) {
      if (b.disabled || typeof callback !== 'function') return;
      var itemId = b.closest('[data-item]').dataset.item;
      b.disabled = true; message.textContent = '';
      try { await callback.apply(null, args); }
      catch (error) { if (b.isConnected) message.textContent = error && error.message ? String(error.message).slice(0, 180) : 'Не получилось сохранить. Попробуй ещё раз.'; }
      finally {
        if (b.isConnected) b.disabled = false;
        else {
          var card = Array.from(el.querySelectorAll('[data-item]')).find(function (c) { return c.dataset.item === itemId; });
          var action = card && (card.querySelector('[data-equip]:not(:disabled)') || card.querySelector('[data-buy]:not(:disabled)') || card.querySelector('[data-try]'));
          if (action) action.focus({ preventScroll: true });
        }
      }
    }
    function draw() {
      cardPets.forEach(function (p) { p.destroy(); }); cardPets = [];
      grid.replaceChildren();
      items.filter(function (c) { return (shownSlot === 'special' ? !!c.description : c.slot === shownSlot) && (!view.ownedOnly || owned.has(c.id)); }).forEach(function (item) {
        var mine = owned.has(item.id), active = equipped[item.slot] === item.id;
        var card = node('article', 'vc-shop-item'); card.dataset.item = item.id;
        var art = node('div', 'vc-item-art');
        mascot(art, { size: 96, cosmetics: Object.assign({}, view.outfit, Object.fromEntries([[item.slot, item.id]])) }, cardPets);
        card.append(art, node('h3', '', item.name), node('p', 'vc-price', mine ? (active ? 'Сейчас надето' : 'Уже твоё') : item.unlock ? 'Награда' : item.price ? '★ ' + item.price : 'Бесплатно'));
        if (item.description) {
          card.append(node('span', 'vc-item-tag', item.unlock ? 'Трофей' : 'Особенная вещь'), node('p', 'vc-item-description', item.description));
        }
        var tryButton = button('Примерить', function () { tryOn(item); }, 'vc-button vc-button-quiet');
        tryButton.dataset.try = item.id; card.appendChild(tryButton);
        if (mine) {
          var equip = button(active ? 'Надето' : 'Надеть', function () { act(equip, data.onEquip, [item.slot, item.id]); });
          equip.dataset.equip = item.id; equip.disabled = active || typeof data.onEquip !== 'function'; card.appendChild(equip);
        } else if (item.unlock) {
          card.appendChild(node('p', 'vc-unlock', 'За достижение «' + (ACHIEVEMENTS[item.unlock] || 'Новая находка') + '»'));
        } else {
          var buy = button(item.price > stars ? 'Не хватает ' + (item.price - stars) + ' ★' : item.price ? 'Купить за ' + item.price + ' ★' : 'Получить', function () { act(buy, data.onBuy, [item.id]); });
          buy.dataset.buy = item.id; buy.disabled = item.price > stars || typeof data.onBuy !== 'function'; card.appendChild(buy);
        }
        grid.appendChild(card);
      });
      if (!grid.children.length) grid.appendChild(node('p', 'vc-empty-filter', 'Пока здесь нет твоих вещей. Загляни в магазин и выбери что-нибудь по душе.'));
    }
    [[false, 'Магазин'], [true, 'Мои вещи']].forEach(function (pair) {
      var b = button(pair[1], function () {
        view.ownedOnly = pair[0];
        viewButtons.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        draw();
      });
      b.dataset.shopView = pair[0] ? 'owned' : 'store';
      b.setAttribute('aria-pressed', String(view.ownedOnly === pair[0]));
      viewButtons.appendChild(b);
    });
    [['special', 'Особенные'], ['screen', 'Цвета'], ['antenna', 'Пиксели'], ['hat', 'Шапки'], ['net', 'Сачки']].forEach(function (pair) {
      var b = button(pair[1], function () {
        shownSlot = pair[0]; view.slot = pair[0]; filters.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); draw();
      });
      b.dataset.slot = pair[0]; b.setAttribute('aria-pressed', String(shownSlot === pair[0])); filters.appendChild(b);
    });
    store.append(viewButtons, filters, message, grid); layout.append(aside, store); root.appendChild(layout); draw();
    updatePreview(['screen', 'antenna', 'hat', 'net'].every(function (slot) { return view.outfit[slot] === equipped[slot]; }) ? 'Твой Бипыч' : 'Примеряем образ');
  }
  window.VEKTOR_COLLECTION = Object.freeze({ renderBugs: renderBugs, renderWorkshop: renderWorkshop });
}());
