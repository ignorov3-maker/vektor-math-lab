(function () {
  'use strict';
  const { entries } = window.VEKTOR_TUTOR_VISUALS;
  const { figure } = window.VEKTOR_VISUALS;
  const constructor = window.VEKTOR_TUTOR_CONSTRUCTOR;
  const $ = id => document.getElementById(id);
  const make = (tag, text, cls) => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  };
  const svg = id => figure({ type: 'tutor-diagram', id });
  const art = document.querySelector('.hero-art');
  for (const id of ['apple-quarter','origin-vs-fee','opposite-motion','circle-target']) {
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
      section.dataset.grade = items[0].grade;
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
    copy.onclick = () => copyTag(code, copy);
    download.onclick = () => downloadDrawing(artwork, item.id+'.svg');
    actions.append(code, copy, download);
    article.append(artwork, make('h3', item.title), make('p', item.note), actions);
    return article;
  }
  async function copyTag(code, button) {
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = 'Скопировано';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = 'Выделено';
    }
  }
  function downloadDrawing(container, filename) {
    const drawing = container.querySelector('svg');
    if (!drawing) return;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(drawing)], { type: 'image/svg+xml' }));
    const link = make('a');
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const rows = $('builder-parts'), drawing = $('builder-drawing'), output = $('builder-tag'), error = $('builder-error');
  const add = $('builder-add'), copy = $('builder-copy'), download = $('builder-export');
  let fieldId = 0;
  function wrapLabel(name, input) {
    const field = make('div', '', 'builder-label'), label = make('label', name);
    input.id = 'visual-value-'+(++fieldId);
    label.htmlFor = input.id;
    field.append(label,input);
    return field;
  }
  function assemble() {
    const recipe = [...rows.children].map(row=>{
      const title=row.querySelector('[data-title]').value.trim();
      const args=row.querySelector('textarea').value.trim().replace(/\r?\n/g,' ');
      return row.querySelector('select').value+(title?' : "'+title+'"':'')+' '+args;
    }).join(' | ');
    const built=constructor.compile(recipe);
    const ready=!!built.parts;
    copy.disabled=download.disabled=!ready;
    copy.textContent='Скопировать тег';
    add.disabled=rows.children.length>=constructor.MAX_PARTS;
    rows.querySelectorAll('.builder-remove').forEach(button=>button.disabled=rows.children.length===1);
    error.hidden=ready;
    error.textContent=built.error||'';
    drawing.innerHTML=ready?figure({type:'tutor-construction',parts:built.parts}):'';
    output.textContent=built.tag||'';
  }
  function addPart(typeId, value, heading='') {
    const row=make('fieldset','', 'builder-part');
    const select=make('select'), title=make('input'), input=make('textarea'), hint=make('small');
    const remove=make('button','Убрать часть','builder-remove');
    remove.type='button'; title.type='text'; title.maxLength=28; title.dataset.title='';
    title.placeholder='По желанию'; title.value=heading;
    input.rows=2; input.maxLength=constructor.LIMIT;
    for (const type of constructor.types){
      const option=make('option',type.name);
      option.value=type.id;
      select.append(option);
    }
    select.value=typeId;
    const current=()=>constructor.types.find(type=>type.id===select.value);
    input.value=value||current().example;
    hint.textContent=current().hint;
    select.onchange=()=>{input.value=current().example;hint.textContent=current().hint;assemble();};
    title.oninput=input.oninput=assemble;
    remove.onclick=()=>{row.remove();assemble();};
    row.append(wrapLabel('Тип рисунка',select),wrapLabel('Заголовок',title),wrapLabel('Значения',input),hint,remove);
    rows.append(row);
    assemble();
    return select;
  }
  add.onclick=()=>{if(rows.children.length<constructor.MAX_PARTS)addPart('сетка').focus();};
  copy.onclick=()=>copyTag(output,copy);
  download.onclick=()=>downloadDrawing(drawing,'bipych-constructor.svg');
  addPart('доли','3/8 5/8','Две ленты');
  addPart('прямая','0 1 3/8 5/8');

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
