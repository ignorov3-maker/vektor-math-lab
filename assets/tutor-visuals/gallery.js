(function () {
  'use strict';
  const { entries } = window.VEKTOR_TUTOR_VISUALS;
  const { figure } = window.VEKTOR_VISUALS;
  const $ = id => document.getElementById(id);
  const make = (tag, text, cls) => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  };
  const svg = id => figure({ type: 'tutor-diagram', id });
  const art = document.querySelector('.hero-art');
  for (const id of ['apple-quarter','origin-vs-fee','fraction-of-fraction','circle-target']) {
    const host = make('div');
    host.innerHTML = svg(id);
    art.append(host.firstElementChild.firstElementChild);
  }
  let grade = 0;
  const filters = $('grades');
  const search = $('search');
  const normalize = text => text.toLowerCase().replace(/ё/g, 'е');
  function update() {
    const q = normalize(search.value).trim();
    const visible = entries.filter(item => (!grade || item.grade === grade) &&
      normalize([item.title,item.group,item.note,item.tag].join(' ')).includes(q));
    $('count').textContent = q || grade ? visible.length + ' из ' + entries.length : entries.length + ' схем';
    const groups = new Map();
    for (const item of visible) {
      if (!groups.has(item.group)) groups.set(item.group, []);
      groups.get(item.group).push(item);
    }
    const sections = [...groups].map(([name, items]) => {
      const section = make('section');
      const grid = make('div', '', 'cards');
      grid.append(...items.map(card));
      section.append(make('h3', items[0].grade + ' класс · ' + name, 'group-heading'), grid);
      return section;
    });
    $('cards').replaceChildren(...(sections.length ? sections : [make('p','По этому запросу схем нет.')]));
  }
  function card(item) {
    const article = make('article', '', 'tile'), artwork = make('div');
    artwork.innerHTML = svg(item.id);
    const actions = make('div', '', 'tile-actions'), code = make('code', item.tag);
    const copy = make('button', 'Тег'), download = make('button', 'SVG');
    copy.type = download.type = 'button';
    copy.setAttribute('aria-label', 'Скопировать тег для схемы «' + item.title + '»');
    download.setAttribute('aria-label', 'Скачать SVG «' + item.title + '»');
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(item.tag);
        copy.textContent = 'Скопировано';
      } catch {
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        copy.textContent = 'Выделено';
      }
    };
    download.onclick = () => {
      const drawing = artwork.querySelector('svg').cloneNode(true);
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(drawing)], { type: 'image/svg+xml' }));
      const link = make('a');
      link.href = url; link.download = item.id + '.svg'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    actions.append(code, copy, download);
    article.append(artwork, make('h3', item.title), make('p', item.note), actions);
    return article;
  }
  for (const n of [0,5,6,7,8,9]) {
    const button = make('button', n ? n + ' класс' : 'Все классы');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(n === grade));
    button.onclick = () => {
      grade = n;
      for (const control of filters.children) control.setAttribute('aria-pressed', String(control === button));
      update();
    };
    filters.append(button);
  }
  search.addEventListener('input', update);
  update();
})();
