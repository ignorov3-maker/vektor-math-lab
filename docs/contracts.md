# Контракты модулей Codex

Меняются только отдельным PR в этот файл. Пока модуля нет, в репозитории лежит заглушка Claude с тем же интерфейсом; `node tests/stubs.test.js` проверяет, что интерфейс на месте.

## content/drobik.js — маскот
```js
window.VEKTOR_DROBIK = {
  STATES: ['idle','happy','thinking','confused','proud','shy','catching','celebrate','sleep'],
  COSMETICS: [ /* { id, slot: 'screen'|'antenna'|'hat'|'net', name, price, unlock: null | 'achievement-id' } — 30 шт. */ ],
  // age: 'junior' (5–6 класс) | 'senior' (7–9, строгая версия)
  mount(el, { state = 'idle', size = 96, cosmetics = {}, charge = { done: 0, goal: 5 }, age = 'junior' } = {}) {
    return {
      setState(name) {},             // плавный переход между состояниями
      setCharge(done, goal) {},      // доли на животе, goal от 3 до 10
      setCosmetics(map) {},          // { screen, antenna, hat, net } — id из COSMETICS
      say(text, { voice = false } = {}) {}, // пузырь с репликой; voice — speechSynthesis ru-RU, если есть
      destroy() {},
    };
  },
};
```

## content/art.js — рисунки (возвращают строку с `<svg>`)
```js
window.VEKTOR_ART = {
  bug(key, { size = 64, status = 'caught' } = {}),  // key = 'topic:id'; status: caught | healing | beaten
  interest(id, { size = 32 } = {}),                 // football, games, animals, space, cooking, music,
                                                    // drawing, cars, dance, robots, nature, sport
};
```
Неизвестный ключ → универсальный жучок.

## content/collection.js — экраны коллекции и мастерской (данные даёт Claude)
```js
window.VEKTOR_COLLECTION = {
  renderBugs(el, { bugs /* [{ key, kidName, title, status, found, beaten, howBeaten }] */, rank /* 'novice'|'tracker'|'catcher'|'master' */ }),
  renderWorkshop(el, { stars, owned /* [id] */, equipped /* { slot: id } */, onBuy(id), onEquip(slot, id) }),
};
```

## board.html — режим доски
Кабинет учителя кладёт данные и открывает `board.html` в новом окне:
```js
localStorage['vektor-board'] = JSON.stringify({ kidName, title,
  slides: [ { kind: 'wrong'|'conflict'|'fix', html, question?, answerHtml? } ] });
```
`html` уже содержит дроби и картинки (делает движок); `board.html` только раскладывает по слайдам.

## Ключи жучков
21 карточка, 20 рисунков (Складыватель общий для двух тем):

| ключ | имя |
| --- | --- |
| concept:flipped | Перевёртыш |
| concept:took-eaten | Перепутайка |
| concept:unequal-parts | Криворез |
| reduce:not-fully-reduced | Недорез |
| reduce:only-one-part | Однобокий |
| reduce:subtract-instead | Вычитатель |
| compare:bigger-denominator-bigger | Знаменатель-хвастун |
| compare:compare-numerators-only | Одноглазик |
| add-same:add-denominators, add-diff:add-denominators | Складыватель |
| add-same:subtract-denominators | Нулевик |
| add-diff:forgot-scale-numerators | Полупереводчик |
| mixed:add-whole-to-numerator | Прилипала |
| mixed:multiply-whole-numerator | Умножала |
| mult:cross-multiply | Крестоносец |
| mult:multiply-both | Двойник-умножатель |
| div:multiply-instead-of-divide | Непереворот |
| div:flip-first | Переворот не того |
| part-of:flip-fraction | Вывертень |
| part-of:only-one-step | Полдороги |
| part-of:part-instead-of-whole | Путаник |
