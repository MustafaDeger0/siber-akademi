import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,transition,validateProfile,answers,dateKey,avatars} from './game.mjs';
import {characters,drawCharacter} from '../public/characters.mjs';
import {drawBadge} from '../public/badge-art.mjs';
const day='2026-11-24';
const apply=(d,a,date=day)=>transition(d,a,date).document;
function finish(d,mission,runId,wrongSteps=[],date=day){d=apply(d,{type:'start',mission,runId},date);for(let step=0;step<answers[mission].length;step++)d=apply(d,{type:'answer',runId,step,option:wrongSteps.includes(step)?(answers[mission][step]+1)%3:answers[mission][step]},date);return apply(d,{type:'complete',runId},date);}
test('eight distinct characters keep old avatar identifiers and valid profile rules',()=>{assert.equal(characters.length,8);assert.deepEqual(characters.map(c=>c.id),avatars);assert.equal(new Set(characters.map(c=>c.art)).size,8);for(const c of characters){assert.ok(drawCharacter(c.id).includes('<svg'));assert.equal(validateProfile({username:'Çiçek_İzci',avatar:c.id}).avatar,c.id)}for(const username of ['ab','<script>','a b','a'.repeat(21)])assert.throws(()=>validateProfile({username,avatar:'pilot'}));assert.throws(()=>validateProfile({username:'Kaşif',avatar:'unknown'}));});
test('each collectible has distinct art and an actual locked state',()=>{for(const id of [...Object.keys(answers),'spark','master']){const owned=drawBadge(id),locked=drawBadge(id,true);assert.ok(owned.includes('<svg'));assert.ok(locked.includes('premium-badge locked'));assert.ok(!owned.includes('premium-badge locked'));}});
test('invalid missions, skipped answers and expired runs cannot grant XP',()=>{for(const mission of ['unknown','__proto__'])assert.throws(()=>apply(fresh(),{type:'start',mission,runId:'x'}));let d=apply(fresh(),{type:'start',mission:'message',runId:'a'});assert.throws(()=>apply(d,{type:'complete',runId:'a'}));assert.throws(()=>apply(d,{type:'answer',runId:'a',step:2,option:0}));assert.throws(()=>apply(d,{type:'answer',runId:'other',step:0,option:1}));d.run.contentVersion=2;assert.throws(()=>apply(d,{type:'answer',runId:'a',step:0,option:1}));});
test('wrong answers preserve XP and advance exactly once; retries cannot alter or charge the decision',()=>{let d=fresh();d.total=50;d=apply(d,{type:'start',mission:'message',runId:'a'});const result=transition(d,{type:'answer',runId:'a',step:0,option:0},day);d=result.document;assert.equal(result.correct,false);assert.equal(result.delta,0);assert.equal(d.total,50);assert.equal(d.run.step,1);assert.equal(d.run.mistakes,1);assert.deepEqual(d.review,['message:0']);const repeat=transition(d,{type:'answer',runId:'a',step:0,option:1},day);assert.equal(repeat.correct,false);assert.equal(repeat.replayed,true);assert.deepEqual(repeat.document,d);});
test('mistakes preserve positive scores across restarts and days',()=>{let d=fresh();d.total=6;for(const [i,date] of ['2026-11-24','2026-11-24','2026-11-25'].entries()){d=apply(d,{type:'start',mission:'message',mode:'restart',runId:'safe'+i},date);d=apply(d,{type:'answer',runId:'safe'+i,step:0,option:0},date);assert.equal(d.total,6);assert.equal(d.run.results[0].delta,0);assert.equal(d.run.results[0].penaltyReason,'learning');}});
test('correct answer receipts are idempotent and cannot skip subsequent questions',()=>{let d=apply(fresh(),{type:'start',mission:'message',runId:'a'});d=apply(d,{type:'answer',runId:'a',step:0,option:1});assert.equal(d.total,30);assert.equal(d.run.step,1);assert.deepEqual(apply(d,{type:'answer',runId:'a',step:0,option:0}),d);assert.throws(()=>apply(d,{type:'complete',runId:'a'}));});
test('mixed rounds advance through all five questions but require learning missed choices to earn a badge',()=>{let d=fresh();d.total=100;d=finish(d,'message','a',[0]);assert.equal(d.run.step,5);assert.equal(d.run.complete,true);assert.equal(d.run.mastered,false);assert.equal(d.done.length,0);assert.equal(d.total,250);assert.equal(d.bonus.includes('perfect'),false);d=finish(d,'message','b');assert.equal(d.run.mastered,true);assert.deepEqual(d.done,['message']);assert.equal(d.review.length,0);assert.equal(d.total,340);});
test('all six islands reward actual mastery and repeated completion cannot inflate scores',()=>{let d=fresh();for(const id of Object.keys(answers)){d=finish(d,id,id);assert.deepEqual(apply(d,{type:'complete',runId:id}),d);}assert.equal(d.total,1200);assert.equal(d.done.length,6);assert.ok(d.bonus.includes('master'));d=finish(d,'message','again');assert.equal(d.total,1200);});
test('expanded islands preserve previous scores and badges without paying old rewards twice',()=>{let d=fresh();d.done=['message'];d.claimed=['message:0','message:1','message:2'];d.bonus=['perfect','daily:'+day];d.daily[day]=[...d.claimed];d.total=180;d=finish(d,'message','new');assert.equal(d.total,240);assert.deepEqual(d.done,['message']);assert.equal(d.claimed.length,5);d=finish(d,'message','again');assert.equal(d.total,240);});
test('an old earned badge survives a later mistake but the missed question is marked for review',()=>{let d=finish(fresh(),'message','a');d=finish(d,'message','b',[0]);assert.equal(d.total,240);assert.deepEqual(d.done,['message']);assert.equal(d.run.mastered,false);assert.ok(d.review.includes('message:0'));});
test('a new day permits only one daily bonus, not duplicate question rewards',()=>{let d=finish(fresh(),'message','a');d=finish(d,'message','b',[],'2026-11-25');assert.equal(d.total,270);d=finish(d,'message','c',[],'2026-11-25');assert.equal(d.total,270);});
test('daily dates use Turkey timezone across midnight',()=>{assert.equal(dateKey(new Date('2026-11-24T21:01:00Z')),'2026-11-25');});

test('resume persists a separate checkpoint for each island across serialization and island changes',()=>{
 let d=finish(fresh(),'message','earned');d=finish(d,'message','needs-review',[3,4]);d=apply(d,{type:'start',mission:'message',mode:'restart',runId:'m'});
 for(let step=0;step<3;step++)d=apply(d,{type:'answer',runId:'m',step,option:answers.message[step]});
 d=apply(d,{type:'start',mission:'account',mode:'resume',runId:'a'});
 d=apply(d,{type:'answer',runId:'a',step:0,option:answers.account[0]});
 d=apply(JSON.parse(JSON.stringify(d)),{type:'start',mission:'message',mode:'resume',runId:'unused'});
 assert.equal(d.run.id,'m');assert.equal(d.run.step,3);
 d=apply(d,{type:'start',mission:'account',mode:'resume',runId:'unused2'});
 assert.equal(d.run.id,'a');assert.equal(d.run.step,1);
 d=apply(d,{type:'start',mission:'message',mode:'restart',runId:'restart'});
 assert.equal(d.run.step,0);assert.equal(d.run.id,'restart');assert.equal(d.claimed.length,6);
});

test('legacy progress resumes at the first unlearned question and skips later mastered questions',()=>{
 let d=finish(fresh(),'message','first');d.claimed.push('account:0','account:1','account:2','account:4');d.total+=120;const previousPerfect=d.bonus.filter(x=>x==='perfect').length;
 d=apply(d,{type:'start',mission:'account',mode:'resume',runId:'m'});assert.equal(d.run.step,3);
 d=apply(d,{type:'answer',runId:'m',step:3,option:answers.account[3]});assert.equal(d.run.step,5);
 d=apply(d,{type:'complete',runId:'m'});assert.equal(d.run.mastered,true);assert.equal(d.bonus.filter(x=>x==='perfect').length,previousPerfect);
 d=finish(d,'account','wrong',[1]);
 d=apply(d,{type:'start',mission:'account',mode:'resume',runId:'review'});assert.equal(d.run.step,1);
 d=apply(d,{type:'answer',runId:'review',step:1,option:answers.account[1]});assert.equal(d.run.step,5);
 assert.equal(d.review.length,0);
});

test('an unanswered checkpoint survives closing after a wrong answer and a finished round resumes review only',()=>{
 let d=apply(fresh(),{type:'start',mission:'message',mode:'resume',runId:'m'});
 d=apply(d,{type:'answer',runId:'m',step:0,option:0});
 d=apply(d,{type:'start',mission:'message',mode:'resume',runId:'unused'});assert.equal(d.run.step,1);
 for(let step=1;step<5;step++)d=apply(d,{type:'answer',runId:'m',step,option:answers.message[step]});
 d=apply(d,{type:'complete',runId:'m'});
 d=apply(d,{type:'start',mission:'message',mode:'resume',runId:'review'});assert.equal(d.run.step,0);
 d=apply(d,{type:'answer',runId:'review',step:0,option:1});assert.equal(d.run.step,5);
});
