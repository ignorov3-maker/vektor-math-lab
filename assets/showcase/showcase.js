(function(){
  'use strict';var pets=[];
  document.querySelectorAll('[data-color]').forEach(function(el,i){pets.push(VEKTOR_DROBIK.mount(el,{size:152,state:i===1?'happy':'idle',cosmetics:{screen:el.dataset.color},charge:{done:3,goal:5}}));});
  window.addEventListener('pagehide',function(){pets.forEach(function(p){p.destroy();});},{once:true});
}());
