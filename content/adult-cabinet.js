(() => {
 const api=window.VEKTOR_ADULT,{rpc,esc,host}=api;
 let current=null;
 const topic=id=>window.VEKTOR_FRACTIONS?.topics.find(t=>t.id===id)?.title||id;
 const date=s=>s?new Date(s).toLocaleDateString('ru-RU'):'—';
 function credentials(r){
  const box=document.createElement('section');box.className='adult-card no-print';box.innerHTML=`<h2>Новый лист входа</h2><p>Пароль показан один раз. Распечатайте или запишите его.</p><p>Логин: <strong>${esc(r.login)}</strong><br>Пароль: <strong>${esc(r.password)}</strong></p><button data-print>Открыть лист для печати</button><button data-close>Я сохранил, закрыть</button>`;
  box.querySelector('[data-print]').onclick=()=>{const w=window.open('print/slip.html','_blank');if(!w){api.message('Разрешите открытие окна для печати',true);return;}w.opener=null;w.addEventListener('load',()=>{w.VEKTOR_PRINT.fill([{login:r.login,password:r.password,class:'',url:location.origin}]);},{once:true});};
  box.querySelector('[data-close]').onclick=()=>{box.remove();r.password='';};host.prepend(box);
 }
 async function showChild(id){
  current=+id;const out=document.getElementById('adult-child');out.innerHTML='<p>Загружаем отчёт…</p>';
  try{const r=await rpc(api.role==='tutor'?'vektor_tutor_child':'vektor_parent_child',{p_token:api.session.token,p_student:current});
   if(current!==+id)return;
   const ruleText=key=>window.VEKTOR_BUGS?.byKey[key]?.title||'Правило пока не описано в каталоге';
   out.innerHTML=`<article class="adult-card"><h2>${esc(r.label||'Ученик')} · последние 7 дней</h2><div class="adult-stats"><p><b>${r.days.length}</b><br>дней занятий</p><p><b>${r.solved}</b><br>верных ответов</p><p><b>${Math.floor(r.seconds/60)}</b><br>минут решения задач</p></div><p class="small">Время посчитано по попыткам решения; чтение уроков сюда не входит.</p><h3>Занятия</h3>${r.days.length?'<ul>'+r.days.map(d=>`<li>${esc(d.day)}: ${Math.floor(d.seconds/60)} мин., верных ответов ${d.solved}</li>`).join('')+'</ul>':'<p>За неделю занятий пока нет.</p>'}<h3>Пройденные темы</h3><p>${r.topics.length?r.topics.map(t=>esc(topic(t))).join(', '):'Завершённых тем за неделю пока нет.'}</p><h3>Над какими правилами работали</h3>${r.rules.length?'<ul>'+r.rules.map(b=>`<li>${esc(ruleText(b.key))} — ${b.checked_at&&b.checked_at>=b.found_at?'проверено повторной задачей':b.beaten_at&&b.beaten_at>=b.found_at?'разобрали правило':'ещё разбираем'}${api.role==='tutor'?` (${date(b.found_at)})`:''}</li>`).join('')+'</ul>':'<p>Новых затруднений за неделю не зафиксировано.</p>'}<nav class="no-print"><button data-weekly>Отчёт за неделю · Печать / PDF</button><button class="secondary" data-reset-child>Сбросить пароль ребёнка</button><button class="secondary" data-unlink>Отвязать</button></nav><div id="child-action"></div></article>`;
   if(api.renderTutorChildTools)api.renderTutorChildTools(current,out);
  }catch(e){out.textContent=e.message;}
 }
 async function renderCabinet(){
  current=null;host.innerHTML='<p>Загружаем список…</p>';
  try{const children=await rpc(api.role==='tutor'?'vektor_tutor_students':'vektor_parent_children',{p_token:api.session.token});
   host.innerHTML=`<nav class="no-print"><button data-add>Добавить ${api.role==='tutor'?'ученика':'ребёнка'}</button><button class="secondary" data-logout>Выйти</button><button class="secondary" data-logout-all>Выйти со всех устройств</button></nav><p id="adult-message" role="status"></p><section id="adult-add" class="adult-card" hidden><h2>Добавить ребёнка</h2><form id="adult-link"><label>Код из профиля ученика<input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required></label><button>Добавить по коду</button></form><form id="adult-create"><label>Как подписать ученика<input name="label" maxlength="60" required></label><button>Создать новый аккаунт</button></form></section><section class="no-print"><h2>${api.role==='tutor'?'Ученики':'Дети'}</h2>${children.length?children.map(c=>`<button class="secondary" data-child="${c.id}">${esc(c.label||'Ученик '+c.id)}</button>`).join(''):'<p>Пока никого нет. Добавьте по коду или создайте аккаунт.</p>'}</section><div id="adult-child"></div><div id="tutor-tools"></div>`;
   if(api.renderTutorTools)await api.renderTutorTools(children);
  }catch(e){host.innerHTML=`<p>${esc(e.message)}</p><button data-logout>Выйти и войти снова</button><p id="adult-message"></p>`;}
 }
 host.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-add'))document.getElementById('adult-add').hidden=false;
  if(b.dataset.child)await showChild(b.dataset.child);
  if(b.hasAttribute('data-weekly'))window.print();
  if(b.hasAttribute('data-reset-child')){document.getElementById('child-action').innerHTML='<p>Старые устройства выйдут. Прогресс сохранится.</p><button data-reset-confirm>Сбросить и показать лист входа</button>';}
  if(b.hasAttribute('data-unlink')){document.getElementById('child-action').innerHTML='<p>Вы перестанете видеть успехи. Аккаунт ученика останется.</p><button data-unlink-confirm>Отвязать ребёнка</button>';}
  if(b.hasAttribute('data-reset-confirm')||b.hasAttribute('data-unlink-confirm')){b.disabled=true;try{const reset=b.hasAttribute('data-reset-confirm');const r=await rpc(reset?'vektor_adult_reset_student':'vektor_adult_unlink',{p_token:api.session.token,p_student:current});if(reset)credentials(r);else await renderCabinet();}catch(e){api.message(e.message,true);}finally{b.disabled=false;}}
 });
 host.addEventListener('submit',async e=>{if(!['adult-link','adult-create'].includes(e.target.id))return;e.preventDefault();const f=e.target,b=f.querySelector('button');b.disabled=true;try{const create=f.id==='adult-create';const r=await rpc(create?'vektor_adult_create_student':'vektor_adult_link',{p_token:api.session.token,...(create?{p_label:f.label.value}:{p_code:f.code.value})});await renderCabinet();if(create)credentials(r);}catch(e){api.message(e.message,true);}finally{b.disabled=false;}});
 api.renderCabinet=renderCabinet;api.showChild=showChild;api.credentials=credentials;
})();
