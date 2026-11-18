import {services} from './servicios.js';
const catalog=document.getElementById('catalog');
for(const service of services){
 const card=document.createElement('article'),heading=document.createElement('h2'),desc=document.createElement('p'),link=document.createElement('a');
 heading.textContent=service.name;desc.textContent=service.deliverable;
 link.href='/privado.html?servicio='+service.id;link.textContent='Preparar este servicio en mi perfil';
 card.append(heading,desc,link);catalog.append(card);
}
