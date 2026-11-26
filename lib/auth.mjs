import {randomBytes,randomUUID,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {fresh,validateProfile} from './game.mjs';
const derive=promisify(scrypt),ttl=30*86400000;
const digest=token=>createHash('sha256').update(token).digest('hex');
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function resolvePlayer(db,token,now=Date.now()){
 const session=await db.prepare('SELECT player_id FROM account_sessions WHERE token_hash=? AND expires_at>?').bind(digest(token),now).first();
 if(session)return {userId:session.player_id,accountReady:true};
 const legacy=await db.prepare('SELECT p.id FROM players p WHERE p.id IN (?,?) AND NOT EXISTS (SELECT 1 FROM accounts a WHERE a.player_id=p.id)').bind(token,'guest:'+token).first();
 return {userId:legacy?.id||'guest:'+token,accountReady:false,legacy:!!legacy,anonymous:!legacy};
}
async function passwordHash(password){const salt=randomBytes(16).toString('base64url'),key=await derive(password,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024});return salt+':'+key.toString('base64url');}
async function verify(password,stored){const [salt,encoded]=(stored||'no-account-salt:'+Buffer.alloc(64).toString('base64url')).split(':'),key=await derive(password,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024}),expected=Buffer.from(encoded,'base64url');return expected.length===key.length&&timingSafeEqual(key,expected)&&!!stored;}
export function createAuth(db,{production=false,now=()=>Date.now()}={}){
 const failures=new Map(),cookieName=production?'__Host-academy':'academy';
 const withCookie=(response,token)=>{response.headers.set('Set-Cookie',`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${production?'; Secure':''}`);return response;};
 const session=async(tx,id)=>{const token=randomBytes(32).toString('base64url');await tx.prepare('INSERT INTO account_sessions (token_hash,player_id,expires_at) VALUES (?,?,?)').bind(digest(token),id,now()+ttl).run();return token;};
 return async(request,token,identity)=>{
  if(request.method!=='POST')return json({error:'Bu işlem için formu kullan.'},405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'İstek doğrulanamadı.'},403);
  if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Geçersiz istek.'},400);
  const raw=await request.text();if(raw.length>4096)return json({error:'İstek çok uzun.'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'Geçersiz istek.'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Geçersiz istek.'},400);
  const path=new URL(request.url).pathname;
  if(path==='/api/auth/logout'){
   if(identity.legacy)return json({error:'İlerlemeni korumak için önce hesabına bir şifre belirle.',secureRequired:true},409);
   await db.prepare('DELETE FROM account_sessions WHERE token_hash=?').bind(digest(token)).run();
   return withCookie(json({ok:true}),randomBytes(32).toString('base64url'));
  }
  if(!['/api/auth/login','/api/auth/register'].includes(path))return json({error:'İşlem bulunamadı.'},404);
  if(typeof body.username!=='string'||typeof body.password!=='string'||body.password.length<8||body.password.length>128)return json({error:'Takma adını ve 8–128 karakterlik şifreni yaz.'},400);
  const key=body.username.trim().normalize('NFKC').toLocaleLowerCase('tr-TR');
  for(const [k,v]of failures)if(v.until<=now())failures.delete(k);
  if(failures.size>5000)failures.delete(failures.keys().next().value);
  if((failures.get(key)?.count||0)>=10)return json({error:'Çok fazla deneme yapıldı. 15 dakika sonra tekrar dene.'},429);
  if(path==='/api/auth/login'){
   const row=await db.prepare('SELECT p.id,a.password_hash FROM players p JOIN accounts a ON a.player_id=p.id WHERE p.username_key=?').bind(key).first();
   if(!await verify(body.password,row?.password_hash)){const previous=failures.get(key)||{count:0,until:now()+15*60000};previous.count++;failures.set(key,previous);return json({error:'Takma adın veya şifren doğru değil.'},401);}
   failures.delete(key);const next=await session(db,row.id);return withCookie(json({ok:true}),next);
  }
  if(identity.accountReady)return json({error:'Zaten giriş yaptın. Kartını profilinden düzenleyebilirsin.'},409);
  let profile;try{profile=validateProfile({username:body.username,avatar:body.avatar});}catch(e){return json({error:e.message},400);}
  const hash=await passwordHash(body.password);
  try{
   const next=await db.transaction(async tx=>{
    const current=identity.legacy?await tx.prepare('SELECT * FROM players WHERE id=?'+tx.lockSuffix).bind(identity.userId).first():null;
    if(current&&current.username_key!==profile.usernameKey)throw new Error('LEGACY_NAME');
    const id=current?.id||'player_'+randomUUID();
    if(!current)await tx.prepare('INSERT INTO players (id,username,username_key,avatar,xp,completed,document,version,created_at) VALUES (?,?,?,?,0,0,?,0,?)').bind(id,profile.username,profile.usernameKey,profile.avatar,JSON.stringify(fresh()),now()).run();
    await tx.prepare('INSERT INTO accounts (player_id,password_hash,created_at) VALUES (?,?,?)').bind(id,hash,now()).run();
    return session(tx,id);
   });return withCookie(json({ok:true}),next);
  }catch(e){if(e.message==='LEGACY_NAME')return json({error:'Mevcut kaşif adını koruyarak şifre belirle; adını profilinden değiştirebilirsin.'},400);if(e.code==='23505'||String(e).includes('UNIQUE'))return json({error:'Bu takma ad kullanılıyor. Başka bir ad seç veya giriş yap.'},409);throw e;}
 };
}
