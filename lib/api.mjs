import {learningView} from './learning.mjs';
import {worlds} from '../public/worlds.mjs';
import {islandOpen,islandCleared} from '../public/learning-rules.mjs';
import {adventureView} from './adventure.mjs';
import {crewView,crewAction} from './crew.mjs';
import {dateKey} from './game.mjs';
import { fresh,validateProfile,transition,GameError } from './game.mjs';

                                                                                                                                                      
export function json(value        ,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store'}});}
function view(row       ){const d=JSON.parse(row.document);return {username:row.username,avatar:row.avatar,state:{name:row.username,avatar:row.avatar,done:d.done,attempts:d.attempts,review:d.review||[],unlocked:worlds.filter(w=>islandOpen(d,w.id)).map(w=>w.id),cleared:worlds.filter(w=>islandCleared(d,w.id)).map(w=>w.id)},rewards:{claimed:d.claimed,bonus:d.bonus,daily:d.daily,total:d.total},run:d.run,runs:d.runs||{},adventure:adventureView(d),learning:learningView(d,dateKey())};}
export async function api(request,db,user){
  try{
    if(!user)return json({error:'Devam etmek için giriş yap.',signin:'/signin-with-chatgpt?return_to=%2F'},401);
    if(!db)return json({error:'Ortak kayıt henüz hazır değil.'},503);
    const url=new URL(request.url);const path=url.pathname;const id=user.userId;const present=row=>({...view(row),account:{secured:!!user.accountReady}});
    if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return json({error:'İstek doğrulanamadı.'},403);
    if(request.method!=='GET'&&(!request.headers.get('content-type')?.includes('application/json')||Number(request.headers.get('content-length')||0)>4096))return json({error:'Geçersiz istek.'},400);
    let player=user.anonymous?null:await db.prepare('SELECT * FROM players WHERE id=?').bind(id).first        ();
    if(path==='/api/me'&&request.method==='GET')return json({player:player?present(player):null});
    if(path==='/api/profile'&&request.method==='PUT'){
      const body=await request.text();if(body.length>4096)return json({error:'İstek çok uzun.'},413);
      const p=validateProfile(JSON.parse(body));
      const clash=await db.prepare('SELECT id FROM players WHERE username_key=? AND id<>?').bind(p.usernameKey,id).first();
      if(clash)return json({error:'Bu kullanıcı adı alınmış. Başka bir ad deneyebilirsin.'},409);
      try{
        if(player)await db.prepare('UPDATE players SET username=?,username_key=?,avatar=? WHERE id=?').bind(p.username,p.usernameKey,p.avatar,id).run();
        else await db.prepare('INSERT INTO players (id,username,username_key,avatar,xp,completed,document,version,created_at) VALUES (?,?,?,?,0,0,?,0,?)').bind(id,p.username,p.usernameKey,p.avatar,JSON.stringify(fresh()),Date.now()).run();
      }catch(e){if((e.code==='23505'||String(e).includes('UNIQUE')))return json({error:'Bu kullanıcı adı alınmış. Başka bir ad deneyebilirsin.'},409);throw e;}
      player=await db.prepare('SELECT * FROM players WHERE id=?').bind(id).first        ();return json({player:present(player )});
    }
    if(path==='/api/reset'&&request.method==='POST'){
      if(!player)return json({error:'Önce kaşif kartını oluştur.'},409);
      const body=JSON.parse(await request.text());
      if(body.confirmation!=='SIFIRLA')return json({error:'Sıfırlamayı onaylaman gerekiyor.'},400);
      const updated=await db.transaction(async tx=>{
        const latest=await tx.prepare('SELECT document FROM players WHERE id=?'+tx.lockSuffix).bind(id).first();
        const resetDocument=fresh(),teacherNote=JSON.parse(latest.document).learning?.teacherNote;if(teacherNote)resetDocument.learning={teacherNote};
        return tx.prepare('UPDATE players SET document=?,xp=0,completed=0,version=version+1 WHERE id=? RETURNING *').bind(JSON.stringify(resetDocument),id).first();
      });
      return json({player:present(updated)});
    }
    if(path==='/api/crew'){
      if(!player)return json({error:'Önce kaşif kartını oluştur.'},409);
      if(request.method==='POST'){const body=JSON.parse(await request.text());await crewAction(db,id,body,dateKey());player=await db.prepare('SELECT * FROM players WHERE id=?').bind(id).first();}
      if(!['GET','POST'].includes(request.method))return json({error:'Geçersiz işlem.'},405);
      return json({crew:await crewView(db,id),player:present(player)});
    }
    if(path==='/api/leaderboard'&&request.method==='GET'){
      const ranked=await db.prepare('SELECT username,avatar,xp,completed,ROW_NUMBER() OVER (ORDER BY xp DESC,completed DESC,created_at ASC,id ASC) AS rank,id=? AS is_me FROM players ORDER BY xp DESC,completed DESC,created_at ASC,id ASC LIMIT 50').bind(id).all();
      const count=await db.prepare('SELECT COUNT(*) AS count FROM players').first                ();
      const mine=await db.prepare('SELECT username,avatar,xp,completed,rank,1 AS is_me FROM (SELECT id,username,avatar,xp,completed,ROW_NUMBER() OVER (ORDER BY xp DESC,completed DESC,created_at ASC,id ASC) AS rank FROM players) WHERE id=?').bind(id).first();
      return json({players:ranked.results,total:count?.count||0,mine});
    }
    if(path==='/api/game'&&request.method==='POST'){
      if(!player)return json({error:'Önce kaşif profilini oluştur.'},409);
      const raw=await request.text();if(raw.length>4096)return json({error:'İstek çok uzun.'},413);
      const body=JSON.parse(raw);const runId=['start','final-start','review-start','transfer-start'].includes(body.type)?crypto.randomUUID():body.runId;
      for(let tries=0;tries<4;tries++){
        const result=transition(JSON.parse(player.document),{type:body.type,mission:body.mission,mode:body.mode,item:body.item,path:body.path,step:body.step,option:body.option,hintUsed:body.hintUsed===true,runId});
        const d=result.document;
        const updated=await db.prepare('UPDATE players SET document=?,xp=?,completed=?,version=version+1 WHERE id=? AND version=? RETURNING *').bind(JSON.stringify(d),d.total,d.done.length,id,player.version).first        ();
        if(updated)return json({player:present(updated),correct:result.correct,delta:result.delta,mastered:result.mastered,replayed:!!result.replayed});
        player=(await db.prepare('SELECT * FROM players WHERE id=?').bind(id).first        ()) ;
      }
      return json({error:'İlerlemen başka bir sekmede güncellendi. Yeniden dene.'},409);
    }
    return json({error:'İşlem bulunamadı.'},404);
  }catch(e){const msg=e instanceof Error?e.message:'';if(e instanceof GameError)return json({error:msg},400);if(e instanceof SyntaxError)return json({error:'Geçerli bir istek gönder.'},400);const safe=['Kullanıcı adın','Koleksiyondan','Görev bulunamadı','Bu keşif','Geçerli bir','Önce sıradaki','Rozet için','İşlem bulunamadı'];if(safe.some(s=>msg.startsWith(s)))return json({error:msg},400);console.error('Academy API failed');return json({error:'Kayıt şu an tamamlanamadı. Birazdan yeniden dene.'},500);}
}
