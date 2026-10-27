(function () {
  'use strict';
  var catalog = [
    ['concept:flipped', 'Перевёртыш'], ['concept:took-eaten', 'Перепутайка'], ['concept:unequal-parts', 'Криворез'],
    ['reduce:not-fully-reduced', 'Недорез'], ['reduce:only-one-part', 'Однобокий'], ['reduce:subtract-instead', 'Вычитатель'],
    ['compare:bigger-denominator-bigger', 'Знаменатель-хвастун'], ['compare:compare-numerators-only', 'Одноглазик'],
    ['add-same:add-denominators', 'Складыватель'], ['add-diff:add-denominators', 'Складыватель'],
    ['add-same:subtract-denominators', 'Нулевик'], ['add-diff:forgot-scale-numerators', 'Полупереводчик'],
    ['mixed:add-whole-to-numerator', 'Прилипала'], ['mixed:multiply-whole-numerator', 'Умножала'],
    ['mult:cross-multiply', 'Крестоносец'], ['mult:multiply-both', 'Двойник-умножатель'],
    ['div:multiply-instead-of-divide', 'Непереворот'], ['div:flip-first', 'Переворот не того'],
    ['part-of:flip-fraction', 'Вывертень'], ['part-of:only-one-step', 'Полдороги'], ['part-of:part-instead-of-whole', 'Путаник']
  ];
  var states = [['caught', 'Пойман'], ['healing', 'Лечится'], ['beaten', 'Побеждён']];
  catalog.forEach(function (entry) {
    var article = document.createElement('article'); article.className = 'bug'; article.dataset.key = entry[0];
    var title = document.createElement('h2'); title.textContent = entry[1];
    var key = document.createElement('small'); key.textContent = entry[0];
    var trio = document.createElement('div'); trio.className = 'trio';
    states.forEach(function (s) {
      var figure = document.createElement('figure');
      figure.innerHTML = VEKTOR_ART.bug(entry[0], { size: 96, status: s[0] });
      var caption = document.createElement('figcaption'); caption.textContent = s[1];
      figure.appendChild(caption); trio.appendChild(figure);
    });
    article.append(title, key, trio); document.getElementById('bugs').appendChild(article);
  });
  [
    ['football', 'Футбол'], ['games', 'Игры'], ['animals', 'Животные'], ['space', 'Космос'],
    ['cooking', 'Кулинария'], ['music', 'Музыка'], ['drawing', 'Рисование'], ['cars', 'Машины'],
    ['dance', 'Танцы'], ['robots', 'Роботы'], ['nature', 'Природа'], ['sport', 'Спорт']
  ].forEach(function (entry) {
    var article = document.createElement('article'); article.className = 'interest';
    var icons = document.createElement('div'); icons.innerHTML = VEKTOR_ART.interest(entry[0], { size: 24 }) + VEKTOR_ART.interest(entry[0], { size: 40 });
    var title = document.createElement('span'); title.textContent = entry[1];
    article.append(icons, title); document.getElementById('interests').appendChild(article);
  });
}());
