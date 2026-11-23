/* Описание рисунка данными. Браузер и генератор методички используют один формат. */
(function (root) {
  'use strict';

  const LIMIT = 300;
  const MAX_PARTS = 3;
  const fail = message => { throw new Error(message); };
  const fits = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
  const decimal = raw => Number(String(raw).replace(/−/g, '-').replace(',', '.'));
  const format = n => String(Math.round(n*10000)/10000).replace('-', '−').replace('.', ',');
  function number(raw, min = -10000, max = 10000) {
    const text = String(raw);
    const parts = text.split('/');
    if (!parts.every(part => /^[+\-−]?\d+(?:[.,]\d{1,4})?$/.test(part)) || parts.length > 2)
      fail('Используй число или дробь, например −2, 0,5 или 3/4.');
    if (parts.length===2 && decimal(parts[1])<=0) fail('Знаменатель должен быть положительным.');
    const value = decimal(parts[0])/(parts.length === 2 ? decimal(parts[1]) : 1);
    if (!fits(value, min, max)) fail('Число должно быть от ' + min + ' до ' + max + '.');
    return value;
  }
  function integer(raw,min,max) {
    const n = number(raw,min,max);
    if (!Number.isInteger(n)) fail('Здесь нужно целое число.');
    return n;
  }
  function fraction(raw,max=16) {
    const m = String(raw).match(/^(\d{1,2})\/(\d{1,2})$/);
    if (!m || !fits(+m[2],1,max) || !fits(+m[1],0,+m[2]))
      fail('Введи долю целого, например 3/8. Знаменатель от 1 до ' + max + '.');
    return [+m[1],+m[2]];
  }
  function label(text,max=24) {
    if (!text || text.length > max || /[<>&"$\\[\]\x00-\x1f]/.test(text))
      fail('Сделай подпись короче. Используй от 1 до ' + max + ' букв, цифр или математических символов.');
    return text;
  }
  function count(args,min,max=min) {
    if (!fits(args.length,min,max)) fail('Проверь число значений в этой части рисунка.');
  }
  function size(raw,dimensions,min=1,max=12) {
    const dims=String(raw).toLowerCase().split(/[xх×]/);
    count(dims,dimensions);
    return dims.map(x=>integer(x,min,max));
  }
  const item = (kind,data,note) => ({kind,data,note});
  const objects = {
    яблоки:'apple', билеты:'ticket', рыбки:'fish', бусины:'bead', коробки:'box', капли:'drop', грани:'die',
  };

  const types = [
    {
      id:'доли', name:'Полоски дробей', example:'3/8 5/8',
      hint:'От одной до трёх дробей. Полоски показывают одинаковое целое.',
      compile(args) {
        count(args,1,3);
        const rows=args.map((a,i)=>[...fraction(a),'Полоска '+(i+1),a]);
        return item('bars',rows,'Полоски одинаковой длины. Доли: '+args.join(', ')+'.');
      },
    },
    {
      id:'предметы', name:'Доли предметов', example:'яблоки 3/12',
      hint:'Яблоки, билеты, рыбки, бусины, коробки, капли или грани. До 24 предметов.',
      compile(args) {
        count(args,2);
        const [name,raw]=args, key=Object.hasOwn(objects,name)?objects[name]:null;
        if (!key) fail('Выбери предмет из списка под полем.');
        const [on,total]=fraction(raw,24);
        if (key==='die' && total!==6) fail('У кубика шесть граней.');
        return item('tokens',[key,total,on,on+' из '+total,raw],name+', выделено '+on+' из '+total+'.');
      },
    },
    {
      id:'прямая', name:'Числовая прямая', example:'0 1 1/6 1/3 3/4',
      hint:'Начало, конец и до пяти точек. Допускаются дроби и отрицательные числа.',
      compile(args) {
        count(args,3,7);
        const [a,b,...marks]=args, low=number(a), high=number(b);
        if (low>=high) fail('Начало прямой должно быть левее конца.');
        const points=marks.map(text=>[number(text,low,high),text]);
        if (new Set(points.map(([n])=>n)).size!==points.length) fail('Укажи разные точки.');
        points.sort(([a],[b])=>a-b);
        return item('line',[low,high,[a,b],points],'От '+a+' до '+b+'. Точки '+marks.join(', ')+'.');
      },
    },
    {
      id:'график', name:'Функции и точки', example:'1:0 1:2 @2:4:A',
      hint:'a:b означает y = ax + b. q:a:b:c — парабола, h:k — y = k/x, @x:y:A — точка. До трёх функций и пяти точек.',
      compile(args) {
        count(args,1,8);
        const functions=[], points=[];
        for(const value of args){
          const head = value[0];
          const fields = (head==='@' ? value.slice(1) : value).split(':');
          if (head==='@') {
            count(fields,2,3);
            points.push([number(fields[0],-100,100),number(fields[1],-100,100),label(fields[2]||String.fromCharCode(65+points.length),6)]);
          } else {
            const kind=fields[0]==='q'||fields[0]==='h'?fields.shift():'linear';
            count(fields,kind==='q'?3:kind==='h'?1:2);
            const values=fields.map(raw=>number(raw,-100,100));
            if (kind!=='linear' && values[0]===0) fail('Коэффициент параболы или обратной пропорциональности должен отличаться от нуля.');
            const printed=fields.map(raw=>raw.replace(/^\+/,'').replace('−','-').replace(/\./g,','));
            functions.push({kind,values,printed});
          }
        }
        count(functions,0,3);
        count(points,0,5);
        return item('function-plot',[functions,points],'Функции и точки на одной координатной плоскости. Данные: '+args.join('; ')+'.');
      },
    },
    {
      id:'таблица', name:'Таблица сравнения', example:'"Часы;1;2" "Без доплаты;100 ₽;200 ₽" "С доплатой;150 ₽;250 ₽"',
      hint:'Каждая строка в кавычках. Ячейки через точку с запятой. До пяти колонок и пяти строк.',
      compile(args) {
        count(args,2,5);
        const rows=args.map(arg=>arg.split(';').map(x=>label(x.trim(),18)));
        count(rows[0],2,5);
        if(rows.some(row=>row.length!==rows[0].length)) fail('У всех строк должно быть одинаковое число ячеек.');
        return item('table',[rows[0],rows.slice(1)],'Таблица. '+rows.map(row=>row.join(', ')).join('. ')+'.');
      },
    },
    {
      id:'столбцы', name:'Столбчатая диаграмма', example:'"Пн:2" "Вт:4" "Ср:3" "Чт:5"',
      hint:'Подпись и число через двоеточие. От двух до шести столбцов.',
      compile(args) {
        count(args,2,6);
        const labels=[], values=[];
        for(const arg of args){
          const pair=arg.split(':');
          count(pair,2);
          labels.push(label(pair[0].trim(),12));
          values.push(number(pair[1],0,10000));
        }
        return item('columns',[labels,values],'Столбцы: '+labels.map((name,i)=>name+' — '+format(values[i])).join(', ')+'.');
      },
    },
    {
      id:'сетка', name:'Площадь на сетке', example:'5x4 3x2',
      hint:'Размер сетки, размер выделения. Для вырезанного угла добавь вырез.',
      compile(args) {
        count(args,2,3);
        const [w,h]=size(args[0],2), [a,b]=size(args[1],2,0);
        if (a>w || b>h) fail('Выделение должно целиком помещаться в сетке.');
        if (args[2] && args[2]!=='вырез') fail('Дополнительный режим сетки — вырез.');
        const cut=args[2]==='вырез', marked=a*b, total=w*h, active=cut?total-marked:marked;
        return item('grid',[w,h,a,b,cut?'Осталось':'Выделено',active+' из '+total,cut?'cut':'area'],
          'Сетка '+w+' × '+h+'. '+(cut?'После выреза осталось ':'Выделено ')+active+' из '+total+' клеток.');
      },
    },
    {
      id:'отрезок', name:'Часть отрезка', example:'3 11 5 7',
      hint:'Четыре границы. Сначала весь отрезок, затем его выделенная часть.',
      compile(args) {
        count(args,4);
        const [a,b,c,d]=args.map(x=>number(x));
        if (!(a < b && a <= c && c < d && d <= b)) fail('Выделенный отрезок должен быть внутри целого.');
        const part=format(d-c), whole=format(b-a);
        return item('band',[a,b,c,d,part+' из '+whole],'Длина части '+part+', длина целого '+whole+'.');
      },
    },
    {
      id:'угол', name:'Угол и смежные углы', example:'55 смежный',
      hint:'Градусы от 1 до 179. Можно добавить слово смежный.',
      compile(args) {
        count(args,1,2);
        const angle=integer(args[0],1,179), split=args[1]==='смежный';
        if (args[1] && !split) fail('После градусов можно добавить слово смежный.');
        return item('angle',[angle,split],split?'Смежные углы '+angle+'° и '+(180-angle)+'°.':'Угол '+angle+'°.');
      },
    },
    {
      id:'круги', name:'Круг внутри круга', example:'5 2',
      hint:'Радиус большого, затем малого круга.',
      compile(args) {
        count(args,2);
        const [outer,inner]=args.map(x=>number(x,0.001,1000));
        if (inner>=outer) fail('Радиус внутреннего круга должен быть меньше внешнего.');
        return item('target',[outer,inner],'Два круга с общим центром и радиусами '+args.join(' и ')+'.');
      },
    },
    {
      id:'кубики', name:'Объём из кубиков', example:'3x2x2',
      hint:'Длина, ширина и высота от 1 до 5.',
      compile(args) {
        count(args,1);
        const dims=size(args[0],3,1,5);
        return item('cube',dims,'Размеры '+dims.join(' × ')+'.');
      },
    },
    {
      id:'машины', name:'Движение машин', example:'навстречу 60 80 210',
      hint:'Направление (навстречу, попутно, вразъезд), скорость первой и второй машины в км/ч и расстояние между ними в начале в км.',
      compile(args) {
        count(args,4);
        const [direction,first,second,distance]=args;
        const routes={навстречу:'движутся навстречу',попутно:'движутся в одну сторону',вразъезд:'движутся в разные стороны друг от друга'};
        if (!Object.hasOwn(routes,direction)) fail('Выбери направление: навстречу, попутно или вразъезд.');
        const speedA=number(first,0,400), speedB=number(second,0,400), gap=number(distance,0,10000);
        return item('cars',[direction,first,second,distance,speedA>0,speedB>0,gap===0],
          'Схема движения: машины '+routes[direction]+'. Скорость первой '+first+' км/ч, второй '+second+' км/ч. Расстояние в начале '+distance+' км.');
      },
    },
    {
      id:'цепочка', name:'Цепочка шагов', example:'"Цена;100 ₽" "Рост на 10%;110 ₽" "Скидка 10%;99 ₽"',
      hint:'Два или три шага в кавычках. Название и значение через точку с запятой.',
      compile(args) {
        count(args,2,3);
        const pairs=args.map(arg=>{
          const pair=arg.split(';');
          count(pair,2);
          return pair.map(x=>label(x.trim(),18));
        });
        return item('flow',pairs,'Последовательность. '+pairs.map(pair=>pair.join(' — ')).join('. ')+'.');
      },
    },
    {
      id:'ветви', name:'Дерево вариантов', example:'"Чай;Какао" "Булочка;Печенье"',
      hint:'Два списка. В каждом по два или три пункта через точку с запятой.',
      compile(args) {
        count(args,2);
        const levels=args.map(arg=>arg.split(';').map(x=>label(x.trim(),12)));
        levels.forEach(level=>count(level,2,3));
        return item('branches',levels,'Варианты первого шага: '+levels[0].join(', ')+'. Второго: '+levels[1].join(', ')+'.');
      },
    },
    {
      id:'множества', name:'Два множества', example:'"Футбол" "Плавание" 8 4 5',
      hint:'Два названия и три числа. Только первое, оба, только второе.',
      compile(args) {
        count(args,5);
        const [a,b,...rest]=args, values=rest.map(x=>String(integer(x,0,999)));
        return item('venn',[label(a,14),label(b,14),...values],
          'Только '+a+' — '+values[0]+', в обоих — '+values[1]+', только '+b+' — '+values[2]+'.');
      },
    },
  ];

  const byId=Object.fromEntries(types.map(type=>[type.id,type]));
  const tokenize = /"([^"\r\n]+)"|([^ \t"]+)/g;
  function compile(text) {
    try {
      const recipe=String(text).trim();
      if (!recipe || recipe.length>LIMIT || /[\r\n[\]\x00-\x08\x0b-\x1f]/.test(recipe))
        fail('Используй одну строку, до '+LIMIT+' символов.');
      const blocks=recipe.split('|');
      count(blocks,1,MAX_PARTS);
      const parts=blocks.map((block,i)=>{
        try {
          if (block.replace(tokenize,'').trim()) fail('Закрой кавычки вокруг подписи.');
          const args=[...block.matchAll(tokenize)].map(m=>m[1]||m[2]);
          const type=args.shift()?.toLowerCase();
          if (!Object.hasOwn(byId,type)) fail('Выбери тип рисунка из списка.');
          const heading=args[0]===':'?(args.shift(),label(args.shift(),28)):byId[type].name;
          return {...byId[type].compile(args),title:heading};
        } catch(error) {
          fail('Часть '+(i+1)+'. '+error.message);
        }
      });
      return {parts,tag:'[[конструктор '+recipe+']]'};
    } catch(error) {
      return {error:error.message};
    }
  }
  const guide=[
    'Если готовая схема не подходит к числам или сюжету вопроса, можно собрать свою. Используй один тег [[конструктор ...]] на отдельной строке.',
    'Разделяй части знаком |, от одной до трёх. Можно задать свой заголовок через : "Короткая подпись" сразу после названия части.',
    ...types.map(type=>type.id+' '+type.example+' — '+type.hint),
    'Пример: [[конструктор доли : "Две ленты" 3/8 5/8 | прямая 0 1 3/8 5/8]].',
    'Подбирай контекст под вопрос ученика. Можно придумать свой пример на этом же правиле, подписать величины и сравнить разные способы увидеть их связь. Проверяй, что в тексте и на рисунке одни числа. В режиме задачи рисунок показывает шаг, сохраняя самостоятельный ответ.',
  ].join('\n');

  root.VEKTOR_TUTOR_CONSTRUCTOR={types,compile,guide,MAX_PARTS,LIMIT};
})(window);
