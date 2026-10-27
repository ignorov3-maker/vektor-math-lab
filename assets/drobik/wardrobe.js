/* Browser-local demo wallet. Never reads or writes real learning progress. */
(function () {
  'use strict';
  var KEY = 'vektor-bipych-wardrobe-v1';
  var items = window.VEKTOR_DROBIK.COSMETICS;
  var catalogue = new Map(items.map(function (item) { return [item.id, item]; }));
  var baseOwned = ['screen-turquoise', 'screen-raspberry', 'screen-black', 'net-classic'];
  var listeners = new Set();
  function normalize(data) {
    if (!data || data.version !== 1) data = {};
    var owned = new Set(baseOwned);
    (Array.isArray(data.owned) ? data.owned : []).forEach(function (id) { if (catalogue.has(id)) owned.add(id); });
    var equipped = { screen: 'screen-turquoise' };
    ['screen', 'antenna', 'hat', 'net'].forEach(function (slot) {
      var id = data.equipped && data.equipped[slot], item = catalogue.get(id);
      if (item && item.slot === slot && owned.has(id)) equipped[slot] = id;
    });
    return { version: 1, stars: typeof data.stars === 'number' && Number.isFinite(data.stars) ? Math.max(0, Math.min(1000000, Math.floor(data.stars))) : 90, owned: Array.from(owned), equipped: equipped };
  }
  function read() {
    try { return normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); }
    catch (_) { return normalize(null); }
  }
  function notify() {
    listeners.forEach(function (fn) { try { fn(read()); } catch (e) { console.error(e); } });
  }
  function update(change) {
    function commit() {
      var next = read();
      change(next);
      try { localStorage.setItem(KEY, JSON.stringify(next)); }
      catch (_) { throw new Error('Не удалось сохранить покупку в этом браузере. Звёзды не списаны.'); }
      notify();
      return read();
    }
    if (navigator.locks && navigator.locks.request) return navigator.locks.request(KEY, commit);
    return Promise.resolve().then(commit);
  }
  function buy(id) {
    return update(function (state) {
      var item = catalogue.get(id);
      if (!item) throw new Error('Такого предмета нет в магазине.');
      if (state.owned.indexOf(id) >= 0) return;
      if (item.unlock) throw new Error('Этот предмет открывается за достижение.');
      if (state.stars < item.price) throw new Error('Пока не хватает звёзд.');
      state.stars -= item.price; state.owned.push(id);
    });
  }
  function equip(slot, id) {
    return update(function (state) {
      var item = catalogue.get(id);
      if (!item || item.slot !== slot || state.owned.indexOf(id) < 0) throw new Error('Сначала получи этот предмет.');
      state.equipped[slot] = id;
    });
  }
  function clearAccessories() { return update(function (s) { s.equipped = { screen: s.equipped.screen }; }); }
  function addDemoStars(amount) { return update(function (s) { s.stars = Math.min(1000000, s.stars + Math.max(0, Math.min(1000, Math.floor(Number(amount) || 0)))); }); }
  function subscribe(fn) {
    if (typeof fn !== 'function') throw new TypeError('Нужна функция подписки');
    listeners.add(fn); return function () { listeners.delete(fn); };
  }
  window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) notify(); });
  window.VEKTOR_WARDROBE = Object.freeze({ getState: read, buy: buy, equip: equip, clearAccessories: clearAccessories, addDemoStars: addDemoStars, subscribe: subscribe });
}());
