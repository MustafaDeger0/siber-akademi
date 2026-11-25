import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,transition,answers} from './game.mjs';
import {worlds} from '../public/worlds.mjs';
import {islandOpen,validResponse,responseCorrect} from '../public/learning-rules.mjs';
const apply=(d,a)=>transition(d,a,'2026-11-25').document;
test('islands open only in sequence after actual completion; practice and old saved runs cannot bypass locks',()=>{
 let d=fresh();for(const mode of ['resume','restart','practice'])for(const w of worlds.slice(1))assert.throws(()=>apply(d,{type:'start',mission:w.id,mode,runId:'skip'}));
 d=apply(d,{type:'start',mission:'message',runId:'first'});for(let step=0;step<5;step++)d=apply(d,{type:'answer',runId:'first',step,option:answers.message[step]});
 assert.equal(islandOpen(d,'account'),false);d=apply(d,{type:'complete',runId:'first'});assert.equal(islandOpen(d,'account'),true);assert.equal(islandOpen(d,'privacy'),false);
 d=apply(d,{type:'start',mission:'message',runId:'repeat'});d=apply(d,{type:'answer',runId:'repeat',step:0,option:0});assert.equal(islandOpen(d,'account'),true,'replaying a won island does not remove its unlock');
 const old=fresh();old.run={id:'old',mission:'gaming',step:0,contentVersion:3,results:[],complete:false};assert.throws(()=>apply(old,{type:'answer',runId:'old',step:0,option:1}));
});
test('a missed decision must be learned before the next island opens',()=>{
 let d=apply(fresh(),{type:'start',mission:'message',runId:'m'});for(let step=0;step<5;step++)d=apply(d,{type:'answer',runId:'m',step,option:step===0?0:answers.message[step]});d=apply(d,{type:'complete',runId:'m'});assert.equal(islandOpen(d,'account'),false);
 d=apply(d,{type:'start',mission:'message',mode:'resume',runId:'review'});d=apply(d,{type:'answer',runId:'review',step:0,option:1});d=apply(d,{type:'complete',runId:'review'});assert.equal(islandOpen(d,'account'),true);
});
test('legacy badges with three old decisions do not unlock a successor; five learned decisions do',()=>{
 let d=fresh();d.done=['message'];d.claimed=['message:0','message:1','message:2'];assert.equal(islandOpen(d,'account'),false);d.claimed.push('message:3','message:4');assert.equal(islandOpen(d,'account'),true);
});
test('multiple selections, ordering, matching and binary decisions are evaluated by their own rules',()=>{
 const multi=worlds[1].questions[3],order=worlds[1].questions[4],match=worlds[2].questions[4],binary=worlds[3].questions[2];
 assert.equal(validResponse(multi,1),false);assert.equal(validResponse(multi,[0,0]),false);assert.equal(validResponse(multi,[0]),false);assert.equal(responseCorrect(multi,[2,0]),true);assert.equal(responseCorrect(multi,[0,1]),false);
 assert.equal(validResponse(order,[1,1,2]),false);assert.equal(responseCorrect(order,[1,0,2]),true);assert.equal(responseCorrect(order,[0,1,2]),false);
 assert.equal(validResponse(match,[1,2]),false);assert.equal(responseCorrect(match,[1,2,2,0]),true);assert.equal(responseCorrect(match,[1,2,0,0]),false);
 assert.equal(validResponse(binary,2),false);assert.equal(responseCorrect(binary,1),true);
});
