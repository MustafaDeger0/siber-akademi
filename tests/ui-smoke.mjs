import {Readable,Writable} from 'node:stream';
import {openDatabase} from '../lib/database.mjs';
import {createApp} from '../server.mjs';
import {fresh,answers} from '../lib/game.mjs';
import {finalQuestions} from '../public/adventure-data.mjs';
import {crewAction} from '../lib/crew.mjs';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const {chromium}=await import(process.argv[2]||'playwright');
const output=process.env.UI_OUTPUT_DIR||join(tmpdir(),'academy-ui-smoke');mkdirSync(output,{recursive:true});
process.env.SQLITE_PATH=':memory:';const db=await openDatabase(''),server=createApp(db,{production:false,publicUrl:'https://academy.test'});
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1536,height:698}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(10000);
function request(path,method,headers,body){return new Promise((resolve,reject)=>{const req=Readable.from(body?[Buffer.from(body)]:[]);req.url=path;req.method=method;req.headers={host:'academy.test',...headers};const chunks=[],result={};const res=new Writable({write(chunk,enc,done){chunks.push(Buffer.from(chunk));done()}});res.setHeader=(key,value)=>result[key.toLowerCase()]=value;res.writeHead=(status,values)=>{res.status=status;res.headersSent=true;Object.entries(values).forEach(([k,v])=>res.setHeader(k,v));};res.on('error',reject);res.on('finish',()=>resolve({status:res.status,headers:result,body:Buffer.concat(chunks)}));server.emit('request',req,res);});}
await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.hostname!=='academy.test')return route.abort();const headers=await req.allHeaders();const r=await request(url.pathname+url.search,req.method(),headers,req.postData());await route.fulfill(r);});
const shot=async name=>{await page.screenshot({path:join(output,'ui-'+name+'.png')});};
async function waitReady(){await page.locator('#open-adventure').waitFor();}
async function tab(id){await page.locator('[data-tab="'+id+'"]').click();}
try{
 await page.goto('https://academy.test');await page.locator('#username').fill('UI_Kasif');await page.locator('input[name="avatar"][value="fox"]').check();await page.locator('#identity-form button[type="submit"]').click();await waitReady();
 await page.locator('[data-view="profile"]').first().click();await page.locator('.profile-screen').waitFor();
 for(const [width,height] of [[1536,698],[1920,870],[1280,720]]){await page.setViewportSize({width,height});const layout=await page.evaluate(()=>({page:document.documentElement.scrollHeight,view:innerHeight,card:document.querySelector('.profile-card').scrollHeight,cardClient:document.querySelector('.profile-card').clientHeight,side:document.querySelector('.sidebar').scrollHeight,sideClient:document.querySelector('.sidebar').clientHeight}));assert.ok(layout.page<=height+1,JSON.stringify({width,height,...layout}));assert.ok(layout.card<=layout.cardClient+1,JSON.stringify(layout));console.log('Profile fit',width,height,JSON.stringify(layout));}
 await page.setViewportSize({width:1536,height:698});await shot('profile');
 await page.locator('#open-adventure').click();await page.locator('#adventure-content').waitFor();await page.locator('[data-path="social"]').click();await page.locator('[data-path="social"][aria-pressed="true"]').waitFor();
 await tab('final');assert.equal(await page.locator('#start-final').isDisabled(),true);await tab('collection');assert.equal(await page.locator('[data-buy="compass"]').isDisabled(),true);
 await page.locator('#close-adventure').click();
 const d=fresh();d.total=1200;for(const [id,list] of Object.entries(answers)){d.done.push(id);for(let i=0;i<list.length;i++)d.claimed.push(id+':'+i);}d.adventure={path:'social',introduced:true};
 await db.prepare('UPDATE players SET document=?,xp=?,completed=6 WHERE username=?').bind(JSON.stringify(d),1200,'UI_Kasif').run();
 await page.reload();await waitReady();await page.locator('#open-adventure').click();await tab('collection');await page.locator('[data-buy="compass"]').click();await page.locator('[data-equip="compass"]').waitFor();await page.locator('[data-equip="compass"]').click();await page.locator('.equipped-charm').filter({hasText:'🧭'}).waitFor();const bagFit=await page.locator('#adventure-content').evaluate(el=>({scroll:el.scrollHeight,client:el.clientHeight}));assert.ok(bagFit.scroll<=bagFit.client+1,JSON.stringify(bagFit));await shot('collection');
 await tab('team');await page.locator('#create-crew').click();await page.locator('.crew-code').waitFor();const code=(await page.locator('.crew-code').innerText()).trim();const companion=fresh();companion.claimed=['message:0'];companion.total=30;
 await db.prepare('INSERT INTO players (id,username,username_key,avatar,xp,completed,document,version,created_at) VALUES (?,?,?,?,30,0,?,0,?)').bind('test-friend','UI_Dost','UI_Dost'.toLocaleLowerCase('tr-TR'),'cat',JSON.stringify(companion),Date.now()).run();await crewAction(db,'test-friend',{type:'join',code},'2026-11-25');
 await tab('story');await tab('team');await page.locator('[data-thanks="UI_Dost"]').waitFor();await page.locator('#gift-form select[name="item"]').selectOption('compass');await page.locator('#gift-form select[name="to"]').selectOption('UI_Dost');await page.locator('#gift-form button').click();await page.locator('#confirm-social').click();await page.locator('#gift-form').waitFor();
 const friend=await db.prepare('SELECT document FROM players WHERE id=?').bind('test-friend').first();assert.deepEqual(JSON.parse(friend.document).adventure.inventory,['compass']);await shot('team');
 await tab('final');await page.locator('#start-final').click();await page.locator('.quiz-dialog').waitFor();
 for(let step=0;step<6;step++){await page.locator('[data-option="'+finalQuestions[step].correct+'"]').click();await page.locator('#answer-action').click();await page.locator('#continue-answer').waitFor();await page.locator('#continue-answer').click();if(step<5)await page.locator('.quiz-dialog').waitFor();}
 await page.locator('.final-score').waitFor();assert.match(await page.locator('.final-score').innerText(),/6 \/ 6/);assert.match(await page.locator('.final-intro h2').innerText(),/Kalkan/);await shot('final');
 await page.locator('#close-adventure').click();await page.locator('[data-view="map"]').first().click();await page.locator('[data-world="message"]').first().click();await page.locator('#practice-region').click();await page.locator('.quiz-dialog').waitFor();assert.match(await page.locator('.quiz-meta').innerText(),/ISINMA/);await page.setViewportSize({width:390,height:844});await shot('phone-quiz');const width=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(width.scroll<=width.width);await page.locator('#close-modal').click();
 await page.locator('[data-view="profile"]').first().click();await page.locator('#reset-progress').click();await page.locator('#cancel-reset').click();assert.equal(await page.locator('dialog').evaluate(el=>el.open),false);
 assert.deepEqual(errors,[]);console.log('UI flows passed: profile fit, paths, locks, purchase/equip, team gift, six final questions, practice, reset cancel, phone width');
}catch(error){console.error(await page.locator('body').innerText());throw error;}finally{await browser.close();server.emit('close');await db.close();}
