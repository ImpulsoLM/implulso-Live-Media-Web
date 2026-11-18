import {services} from './servicios.js';
const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const json = (data,status=200,extra={}) => Response.json(data,{status,headers:{...headers,...extra}});
const randomKey = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
async function digest(value) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
const cookie=(key,age)=>({'Set-Cookie':'__Host-ilm='+key+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age='+age});
export default {async fetch(req,env){
  const url=new URL(req.url);
  const publicRoute=url.pathname==='/api/campana';
  if(!publicRoute&&!url.pathname.startsWith('/api/private/')){
    const publicFiles=['/contacto','/contacto.html','/privacidad','/privacidad.html','/solicitud','/solicitud.html','/solicitud.js'];
    if(publicFiles.includes(url.pathname))return env.ASSETS.fetch(req);
    const key=req.headers.get('Cookie')?.match(/(?:^|; )__Host-ilm=([0-9a-f]{64})(?:;|$)/)?.[1];
    let scope;
    if(key){
      scope=await digest(key);
      const account=env.PORTFOLIOS.get(env.PORTFOLIOS.idFromName(scope));
      const check=await account.fetch('https://internal/login',{method:'POST',body:'{}'});
      if(!check.ok)scope=null;
    }
    if(!scope){
      if(req.method==='GET' && ['/', '/index','/index.html','/servicios','/servicios.html','/privado','/privado.html'].includes(url.pathname))
        return new Response("<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Impulso Live Media · Centro de trabajo</title><style>body{margin:0;background:#100e1b;color:#faf7ff;font:17px/1.55 system-ui}main{max-width:780px;margin:auto;padding:8vh 6vw}h1{font-size:clamp(2.5rem,7vw,4.5rem);line-height:1.02}section{background:#211d32;padding:24px;border-radius:16px}li{margin:.6em 0}input,button{font:inherit;padding:.6em;max-width:90%}a{color:#92e5ed}</style><main><p>IMPULSO LIVE MEDIA</p><h1>Centro de trabajo para negocios y creadores</h1><ul><li><b>CRM personal.</b> Organiza prospectos y programa seguimientos.</li><li><b>Noticias y Academia.</b> Consulta novedades de TikTok LIVE y practica con lecciones.</li><li><b>Meta y publicidad.</b> Planifica contenido y campañas.</li><li><b>Ideas y guiones.</b> Prepara aperturas, narraciones y cierres para tus videos y lives.</li></ul><section><h2>Entrar al centro privado</h2><p>Usa la clave personal que te entregó Impulso Live Media.</p><form><label>Clave personal <input type=\"password\" required autocomplete=\"current-password\" name=\"key\"></label> <button>Entrar</button></form><p role=\"status\"></p></section><p><a href=\"/contacto.html\">Contactar a la agencia</a></p></main><script>document.querySelector('form').onsubmit=async function(e){e.preventDefault();try{const r=await fetch('/api/private/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:this.elements.key.value.trim()})});if(!r.ok)throw Error();location.replace('/')}catch{document.querySelector('[role=status]').textContent='No se pudo iniciar sesión. Revisa tu clave o contacta a la agencia.'}}</script></html>",{headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
      return json({error:'Acceso privado'},401);
    }
    const asset=await env.ASSETS.fetch(req);
    const response=new Response(asset.body,asset);
    response.headers.set('Cache-Control','private, no-store');
    if(asset.ok && response.headers.get('Content-Type')?.includes('text/html') && ['/','/index','/index.html'].includes(url.pathname)){
      const page=(await response.text()).replaceAll('impulso-studio-v1','impulso-studio-v1-'+scope).replaceAll('impulso-academy-read','impulso-academy-read-'+scope);
      response.headers.delete('Content-Length');
      return new Response(page,response);
    }
    return response;
  }
  let action=url.pathname.slice('/api/private/'.length);
  if(action==='create')return json({},403);
  if(action==='admin'){
    if(!env.CRM_ADMIN_SECRET)return json({error:'Panel pendiente de configuración'},503);
    const expected='Basic '+btoa('admin:'+env.CRM_ADMIN_SECRET);
    if(await digest(req.headers.get('Authorization')||'')!==await digest(expected))
      return json({},401,{'WWW-Authenticate':'Basic realm="Admin CRM", charset="UTF-8"'});
    if(req.method==='GET')return new Response("<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Accesos al CRM</title><main><h1>Conceder acceso al CRM</h1><form><label>Nombre profesional <input name=\"name\" required maxlength=\"100\"></label><label>Actividad <select name=\"sector\"><option>Inmobiliaria</option><option>Negocio</option><option>Creador LIVE</option></select></label><button>Generar acceso</button></form><p role=\"status\"></p><a href=\"/privado.html\">Entrada de clientes</a></main><script>document.querySelector('form').onsubmit=async function(e){e.preventDefault();const status=document.querySelector('[role=status]');this.querySelector('button').disabled=true;try{const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(this)))});if(!r.ok)throw Error();status.textContent='Entrega esta clave personalmente al titular: '+(await r.json()).key;this.reset()}catch{status.textContent='No se pudo generar la clave.'}finally{this.querySelector('button').disabled=false}}</script></html>",{headers:{...headers,'Content-Type':'text/html; charset=utf-8','X-Frame-Options':'DENY'}});
    action='create';
  }
  if(req.method!=='POST'||req.headers.get('Origin')!==url.origin)return json({},403);
  if(!req.headers.get('Content-Type')?.startsWith('application/json'))return json({},415);
  const raw=await req.text();
  if(raw.length>5000)return json({},413);
  let input;try{input=JSON.parse(raw)}catch{return json({},400)}
  if(!input||typeof input!=='object')return json({},400);
  if(publicRoute){
    const match=typeof input.link==='string' && /^([0-9a-f]{64})[.]([0-9a-f-]{36})$/.exec(input.link);
    if(!match)return json({},404);
    let id;try{id=env.PORTFOLIOS.idFromString(match[1])}catch{return json({},404)}
    const operation=input.submit===true?'receive':'describe';
    return env.PORTFOLIOS.get(id).fetch('https://internal/'+operation,{method:'POST',body:JSON.stringify({...input,token:match[2]})});
  }
  if(!['create','login','logout','plan','list','save','assist','campaign','pause'].includes(action))return json({},404);
  if(action==='logout')return json({ok:true},200,cookie('',0));
  const key=action==='create'?randomKey():action==='login'?input.key:req.headers.get('Cookie')?.match(/(?:^|; )__Host-ilm=([0-9a-f]{64})(?:;|$)/)?.[1];
  if(typeof key!=='string'||!/^[0-9a-f]{64}$/.test(key))return json({},401);
  const id=env.PORTFOLIOS.idFromName(await digest(key));
  const obj=env.PORTFOLIOS.get(id);
  const result=await obj.fetch('https://internal/'+action,{method:'POST',body:JSON.stringify({...input,portfolio:id.toString()})});
  if(result.ok&&action==='create')return json({key});
  if(result.ok&&action==='login')return json({ok:true},200,cookie(key,86400));
  return result;
}};
export class Portfolio {
 constructor(ctx,env){this.db=ctx.storage.sql;this.env=env;
 this.db.exec('CREATE TABLE IF NOT EXISTS profile(name TEXT, sector TEXT)');
 this.db.exec('CREATE TABLE IF NOT EXISTS lead(id TEXT PRIMARY KEY, content TEXT)');
 this.db.exec('CREATE TABLE IF NOT EXISTS plan(id TEXT PRIMARY KEY, content TEXT)');
 this.db.exec('CREATE TABLE IF NOT EXISTS campaign(token TEXT PRIMARY KEY, title TEXT, channel TEXT, active INTEGER)');
 this.db.exec('CREATE TABLE IF NOT EXISTS receipt(token TEXT, submission TEXT, PRIMARY KEY(token,submission))');
 this.db.exec('CREATE TABLE IF NOT EXISTS usage(day TEXT PRIMARY KEY, calls INTEGER)');
 }
 async fetch(req){
 const action=new URL(req.url).pathname.slice(1), input=await req.json();
 const str=(k,max)=>typeof input[k]==='string'?input[k].trim().slice(0,max):'';
 const profile=this.db.exec('SELECT * FROM profile LIMIT 1').toArray()[0];
 if(action==='create'){
 const name=str('name',100),sector=str('sector',30);
 if(profile||!name||!['Inmobiliaria','Negocio','Creador LIVE'].includes(sector))return json({},400);
 this.db.exec('INSERT INTO profile VALUES(?,?)',name,sector);return json({ok:true});
 }
 if(!profile)return json({},401);
 if(action==='campaign'){
 const title=str('title',100),channel=str('channel',30);
 if(!title||!['Meta Ads','TikTok Ads','TikTok LIVE','Otro'].includes(channel))return json({},400);
 this.db.exec('INSERT INTO campaign VALUES(?,?,?,1)',crypto.randomUUID(),title,channel);return json({ok:true});
 }
 if(action==='pause'){this.db.exec('UPDATE campaign SET active=0 WHERE token=?',str('token',36));return json({ok:true})}
 if(action==='describe'||action==='receive'){
 const token=str('token',36),campaign=this.db.exec('SELECT * FROM campaign WHERE token=? AND active=1',token).toArray()[0];
 if(!campaign)return json({},404);
 if(action==='describe')return json({title:campaign.title,owner:profile.name});
 const name=str('name',100),contact=str('contact',160),submission=str('submission',36);
 if(!name||!contact||input.consent!==true||!/^[0-9a-f-]{36}$/.test(submission))return json({},400);
 if(!this.db.exec('SELECT 1 FROM receipt WHERE token=? AND submission=?',token,submission).toArray().length){
 const bucket=token+':'+Math.floor(Date.now()/3600000);
 if((this.db.exec('SELECT calls FROM usage WHERE day=?',bucket).toArray()[0]?.calls||0)>=60)return json({},429);
 this.db.exec('INSERT INTO usage VALUES(?,1) ON CONFLICT(day) DO UPDATE SET calls=calls+1',bucket);
 const id=crypto.randomUUID(),today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date());
 const lead={id,name,contact,campaign:campaign.title,channel:campaign.channel,stage:'Pendiente',goal:'Atender solicitud',task:'Responder por el medio autorizado',next:today};
 this.db.exec('INSERT INTO lead VALUES(?,?)',id,JSON.stringify(lead));this.db.exec('INSERT INTO receipt VALUES(?,?)',token,submission);
 }
 return json({ok:true});
 }
 if(action==='login')return json({ok:true});
 if(action==='plan'){
 const service=services.find(item=>item.id===str('service',40));
 const date=str('date',10), task=str('task',250), result=str('result',8), target=str('target',8), id=str('id',40);
 if(!service||!task||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{1,7}$/.test(target)||Number(target)<1||(result&&!/^\d{1,7}$/.test(result)))return json({},400);
 if(id&&!this.db.exec('SELECT id FROM plan WHERE id=?',id).toArray().length)return json({},404);
 const plan={id:id||crypto.randomUUID(),service:service.id,date,task,target,result};
 this.db.exec('INSERT OR REPLACE INTO plan VALUES(?,?)',plan.id,JSON.stringify(plan));return json({ok:true});
 }
 if(action==='list')return json({profile,campaigns:this.db.exec('SELECT * FROM campaign ORDER BY rowid DESC').toArray().map(c=>({...c,link:input.portfolio+'.'+c.token})),plans:this.db.exec('SELECT content FROM plan').toArray().map(r=>JSON.parse(r.content)),leads:this.db.exec('SELECT content FROM lead ORDER BY rowid DESC').toArray().map(r=>JSON.parse(r.content))});
 if(action==='save'){
 const lead=Object.fromEntries(['name','contact','campaign','goal','next','task','stage','channel'].map(k=>[k,str(k,180)]));
 if(!lead.name||!lead.goal||!lead.task||!/^\d{4}-\d{2}-\d{2}$/.test(lead.next))return json({},400);
 const id=str('id',40);
 if(id&&!this.db.exec('SELECT id FROM lead WHERE id=?',id).toArray().length)return json({},404);
 lead.id=id||crypto.randomUUID();
 this.db.exec('INSERT OR REPLACE INTO lead VALUES(?,?)',lead.id,JSON.stringify(lead));return json({ok:true});
 }
 if(action==='assist'){
 const question=str('question',600);if(!question)return json({},400);
 const day=new Date().toISOString().slice(0,10);
 if((this.db.exec('SELECT calls FROM usage WHERE day=?',day).toArray()[0]?.calls||0)>=10)return json({message:'Límite diario de 10 consultas alcanzado.'},429);
 this.db.exec('INSERT INTO usage VALUES(?,1) ON CONFLICT(day) DO UPDATE SET calls=calls+1',day);
 try{const out=await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast',{messages:[{role:'system',content:'Eres asesor comercial de Impulso Live Media en México. Responde en español con acciones concretas para '+profile.sector+'. Nunca afirmes haber enviado mensajes o modificado campañas.'},{role:'user',content:question}],max_tokens:380});return json({answer:out.response});}catch{return json({message:'La IA está temporalmente fuera de servicio.'},503)}
 }
 return json({},404);
 }}
