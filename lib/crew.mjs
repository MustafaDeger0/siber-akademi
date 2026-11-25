import {randomBytes} from 'node:crypto';
import {GameError} from './errors.mjs';
import {worlds} from '../public/worlds.mjs';
import {items} from '../public/adventure-data.mjs';
import {learnedCount} from './adventure.mjs';

export async function crewView(db,id){
 const member=await db.prepare('SELECT code FROM crew_members WHERE player_id=?').bind(id).first();if(!member)return null;
 const rows=await db.prepare('SELECT p.id,p.username,p.avatar,p.document FROM players p JOIN crew_members m ON m.player_id=p.id WHERE m.code=? ORDER BY m.joined_at ASC').bind(member.code).all();
 const members=rows.results.map(row=>{const d=JSON.parse(row.document);return {username:row.username,avatar:row.avatar,isMe:row.id===id,learned:worlds.reduce((n,w)=>n+learnedCount(d,w),0),thanks:d.adventure?.thanks||0};});
 const count=members.reduce((n,p)=>n+p.learned,0);
 return {code:member.code,members,goal:{count,target:15,ready:members.length>=2&&count>=15}};
}
export async function crewAction(db,id,body,day){
 return db.transaction(async tx=>{
  if(!['create','join','leave','thanks','gift','claim'].includes(body.type))throw new GameError('Takım işlemi bulunamadı.');
  const membership=await tx.prepare('SELECT code FROM crew_members WHERE player_id=?').bind(id).first();
  if(body.type==='create'||body.type==='join'){
   if(membership)throw new GameError('Önce mevcut takımından ayrıl.');
   let code;
   if(body.type==='create'){code=randomBytes(5).toString('hex').slice(0,8).toUpperCase();await tx.prepare('INSERT INTO crews (code,created_at) VALUES (?,?)').bind(code,Date.now()).run();}
   else{code=String(body.code||'').trim().toUpperCase();if(!/^[A-F0-9]{8}$/.test(code))throw new GameError('Sekiz karakterli takım kodunu kontrol et.');if(!await tx.prepare('SELECT code FROM crews WHERE code=?').bind(code).first())throw new GameError('Bu kodla bir takım bulunamadı.');}
   const count=await tx.prepare('SELECT COUNT(*) AS count FROM crew_members WHERE code=?').bind(code).first();if(count.count>=8)throw new GameError('Bu takımda sekiz kaşif var. Başka bir takım seç.');
   await tx.prepare('INSERT INTO crew_members (player_id,code,joined_at) VALUES (?,?,?)').bind(id,code,Date.now()).run();
  }else{
   if(!membership)throw new GameError('Önce bir takıma katıl.');
   if(body.type==='leave'){await tx.prepare('DELETE FROM crew_members WHERE player_id=?').bind(id).run();return;}
   if(body.type==='claim'){
    const crew=await crewView(tx,id);if(!crew.goal.ready)throw new GameError('Takım hedefi için en az iki kişiyle 15 karar keşfedin.');
    const row=await tx.prepare('SELECT * FROM players WHERE id=?'+tx.lockSuffix).bind(id).first(),d=JSON.parse(row.document);d.adventure||={};if(d.adventure.teamReward)return;d.adventure.teamReward=true;
    await tx.prepare('UPDATE players SET document=?,version=version+1 WHERE id=?').bind(JSON.stringify(d),id).run();return;
   }
   if(!/^[0-9a-f-]{36}$/i.test(body.requestId||''))throw new GameError('İşlemi yeniden başlat.');
   const receipt=await tx.prepare('SELECT sender_id FROM crew_events WHERE id=?').bind(body.requestId).first();if(receipt){if(receipt.sender_id!==id)throw new GameError('İşlem doğrulanamadı.');return;}
   const target=await tx.prepare('SELECT p.id FROM players p JOIN crew_members m ON p.id=m.player_id WHERE m.code=? AND p.username_key=?').bind(membership.code,String(body.to||'').trim().normalize('NFKC').toLocaleLowerCase('tr-TR')).first();
   if(!target||target.id===id)throw new GameError('Takımındaki başka bir kaşifi seç.');
   const rows=await tx.prepare('SELECT * FROM players WHERE id IN (?,?) ORDER BY id'+tx.lockSuffix).bind(id,target.id).all();
   const sender=rows.results.find(p=>p.id===id),receiver=rows.results.find(p=>p.id===target.id),s=JSON.parse(sender.document),r=JSON.parse(receiver.document);s.adventure||={};r.adventure||={};s.adventure.inventory||=[];r.adventure.inventory||=[];
   if(body.type==='thanks'){
    const exists=await tx.prepare("SELECT id FROM crew_events WHERE sender_id=? AND recipient_id=? AND kind='thanks' AND day_key=?").bind(id,target.id,day).first();if(exists)throw new GameError('Bu arkadaşına bugün zaten teşekkür ettin.');
    r.adventure.thanks=(r.adventure.thanks||0)+1;
   }else{
    if(!items.some(i=>i.id===body.item)||!s.adventure.inventory.includes(body.item))throw new GameError('Çantandaki bir koleksiyon parçasını seç.');
    if(r.adventure.inventory.includes(body.item))throw new GameError('Arkadaşında bu parça zaten var.');
    s.adventure.inventory=s.adventure.inventory.filter(i=>i!==body.item);if(s.adventure.equipped===body.item)s.adventure.equipped=null;r.adventure.inventory.push(body.item);r.adventure.giftsReceived=(r.adventure.giftsReceived||0)+1;
   }
   await tx.prepare('UPDATE players SET document=?,version=version+1 WHERE id=?').bind(JSON.stringify(s),id).run();
   await tx.prepare('UPDATE players SET document=?,version=version+1 WHERE id=?').bind(JSON.stringify(r),target.id).run();
   await tx.prepare('INSERT INTO crew_events (id,code,sender_id,recipient_id,kind,item_key,day_key,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(body.requestId,membership.code,id,target.id,body.type,body.type==='gift'?body.item:null,day,Date.now()).run();
  }
 });
}
