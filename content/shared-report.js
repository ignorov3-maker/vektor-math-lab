(() => {
 let generation=0;
 window.VEKTOR_SHARED_VIEW=new URLSearchParams(location.hash.slice(1)).has('share');
 async function render(){
  const token=new URLSearchParams(location.hash.slice(1)).get('share');if(!token)return;
  window.VEKTOR_SHARED_VIEW=true;const ticket=++generation;
  history.replaceState(null,'',location.pathname);const cfg=window.VEKTOR_CONFIG,root=document.getElementById('report-app');root.textContent='Проверяем ссылку…';
  try{
   const r=await fetch(cfg.supabaseUrl.replace(/\/+$/,'')+'/rest/v1/rpc/vektor_shared_report',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',apikey:cfg.supabaseKey,Authorization:'Bearer '+cfg.supabaseKey},body:JSON.stringify({p_token:token})});
   const j=await r.json();if(!r.ok||j.error)throw Error('Ссылка устарела, отозвана или недоступна');if(ticket!==generation)return;
   root.innerHTML='<h2>Последние 7 дней</h2>';
   for(const [label,value] of [['Дней занятий',j.days.length],['Верных ответов',j.solved],['Время решения, секунд',j.seconds]]){const p=document.createElement('p');p.textContent=label+': '+value;root.append(p);}
   const h=document.createElement('h3');h.textContent='Работа над правилами';root.append(h);
   for(const rule of j.rules){const p=document.createElement('p');p.textContent=(window.VEKTOR_BUGS?.byKey[rule.key]?.title||'Правило вне текущего каталога')+' — '+(rule.beaten_at&&rule.beaten_at>=rule.found_at?'разобрали':'ещё разбираем');root.append(p);}
   if(!j.rules.length){const p=document.createElement('p');p.textContent='Новых затруднений за неделю не зафиксировано';root.append(p);}
   const b=document.createElement('button');b.textContent='Печать / PDF';b.onclick=()=>window.print();root.append(b);
  }catch(e){if(ticket===generation)root.textContent=e.message;}
 }
 addEventListener('hashchange',render);render();
})();
