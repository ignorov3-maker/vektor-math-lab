(function () {
  'use strict';
  var bugs = [
    {key:'add-diff:add-denominators',kidName:'Складыватель',title:'Складывал и числители, и знаменатели',status:'caught',found:'2026-10-27'},
    {key:'reduce:only-one-part',kidName:'Однобокий',title:'Сокращал только числитель',status:'healing',found:'2026-10-26',howBeaten:'Сравнил полоски до и после сокращения.'},
    {key:'concept:flipped',kidName:'Перевёртыш',title:'Менял числитель и знаменатель местами',status:'beaten',found:'2026-10-22',beaten:'2026-10-26',howBeaten:'Сначала посчитал все части, потом выбранные. Дважды решил задачу-ловушку.'},
    {key:'compare:compare-numerators-only',kidName:'Одноглазик',title:'Смотрел только на числители',status:'beaten',found:'2026-10-23',beaten:'2026-10-27',howBeaten:'Заметил: 3/8 меньше половины, а 2/3 больше половины.'},
    {key:'part-of:only-one-step',kidName:'Полдороги',title:'Останавливался после первого действия',status:'healing',found:'2026-10-25'}
  ];
  var wallet = window.VEKTOR_WARDROBE, state = wallet.getState();
  window.collectionDemoState = state; window.collectionDemoCalls = [];
  function renderBugs(list) { VEKTOR_COLLECTION.renderBugs(document.getElementById('bugs'),{bugs:list,rank:'tracker'}); }
  function renderShop() {
    VEKTOR_COLLECTION.renderWorkshop(document.getElementById('shop'),Object.assign({},state,{
      onBuy:async function(id){
        await wallet.buy(id); window.collectionDemoCalls.push(['buy',id]);
      },
      onEquip:async function(slot,id){
        await wallet.equip(slot,id); window.collectionDemoCalls.push(['equip',slot,id]);
      }
    }));
  }
  function show(shop) {
    document.getElementById('bugs').hidden=shop; document.getElementById('shop').hidden=!shop;
    document.getElementById('tab-bugs').setAttribute('aria-pressed',String(!shop));
    document.getElementById('tab-shop').setAttribute('aria-pressed',String(shop));
  }
  document.getElementById('tab-bugs').addEventListener('click',function(){show(false);});
  document.getElementById('tab-shop').addEventListener('click',function(){show(true);});
  document.getElementById('empty').addEventListener('click',function(){renderBugs([]);show(false);});
  document.getElementById('restore').addEventListener('click',function(){renderBugs(bugs);show(false);});
  document.getElementById('reset-stars').addEventListener('click',async function(){
    try{await wallet.addDemoStars(50);}catch(e){document.querySelector('.cd-note').textContent=e.message;}
  });
  document.getElementById('skin').addEventListener('change',function(e){document.documentElement.dataset.skin=e.target.value;});
  var unsubscribe=wallet.subscribe(function(){state=wallet.getState();window.collectionDemoState=state;renderShop();});
  window.addEventListener('pagehide',unsubscribe,{once:true});
  renderBugs(bugs);renderShop();
}());
