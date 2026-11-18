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
  if(!url.pathname.startsWith('/api/private/'))return env.ASSETS.fetch(req);
  const action=url.pathname.slice('/api/private/'.length);
  if(req.method!=='POST'||req.headers.get('Origin')!==url.origin)return json({},403);
  if(!req.headers.get('Content-Type')?.startsWith('application/json'))return json({},415);
  const raw=await req.text();
  if(raw.length>5000)return json({},413);
  let input;try{input=JSON.parse(raw)}catch{return json({},400)}
  if(!input||typeof input!=='object')return json({},400);
  if(action==='logout')return json({ok:true},200,cookie('',0));
  const key=action==='create'?randomKey():action==='login'?input.key:req.headers.get('Cookie')?.match(/(?:^|; )__Host-ilm=([0-9a-f]{64})(?:;|$)/)?.[1];
  if(typeof key!=='string'||!/^[0-9a-f]{64}$/.test(key))return json({},401);
  const id=env.PORTFOLIOS.idFromName(await digest(key));
  const obj=env.PORTFOLIOS.get(id);
  const result=await obj.fetch('https://internal/'+action,{method:'POST',body:JSON.stringify(input)});
  if(result.ok&&['create','login'].includes(action))return json(action==='create'?{key}:{ok:true},200,cookie(key,86400));
  return result;
}};
export class Portfolio {
 constructor(ctx,env){this.db=ctx.storage.sql;this.env=env;
 this.db.exec('CREATE TABLE IF NOT EXISTS profile(name TEXT, sector TEXT)');
 this.db.exec('CREATE TABLE IF NOT EXISTS lead(id TEXT PRIMARY KEY, content TEXT)');
 this.db.exec('CREATE TABLE IF NOT EXISTS usage(day TEXT PRIMARY KEY, calls INTEGER)');
 }
 async fetch(req){
 const action=new URL(req.url).pathname.slice(1), input=await req.json();
 const str=(k,max)=>typeof input[k]==='string'?input[k].trim().slice(0,max):'';
 const profile=this.db.exec('SELECT * FROM profile LIMIT 1').toArray()[0];
 if(action==='create'){
 const name=str('name',100),sector=str('sector',30);
 if(profile||!name||!['Inmobiliaria','Negocio'].includes(sector))return json({},400);
 this.db.exec('INSERT INTO profile VALUES(?,?)',name,sector);return json({ok:true});
 }
 if(!profile)return json({},401);
 if(action==='login')return json({ok:true});
 if(action==='list')return json({profile,leads:this.db.exec('SELECT content FROM lead ORDER BY rowid DESC').toArray().map(r=>JSON.parse(r.content))});
 if(action==='save'){
 const lead=Object.fromEntries(['name','campaign','goal','next','task','stage','channel'].map(k=>[k,str(k,180)]));
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
