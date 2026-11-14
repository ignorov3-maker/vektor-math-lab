const GEO_TAGS=['triangle 3 4 5','right_triangle 3 4 ?','circle_geo 6','angle 70','coord -2 3 4 -1','graph linear 2 1','graph quadratic 1 0 -2'];
document.getElementById('geometry-demo').innerHTML=GEO_TAGS.map(tag=>'<article><h2>'+tag+'</h2>'+VEKTOR_VISUALS.figure(VEKTOR_VISUALS.figureFromTag(tag))+'</article>').join('');
