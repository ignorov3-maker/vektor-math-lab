(() => {
 'use strict';
 const rpc=(fn,args)=>window.VEKTOR_ACCOUNT.rpc(fn,args);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const html=()=>`<section class="sheet" id="student-account"><h2>Мой аккаунт</h2><p id="student-identity"></p>
 <form data-account="password"><h3>Сменить пароль</h3><label class="field">Старый пароль<input type="password" name="old" autocomplete="current-password" required></label><label class="field">Новый пароль<input type="password" name="password" autocomplete="new-password" minlength="6" maxlength="72" required></label><button class="btn btn-primary">Сохранить пароль</button></form>
 <form data-account="login"><h3>Сменить логин</h3><label class="field">Новый логин<input name="login" minlength="3" maxlength="24" pattern="[A-Za-zА-Яа-яЁё0-9]{3,24}" required></label><button class="btn btn-ghost">Сохранить логин</button></form>
 <form data-account="email"><h3>Привязать почту</h3><label class="field">Почта<input type="email" name="email" maxlength="254" autocomplete="email" required></label><button class="btn btn-ghost">Подтвердить почту</button></form>
 <h3>Родитель или репетитор</h3><button type="button" class="btn btn-ghost" id="student-link-code">Код для родителя или репетитора</button><p id="student-code" aria-live="polite"></p><h3>Кто видит мои успехи</h3><ul id="student-viewers"></ul><button type="button" class="btn btn-ghost" id="student-logout-all">Выйти со всех устройств</button><p id="student-account-message" role="status"></p></section>`;
 async function mount(){
  const root=document.getElementById('student-account');if(!root)return;
  const say=s=>{if(root.isConnected)root.querySelector('#student-account-message').textContent=s;};
  (async()=>{try{const p=await rpc('vektor_student_profile');if(!root.isConnected)return;root.querySelector('#student-identity').textContent='Логин: '+p.login+(p.email?' · Почта: '+p.email:'');root.querySelector('#student-viewers').innerHTML=p.viewers.length?p.viewers.map(v=>`<li>${esc(v.name|| (v.role==='parent'?'Родитель':'Репетитор'))}</li>`).join(''):'<li>Пока никто не привязан</li>';}catch(e){say(e.message);}})();
  root.querySelector('#student-link-code').onclick=async e=>{e.target.disabled=true;try{const r=await rpc('vektor_link_code');root.querySelector('#student-code').textContent=r.code+' — действует 24 часа, передай его только своему взрослому';}catch(e){say(e.message);}finally{e.target.disabled=false;}};
  root.querySelector('#student-logout-all').onclick=async e=>{e.target.disabled=true;try{if(window.VEKTOR_SYNC&&!(await window.VEKTOR_SYNC.flush()))throw Error('Сначала подключись к сети: сохраним прогресс');await rpc('vektor_logout_all');window.VEKTOR_ACCOUNT.logout();}catch(e){say(e.message);e.target.disabled=false;}};
  root.addEventListener('submit',async e=>{const form=e.target.closest('[data-account]');if(!form)return;e.preventDefault();const b=form.querySelector('button');b.disabled=true;
   try{let r;if(form.dataset.account==='password'){r=await rpc('vektor_student_set_password',{p_old:form.old.value,p_password:form.password.value});form.reset();say('Пароль сохранён. Остальные устройства вышли из аккаунта.');}
    if(form.dataset.account==='email'){r=await rpc('vektor_student_email',{p_email:form.email.value});say(r.message);}
    if(form.dataset.account==='login'){if(window.VEKTOR_SYNC&&!(await window.VEKTOR_SYNC.flush()))throw Error('Сначала подключись к сети: сохраним прогресс');r=await rpc('vektor_student_set_login',{p_login:form.login.value});const s=JSON.parse(localStorage.getItem('vektor-session'));for(const key of ['vektor-outbox:','vektor-dirty:']){const value=localStorage.getItem(key+s.login);if(value!==null){localStorage.setItem(key+r.login,value);localStorage.removeItem(key+s.login);}}s.login=r.login;localStorage.setItem('vektor-session',JSON.stringify(s));location.reload();}
   }catch(e){say(e.message);}finally{b.disabled=false;}
  });
 }
 async function offer(){
  try{const p=await rpc('vektor_student_profile');if(p.password_offered)return;await rpc('vektor_student_password_offered');
   const box=document.createElement('section');box.className='sheet';box.id='password-offer';box.innerHTML='<h2>Придумай свой пароль</h2><p>Так в твой аккаунт сможешь войти только ты.</p><button class="btn btn-primary" data-new>Придумать пароль</button> <button class="btn btn-ghost" data-later>Потом</button>';document.querySelector('main').prepend(box);box.querySelector('[data-new]').onclick=()=>{box.remove();location.hash='settings';};box.querySelector('[data-later]').onclick=()=>box.remove();
  }catch{}
 }
 window.VEKTOR_PROFILE={html,mount,offer};
})();
