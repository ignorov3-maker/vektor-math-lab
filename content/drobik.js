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
    ['net-master', 'net', 'Сачок мастера', 0, 'bug-master']
  ].map(function (c) {
    return Object.freeze({ id: c[0], slot: c[1], name: c[2], price: c[3], unlock: c[4] || null });
  });
  Object.freeze(STATES);
  Object.freeze(COSMETICS);
  var items = Object.create(null);
  COSMETICS.forEach(function (c) { items[c.id] = c; });
  var PIXELS = {
    'pixel-sun': '#FFD46F', 'pixel-mint': '#96EBD1', 'pixel-lilac': '#C5A0F2',
    'pixel-coral': '#FF927F', 'pixel-ice': '#B5E7FF', 'pixel-double': '#F8B4D9', 'pixel-star': '#FFE58A'
  };
  var NETS = ['#C8A366', '#6AD3B7', '#F483AD', '#82C5F0', '#E9C24A', '#B29CE8', '#A8C6DD', '#8DBA77', '#FFE58A', '#EAB1E5'];
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
      'hat-bucket': path('M44 20H86L90 32H98V38H34V32H40Z', '#83B9DC') + rect(46, 26, 38, 4, cream),
      'hat-crown': path('M40 22H48V28H56V18H64V28H72V18H80V28H88V22H96V38H40Z', '#F2CC63') + rect(60, 30, 8, 4, accent),
      'hat-bow': path('M42 24H54V28H66V24H80V40H66V36H54V40H42Z', accent) + rect(56, 28, 8, 8, ink),
      'hat-headphones': path('M24 58V32H32V24H100V32H112V60H104V36H98V32H38V36H32V58Z', ink) + rect(20, 50, 12, 22, accent) + rect(104, 50, 12, 22, accent),
      'hat-beret': path('M34 30H42V22H54V18H88V22H98V32H90V38H42V34H34Z', '#D26C73') + rect(64, 12, 8, 8, ink),
      'hat-leaf': path('M62 34V22H70V14H94V22H86V30H74V38Z', '#7EA56F') + rect(62, 30, 8, 8, ink),
      'hat-graduate': path('M28 24L66 12L104 24L66 36Z', ink) + rect(48, 30, 36, 8, ink) + rect(98, 24, 4, 22, '#EDBF50') + rect(94, 44, 12, 6, '#EDBF50'),
      'hat-captain': path('M34 24H42V18H90V24H98V32H90V38H40V32H34Z', cream) + rect(38, 30, 56, 8, ink) + rect(62, 22, 8, 8, '#E7BC4C')
    };
    return hats[id] || '';
  }
  function svg(p, map, uid) {
    var netIndex = COSMETICS.filter(function (c) { return c.slot === 'net'; }).findIndex(function (c) { return c.id === map.net; });
    var netColor = NETS[netIndex] || NETS[0];
    var satellite = map.antenna || (map.screen === 'screen-black' ? '' : 'pixel-sun');
    var limb = map.screen === 'screen-black' ? p[3] : p[4];
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
      '<g class="bipych-hand bipych-hand-left">' + rect(16, 78, 12, 16, p[0]) + rect(20, 80, 8, 10, limb) + rect(20, 80, 4, 4, p[2]) + '</g>' +
      path(OUTLINE, p[0], 'bipych-outline') + path(INSIDE, p[1]) +
      path('M32 68V52H36V46H44V42H88V46H44V50H40V56H36V68Z', p[2]) +
      path('M32 88V94H40V98H96V94H102V78H108V90H104V98H98V102H38V98H32V92H28V82H32Z', p[3]) +
      rect(36, 48, 8, 4, p[2]) + rect(32, 52, 8, 4, p[2]) +
      '<g class="bipych-eyes bipych-eyes-normal">' + eyes + '</g>' +
      '<g class="bipych-eyes bipych-eyes-happy">' + happy + '</g>' +
      '<g class="bipych-eyes bipych-eyes-sleep">' + sleeping + '</g>' +
      '<g class="bipych-blush">' + rect(36, 80, 10, 4, p[4]) + rect(88, 80, 10, 4, p[4]) + '</g>' +
      rect(98, 66, 6, 6, p[4]) + rect(98, 78, 6, 6, p[4]) +
      '<g class="bipych-hand bipych-hand-right">' + rect(108, 82, 12, 16, p[0]) + rect(108, 84, 8, 10, limb) + rect(108, 84, 4, 4, p[2]) + '</g>' +
      '<g class="bipych-net"' + (map.net ? ' data-equipped="true"' : '') + '>' +
      path('M114 84V58H118V84Z', netColor) +
      path('M106 36H126V40H130V56H126V60H106V56H102V40H106Z', netColor) +
      path('M108 40H124V44H126V52H122V56H108V52H106V44H108Z', p[2]) +
      path('M112 42H114V54H112ZM120 42H122V54H120ZM108 46H124V48H108ZM108 50H124V52H108Z', netColor) + '</g>' +
      '<g class="bipych-hat">' + hat(map.hat, p) + '</g>' +
      '<g class="bipych-question">' + path('M12 32H28V36H32V44H24V52H18V42H26V38H12ZM18 58H24V64H18Z', p[4]) + '</g>' +
      '<g class="bipych-zzz">' + path('M100 16H116V20H112V24H108V28H116V32H100V28H104V24H108V20H100Z', p[4]) + '</g>' +
      '</g>' +
      '<g class="bipych-satellite"' + (!satellite ? ' hidden="hidden"' : '') + '>' +
      (satellite === 'pixel-star'
        ? path('M124 12H128V16H134V20H130V26H122V20H118V16H124Z', satColor)
        : rect(122, 20, 14, 14, satColor) + rect(124, 22, 4, 4, '#FFF6DC')) +
      (satellite === 'pixel-double' ? rect(132, 10, 8, 8, p[2]) : '') + '</g>' +
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
