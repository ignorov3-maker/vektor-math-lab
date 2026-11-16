/* =========================================================
   Наглядные модели дробей: полоска, круг, пара полосок,
   числовая прямая, прямоугольник для умножения, смешанное число.
   Используются в методичках, задачах, чате наставника и лаборатории.
   ========================================================= */
(function () {
  'use strict';

  const f = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
  const W = 300;
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

  // Рисунок по описанию { type, ... } → HTML
  function figure(fig) {
    if (!fig) return '';
    if(['triangle','right_triangle','circle_geo','angle','coord','graph'].includes(fig.type))return geometry(fig);
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
    t = t.replace(/^(дробь|доля|полоса)\s/, 'полоска ').replace(/^(торт|пирог)\s/, 'круг ').replace(/^(отрезок|луч|числовая прямая)\s/, 'прямая ').replace(/^(сравни|сравнение)\s/, 'сравнить ');
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
    if ((m = t.match(new RegExp(`^(полоска|bar)\\s+${FR}$`))) && ok(+m[2], +m[3]) && +m[2] <= +m[3]) return { type: 'bar', parts: +m[3], shaded: +m[2] };
    if ((m = t.match(new RegExp(`^(круг|пицца|circle)\\s+${FR}$`))) && ok(+m[2], +m[3], 16) && +m[2] <= +m[3]) return { type: 'circle', parts: +m[3], shaded: +m[2] };
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
