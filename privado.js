const el=id=>document.getElementById(id);
async function api(action,data={}){
 const r=await fetch('/api/private/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const result=await r.json();if(!r.ok)throw Error(result.message||(r.status===401?'Introduce tu clave para entrar.':'No se pudo completar la operación.'));return result;
}
async function refresh(){
 const {profile,leads}=await api('list');el('access').hidden=true;el('account').hidden=false;el('title').textContent=profile.name+' · '+profile.sector;
 el('list').replaceChildren();
 for(const item of leads.sort((a,b)=>a.next.localeCompare(b.next))){
 const card=document.createElement('article'),title=document.createElement('strong'),desc=document.createElement('p'),button=document.createElement('button');
 title.textContent=item.name+' · '+item.stage;desc.textContent=[item.channel,item.campaign,item.goal,item.next,item.task].filter(Boolean).join(' · ');
 button.textContent='Actualizar seguimiento';button.onclick=()=>{for(const [k,v] of Object.entries(item))el('lead').elements.namedItem(k).value=v;el('lead').scrollIntoView()};card.append(title,desc,button);el('list').append(card);
 }if(!leads.length)el('list').textContent='Todavía no hay prospectos en tu cartera.';
}
for(const action of ['create','login','lead','assist'])el(action).onsubmit=async event=>{
 event.preventDefault();const form=event.currentTarget,btn=event.submitter;btn.disabled=true;
 try{const result=await api(action==='lead'?'save':action,Object.fromEntries(new FormData(form)));
 if(action==='assist')el('answer').textContent=result.answer;else{
 if(action==='create'){el('secret').textContent=result.key;el('recovery').hidden=false}
 form.reset();await refresh()}el('status').textContent=action==='lead'?'Seguimiento guardado.':'';
 }catch(error){el('status').textContent=error.message}finally{btn.disabled=false}
};
el('stored').onclick=()=>{el('secret').textContent='';el('recovery').hidden=true};
el('logout').onclick=async()=>{try{await api('logout');location.replace('/privado.html')}catch(error){el('status').textContent=error.message}};
refresh().catch(error=>{el('status').textContent=error.message});
