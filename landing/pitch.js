(function(){
  'use strict';
  var slides=Array.from(document.querySelectorAll('.slide')),index=0;
  var pet=VEKTOR_DROBIK.mount(document.getElementById('pitch-pet'),{size:220,state:'confused',age:'senior'});
  function draw(){
    slides.forEach(function(s,i){s.hidden=i!==index;});
    document.getElementById('position').textContent=(index+1)+' / '+slides.length;
    document.getElementById('timing').textContent=slides[index].dataset.time;
    document.getElementById('prev').disabled=index===0;document.getElementById('next').disabled=index===slides.length-1;
    pet.setState(slides[index].dataset.state);
  }
  function move(d){index=Math.max(0,Math.min(slides.length-1,index+d));draw();}
  document.getElementById('prev').addEventListener('click',function(){move(-1);});
  document.getElementById('next').addEventListener('click',function(){move(1);});
  document.addEventListener('keydown',function(e){if(e.target.closest('button,a,input'))return;if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}});
  document.getElementById('fullscreen').addEventListener('click',function(){var p=document.fullscreenElement?document.exitFullscreen&&document.exitFullscreen():document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();if(p&&p.catch)p.catch(function(){});});
  window.addEventListener('pagehide',function(){pet.destroy();},{once:true});draw();
}());
