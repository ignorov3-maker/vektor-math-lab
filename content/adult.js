/* Общий вход родителей и репетиторов. Секретов сервисов здесь нет. */
(() => {
  'use strict';
  const host = document.getElementById('adult-app'), cfg = window.VEKTOR_CONFIG || {};
  const studentRecovery=new URLSearchParams(location.search).get('student')==='1';
  const role = new URLSearchParams(location.search).get('role') === 'tutor' || /tutor\.html$/.test(location.pathname) ? 'tutor' : 'parent';
  document.getElementById('adult-title').textContent = role === 'tutor' ? 'Кабинет репетитора' : 'Кабинет родителя';
  if(studentRecovery)document.getElementById('adult-title').textContent='Доступ ученика';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let sess, publicCfg = {}, mode = 'login', mailToken = '', captchaToken = '';
  try { sess = JSON.parse(localStorage.getItem('vektor-adult')); } catch {}
  async function rpc(fn, args = {}) {
    if (!cfg.supabaseUrl || !cfg.supabaseKey) throw Error('Сервер пока не подключён');
    const r = await fetch(cfg.supabaseUrl.replace(/\/+$/,'')+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.supabaseKey,Authorization:'Bearer '+cfg.supabaseKey},body:JSON.stringify(args)});
    const j = await r.json();
    if (!r.ok || j?.error) throw Error(j?.message || (/no_session/.test(j?.message||'') ? 'Войдите заново' : 'Не удалось выполнить запрос'));
    return j;
  }
  function device() { let id; try { id=JSON.parse(localStorage.getItem('vektor-device')); if (!id) {id=crypto.randomUUID();localStorage.setItem('vektor-device',JSON.stringify(id));} } catch {id=crypto.randomUUID();} return id; }
  function message(text, bad = false) { const el = document.getElementById('adult-message'); if (el) {el.className=bad?'adult-error':'';el.textContent=text;} }
  function loginForm() {
    captchaToken='';
    const registering=mode==='register', reset=mode==='request', change=mode==='reset';
    host.innerHTML=`${studentRecovery?'<p><a href="index.html">Войти в Вектор</a></p>':'<nav><button class="secondary" data-mode="login">Войти</button><button class="secondary" data-mode="register">Создать аккаунт</button><button class="secondary" data-mode="request">Забыли пароль?</button></nav>'}
      <form id="adult-form"><h2>${registering?'Создать аккаунт':reset?'Восстановить пароль':change?'Новый пароль':'Войти'}</h2>
      ${!change?'<label>Почта<input type="email" name="email" autocomplete="email" required maxlength="254"></label>':''}
      ${!reset?`<label>Пароль<input type="password" name="password" autocomplete="${registering||change?'new-password':'current-password'}" required minlength="${studentRecovery?6:8}" maxlength="72"></label>`:''}
      ${registering?'<label><input type="checkbox" name="consent" required> Я принимаю согласие на обработку данных</label><button type="button" class="secondary" data-legal="consent">Прочитать согласие</button><button type="button" class="secondary" data-legal="privacy">Политика данных</button><div id="legal-text"></div>':''}
      ${registering||reset?'<div id="adult-captcha"></div>':''}<p id="adult-message" role="status"></p><button type="submit">${registering?'Зарегистрироваться':reset?'Отправить ссылку':change?'Сохранить пароль':'Войти'}</button></form>`;
    if (registering && !publicCfg.signup_open) {message('Регистрация скоро откроется');host.querySelector('[type=submit]').disabled=true;}
    if ((registering && publicCfg.signup_open)||reset) mountCaptcha();
  }
  function mountCaptcha() {
    if (!cfg.smartCaptchaSiteKey) {message('Проверка капчи пока не подключена');host.querySelector('[type=submit]').disabled=true;return;}
    const render=()=>window.smartCaptcha.render('adult-captcha',{sitekey:cfg.smartCaptchaSiteKey,callback:t=>{captchaToken=t;}});
    if (window.smartCaptcha) {render();return;}
    window.vektorCaptchaReady=render;
    let script=document.createElement('script');script.src='https://smartcaptcha.cloud.yandex.ru/captcha.js?render=onload&onload=vektorCaptchaReady';script.async=true;script.onerror=()=>message('Не удалось загрузить капчу',true);document.head.append(script);
  }
  async function cabinet() {
    if (sess.role==='tutor'&&!/tutor\.html$/.test(location.pathname)) {location.replace('tutor.html');return;}
    const api=window.VEKTOR_ADULT;
    if (api.renderCabinet) await api.renderCabinet();
    else host.innerHTML='<p>Вы вошли. Кабинет готовится.</p><button data-logout>Выйти</button><p id="adult-message"></p>';
  }
  host.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b)return;
    if (b.dataset.mode) {mode=b.dataset.mode;loginForm();}
    if (b.dataset.legal) {try{const r=await fetch('legal/'+b.dataset.legal+'.md');if(!r.ok)throw Error(); const el=document.getElementById('legal-text');el.innerHTML='<pre></pre>';el.firstChild.textContent=await r.text();}catch{message('Текст пока недоступен',true);}}
    if (b.hasAttribute('data-logout')) {try{await rpc('vektor_logout',{p_token:sess.token});}catch{} localStorage.removeItem('vektor-adult');sess=null;mode='login';loginForm();}
  });
  host.addEventListener('submit',async e=>{
    if(e.target.id!=='adult-form')return;e.preventDefault();const f=e.target, b=f.querySelector('[type=submit]');b.disabled=true;
    try {
      let r;
      if(mode==='login'){r=await rpc('vektor_adult_login',{p_email:f.email.value,p_password:f.password.value,p_device:device()});sess=r;localStorage.setItem('vektor-adult',JSON.stringify(r));await cabinet();return;}
      if(mode==='register'){if(!f.consent.checked)throw Error('Примите согласие');r=await rpc('vektor_adult_register',{p_email:f.email.value,p_password:f.password.value,p_role:role,p_consent_version:publicCfg.consent_version,p_captcha:captchaToken});}
      if(mode==='request')r=await rpc(studentRecovery?'vektor_student_reset_request':'vektor_adult_reset_request',{p_email:f.email.value,p_captcha:captchaToken});
      if(mode==='reset'){r=await rpc(studentRecovery?'vektor_student_reset':'vektor_adult_reset',{p_token:mailToken,p_password:f.password.value});mailToken='';mode=studentRecovery?'request':'login';loginForm();}
      message(r.message||'Готово. Теперь можно войти.');
    }catch(err){message(err.message,true);if(window.smartCaptcha)window.smartCaptcha.reset();captchaToken='';}finally{b.disabled=false;}
  });
  window.VEKTOR_ADULT={rpc,esc,host,get session(){return sess;},role,cabinet,message};
  async function init(){
    try{publicCfg=await rpc('vektor_public_config');}catch{}
    const params=new URLSearchParams(location.hash.slice(1));
    if(studentRecovery){
      mode='request';
      if(params.has('student_email')){const token=params.get('student_email');history.replaceState(null,'',location.pathname+location.search);loginForm();try{await rpc('vektor_student_email_confirm',{p_token:token});message('Почта подтверждена. Можно вернуться в Вектор.');}catch(e){message(e.message,true);}return;}
      if(params.has('student_reset')){mailToken=params.get('student_reset');history.replaceState(null,'',location.pathname+location.search);mode='reset';loginForm();return;}
      loginForm();return;
    }
    if(params.has('adult_confirm')){const token=params.get('adult_confirm');history.replaceState(null,'',location.pathname+location.search);loginForm();try{await rpc('vektor_adult_confirm',{p_token:token});message('Почта подтверждена. Войдите.');}catch(e){message(e.message,true);}return;}
    if(params.has('adult_reset')){mailToken=params.get('adult_reset');history.replaceState(null,'',location.pathname+location.search);mode='reset';loginForm();return;}
    if(sess?.token)await cabinet();else loginForm();
  }
  // Следующий локальный модуль успевает подключить кабинет до первого рендера.
  setTimeout(init,0);
})();
