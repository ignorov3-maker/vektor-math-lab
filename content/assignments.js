(() => {
 let serial=0;
 async function mount(topics){
  const root=document.getElementById('app'),ticket=++serial;
  try{const rows=await window.VEKTOR_ACCOUNT.rpc('vektor_student_assignments');if(ticket!==serial||location.hash&&!/^#home$/.test(location.hash))return;
   document.getElementById('tutor-assignments')?.remove();if(!rows.length)return;
   const section=document.createElement('section');section.className='sheet';section.id='tutor-assignments';const h=document.createElement('h2');h.textContent='Задания репетитора';section.append(h);
   rows.forEach(r=>{const i=topics.findIndex(t=>t.id===r.topic);if(i<0)return;const p=document.createElement('p'),a=document.createElement('a');a.href='#lesson/'+i+'/learn';a.textContent=topics[i].title+' · до '+new Date(r.due).toLocaleDateString('ru-RU');p.append(a);section.append(p);});root.prepend(section);
  }catch{}
 }
 window.VEKTOR_ASSIGNMENTS={mount};
})();
