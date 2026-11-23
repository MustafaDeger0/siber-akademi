import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {openDatabase} from './lib/database.mjs';
import {api} from './lib/api.mjs';

export function createApp(db,{production=process.env.NODE_ENV==='production',publicUrl=process.env.RENDER_EXTERNAL_URL}={}){
 const cookieName=production?'__Host-academy':'academy';
 const html=readFileSync(new URL('./public/index.html',import.meta.url));
 const favicon=readFileSync(new URL('./public/favicon.svg',import.meta.url));
 const rates=new Map();
 const timer=setInterval(()=>rates.clear(),60000);timer.unref();
 const server=createServer(async(req,res)=>{
  const send=(status,body,contentType='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':contentType,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY'});res.end(body)};
  try{
   const origin=publicUrl||`http://${req.headers.host}`;
   const url=new URL(req.url,origin);
   if(url.pathname==='/health'){await db.prepare('SELECT 1 AS ready').first();return send(200,'{"ok":true}');}
   if(req.method==='GET'&&url.pathname==='/')return send(200,html,'text/html; charset=utf-8');
   if(req.method==='GET'&&url.pathname==='/favicon.svg')return send(200,favicon,'image/svg+xml');
   if(!url.pathname.startsWith('/api/'))return send(404,'{"error":"Sayfa bulunamadı."}');
   if(!['GET','PUT','POST'].includes(req.method))return send(405,'{"error":"Geçersiz işlem."}');
   if(req.method!=='GET'&&req.headers.origin!==new URL(origin).origin)return send(403,'{"error":"İstek doğrulanamadı."}');
   const cookies=Object.fromEntries((req.headers.cookie||'').split(';').map(x=>x.trim().split('=')));
   let token=cookies[cookieName];
   if(!/^[A-Za-z0-9_-]{43}$/.test(token||''))token=randomBytes(32).toString('base64url');
   res.setHeader('Set-Cookie',`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${production?'; Secure':''}`);
   const rate=rates.get(token)||0;rates.set(token,rate+1);
   if(rate>=180)return send(429,'{"error":"Biraz hızlı ilerledin. Bir dakika sonra yeniden dene."}');
   if(Number(req.headers['content-length']||0)>4096)return send(413,'{"error":"İstek çok uzun."}');
   let size=0;const chunks=[];
   for await(const chunk of req){size+=chunk.length;if(size>4096){send(413,'{"error":"İstek çok uzun."}');return;}chunks.push(chunk);}
   const request=new Request(url,{method:req.method,headers:{...req.headers,origin:req.headers.origin||''},body:req.method==='GET'?undefined:Buffer.concat(chunks)});
   const response=await api(request,db,{userId:token});
   res.writeHead(response.status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){console.error('Request failed:',error.code||error.name);if(!res.headersSent)send(500,'{"error":"Bağlantı şu an kurulamadı. Yeniden dene."}');else res.end();}
 });
 server.on('close',()=>clearInterval(timer));
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const db=await openDatabase();
 const server=createApp(db);
 server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Siber Akademi is ready'));
 const shutdown=()=>{server.close(async()=>{await db.close();process.exit(0)});setTimeout(()=>process.exit(1),25000).unref()};
 process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
}
