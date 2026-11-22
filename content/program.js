/* Общая карта программы для пути ученика, каталога и публичной страницы. */
(function (root) {
  'use strict';
  const ready = (title, ...ids) => ({ title, ready: ids });
  const planned = (title, wave) => ({ title, wave });
  const GRADES = [
    { n: 5, strands: [
      { name: 'Натуральные числа', topics: [
        ready('Разряды, округление и действия', 'n5-place', 'n5-round', 'n5-order', 'n5-props', 'n5-power'),
        ready('Делимость и деление с остатком', 'n5-divisors', 'n5-divisibility', 'n5-remainder'),
      ] },
      { name: 'Дроби', topics: [
        ready('Обыкновенные дроби', 'concept', 'reduce', 'compare', 'add-same', 'add-diff', 'mixed', 'mult', 'div', 'part-of'),
        ready('Десятичные дроби', 'd5-notation', 'd5-addsub', 'd5-mult', 'd5-div', 'd5-round', 'd5-convert'),
      ], bug: { rule: '0,5 < 0,25 — «больше цифр, больше число»', counter: '0,5 рубля — это 50 копеек, а 0,25 — 25. Где больше?' } },
      { name: 'Текстовые задачи', topics: [
        ready('Движение, покупки, единицы и перебор', 't5-motion', 't5-price', 't5-units', 't5-enum'),
      ] },
      { name: 'Наглядная геометрия', topics: [
        ready('Отрезки и углы', 'g5-segments', 'g-angles', 'g5-angle-types'),
        ready('Периметр и площадь', 'g-perimeter', 'g-area', 'g5-composite'),
        ready('Объём и развёртки', 'g-volume', 'g5-nets'),
      ], bug: { rule: 'Одинаковый периметр — значит, одинаковая площадь', counter: 'Прямоугольники 1×9 и 5×5: периметр у обоих 20. Посчитай клетки внутри.' } },
    ] },
    { n: 6, strands: [
      { name: 'Натуральные числа', topics: [ready('Делимость, НОД и НОК', 'n6-gcd', 'n6-lcm')] },
      { name: 'Дроби', topics: [
        ready('Отношения, пропорции и масштаб', 'r6-ratio', 'r6-proportion', 'r6-scale'),
        ready('Проценты', 'p6-percent-of', 'p6-percent-whole'),
      ], bug: { rule: '+10%, потом −10% — получится, как было', counter: '100 → 110 → 99. Почему не 100?' } },
      { name: 'Положительные и отрицательные числа', topics: [
        ready('Рациональные числа и действия', 'z6-integers', 'z6-addsub', 'z6-muldiv', 'z6-rational'),
        ready('Координатная плоскость', 'z6-coords'),
      ] },
      { name: 'Буквенные выражения', topics: [
        ready('Подстановка, формулы и упрощение', 'e6-substitute', 'e6-formulas', 'e6-simplify'),
      ] },
      { name: 'Текстовые задачи', topics: [
        ready('Работа, пропорциональность и оценка', 't6-work', 't6-proportional', 't6-estimate'),
        ready('Диаграммы и таблицы', 't6-charts'),
      ] },
      { name: 'Наглядная геометрия', topics: [
        ready('Прямые, треугольники и четырёхугольники', 'g6-lines', 'g6-triangles', 'g6-quads'),
        ready('Окружность, симметрия и объёмные тела', 'g-circle', 'g6-circle-length', 'g6-symmetry', 'g6-solids'),
      ] },
    ] },
    { n: 7, strands: [
      { name: 'Алгебра', topics: [
        ready('Рациональные числа и пропорциональность', 'a7-rational', 'a7-proportional'),
        ready('Степени, одночлены и многочлены', 'a7-powers', 'a7-monomials', 'a7-polynomials'),
        ready('Формулы и разложение на множители', 'a7-fsu', 'a7-factor'),
        ready('Линейные уравнения и системы', 'a7-linear-eq', 'a7-systems'),
        ready('Функции, графики и числовые промежутки', 'a7-linear-func', 'a7-intervals'),
      ], bug: { rule: '(a + b)² = a² + b²', counter: 'Возьми a = b = 1: (1 + 1)² = 4, а по правилу выходит 2.' } },
      { name: 'Геометрия', topics: [
        ready('Углы, прямые и окружность', 'g7-angles', 'g7-parallel', 'g7-circle'),
        ready('Свойства и равенство треугольников', 'g7-triangle-sum', 'g7-isosceles', 'g7-congruence', 'g7-right', 'g7-triangle-ineq'),
      ], bug: { rule: 'Высота всегда внутри треугольника', counter: 'Сделай один угол тупым — куда ушла высота?' } },
      { name: 'Вероятность и статистика', topics: [
        ready('Описательная статистика', 's7-mean', 's7-median', 's7-tables'),
        ready('Вероятность, частота и графы', 's7-prob', 's7-graphs'),
      ], bug: { rule: 'Два исхода — значит, вероятность 1/2', counter: 'Выиграешь в лотерею или нет — тоже 1/2?' } },
    ] },
    { n: 8, strands: [
      { name: 'Алгебра', topics: [
        planned('Квадратный корень', 2), planned('Алгебраические дроби', 2), planned('Квадратные уравнения', 2),
        planned('Линейные неравенства', 2), planned('Функции y = k/x, y = x², y = √x', 2),
      ], bug: { rule: 'x² = 9, значит x = 3', counter: 'Подставь x = −3. Равенство верное?' } },
      { name: 'Геометрия', topics: [
        planned('Четырёхугольники', 2), planned('Подобие', 2), planned('Теорема Пифагора', 2),
        planned('Площади', 2), planned('Углы в окружности', 2),
      ], bug: { rule: 'Подобие в k раз — площадь тоже в k раз', counter: 'Увеличь квадрат в 2 раза. Сколько старых квадратов в нём помещается?' } },
      { name: 'Вероятность и статистика', topics: [
        ready('Множества, дерево вариантов и события', 's8-sets', 's8-tree', 's8-events'),
      ] },
    ] },
    { n: 9, strands: [
      { name: 'Алгебра', topics: [
        planned('Квадратные неравенства', 3), planned('Квадратичная функция', 3),
        planned('Системы уравнений', 3), planned('Прогрессии', 3),
      ], bug: { rule: 'Умножаю неравенство на −1, знак не меняю', counter: '2 < 3. Умножь на −1: −2 и −3 — кто теперь больше?' } },
      { name: 'Геометрия', topics: [
        planned('Теоремы синусов и косинусов', 3), planned('Векторы и координаты', 3), planned('Длина окружности, площадь круга', 3),
      ], bug: { rule: 'Теорема Пифагора — для любого треугольника', counter: 'Равносторонний со стороной 1: 1² + 1² = 1²?' } },
      { name: 'Вероятность и статистика', topics: [
        ready('Комбинаторика, вероятность и случайные величины', 's9-combinatorics', 's9-geom-prob', 's9-bernoulli', 's9-random-var'),
      ] },
      { name: 'ОГЭ', topics: [planned('Пробник и причины потери баллов', 3), planned('План повторения базовых тем', 3)] },
    ] },
  ];
  const WAVES = { 1: 'зимой', 2: 'весной', 3: 'к сезону ОГЭ' };
  const grade = n => GRADES.find(g => g.n === n) || GRADES[0];
  const readyCount = () => GRADES.reduce((total, g) => total + g.strands.reduce(
    (count, strand) => count + strand.topics.reduce((n, topic) => n + (topic.ready || []).length, 0), 0), 0);
  root.VEKTOR_PROGRAM = { GRADES, WAVES, grade, readyCount };
})(typeof window !== 'undefined' ? window : globalThis);
