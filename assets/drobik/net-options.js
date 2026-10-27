(function () {
  'use strict';
  var lib = window.VEKTOR_DROBIK, NS = 'http://www.w3.org/2000/svg', serial = 0;
  var color = 'screen-turquoise', selected = 'diamond', pets = [], framePets = [];
  var variants = [
    { id: 'diamond', name: 'Крупные ромбы', description: 'Редкая диагональная сетка. Хорошо видна даже на маленьком сачке.' },
    { id: 'fine', name: 'Тонкие ромбы', description: 'Более частое плетение. Лёгкая сетка привычного сачка для бабочек.' },
    { id: 'square', name: 'Прямая сетка', description: 'Ровные небольшие ячейки от края до края. Самый спокойный вариант.' },
    { id: 'honey', name: 'Крупные соты', description: 'Ступенчатые ячейки по всей площади. Более необычный игровой вариант.' }
  ];
  var frames = ['net-classic', 'net-square', 'net-honey', 'net-orbit', 'net-comet'];
  function node(tag, cls, text) {
    var el = document.createElement(tag); if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text; return el;
  }
  function svgNode(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    return el;
  }
  function mesh(id) {
    var d = '', x, y;
    if (id === 'square') {
      for (x = 90; x <= 144; x += 6) d += 'M' + x + ' 24V76';
      for (y = 24; y <= 76; y += 6) d += 'M90 ' + y + 'H144';
    } else if (id === 'honey') {
      for (var col = 0; col < 10; col++) {
        x = 86 + col * 6;
        for (y = 20 + (col % 2 ? 4 : 0); y < 78; y += 8) {
          d += 'M' + (x + 2) + ' ' + y + 'H' + (x + 6) + 'V' + (y + 2) + 'H' + (x + 8) + 'V' + (y + 6) +
            'H' + (x + 6) + 'V' + (y + 8) + 'H' + (x + 2) + 'V' + (y + 6) + 'H' + x + 'V' + (y + 2) + 'H' + (x + 2) + 'Z';
        }
      }
    } else {
      var step = 1, spacing = id === 'fine' ? 7 : 12;
      [-1, 1].forEach(function (direction) {
        for (var start = 30; start < 205; start += spacing) {
          x = start; d += 'M' + x + ' 22';
          for (y = 22; y < 78; y += step) { x += direction * step; d += 'H' + x + 'V' + (y + step); }
        }
      });
    }
    return d;
  }
  function applyMesh(host, id) {
    var svg = host.querySelector('svg'), rim = svg.querySelector('.bipych-net-rim');
    var old = svg.querySelector('.bipych-net-mesh'), d = rim.getAttribute('d');
    var clipId = 'net-choice-' + (++serial), defs = svgNode('defs', {});
    var clip = svgNode('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' });
    clip.appendChild(svgNode('path', { d: d.slice(d.lastIndexOf('M')) })); defs.appendChild(clip); svg.prepend(defs);
    var grid = svgNode('path', {
      d: mesh(id), fill: 'none', stroke: '#527D70', 'stroke-width': id === 'fine' ? '.65' : '.85',
      opacity: '.62', 'clip-path': 'url(#' + clipId + ')', class: 'bipych-net-mesh', 'data-mesh-option': id
    });
    old.replaceWith(grid);
  }
  function makePet(host, id, net, size, group) {
    var pet = lib.mount(host, { size: size, state: 'idle', cosmetics: { screen: color, net: net } });
    (group || pets).push(pet); applyMesh(host, id); return host.querySelector('svg');
  }
  function drawFrames() {
    var holder = document.getElementById('frames');
    framePets.forEach(function (p) { p.destroy(); }); framePets = [];
    holder.replaceChildren();
    frames.forEach(function (id) {
      var card = node('article', 'frame'), host = node('div');
      makePet(host, selected, id, 168, framePets);
      card.append(host, node('h3', '', lib.COSMETICS.find(function (c) { return c.id === id; }).name));
      holder.appendChild(card);
    });
    document.getElementById('family-description').textContent = 'Сейчас сравниваем: ' + variants.find(function (v) { return v.id === selected; }).name.toLowerCase() + '. Можно выбрать другой вариант выше.';
  }
  function choose(id) {
    selected = id;
    document.querySelectorAll('[data-variant]').forEach(function (card) {
      var active = card.dataset.variant === id; card.dataset.selected = String(active);
      card.querySelector('button').setAttribute('aria-pressed', String(active));
      card.querySelector('button').textContent = active ? 'Сравниваем на разных рамках' : 'Сравнить на разных рамках';
    });
    drawFrames();
  }
  function draw() {
    pets.forEach(function (p) { p.destroy(); }); pets = [];
    var holder = document.getElementById('options'); holder.replaceChildren();
    variants.forEach(function (variant, i) {
      var card = node('article', 'option'); card.dataset.variant = variant.id;
      card.append(node('p', 'option-number', 'ВАРИАНТ 0' + (i + 1)), node('h2', '', variant.name), node('p', 'option-description', variant.description));
      var host = node('div', 'option-pet'), svg = makePet(host, variant.id, 'net-classic', 224);
      var detail = node('div', 'detail'), crop = svg.cloneNode(true);
      // Clone the clip with a distinct id so every enlarged preview stays independent.
      var clip = crop.querySelector('clipPath'), clipId = 'net-choice-' + (++serial); clip.id = clipId;
      crop.querySelector('.bipych-net-mesh').setAttribute('clip-path', 'url(#' + clipId + ')');
      crop.querySelector('title').remove(); crop.setAttribute('viewBox', '97 27 40 44'); crop.removeAttribute('class');
      var net = crop.querySelector('.bipych-net'); net.remove();
      Array.from(crop.children).forEach(function (el) { if (el.tagName.toLowerCase() !== 'defs') el.remove(); });
      crop.appendChild(net); detail.append(crop, node('span', '', 'Сетка крупным планом'));
      var b = node('button', '', 'Сравнить на разных рамках'); b.type = 'button'; b.addEventListener('click', function () { choose(variant.id); });
      card.append(host, detail, b); holder.appendChild(card);
    });
    choose(selected);
  }
  document.querySelectorAll('[data-color]').forEach(function (b) {
    b.addEventListener('click', function () {
      color = b.dataset.color;
      document.querySelectorAll('[data-color]').forEach(function (other) { other.setAttribute('aria-pressed', String(other === b)); });
      draw();
    });
  });
  draw();
  window.addEventListener('pagehide', function () { pets.concat(framePets).forEach(function (p) { p.destroy(); }); }, { once: true });
}());
