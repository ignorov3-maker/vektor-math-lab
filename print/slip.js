(function(){
  'use strict';
  var pets=[];
  function fill(rows){
    pets.forEach(function(p){p.destroy();});pets=[];
    var root=document.getElementById('slips');root.replaceChildren();
    (Array.isArray(rows)?rows:[]).slice(0,8).forEach(function(data,i){
      data=data||{};
      var card=document.createElement('article');card.className='slip';
      var head=document.createElement('div');head.className='slip-head';
      var copy=document.createElement('div'),brand=document.createElement('div');brand.className='slip-brand';brand.textContent='↗ Вектор';
      var group=document.createElement('div');group.className='slip-class';group.textContent='Класс: '+String(data.class==null?'{class}':data.class);
      copy.append(brand,group);var holder=document.createElement('div');head.append(copy,holder);
      pets.push(VEKTOR_DROBIK.mount(holder,{size:64,state:'happy',cosmetics:{screen:['screen-turquoise','screen-raspberry','screen-black'][i%3]}}));
      var fields=document.createElement('div');fields.className='slip-fields';
      [['login','Логин'],['password','Пароль']].forEach(function(pair){
        var label=document.createElement('span');label.textContent=pair[1];
        var value=document.createElement('strong');value.dataset.field=pair[0];value.textContent=String(data[pair[0]]==null?'{'+pair[0]+'}':data[pair[0]]);
        fields.append(label,value);
      });
      var url=document.createElement('div');url.className='slip-url';url.dataset.field='url';url.textContent=String(data.url==null?'{url}':data.url);
      var note=document.createElement('div');note.className='slip-note';note.textContent='Твой напарник Бипыч уже ждёт. Начнём с маленького открытия.';
      card.append(head,fields,url,note);root.appendChild(card);
    });
  }
  window.VEKTOR_PRINT=Object.freeze({fill:fill});
  fill(Array.from({length:8},function(){return {};}));
  document.getElementById('print').addEventListener('click',function(){window.print();});
  window.addEventListener('pagehide',function(){pets.forEach(function(p){p.destroy();});},{once:true});
}());
