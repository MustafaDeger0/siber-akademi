import {worlds} from './worlds.mjs';
export function islandCleared(d,id){const w=worlds.find(w=>w.id===id);return !!w&&((d.cleared||[]).includes(id)||((d.done||[]).includes(id)&&w.questions.every((_,i)=>(d.claimed||[]).includes(id+':'+i)&&!(d.review||[]).includes(id+':'+i))));}
export function islandOpen(d,id){const index=worlds.findIndex(w=>w.id===id);return index>=0&&worlds.slice(0,index).every(w=>islandCleared(d,w.id));}
export function validResponse(q,response){
 if(q.type==='settings')return Array.isArray(response)&&response.length===q.fields.length&&response.every((n,i)=>Number.isInteger(n)&&n>=0&&n<q.fields[i].options.length);
 const type=q.type||'single',index=n=>Number.isInteger(n)&&n>=0&&n<q.options.length;
 if(type==='single'||type==='binary')return index(response);
 if(!Array.isArray(response)||!response.every(index))return false;
 if(type==='multi'||type==='evidence')return response.length===(q.pick||q.correct.length)&&new Set(response).size===response.length;
 if(type==='order')return response.length===q.options.length&&new Set(response).size===response.length;
 if(type==='match')return response.length===q.items.length;
 return false;
}
export function responseCorrect(q,response){if(!validResponse(q,response))return false;if(!Array.isArray(q.correct))return response===q.correct;if(q.type==='multi'||q.type==='evidence')return [...response].sort((a,b)=>a-b).every((v,i)=>v===[...q.correct].sort((a,b)=>a-b)[i]);return response.every((v,i)=>v===q.correct[i]);}
export function answerText(q){if(q.type==='settings')return q.fields.map((field,i)=>field.label+': '+field.options[q.correct[i]]).join(' · ');if(q.type==='multi'||q.type==='evidence')return q.correct.map(i=>q.options[i]).join(' · ');if(q.type==='order')return q.correct.map((i,n)=>(n+1)+'. '+q.options[i]).join(' → ');if(q.type==='match')return q.items.map((item,i)=>item+' → '+q.options[q.correct[i]]).join(' · ');return q.options[q.correct];}
