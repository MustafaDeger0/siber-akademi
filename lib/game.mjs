export const answers={message:[1,2,0],account:[1,2,0],privacy:[1,0,2]};
export const avatars=['pilot','ninja','robot','fox','cat'];
export function validateProfile(body){
  const username=String(body.username||'').trim().normalize('NFKC');
  if(!/^[a-zA-Z0-9_ÇĞİÖŞÜçğıöşü]{3,20}$/.test(username))throw new Error('Kullanıcı adın 3–20 harf, rakam veya alt çizgiden oluşmalı.');
  if(!avatars.includes(body.avatar))throw new Error('Koleksiyondan bir avatar seç.');
  return {username,usernameKey:username.toLocaleLowerCase('tr-TR'),avatar:body.avatar};
}
export function fresh(){return {done:[],attempts:{},claimed:[],bonus:[],daily:{},total:0,run:null};}
export function dateKey(now=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(now);}
export function transition(document,action,day=dateKey()){
  const d=structuredClone(document);let correct=null;
  if(action.type==='start'){
    if(!Object.hasOwn(answers,action.mission))throw new Error('Görev bulunamadı.');
    d.run={id:action.runId,mission:action.mission,step:0,mistakes:0,complete:false};
  }else{
    if(!d.run||d.run.id!==action.runId)throw new Error('Bu keşif başka bir sekmede değişti. Görevi yeniden aç.');
    const r=d.run;
    if(action.type==='answer'){
      if(!Number.isInteger(action.step)||action.step<0||action.step>2||!Number.isInteger(action.option)||action.option<0||action.option>2)throw new Error('Geçerli bir karar seç.');
      if(action.step<r.step)return {document:d,correct:action.option===answers[r.mission][action.step]};
      if(r.complete||action.step!==r.step)throw new Error('Önce sıradaki adımı tamamla.');
      d.attempts[r.mission]=(d.attempts[r.mission]||0)+1;
      correct=action.option===answers[r.mission][r.step];
      if(correct){const claim=r.mission+':'+r.step;if(!d.claimed.includes(claim)){d.claimed.push(claim);d.total+=30;}
        const daily=d.daily[day]||[];if(!daily.includes(claim))daily.push(claim);d.daily[day]=daily;
        if(daily.length>=3&&!d.bonus.includes('daily:'+day)){d.bonus.push('daily:'+day);d.total+=30;}
        r.step++;
      }else r.mistakes++;
    }else if(action.type==='complete'){
      if(r.step!==3)throw new Error('Rozet için üç adımı da tamamla.');
      if(!r.complete){if(!d.done.includes(r.mission)){d.done.push(r.mission);d.total+=30;}
        if(r.mistakes===0&&!d.bonus.includes('perfect')){d.bonus.push('perfect');d.total+=30;}
        if(d.done.length===3&&!d.bonus.includes('master')){d.bonus.push('master');d.total+=60;}
        r.complete=true;
      }
    }else throw new Error('İşlem bulunamadı.');
  }
  return {document:d,correct};
}
