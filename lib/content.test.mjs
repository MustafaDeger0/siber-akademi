import test from 'node:test';
import assert from 'node:assert/strict';
import {worlds} from '../public/worlds.mjs';
import {answers} from './game.mjs';
test('six distinct islands share thirty complete three-choice scenarios with the server',()=>{
 assert.equal(worlds.length,6);assert.equal(new Set(worlds.map(w=>w.id)).size,6);
 const all=worlds.flatMap(w=>w.questions);assert.equal(all.length,30);assert.equal(new Set(all.map(q=>q.title)).size,30);
 for(const w of worlds){assert.equal(w.questions.length,5);assert.deepEqual(answers[w.id],w.questions.map(q=>q.correct));for(const q of w.questions){assert.equal(q.options.length,3);assert.equal(new Set(q.options).size,3);assert.ok(q.options[q.correct]);for(const key of ['title','text','ask','why','hint'])assert.ok(q[key].trim());}}
});
test('original reward keys retain the original correct decisions',()=>{assert.deepEqual(answers.message.slice(0,3),[1,2,0]);assert.deepEqual(answers.account.slice(0,3),[1,2,0]);assert.deepEqual(answers.privacy.slice(0,3),[1,0,2]);});
