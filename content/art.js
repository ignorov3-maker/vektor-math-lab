/* Original local SVG art. No assets, network calls, or framework dependencies. */
(function () {
  'use strict';
  var CATALOG = {
    'concept:flipped': ['Перевёртыш', 'flipped'],
    'concept:took-eaten': ['Перепутайка', 'eaten'],
    'concept:unequal-parts': ['Криворез', 'unequal'],
    'reduce:not-fully-reduced': ['Недорез', 'unfinished'],
    'reduce:only-one-part': ['Однобокий', 'one-side'],
    'reduce:subtract-instead': ['Вычитатель', 'minus'],
    'compare:bigger-denominator-bigger': ['Знаменатель-хвастун', 'big-bottom'],
    'compare:compare-numerators-only': ['Одноглазик', 'one-eye'],
    'add-same:add-denominators': ['Складыватель', 'plus'],
    'add-diff:add-denominators': ['Складыватель', 'plus'],
    'add-same:subtract-denominators': ['Нулевик', 'zero'],
    'add-diff:forgot-scale-numerators': ['Полупереводчик', 'scale'],
    'mixed:add-whole-to-numerator': ['Прилипала', 'sticky'],
    'mixed:multiply-whole-numerator': ['Умножала', 'times'],
    'mult:cross-multiply': ['Крестоносец', 'cross'],
    'mult:multiply-both': ['Двойник-умножатель', 'double'],
    'div:multiply-instead-of-divide': ['Непереворот', 'straight'],
    'div:flip-first': ['Переворот не того', 'wrong-flip'],
    'part-of:flip-fraction': ['Вывертень', 'turn'],
    'part-of:only-one-step': ['Полдороги', 'halfway'],
    'part-of:part-instead-of-whole': ['Путаник', 'puzzle']
  };
  var STATUS = { caught: 'пойман', healing: 'лечится', beaten: 'побеждён' };
  var INTERESTS = {
    football: 'Футбол', games: 'Игры', animals: 'Животные', space: 'Космос',
    cooking: 'Кулинария', music: 'Музыка', drawing: 'Рисование', cars: 'Машины',
    dance: 'Танцы', robots: 'Роботы', nature: 'Природа', sport: 'Спорт'
  };
  function size(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? Math.max(16, Math.min(1024, n)) : fallback;
  }
  function rect(x, y, w, h, fill, extra) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>';
  }
  function path(d, fill, extra) {
    return '<path d="' + d + '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>';
  }
  function svg(n, viewBox, label, content) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + n + '" height="' + n +
      '" viewBox="' + viewBox + '" role="img" aria-label="' + label + '"><title>' + label + '</title>' + content + '</svg>';
  }
  var INK = '#57364D', CORAL = '#EC8B91', LIGHT = '#FFE1B8', MINT = '#92D5BF';
  function feature(type) {
    var dark = INK, pale = LIGHT;
    var features = {
      flipped: path('M54 70H74V76H68V88H60V76H54Z', pale),
      eaten: path('M48 68H62V92H48ZM68 68H82V74H76V80H82V86H76V92H68Z', pale),
      unequal: path('M46 68H58V92H46ZM64 68H84V92H64Z', pale) + rect(60, 68, 2, 24, dark),
      unfinished: '<circle cx="64" cy="80" r="14" fill="none" stroke="' + pale + '" stroke-width="4"/>' + path('M62 70H66V90H62ZM54 78H74V82H54Z', dark),
      'one-side': path('M44 68H62V94H44Z', pale) + path('M66 72H82V78H66Z', '#D36C81'),
      minus: rect(48, 77, 32, 7, pale),
      'big-bottom': path('M56 67H72V73H56ZM46 79H82V94H46Z', pale) + rect(56, 83, 16, 5, dark),
      'one-eye': path('M54 72H74V88H54Z', pale) + rect(60, 76, 8, 8, dark),
      plus: path('M60 66H68V76H80V84H68V94H60V84H48V76H60Z', pale),
      zero: '<ellipse cx="64" cy="80" rx="11" ry="15" fill="none" stroke="' + pale + '" stroke-width="6"/>',
      scale: rect(56, 68, 16, 5, pale) + rect(46, 78, 36, 4, dark) + rect(44, 87, 40, 7, pale),
      sticky: rect(46, 68, 14, 14, pale) + rect(60, 76, 14, 14, pale) + rect(74, 68, 10, 10, MINT),
      times: path('M52 68L64 78L76 68L82 74L70 84L80 94L74 98L64 88L52 98L46 92L58 84L46 74Z', pale),
      cross: path('M48 68L80 92M80 68L48 92', 'none', 'stroke="' + pale + '" stroke-width="6" stroke-linecap="round"') + rect(60, 77, 8, 8, dark),
      double: '<circle cx="54" cy="81" r="11" fill="' + pale + '"/><circle cx="74" cy="81" r="11" fill="' + MINT + '"/>' + rect(62, 72, 4, 18, dark),
      straight: path('M60 94V76H52L64 64L76 76H68V94Z', pale),
      'wrong-flip': path('M48 94V72H42L54 60L66 72H58V94ZM72 68H80V94H72Z', pale),
      turn: path('M46 76V68H70V62L84 74L70 86V80H54V92H46Z', pale),
      halfway: path('M44 90V82H52V74H60V66H68V74H60V82H52V90Z', pale) + rect(74, 66, 10, 4, dark),
      puzzle: path('M46 68H60V74H68V68H82V80H76V88H82V94H66V88H58V94H46V82H52V76H46Z', pale),
      generic: rect(58, 70, 12, 12, pale) + rect(60, 88, 8, 6, pale)
    };
    return features[type] || features.generic;
  }
  function creature(type) {
    var body = type === 'big-bottom'
      ? path('M44 40H84L90 60L96 90L84 106H44L32 90L38 60Z', CORAL, 'stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"')
      : '<ellipse cx="64" cy="72" rx="31" ry="35" fill="' + CORAL + '" stroke="' + INK + '" stroke-width="4"/>';
    var eyes = type === 'one-eye'
      ? '<ellipse cx="64" cy="53" rx="9" ry="10" fill="#FFF9E9"/><circle cx="66" cy="54" r="4" fill="' + INK + '"/>'
      : '<g fill="#FFF9E9"><ellipse cx="52" cy="53" rx="7" ry="8"/><ellipse cx="76" cy="53" rx="7" ry="8"/></g><g fill="' + INK + '"><circle cx="54" cy="54" r="3"/><circle cx="78" cy="54" r="3"/></g>';
    var limbs = path('M38 60L26 54M35 76L21 78M39 92L28 102M90 60L102 54M93 76L107 78M89 92L100 102M51 40L45 27M77 40L83 27', 'none', 'stroke="' + INK + '" stroke-width="4" stroke-linecap="round"') +
      '<g fill="' + LIGHT + '" stroke="' + INK + '" stroke-width="3"><circle cx="44" cy="25" r="4"/><circle cx="84" cy="25" r="4"/></g>';
    return '<g' + (type === 'flipped' ? ' transform="rotate(180 64 67)"' : '') + '>' + limbs + body + eyes + feature(type) + '</g>';
  }
  function bug(key, options) {
    options = options || {};
    var entry = Object.prototype.hasOwnProperty.call(CATALOG, key) ? CATALOG[key] : ['Новый жучок', 'generic'];
    var status = Object.prototype.hasOwnProperty.call(STATUS, options.status) ? options.status : 'caught';
    var back = '', front = '';
    if (status === 'caught') {
      back = '<rect x="10" y="14" width="108" height="104" rx="36" fill="#F6EEDB" fill-opacity=".35" stroke="#A38C72" stroke-width="3"/>';
      front = path('M20 30L108 106M12 50L92 118M36 16L118 88M108 30L20 106M118 50L36 118M92 16L10 88', 'none', 'stroke="#A38C72" stroke-opacity=".36" stroke-width="2"') +
        path('M105 112L117 125', 'none', 'stroke="#8B735B" stroke-width="5" stroke-linecap="round"');
    } else if (status === 'healing') {
      back = '<rect x="14" y="20" width="100" height="100" rx="18" fill="#E5F4F3" fill-opacity=".75" stroke="#619C9B" stroke-width="3"/>' +
        rect(24, 10, 80, 14, '#8CB7A5', 'rx="4"');
      front = '<path d="M20 40V98" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>' +
        '<g transform="rotate(-30 94 92)"><rect x="76" y="84" width="36" height="16" rx="4" fill="#FFE2AE" stroke="#A4804A" stroke-width="2"/>' +
        rect(90, 85, 8, 14, '#EAC18B') + '<g fill="#A4804A"><circle cx="82" cy="90" r="1"/><circle cx="106" cy="94" r="1"/></g></g>';
    } else {
      back = path('M34 60C4 20 0 74 34 82ZM94 60C124 20 128 74 94 82Z', '#D1EEE2', 'stroke="#79B99D" stroke-width="2"');
      front = path('M103 64V16M104 18H124L118 27L124 36H104', 'none', 'stroke="#4B8B6D" stroke-width="3" stroke-linejoin="round"') +
        path('M106 20H120L114 27L120 33H106Z', '#FFE58A') +
        path('M110 26L113 29L118 23', 'none', 'stroke="#43775F" stroke-width="2" stroke-linecap="round"');
    }
    return svg(size(options.size, 64), '0 0 128 128', entry[0] + ' — ' + STATUS[status], back + creature(entry[1]) + front);
  }
  function interest(id, options) {
    options = options || {};
    var title = Object.prototype.hasOwnProperty.call(INTERESTS, id) ? INTERESTS[id] : 'Интерес';
    var ink = '#245D57', pale = '#FFF0B4', pink = '#EE97A7', mint = '#9DDCC8';
    var line = 'fill="none" stroke="' + ink + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
    var icons = {
      football: '<circle cx="20" cy="20" r="14" fill="' + pale + '" stroke="' + ink + '" stroke-width="2.4"/>' + path('M20 12L27 17L24 25H16L13 17Z', ink) + path('M20 6V12M6 18L13 17M10 31L16 25M30 31L24 25M34 18L27 17', 'none', 'stroke="' + ink + '" stroke-width="2.4"'),
      games: '<path d="M12 12H28L34 28Q34 33 29 31L24 27H16L11 31Q6 33 6 28Z" fill="' + mint + '" stroke="' + ink + '" stroke-width="2.4"/><path d="M12 21H20M16 17V25" ' + line + '/><circle cx="26" cy="19" r="2" fill="' + ink + '"/><circle cx="29" cy="24" r="2" fill="' + pink + '"/>',
      animals: '<g fill="' + pink + '" stroke="' + ink + '" stroke-width="2"><ellipse cx="20" cy="26" rx="10" ry="8"/><ellipse cx="9" cy="16" rx="4" ry="5"/><ellipse cx="18" cy="11" rx="4" ry="5"/><ellipse cx="28" cy="13" rx="4" ry="5"/><ellipse cx="33" cy="22" rx="3" ry="4"/></g>',
      space: '<path d="M14 27C10 14 20 5 31 5C33 16 25 29 14 27Z" fill="' + mint + '" stroke="' + ink + '" stroke-width="2.4"/><circle cx="24" cy="14" r="4" fill="' + pale + '" stroke="' + ink + '" stroke-width="2"/><path d="M13 21L6 24L6 31L15 27M20 27L17 35H25L29 24" fill="' + pink + '" stroke="' + ink + '" stroke-width="2"/><path d="M11 29L6 35" ' + line + '/>',
      cooking: '<path d="M10 20C1 15 8 4 15 9C18 2 28 4 28 10C37 7 40 21 30 22V34H10Z" fill="' + pale + '" stroke="' + ink + '" stroke-width="2.4"/><path d="M11 28H30M17 16V22M24 16V22" ' + line + '/>',
      music: '<path d="M15 28V10L31 6V24" ' + line + '/><path d="M15 16L31 12" ' + line + '/><ellipse cx="10" cy="29" rx="6" ry="5" fill="' + pink + '" stroke="' + ink + '" stroke-width="2"/><ellipse cx="26" cy="26" rx="6" ry="5" fill="' + mint + '" stroke="' + ink + '" stroke-width="2"/>',
      drawing: '<path d="M8 28L25 7L33 14L16 34L6 36Z" fill="' + pale + '" stroke="' + ink + '" stroke-width="2.4"/><path d="M23 10L30 17M9 27L16 33M7 35L8 31" ' + line + '/><path d="M26 7L29 4L36 10L33 14Z" fill="' + pink + '" stroke="' + ink + '" stroke-width="2"/>',
      cars: '<path d="M6 20L10 10H29L34 20V31H6Z" fill="' + mint + '" stroke="' + ink + '" stroke-width="2.4"/><path d="M9 20H31M20 11V19" ' + line + '/><rect x="7" y="30" width="6" height="6" rx="2" fill="' + ink + '"/><rect x="27" y="30" width="6" height="6" rx="2" fill="' + ink + '"/><circle cx="12" cy="25" r="2" fill="' + pale + '"/><circle cx="28" cy="25" r="2" fill="' + pale + '"/>',
      dance: '<circle cx="23" cy="7" r="4" fill="' + pink + '" stroke="' + ink + '" stroke-width="2"/><path d="M22 13L18 23L27 28L32 36M18 23L11 32L4 31M20 17L11 15L7 8M21 16L30 18L36 12" ' + line + '/>',
      robots: '<rect x="7" y="12" width="26" height="22" rx="5" fill="' + mint + '" stroke="' + ink + '" stroke-width="2.4"/><path d="M20 12V7M3 20V28M37 20V28" ' + line + '/><rect x="12" y="19" width="5" height="5" fill="' + ink + '"/><rect x="23" y="19" width="5" height="5" fill="' + ink + '"/><path d="M14 29H26" ' + line + '/><circle cx="20" cy="5" r="2" fill="' + pink + '"/>',
      nature: '<path d="M9 29C3 11 19 5 34 6C34 24 22 36 9 29Z" fill="' + mint + '" stroke="' + ink + '" stroke-width="2.4"/><path d="M6 36L27 14M14 27L13 18M20 21L28 21" ' + line + '/>',
      sport: '<path d="M8 16H32M12 8V32M6 12V28M28 8V32M34 12V28" fill="none" stroke="' + ink + '" stroke-width="4" stroke-linecap="round"/><rect x="14" y="17" width="12" height="6" fill="' + pink + '"/>'
    };
    return svg(size(options.size, 32), '0 0 40 40', title, Object.prototype.hasOwnProperty.call(icons, id) ? icons[id] : '<circle cx="20" cy="20" r="12" fill="' + mint + '" stroke="' + ink + '" stroke-width="2.4"/>');
  }
  window.VEKTOR_ART = Object.freeze({ bug: bug, interest: interest });
}());
