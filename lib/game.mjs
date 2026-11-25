import {worlds} from '../public/worlds.mjs';
import {islandOpen,islandCleared,validResponse,responseCorrect} from '../public/learning-rules.mjs';
import {GameError} from './errors.mjs';
import {adventureActions,adventureTransition} from './adventure.mjs';
export {GameError} from './errors.mjs';
export const answers=Object.fromEntries(worlds.map(w=>[w.id,w.questions.map(q=>q.correct)]));
export const avatars=['pilot','ninja','robot','fox','cat','axolotl','turtle','jellyfish'];
export function validateProfile(body){
 const username=String(body.username||'').trim().normalize('NFKC');
 if(!/^[a-zA-Z0-9_ÇĞİÖŞÜçğıöşü]{3,20}$/.test(username))throw new GameError('Kullanici adin 3-20 harf, rakam veya alt çizgiden oluşmalı.');
 if(!avatars.includes(body.avatar))throw new GameError('Koleksiyondan bir avatar seç.');
 return {username,usernameKey:username.toLocaleLowerCase('tr-TR'),avatar:body.avatar};
}
export function fresh(){return {done:[],attempts:{},claimed:[],bonus:[],daily:{},penalties:{},review:[],total:0,run:null};}
export function dateKey(now=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(now);}
export function transition(document,action,day=dateKey()){
 if(adventureActions.has(action.type))return adventureTransition(document,action);
 const d=structuredClone(document);d.penalties||={};d.review||=[];d.runs||={};let correct=null,delta=0,mastered=null;
 d.cleared||=[];for(const world of worlds)if(islandCleared(d,world.id)&&!d.cleared.includes(world.id))d.cleared.push(world.id);
 if(d.run?.contentVersion===3&&!d.run.practice)d.runs[d.run.mission]=d.run;
 const learned=(mission,i)=>d.claimed.includes(mission+':'+i)&&!d.review.includes(mission+':'+i);
 if(action.type==='start'){
  if(!islandOpen(d,action.mission))throw new GameError('Bu ada henüz açılmadı. Önce önceki adanın beş kararını tamamla.');
  if(!Object.hasOwn(answers,action.mission))throw new GameError('Görev bulunamadi.');
  const saved=d.runs[action.mission],resume=action.mode==='resume',length=answers[action.mission].length;
  if(resume&&saved&&!saved.complete){d.run=saved;d.run.skipLearned=true;while(d.run.step<length&&learned(action.mission,d.run.step))d.run.step++;}
  else{const pending=answers[action.mission].findIndex((_,i)=>!learned(action.mission,i));
   d.run={id:action.runId,mission:action.mission,step:resume&&pending>=0?pending:0,mistakes:0,complete:false,contentVersion:3,results:[],startTotal:d.total,skipLearned:resume&&pending>=0};
  }
  if(action.mode==='practice'){d.run.practice=true;d.run.skipLearned=false;d.run.step=0;}
  else d.runs[action.mission]=d.run;
 }else{
  const saved=Object.values(d.runs).find(r=>r.id===action.runId&&r.contentVersion===3);
  if(saved)d.run=saved;
  if(!d.run||d.run.id!==action.runId||d.run.contentVersion!==3)throw new GameError('Bu kesif güncellendi. Bölgeyi yeniden aç.');
  const r=d.run,expected=answers[r.mission];
  if(!islandOpen(d,r.mission))throw new GameError('Önce önceki adayı tamamla, sonra bu keşfe devam edebilirsin.');
  const question=worlds.find(w=>w.id===r.mission)?.questions[action.step];
  if(r.practice){
   if(action.type==='answer'){
    if(!Number.isInteger(action.step)||!question||!validResponse(question,action.option))throw new GameError('Etkinlikteki seçimlerini tamamla.');
    if(r.results[action.step])return {document:d,...r.results[action.step],replayed:true};
    if(r.complete||r.step!==action.step)throw new GameError('Önce sıradaki ısınma kararını tamamla.');
    correct=responseCorrect(question,action.option);r.results[r.step]={correct,delta:0,choice:action.option,penaltyReason:'practice'};r.step++;
   }else if(action.type==='complete'){if(r.step!==expected.length)throw new GameError('Önce ısınma turunu tamamla.');r.complete=true;r.mastered=false;}
   else throw new GameError('İşlem bulunamadı.');
   return {document:d,correct,delta:0,mastered:false};
  }
  if(!expected)throw new GameError('Görev bulunamadi.');
  if(action.type==='answer'){
   if(!Number.isInteger(action.step)||!question||!validResponse(question,action.option))throw new GameError('Etkinlikteki seçimlerini tamamla.');
   if(r.results[action.step])return {document:d,...r.results[action.step],replayed:true};
   if(r.complete||action.step!==r.step)throw new GameError('Önce siradaki adımı tamamla.');
   d.attempts[r.mission]=(d.attempts[r.mission]||0)+1;correct=responseCorrect(question,action.option);const before=d.total,claim=r.mission+':'+r.step;let penaltyReason=null;
   if(correct){if(!d.claimed.includes(claim)){d.claimed.push(claim);d.total+=30;}
    d.review=d.review.filter(id=>id!==claim);
    const daily=d.daily[day]||[];if(!daily.includes(claim))daily.push(claim);d.daily[day]=daily;
    if(daily.length>=3&&!d.bonus.includes('daily:'+day)){d.bonus.push('daily:'+day);d.total+=30;}
   }else{r.mistakes++;if(!d.review.includes(claim))d.review.push(claim);const penalties=d.penalties[day]||[];
    if(!penalties.includes(claim)){penalties.push(claim);penaltyReason=d.total<10?'floor':'charged';d.total=Math.max(0,d.total-10);}else penaltyReason='already-charged';d.penalties[day]=penalties;
   }delta=d.total-before;r.results[r.step]={correct,delta,choice:action.option,penaltyReason};r.step++;
   if(r.skipLearned)while(r.step<expected.length&&learned(r.mission,r.step))r.step++;
  }else if(action.type==='complete'){
   if(r.step!==expected.length)throw new GameError('Rozet için bölgedeki tüm kararları tamamla.');
   mastered=expected.every((_,i)=>d.claimed.includes(r.mission+':'+i)&&!d.review.includes(r.mission+':'+i));r.mastered=mastered;
   if(!r.complete){if(mastered&&!d.cleared.includes(r.mission))d.cleared.push(r.mission);if(mastered&&!d.done.includes(r.mission)){d.done.push(r.mission);d.total+=30;}
    if(r.mistakes===0&&r.results.filter(Boolean).length===expected.length&&!d.bonus.includes('perfect')){d.bonus.push('perfect');d.total+=30;}
    if(worlds.every(w=>d.done.includes(w.id)&&w.questions.every((_,i)=>d.claimed.includes(w.id+':'+i)&&!d.review.includes(w.id+':'+i)))&&!d.bonus.includes('master')){d.bonus.push('master');d.total+=60;}r.complete=true;
   }
  }else throw new GameError('Islem bulunamadi.');
 }return {document:d,correct,delta,mastered};
}
