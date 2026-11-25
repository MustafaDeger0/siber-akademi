import {items,paths,chapters,finalQuestions} from '../public/adventure-data.mjs';
import {worlds} from '../public/worlds.mjs';
import {GameError} from './errors.mjs';
export function learnedCount(d,w){return w.questions.filter((_,i)=>d.claimed.includes(w.id+':'+i)&&!d.review?.includes(w.id+':'+i)).length;}
export function mastery(d){return worlds.filter(w=>learnedCount(d,w)===w.questions.length).length;}
export function learningSummary(d){return {known:worlds.reduce((n,w)=>n+learnedCount(d,w),0),review:(d.review||[]).length,skills:worlds.map(w=>({id:w.id,known:learnedCount(d,w),total:w.questions.length})),finalScore:d.adventure?.final?.complete?d.adventure.final.score:null,finalPassed:!!d.adventure?.final?.passed};}
export function adventureView(d){
 const a=d.adventure||{},earned=d.claimed.length*5+d.done.length*20+(a.teamReward?20:0),spent=a.spent||0,n=mastery(d);
 return {path:a.path||'explorer',introduced:!!a.introduced,inventory:a.inventory||[],equipped:a.equipped||null,gems:Math.max(0,earned-spent),spent,earned,chapter:[...chapters].reverse().find(c=>n>=c.at),mastered:n,finalUnlocked:n===6,final:a.final||null,finalWon:!!a.finalWon,thanks:a.thanks||0,giftsReceived:a.giftsReceived||0,teamReward:!!a.teamReward};
}
export const adventureActions=new Set(['path','buy','equip','intro','final-start','final-answer','final-complete']);
export function adventureTransition(document,action){
 const d=structuredClone(document);d.adventure||={};const a=d.adventure;a.inventory||=[];const v=adventureView(d);let correct=null,delta=0;
 if(action.type==='path'){if(!paths.some(p=>p.id===action.path))throw new GameError('Geçerli bir keşif yolu seç.');a.path=action.path;}
 else if(action.type==='intro')a.introduced=true;
 else if(action.type==='buy'){
  const item=items.find(i=>i.id===action.item);if(!item)throw new GameError('Koleksiyon parçası bulunamadı.');
  if(a.inventory.includes(item.id))return {document:d,replayed:true};
  if(v.mastered<item.unlock)throw new GameError('Bu parça için birkaç adada daha ustalaş.');
  if(v.gems<item.cost)throw new GameError('Bu parça için biraz daha ışık taşı biriktir.');
  a.spent=(a.spent||0)+item.cost;a.inventory.push(item.id);
 }else if(action.type==='equip'){
  if(action.item!==null&&!a.inventory.includes(action.item))throw new GameError('Önce bu koleksiyon parçasını edin.');a.equipped=action.item;
 }else if(action.type==='final-start'){
  if(!v.finalUnlocked)throw new GameError('Final için altı adanın bütün kararlarında ustalaş.');
  if(!a.final||a.final.complete||action.mode==='restart')a.final={id:action.runId,step:0,results:[],complete:false,startedAt:Date.now()};
 }else{
  const r=a.final;if(!r||r.id!==action.runId)throw new GameError('Final oturumunu yeniden aç.');
  if(action.type==='final-answer'){
   if(!Number.isInteger(action.step)||!Number.isInteger(action.option)||action.option<0||action.option>2)throw new GameError('Geçerli bir seçim yap.');
   if(r.results[action.step])return {document:d,...r.results[action.step],replayed:true};
   if(r.complete||r.step!==action.step||!finalQuestions[r.step])throw new GameError('Önce sıradaki final kararını tamamla.');
   correct=action.option===finalQuestions[r.step].correct;r.results[r.step]={correct,choice:action.option};r.step++;
  }else if(action.type==='final-complete'){
   if(r.step!==finalQuestions.length)throw new GameError('Önce finalin bütün kararlarını tamamla.');
   const score=r.results.filter(x=>x.correct).length;r.score=score;r.passed=score>=5;r.complete=true;
   if(r.passed&&!a.finalWon){a.finalWon=true;d.total+=90;delta=90;}
  }
 }
 return {document:d,correct,delta};
}
