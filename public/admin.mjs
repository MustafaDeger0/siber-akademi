const $=s=>document.querySelector(s),status=message=>$('#admin-status').textContent=message;
let players=[],page=0;
async function api(path,body){const r=await fetch('/api/admin/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok){if(r.status===401){$('#admin-login').hidden=false;$('#admin-panel').hidden=true;}throw new Error(data.error||'İşlem tamamlanamadı.');}return data;}
function renderPlayers(){
 const size=matchMedia('(max-width:760px)').matches?3:5,pages=Math.max(1,Math.ceil(players.length/size));page=Math.min(page,pages-1);
 const container=$('#admin-players');container.replaceChildren();
 for(const player of players.slice(page*size,(page+1)*size)){
  const form=document.createElement('form');form.className='admin-player';const info=document.createElement('p'),name=document.createElement('strong');name.textContent=player.username;info.append(name,document.createTextNode(` · ${player.xp} XP · ${player.completed} ada`));
  if(player.learning){const note=document.createElement('small');note.textContent='Öğrenilen '+player.learning.known+'/30 · Tekrar '+player.learning.review+' · Final '+(player.learning.finalScore===null?'henüz yok':player.learning.finalScore+'/6');info.append(note);}
  const label=document.createElement('label');label.textContent='Yeni takma ad';const input=document.createElement('input');input.value=player.username;input.required=true;input.minLength=3;input.maxLength=20;label.append(input);
  const button=document.createElement('button');button.className='secondary';button.textContent='Adı değiştir';form.append(info,label,button);
  form.onsubmit=async e=>{e.preventDefault();button.disabled=true;try{await api('rename',{ref:player.ref,username:input.value});status('Takma ad güncellendi. Kaşifin ilerlemesi korundu.');await load();}catch(error){status(error.message);}finally{button.disabled=false;}};container.append(form);
 }
 if(!players.length){container.textContent='Eşleşen kaşif bulunamadı.';return;}
 const nav=document.createElement('nav');nav.className='admin-pagination';nav.setAttribute('aria-label','Oyuncu sayfaları');const previous=document.createElement('button'),next=document.createElement('button'),count=document.createElement('span');previous.className=next.className='secondary';previous.textContent='← Önceki';next.textContent='Sonraki →';previous.disabled=page===0;next.disabled=page===pages-1;count.textContent=`${page+1} / ${pages} sayfa · ${players.length} kaşif`;
 previous.onclick=()=>{page--;renderPlayers();};next.onclick=()=>{page++;renderPlayers();};nav.append(previous,count,next);container.append(nav);
}
async function load(){try{const data=await api('players?q='+encodeURIComponent($('#search').value));players=data.players;$('#admin-login').hidden=true;$('#admin-panel').hidden=false;renderPlayers();}catch(error){status(error.message);}}
$('#admin-login').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{await api('login',{password:$('#password').value});$('#password').value='';status('Yönetici girişi yapıldı.');await load();}catch(error){status(error.message);}finally{button.disabled=false;}};
$('#admin-search').onsubmit=e=>{e.preventDefault();page=0;load();};
$('#admin-logout').onclick=async()=>{try{await api('logout',{});players=[];page=0;$('#admin-login').hidden=false;$('#admin-panel').hidden=true;$('#admin-players').replaceChildren();status('Yönetici oturumu kapatıldı.');}catch(error){status(error.message);}};
matchMedia('(max-width:760px)').addEventListener('change',renderPlayers);
load();
