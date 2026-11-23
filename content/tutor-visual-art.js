
/* Наглядные модели. Координаты и подписи берутся только из каталога. */
(function (root) {
  'use strict';
  const V = root.VEKTOR_VISUALS, L = root.VEKTOR_TUTOR_VISUALS;
  const ink = '#1c2d42', muted = '#46586c', line = '#c1ccd6', paper = '#fffefa';
  const green = '#06675b', mint = '#5ce0c3', purple = '#5636a1', lilac = '#bea9ff', orange = '#8a410c', gold = '#ffc46b';
  const headerColors = [
    ['#ffedd5','#9c3b20','#ff7653'], ['#dff7ee','#096250','#26c6a3'],
    ['#eae6ff','#4b2e9b','#9b79ff'], ['#fff0c5','#764609','#efae2d'],
    ['#dcedff','#124e91','#559cf8'],
  ];
  const materials = {
    apple: ['#ffb370','#ef523f','#b32837','#772532'],
    ticket: ['#d8e5ff','#859cf0','#657bd9','#344696'],
    fish: ['#ffe88c','#ffac4f','#f26a50','#9c3a2f'],
    bead: ['#ffe3ff','#cf7cec','#a958c6','#6e3682'],
    box: ['#fff0c4','#ebba77','#c8814c','#77492b'],
    drop: ['#dbf9ff','#73dafa','#298dc5','#215d91'],
    die: ['#fff1e2','#ff8469','#de4540','#8b2d30'],
  };
  const neutral = ['#fbfdff','#e2eaf1','#b3c3ce','#61748b'];
  let nextDrawing = 0;
  const colors = [mint, lilac, gold], accents = [green, purple, orange];
  const W = 360, H = 210, tau = Math.PI * 2;
  const rnd = n => Math.round(n * 100) / 100;
  const seq = n => Array.from({ length: n }, (_, i) => i);
  const safe = V.esc;
  const R = (x,y,w,h,fill,stroke='none',r=8) => `<rect x="${rnd(x)}" y="${rnd(y)}" width="${rnd(w)}" height="${rnd(h)}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
  const C = (x,y,r,fill,stroke='none') => `<circle cx="${rnd(x)}" cy="${rnd(y)}" r="${r}" fill="${fill}" stroke="${stroke}"/>`;
  const P = (pts, fill, stroke=ink, width=2) => `<polygon points="${pts.map(p => p.map(rnd).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
  const S = (x,y,xx,yy,color=ink,width=2,dash='') => `<line x1="${rnd(x)}" y1="${rnd(y)}" x2="${rnd(xx)}" y2="${rnd(yy)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${dash ? ' stroke-dasharray="' + dash + '"' : ''}/>`;
  const T = (x,y,value,{ size=14, fill=ink, anchor='middle', weight=600 }={}) =>
    `<text x="${rnd(x)}" y="${rnd(y)}" font-family="system-ui, sans-serif" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}">${safe(value)}</text>`;
  const G = (x,y,body,s=1) => `<g transform="translate(${rnd(x)} ${rnd(y)}) scale(${rnd(s)})">${body}</g>`;
  const label = (x,y,text,fill=green) => T(x,y,text,{fill,size:12});
  const footer = (a,b) => label(33,185,a,muted).replace('text-anchor="middle"','text-anchor="start"') +
    T(329,185,b,{fill:green,size:13,anchor:'end',weight:750});
  const arrow = (x,y,xx,yy,color=green) => {
    const a = Math.atan2(yy-y,xx-x);
    return S(x,y,xx,yy,color,2) + S(xx,yy,xx-8*Math.cos(a-.55),yy-8*Math.sin(a-.55),color) + S(xx,yy,xx-8*Math.cos(a+.55),yy-8*Math.sin(a+.55),color);
  };
  const card = (x,y,w,h,title,value,color=0) => {
    const fit = (size,text) => Math.min(size,(w-12)/Math.max(1,String(text).length*.62));
    return R(x,y,w,h,paper,line,12)+T(x+w/2,y+19,title,{size:fit(12,title),fill:muted})+
      T(x+w/2,y+h-15,value,{size:fit(18,value),fill:accents[color%3],weight:750});
  };

  const D = (d,fill,stroke='none',width=1.5) =>
    `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const E = (x,y,rx,ry,fill='#fff',opacity=.6) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${opacity}"/>`;
  const HIGHLIGHT = '#fff6e9';

  const icons = {
    apple: (fill,c,n,on) =>
      E(0,20,15,2,'#77514a',.24)+
      D('M0 -9C-11 -17-20 -7-17 6C-14 20-6 24 0 17C8 24 15 14 17 5C20 -6 10 -16 0 -9Z',fill,c,1.6)+
      D('M-14 6C-12 15-5 19 0 15C6 19 11 13 14 7','none',c,.8)+
      E(-10,-3,2.8,5.8)+E(-7,-8,1.7,1.1)+
      D('M0 -9Q-2 -14 2 -21','none',on?'#693e28':c,2)+
      D('M1 -12C3 -19 8 -22 16 -20C13 -13 9 -10 1 -12Z',on?'#51bd79':'#a7bac0',on?'#227052':c,1)+
      S(3,-13,12,-18,on?'#247253':c,.7),
    ticket: (fill,c) =>
      D('M-18 -11H18V-5Q9 0 18 5V11H-18V5Q-9 0-18 -5Z',fill,c,1.6)+
      R(-13,-8,25,16,'none','#f2f6ff',2)+S(-6,-8,-6,8,c,1,'2 2')+
      S(2,-3,10,-3,c,1)+S(2,0,10,0,c,1)+S(2,3,7,3,c,1),
    fish: (fill,c,n,on) =>
      D('M9 1Q-4 -17-19 0Q-8 14 9 1L20 -9L18 1L20 10Z',fill,c,1.6)+
      D('M-8 -7Q-2 -18 4 -7M-8 8Q-2 15 4 7',on?'#ffd06b':'#cfdae3',c,1.1)+
      D('M-14 1Q-2 6 8 1M-8 -3Q-4 0-8 3M-3 -3Q1 0-3 3','none',c,.9)+C(-12,-1,1.7,c)+E(-10,-5,3,1),
    bead: (fill,c) => E(1,13,10,2,'#594080',.35)+C(0,0,12,fill,c)+C(0,0,3,'#fff9f0',c)+E(-5,-5,2.8,2.2)+C(-4,-4,1,'#fff'),
    box: (fill,c) => P([[-13,-7],[0,-14],[13,-7],[13,7],[0,14],[-13,7]],fill,c,1.35)+
      P([[0,0],[13,-7],[13,7],[0,14]],'#99472429','none')+
      S(-13,-7,0,0,c,1)+S(13,-7,0,0,c,1)+S(0,0,0,14,c,1)+S(-6,-10,7,-3,'#fff0bf',1.7),
    drop: (fill,c) => D('M0 -16C-6 -7-12 1-12 7A12 12 0 0 0 12 7C12 1 6-7 0-16Z',fill,c,1.5)+
      D('M-8 4Q-9 10-3 13','none','#f0fcff',1.55)+E(-4,-2,1.5,2),
    die: (fill,c,n,on) => {
      const dots = [[-6,-6],[6,6],[6,-6],[-6,6],[-6,0],[6,0]];
      const positions = [[],[[0,0]],dots.slice(0,2),[...dots.slice(0,2),[0,0]],dots.slice(0,4),[...dots.slice(0,4),[0,0]],dots][n];
      return R(-12,-10,26,26,on?'#983a43':'#92a8ba',c,6)+R(-13,-13,26,26,fill,c,6)+
        S(-8,-10,6,-10,HIGHLIGHT,1.4)+positions.map(([x,y])=>C(x,y,1.9,c)).join('');
    },
  };
  const gradient = (id, colors, vertical=false) =>
    `<linearGradient id="${id}" x1="0%" y1="0%" x2="${vertical?'0%':'100%'}" y2="100%">${colors.map((c,i)=>
      `<stop offset="${i*50}%" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const paint = id => 'url(#'+id+')';
  function car(color, edge, reverse=false) {
    const wheels = [-17,18].map(x=>C(x,9,5.6,'#213247')+C(x,9,2.3,'#b4c5d3')).join('');
    const body = D('M-27 1Q-27 -4-21 -6L-10 -7L-2 -17H12L24 -6Q29 -4 30 1V8H-27Z',color,edge)+
      D('M-6 -8L0 -15H7V-8ZM10 -15L17 -9L10 -8Z','#d2f3ff','#316882',.9)+
      S(-20,-3,22,-3,'#fff5d7',1)+R(25,1,3,3,'#fff5ad','none',1)+wheels;
    return `<g transform="scale(${reverse?-1:1} 1)">${body}</g>`;
  }

  const cells = (cols,rows,x,y,d,fillFor) => seq(rows).map(j => seq(cols).map(i =>
    R(x+i*d,y+j*d,d-2,d-2,fillFor(i,j),line,Math.min(3,d/4))).join('')).join('');
  const bounds = (cols,rows,ww=275,hh=105) => Math.min(ww/cols,hh/rows,35);
  const numeric = text => {
    const [a,b] = String(text).replace('−','-').replace(',','.').split('/');
    return b ? Number(a)/Number(b) : Number(a);
  };
  const draw = {
    tokens([name,n,on,a,b], id, scope) {
      const cols=Math.min(6,n), rows=Math.ceil(n/cols), gap=Math.min(50,280/cols);
      const active=scope+'-active', quiet=scope+'-quiet';
      const skin=materials[name];
      const defs='<defs>'+gradient(active,skin.slice(0,3))+gradient(quiet,neutral.slice(0,3))+'</defs>';
      const sprites=seq(n).map(i => {
        const dense=rows>2, scale=dense?.67:1;
        const x=180+(i%cols-(cols-1)/2)*gap, y=106+(Math.floor(i/cols)-(rows-1)/2)*(dense?29:48);
        const onNow=i<on, number=name==='die' ? (i===0?6:i) : i;
        return G(x,y,icons[name](paint(onNow?active:quiet), onNow?skin[3]:neutral[3], number, onNow),scale)+
          (onNow?R(x-6,y+22*scale,12,3,skin[2],'none',1.5):'');
      }).join('');
      return defs+sprites+footer(a,b);
    },
    bars(rows) {
      return rows.map(([on,n,name,value,first=on],j) => {
        const y = rows.length===1 ? 110 : rows.length===2 ? 84+j*49 : 75+j*44, d=246/n;
        const edges = [...new Set([first,on])].filter(k => k>0 && k<n)
          .map(k => S(35+k*d-1.5,y-2,35+k*d-1.5,y+24,ink,1)).join('');
        return edges + T(35,y-9,name,{size:12,fill:muted,anchor:'start'}) + T(326,y-9,value,{size:13,fill:green,anchor:'end'}) +
          seq(n).map(i => R(35+i*d,y,d-3,22,i<first ? mint : i<on ? lilac : '#e7eeec',i<on ? (i<first?green:purple) : line,4)).join('');
      }).join('');
    },
    'same-segments'([parts,size]) {
      return parts.map((n,i) => {
        const y=87+i*53;
        return seq(n).map(j=>R(45+j*75,y,71,22,colors[i],accents[i],5)).join('')+
          T(45,y-8,n*size+' см',{anchor:'start',fill:accents[i],size:12});
      }).join('')+footer('Каждый отрез',''+size+' см');
    },
    line([min,max,ticks,marks]) {
      const x = v => 36+(v-min)/(max-min)*278;
      return arrow(30,122,329,122,ink) + ticks.map(s => {
        const k=x(numeric(s)); return S(k,117,k,127,muted)+label(k,148,s,muted);
      }).join('') + marks.map(([v,name],i) => {
        const k=x(v), y=i%2===0?87:69, color=accents[i%3];
        return S(k,y+7,k,115,color,1.5,'3 3')+C(k,122,5,colors[i%3],color)+label(k,y,name,color);
      }).join('');
    },
    grid([cols,rows,onC,onR,a,b,mode]) {
      const d=bounds(cols,rows), x=180-cols*d/2, y=112-rows*d/2;
      const marked = (i,j) => mode==='diagonal' ? i+j===cols-1 : mode==='cut' ? i>=cols-onC && j<onR : i<onC && j<onR;
      const dots = seq(rows).map(j => seq(cols).map(i => marked(i,j)
        ? C(x+(i+.5)*d-1,y+(j+.5)*d-1,Math.min(2,d/7),mode==='cut'?purple:green) : '').join('')).join('');
      return cells(cols,rows,x,y,d,(i,j) => {
        if (mode==='diagonal') return i+j===cols-1?mint:paper;
        if (mode==='cut') return i>=cols-onC && j<onR ? lilac : mint;
        if (i<onC && j<onR) return mint;
        if (onC && onR && cols===3 && rows===4 && (i<onC || j<onR)) return lilac;
        return paper;
      }) + dots + (onC===0 ? R(x-1,y-1,cols*d,rows*d,'none',green,4) : '') + footer(a,b);
    },
    table([header,rows]) {
      const rowsAll=[header,...rows], rowH=Math.min(34,116/rowsAll.length), top=65+(116-rowsAll.length*rowH)/2;
      const units=header.map((_,i)=>Math.max(7,...rowsAll.map(row=>String(row[i]).length+3)));
      const factor=290/units.reduce((sum,n)=>sum+n,0);
      return rowsAll.map((row,j) => row.map((v,i) => {
        const colW=units[i]*factor, x=35+units.slice(0,i).reduce((sum,n)=>sum+n,0)*factor, y=top+j*rowH;
        return R(x,y,colW-3,rowH-3,j===0 ? mint : j%2===0 ? '#eae4f6' : paper,line,5) +
          T(x+(colW-3)/2,y+(rowH-3)/2+4,v,{size:String(v).length>11?9:12,fill:j===0?green:ink,weight:j===0?750:600});
      }).join('')).join('');
    },
    groups([icon,ns,labels]) {
      const w=Math.min(126,288/ns.length);
      return ns.map((n,i) => {
        const x=180+(i-(ns.length-1)/2)*w, c=accents[i%3];
        return R(x-w/2+3,66,w-6,93,paper,line,12) + seq(n).map(j => G(x+(j%2-.5)*26,88+Math.floor(j/2)*25,icons[icon](colors[i%3],c,j),.7)).join('') + label(x,148,labels[i],c);
      }).join('');
    },
    arrays(pairs) {
      const d=Math.min(...pairs.map(([c,r]) => bounds(c,r,122,91)));
      return pairs.map(([c,r],i) => {
        const x=100+i*160;
        return cells(c,r,x-c*d/2,108-r*d/2,d,()=>colors[i%3])+label(x,176,c+' × '+r,accents[i%3]);
      }).join('');
    },
    flow(items,id) {
      const marks = {
        'divide-by-five': ['25','40','27'],
        'coin-change': ['●','−','='],
        'map-scale': ['|–|','1 : n','↔'],
        'permutation-books': ['Ⅰ','Ⅱ','Ⅲ'],
        'miss-first-then-hit': ['−','+','×'],
        'lottery-total': ['•••','•','Σ'],
      }[id];
      const d=items.length===3?98:145, w=d-17;
      return items.map(([a,b],i) => {
        const x=180+(i-(items.length-1)/2)*d;
        const top = marks ? (
          id==='coin-change' ? C(x,160,9,gold,orange)+C(x,160,5,paper,orange) :
          id==='map-scale' ? S(x-25,160,x+25,160,green,2)+S(x-25,156,x-25,164,green,1)+S(x+25,156,x+25,164,green,1) :
          id==='permutation-books' ? seq(3-i).map(k=>R(x-15+k*11,152,8,18,colors[k],accents[k],2)).join('') :
          id==='lottery-total' ? seq(i===0?5:i===1?1:2).map(k=>C(x-15+k*8,160,3,colors[i],accents[i])).join('') :
          id==='miss-first-then-hit' ? (i===2 ? S(x-6,154,x+6,166,purple,2)+S(x-6,166,x+6,154,purple,2) : C(x,160,9,colors[i],accents[i])) :
          R(x-16,153,32,15,colors[i],accents[i],5)
        ) + (id==='map-scale'||id==='permutation-books'||id==='lottery-total'?'':label(x,164,marks[i],ink)) : '';
        return (i?arrow(x-d+w/2+2,113,x-w/2-3,113):'')+card(x-w/2,81,w,64,a,b,i)+top;
      }).join('');
    },
    motion([a,b,title]) {
      return R(28,98,304,39,'#596879','#3a4e65',10)+S(42,118,318,118,'#fff3c1',2,'12 10')+
        S(42,103,318,103,'#e8f0ef',1)+S(42,132,318,132,'#e8f0ef',1)+
        arrow(65,76,143,76,green)+arrow(295,76,217,76,orange)+
        G(68,117,car('#36cdb8','#126f6a'))+G(292,117,car('#ff8d56','#933624',true))+
        label(69,156,a)+label(292,156,b,orange)+label(180,184,title,muted);
    },
    cars([direction,first,second,distance,movingFirst,movingSecond,sameStart]) {
      const firstRight=direction!=='вразъезд', secondRight=direction!=='навстречу';
      const road = R(27,78,306,84,'#596879','#3a4e65',12)+
        S(39,120,322,120,'#fff3c1',1.8,'9 7');
      const vehicle = (x,y,right,moving,speed,color,edge,labelX=x) => {
        const sign=right?1:-1, a=x+sign*35, b=x+sign*55;
        const mark=moving?arrow(a,y-3,b,y-3,'#fff5c1'):'';
        return G(x,y,car(color,edge,!right))+mark+label(labelX,68,speed+' км/ч',edge);
      };
      const xA=sameStart?180:88, xB=sameStart?180:272;
      const a=vehicle(xA,102,firstRight,movingFirst,first,'#36cdb8','#096258',sameStart?105:xA);
      const b=vehicle(xB,143,secondRight,movingSecond,second,'#ff8d56','#933624',sameStart?255:xB);
      if (sameStart) {
        return road+S(180,81,180,159,'#fff',1,'3 5')+a+b+label(180,187,'Одна точка старта · 0 км',muted);
      }
      const measure=S(xA,172,xB,172,muted,1.2)+C(xA,172,2.5,ink)+C(xB,172,2.5,ink)+
        label(180,192,'Расстояние в начале · '+distance+' км',muted);
      return road+a+b+measure;
    },
    battery([on,n], id, scope) {
      const x=77, y=90, grad=scope+'-charge';
      return '<defs>'+gradient(grad,['#efffb8','#98eb68','#43bc6a'],true)+'</defs>'+
        R(x-3,y+4,208,57,'#d8e3ed','none',13)+R(x,y,199,57,'#f6fcff','#293f58',12)+
        R(x+199,y+17,11,23,'#405877','none',4)+seq(n).map(i=>{
          const left=x+8+46*i, active=i<on;
          return R(left,y+8,41,41,active?paint(grad):'#e5eef3',active?'#26714a':'#9eb2c2',5)+
            (active?S(left+7,y+14,left+34,y+14,'#f7ffd5',2):'');
        }).join('')+footer('Заполнено '+on+' из '+n,on+'/'+n);
    },
    tank([n,on,a,b], id, scope) {
      const x=124, y=60, w=105, h=113, level=y+5+(n-on)*(h-10)/n, water=scope+'-water';
      return '<defs>'+gradient(water,['#a0e5ff','#61cdf3','#349cdd'],true)+'</defs>'+
        D('M224 84Q267 76 264 114Q263 139 228 143M226 93Q256 88 254 113Q254 130 227 132','none','#7dacbd',2.1)+
        R(x,y,w,h,'#edfaff','#6e9fb7',12)+R(x+5,level,w-10,on*(h-10)/n,paint(water),'none',7)+
        S(x+9,level+1,x+w-10,level+1,'#e3fbff',1.9)+S(x+13,y+15,x+13,y+h-15,'#fff',2.6)+
        seq(n+1).map(i=>S(x+w-22,y+5+i*(h-10)/n,x+w-6,y+5+i*(h-10)/n,'#215a78',1)).join('')+
        label(252,70,b,muted)+label(177,128,a,'#083d58');
    },
    branches([parents,children],id) {
      const m=parents.length, n=children.length, gap=Math.min(27,122/(m*n-1)), start=115-(m*n-1)*gap/2;
      return parents.map((a,i) => {
        const yy=start+(i*n+(n-1)/2)*gap, c=accents[i%3];
        return S(43,115,126,yy,c,2) + R(104,yy-9,86,18,colors[i%3],line,6)+label(147,yy+4,a,c) +
          children.map((b,j) => {
            const y=start+(i*n+j)*gap;
            const end=id==='two-coin-tree'?C(254,y,6,gold,orange)+C(254,y,3,paper,orange):
              id==='two-route-tree'?R(247,y-5,14,10,paper,c,3):
              id==='lunch-tree'?C(254,y,5,colors[i%3],c):
              id==='three-two-options'?R(249,y-4,10,8,colors[i%3],c,2):C(257,y,2,c);
            return S(190,yy,257,y,c,1.5)+end+T(270,y+4,b,{anchor:'start',size:11,fill:c});
          }).join('');
      }).join('')+C(43,115,7,mint,green);
    },
    ordered([items,medals]) {
      const pairs=items.flatMap(a=>items.filter(b=>b!==a).map(b=>[a,b]));
      return pairs.map(([a,b],i)=>G(43+(i%3)*95,62+Math.floor(i/3)*55, medals
        ? R(7,12,26,31,mint,green,4)+R(41,20,26,23,lilac,purple,4)+T(20,35,a,{fill:green})+T(54,37,b,{fill:purple})
        : R(0,0,78,35,paper,line,8)+T(21,23,a,{fill:green})+arrow(31,17,48,17,muted)+T(61,23,b,{fill:purple}))).join('') +
        footer(medals?'1-е и 2-е места':'1-й и 2-й знаки',pairs.length+' вариантов');
    },
    angle([d,split]) {
      const x=167,y=151,rad=d*tau/360, r=83, end=[x+r*Math.cos(rad),y-r*Math.sin(rad)];
      const arc=(q,u)=>`<path d="M${x+q} ${y} A${q} ${q} 0 0 0 ${rnd(x+q*Math.cos(u))} ${rnd(y-q*Math.sin(u))}" fill="none" stroke="${green}" stroke-width="3"/>`;
      return arrow(x,y,x+106,y)+arrow(x,y,...end,purple)+(split?arrow(x,y,x-108,y):'')+
        (d===90?S(x+16,y,x+16,y-16,green)+S(x+16,y-16,x,y-16,green):arc(38,rad))+
        label(x+48*Math.cos(rad/2),y-48*Math.sin(rad/2)-5,d+'°')+(split?label(100,132,(180-d)+'°',purple):'')+C(x,y,4,green);
    },
    path([points,names]) {
      const map = ([a,b]) => [90+a*28,183-b*28], mapped=points.map(map);
      return mapped.slice(1).map(([x,y],i)=> {
        const [a,b]=mapped[i];
        return S(a,b,x,y,accents[i%3],4)+label((a+x)/2,(b+y)/2-9,names[i],accents[i%3]);
      }).join('')+mapped.map(([x,y])=>C(x,y,4,paper,green)).join('');
    },
    cube([w,d,h]) {
      const u=Math.min(34,220/(w+d*.52),103/(h+d*.43)), x=180-(w+d*.52)*u/2, y=160;
      const point=(a,b,c)=>[x+(a+b*.52)*u,y-(c+b*.43)*u];
      const face=(corners,fill) => P(corners.map(p=>point(...p)),fill,green,1.2);
      let s='';
      for(let j=d-1;j>=0;j--) for(let i=0;i<w;i++) s+=face([[i,j,h],[i+1,j,h],[i+1,j+1,h],[i,j+1,h]],mint);
      for(let j=0;j<d;j++) for(let k=0;k<h;k++) s+=face([[w,j,k],[w,j+1,k],[w,j+1,k+1],[w,j,k+1]],lilac);
      for(let i=0;i<w;i++) for(let k=0;k<h;k++) s+=face([[i,0,k],[i+1,0,k],[i+1,0,k+1],[i,0,k+1]],gold);
      return s+footer('Размеры',w+' × '+d+' × '+h);
    },
    net(pts) {
      return pts.map(([i,j],k)=>R(103+i*39,60+j*39,39,39,colors[k%3],ink,2)).join('')+
        footer('Развёртка','6 граней');
    },
    temp([a,b]) {
      const yy=n=>123-n*6;
      return R(160,64,32,98,paper,line,15)+C(176,165,18,mint,green)+S(176,159,176,yy(b),green,7)+
        [a,b].map((n,i)=>S(192,yy(n),228,yy(n),accents[i],1,'4 3')+label(246,yy(n)+4,n+'°',accents[i])).join('')+
        label(110,117,'+ '+(b-a)+'°',green);
    },
    graph([lines,points,inverse]) {
      const X=x=>170+x*19, Y=y=>122-y*12;
      let s=seq(11).map(i=>S(X(i-5),Y(-5),X(i-5),Y(5),line,1)+S(X(-5),Y(i-5),X(5),Y(i-5),line,1)).join('');
      s+=arrow(X(-5.5),Y(0),X(5.5),Y(0),ink)+arrow(X(0),Y(-5.5),X(0),Y(5.5),ink)+label(X(5.6),Y(-1.1),'x',muted)+label(X(.75),Y(5.3),'y',muted)+label(X(-.6),Y(-1.1),'0',muted);
      for(const [i,[a,b,name]] of lines.entries()){
        const [lo,hi]=a===0?[-5,5]:[(-5-b)/a,(5-b)/a].sort((l,r)=>l-r);
        const from=Math.max(-5,lo), to=Math.min(5,hi);
        s+=S(X(from),Y(a*from+b),X(to),Y(a*to+b),accents[i],3)+label(295,87+i*22,name,accents[i]);
      }
      if(inverse) for(const i of seq(24)){
        const a=.8+i*.17,b=a+.17;
        s+=S(X(a),Y(4/a),X(b),Y(4/b),green,2.5);
      }
      return s+points.map(([x,y,name],i)=>C(X(x),Y(y),4,colors[i%3],accents[i%3])+label(X(x)+12,Y(y)-6,name,accents[i%3])).join('');
    },
    'function-plot'([specs,points], id, scope) {
      const xExtent = Math.max(4,...points.map(([x])=>Math.abs(x)));
      const roundRange = n => {
        const unit=10**Math.floor(Math.log10(n));
        return ([1,2,5,10].find(step=>step*unit>=n))*unit;
      };
      const xmax=roundRange(xExtent), plotWidth=266, plotHeight=93, left=47, top=64;
      const tick = n=>String(rnd(n)).replace('-', '−').replace('.',',');
      const functions = specs.map(({kind,values:[a,b=0,c=0],printed:[as,bs='0',cs='0']}) => {
        const write = raw => raw.replace('-','−');
        const multiply = (value,raw,variable) => value===1?variable:value===-1?'−'+variable:
          (raw.includes('/')?'('+write(raw)+')':write(raw))+variable;
        const absolute = raw => raw.replace(/^-/,'');
        const add = (value,raw,symbol='') => value===0?'':(value<0?' − ':' + ')+
          (symbol ? multiply(Math.abs(value),absolute(raw),symbol) : absolute(raw));
        if (kind==='h') return { evaluate:x=>a/x, label:'y = '+(as.includes('/')?'('+write(as)+')':write(as))+'/x', split:true };
        if (kind==='q') return { evaluate:x=>a*x*x+b*x+c, vertex:-b/(2*a), label:'y = '+multiply(a,as,'x²')+add(b,bs,'x')+add(c,cs) };
        return { evaluate:x=>a*x+b, label:'y = '+(a===0?write(bs):multiply(a,as,'x')+add(b,bs)) };
      });
      const heights = functions.flatMap(f => (f.split?[-1,1]:[-xmax,0,xmax,f.vertex].filter(x=>Math.abs(x)<=xmax)).map(f.evaluate));
      const ymax = roundRange(Math.max(3,...heights.map(Math.abs),...points.map(([,y])=>Math.abs(y))));
      const X=x=>left+plotWidth*(x+xmax)/(2*xmax), Y=y=>top+plotHeight*(ymax-y)/(2*ymax);
      const clip=scope+'-plot';
      const grid=seq(9).map(i=>{
        const x=-xmax+i*xmax/4, y=-ymax+i*ymax/4;
        return S(X(x),Y(-ymax),X(x),Y(ymax),line,1)+S(X(-xmax),Y(y),X(xmax),Y(y),line,1);
      }).join('');
      const axes=arrow(left,Y(0),left+plotWidth+11,Y(0),ink)+arrow(X(0),top+plotHeight,X(0),top-7,ink)+
        label(left+plotWidth+20,Y(0)+4,'x',muted)+label(X(0)+12,top-7,'y',muted)+
        label(left,Y(0)+16,tick(-xmax),muted)+label(left+plotWidth-5,Y(0)+16,tick(xmax),muted)+
        T(X(0)-7,top+4,tick(ymax),{size:10,anchor:'end',fill:muted})+
        T(X(0)-7,top+plotHeight+3,tick(-ymax),{size:10,anchor:'end',fill:muted});
      const paths=functions.map((func,i)=>{
        const intervals=func.split?[[-xmax,-xmax/160],[xmax/160,xmax]]:[[-xmax,xmax]];
        const parts=intervals.map(([lo,hi])=>{
          const points=seq(81).map(k=>lo+(hi-lo)*k/80).map(x=>rnd(X(x))+' '+rnd(Y(func.evaluate(x))));
          return 'M'+points.join('L');
        }).join('');
        return D(parts,'none',accents[i],2.15);
      }).join('');
      const markers=points.map(([x,y,name])=>{
        const labelX=X(x)+(x>0?-7:7), labelY=Y(y)+(y>ymax*.6?13:-7);
        return C(X(x),Y(y),4,gold,ink)+T(labelX,labelY,name,{size:10,anchor:x>0?'end':'start'});
      }).join('');
      const legends=functions.map((func,i)=>S(46,169+i*12,57,169+i*12,accents[i],2)+
        T(64,172+i*12,func.label,{anchor:'start',size:11,fill:accents[i]})).join('');
      return `<defs><clipPath id="${clip}">${R(left,top,plotWidth,plotHeight,'#fff','none',0)}</clipPath></defs>`+
        grid+axes+`<g clip-path="url(#${clip})">${paths}</g>`+markers+legends;
    },
    circle([r,d]) {
      return C(159,115,53,paper,green)+S(106,115,212,115,purple,2)+S(159,115,188,71,green,3)+C(159,115,3,ink)+label(253,83,r)+label(257,121,d,purple);
    },
    mirror([v]) {
      const shape=v===2?[[51,139],[51,103],[90,76],[124,105],[124,139]]:[[62,144],[131,144],[94,80]];
      const other=shape.map(([x,y])=>[360-x,y]);
      return S(180,61,180,166,muted,2,'5 5')+P(shape,mint,green)+P(other,lilac,purple)+
        (v===2?S(124,105,236,105,muted,1.4,'4 4'):'')+footer(v===2?'Ось симметрии':'Совмещение',v===2?'Равные расстояния':'Равные фигуры');
    },
    rails() {
      return S(52,83,308,83,green,3)+S(52,145,308,145,purple,3)+S(183,83,183,145,ink,3)+
        S(184,96,197,96,ink,1)+S(197,96,197,84,ink,1)+label(240,118,'Перпендикуляр');
    },
    triangles(labels) {
      const bases=[[[26,133],[113,133],[69,79]],[[0,54],[0,0],[78,54]],[[0,54],[83,54],[84+18,1]]];
      return bases.map((pts,i)=>{
        const mat=i?pts.map(([x,y])=>[x+30+i*103,y+79]):pts;
        return P(mat,colors[i],accents[i])+T(70+i*107,158,labels[i],{size:10,fill:accents[i]});
      }).join('');
    },
    balance([left,right]) {
      return S(177,77,177,149,ink,3)+S(150,149,204,149,ink,3)+S(75,91,279,91,green,3)+C(177,91,6,mint,green)+
        [left,right].map((arr,i)=>{
          const x=i?279:75;
          return S(x,91,x-37,131,muted,1)+S(x,91,x+37,131,muted,1)+R(x-41,130,82,10,colors[i],accents[i],4)+
            arr.map((v,k)=>R(x-12+(k-(arr.length-1)/2)*29,103,24,26,paper,line,4)+T(x+(k-(arr.length-1)/2)*29,122,v,{size:16,fill:accents[i]})).join('');
        }).join('')+footer('Обе чаши','Равны');
    },
    interval([a,b,left,right]) {
      const x=100,xx=250;
      return arrow(41,124,318,124,ink)+S(x,124,xx,124,green,5)+C(x,124,7,left?green:paper,green)+C(xx,124,7,right?green:paper,green)+label(x,152,a)+label(xx,152,b);
    },
    'square-sum'([a,b]) {
      const u=100/(a+b), k=a*u, j=b*u, x=118,y=63;
      return [[x,y,k,k,mint,a*a],[x+k,y,j,k,lilac,a*b],[x,y+k,k,j,lilac,a*b],[x+k,y+k,j,j,gold,b*b]].map(([xx,yy,w,h,c,v])=>
        R(xx,yy,w,h,c,ink,2)+T(xx+w/2,yy+h/2+4,v,{size:14})).join('')+footer('Две одинаковые части','2 · '+a+' · '+b);
    },
    triangle([a,b,c,note]) {
      const rad=x=>x*tau/360, length=Math.sin(rad(b))/Math.sin(rad(c));
      const ox=75,oy=145,scale=Math.min(210,76/Math.max(.1,length*Math.sin(rad(a)))), vx=ox+scale*length*Math.cos(rad(a)),vy=oy-scale*length*Math.sin(rad(a));
      return P([[ox,oy],[ox+scale,oy],[vx,vy]],mint,green,2)+label(ox-11,oy+13,a+'°')+
        label(ox+scale+15,oy+13,b+'°')+label(vx,vy-9,c+'°',purple)+label(180,186,note,muted);
    },
    columns([labels,counts,mean]) {
      const max=Math.max(1,...counts,mean||0), x0=50,y=157, dx=264/counts.length, k=77/max;
      return S(39,y,322,y,muted,1) + counts.map((n,i)=>{
        const x=x0+i*dx;
        return R(x,y-n*k,dx-20,n*k,colors[i%3],accents[i%3],5)+label(x+(dx-20)/2,y-n*k-7,n,accents[i%3])+label(x+(dx-20)/2,177,labels[i],muted);
      }).join('')+(mean?S(36,y-mean*k,328,y-mean*k,orange,2,'6 4'):'');
    },
    network([edges,n=4]) {
      const pts=n===3?[[180,66],[111,143],[249,143]]:[[83,78],[260,78],[99,156],[260,156]];
      return edges.map(([a,b],i)=>S(...pts[a],...pts[b],accents[i%3],2)).join('')+
        pts.map(([x,y],i)=>C(x,y,15,colors[i%3],accents[i%3])+T(x,y+5,['А','Б','В','Г'][i],{fill:accents[i%3]})).join('');
    },
    venn([a,b,left,intersection,right]) {
      const same=left==='0'&&right==='0', noOverlap=intersection==='0';
      const x=same?180:noOverlap?114:145, xx=same?180:noOverlap?246:215, r=51;
      return C(x,116,r,mint,green)+C(xx,116,r,'#e1d8f499',purple)+label(102,60,a)+label(258,60,b,purple)+
        (same?'':label(x-12,121,left))+label(180,noOverlap?179:121,intersection,purple)+(same?'':label(xx+12,121,right,purple));
    },
    band([a,b,c,d,value]) {
      const X=n=>46+(n-a)/(b-a)*268;
      return R(46,102,268,26,'#e6eeeb',line,8)+R(X(c),102,X(d)-X(c),26,mint,green,6)+
        [a,c,d,b].filter((v,i,all)=>all.indexOf(v)===i).map(n=>S(X(n),127,X(n),134,muted,1)+label(X(n),152,n,muted)).join('')+
        label((X(c)+X(d))/2,88,value);
    },
    target([a,b]) {
      return C(146,115,57,'#eaf4ff','#4077b2')+C(146,115,57*b/a,'#ffad76','#a74425')+
        S(146,115,203,115,'#326297',2)+S(146,115,146,115-57*b/a,'#963f20',2)+C(146,115,3,ink)+
        T(227,104,'R = '+a,{anchor:'start',fill:'#234f81'})+T(227,129,'r = '+b,{anchor:'start',fill:'#9b3c22'});
    },
  };
  function panel(item, palette) {
    const [tint,pigment,accent]=headerColors[palette];
    const size=item.title.length>24?13:15, scope='bip-visual-'+(++nextDrawing);
    return R(1,1,W-2,H-2,paper,line,20)+R(16,15,W-32,29,tint,'none',10)+
      T(29,34,item.title,{size,anchor:'start',weight:750,fill:pigment})+
      C(328,29.5,4.5,accent)+draw[item.kind](item.data,item.id,scope);
  }
  V.register('tutor-diagram', {
    describe: ({id}) => L.get(id)?.note || '',
    render: ({id}) => {
      const item=L.get(id);
      return item ? V.svgWrap(W,H,item.title+'. '+item.note,panel(item,item.grade-5)) : '';
    },
  });
  const describeParts = ({parts}) => parts.map(p=>p.title+'. '+p.note).join(' ');
  V.register('tutor-construction', {
    describe: describeParts,
    render: fig => {
      const gap=8, height=fig.parts.length*(H+gap)-gap;
      const pieces=fig.parts.map((part,i)=>G(0,i*(H+gap),panel(part,[1,2,0][i]))).join('');
      return V.svgWrap(W,height,describeParts(fig),pieces);
    },
  });
})(window);
