import test from 'node:test';
import assert from 'node:assert/strict';
import {worlds} from '../public/worlds.mjs';
import {answers} from './game.mjs';
import {validResponse,responseCorrect} from '../public/learning-rules.mjs';
test('six increasingly demanding islands share thirty valid activities and eight interaction formats',()=>{
 assert.equal(worlds.length,6);assert.equal(new Set(worlds.map(w=>w.id)).size,6);
 const all=worlds.flatMap(w=>w.questions);assert.equal(all.length,30);assert.equal(new Set(all.map(q=>q.title)).size,30);
 assert.deepEqual(worlds.map(w=>w.level),[1,2,3,4,5,6]);assert.equal(new Set(all.map(q=>q.type||'single')).size,8);
 for(const w of worlds){assert.equal(w.questions.length,5);assert.deepEqual(answers[w.id],w.questions.map(q=>q.correct));for(const q of w.questions){assert.ok(q.options.length>=2&&q.options.length<=4);assert.equal(new Set(q.options).size,q.options.length);assert.ok(validResponse(q,q.correct));assert.ok(responseCorrect(q,q.correct));for(const key of ['title','text','ask','why','hint'])assert.ok(q[key].trim());}}
});
test('original reward keys retain the original correct decisions',()=>{assert.deepEqual(answers.message.slice(0,3),[1,2,0]);assert.deepEqual(answers.account.slice(0,3),[1,2,0]);assert.deepEqual(answers.privacy.slice(0,3),[1,0,2]);});
