import {worlds} from '../public/worlds.mjs';
import {reviewQuestion,transferTasks} from '../public/learning-lab-data.mjs';
import {islandOpen,islandCleared,validResponse,responseCorrect} from '../public/learning-rules.mjs';
import {GameError} from './errors.mjs';
export const learningActions=new Set(['review-start','review-answer','transfer-start','transfer-answer']);
export function addDays(day,days){const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);}
export function ensureLearning(d,day){d.learning||={};d.learning.skills||={};d.learning.transfers||={};for(const w of worlds){if(!d.learning.skills[w.id])d.learning.skills[w.id]={attempts:0,correct:0,recent:[],reviewStage:0,...(islandCleared(d,w.id)?{nextReview:day,baseline:true}:{})};}return d.learning;}
export function adaptation(d,id){const s=d.learning?.skills?.[id]||{recent:[],attempts:0},recent=s.recent||[],failures=recent.filter(x=>!x.correct).length,independent=recent.filter(x=>x.correct&&!x.hintUsed).length;
 const level=failures>=2?1:independent>=3&&failures===0?3:2;
 return {id,level,guided:failures>=2,attempts:s.attempts||0,reason:failures>=2?'Bu beceride birkaç kez zorlandın; ipuçlu bir örnekle güçlenebilirsin.':level===3?'Son yanıtların güçlü; yeni bir durumu birden fazla koşulla çözebilirsin.':(s.attempts||0)===0?'Henüz yeterli yanıt verisi yok. İlk kontrolle sana uygun desteği belirleyeceğiz.':'Bir yeni örnekle becerini pekiştirebilirsin.'};
}
export function recordAttempt(d,id,correct,hintUsed,day,kind='core'){const learning=ensureLearning(d,day),s=learning.skills[id];s.attempts++;if(correct)s.correct++;s.recent=[...(s.recent||[]),{correct:!!correct,hintUsed:!!hintUsed,day,kind}].slice(-6);}
export function markMastery(d,id,day){const s=ensureLearning(d,day).skills[id];if(!s.nextReview){s.nextReview=addDays(day,1);s.reviewStage=0;s.baseline=false;}}
export function learningView(document,day){const d=structuredClone(document),l=ensureLearning(d,day),open=worlds.filter(w=>islandOpen(d,w.id)),due=worlds.filter(w=>islandCleared(d,w.id)&&l.skills[w.id].nextReview&&l.skills[w.id].nextReview<=day).map(w=>({id:w.id,name:w.name,due:l.skills[w.id].nextReview,baseline:!!l.skills[w.id].baseline})).sort((a,b)=>a.due.localeCompare(b.due));
 const candidates=open.map(w=>adaptation(d,w.id)),recommended=candidates.find(s=>s.guided)||candidates.find(s=>due.some(x=>x.id===s.id))||candidates.find(s=>!islandCleared(d,s.id))||candidates[0];
 return {adaptive:candidates,recommended,due,schedules:worlds.filter(w=>islandCleared(d,w.id)).map(w=>({id:w.id,name:w.name,nextReview:l.skills[w.id].nextReview,checks:l.skills[w.id].reviewChecks||0,stage:l.skills[w.id].reviewStage||0})),reviewRun:l.reviewRun?{...l.reviewRun,question:reviewQuestion(l.reviewRun.skill,l.reviewRun.level)}:null,transferRun:l.transferRun?{...l.transferRun,question:transferTasks.find(t=>t.id===l.transferRun.taskId)}:null,transfers:transferTasks.map(t=>({id:t.id,title:t.title,type:t.type,skill:t.skill,unlockName:worlds.find(w=>w.id===t.unlock)?.name,open:islandCleared(d,t.unlock),complete:!!l.transfers[t.id]?.complete,lastResult:l.transfers[t.id]?.lastResult||null})),teacherNote:l.teacherNote||null,teamProjectWon:!!l.teamProjectWon};
}
export function learningTransition(document,action,day){const d=structuredClone(document),l=ensureLearning(d,day);let correct=null;
 if(action.type==='review-start'){
  const view=learningView(d,day),id=action.mission||view.due[0]?.id||view.recommended?.id;if(!islandOpen(d,id))throw new GameError('Önce bu becerinin adasını aç.');
  const level=adaptation(d,id).level;l.reviewRun={id:action.runId,skill:id,level,step:0,results:[],complete:false,spaced:view.due.some(x=>x.id===id)};
 }else if(action.type==='transfer-start'){
  const task=transferTasks.find(t=>t.id===action.item);if(!task||!islandCleared(d,task.unlock))throw new GameError('Bu uygulama için ilgili adayı tamamla.');
  l.transferRun={id:action.runId,taskId:task.id,skill:task.skill,step:0,results:[],complete:false};
 }else{
  const review=action.type==='review-answer',r=review?l.reviewRun:l.transferRun;if(!r||r.id!==action.runId)throw new GameError('Öğrenme etkinliğini yeniden aç.');
  const question=review?reviewQuestion(r.skill,r.level):transferTasks.find(t=>t.id===r.taskId);
  if(action.step!==0||!question||!validResponse(question,action.option))throw new GameError('Etkinlikteki seçimlerini tamamla.');
  if(r.complete)return {document:d,...r.results[0],delta:0,replayed:true};
  correct=responseCorrect(question,action.option);recordAttempt(d,r.skill,correct,action.hintUsed,day,review?'recall':'application');r.results=[{correct,delta:0,choice:action.option,penaltyReason:'learning'}];r.step=1;r.complete=true;
  if(review){const s=l.skills[r.skill];s.reviewChecks=(s.reviewChecks||0)+1;s.lastReview=day;s.lastRecallCorrect=correct;s.baseline=false;if(r.spaced){s.reviewStage=correct&&!action.hintUsed?Math.min(3,(s.reviewStage||0)+1):0;s.nextReview=addDays(day,[1,3,7,14][s.reviewStage]);}}
  else{const previous=l.transfers[r.taskId]||{};l.transfers[r.taskId]={complete:previous.complete||correct,attempts:(previous.attempts||0)+1,lastResult:{correct,day},completedAt:correct?(previous.completedAt||day):previous.completedAt||null};}
 }
 return {document:d,correct,delta:0};
}
