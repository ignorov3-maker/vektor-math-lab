(function () {
  'use strict';
  var proto = document.getElementById('prototype-film'), images = {}, position = 0, playing = false, playStart = 0;
  var clips = [
    { start: 3, end: 7, eyebrow: 'У каждого свой маршрут', title: 'Один путь.<br><em>Девять тем.</em>', description: 'Понятный следующий шаг.<br>Урок, тренировка и проверка.', caption: 'Продолжай с того места, где остановился', name: 'Путь ученика', chapter: '02 / Учебный маршрут', shots: ['home'], pan: [44, 250] },
    { start: 7, end: 12, eyebrow: 'Понятно. По шагам.', title: 'Правило.<br>Картинка.<br><em>Пример.</em>', description: 'Наставник объясняет дроби<br>и ведёт по шагам урока.', caption: 'Работает и по конспекту, без ИИ', name: 'Урок с наставником', chapter: '03 / Объяснение', shots: ['lesson-intro', 'lesson-visual'], change: 1.5, pan: [380, 470] },
    { start: 12, end: 16, eyebrow: 'Можно потрогать идею', title: 'Дроби<br><em>становятся<br>видимыми.</em>', description: 'Меняй числитель и знаменатель.<br>Смотри на полоску, круг и прямую.', caption: '3/5 → 4/5: добавили одну часть', name: 'Лаборатория дробей', chapter: '04 / Наглядная лаборатория', shots: ['lab-three-fifths', 'lab-four-fifths'], change: 2, pan: [430, 565] },
    { start: 16, end: 22, eyebrow: 'Попробовать самому', title: 'Решение.<br>Проверка.<br><em>Получилось!</em>', description: 'Полоска из восьми частей.<br>Закрашено шесть. Ответ: 6/8.', caption: 'Верно! Ещё можно сократить дробь', name: 'Тренировка и проверка ответа', chapter: '05 / Задача на понимание', shots: ['practice-question', 'practice-answer', 'practice-correct'], change: 1.5, secondChange: 3, pan: [350, 650] },
    { start: 22, end: 25, eyebrow: 'Маленькие победы важны', title: 'Первый шаг —<br><em>уже победа.</em>', description: 'За верное решение — звёзды.<br>За первое — первое достижение.', caption: '+3 звезды · «Первый шаг»', name: 'Награды ученика', chapter: '06 / Звёзды и достижения', shots: ['awards'], pan: [200, 330] }
  ];
  function byId(id) { return document.getElementById(id); }
  function ease(value) { var x = Math.max(0, Math.min(1, value)); return x * x * (3 - 2 * x); }
  async function seek(value) {
    var time = Math.max(0, Math.min(36, Number(value) || 0));
    var baseTime = time < 3 ? time : time < 24.5 ? 3 : time < 32 ? Math.min(19.35, 10 + Math.max(0, time - 25) * 10 / 7) : time;
    var baseState = await proto.contentWindow.filmSeek(baseTime);
    var clip = clips.find(function (item, i) { return time >= item.start - (i === 0 ? .5 : 0) && time < item.end; });
    proto.setAttribute('aria-hidden', String(!!clip)); proto.inert = !!clip;
    var overlay = byId('live-overlay'), source = 'prototype', shot = null;
    Object.keys(images).forEach(function (key) { images[key].style.opacity = 0; });
    if (clip) {
      source = 'vercel';
      var local = time - clip.start, enter = ease((local + .5) / .5), exit = 1 - ease((time - clip.end + .5) / .5);
      overlay.style.visibility = 'visible'; overlay.style.opacity = (clip.start === 3 ? enter : 1) * (clip.end === 25 ? exit : 1);
      byId('live-eyebrow').textContent = clip.eyebrow; byId('live-heading').innerHTML = clip.title;
      byId('live-description').innerHTML = clip.description; byId('live-caption').textContent = clip.caption;
      byId('live-window-title').textContent = clip.name; byId('live-chapter').textContent = clip.chapter;
      var index = local >= (clip.secondChange || 100) ? 2 : local >= (clip.change || 100) ? 1 : 0;
      shot = clip.shots[index]; images[shot].style.opacity = 1;
      var change = index === 2 ? clip.secondChange : clip.change;
      if (index > 0 && local < change + .22) { var fade = ease((local - change) / .22); images[shot].style.opacity = fade; images[clip.shots[index - 1]].style.opacity = 1 - fade; }
      var phase = ease(local / (clip.end - clip.start));
      if (clip.start === 16) phase = ease((local - 2.5) / 1.2);
      var pan = clip.pan[0] + (clip.pan[1] - clip.pan[0]) * phase;
      byId('live-photos').style.transform = 'translateY(' + (-pan * byId('live-photo-viewport').clientWidth / images[shot].naturalWidth) + 'px)';
      byId('live-progress').style.width = time / 36 * 100 + '%';
      byId('live-heading').style.transform = 'translateY(' + (10 * (1 - enter)) + 'px)';
    } else { overlay.style.opacity = 0; overlay.style.visibility = 'hidden'; }
    position = time; byId('live-scrub').value = time;
    byId('live-time').textContent = '0:' + String(Math.floor(time)).padStart(2, '0') + ' / 0:36';
    return { time: time, source: source, capture: shot, baseState: baseState };
  }
  function resize() {
    var scale = document.documentElement.classList.contains('capture') ? 1 : Math.min(1, innerWidth / 1280);
    byId('live-viewport').style.width = 1280 * scale + 'px'; byId('live-viewport').style.height = 720 * scale + 'px';
    byId('live-film').style.transform = 'scale(' + scale + ')';
  }
  async function frame(now) {
    if (!playing) return; await seek((now - playStart) / 1000);
    if (position >= 36) { playing = false; byId('live-play').textContent = 'Посмотреть ещё раз'; return; }
    requestAnimationFrame(frame);
  }
  window.liveFilmReady = (async function () {
    if (new URLSearchParams(location.search).has('capture')) document.documentElement.classList.add('capture');
    resize(); window.addEventListener('resize', resize);
    await new Promise(function (resolve) { if (proto.contentDocument.readyState === 'complete' && proto.contentWindow.filmReady) resolve(); else proto.addEventListener('load', resolve, { once: true }); });
    await proto.contentWindow.filmReady;
    var prototypeDoc = proto.contentDocument;
    prototypeDoc.querySelector('.topline span').textContent = 'Разработанный прототип · Бипыч и гардеробная';
    prototypeDoc.querySelector('[data-scene="2"] .chapter').textContent = '07 / Свой стиль · разработанный прототип';
    prototypeDoc.querySelector('.outro-copy .subline').textContent = 'Уроки · Тренировки · Награды · Бипыч';
    var names = Array.from(new Set(clips.flatMap(function (clip) { return clip.shots; })));
    await Promise.all(names.map(function (name) { return new Promise(function (resolve, reject) {
      var img = new Image(); img.alt = ''; img.onload = resolve; img.onerror = reject;
      img.src = 'captures/' + name + '.png'; images[name] = img; byId('live-photos').appendChild(img);
    }); }));
    await seek(0);
    byId('live-play').addEventListener('click', function () {
      playing = !playing; byId('live-play').textContent = playing ? 'Пауза' : 'Продолжить';
      if (playing) { if (position >= 36) position = 0; playStart = performance.now() - position * 1000; requestAnimationFrame(frame); }
    });
    byId('live-scrub').addEventListener('input', async function (event) { playing = false; byId('live-play').textContent = 'Продолжить'; await seek(event.target.value); });
    return true;
  }());
  window.liveFilmSeek = seek;
  window.addEventListener('pagehide', function () { playing = false; }, { once: true });
}());
