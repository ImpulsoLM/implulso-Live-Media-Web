import {services} from './servicios.js';
const el=id=>document.getElementById(id);
async function api(action,data={}){
 const r=await fetch('/api/private/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const result=await r.json();if(!r.ok)throw Error(result.message||(r.status===401?'Introduce tu clave para entrar.':'No se pudo completar la operación.'));return result;
}
const planForm=el('plan'), fields=planForm.elements;
let sector='';
function chooseService(){
 const item=services.find(s=>s.id===fields.service.value);
 el('deliverable').textContent=item.deliverable;
 el('metric').textContent='Indicador: '+item.metric;
 fields.task.value=item.next;
}
function newPlan(){
 planForm.reset();fields.id.value='';
 const requested=new URLSearchParams(location.search).get('servicio');
 fields.service.value=(services.find(s=>s.id===requested)||services.find(s=>s.audience===sector)||services[0]).id;
 chooseService();
}
for(const item of services)fields.service.add(new Option(item.name,item.id));
fields.service.onchange=chooseService;
el('new-plan').onclick=newPlan;
function renderPlans(plans){
 el('plans').replaceChildren();
 for(const plan of plans.sort((a,b)=>a.date.localeCompare(b.date))){
  const item=services.find(s=>s.id===plan.service);
  const card=document.createElement('article'),title=document.createElement('h3'),detail=document.createElement('p'),edit=document.createElement('button');
  title.textContent=item.name;
  detail.textContent=[plan.date,plan.task,item.metric+': '+(plan.result||'Sin registrar')+' / '+plan.target].join(' · ');
  edit.textContent='Actualizar plan';edit.onclick=()=>{fields.service.value=plan.service;chooseService();for(const [key,value] of Object.entries(plan))fields.namedItem(key).value=value;planForm.scrollIntoView()};
  card.append(title,detail,edit);el('plans').append(card);
 }
}
async function refresh(){
 const {profile,leads,plans,campaigns}=await api('list');el('access').hidden=true;el('account').hidden=false;el('title').textContent=profile.name+' · '+profile.sector;
 if(sector!==profile.sector){sector=profile.sector;newPlan()}renderPlans(plans);
 el('campaigns').replaceChildren();
 for(const c of campaigns){
 const card=document.createElement('article'),title=document.createElement('strong');title.textContent=c.title+' · '+c.channel;card.append(title);
 if(c.active){const link=document.createElement('a'),pause=document.createElement('button');link.href='/solicitud.html?c='+c.link;link.textContent='Abrir formulario';link.target='_blank';link.rel='noopener';pause.textContent='Desactivar enlace';pause.onclick=async()=>{try{await api('pause',{token:c.token});await refresh()}catch(e){el('status').textContent=e.message}};card.append(' · ',link,' ',pause)}else card.append(' · Desactivado');
 el('campaigns').append(card);
 }
 el('list').replaceChildren();
 for(const item of leads.sort((a,b)=>a.next.localeCompare(b.next))){
 const card=document.createElement('article'),title=document.createElement('strong'),desc=document.createElement('p'),button=document.createElement('button');
 title.textContent=item.name+' · '+item.stage;desc.textContent=[item.contact,item.channel,item.campaign,item.goal,item.next,item.task].filter(Boolean).join(' · ');
 button.textContent='Actualizar seguimiento';button.onclick=()=>{for(const [k,v] of Object.entries(item))el('lead').elements.namedItem(k).value=v;el('lead').scrollIntoView()};card.append(title,desc,button);el('list').append(card);
 }if(!leads.length)el('list').textContent='Todavía no hay prospectos en tu cartera.';
}
for(const action of ['create','login','lead','plan','campaign','assist'])el(action).onsubmit=async event=>{
 event.preventDefault();const form=event.currentTarget,btn=event.submitter;btn.disabled=true;
 try{const result=await api(action==='lead'?'save':action,Object.fromEntries(new FormData(form)));
 if(action==='assist')el('answer').textContent=result.answer;else{
 if(action==='create'){el('secret').textContent=result.key;el('recovery').hidden=false}
 form.reset();if(action==='plan')newPlan();await refresh()}el('status').textContent=action==='lead'?'Seguimiento guardado.':action==='plan'?'Plan guardado.':'';
 }catch(error){el('status').textContent=error.message}finally{btn.disabled=false}
};
el('stored').onclick=()=>{el('secret').textContent='';el('recovery').hidden=true};
el('logout').onclick=async()=>{try{await api('logout');location.replace('/privado.html')}catch(error){el('status').textContent=error.message}};
refresh().catch(error=>{el('status').textContent=error.message});
