import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuth,resolvePlayer} from './auth.mjs';
import {openDatabase} from './database.mjs';
import {api} from './api.mjs';
const origin='https://academy.test',password='Test-only-password-731';
const request=(path,body,site=origin)=>new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{origin:site,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
const cookieToken=r=>r.headers.get('set-cookie').split(';')[0].split('=')[1];
async function setup(fn){process.env.SQLITE_PATH=':memory:';const db=await openDatabase('');try{await fn(db);}finally{await db.close();}}
test('registration rotates sessions, hashes credentials and restores earned progress after logout and login',()=>setup(async db=>{
 const auth=createAuth(db,{production:true}),old='a'.repeat(43);let identity=await resolvePlayer(db,old);
 const registered=await auth(request('/api/auth/register',{username:'Test_Kasif',avatar:'fox',password}),old,identity);assert.equal(registered.status,200);assert.match(registered.headers.get('set-cookie'),/HttpOnly; SameSite=Lax; Max-Age=2592000; Secure/);const token=cookieToken(registered);assert.notEqual(token,old);
 identity=await resolvePlayer(db,token);assert.equal(identity.accountReady,true);const stored=await db.prepare('SELECT * FROM accounts WHERE player_id=?').bind(identity.userId).first();assert.notEqual(stored.password_hash,password);assert.equal(stored.password_hash.includes(password),false);const session=await db.prepare('SELECT token_hash FROM account_sessions WHERE player_id=?').bind(identity.userId).first();assert.notEqual(session.token_hash,token);
 let r=await api(request('/api/game',{type:'start',mission:'message'}),db,identity),run=(await r.json()).player.run;r=await api(request('/api/game',{type:'answer',runId:run.id,step:0,option:1}),db,identity);assert.equal((await r.json()).player.rewards.total,30);
 assert.equal((await (await api(request('/api/me'),db,await resolvePlayer(db,old))).json()).player,null);
 const out=await auth(request('/api/auth/logout',{}),token,identity);assert.equal(out.status,200);assert.notEqual(cookieToken(out),token);assert.equal((await (await api(request('/api/me'),db,await resolvePlayer(db,token))).json()).player,null);
 const bad=await auth(request('/api/auth/login',{username:'Test_Kasif',password:'wrong-pass'}),old,await resolvePlayer(db,old));assert.equal(bad.status,401);
 const login=await auth(request('/api/auth/login',{username:'test_kasif',password}),old,await resolvePlayer(db,old));assert.equal(login.status,200);const restored=await (await api(request('/api/me'),db,await resolvePlayer(db,cookieToken(login)))).json();assert.equal(restored.player.rewards.total,30);assert.equal(restored.player.run.step,1);assert.equal(restored.player.account.secured,true);
}));
test('existing cookie identities gain a password without losing XP, document, avatar or crew membership; legacy cookie stops authenticating',()=>setup(async db=>{
 const token='b'.repeat(43),legacy={userId:token};await api(new Request(origin+'/api/profile',{method:'PUT',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({username:'Eski_Kasif',avatar:'cat'})}),db,legacy);
 const before=await db.prepare('SELECT document FROM players WHERE id=?').bind(token).first(),d=JSON.parse(before.document);d.total=150;d.claimed=['message:0','message:1','message:2'];await db.prepare('UPDATE players SET document=?,xp=150 WHERE id=?').bind(JSON.stringify(d),token).run();
 await db.prepare('INSERT INTO crews (code,created_at) VALUES (?,?)').bind('A1B2C3D4',Date.now()).run();await db.prepare('INSERT INTO crew_members (player_id,code,joined_at) VALUES (?,?,?)').bind(token,'A1B2C3D4',Date.now()).run();const auth=createAuth(db),identity=await resolvePlayer(db,token);assert.equal(identity.legacy,true);assert.equal((await auth(request('/api/auth/logout',{}),token,identity)).status,409);assert.equal((await auth(request('/api/auth/register',{username:'Other_name',avatar:'cat',password}),token,identity)).status,400);
 const registered=await auth(request('/api/auth/register',{username:'Eski_Kasif',avatar:'cat',password}),token,identity);assert.equal(registered.status,200);const who=await resolvePlayer(db,cookieToken(registered));assert.equal(who.userId,token);const row=await db.prepare('SELECT document,avatar FROM players WHERE id=?').bind(token).first();assert.equal(row.document,JSON.stringify(d));assert.equal(row.avatar,'cat');assert.equal((await db.prepare('SELECT code FROM crew_members WHERE player_id=?').bind(token).first()).code,'A1B2C3D4');assert.equal((await (await api(request('/api/me'),db,await resolvePlayer(db,token))).json()).player,null);
}));
test('profiles created by older clients after the upgrade can still attach a password and cannot use an old token after securing',()=>setup(async db=>{
 const token='c'.repeat(43),anonymous=await resolvePlayer(db,token);assert.equal(anonymous.anonymous,true);await api(new Request(origin+'/api/profile',{method:'PUT',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({username:'Compat_Kasif',avatar:'fox'})}),db,anonymous);
 const legacy=await resolvePlayer(db,token);assert.equal(legacy.legacy,true);const auth=createAuth(db);const r=await auth(request('/api/auth/register',{username:'Compat_Kasif',avatar:'fox',password}),token,legacy);assert.equal(r.status,200);const spoof=await resolvePlayer(db,token);assert.equal(spoof.anonymous,true);assert.equal((await (await api(request('/api/me'),db,spoof)).json()).player,null);assert.equal((await api(request('/api/game',{type:'start',mission:'message'}),db,spoof)).status,409);
}));
test('login checks origin, validation, expired sessions, generic failures and repeated-attempt limits',()=>setup(async db=>{
 let time=Date.now();const auth=createAuth(db,{now:()=>time}),token='d'.repeat(43),identity=await resolvePlayer(db,token);
 assert.equal((await auth(request('/api/auth/register',{username:'Safe_Kasif',avatar:'fox',password:'short'}),token,identity)).status,400);assert.equal((await auth(request('/api/auth/login',{username:'Safe_Kasif',password},'https://bad.test'),token,identity)).status,403);assert.equal((await auth(request('/api/auth/login',null),token,identity)).status,400);
 const registered=await auth(request('/api/auth/register',{username:'Safe_Kasif',avatar:'fox',password}),token,identity);const session=cookieToken(registered);time+=31*86400000;assert.equal((await resolvePlayer(db,session,time)).accountReady,false);
 for(let i=0;i<10;i++)assert.equal((await auth(request('/api/auth/login',{username:'Safe_Kasif',password:'not-the-pass'}),token,identity)).status,401);assert.equal((await auth(request('/api/auth/login',{username:'Safe_Kasif',password}),token,identity)).status,429);time+=16*60000;assert.equal((await auth(request('/api/auth/login',{username:'Safe_Kasif',password}),token,identity)).status,200);
}));
