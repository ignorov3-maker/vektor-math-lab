(function(){
  'use strict';
  var pet=VEKTOR_DROBIK.mount(document.getElementById('hero-pet'),{size:144,state:'thinking',cosmetics:{screen:'screen-turquoise'},charge:{done:2,goal:5}});
  var button=document.getElementById('example-toggle'),answer=document.getElementById('example-answer');
  button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','example-answer');
  button.addEventListener('click',function(){answer.hidden=!answer.hidden;button.textContent=answer.hidden?'Показать контрпример':'Скрыть контрпример';button.setAttribute('aria-expanded',String(!answer.hidden));pet.setState(answer.hidden?'thinking':'proud');});
  window.addEventListener('pagehide',function(){pet.destroy();},{once:true});
}());
