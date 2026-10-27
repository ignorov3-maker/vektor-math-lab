/* =========================================================
   Первая страница «Вектора» — лендинг со входом.
   Один запоминающийся момент: тетрадь, по которой проходит «рентген»
   и проявляет неверное правило за ошибкой. Остальное — тихое.
   window.VEKTOR_LANDING = { render(el, { loginHtml }) → после вставки вызывать mount(el) }
   ========================================================= */
(function (root) {
  'use strict';
  const F = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;

  function render(loginHtml) {
    return `<div class="ld">
  <div class="ld-top" role="banner">
    <span class="ld-brand"><svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7"/><path d="M9 23 23 9M13 9h10v10" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>вектор</span>
    <nav class="ld-nav" aria-label="Разделы страницы"><a href="#ld-how">Как это работает</a><a href="#ld-teacher">Учителю</a><a class="ld-nav-cta" href="teacher.html">Вход для учителя</a></nav>
  </div>

  <section class="ld-hero">
    <div class="ld-copy">
      <h1>Находим не ошибку, а мысль, из‑за которой она случилась</h1>
      <p class="ld-lead">Вектор смотрит, как ребёнок решал, находит неверное правило у него в голове и помогает его сломать. Учитель в ту же минуту видит, у кого какая ошибка, и что сделать с ней на уроке.</p>
    </div>

    <div class="ld-login">${loginHtml}</div>

    <figure class="ld-sheet" aria-label="Пример: ученик решил 1/2 + 1/3 = 2/5, Вектор находит, что он складывает числители и знаменатели">
      <div class="ld-sheet-paper">
        <p class="ld-hand ld-line1">${F(1, 2)} + ${F(1, 3)} = <span class="ld-wrong">${F(2, 5)}<svg class="ld-circle" viewBox="0 0 100 70" aria-hidden="true"><ellipse cx="50" cy="35" rx="44" ry="30"/></svg></span></p>
        <div class="ld-scan" aria-hidden="true"></div>
        <p class="ld-rule"><span>Правило в голове:</span> «складываю и верх, и низ»</p>
        <div class="ld-catch">
          <div class="ld-pet" data-ld-pet></div>
          <p class="ld-bubble">Тогда ${F(1, 4)} + ${F(1, 4)} = ${F(2, 8)} = ${F(1, 4)}.<br>Четверть плюс четверть — снова четверть?</p>
        </div>
      </div>
      <figcaption>Так выглядит одна находка «Рентгена мышления»</figcaption>
    </figure>
  </section>

  <section class="ld-how" id="ld-how">
    <h2>Как Вектор чинит мышление</h2>
    <ol class="ld-steps">
      <li><b>Находит</b><span>Ребёнок записывает решение по шагам. Программа видит строку, где значение изменилось, и узнаёт неверное правило.</span></li>
      <li><b>Сталкивает</b><span>Даёт простой пример, где это правило приводит к абсурду. Ребёнок сам видит: так не бывает.</span></li>
      <li><b>Чинит</b><span>Одна верная идея и та же задача заново — каждая строка сразу получает галочку.</span></li>
      <li><b>Проверяет через дни</b><span>Через день и через три в разминке ждёт задача-ловушка. Не попался — ошибка закрыта.</span></li>
    </ol>
  </section>

  <section class="ld-teacher" id="ld-teacher">
    <div class="ld-teacher-copy">
      <h2>Учителю — пульс класса</h2>
      <p>Не проценты выполнения, а живая картина: какая ошибка сейчас у кого. Одно нажатие — мини-урок на доску. Второе — задача этой группе прямо на экраны, и видно, кто справился.</p>
      <a class="btn btn-ghost" href="teacher.html">Открыть кабинет учителя</a>
    </div>
    <div class="ld-pulse" aria-label="Пример строки Пульса">
      <p class="ld-pulse-title">Складывает числители и знаменатели</p>
      <p class="ld-pulse-sub">6 учеников, у двоих уже лечится</p>
      <p class="ld-chips"><span class="ok">✓ Аня</span><span class="ok">✓ Дима</span><span class="bad">✗ Маша</span><span class="wait">… Артём</span><span class="wait">… Соня</span><span class="wait">… Егор</span></p>
      <div class="ld-pulse-bar"><i></i></div>
      <p class="ld-pulse-sub">Ответили 3 из 6, верно 2</p>
    </div>
  </section>

  <section class="ld-facts" aria-label="Почему этому можно доверять">
    <p><b>Считает программа, а не нейросеть.</b> ИИ только объясняет словами — поэтому в арифметике он не ошибается.</p>
    <p><b>Меньше рубля за урок.</b> Всё, что можно, написано заранее; нейросеть зовём только там, где без неё нельзя.</p>
    <p><b>Без установки.</b> Работает в браузере на любом телефоне и школьном компьютере.</p>
  </section>

  <div class="ld-foot" role="contentinfo"><span>Вектор — математика 5–9 класса</span><a href="landing/index.html">Для школ и партнёров</a></div>
</div>`;
  }

  // Бипыч ловит жучка в тетради — после того как «рентген» прошёл по записи
  function mount(el) {
    const host = el.querySelector('[data-ld-pet]'), D = root.VEKTOR_DROBIK;
    if (!host || !D) return null;
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let pet = null;
    try { pet = D.mount(host, { size: 96, state: reduce ? 'catching' : 'thinking', charge: { done: 0, goal: 3 } }); } catch { return null; }
    if (!reduce) setTimeout(() => { try { pet.setState('catching'); } catch {} }, 2600);
    return pet;
  }

  root.VEKTOR_LANDING = { render, mount };
})(typeof window !== 'undefined' ? window : globalThis);
