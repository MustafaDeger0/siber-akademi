import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable,Writable} from 'node:stream';
import {openDatabase} from './lib/database.mjs';
import {createApp} from './server.mjs';
import {readFileSync} from 'node:fs';
import {worlds} from './public/worlds.mjs';

test('HTTP profiles, cookie isolation, real leaderboard, server rewards and origin checks',async()=>{
 process.env.SQLITE_PATH=':memory:';
 const db=await openDatabase('');const server=createApp(db,{production:false});
 const origin='http://localhost:3000';
 function request(path,options={}){return new Promise((resolve,reject)=>{
  const req=Readable.from(options.body?[Buffer.from(options.body)]:[]);req.url=path;req.method=options.method||'GET';req.headers={host:'localhost:3000',...options.headers};
  const chunks=[];const headers={};const res=new Writable({write(chunk,encoding,done){chunks.push(Buffer.from(chunk));done()}});
  res.setHeader=(key,value)=>{headers[key.toLowerCase()]=value};res.writeHead=(status,values)=>{res.status=status;res.headersSent=true;for(const [key,value] of Object.entries(values))res.setHeader(key,value)};
  res.on('error',reject);res.on('finish',()=>{const body=Buffer.concat(chunks).toString();resolve({status:res.status,headers:{get:key=>headers[key.toLowerCase()]||null},json:async()=>JSON.parse(body),text:async()=>body})});
  server.emit('request',req,res);
 })}
 const guest=()=>({cookie:''});const a=guest(),b=guest();
 async function call(guest,path,body,method='POST',requestOrigin=origin){
  const response=await request(path,{method:body?method:'GET',headers:{cookie:guest.cookie,...(body?{'content-type':'application/json',origin:requestOrigin}:{})},body:body?JSON.stringify(body):undefined});
  const cookie=response.headers.get('set-cookie');if(cookie)guest.cookie=cookie.split(';')[0];
  return {status:response.status,data:await response.json(),cookie};
 }
 try{
  assert.equal((await request('/health')).status,200);for(const path of ['/app.mjs','/app.css','/worlds.mjs']){const asset=await request(path);assert.equal(asset.status,200);assert.ok((await asset.text()).length>50);}
  const home=await request('/');assert.ok((await home.text()).includes('Siber Akademi'));
  assert.equal((await call(a,'/api/me')).data.player,null);assert.match(a.cookie,/^academy=[\w-]{43}$/);
  assert.match((await call(a,'/api/me')).cookie,/HttpOnly; SameSite=Lax/);
  assert.equal((await call(a,'/api/profile',{username:'Kasif_1',avatar:'fox'},'PUT')).status,200);
  assert.equal((await call(b,'/api/profile',{username:'Kasif_1',avatar:'fox'},'PUT')).status,409);
  assert.equal((await call(b,'/api/profile',{username:'Kasif_2',avatar:'cat'},'PUT')).status,200);
  const run=(await call(a,'/api/game',{type:'start',mission:'message',xp:99999})).data.player.run.id;
  assert.equal((await call(b,'/api/game',{type:'answer',runId:run,step:0,option:1})).status,400);
  assert.equal((await call(a,'/api/game',{type:'complete',runId:run})).status,400);
  for(const [step,option] of worlds[0].questions.map(q=>q.correct).entries())assert.equal((await call(a,'/api/game',{type:'answer',runId:run,step,option})).status,200);
  assert.equal((await call(a,'/api/game',{type:'complete',runId:run})).data.player.rewards.total,240);
  assert.equal((await call(a,'/api/game',{type:'complete',runId:run})).data.player.rewards.total,240);
  const board=(await call(b,'/api/leaderboard')).data;
  assert.equal(board.total,2);assert.equal(board.players[0].xp,240);assert.equal(board.mine.rank,2);assert.equal('id' in board.players[0],false);
  assert.equal((await call(a,'/api/profile',{username:'Hacker',avatar:'fox'},'PUT','https://other.example')).status,403);
  assert.equal((await call(a,'/api/profile',{username:'x'.repeat(5000),avatar:'fox'},'PUT')).status,413);
 }finally{server.emit('close');await db.close();}
});
