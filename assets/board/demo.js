document.getElementById('open').addEventListener('click', function () {
  var data = {kidName:'Складыватель',title:'Прибавили — стало меньше?',slides:[
    {kind:'wrong',html:'<p>Бипыч думает, что…</p><p><span class="frac"><span>1</span><span>2</span></span> + <span class="frac"><span>1</span><span>3</span></span> = <span class="frac"><span>2</span><span>5</span></span></p>',question:'Какое правило он использовал?',answerHtml:'Сложил числители и знаменатели.'},
    {kind:'conflict',html:'<p>Четверть плюс четверть — снова четверть?</p><p>1/4 + 1/4 → 2/8 = 1/4</p>',question:'Может ли сумма двух одинаковых кусочков остаться прежней?',answerHtml:'Нет. Две четверти — это половина: 1/4 + 1/4 = 2/4.'},
    {kind:'fix',html:'<p>Сначала делаем части одинаковыми.</p><p>1/2 = 3/6 · 1/3 = 2/6</p>',question:'Сколько шестых получится вместе?',answerHtml:'3/6 + 2/6 = 5/6. Складываем количество одинаковых частей.'}
  ]};
  try { localStorage.setItem('vektor-board',JSON.stringify(data)); location.href='../../board.html'; }
  catch (_) { document.getElementById('open').textContent='Разрешите локальное хранилище в браузере'; }
});
