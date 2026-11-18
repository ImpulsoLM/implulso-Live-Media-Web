const form=document.querySelector('form'), info=document.getElementById('info');
const link=new URLSearchParams(location.search).get('c'),submission=crypto.randomUUID();
async function request(data){
 const r=await fetch('/api/campana',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({link,...data})});
 if(!r.ok)throw Error(r.status===404?'Este formulario ya no está disponible.':'No se pudo completar la solicitud. Intenta de nuevo.');
 return r.json();
}
request({}).then(c=>{document.querySelector('h1').textContent=c.title;info.textContent='Responsable de la campaña: '+c.owner;form.hidden=false}).catch(e=>info.textContent=e.message);
form.onsubmit=async event=>{
 event.preventDefault();const button=form.querySelector('button');button.disabled=true;
 try{await request({submit:true,submission,name:form.elements.namedItem('name').value,contact:form.elements.contact.value,consent:form.elements.consent.checked});form.reset();form.hidden=true;info.textContent='Solicitud recibida. El responsable podrá responderte por el medio que indicaste.'}
 catch(e){info.textContent=e.message;button.disabled=false}
};
