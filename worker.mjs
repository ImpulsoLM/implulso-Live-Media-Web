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
  if(['/api/private/live-control','/api/live-state','/live-overlay'].includes(url.pathname))return liveControl(req,env,url);
  const publicRoute=url.pathname==='/api/campana';
  if(!publicRoute&&!url.pathname.startsWith('/api/private/')){
    const publicFiles=['/contacto','/contacto.html','/privacidad','/privacidad.html','/solicitud','/solicitud.html','/solicitud.js','/impulso-logo.jpg','/news-seed.json','/portada','/portada.html'];
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
      if (['GET','HEAD'].includes(req.method) && ['/','/index','/index.html'].includes(url.pathname)) {
        return env.ASSETS.fetch(new Request(new URL('/portada',url),req));
      }
      if (req.method==='GET' && url.pathname==='/api/news') return env.ASSETS.fetch(new Request(new URL('/news-seed.json',url),req));
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
    if(!env.CRM_ADMIN_SECRET){if(req.method==='GET' && req.headers.get('Accept')?.includes('text/html'))return new Response('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Configurar acceso administrativo · Impulso</title><style>body{margin:0;background:#0b0d1b;color:#f2efff;font:16px/1.7 system-ui}main{max-width:760px;padding:8vh 24px;margin:auto}section{background:#181c31;border:1px solid #bc91ff33;padding:28px;border-radius:20px}h1{font-size:clamp(2rem,5vw,3rem);line-height:1.15}p,li{color:#c4bfd6}li{margin:12px 0}a{color:#8fede2}code{color:#c4adff;overflow-wrap:anywhere}.label{color:#8fede2;letter-spacing:.1em;font-size:14px}.button{display:inline-block;padding:12px 18px;background:#82e6db;color:#102024;text-decoration:none;font-weight:700;border-radius:10px}</style></head><body><main><p class="label">IMPULSO LIVE MEDIA · ADMINISTRACIÓN</p><h1>Falta configurar tu clave de administrador.</h1><section><p>El generador de accesos sigue protegido. Para activarlo, el propietario debe completar este paso en Cloudflare:</p><ol><li>Abre <strong>Workers &amp; Pages</strong> y selecciona el Worker que publica este dominio.</li><li>Entra en <strong>Settings · Variables and Secrets · Add</strong>.</li><li>Selecciona el tipo <strong>Secret</strong>. Nombre: <code>CRM_ADMIN_SECRET</code>. Valor: una clave larga y única, guardada en tu gestor de contraseñas.</li><li>Guarda con <strong>Deploy</strong> y regresa a esta página.</li></ol><p>Después, entra con el usuario <code>admin</code> y esa clave. Podrás escribir el nombre, seleccionar <strong>Creador LIVE</strong> y generar una clave personal para cada titular.</p><p>No publiques la clave administrativa en GitHub ni la entregues a los creadores. La entrada de creadores es <a href="/privado.html">/privado.html</a>.</p><a class="button" href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">Abrir Cloudflare</a></section><p><a href="https://developers.cloudflare.com/workers/configuration/secrets/" target="_blank" rel="noopener noreferrer">Instrucciones oficiales de Cloudflare</a> · <a href="/">Volver a Impulso</a></p></main></body></html>',{status:503,headers:{...headers,'Content-Type':'text/html; charset=utf-8','X-Frame-Options':'DENY'}});return json({error:'Panel pendiente de configuración'},503);}
    const expected='Basic '+btoa('admin:'+env.CRM_ADMIN_SECRET);
    if(await digest(req.headers.get('Authorization')||'')!==await digest(expected))
      return json({},401,{'WWW-Authenticate':'Basic realm="Admin CRM", charset="UTF-8"'});
    if(req.method==='GET')return new Response("<!doctype html><html lang=\"es\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Accesos al CRM</title><main><h1>Conceder acceso al CRM</h1><p><a href=\"/api/private/live-control\">Impulso LIVE Control</a></p><form><label>Nombre profesional <input name=\"name\" required maxlength=\"100\"></label><label>Actividad <select name=\"sector\"><option>Inmobiliaria</option><option>Negocio</option><option>Creador LIVE</option></select></label><button>Generar acceso</button></form><p role=\"status\"></p><a href=\"/privado.html\">Entrada de clientes</a></main><script>document.querySelector('form').onsubmit=async function(e){e.preventDefault();const status=document.querySelector('[role=status]');this.querySelector('button').disabled=true;try{const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(this)))});if(!r.ok)throw Error();status.textContent='Entrega esta clave personalmente al titular: '+(await r.json()).key;this.reset()}catch{status.textContent='No se pudo generar la clave.'}finally{this.querySelector('button').disabled=false}}</script></html>",{headers:{...headers,'Content-Type':'text/html; charset=utf-8','X-Frame-Options':'DENY'}});
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
 this.db.exec('CREATE TABLE IF NOT EXISTS live_state(id INTEGER PRIMARY KEY, content TEXT)');
 this.db.exec('CREATE TABLE IF NOT EXISTS profile(name TEXT, sector TEXT)');
 this.db.exec('CREATE TABLE IF NOT EXISTS lead(id TEXT PRIMARY KEY, content TEXT)');
 this.db.exec('CREATE TABLE IF NOT EXISTS plan(id TEXT PRIMARY KEY, content TEXT)');
 this.db.exec('CREATE TABLE IF NOT EXISTS campaign(token TEXT PRIMARY KEY, title TEXT, channel TEXT, active INTEGER)');
 this.db.exec('CREATE TABLE IF NOT EXISTS receipt(token TEXT, submission TEXT, PRIMARY KEY(token,submission))');
 this.db.exec('CREATE TABLE IF NOT EXISTS usage(day TEXT PRIMARY KEY, calls INTEGER)');
 }
 async fetch(req){
 const action=new URL(req.url).pathname.slice(1), input=await req.json();
 if(action==='live-set'){this.db.exec('INSERT OR REPLACE INTO live_state VALUES(1,?)',JSON.stringify(input));return json({ok:true});}
 if(action==='live-get'){const row=this.db.exec('SELECT content FROM live_state WHERE id=1').toArray()[0];return json(row?JSON.parse(row.content):{mode:'hidden'});}
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

async function liveControl(req,env,url){
 const p=url.pathname, token=url.searchParams.get('token')||'';
 const admin=p==='/api/private/live-control';
 if(admin){
 if(!env.CRM_ADMIN_SECRET)return json({},503);
 if(await digest(req.headers.get('Authorization')||'')!==await digest('Basic '+btoa('admin:'+env.CRM_ADMIN_SECRET)))return json({},401,{'WWW-Authenticate':'Basic realm="LIVE Control"'});
 if(req.method==='GET')return new Response(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Impulso LIVE Control</title><style>body{background:#151025;color:#eee;font:18px system-ui;padding:30px}input,select,button{padding:10px;margin:5px}a{color:cyan}</style><h1>Impulso LIVE Control</h1><button id="new">Nuevo canal</button><p><input id="key" placeholder="Token del canal" size="65"></p><p><a id="link"></a></p><select id="mode"><option value="hidden">Ocultar</option><option value="message">Mensaje / reto</option><option value="timer">Cronómetro</option><option value="score">Marcador</option><option value="frame">Marco</option><option value="roulette">Ruleta</option></select><span id="frameControls" hidden><label>Diseño <select id="frameStyle"><option value="neon">Neón Impulso</option><option value="gold">Elegante dorado</option><option value="gamer">Gamer RGB</option><option value="minimal">Minimalista blanco</option><option value="ocean">Océano cian</option><option value="pink">Rosa eléctrico</option><option value="fire">Fuego</option><option value="night">Noche violeta</option><option value="holiday">Festivo</option><option value="custom">Personalizado</option><optgroup label="Música y estudio"><option value="jukebox">Rocola interactiva</option><option value="record">Estudio nocturno</option></optgroup><optgroup label="Agencia"><option value="casting">Casting abierto</option><option value="audit">Auditoría de cuentas</option></optgroup><optgroup label="Batallas y retos"><option value="traffic">Semáforo de retos</option><option value="mystery">Caja misteriosa</option></optgroup></select></label><label> Color <input id="frameColor" type="color" value="#a855f7"></label><label> Grosor <input id="frameWidth" type="number" min="2" max="24" value="6"></label><label><input id="frameAnimated" type="checkbox"> Animar</label></span><fieldset id="special" hidden><legend>Controles del marco</legend><label>Detalle / canción <input id="detail" maxlength="100"></label><label> Puntos o likes actuales <input id="progress" type="number" min="0" max="100000000" value="0"></label><label> Meta 1 <input id="goal" type="number" min="1" max="100000000" value="100"></label><label> Meta 2 <input id="goal2" type="number" min="1" max="100000000" value="500"></label><label> Meta 3 <input id="goal3" type="number" min="1" max="100000000" value="1000"></label><label> Retos 1 | 2 | 3 <input id="tasks" maxlength="150" value="Saludo | Cantar | Bailar"></label><p>Actualiza los puntos manualmente. No se leen regalos ni likes de TikTok automáticamente.</p></fieldset><input id="msg" placeholder="Texto / opciones separadas por |"><input id="num" type="number" min="0" max="3600" value="60"><button id="send">Publicar dinámica</button><p id="status"></p><iframe id="preview" width="360" height="640"></iframe><script>const q=id=>document.getElementById(id);q('mode').onchange=()=>{const f=q('mode').value==='frame';q('frameControls').hidden=!f;q('msg').placeholder=f?'Nombre del creador (opcional)':'Texto / opciones separadas por |';q('num').hidden=f;q('special').hidden=!(f&&['jukebox','record','casting','audit','traffic','mystery'].includes(q('frameStyle').value))};q('frameStyle').onchange=q('mode').onchange;function link(){const u=location.origin+'/live-overlay?token='+encodeURIComponent(q('key').value);q('link').href=u;q('link').textContent=u;q('preview').src=u}q('new').onclick=()=>{q('key').value=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');link()};q('key').onchange=link;q('send').onclick=async()=>{try{let text=q('msg').value;if(q('mode').value==='roulette'){const opts=text.split('|').filter(x=>x.trim());text=opts[Math.floor(Math.random()*opts.length)]||''}const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:q('key').value,mode:q('mode').value,text,number:Number(q('num').value),frameStyle:q('frameStyle').value,frameColor:q('frameColor').value,frameWidth:Number(q('frameWidth').value),frameAnimated:q('frameAnimated').checked,detail:q('detail').value,progress:Number(q('progress').value),goal:Number(q('goal').value),goal2:Number(q('goal2').value),goal3:Number(q('goal3').value),tasks:q('tasks').value})});q('status').textContent=r.ok?'Publicado':'Error '+r.status}catch{q('status').textContent='Error de conexión'}};</script></html>`,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'}});
 if(req.method!=='POST'||req.headers.get('Origin')!==url.origin)return json({},403);
 let data;try{data=JSON.parse(await req.text())}catch{return json({},400)}
 if(!data||typeof data.token!=='string'||! /^[a-f0-9]{64}$/.test(data.token)||!['hidden','message','timer','score','frame','roulette'].includes(data.mode))return json({},400);
 const state={mode:data.mode,text:String(data.text||'').slice(0,300),number:Math.max(0,Math.min(3600,Number(data.number)||0)),frameStyle:["neon","gold","gamer","minimal","ocean","pink","fire","night","holiday","custom","jukebox","record","casting","audit","traffic","mystery"].includes(data.frameStyle)?data.frameStyle:'neon',frameColor:typeof data.frameColor==='string'&&/^#[0-9a-f]{6}$/i.test(data.frameColor)?data.frameColor:'#a855f7',frameWidth:Math.max(2,Math.min(24,Number(data.frameWidth)||6)),frameAnimated:data.frameAnimated===true,detail:String(data.detail||'').slice(0,100),progress:Math.max(0,Math.min(100000000,Number(data.progress)||0)),goals:[data.goal,data.goal2,data.goal3].map((v,i)=>Math.max(1,Math.min(100000000,Number(v)||[100,500,1000][i]))),tasks:String(data.tasks||'').slice(0,150),updated:Date.now()};
 return env.PORTFOLIOS.get(env.PORTFOLIOS.idFromName('live:'+await digest(data.token))).fetch('https://internal/live-set',{method:'POST',body:JSON.stringify(state)});
 }
 if(req.method!=='GET'||! /^[a-f0-9]{64}$/.test(token))return json({},404);
 if(p==='/api/live-state')return env.PORTFOLIOS.get(env.PORTFOLIOS.idFromName('live:'+await digest(token))).fetch('https://internal/live-get',{method:'POST',body:'{}'});
 return new Response(`<!doctype html><html><meta charset="utf-8"><style>body{margin:0;background:transparent;color:white;font:bold 6vw system-ui;text-shadow:0 2px 5px black}#out{position:fixed;bottom:12%;left:5%;right:5%;text-align:center;background:#29134cdd;border:3px solid cyan;border-radius:20px;padding:12px;overflow-wrap:anywhere}#frame{position:fixed;inset:8px;border:6px solid #a855f7;box-shadow:inset 0 0 18px cyan;border-radius:24px;pointer-events:none;box-sizing:border-box}#frame[hidden]{display:none}#frame[data-style="gold"]{border-color:#e8bd61;box-shadow:inset 0 0 15px #ffe5a0;border-radius:8px}#frame[data-style="gamer"]{border-color:#00ff9d #00baff #ff00bb #aa55ff;box-shadow:inset 0 0 22px #00ff9d;border-radius:0}#frame[data-style="minimal"]{border-color:white;box-shadow:none;border-radius:4px}#frame[data-style="ocean"]{border-color:#00cbe8;box-shadow:inset 0 0 22px #0088ff;border-radius:28px}#frame[data-style="pink"]{border-color:#ff35a4;box-shadow:inset 0 0 25px #ed43ff}#frame[data-style="fire"]{border-color:#ffbd30 #ff5500 #ff2200 #ff5500;box-shadow:inset 0 0 25px #ff5000}#frame[data-style="night"]{border-color:#805aff;box-shadow:inset 0 0 25px #4220bb}#frame[data-style="holiday"]{border-color:#ec3755 #24bc77 #ec3755 #24bc77;box-shadow:inset 0 0 18px #f5d987}#frame[data-style="custom"]{border-color:var(--custom);box-shadow:none}#frame.animate{animation:pulse 2.4s ease-in-out infinite alternate}@keyframes pulse{from{filter:brightness(.85)}to{filter:brightness(1.4)}}@media(prefers-reduced-motion:reduce){#frame.animate{animation:none}}#frameName{position:absolute;top:auto;bottom:21%;left:4%;right:auto;max-width:76%;display:flex;align-items:center;gap:2vw;padding:1.3vw 3vw 1.3vw 1.5vw;background:linear-gradient(115deg,#171221f5 0%,#33205af5 68%,#12454df5 100%);border:1px solid #78eafa;border-left:4px solid #b36cff;border-radius:2vw .5vw 2vw .5vw;box-shadow:0 0 1.8vw #a855f76b;text-align:left;box-sizing:border-box;font:700 4vw system-ui;overflow-wrap:anywhere}#frameName[hidden]{display:none}#frameName img{width:7vw;height:7vw;object-fit:contain;border-radius:1vw;flex:none}#frameName small{display:block;color:#7ceef4;letter-spacing:.13em;font:700 1.7vw system-ui;margin-bottom:.4vw}#creatorLabel{display:block;color:white;line-height:1.1}#frame[data-special="yes"] #frameName{top:auto;bottom:17%;left:3%;right:auto;max-width:67%;font-size:3.6vw}#frame[data-style="traffic"] #frameName,#frame[data-style="mystery"] #frameName{bottom:3%}#frame[data-special="yes"]{inset:8% 2% 19%;border-color:#14141c;box-shadow:0 0 0 1px #38e7e8,inset 0 0 0 1px #9c52ef;border-radius:8px}#frame[data-style="record"]{border-style:dashed;border-color:#6b7280;box-shadow:none}#frame[data-style="traffic"],#frame[data-style="mystery"]{border-color:transparent;box-shadow:none}#specialOverlay{position:absolute;inset:0;font:600 2.9vw system-ui;text-shadow:none;color:#fff}#specialOverlay[hidden]{display:none}.slab{background:#101017ed;border:1px solid #39dfe8;border-radius:8px;padding:2vw;box-sizing:border-box}.topbar{position:absolute;top:1%;left:4%;right:4%;text-align:center}.side{position:absolute;right:1%;top:18%;width:29%;display:grid;gap:1vw}.side .slab{font-size:2.5vw;border-color:#aa63ff}.bottomBar{position:absolute;bottom:6%;left:3%;right:3%;display:flex;align-items:center;justify-content:space-between;gap:2vw}.bottomBar img{width:10vw;height:10vw;object-fit:contain;border-radius:6px}.wave{display:flex;align-items:center;gap:1vw;height:6vw}.wave i{width:.8vw;background:#37e8dc;height:70%;animation:wave 1s ease-in-out infinite alternate}.wave i:nth-child(2n){animation-delay:-.4s;height:35%}.wave i:nth-child(3n){animation-delay:-.8s;height:90%}@keyframes wave{to{transform:scaleY(.25)}}.rec{color:#ff5673}.boxIcon{font-size:11vw;text-align:center;color:#bc8cff}.side .done{border-color:#4ade80;background:#123525ee}.side .pending{border-color:#f3bd48}.agencyTag{color:#79eeee;letter-spacing:.12em;font-size:2vw}@media(prefers-reduced-motion:reduce){.wave i{animation:none}}#frame[data-special="yes"]{border-color:#111116;box-shadow:0 0 0 1px #25f4ee,0 0 12px #25f4ee66,inset 0 0 0 1px #fe2c55,inset 0 0 14px #a855f744}#frame[data-special="yes"][data-style="traffic"],#frame[data-special="yes"][data-style="mystery"]{border-color:transparent;box-shadow:none}#frameName{background:linear-gradient(115deg,#101015 0%,#35206c 52%,#651737 100%);border-color:#25f4ee;border-left-color:#fe2c55;box-shadow:-3px 0 12px #fe2c5577,3px 0 14px #25f4ee66}#frameName small{color:#25f4ee}#creatorLabel{text-shadow:1px 1px #fe2c55,-1px -1px #25f4ee}#specialOverlay .slab{background:linear-gradient(135deg,#101015f5,#211631f5);border-color:#25f4ee;box-shadow:0 0 10px #25f4ee44;border-bottom-color:#fe2c55}#specialOverlay .side .slab{border-color:#a855f7;border-right-color:#fe2c55}#specialOverlay .side .done{border-color:#39e5a0;background:#123525ee}#specialOverlay .side .pending{border-color:#f3bd48}#specialOverlay .wave i:nth-child(3n){background:#fe2c55}#specialOverlay .wave i:nth-child(3n+1){background:#a855f7}#specialOverlay .rec{color:#fe2c55}#specialOverlay .boxIcon{text-shadow:0 0 12px #fe2c55,0 0 20px #25f4ee}</style><div id="frame" hidden><div id="frameName" hidden><img src="/impulso-logo.jpg" alt=""><div><small>IMPULSO LIVE MEDIA · CREADOR LIVE</small><span id="creatorLabel"></span></div></div><div id="specialOverlay" hidden></div></div><div id="out" hidden></div><script>let s={mode:'hidden'},last=0;const out=document.getElementById('out'),frame=document.getElementById('frame');async function poll(){try{const r=await fetch('/api/live-state'+location.search,{cache:'no-store'});if(r.ok){s=await r.json();last=Date.now()}}catch{} }let rendered='';function renderSpecial(mode){const style=s.frameStyle||'neon',isSpecial=['jukebox','record','casting','audit','traffic','mystery'].includes(style)&&mode==='frame';frame.dataset.special=isSpecial?'yes':'no';const el=document.getElementById('specialOverlay');el.hidden=!isSpecial;const stamp=JSON.stringify([mode,s]);if(stamp===rendered)return;rendered=stamp;el.replaceChildren();if(!isSpecial)return;const node=(tag,cls,txt,parent=el)=>{const n=document.createElement(tag);n.className=cls;n.textContent=txt||'';parent.append(n);return n};const top=txt=>node('div','slab topbar',txt);const side=()=>node('div','side','');const bottom=()=>node('div','slab bottomBar','');const logo=p=>{const img=document.createElement('img');img.src='/impulso-logo.jpg';img.alt='Impulso Live Media';p.append(img)};const detail=s.detail||'',progress=s.progress||0,goals=s.goals||[100,500,1000],tasks=(s.tasks||'Saludo | Cantar | Bailar').split('|').map(x=>x.trim());if(style==='jukebox'){top('♪ CANCIÓN ACTUAL · '+(detail||'Por anunciar'));const p=side();['🌹 Rosa · Saludo','💗 Corazón · Canción en fila','🎁 Gorra / Galaxia · Solicitud prioritaria'].forEach(t=>node('div','slab',t,p));}if(style==='record'){top('● REC · ESTUDIO NOCTURNO').classList.add('rec');const b=bottom();logo(b);const w=node('div','wave','',b);for(let i=0;i<12;i++)node('i','','',w);node('span','agencyTag','IMPULSO LIVE MEDIA',b)}if(style==='casting'||style==='audit'){top(style==='casting'?'CASTING ABIERTO · CREADORES LIVE':'AUDITORÍA DE CUENTAS EN VIVO');const b=bottom();logo(b);node('span','agencyTag',detail||(style==='casting'?'Conoce nuestra red de creadores':'Revisión de perfil y contenido'),b)}if(style==='traffic'){const p=side();goals.forEach((g,i)=>{const item=node('div','slab '+(progress>=g?'done':'pending'),(progress>=g?'✓ ':'')+(tasks[i]||'Reto '+(i+1))+' · '+progress+'/'+g,p);item.style.borderLeft='4px solid '+['#ff4c69','#ffc83d','#39e5a0'][i]});}if(style==='mystery'){const p=side();const box=node('div','slab','',p);node('div','boxIcon',progress>=goals[0]?'🎁':'❔',box);node('div','',progress>=goals[0]?(detail||'¡Meta alcanzada!'):'Caja misteriosa · '+progress+'/'+goals[0],box)}};function draw(){const mode=Date.now()-last>15000?'hidden':s.mode;frame.hidden=mode!=='frame';renderSpecial(mode);frame.dataset.style=s.frameStyle||'neon';frame.style.borderWidth=(s.frameWidth||6)+'px';frame.style.setProperty('--custom',s.frameColor||'#a855f7');frame.classList.toggle('animate',s.frameAnimated===true);document.getElementById('frameName').hidden=mode!=='frame'||!s.text;document.getElementById('creatorLabel').textContent=mode==='frame'?s.text||'':'';out.hidden=['hidden','frame'].includes(mode);out.textContent=mode==='timer'?Math.max(0,Math.ceil(s.number-(Date.now()-s.updated)/1000))+' s':mode==='score'?s.text+' '+s.number:s.text||''}poll();setInterval(poll,5000);setInterval(draw,250);</script></html>`,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Referrer-Policy':'no-referrer'}});
}
