/* Бипыч. Historical VEKTOR_DROBIK name preserves the integration contract. */
(function () {
  'use strict';
  var STATES = ['idle', 'happy', 'thinking', 'confused', 'proud', 'shy', 'catching', 'celebrate', 'sleep'];
  var LABELS = ['спокоен', 'радуется', 'думает', 'удивлён', 'гордится', 'смущён', 'ловит жучка', 'празднует', 'спит'];
  var PALETTES = {
    'screen-turquoise': ['#155766', '#6AD3CE', '#B4F0E6', '#41B6B6', '#F483AD', '#155766'],
    'screen-raspberry': ['#622348', '#EE6B8B', '#FFA4BA', '#CE4B74', '#FFE6AD', '#622348'],
    'screen-black': ['#172128', '#29343A', '#526168', '#202B31', '#3EBC8C', '#ACF4D0']
  };
  var COSMETICS = [
    ['screen-turquoise', 'screen', 'Бирюзовый Бипыч', 0],
    ['screen-raspberry', 'screen', 'Малиновый Бипыч', 0],
    ['screen-black', 'screen', 'Чёрный Бипыч', 0],
    ['pixel-sun', 'antenna', 'Солнечный пиксель', 20],
    ['pixel-mint', 'antenna', 'Мятный пиксель', 20],
    ['pixel-lilac', 'antenna', 'Сиреневый пиксель', 25],
    ['pixel-coral', 'antenna', 'Коралловый пиксель', 25],
    ['pixel-ice', 'antenna', 'Ледяной пиксель', 30],
    ['pixel-double', 'antenna', 'Пиксель-близнец', 50],
    ['pixel-star', 'antenna', 'Звёздный пиксель', 0, 'bug-master'],
    ['hat-cap', 'hat', 'Кепка исследователя', 35],
    ['hat-beanie', 'hat', 'Шапка бип-бип', 35],
    ['hat-bucket', 'hat', 'Панама', 40],
    ['hat-crown', 'hat', 'Корона находок', 0, 'bug-master'],
    ['hat-bow', 'hat', 'Бант', 30],
    ['hat-headphones', 'hat', 'Наушники', 55],
    ['hat-beret', 'hat', 'Берет художника', 45],
    ['hat-leaf', 'hat', 'Листик на удачу', 30],
    ['hat-graduate', 'hat', 'Шапочка выпускника', 0, 'topic-master'],
    ['hat-captain', 'hat', 'Капитанская фуражка', 65],
    ['net-classic', 'net', 'Первый сачок', 20],
    ['net-mint', 'net', 'Мятный сачок', 30],
    ['net-pink', 'net', 'Розовый сачок', 30],
    ['net-blue', 'net', 'Небесный сачок', 35],
    ['net-gold', 'net', 'Золотой сачок', 0, 'ten-bugs'],
    ['net-lilac', 'net', 'Сиреневый сачок', 35],
    ['net-square', 'net', 'Пиксельный сачок', 45],
    ['net-leaf', 'net', 'Лесной сачок', 40],
    ['net-spark', 'net', 'Искристый сачок', 55],
    ['net-master', 'net', 'Сачок мастера', 0, 'bug-master'],
    ['pixel-comet', 'antenna', 'Комета на поводке', 85, null, 'Маленькая комета с мерцающим пиксельным хвостом.'],
    ['pixel-ufo', 'antenna', 'НЛО-попутчик', 100, null, 'Летает рядом и сканирует мир мятным лучом.'],
    ['hat-wizard', 'hat', 'Шляпа пиксельного мага', 0, 'topic-master', 'Звезда на кончике шляпы тихонько колдует.'],
    ['hat-mushroom', 'hat', 'Мухомор-путешественник', 75, null, 'Лесная шляпка с крошечным светлячком.'],
    ['hat-arcade', 'hat', 'Аркадный шлем', 110, null, 'На макушке играет собственный пиксельный эквалайзер.'],
    ['net-orbit', 'net', 'Орбитальный сачок', 95, null, 'Ромбовидная рамка и крошечный спутник на орбите.'],
    ['net-honey', 'net', 'Соты охотника', 80, null, 'Золотистая рамка, семь открытых сот и деревянная ручка.'],
    ['net-comet', 'net', 'Ловец комет', 0, 'ten-bugs', 'Сачок-звезда со следом из мерцающей звёздной пыли.']
  ].map(function (c) {
    return Object.freeze({ id: c[0], slot: c[1], name: c[2], price: c[3], unlock: c[4] || null, description: c[5] || '' });
  });
  Object.freeze(STATES);
  Object.freeze(COSMETICS);
  var items = Object.create(null);
  COSMETICS.forEach(function (c) { items[c.id] = c; });
  var PIXELS = {
    'pixel-sun': '#FFD46F', 'pixel-mint': '#96EBD1', 'pixel-lilac': '#C5A0F2',
    'pixel-coral': '#FF927F', 'pixel-ice': '#B5E7FF', 'pixel-double': '#F8B4D9', 'pixel-star': '#FFE58A'
  };
  var NETS = ['#C8A366', '#6AD3B7', '#F483AD', '#82C5F0', '#E9C24A', '#B29CE8', '#A8C6DD', '#8DBA77', '#FFE58A', '#EAB1E5', '#AFA0F3', '#E9AD46', '#A9E7F4'];
  var OUTLINE = 'M42 34H92V38H100V42H108V50H112V90H108V98H100V106H36V102H28V94H24V50H28V42H34V38H42Z';
  var INSIDE = 'M42 38H90V42H98V46H104V52H108V88H104V96H98V102H38V98H32V92H28V52H32V44H38V42H42Z';
  var serial = 0;

  function shape(tag, attrs, children) {
    return '<' + tag + ' ' + attrs + '>' + (children || '') + '</' + tag + '>';
  }
  function rect(x, y, w, h, fill, cls) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"' +
      (cls ? ' class="' + cls + '"' : '') + '/>';
  }
  function path(d, fill, cls) {
    return '<path d="' + d + '" fill="' + fill + '"' + (cls ? ' class="' + cls + '"' : '') + '/>';
  }
  function hat(id, p) {
    var ink = p[0], cream = '#FFF0CB', accent = p[4];
    var hats = {
      'hat-cap': path('M38 30H48V22H76V26H92V34H108V38H38Z', accent) + rect(48, 26, 28, 6, cream),
      'hat-beanie': path('M40 34V24H46V18H84V24H92V34Z', '#B39BE3') + rect(36, 30, 60, 8, ink) + rect(60, 10, 12, 8, accent),
      'hat-bucket': path('M44 16H84V20H88V28H92V32H100V40H32V32H36V28H40V20H44Z', ink) +
        path('M44 20H84V28H88V32H92V36H40V32H44Z', '#83B9DC') + rect(44, 28, 40, 4, cream),
      'hat-crown': path('M40 22H48V28H56V18H64V28H72V18H80V28H88V22H96V38H40Z', '#F2CC63') + rect(60, 30, 8, 4, accent),
      'hat-bow': path('M42 24H54V28H66V24H80V40H66V36H54V40H42Z', accent) + rect(56, 28, 8, 8, ink),
      'hat-headphones': path('M24 58V32H32V24H100V32H112V60H104V36H98V32H38V36H32V58Z', ink) + rect(20, 50, 12, 22, accent) + rect(104, 50, 12, 22, accent),
      'hat-beret': path('M34 30H42V22H54V18H88V22H98V32H90V38H42V34H34Z', '#D26C73') + rect(64, 12, 8, 8, ink),
      'hat-leaf': path('M60 40V24H68V16H76V12H96V24H88V28H80V32H72V40Z', ink) +
        path('M64 32V24H72V20H80V16H92V20H84V24H76V28H68V32Z', '#8DBB79'),
      'hat-graduate': rect(48, 30, 40, 10, ink) +
        path('M64 8H72V12H84V16H96V20H108V28H96V32H84V36H72V40H64V36H52V32H40V28H28V20H40V16H52V12H64Z', ink) +
        path('M64 12H72V16H84V20H96V24H84V28H72V32H64V28H52V24H40V20H52V16H64Z', '#567B7D') +
        rect(92, 28, 4, 16, '#EDBF50') + rect(88, 44, 8, 8, '#EDBF50'),
      'hat-captain': path('M40 12H92V16H100V28H96V36H88V40H40V36H32V20H36V16H40Z', ink) +
        path('M40 20H44V16H88V20H96V26H40Z', cream) + rect(40, 28, 52, 8, ink) +
        path('M60 20H72V24H68V28H64V24H60Z', '#E7BC4C'),
      'hat-wizard': path('M52 4H64V12H72V20H80V28H88V32H100V40H32V32H44V24H48V12H52Z', ink) +
        path('M56 8H60V16H68V24H76V32H48V24H52V16H56Z', '#8B78D4') + rect(44, 32, 44, 4, '#E9C46C') +
        '<g class="bipych-magic-star">' + path('M54 4H58V8H62V12H58V16H54V12H50V8H54Z', '#FFF0AD') + '</g>' + rect(60, 24, 4, 4, '#DDD0FF'),
      'hat-mushroom': path('M48 8H84V12H96V20H104V36H32V20H40V12H48Z', ink) +
        path('M48 12H84V16H96V24H100V32H36V24H44V16H48Z', '#E97E83') +
        rect(48, 18, 8, 8, cream) + rect(76, 14, 8, 8, cream) + rect(88, 26, 8, 6, cream) + rect(52, 36, 32, 4, '#FFE5AC') +
        '<g class="bipych-firefly">' + rect(30, 10, 4, 4, '#F2CD65') + rect(26, 10, 4, 2, '#B7E8D7') + '</g>',
      'hat-arcade': path('M36 8H100V12H104V38H32V12H36Z', ink) + rect(36, 12, 64, 22, '#514D7E') + rect(40, 16, 56, 14, '#222C40') +
        '<g class="bipych-equalizer">' + rect(44, 20, 8, 8, '#99EDC7', 'bipych-eq bipych-eq-0') +
        rect(56, 18, 8, 10, '#F6A6CE', 'bipych-eq bipych-eq-1') + rect(68, 22, 8, 6, '#FFE59C', 'bipych-eq bipych-eq-2') +
        rect(80, 18, 8, 10, '#A9DFF4', 'bipych-eq bipych-eq-3') + '</g>' + rect(40, 34, 8, 4, '#D2B8EE') + rect(88, 34, 8, 4, '#D2B8EE')
    };
    return hats[id] || '';
  }
  function svg(p, map, uid) {
    var netIndex = COSMETICS.filter(function (c) { return c.slot === 'net'; }).findIndex(function (c) { return c.id === map.net; });
    var netColor = NETS[netIndex] || NETS[0];
    var squareNet = map.net === 'net-square';
    var netRim = squareNet
      ? 'M100 36H132V68H100ZM104 40H128V64H104Z'
      : 'M110 32H122V36H126V40H130V60H126V64H122V68H110V64H106V60H102V40H106V36H110ZM110 36H122V40H126V60H122V64H110V60H106V40H110Z';
    var netMesh = squareNet
      ? 'M112 40H113V64H112ZM119 40H120V64H119ZM108 46H124V47H108ZM108 57H124V58H108Z'
      : 'M112 38H113V62H112ZM119 38H120V62H119ZM108 44H124V45H108ZM108 55H124V56H108Z';
    var netEffect = '';
    if (map.net === 'net-orbit') {
      netRim = 'M112 30H120V34H124V38H128V42H132V46H136V54H132V58H128V62H124V66H120V70H112V66H108V62H104V58H100V54H96V46H100V42H104V38H108V34H112ZM112 38H120V42H124V46H128V54H124V58H120V62H112V58H108V54H104V46H108V42H112Z';
      netMesh = 'M112 42H113V58H112ZM119 42H120V58H119ZM108 46H124V47H108ZM108 54H124V55H108Z';
      netEffect = '<g class="bipych-orbit-mote">' + rect(96, 38, 4, 4, '#FFE79C') + '</g>';
    } else if (map.net === 'net-honey') {
      netRim = 'M108 30H124V34H128V38H132V42H134V56H132V60H128V64H124V68H108V64H104V60H100V56H98V42H100V38H104V34H108ZM109 34H123V38H127V42H130V56H127V60H123V64H109V60H105V56H102V42H105V38H109Z';
      netMesh = [[112, 37], [106, 41], [118, 41], [112, 45], [106, 49], [118, 49], [112, 53]].map(function (xy) {
        var x = xy[0], y = xy[1];
        return 'M' + (x + 2) + ' ' + y + 'H' + (x + 6) + 'V' + (y + 2) + 'H' + (x + 8) + 'V' + (y + 6) +
          'H' + (x + 6) + 'V' + (y + 8) + 'H' + (x + 2) + 'V' + (y + 6) + 'H' + x + 'V' + (y + 2) + 'H' + (x + 2) + 'Z';
      }).join('');
      netEffect = path('M109 31H123V33H109ZM99 43H101V55H99Z', '#FFE6A1', 'bipych-honey-detail') +
        path('M114 70H118V73H114ZM114 77H118V79H114Z', '#E6B862');
    } else if (map.net === 'net-comet') {
      netRim = 'M112 28H120V36H124V40H128V44H136V52H128V56H124V60H120V68H112V60H108V56H104V52H96V44H104V40H108V36H112ZM112 40H120V44H124V52H120V56H112V52H108V44H112Z';
      netMesh = 'M114 42H115V54H114ZM119 42H120V54H119ZM110 46H122V47H110ZM110 50H122V51H110Z';
      netEffect = '<g class="bipych-stardust">' + rect(100, 26, 4, 4, '#F4B5D4') + rect(92, 20, 3, 3, '#FFE59C') + rect(88, 12, 2, 2, '#B7EAF2') + '</g>';
    }
    var satellite = map.antenna || (map.screen === 'screen-black' ? '' : 'pixel-sun');
    var limb = map.screen === 'screen-black' ? p[3] : p[4];
    var shyLimb = map.screen === 'screen-black' ? p[2] : limb;
    var shyHand = path('M32 86H38V82H48V78H54V84H64V90H56V96H52V100H40V96H32Z', p[0], 'bipych-shy-palm') +
      rect(36, 88, 8, 6, shyLimb) + rect(42, 84, 10, 12, shyLimb) + rect(50, 80, 2, 8, shyLimb) +
      rect(50, 86, 12, 2, map.screen === 'screen-black' ? p[5] : shyLimb) + rect(42, 84, 4, 4, p[2]);
    var satColor = PIXELS[satellite] || p[4];
    if (!map.antenna && map.screen === 'screen-turquoise') satColor = '#F483AD';
    var eyes = rect(44, 66, 14, 10, p[5]) + rect(76, 66, 14, 10, p[5]) +
      rect(46, 66, 3, 3, p[2]) + rect(78, 66, 3, 3, p[2]);
    var happy = path('M42 70H46V66H56V70H60V76H56V72H46V76H42Z', p[5]) +
      path('M74 70H78V66H88V70H92V76H88V72H78V76H74Z', p[5]);
    var sleeping = rect(44, 73, 14, 4, p[5]) + rect(76, 73, 14, 4, p[5]);
    var result = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 144" class="bipych-svg" aria-hidden="true" focusable="false" shape-rendering="crispEdges">' +
      '<title id="' + uid + '">Бипыч</title>' +
      '<g class="bipych-shadow">' + rect(32, 120, 76, 4, p[0]) + rect(40, 116, 60, 4, p[0]) + '</g>' +
      '<g class="bipych-actor">' +
      '<g class="bipych-foot bipych-foot-left">' + rect(40, 102, 16, 14, p[0]) + rect(44, 104, 8, 8, limb) + '</g>' +
      '<g class="bipych-foot bipych-foot-right">' + rect(80, 102, 16, 14, p[0]) + rect(84, 104, 8, 8, limb) + '</g>' +
      path(OUTLINE, p[0], 'bipych-outline') + path(INSIDE, p[1]) +
      path('M32 68V52H36V46H44V42H88V46H44V50H40V56H36V68Z', p[2]) +
      path('M32 88V94H40V98H96V94H102V78H108V90H104V98H98V102H38V98H32V92H28V82H32Z', p[3]) +
      rect(36, 48, 8, 4, p[2]) + rect(32, 52, 8, 4, p[2]) +
      '<g class="bipych-eyes bipych-eyes-normal">' + eyes + '</g>' +
      '<g class="bipych-eyes bipych-eyes-happy">' + happy + '</g>' +
      '<g class="bipych-eyes bipych-eyes-sleep">' + sleeping + '</g>' +
      '<g class="bipych-blush">' + rect(36, 80, 10, 4, p[4]) + rect(88, 80, 10, 4, p[4]) + '</g>' +
      rect(98, 66, 6, 6, p[4]) + rect(98, 78, 6, 6, p[4]) +
      '<g class="bipych-hand bipych-hand-left">' + rect(16, 78, 12, 16, p[0]) + rect(20, 80, 8, 10, limb) + rect(20, 80, 4, 4, p[2]) + '</g>' +
      '<g class="bipych-hat">' + hat(map.hat, p) + '</g>' +
      '<g class="bipych-hand bipych-hand-right">' +
      '<g class="bipych-net"' + (map.net ? ' data-equipped="true"' : '') + '>' +
      rect(114, 64, 4, 28, '#806247', 'bipych-net-handle') +
      '<path d="' + netRim + '" fill="' + netColor + '" fill-rule="evenodd" stroke="' + (map.net === 'net-honey' ? '#6B4B2C' : p[0]) + '" stroke-width="1" class="bipych-net-rim"/>' +
      '<path d="' + netMesh + '" ' + (map.net === 'net-honey' ? 'fill="none" stroke="#8EAD9D" stroke-width=".75"' : 'fill="#6A9284"') + ' opacity=".65" class="bipych-net-mesh"/>' + netEffect + '</g>' +
      rect(108, 82, 16, 16, p[0], 'bipych-grip') + rect(111, 84, 10, 10, limb) + rect(112, 84, 4, 4, p[2]) + '</g>' +
      '<g class="bipych-shy-hands"><g class="bipych-shy-hand-left">' + shyHand +
      '</g><g class="bipych-shy-hand-right"><g transform="translate(136 0) scale(-1 1)">' + shyHand + '</g></g></g>' +
      '<g class="bipych-question">' + path('M12 32H28V36H32V44H24V52H18V42H26V38H12ZM18 58H24V64H18Z', p[4]) + '</g>' +
      '<g class="bipych-thought">' + rect(16, 28, 4, 4, p[0], 'bipych-thought-dot bipych-thought-dot-0') +
      rect(20, 20, 6, 6, p[4], 'bipych-thought-dot bipych-thought-dot-1') +
      rect(26, 10, 8, 8, p[0], 'bipych-thought-dot bipych-thought-dot-2') + '</g>' +
      '<g class="bipych-pride">' +
      path('M10 38H14V42H18V46H14V50H10V46H6V42H10Z', '#E6B74F', 'bipych-pride-star bipych-pride-star-0') +
      path('M26 16H30V20H34V24H30V28H26V24H22V20H26Z', '#E6B74F', 'bipych-pride-star bipych-pride-star-1') + '</g>' +
      '</g>' +
      '<g class="bipych-satellite"' + (!satellite ? ' hidden="hidden"' : '') + '>' +
      (satellite === 'pixel-comet'
        ? '<g class="bipych-comet-tail">' + rect(132, 10, 6, 6, '#D4BAF3') + rect(138, 4, 4, 4, '#F4BDD8') + '</g>' + path('M124 16H132V20H136V28H132V32H124V28H120V20H124Z', '#FFE1A1') + rect(124, 20, 4, 4, '#FFF8E0')
        : satellite === 'pixel-ufo'
        ? '<g class="bipych-ufo-beam">' + path('M126 30H132V38H136V44H122V38H126Z', '#9CE8CB') + '</g>' + path('M124 12H132V16H136V20H140V28H118V20H122V16H124Z', p[0]) + rect(124, 16, 8, 6, '#AEDDF0') + rect(120, 24, 18, 4, '#B39AE1') + rect(126, 26, 4, 2, '#FFE79C')
        : satellite === 'pixel-star'
        ? path('M124 12H128V16H134V20H130V26H122V20H118V16H124Z', satColor)
        : rect(122, 20, 14, 14, satColor) + rect(124, 22, 4, 4, '#FFF6DC')) +
      (satellite === 'pixel-double' ? rect(132, 10, 8, 8, p[2]) : '') + '</g>' +
      '<g class="bipych-zzz" transform="translate(-8 0)">' + [0, 1, 2].map(function (i) {
        return '<g class="bipych-sleep-z bipych-sleep-z-' + i + '">' + path('M102 34H114V37H111V40H108V43H114V46H102V43H105V40H108V37H102Z', map.screen === 'screen-black' ? p[5] : p[0]) + '</g>';
      }).join('') + '</g>' +
      '<g class="bipych-confetti">' +
      [[18, 20], [44, 8], [90, 8], [132, 46], [12, 100], [126, 110]].map(function (xy, i) {
        return rect(xy[0], xy[1], 4, 6, i % 2 ? p[4] : p[2], 'bipych-spark bipych-spark-' + i);
      }).join('') + '</g></svg>';
    return result;
  }
  function finite(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function mount(el, options) {
    if (!el || typeof el.appendChild !== 'function') throw new TypeError('mount: нужен DOM-элемент');
    options = options || {};
    var doc = el.ownerDocument;
    var root = doc.createElement('div');
    var picture = doc.createElement('div');
    var bubble = doc.createElement('div');
    var charge = doc.createElement('div');
    var cells = doc.createElement('span');
    var count = doc.createElement('span');
    var state = 'idle', dead = false, map = {}, uid = 'bipych-' + (++serial), celebrateTimer = null;
    var done = 0, goal = 5;
    var size = Math.max(24, Math.min(512, finite(options.size, 96)));
    root.className = 'bipych';
    root.style.setProperty('--bipych-size', size + 'px');
    root.dataset.age = options.age === 'senior' ? 'senior' : 'junior';
    root.dataset.compact = String(size < 64);
    picture.className = 'bipych-picture';
    picture.setAttribute('role', 'img');
    bubble.className = 'bipych-bubble';
    bubble.id = uid + '-bubble';
    bubble.setAttribute('role', 'status');
    bubble.setAttribute('aria-live', 'polite');
    bubble.hidden = true;
    charge.className = 'bipych-charge';
    charge.setAttribute('role', 'progressbar');
    charge.setAttribute('aria-valuemin', '0');
    charge.setAttribute('aria-label', 'Задачи цели дня');
    cells.className = 'bipych-charge-cells';
    cells.setAttribute('aria-hidden', 'true');
    count.className = 'bipych-charge-count';
    count.setAttribute('aria-hidden', 'true');
    charge.append(cells, count);
    root.append(bubble, picture, charge);
    el.appendChild(root);
    function setState(name) {
      if (dead) return;
      if (celebrateTimer !== null) { clearTimeout(celebrateTimer); celebrateTimer = null; }
      state = STATES.indexOf(name) >= 0 ? name : 'idle';
      root.dataset.state = state;
      root.dataset.net = String(!!map.net || state === 'catching');
      picture.setAttribute('aria-label', 'Бипыч — ' + LABELS[STATES.indexOf(state)]);
    }
    function setCharge(value, target) {
      if (dead) return;
      var wasFull = done === goal;
      goal = Math.max(3, Math.min(10, Math.round(finite(target, 5))));
      done = Math.max(0, Math.min(goal, Math.round(finite(value, 0))));
      charge.setAttribute('aria-valuemax', String(goal));
      charge.setAttribute('aria-valuenow', String(done));
      charge.setAttribute('aria-valuetext', done + ' из ' + goal + ' задач');
      root.dataset.full = String(done === goal);
      root.style.setProperty('--bipych-goal', goal);
      cells.replaceChildren();
      for (var i = 0; i < goal; i++) {
        var cell = doc.createElement('i');
        cell.dataset.filled = String(i < done);
        cells.appendChild(cell);
      }
      count.textContent = done + '/' + goal;
      if (done === goal && !wasFull && state !== 'sleep') {
        var previous = state;
        setState('celebrate');
        celebrateTimer = setTimeout(function () { celebrateTimer = null; setState(previous); }, 2600);
      }
    }
    function setCosmetics(next) {
      if (dead) return;
      map = { screen: 'screen-turquoise' };
      if (next && typeof next === 'object') ['screen', 'antenna', 'hat', 'net'].forEach(function (slot) {
        var id = next[slot];
        if (Object.prototype.hasOwnProperty.call(items, id) && items[id].slot === slot) map[slot] = id;
      });
      var p = PALETTES[map.screen];
      picture.innerHTML = svg(p, map, uid);
      root.style.setProperty('--bipych-accent', p[4]);
      root.style.setProperty('--bipych-outline', p[0]);
      root.dataset.color = map.screen.slice(7);
      setState(state);
    }
    function say(text, settings) {
      if (dead) return;
      var line = String(text == null ? '' : text).slice(0, 1000);
      bubble.textContent = line;
      bubble.hidden = !line;
      if (line) picture.setAttribute('aria-describedby', bubble.id);
      else picture.removeAttribute('aria-describedby');
      var win = doc.defaultView;
      if (line && settings && settings.voice && win && win.speechSynthesis && win.SpeechSynthesisUtterance) {
        try {
          var utterance = new win.SpeechSynthesisUtterance(line);
          utterance.lang = 'ru-RU';
          var voice = win.speechSynthesis.getVoices().find(function (v) { return /^ru\b/i.test(v.lang); });
          if (voice) utterance.voice = voice;
          utterance.rate = 0.95;
          win.speechSynthesis.speak(utterance);
        } catch (_) { /* Text bubble remains available when speech is unavailable. */ }
      }
    }
    function destroy() {
      if (dead) return;
      dead = true;
      if (celebrateTimer !== null) clearTimeout(celebrateTimer);
      root.remove();
    }
    setCosmetics(options.cosmetics);
    setState(options.state || 'idle');
    var initial = options.charge || {};
    setCharge(initial.done, initial.goal);
    return Object.freeze({ setState: setState, setCharge: setCharge, setCosmetics: setCosmetics, say: say, destroy: destroy });
  }
  window.VEKTOR_DROBIK = Object.freeze({ STATES: STATES, COSMETICS: COSMETICS, mount: mount });
}());
