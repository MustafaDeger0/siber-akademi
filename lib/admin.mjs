import {randomBytes,createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {learningSummary} from './adventure.mjs';
import {validateProfile,GameError} from './game.mjs';
import {json} from './api.mjs';

export function createAdmin(db,{secret=process.env.SIBER_ADMIN_PASSWORD,production=false}={}){
 const enabled=typeof secret==='string'&&secret.length>=16;
 const hash=value=>createHash('sha256').update(value).digest();
 const expected=enabled?hash(secret):null,sessions=new Map(),refs=new Map(),failures=new Map();
 const cookieName=production?'__Host-academy-admin':'academy-admin';
 const cookie=(token,age)=>`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${production?'; Secure':''}`;
 const ref=id=>createHmac('sha256',secret).update(id).digest('base64url');
 return async function admin(request,peer='unknown'){
  const url=new URL(request.url),path=url.pathname;
  if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return json({error:'İstek doğrulanamadı.'},403);
  if(!enabled)return json({error:'Yönetim henüz etkin değil. Render Environment alanına en az 16 karakterli SIBER_ADMIN_PASSWORD eklenmeli.'},503);
  if(request.method!=='GET'&&!request.headers.get('content-type')?.includes('application/json'))return json({error:'Geçersiz istek.'},400);
  for(const [key,expiry] of sessions)if(expiry<Date.now())sessions.delete(key);
  for(const [key,value] of failures)if(value.until<Date.now())failures.delete(key);
  try{
   if(path==='/api/admin/login'&&request.method==='POST'){
    const failed=failures.get(peer)||{count:0,until:Date.now()+15*60*1000};
    if(failed.count>=8)return json({error:'Çok fazla giriş denemesi. 15 dakika sonra yeniden dene.'},429);
    const body=await request.json();
    if(typeof body.password!=='string'||!timingSafeEqual(hash(body.password),expected)){failed.count++;failures.set(peer,failed);return json({error:'Yönetici şifresi doğru değil.'},401);}
    failures.delete(peer);const token=randomBytes(32).toString('base64url');
    if(sessions.size>=100)sessions.delete(sessions.keys().next().value);
    sessions.set(token,Date.now()+8*60*60*1000);
    const response=json({ok:true});response.headers.set('Set-Cookie',cookie(token,28800));return response;
   }
   const cookies=Object.fromEntries((request.headers.get('cookie')||'').split(';').map(v=>v.trim().split('='))),token=cookies[cookieName];
   if(!sessions.has(token))return json({error:'Yönetici girişi gerekli.'},401);
   if(path==='/api/admin/logout'&&request.method==='POST'){sessions.delete(token);const response=json({ok:true});response.headers.set('Set-Cookie',cookie('',0));return response;}
   if(path==='/api/admin/players'&&request.method==='GET'){
    const search=(url.searchParams.get('q')||'').trim().toLocaleLowerCase('tr-TR').slice(0,40);
    const rows=await db.prepare("SELECT id,username,avatar,xp,completed,created_at,document FROM players WHERE username_key LIKE ? ESCAPE '!' ORDER BY created_at DESC LIMIT 100").bind('%'+search.replace(/[!%_]/g,'!$&')+'%').all();
    if(refs.size>10000)refs.clear();
    return json({players:rows.results.map(row=>{const key=ref(row.id);refs.set(key,row.id);return {ref:key,username:row.username,avatar:row.avatar,xp:row.xp,completed:row.completed,createdAt:row.created_at,learning:learningSummary(JSON.parse(row.document))};}),limit:100});
   }
   if(path==='/api/admin/rename'&&request.method==='POST'){
    const body=await request.json(),id=refs.get(body.ref);
    if(!id)return json({error:'Oyuncu listesini yenileyip tekrar dene.'},404);
    const row=await db.prepare('SELECT * FROM players WHERE id=?').bind(id).first();
    if(!row)return json({error:'Oyuncu bulunamadı.'},404);
    const p=validateProfile({username:body.username,avatar:row.avatar});
    await db.prepare('UPDATE players SET username=?,username_key=?,version=version+1 WHERE id=?').bind(p.username,p.usernameKey,id).run();
    return json({ok:true,username:p.username});
   }
   return json({error:'İşlem bulunamadı.'},404);
  }catch(e){
   if(e instanceof GameError||e instanceof SyntaxError)return json({error:e instanceof GameError?e.message:'Geçersiz istek.'},400);
   if(e.code==='23505'||String(e).includes('UNIQUE'))return json({error:'Bu kullanıcı adı alınmış.'},409);
   console.error('Admin request failed:',e.code||e.name);return json({error:'İşlem tamamlanamadı. Yeniden dene.'},500);
  }
 };
}
