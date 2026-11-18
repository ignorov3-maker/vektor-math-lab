/* =========================================================
   Наглядные модели дробей: полоска, круг, пара полосок,
   числовая прямая, прямоугольник для умножения, смешанное число.
   Используются в методичках, задачах, чате наставника и лаборатории.
   ========================================================= */
(function () {
  'use strict';

  const f = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
  const W = 300;
  const SCENES = ['pizza', 'cake', 'pizzas', 'choco', 'chocopair', 'chocogrid', 'people', 'groups'];
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const positive=n=>Number.isFinite(n)&&n>0&&n<=1000000;
  const num=n=>Number.isFinite(n)?String(Math.round(n*1000)/1000):'?';

  function describe(fig) {
    if(!fig)return '';
    switch(fig.type){
      case 'triangle': return `треугольник, стороны ${fig.a}, ${fig.b}, ${fig.c}`;
      case 'right_triangle': return `прямоугольный треугольник, катеты ${fig.a} и ${fig.b}, гипотенуза ${fig.c==null?'неизвестна':fig.c}`;
      case 'circle_geo': return `окружность, радиус ${fig.r}, диаметр ${num(2*fig.r)}${fig.chord===false?'':', показана хорда'}`;
      case 'angle': return `угол ${fig.degrees} градусов`;
      case 'coord': return 'координатная плоскость: '+(fig.points||[]).map((p,i)=>`${p.label||String.fromCharCode(65+i)}(${p.x}; ${p.y})`).join(', ');
      case 'graph': return `график функции y = ${fig.kind==='quadratic'?`${fig.a}x² + ${fig.b}x + ${fig.c}`:`${fig.a}x + ${fig.b}`}`;
      case 'bar': return `полоска из ${fig.parts} частей, закрашено ${fig.shaded}`;
      case 'circle': return `круг из ${fig.parts} частей, ${fig.empty==null?`закрашено ${fig.shaded}`:`пустых ${fig.empty}`}`;
      case 'pair': return `две полоски: ${fig.a[0]}/${fig.a[1]} и ${fig.b[0]}/${fig.b[1]}`;
      case 'line': return `числовая прямая, точка ${fig.n}/${fig.d}`;
      case 'mixed': return `${fig.whole} целых и ${fig.n}/${fig.d}`;
      case 'grid': return `сетка ${fig.rows} на ${fig.cols}, закрашено ${fig.r*fig.c} клеток`;
      case 'labeled': return `дробь ${fig.n}/${fig.d}, числитель ${fig.n}, знаменатель ${fig.d}`;
      case 'pizza': case 'cake': return `${fig.type === 'cake' ? 'торт' : 'пицца'} из ${fig.parts} кусков, осталось ${fig.have}`;
      case 'choco': return `шоколадка из ${(fig.cols || fig.parts) * (fig.rows || 1)} долек, ${fig.have} на месте`;
      case 'people': return `${fig.total} человек, выделено ${fig.mark}`;
      case 'icons': return `${fig.total} штук, выделено ${fig.mark}`;
      case 'groups': return `${fig.groups} кучек по ${fig.per} конфет, взяли ${fig.take}`;
      default:return '';
    }
  }
  function geometry(fig) {
    const text=(x,y,s)=>`<text x="${x}" y="${y}" text-anchor="middle" fill="currentColor" stroke="none" font-size="13">${esc(s)}</text>`;
    const line=(x,y,u,v)=>`<line x1="${x}" y1="${y}" x2="${u}" y2="${v}"/>`;
    let body='';
    if(fig.type==='triangle'||fig.type==='right_triangle'){
      const a=fig.a,b=fig.b,c=fig.type==='right_triangle'?Math.hypot(a,b):fig.c;
      if(![a,b,c].every(positive)||a+b<=c||a+c<=b||b+c<=a)return '';
      if(fig.type==='right_triangle'&&fig.c!=null&&Math.abs(fig.c-c)>c*0.000001)return '';
      const x=fig.type==='right_triangle'?0:(a*a+b*b-c*c)/(2*a),y=Math.sqrt(Math.max(0,b*b-x*x));
      const min=Math.min(0,x),max=Math.max(a,x),scale=Math.min(220/(max-min),190/y),X=v=>40+(v-min)*scale,Y=v=>240-v*scale;
      const p=[[X(0),Y(0)],[X(a),Y(0)],[X(x),Y(y)]];
      body=`<path d="M${p[0]}L${p[1]}L${p[2]}Z"/>`+text((p[0][0]+p[1][0])/2,260,num(a))+text((p[0][0]+p[2][0])/2-15,(p[0][1]+p[2][1])/2,num(b))+text((p[1][0]+p[2][0])/2+15,(p[1][1]+p[2][1])/2,fig.type==='right_triangle'&&fig.c==null?'?':num(c));
      p.forEach((v,i)=>body+=text(v[0]+(i===2?0:i===0?-12:12),v[1]+(i===2?-12:15),['A','B','C'][i]));
      if(fig.type==='right_triangle')body+=`<path d="M${X(0)+14} ${Y(0)}v-14h-14"/>`;
      else if(fig.showAngles){const angles=[Math.acos(x/b)*180/Math.PI,Math.acos((a-x)/c)*180/Math.PI];angles.push(180-angles[0]-angles[1]);p.forEach((v,i)=>body+=text(v[0]+(i===0?32:i===1?-32:0),v[1]+(i===2?30:-12),num(angles[i])+'°'));}
    }else if(fig.type==='circle_geo'){
      if(!positive(fig.r))return '';
      body='<circle cx="150" cy="150" r="90"/>'+line(150,150,240,150)+text(195,143,'r = '+fig.r)+line(60,150,240,150)+text(150,258,'d = '+num(2*fig.r))+'<circle cx="150" cy="150" r="3" fill="currentColor"/>';
      if(fig.chord!==false)body+=line(72.058,195,227.942,195)+text(150,216,'хорда');
    }else if(fig.type==='angle'){
      const d=fig.degrees;if(!positive(d)||d>=360)return '';const a=d*Math.PI/180,cx=150,cy=150;
      body=line(cx,cy,260,cy)+line(cx,cy,cx+110*Math.cos(a),cy-110*Math.sin(a))+`<path d="M190 150A40 40 0 ${d>180?1:0} 0 ${cx+40*Math.cos(a)} ${cy-40*Math.sin(a)}"/>`+text(cx+65*Math.cos(a/2),cy-65*Math.sin(a/2),d+'°');
    }else if(fig.type==='coord'||fig.type==='graph'){
      const points=fig.points||[];if(!Array.isArray(points)||points.length>20||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>100||Math.abs(p.y)>100))return '';
      const range=fig.type==='coord'?Math.max(5,...points.flatMap(p=>[Math.abs(p.x)+1,Math.abs(p.y)+1])):5;
      const S=v=>150+v*120/range,Y=v=>150-v*120/range,step=Math.ceil(range/5);
      for(let k=-Math.floor(range/step)*step;k<=range;k+=step){body+=`<g opacity=".18">${line(S(k),30,S(k),270)+line(30,Y(k),270,Y(k))}</g>`;if(k)body+=text(S(k),166,k)+text(137,Y(k)+4,k);}
      body+=line(24,150,276,150)+line(150,276,150,24)+text(282,145,'x')+text(160,20,'y')+text(140,166,'0');
      if(fig.type==='coord')points.forEach((p,i)=>body+=`<circle cx="${S(p.x)}" cy="${Y(p.y)}" r="4" fill="currentColor"/>`+text(S(p.x),Y(p.y)-10,p.label||String.fromCharCode(65+i)));
      else{if(!['linear','quadratic'].includes(fig.kind)||![fig.a,fig.b,...(fig.kind==='quadratic'?[fig.c]:[])].every(n=>Number.isFinite(n)&&Math.abs(n)<=1000))return '';
        if(fig.kind==='quadratic'&&fig.a===0)return '';const pts=[];for(let k=0;k<=200;k++){const x=-5+k/20,y=fig.kind==='quadratic'?fig.a*x*x+fig.b*x+fig.c:fig.a*x+fig.b;pts.push(`${x},${-y}`);}
        body+=`<svg x="30" y="30" width="240" height="240" viewBox="-5 -5 10 10" overflow="hidden"><polyline points="${pts.join(' ')}" fill="none" stroke="var(--green,currentColor)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>`;}
    }else return '';
    const label=esc(describe(fig));return `<div class="figure"><svg viewBox="0 0 300 300" width="300" height="300" role="img" aria-label="${label}" style="width:300px;max-width:100%;height:auto"><title>${label}</title><g fill="none" stroke="currentColor" stroke-width="2">${body}</g></svg></div>`;
  }

  function barSvg(parts, shaded, { split = null, crossed = 0, y = 0, h = 44, label = null, width = W } = {}) {
    const w = width / parts;
    let s = '';
    for (let k = 0; k < parts; k++) {
      // crossed — сколько закрашенных долей «убрали» (вычитание): зачёркиваем последние из закрашенных
      const cls = k < shaded - crossed ? (split != null && k >= split ? 'fig-on2' : 'fig-on') : k < shaded ? 'fig-x' : 'fig-off';
      s += `<rect class="${cls}" x="${k * w + 1}" y="${y + 1}" width="${Math.max(1, w - 2)}" height="${h - 2}" rx="3"/>`;
    }
    if (crossed) for (let k = Math.max(0, shaded - crossed); k < shaded; k++) s += `<path class="fig-cross" d="M${k * w + 6} ${y + 6}L${(k + 1) * w - 6} ${y + h - 6}"/>`;
    if (label) s += `<text class="fig-label" x="${width / 2}" y="${y - 8}" text-anchor="middle">${label}</text>`;
    return s;
  }

  function circleSvg(parts, on, cx, cy, r, { emptyIsEaten = false } = {}) {
    if (parts === 1) return `<circle class="${on ? 'slice' : 'slice eaten'}" cx="${cx}" cy="${cy}" r="${r}"/>`;
    return Array.from({ length: parts }, (_, k) => {
      const a1 = (k / parts) * 2 * Math.PI - Math.PI / 2, a2 = ((k + 1) / parts) * 2 * Math.PI - Math.PI / 2;
      const p = a => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
      const filled = emptyIsEaten ? k >= on : k < on;
      return `<path class="slice${filled ? '' : ' eaten'}" d="M${cx},${cy} L${p(a1)} A${r},${r} 0 0 1 ${p(a2)} Z"/>`;
    }).join('');
  }

  function lineSvg(n, d, { width = W, max = Math.max(1, Math.ceil(n / d)) } = {}) {
    const x0 = 16, x1 = width - 16, y = 34, X = v => x0 + (x1 - x0) * v / max;
    let s = `<line class="fig-axis" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/>`;
    for (let k = 0; k <= d * max; k++) {
      const whole = k % d === 0;
      s += `<line class="fig-tick" x1="${X(k / d)}" y1="${y - (whole ? 10 : 6)}" x2="${X(k / d)}" y2="${y + (whole ? 10 : 6)}"/>`;
      if (whole) s += `<text class="fig-label" x="${X(k / d)}" y="${y + 28}" text-anchor="middle">${k / d}</text>`;
    }
    s += `<line class="fig-span" x1="${X(0)}" y1="${y}" x2="${X(n / d)}" y2="${y}"/><circle class="fig-point" cx="${X(n / d)}" cy="${y}" r="7"/>`;
    return s;
  }

  /* ---------- Живые картинки: пицца, торт, шоколадка, ребята, конфеты ----------
     Ребёнок видит настоящую вещь, а не «полоску 3/5». Цвета — как у еды, одинаковые во всех оформлениях. */
  const P = n => n.toFixed(1);
  const wedge = (cx, cy, r, a1, a2) => {
    const p = a => `${P(cx + r * Math.cos(a))},${P(cy + r * Math.sin(a))}`;
    return `M${cx},${cy} L${p(a1)} A${r},${r} 0 ${a2 - a1 > Math.PI ? 1 : 0} 1 ${p(a2)} Z`;
  };
  const ang = (k, n) => (k / n) * 2 * Math.PI - Math.PI / 2;
  // круглая еда: на тарелке parts кусков, есть have штук; mark — сколько из них подсвечены (для «съели»)
  function roundFood(kind, parts, have, cx, cy, r, { mark = 0 } = {}) {
    const cake = kind === 'cake';
    const crust = cake ? '#F1D3A1' : '#E3A857', top = cake ? '#F6A6C1' : '#FAD06C', edge = cake ? '#D9A066' : '#B97A2E';
    let s = `<circle cx="${cx}" cy="${cy}" r="${r + 7}" fill="#FFFFFF" stroke="#D9DEE5" stroke-width="2"/>`;
    for (let k = 0; k < parts; k++) {
      const a1 = ang(k, parts), a2 = ang(k + 1, parts), mid = (a1 + a2) / 2;
      if (k >= have) { s += `<path d="${wedge(cx, cy, r, a1, a2)}" fill="#F3F4F6" stroke="#C3C9D2" stroke-width="1.5" stroke-dasharray="4 4"/>`; continue; }
      const hot = k >= have - mark;
      s += `<path d="${parts === 1 ? `M${cx - r},${cy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0` : wedge(cx, cy, r, a1, a2)}" fill="${crust}" stroke="${edge}" stroke-width="1.5"/>`;
      s += `<path d="${parts === 1 ? `M${cx - r * .84},${cy} a${r * .84},${r * .84} 0 1 0 ${2 * r * .84},0 a${r * .84},${r * .84} 0 1 0 ${-2 * r * .84},0` : wedge(cx, cy, r * .84, a1 + .04, a2 - .04)}" fill="${top}"/>`;
      const dot = (rr, da, size) => { const a = parts === 1 ? da : mid + da * (a2 - a1); return `<circle cx="${P(cx + rr * Math.cos(a))}" cy="${P(cy + rr * Math.sin(a))}" r="${P(size)}"`; };
      if (cake) s += `${dot(r * .6, 0, r * .085)} fill="#D7263D"/>${dot(r * .38, .18, r * .035)} fill="#FFFFFF"/>`;
      else if (parts <= 12) s += `${dot(r * .58, 0, r * .1)} fill="#D9534F"/>${parts <= 6 ? `${dot(r * .32, .2, r * .07)} fill="#D9534F"/>` : ''}${dot(r * .45, -.25, r * .03)} fill="#4E9A46"/>`;
      if (hot && mark) s += `<path d="${wedge(cx, cy, r, a1, a2)}" fill="none" stroke="#1E7358" stroke-width="3"/>`;
    }
    if (parts > 1) for (let k = 0; k < parts; k++) { const a = ang(k, parts); s += `<line x1="${cx}" y1="${cy}" x2="${P(cx + r * Math.cos(a))}" y2="${P(cy + r * Math.sin(a))}" stroke="#FFFFFF" stroke-width="2"/>`; }
    return s;
  }
  // шоколадка cols×rows; have — сколько долек на месте (по порядку), split — первые split долек тёмные, остальные молочные; eaten — последние из имеющихся зачёркнуты
  function chocoBar(cols, rows, have, x, y, w, h, { split = null, crossed = 0, label = null, gridOn = null } = {}) {
    const cw = w / cols, ch = h / rows;
    let s = `<rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="6" fill="#5A321D"/>`;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = r * cols + c, px = x + c * cw, py = y + r * ch;
      const on = gridOn ? gridOn(r, c) : k < have;
      if (on === 'half') { s += `<rect x="${P(px + 1.5)}" y="${P(py + 1.5)}" width="${P(cw - 3)}" height="${P(ch - 3)}" rx="3" fill="#B98563"/>`; continue; }
      if (!on) { s += `<rect x="${P(px + 1.5)}" y="${P(py + 1.5)}" width="${P(cw - 3)}" height="${P(ch - 3)}" rx="3" fill="#F3EAE3" stroke="#C9B3A3" stroke-dasharray="4 3"/>`; continue; }
      const gone = !gridOn && k >= have - crossed;
      const dark = split == null || k < split;
      const fill = gone ? '#EADBD0' : dark ? '#6B3E26' : '#B0774A', hi = gone ? '#F3EAE3' : dark ? '#87533A' : '#C99067';
      s += `<rect x="${P(px + 1.5)}" y="${P(py + 1.5)}" width="${P(cw - 3)}" height="${P(ch - 3)}" rx="3" fill="${fill}"/><rect x="${P(px + 5)}" y="${P(py + 5)}" width="${P(Math.max(2, cw - 10))}" height="${P(Math.max(2, ch - 10))}" rx="2" fill="${hi}"/>`;
      if (gone) s += `<path d="M${P(px + 6)} ${P(py + 6)}L${P(px + cw - 6)} ${P(py + ch - 6)}M${P(px + cw - 6)} ${P(py + 6)}L${P(px + 6)} ${P(py + ch - 6)}" stroke="#A2867A" stroke-width="2" stroke-linecap="round"/>`;
    }
    if (label) s += `<text x="${x + w / 2}" y="${y - 10}" text-anchor="middle" fill="#4F5D72" font-size="14" font-weight="700">${esc(label)}</text>`;
    return s;
  }
  function person(x, y, on, s = 1) {
    const c = on ? '#1E7358' : '#C3C9D2', c2 = on ? '#2E9B6F' : '#DDE1E7';
    return `<circle cx="${P(x)}" cy="${P(y + 7 * s)}" r="${P(6.5 * s)}" fill="${c}"/><path d="M${P(x - 9 * s)} ${P(y + 30 * s)}q0-14 ${P(9 * s)}-14q${P(9 * s)} 0 ${P(9 * s)} 14z" fill="${c2}"/>`;
  }
  function candy(x, y, on) {
    const c = on ? '#E46A5E' : '#D5DAE1', w = on ? '#F6B3AA' : '#E8EBEF';
    return `<path d="M${P(x - 13)} ${P(y - 5)}l6 5-6 5zM${P(x + 13)} ${P(y - 5)}l-6 5 6 5z" fill="${w}"/><ellipse cx="${P(x)}" cy="${P(y)}" rx="8" ry="6.5" fill="${c}"/>`;
  }
  function scene(fig) {
    const wrap = (vw, vh, label, inner, max = vw) => `<div class="figure scene"><svg viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}" role="img" aria-label="${esc(label)}" style="width:${max}px;max-width:100%;height:auto">${inner}</svg></div>`;
    const tag = (x, y, t) => `<text x="${x}" y="${y}" text-anchor="middle" fill="#4F5D72" font-size="15" font-weight="700">${esc(t)}</text>`;
    switch (fig.type) {
      case 'pizza': case 'cake': {
        const name = fig.type === 'cake' ? 'Торт' : 'Пицца';
        return wrap(190, 190, `${name}: ${fig.parts} кусков, осталось ${fig.have}`, roundFood(fig.type, fig.parts, fig.have, 95, 95, 82, { mark: fig.mark || 0 }), 170);
      }
      case 'pizzas': { // несколько пицц рядом: [{parts, have, label}]
        const it = fig.items, r = it.length > 2 ? 46 : 62, cell = 2 * r + 30, vh = 2 * r + 18 + (it.some(x => x.label) ? 26 : 0);
        const inner = it.map((x, j) => roundFood(fig.food || 'pizza', x.parts, x.have, 15 + r + j * cell, r + 9, r, { mark: x.mark || 0 }) + (x.label ? tag(15 + r + j * cell, 2 * r + 38, x.label) : '')).join('');
        return wrap(it.length * cell, vh, it.map(x => `${x.parts} кусков, есть ${x.have}`).join('; '), inner, Math.min(330, it.length * cell));
      }
      case 'choco': {
        const cols = fig.cols || fig.parts, rows = fig.rows || 1, cw = Math.min(54, 300 / cols), w = cw * cols, h = rows * (rows > 1 ? 34 : 46), top = fig.label ? 26 : 6;
        return wrap(w + 12, h + top + 8, `Шоколадка из ${cols * rows} долек, ${fig.have} на месте`, chocoBar(cols, rows, fig.have, 6, top, w, h, fig), Math.min(320, w + 12));
      }
      case 'chocopair': { // две одинаковые шоколадки, нарезанные по-разному: a=[взяли, долек], b=[взяли, долек]
        const w = 288, h = 40;
        const inner = chocoBar(fig.a[1], 1, fig.a[0], 6, 8 + (fig.la ? 18 : 0), w, h) + (fig.la ? tag(150, 18, fig.la) : '') +
          chocoBar(fig.b[1], 1, fig.b[0], 6, 70 + (fig.la ? 36 : 0), w, h) + (fig.lb ? tag(150, 98, fig.lb) : '');
        return wrap(300, fig.la ? 160 : 118, `Две одинаковые шоколадки: ${fig.a[0]} из ${fig.a[1]} и ${fig.b[0]} из ${fig.b[1]}`, inner, 320);
      }
      case 'chocogrid': { // умножение: отломили rows части по одной стороне и cols по другой
        const cw = 44, ch = 34;
        const on = (r, c) => (c < fig.c ? (r < fig.r ? true : 'half') : false); // столбцы c — что было, строки r — какую часть от этого взяли
        return wrap(fig.cols * cw + 12, fig.rows * ch + 12, `Шоколадка ${fig.rows} на ${fig.cols}, выделено ${fig.r * fig.c} долек`, chocoBar(fig.cols, fig.rows, 0, 6, 6, fig.cols * cw, fig.rows * ch, { gridOn: on }), 260);
      }
      case 'people': { // total ребят, mark из них выделены
        const per = fig.total <= 8 ? fig.total : Math.ceil(fig.total / Math.ceil(fig.total / 8)), rows = Math.ceil(fig.total / per), gx = 34, gy = 42;
        let s = ''; for (let k = 0; k < fig.total; k++) s += person(20 + (k % per) * gx, 4 + Math.floor(k / per) * gy, k < fig.mark);
        return wrap(per * gx + 6, rows * gy + 2, `${fig.total} человек, выделено ${fig.mark}`, s, Math.min(320, per * gx + 6));
      }
      case 'groups': { // groups кучек по per штук (конфеты или ребята), take кучек взяли
        const kid = fig.icon === 'person', cols = fig.per <= 4 ? 2 : 3, gr = Math.ceil(fig.per / cols), sx = kid ? 26 : 30, sy = kid ? 38 : 22;
        const bw = cols * sx + 12, bh = gr * sy + 12, perRow = Math.min(fig.groups, Math.floor(330 / (bw + 8)));
        let s = '';
        for (let g = 0; g < fig.groups; g++) {
          const bx = 4 + (g % perRow) * (bw + 8), by = 4 + Math.floor(g / perRow) * (bh + 10), on = g < fig.take;
          s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="10" fill="${on ? '#FFF1BF' : '#FFFFFF'}" stroke="${on ? '#E2B33C' : '#C3C9D2'}" stroke-width="2"${on ? '' : ' stroke-dasharray="5 4"'}/>`;
          for (let k = 0; k < fig.per; k++) {
            const cx = bx + 6 + sx / 2 + (k % cols) * sx, cy = by + 6 + Math.floor(k / cols) * sy;
            s += kid ? person(cx, cy + 2, on, .95) : candy(cx, cy + sy / 2, on);
          }
        }
        const rowsN = Math.ceil(fig.groups / perRow), vw = perRow * (bw + 8), vh = rowsN * (bh + 10);
        return wrap(vw, vh, `${fig.groups * fig.per} ${kid ? 'человек' : 'конфет'}: ${fig.groups} равных групп по ${fig.per}, выделено ${fig.take}`, s, Math.min(330, vw));
      }
    }
    return '';
  }

  // Рисунок по описанию { type, ... } → HTML
  function figure(fig) {
    if (!fig) return '';
    if(['triangle','right_triangle','circle_geo','angle','coord','graph'].includes(fig.type))return geometry(fig);
    if (SCENES.includes(fig.type)) return scene(fig);
    // значки интереса ребёнка (мячи, ракеты…): total штук, первые mark выделены. Значок — готовая картинка из VEKTOR_ART
    if (fig.type === 'icons') return `<div class="figure icons" role="img" aria-label="${fig.total} штук, выделено ${fig.mark}">${Array.from({ length: fig.total }, (_, k) => `<span class="ic${k < fig.mark ? ' on' : ''}">${fig.icon}</span>`).join('')}</div>`;
    const wrap = (vw, vh, label, inner) => `<div class="figure"><svg viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}" role="img" aria-label="${label}">${inner}</svg></div>`;
    switch (fig.type) {
      case 'labeled': return labeled(fig.n, fig.d);
      case 'circle':
        return wrap(180, 180, `Круг из ${fig.parts} частей, ${fig.empty ?? fig.parts - fig.shaded} пустые`,
          fig.empty != null ? circleSvg(fig.parts, fig.empty, 90, 90, 80, { emptyIsEaten: true }) : circleSvg(fig.parts, fig.shaded, 90, 90, 80));
      case 'bar': {
        const h = fig.label ? 70 : 46;
        return wrap(W, h, (fig.crossed ? `Полоска из ${fig.parts} частей: было закрашено ${fig.shaded}, зачёркнуто ${fig.crossed}` : `Полоска из ${fig.parts} частей, закрашено ${fig.shaded}`), barSvg(fig.parts, fig.shaded, { split: fig.split, crossed: fig.crossed, y: fig.label ? 24 : 0, label: fig.label }));
      }
      case 'pair':
        return wrap(W, 108, `Две полоски: ${fig.a[0]} из ${fig.a[1]} и ${fig.b[0]} из ${fig.b[1]}`, barSvg(fig.a[1], fig.a[0]) + barSvg(fig.b[1], fig.b[0], { y: 60 }));
      case 'line':
        return wrap(W, 72, `Числовая прямая, точка ${fig.n}/${fig.d}`, lineSvg(fig.n, fig.d));
      case 'mixed': {
        const r = 34, gap = 16, cnt = fig.whole + 1, vw = cnt * (2 * r + gap) - gap + 8;
        const inner = Array.from({ length: cnt }, (_, j) => circleSvg(fig.d, j < fig.whole ? fig.d : fig.n, r + 4 + j * (2 * r + gap), r + 4, r)).join('');
        return wrap(vw, 2 * r + 8, `${fig.whole} целых круга и ещё ${fig.n} из ${fig.d}`, inner);
      }
      case 'grid': {
        const cw = 50, chh = 34, h = fig.rows * chh + 2;
        let s = '';
        for (let r = 0; r < fig.rows; r++) for (let c = 0; c < fig.cols; c++) {
          const cls = r < fig.r && c < fig.c ? 'fig-on' : (r < fig.r || c < fig.c) ? 'fig-half' : 'fig-off';
          s += `<rect class="${cls}" x="${c * cw + 1}" y="${r * chh + 1}" width="${cw - 2}" height="${chh - 2}" rx="3"/>`;
        }
        return wrap(fig.cols * cw, h, `Прямоугольник ${fig.rows} на ${fig.cols}, закрашено ${fig.r * fig.c} клеток`, s);
      }
    }
    return '';
  }

  // Дробь с подписями: что значит верхнее и нижнее число
  function labeled(n, d) {
    return `<div class="frac-labeled" role="img" aria-label="Дробь ${n}/${d}: числитель ${n}, знаменатель ${d}">
      <span class="fl-frac">${f(n, d)}</span>
      <span class="fl-top"><b>${n}</b> — числитель (верхнее число): сколько частей взяли</span>
      <span class="fl-bot"><b>${d}</b> — знаменатель (нижнее число): на сколько равных частей разделили целое</span>
    </div>`;
  }

  /* ---------- Теги рисунков в ответах наставника ----------
     [[полоска 3/5]]  [[круг 3/8]]  [[прямая 3/4]]
     [[сравнить 1/3 1/5]]  [[прямоугольник 2/3 3/4]]  [[смешанное 2 1/3]]       */
  const FR = '(\\d{1,2})\\s*\\/\\s*(\\d{1,2})';
  const ok = (n, d, maxD = 24) => d >= 1 && d <= maxD && n >= 0 && n <= d * 4;
  function figureFromTag(tag) {
    let t = tag.trim().toLowerCase().replace(/ё/g, 'е');
    // синонимы, которые модель иногда пишет вместо названий из списка
    t = t.replace(/^(дробь|доля|полоса)\s/, 'полоска ').replace(/^(пирог)\s/, 'торт ').replace(/^(отрезок|луч|числовая прямая)\s/, 'прямая ').replace(/^(сравни|сравнение)\s/, 'сравнить ');
    let m;
    const tokens=t.split(/\s+/),kind=tokens.shift(),numbers=tokens.map(v=>v==='?'?null:Number(v));let geo=null;
    if(['triangle','треугольник'].includes(kind)&&numbers.length===3)geo={type:'triangle',a:numbers[0],b:numbers[1],c:numbers[2],showAngles:true};
    if(['right_triangle','прямоугольный_треугольник'].includes(kind)&&[2,3].includes(numbers.length))geo={type:'right_triangle',a:numbers[0],b:numbers[1],c:numbers[2]??null};
    if(['circle_geo','окружность'].includes(kind)&&numbers.length===1)geo={type:'circle_geo',r:numbers[0]};
    if(['angle','угол'].includes(kind)&&numbers.length===1)geo={type:'angle',degrees:numbers[0]};
    if(['coord','координаты'].includes(kind)&&numbers.length>=2&&numbers.length<=40&&numbers.length%2===0)geo={type:'coord',points:numbers.filter((_,i)=>i%2===0).map((x,i)=>({x,y:numbers[i*2+1]}))};
    if(['graph','график'].includes(kind)&&['linear','quadratic'].includes(tokens[0]))geo={type:'graph',kind:tokens[0],a:Number(tokens[1]),b:Number(tokens[2]),c:tokens[3]==null?0:Number(tokens[3])};
    if(geo)return geometry(geo)?geo:null;
    if ((m = t.match(new RegExp(`^(подпиши|подписи|подписанная|части)\\s+${FR}$`))) && ok(+m[2], +m[3]) && +m[3] > 0) return { type: 'labeled', n: +m[2], d: +m[3] };
    if ((m = t.match(new RegExp(`^(пицца|торт|шоколадка|шоколад)\\s+${FR}$`))) && ok(+m[2], +m[3], 12) && +m[2] <= +m[3] && +m[3] > 0) return { type: m[1] === 'пицца' ? 'pizza' : m[1] === 'торт' ? 'cake' : 'choco', parts: +m[3], have: +m[2] };
    if ((m = t.match(new RegExp(`^(полоска|bar)\\s+${FR}$`))) && ok(+m[2], +m[3]) && +m[2] <= +m[3]) return { type: 'bar', parts: +m[3], shaded: +m[2] };
    if ((m = t.match(new RegExp(`^(круг|circle)\\s+${FR}$`))) && ok(+m[2], +m[3], 16) && +m[2] <= +m[3]) return { type: 'circle', parts: +m[3], shaded: +m[2] };
    if ((m = t.match(new RegExp(`^(прямая|line)\\s+${FR}$`))) && ok(+m[2], +m[3], 16)) return { type: 'line', n: +m[2], d: +m[3] };
    if ((m = t.match(new RegExp(`^(сравнить|compare)\\s+${FR}\\s+${FR}$`))) && ok(+m[2], +m[3]) && ok(+m[4], +m[5]) && +m[2] <= +m[3] && +m[4] <= +m[5]) return { type: 'pair', a: [+m[2], +m[3]], b: [+m[4], +m[5]] };
    if ((m = t.match(new RegExp(`^(прямоугольник|умножение|grid)\\s+${FR}\\s+${FR}$`))) && +m[3] <= 8 && +m[5] <= 8 && +m[2] <= +m[3] && +m[4] <= +m[5]) return { type: 'grid', rows: +m[3], cols: +m[5], r: +m[2], c: +m[4] };
    if ((m = t.match(new RegExp(`^(смешанное|mixed)\\s+(\\d)\\s+${FR}$`))) && +m[3] < +m[4] && +m[4] <= 12) return { type: 'mixed', whole: +m[2], n: +m[3], d: +m[4] };
    return null;
  }

  /* ---------- Лаборатория дробей ---------- */
  function labHtml(id, start = { n: 3, d: 5, k: 1 }) {
    return `<div class="lab" id="${id}" data-n="${start.n}" data-d="${start.d}" data-k="${start.k}">
      <div class="lab-controls">
        <div class="lab-stepper"><span>Взяли частей</span><button type="button" data-act="n-" aria-label="Меньше частей">−</button><output data-out="n">${start.n}</output><button type="button" data-act="n+" aria-label="Больше частей">+</button></div>
        <div class="lab-stepper"><span>Разделили на</span><button type="button" data-act="d-" aria-label="Меньше долей">−</button><output data-out="d">${start.d}</output><button type="button" data-act="d+" aria-label="Больше долей">+</button></div>
        <div class="lab-stepper"><span>Разрезать каждую долю ещё на</span><button type="button" data-act="k-" aria-label="Меньше">−</button><output data-out="k">${start.k}</output><button type="button" data-act="k+" aria-label="Больше">+</button></div>
      </div>
      <div class="lab-view" aria-live="polite"></div>
    </div>`;
  }
  function labRender(el) {
    const n = +el.dataset.n, d = +el.dataset.d, k = +el.dataset.k, N = n * k, D = d * k;
    el.querySelector('[data-out="n"]').textContent = n;
    el.querySelector('[data-out="d"]').textContent = d;
    el.querySelector('[data-out="k"]').textContent = k;
    const view = el.querySelector('.lab-view');
    const whole = n >= d;
    view.innerHTML = `
      ${k > 1 ? `<div class="lab-big">${f(n, d)} = ${f(N, D)}</div>` : labeled(n, d)}
      <div class="lab-figs">
        <svg viewBox="0 0 ${W} 46" width="${W}" height="46" role="img" aria-label="Полоска: ${N} из ${D}">${barSvg(D, Math.min(N, D))}</svg>
        <svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Круг: ${N} из ${D}">${circleSvg(D, Math.min(N, D), 60, 60, 54)}</svg>
        <svg viewBox="0 0 ${W} 72" width="${W}" height="72" role="img" aria-label="Числовая прямая">${lineSvg(n, d, { max: whole ? 2 : 1 })}</svg>
      </div>
      <p class="lab-say">${n === 0 ? 'Не взяли ни одной доли — это ноль.' : n === d ? 'Взяли все доли — это одно целое.' : n > d ? `Долей больше, чем в одном целом: это ${Math.floor(n / d)} целых${n % d ? ` и ещё ${f(n % d, d)}` : ''}.` : `Целое разделили на ${d} равных частей и взяли ${n}.`}
      ${k > 1 ? ` Каждую долю разрезали на ${k}: долей стало в ${k} раза больше, но закрашено столько же.` : ''}</p>`;
  }
  function labBind(root) {
    root.querySelectorAll('.lab:not([data-bound])').forEach(el => {
      el.dataset.bound = '1';
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        let n = +el.dataset.n, d = +el.dataset.d, k = +el.dataset.k;
        ({ 'n-': () => n = Math.max(0, n - 1), 'n+': () => n = Math.min(2 * d, n + 1), 'd-': () => { d = Math.max(1, d - 1); n = Math.min(n, 2 * d); }, 'd+': () => d = Math.min(12, d + 1), 'k-': () => k = Math.max(1, k - 1), 'k+': () => k = Math.min(4, k + 1) })[b.dataset.act]();
        Object.assign(el.dataset, { n, d, k });
        labRender(el);
      });
      labRender(el);
    });
  }

  window.VEKTOR_VISUALS = { f, figure, figureFromTag, describe, labHtml, labBind, labeled };
})();
