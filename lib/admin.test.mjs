import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from './database.mjs';
import {createAdmin} from './admin.mjs';
import {api} from './api.mjs';
const origin='https://academy.example';
function request(path,body,cookie='',site=origin){return new Request(origin+'/api/'+path,{method:body?'POST':'GET',headers:{origin:site,cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});}
test('admin authentication, opaque player references, safe nickname moderation, collisions and logout',async()=>{
 process.env.SQLITE_PATH=':memory:';const db=await openDatabase('');
 const admin=createAdmin(db,{secret:'test-only-secret-32-characters-long',production:true});
 try{
  for(const [id,username] of [['guest-session-secret','Test_1'],['guest-two-secret','Test_2']]){
   const req=new Request(origin+'/api/profile',{method:'PUT',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({username,avatar:'fox'})});
   assert.equal((await api(req,db,{userId:id})).status,200);
  }
  assert.equal((await admin(request('admin/players'))).status,401);
  assert.equal((await admin(request('admin/login',{password:'wrong'}))).status,401);
  assert.equal((await admin(request('admin/login',{password:'test-only-secret-32-characters-long'},'','https://bad.example'))).status,403);
  const login=await admin(request('admin/login',{password:'test-only-secret-32-characters-long'}));
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Strict; Max-Age=28800; Secure/);
  const list=await (await admin(request('admin/players?q=Test_1',null,cookie))).json();assert.equal(list.players.length,1);
  assert.equal('id' in list.players[0],false);assert.equal(JSON.stringify(list).includes('guest-session-secret'),false);
  const ref=list.players[0].ref;
  assert.equal((await admin(request('admin/rename',{ref,username:'Test_2'},cookie))).status,409);
  assert.equal((await admin(request('admin/rename',{ref,username:'<script>'},cookie))).status,400);
  assert.equal((await admin(request('admin/rename',{ref:'guest-session-secret',username:'Nice_1'},cookie))).status,404);
  assert.equal((await admin(request('admin/rename',{ref,username:'Nice_1'},cookie))).status,200);
  const me=await (await api(request('me'),db,{userId:'guest-session-secret'})).json();assert.equal(me.player.username,'Nice_1');
  assert.equal(me.player.rewards.total,0);assert.equal(me.player.avatar,'fox');
  assert.equal((await admin(request('admin/logout',{},cookie))).status,200);
  assert.equal((await admin(request('admin/players',null,cookie))).status,401);
 }finally{await db.close();}
});
test('admin stays disabled without a strong configured secret and login attempts are limited',async()=>{
 const disabled=createAdmin(null,{secret:'short'});assert.equal((await disabled(request('admin/players'))).status,503);
 const admin=createAdmin(null,{secret:'test-only-secret-32-characters-long'});
 for(let i=0;i<8;i++)assert.equal((await admin(request('admin/login',{password:'bad'}),'same-peer')).status,401);
 assert.equal((await admin(request('admin/login',{password:'bad'}),'same-peer')).status,429);
});
