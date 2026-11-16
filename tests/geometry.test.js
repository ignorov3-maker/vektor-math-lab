const assert=require('node:assert/strict');globalThis.window=globalThis;require('../content/visuals.js');const V=VEKTOR_VISUALS;
for(const tag of ['triangle 3 4 5','right_triangle 3 4 ?','circle_geo 6','angle 70','coord -2 3 4 -1','graph linear 2 1','graph quadratic 1 0 -2']){const f=V.figureFromTag(tag);assert(f,tag);const svg=V.figure(f);assert(svg.includes('<svg')&&!/NaN|Infinity|undefined/.test(svg),tag);assert(V.describe(f).length>5);}
assert.equal(V.describe({type:'right_triangle',a:3,b:4,c:null}),'прямоугольный треугольник, катеты 3 и 4, гипотенуза неизвестна');
assert.equal(V.figureFromTag('triangle 1 2 9'),null);assert.equal(V.figureFromTag('angle 360'),null);assert.equal(V.figureFromTag('coord NaN 3'),null);
assert(!V.figure({type:'coord',points:[{x:1,y:2,label:'<script>alert(1)</script>'}]}).includes('<script>'));
console.log('geometry: OK');
