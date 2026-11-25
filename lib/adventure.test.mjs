import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,transition,answers} from './game.mjs';
import {adventureView} from './adventure.mjs';
import {finalQuestions,items} from '../public/adventure-data.mjs';
import {openDatabase} from './database.mjs';
import {crewAction,crewView} from './crew.mjs';
import {api} from './api.mjs';
import {randomUUID} from 'node:crypto';
const apply=(d,a)=>transition(d,a,'2026-11-25').document;
function mastered(){const d=fresh();for(const [id,list] of Object.entries(answers)){d.done.push(id);for(let i=0;i<list.length;i++)d.claimed.push(id+':'+i);}d.total=1200;return d;}
test('existing achievements fund cosmetic collectibles without changing XP; locks and ownership are enforced',()=>{
 let d=mastered();const before=structuredClone(d);assert.equal(adventureView(d).gems,270);
 d=apply(d,{type:'buy',item:'compass'});assert.equal(adventureView(d).gems,255);assert.equal(d.total,1200);assert.deepEqual(d.claimed,before.claimed);
 assert.deepEqual(apply(d,{type:'buy',item:'compass'}),d);
 d=apply(d,{type:'equip',item:'compass'});assert.equal(adventureView(d).equipped,'compass');
 assert.throws(()=>apply(d,{type:'equip',item:'shield'}));
 assert.throws(()=>apply(fresh(),{type:'buy',item:'compass'}));
 const legacy=fresh();legacy.done=['message'];legacy.claimed=['message:0','message:1','message:2'];assert.throws(()=>apply(legacy,{type:'buy',item:'key'}));
 assert.throws(()=>apply(d,{type:'path',path:'hacker'}));d=apply(d,{type:'path',path:'social'});assert.equal(adventureView(d).path,'social');
});
test('practice is unscored and leaves a scored checkpoint, review, daily progress and rewards intact',()=>{
 let d=apply(fresh(),{type:'start',mission:'message',mode:'resume',runId:'real'});
 d=apply(d,{type:'answer',step:0,option:1,runId:'real'});const original=structuredClone(d);
 d=apply(d,{type:'start',mission:'message',mode:'practice',runId:'practice'});
 for(let step=0;step<5;step++)d=apply(d,{type:'answer',step,option:0,runId:'practice'});
 d=apply(d,{type:'complete',runId:'practice'});assert.equal(d.total,30);assert.deepEqual(d.claimed,original.claimed);assert.deepEqual(d.review,original.review);assert.deepEqual(d.daily,original.daily);assert.deepEqual(d.attempts,original.attempts);assert.deepEqual(d.runs.message,original.runs.message);
 d=apply(d,{type:'start',mission:'message',mode:'resume',runId:'unused'});assert.equal(d.run.id,'real');assert.equal(d.run.step,1);assert.equal(d.run.practice,undefined);
});
test('final requires current mastery, enforces ordered decisions and pays the passing bonus once',()=>{
 assert.throws(()=>apply(fresh(),{type:'final-start',runId:'f'}));let d=mastered();d.review=['message:0'];assert.throws(()=>apply(d,{type:'final-start',runId:'f'}));d.review=[];
 d=apply(d,{type:'final-start',runId:'f'});assert.throws(()=>apply(d,{type:'final-complete',runId:'f'}));assert.throws(()=>apply(d,{type:'final-answer',runId:'f',step:3,option:0}));
 for(let step=0;step<6;step++){const option=step===0?(finalQuestions[step].correct+1)%3:finalQuestions[step].correct;d=apply(d,{type:'final-answer',runId:'f',step,option});}
 d=apply(d,{type:'final-complete',runId:'f'});assert.equal(d.adventure.final.score,5);assert.equal(d.adventure.finalWon,true);assert.equal(d.total,1290);
 assert.equal(apply(d,{type:'final-complete',runId:'f'}).total,1290);
 d=apply(d,{type:'final-start',runId:'f2'});for(let step=0;step<6;step++)d=apply(d,{type:'final-answer',runId:'f2',step,option:finalQuestions[step].correct});d=apply(d,{type:'final-complete',runId:'f2'});assert.equal(d.total,1290);
});
test('a missed final can be retried with feedback, without losing earned XP',()=>{
 let d=apply(mastered(),{type:'final-start',runId:'f'});for(let step=0;step<6;step++)d=apply(d,{type:'final-answer',runId:'f',step,option:(finalQuestions[step].correct+1)%3});d=apply(d,{type:'final-complete',runId:'f'});assert.equal(d.total,1200);assert.equal(d.adventure.final.passed,false);assert.equal(d.adventure.finalWon,undefined);
});
test('team gifts and thanks use private references and atomic, idempotent ownership updates',async()=>{
 process.env.SQLITE_PATH=':memory:';const db=await openDatabase('');
 const put=async(id,name,d=mastered())=>db.prepare('INSERT INTO players (id,username,username_key,avatar,xp,completed,document,version,created_at) VALUES (?,?,?,?,?,?,?,0,?)').bind(id,name,name.toLowerCase(),'fox',d.total,d.done.length,JSON.stringify(d),Date.now()).run();
 const day='2026-11-25';
 try{
  let d=apply(mastered(),{type:'buy',item:'compass'});await put('private-a','KasifA',d);await put('private-b','KasifB');await put('private-c','KasifC');
  await crewAction(db,'private-a',{type:'create'},day);const crew=await crewView(db,'private-a');await crewAction(db,'private-b',{type:'join',code:crew.code},day);
  assert.equal(JSON.stringify(await crewView(db,'private-b')).includes('private-a'),false);assert.equal((await crewView(db,'private-b')).goal.ready,true);
  await crewAction(db,'private-a',{type:'claim'},day);await crewAction(db,'private-a',{type:'claim'},day);let row=await db.prepare('SELECT * FROM players WHERE id=?').bind('private-a').first();assert.equal(adventureView(JSON.parse(row.document)).gems,275);
  const gift={type:'gift',item:'compass',to:'KasifB',requestId:randomUUID()};await Promise.all([crewAction(db,'private-a',gift,day),crewAction(db,'private-a',gift,day)]);
  row=await db.prepare('SELECT * FROM players WHERE id=?').bind('private-a').first();assert.equal(adventureView(JSON.parse(row.document)).inventory.includes('compass'),false);
  const recipient=await db.prepare('SELECT * FROM players WHERE id=?').bind('private-b').first();assert.deepEqual(adventureView(JSON.parse(recipient.document)).inventory,['compass']);assert.equal(JSON.parse(recipient.document).total,1200);
  await assert.rejects(crewAction(db,'private-a',{...gift,to:'KasifC',requestId:randomUUID()},day));
  const thank={type:'thanks',to:'KasifB',requestId:randomUUID()};await crewAction(db,'private-a',thank,day);await crewAction(db,'private-a',thank,day);
  await assert.rejects(crewAction(db,'private-a',{...thank,requestId:randomUUID()},day));
  row=await db.prepare('SELECT * FROM players WHERE id=?').bind('private-b').first();assert.equal(adventureView(JSON.parse(row.document)).thanks,1);
  await assert.rejects(crewAction(db,'private-a',{type:'gift',item:'shield',to:'KasifB',requestId:randomUUID()},day));
  await crewAction(db,'private-b',{type:'leave'},day);assert.equal(await crewView(db,'private-b'),null);
 }finally{await db.close();}
});
test('API rejects forged rewards, returns adventure state and reset removes collectibles and final progress',async()=>{
 process.env.SQLITE_PATH=':memory:';const db=await openDatabase('');const id='api-private';
 const call=(path,body,method='POST')=>api(new Request('https://academy.example'+path,{method:body?method:'GET',headers:{origin:'https://academy.example',...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),db,{userId:id});
 try{
  assert.equal((await call('/api/profile',{username:'ApiKasif',avatar:'fox'},'PUT')).status,200);
  let response=await call('/api/game',{type:'buy',item:'shield',gems:99999,xp:99999});assert.equal(response.status,400);
  response=await call('/api/game',{type:'path',path:'social'});assert.equal((await response.json()).player.adventure.path,'social');
  await call('/api/crew',{type:'create'});assert.ok((await (await call('/api/crew')).json()).crew.code);
  response=await call('/api/reset',{confirmation:'SIFIRLA'});const p=(await response.json()).player;assert.equal(p.adventure.gems,0);assert.deepEqual(p.adventure.inventory,[]);assert.equal(p.adventure.finalWon,false);assert.equal(p.username,'ApiKasif');
 }finally{await db.close();}
});
