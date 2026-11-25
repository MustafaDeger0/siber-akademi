import {crewRoles} from '../public/learning-lab-data.mjs';
import {validResponse,responseCorrect} from '../public/learning-rules.mjs';
import {GameError} from './errors.mjs';
export function projectFor(rows,stored){const ids=rows.map(row=>row.id);if(stored&&JSON.stringify(stored.members)===JSON.stringify(ids))return stored;return {members:ids,contributions:{},approvals:[],complete:false};}
export async function projectView(db,code,rows,id){const record=await db.prepare('SELECT document FROM crew_projects WHERE code=?').bind(code).first(),p=projectFor(rows,record?JSON.parse(record.document):null),role=crewRoles[Math.max(0,p.members.indexOf(id))%crewRoles.length];
 return {title:'Takımın güvenli müdahale planı',ready:rows.length>=2,complete:p.complete,mine:{role:role.name,question:role.question,contributed:!!p.contributions[id],approved:p.approvals.includes(id)},members:rows.map((row,i)=>({username:row.username,role:crewRoles[i%crewRoles.length].name,contributed:!!p.contributions[row.id],approved:p.approvals.includes(row.id)})),allContributed:rows.length>=2&&rows.every(row=>!!p.contributions[row.id]),plan:rows.every(row=>!!p.contributions[row.id])?['Süre baskısı ile parola/kod talebini somut kanıt olarak belirledik.','Bilgi paylaşmadan durup bağımsız resmî kanaldan yetişkinle doğrulamayı planladık.','Kanıtı yaymadan ve kişisel bilgileri koruyarak destek isteyeceğiz.']:[]};
}
export async function projectAction(tx,id,code,body,day){
 const rows=(await tx.prepare('SELECT p.id,p.username,p.document FROM players p JOIN crew_members m ON p.id=m.player_id WHERE m.code=? ORDER BY m.joined_at ASC,p.id ASC').bind(code).all()).results;
 if(rows.length<2)throw new GameError('Ortak çözüm için en az iki takım arkadaşı gerekiyor.');
 const record=await tx.prepare('SELECT document FROM crew_projects WHERE code=?').bind(code).first(),p=projectFor(rows,record?JSON.parse(record.document):null),index=p.members.indexOf(id);if(index<0)throw new GameError('Önce bu takıma katıl.');
 if(p.complete)return;
 if(body.type==='project-contribute'){
  const q=crewRoles[index%crewRoles.length].question;if(!validResponse(q,body.option))throw new GameError('Görevindeki seçimlerini tamamla.');
  if(!responseCorrect(q,body.option))throw new GameError(q.why+' İpucunu kullanarak yeniden deneyebilirsin; puanın değişmedi.');
  p.contributions[id]={day,role:crewRoles[index%crewRoles.length].id};
 }else{
  if(!rows.every(row=>p.contributions[row.id]))throw new GameError('Önce her takım arkadaşı kendi görev parçasını çözmeli.');
  if(!p.approvals.includes(id))p.approvals.push(id);
  if(rows.every(row=>p.approvals.includes(row.id))){p.complete=true;p.completedAt=day;
   const locked=(await tx.prepare('SELECT id,document FROM players WHERE id IN (SELECT player_id FROM crew_members WHERE code=?) ORDER BY id'+tx.lockSuffix).bind(code).all()).results;
   for(const row of locked){const d=JSON.parse(row.document);d.learning||={};d.learning.teamProjectWon=true;await tx.prepare('UPDATE players SET document=?,version=version+1 WHERE id=?').bind(JSON.stringify(d),row.id).run();}
  }
 }
 await tx.prepare('INSERT INTO crew_projects (code,document) VALUES (?,?) ON CONFLICT(code) DO UPDATE SET document=excluded.document').bind(code,JSON.stringify(p)).run();
}
