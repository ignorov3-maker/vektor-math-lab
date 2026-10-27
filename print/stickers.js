(function(){
  'use strict';
  var colors=['screen-raspberry','screen-turquoise','screen-black'],pets=[];
  var keys=['add-diff:add-denominators','concept:flipped','reduce:only-one-part','compare:compare-numerators-only'];
  for(var i=0;i<24;i++){
    var card=document.createElement('article');card.className='sticker';
    var row=document.createElement('div');row.className='art-row';
    var holder=document.createElement('div');row.appendChild(holder);
    pets.push(VEKTOR_DROBIK.mount(holder,{size:60,state:'proud',cosmetics:{screen:colors[i%3]}}));
    var bug=document.createElement('div');bug.innerHTML=VEKTOR_ART.bug(keys[i%4],{size:46,status:'beaten'});row.appendChild(bug);
    var title=document.createElement('strong');title.textContent='Жучок побеждён!';
    var text=document.createElement('p');text.textContent='Я нашёл, понял и исправил.';
    var brand=document.createElement('small');brand.textContent='↗ ВЕКТОР';
    card.append(row,title,text,brand);document.getElementById('stickers').appendChild(card);
  }
  document.getElementById('print').addEventListener('click',function(){window.print();});
  window.addEventListener('pagehide',function(){pets.forEach(function(p){p.destroy();});},{once:true});
}());
