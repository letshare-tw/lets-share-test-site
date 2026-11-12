"use strict";
/* RIDER-TEST-01: isolated synthetic workflow, never operational account-role switching. */
(()=>{
 const docNames={certificate:'良民證',license:'機車駕照',registration:'機車行照',owner_authorization:'車主簽名授權'};
 const states={draft:'待準備',submitted:'待審核',supplement:'待補件',approved:'已核准',suspended:'暫停',pending:'待審核',revoked:'已撤回',unassigned:'待派單',offered:'待接單',accepted:'已接單',picked_up:'已取件',handover_pending:'待收件端簽收',delivered:'交接完成',exception:'異常待處理',cancelled:'已取消'};
 const roles={rider1:'模擬騎手 A',rider2:'模擬騎手 B',dispatch:'模擬總部',receiver:'模擬收件端'};
 const errors={RIDER_MEMBER_DENIED:'僅限指定且已完成註冊的測試帳號。',RIDER_STALE_STATE:'資料已更新，已重新讀取，請確認後再操作。',RIDER_ROLE_DENIED:'目前模擬角色沒有這項權限。',RIDER_DOCUMENT_REQUIRED:'請先建立所需的模擬證件。',RIDER_CERT_DATE_INVALID:'良民證須於核發後 30 天內提交，日期不可在未來。',RIDER_QUALIFICATION_DENIED:'騎手或指定機車資格不符，請由模擬總部檢查。',RIDER_ASSIGN_DENIED:'任務狀態或騎手、機車資格不符。',RIDER_BAG_CHECK_REQUIRED:'請核對袋號並確認封袋完整。',RIDER_STATE_DENIED:'狀態已改變，請重新確認。',RIDER_REASSIGN_DENIED:'已取件的袋件不能直接改派，需保留原騎手安全交接。',RIDER_CANCEL_DENIED:'已取件的袋件不能直接取消，請完成安全交接。',RIDER_FORMAL_LOCKED:'正式營運維持鎖定。',RIDER_SAMPLE_RETRY_REQUIRED:'模擬圖片上傳未完成，請按「重試模擬圖片」。',RIDER_TEST_LOCKED:'騎手測試入口目前關閉。'};
 function navigationUrl(task,delivery=false,waypoints=[]){
  const lat=Number(delivery?task.delivery_lat:task.pickup_lat),lng=Number(delivery?task.delivery_lng:task.pickup_lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw Error('座標無效');
  const u=new URL('https://www.google.com/maps/dir/');u.searchParams.set('api','1');u.searchParams.set('destination',lat+','+lng);u.searchParams.set('travelmode','two-wheeler');u.searchParams.set('dir_action','navigate');
  if(waypoints.length){if(waypoints.length>3)throw Error('手機路線預覽最多三個中途點');u.searchParams.set('waypoints',waypoints.map(t=>{
   const a=Number(t.pickup_lat),b=Number(t.pickup_lng);if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>90||Math.abs(b)>180)throw Error('座標無效');return a+','+b;
  }).join('|'));}return u.href;
 }
 let panel,body,status,roleBar,actor='rider1',snapshot=null,owner=null,epoch=0,busy=false,retry=null,lastFocus=null;
 const api=()=>window.LX_TEST_AUTH_ADAPTER;
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 function message(text){status.textContent=text;}
 function button(text,fn,secondary=false){const b=el('button',text,secondary?'rw-button rw-secondary':'rw-button');b.type='button';b.addEventListener('click',fn);return b;}
 function card(title){const c=el('section',undefined,'rw-card');c.append(el('h3',title));return c;}
 function field(label,node){const l=el('label',undefined,'rw-field');l.append(el('span',label),node);return l;}
 function select(items){const s=el('select');for(const [value,label] of items){const o=el('option',label);o.value=value;s.append(o);}return s;}
 function today(){const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}
 async function run(action,payload={}){
  if(busy)return null;const version=epoch,id=owner,role=actor;
  busy=true;setDisabled(true);message('處理中…');
  const command={...payload,actor:role,revision:snapshot?.revision??0,command_id:crypto.randomUUID()};
  try{
   const result=await api().riderRequest(action,command,id);
   if(version!==epoch)return null;
   retry=null;await load(version);if(version!==epoch)return null;
   message('已儲存並重新讀取測試後端。');return result;
  }catch(e){
   if(version!==epoch)return null;
   if(e.code==='RIDER_SAMPLE_RETRY_REQUIRED')retry={action,command,id};
   const text=errors[e.code]||e.message||'操作未完成，請重新讀取。';
   try{await load(version);}catch(_){}if(version===epoch)message(text);return null;
  }finally{if(version===epoch){busy=false;setDisabled(false);renderRetry();}}
 }
 function setDisabled(value){if(!panel)return;panel.querySelectorAll('button,input,select').forEach(b=>{if(!b.dataset.close)b.disabled=value;});}
 function renderRetry(){panel?.querySelector('#rwRetry')?.remove();if(!retry)return;const b=button('重試模擬圖片',async()=>{
  if(busy)return;busy=true;const version=epoch;setDisabled(true);
  try{await api().riderRequest(retry.action,retry.command,retry.id);if(version!==epoch)return;retry=null;await load(version);message('模擬圖片已完成。');}
  catch(e){if(version===epoch)message(errors[e.code]||'重試未完成。');}finally{if(version===epoch){busy=false;setDisabled(false);renderRetry();}}
 });b.id='rwRetry';status.after(b);}
 async function load(version=epoch){
  const session=await api().getSession();if(version!==epoch)return;
  if(!session||owner&&session.user.id!==owner){clear();message('登入帳號已變更，請重新開啟騎手測試。');return;}
  const id=session.user.id;const data=await api().riderRequest('bootstrap',{actor},id);
  if(version!==epoch)return;
  owner=id;snapshot=data;render();
 }
 function clear(){epoch++;snapshot=null;owner=null;retry=null;busy=false;if(body)body.replaceChildren();if(panel?.open)panel.close();}
 function render(){
  panel.querySelectorAll('a').forEach(a=>a.remove());body.replaceChildren();roleBar.replaceChildren();
  for(const [key,label] of Object.entries(roles)){const b=button(label,()=>{if(busy)return;epoch++;actor=key;snapshot=null;body.replaceChildren();refresh();},true);b.setAttribute('aria-pressed',String(actor===key));roleBar.append(b);}
  if(!snapshot?.workspace_id){body.append(el('p','建立專屬模擬工作區後，可測試資格審核、接單、取件及雙方交接。'),button('建立本人模擬工作區',()=>run('initialize')));return;}
  const intro=card(roles[actor]);intro.append(el('p','測試紀錄會儲存在後端；每個 Google 帳號的工作區分開。切換模擬角色不會取得任何正式工作權限。'));body.append(intro);
  for(const n of snapshot.notifications||[])body.append(el('p',(roles[n.rider]||'')+'：'+n.message+'（剩餘 '+n.days_left+' 天）','rw-banner'));
  if(actor==='rider1'||actor==='rider2')renderRider();
  if(actor==='dispatch')renderDispatch();
  renderTasks();renderEvents();
 }
 function renderRider(){
  const person=snapshot.people.find(p=>p.key===actor),c=card('資格與證件');
  c.append(el('p','申請：'+(states[person.application]||person.application)+'｜'+(person.eligible?'本人資格有效':'尚不可接單')));
  if(person.cert_valid_until)c.append(el('p','良民證資格有效至：'+person.cert_valid_until));
  if(person.review_due_on)c.append(el('p','模擬審核目標日：'+person.review_due_on+'（週末排除，國定假日尚待日曆設定）'));
  if(person.application==='approved')c.append(button('準備更新良民證資格',()=>run('renew_application'),true));
  if(person.review_note)c.append(el('p',person.review_note));
  c.append(el('p','目前僅建立印有 TEST 的範例圖片，不收集真實證件。正式合作文件尚未發布，也不會代替你同意。','rw-muted'));
  for(const kind of ['license','certificate'])c.append(button('建立模擬'+docNames[kind],()=>run('prepare_sample',{kind}),true));
  if(['draft','supplement'].includes(person.application)){
   const date=el('input');date.type='date';date.value=today();date.max=today();
   const check=el('input');check.type='checkbox';const statement=field('我了解這是模擬申請，不是正式合作或證件驗證',check);
   c.append(field('模擬良民證核發日期',date),statement,button('送出模擬資格申請',()=>{if(!check.checked){message('請先確認模擬申請說明。');return;}run('submit_application',{cert_issued_on:date.value,simulation_confirmed:true});}));
  }
  body.append(c);const vehicles=card('我的機車');
  for(const v of snapshot.vehicles){const row=el('div',undefined,'rw-subcard');row.append(el('h4',v.label+'｜'+states[v.status]),el('p','非本人車輛：須具車主簽名授權。'));
   if(v.status==='pending')for(const kind of ['registration','owner_authorization'])row.append(button('建立模擬'+docNames[kind],()=>run('prepare_sample',{kind,vehicle_id:v.id}),true));vehicles.append(row);
  }
  vehicles.append(button('新增一台模擬機車',()=>run('add_vehicle'),true));body.append(vehicles);renderDocuments(body);
 }
 function renderDocuments(host){
  const c=card('模擬證件紀錄');for(const d of snapshot.documents){const row=el('div',undefined,'rw-subcard');row.append(el('p',roles[d.rider_key]+'・'+docNames[d.kind]+'｜'+(d.deleted_at?'已清理':d.reviewed_at?'已審核':'待審核')));
   if(d.delete_after)row.append(el('p','預定清理：'+new Date(d.delete_after).toLocaleDateString('zh-TW')));
   if(d.kind==='owner_authorization')row.append(el('p','授權有效期間受控保存；終止後保存期限待核定。','rw-muted'));
   if(!d.deleted_at)row.append(button('閱覽範例圖片（60 秒連結）',async()=>{
    const result=await run('document_link',{document_id:d.id});if(!result?.signed_url)return;
    const u=new URL(result.signed_url);if(u.origin!=='https://rfwqcrvxyjhtmafnbuyy.supabase.co')return;
    const a=el('a','開啟模擬證件圖片');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.className='rw-button rw-secondary';status.after(a);
    const start=epoch;setTimeout(()=>{if(start===epoch)a.remove();},60000);
   },true));c.append(row);
  }if(!snapshot.documents.length)c.append(el('p','尚無模擬證件。'));host.append(c);
 }
 function renderDispatch(){
  const c=card('資格審核');for(const p of snapshot.people.filter(p=>p.role==='rider')){const r=el('div',undefined,'rw-subcard');r.append(el('h4',p.label+'｜'+states[p.application]));
   if(p.application==='submitted')r.append(button('模擬審核通過',()=>run('review_application',{rider:p.key,decision:'approve'})),button('退回補件',()=>run('review_application',{rider:p.key,decision:'supplement'}),true));
   if(p.application==='approved')r.append(button('測試資格到期',()=>run('expire_certificate',{rider:p.key}),true));c.append(r);
  }body.append(c);
  const vs=card('逐台車輛審核');for(const v of snapshot.vehicles){const r=el('div',undefined,'rw-subcard');r.append(el('h4',roles[v.rider_key]+'・'+v.label+'｜'+states[v.status]));
   if(v.status==='pending')r.append(button('核准模擬車輛及授權',()=>run('review_vehicle',{vehicle_id:v.id})));
   if(v.status==='approved')r.append(button('核實撤回這台車的授權',()=>run('revoke_vehicle',{vehicle_id:v.id}),true));vs.append(r);
  }body.append(vs);renderDocuments(body);
  body.append(button('建立一筆模擬取送任務',()=>run('create_tasks')));
 }
 function assignment(task,action){
  const candidates=snapshot.vehicles.filter(v=>v.status==='approved'&&v.owner_authorized&&snapshot.people.some(p=>p.key===v.rider_key&&p.eligible));
  const s=select(candidates.map(v=>[v.id,roles[v.rider_key]+'・'+v.label]));const wrap=el('div',undefined,'rw-actions');
  wrap.append(field('指定騎手與機車',s),button(action==='assign'?'確認派單':'確認改派',()=>{const v=candidates.find(v=>v.id===s.value);if(!v){message('請先完成騎手與機車審核。');return;}run(action,{task_id:task.id,rider:v.rider_key,vehicle_id:v.id});}));return wrap;
 }
 function renderTasks(){
  const section=card(actor==='receiver'?'待簽收與交接紀錄':'取送任務');const tasks=snapshot.tasks;
  if(!tasks.length)section.append(el('p','目前沒有此模擬角色可操作的任務。'));
  const active=tasks.filter(t=>['accepted','picked_up'].includes(t.status));
  if(actor.startsWith('rider')&&active.length){
   section.append(button('導航至下一站',()=>navigateTask(active[0])),el('p','依任務順序前進；不會自動最佳化路線。','rw-muted'));
   const pickups=active.filter(t=>t.status==='accepted').slice(0,4);
   if(pickups.length>1)section.append(button('預覽多點取件路線（最多 4 點）',()=>navigateTask(pickups[pickups.length-1],pickups.slice(0,-1)),true));
  }
  for(const t of tasks){
   const c=el('div',undefined,'rw-subcard');c.append(el('h4',t.bag_code+'｜'+states[t.status]));
   c.append(el('p','取件：'+t.pickup_label),el('p','交付：'+t.delivery_label),el('p','取件期限：'+new Date(t.pickup_deadline).toLocaleString('zh-TW')));
   if(t.rider_key)c.append(el('p','承接：'+roles[t.rider_key]));
   if(t.exception_code)c.append(el('p','異常：'+t.exception_code+' '+(t.exception_note||''),'rw-error'));
   if(t.receipt_code)c.append(el('p','雙方交接回執：'+t.receipt_code));
   if(actor==='dispatch'){
    if(t.status==='unassigned')c.append(assignment(t,'assign'));
    if(['offered','accepted','exception'].includes(t.status)&&!t.picked_up_at)c.append(assignment(t,'reassign'));
    if(t.status==='exception')c.append(button('處理異常，恢復原階段',()=>run('resolve',{task_id:t.id}),true));
    if(['unassigned','offered','accepted','exception'].includes(t.status)&&!t.picked_up_at)c.append(button('取消模擬任務',()=>run('cancel',{task_id:t.id}),true));
    if(!['delivered','cancelled'].includes(t.status))c.append(button('移至路線第一站',()=>run('route',{task_id:t.id,order:1}),true));
   }
   if(actor.startsWith('rider')){
    if(t.status==='offered'){
     const vs=snapshot.vehicles.filter(v=>v.status==='approved'&&v.owner_authorized),s=select(vs.map(v=>[v.id,v.label]));if(vs.some(v=>v.id===t.vehicle_id))s.value=t.vehicle_id;
     c.append(field('本次實際使用機車',s),button('確認接單',()=>run('accept',{task_id:t.id,vehicle_id:s.value})));
    }
    if(t.status==='accepted'){
     const code=el('input');code.placeholder='袋號';code.autocomplete='off';const sealed=el('input');sealed.type='checkbox';
     c.append(field('核對分享袋編號',code),button('模擬掃描袋號',()=>{code.value=t.bag_code;},true),field('模擬確認封袋完整，未開袋',sealed),button('開啟新版拍照取件',()=>location.assign('./rider.html?actor='+encodeURIComponent(actor))));
    }
    if(t.status==='picked_up')c.append(button('開啟新版交付拍照',()=>location.assign('./rider.html?actor='+encodeURIComponent(actor))));
    if(['accepted','picked_up','handover_pending'].includes(t.status)){
     const reason=select([['bag_missing','找不到袋件'],['seal_broken','封袋破損'],['address_issue','地址問題'],['cannot_deliver','無法交付'],['safety','安全問題']]);
     const note=el('input');note.maxLength=200;note.placeholder='補充說明（不填個資）';c.append(field('異常類型',reason),field('補充說明',note),button('回報異常',()=>run('exception',{task_id:t.id,code:reason.value,note:note.value}),true));
    }
   }
   if(actor==='receiver'&&t.status==='handover_pending'){
    const code=el('input');code.placeholder='請核對袋號';c.append(field('收件袋號',code),button('模擬掃描袋號',()=>{code.value=t.bag_code;},true),button('確認收到袋件並簽收',()=>run('receive',{task_id:t.id,bag_code:code.value.trim()})));
   }
   if(t.status==='delivered')c.append(el('p','計費依據已保留；費率未設定，不產生應付款或實際匯款。','rw-muted'));
   section.append(c);
  }body.append(section);
 }
 async function navigateTask(task,waypoints=[]){
  if(busy)return;const version=epoch,id=owner,role=actor;message('重新確認任務狀態…');
  try{
   const data=await api().riderRequest('bootstrap',{actor:role},id);if(version!==epoch)return;
   const current=data.tasks.find(t=>t.id===task.id&&['accepted','picked_up'].includes(t.status));
   const points=waypoints.map(t=>data.tasks.find(x=>x.id===t.id&&x.status==='accepted'));
   if(!current||points.some(t=>!t))throw Error('任務狀態已變更，請重新讀取。');
   const url=navigationUrl(current,current.status==='picked_up',points);
   if(!window.confirm('這是模擬地點，僅驗證機車導航開啟方式，不需實際前往。是否開啟 Google Maps？'))return;
   if(version!==epoch)return;location.assign(url);
  }catch(e){if(version===epoch)message(e.message||'導航未開啟。');}
 }
 function renderEvents(){const d=el('details'),s=el('summary','操作歷程與測試限制');d.append(s,el('p','正式合作、真實證件上傳、真實派車與付款均未開放。模擬角色測試不等於兩個 Google 工作帳號的角色驗收。'));
  const list=el('ol');for(const e of snapshot.events.slice(-20).reverse())list.append(el('li',new Date(e.created_at).toLocaleTimeString('zh-TW')+' '+(roles[e.actor_key]||'系統')+' · '+e.action));d.append(list);body.append(d);
 }
 async function refresh(){const version=epoch;try{message('讀取中…');await load(version);if(version===epoch)message('已讀取測試後端。');}catch(e){if(version===epoch)message(e.message||'暫時無法讀取，請先登入。');}}
 function mount(){
  const host=document.querySelector('#view-member .section');if(!host)return;
  const entry=button('樂享騎手｜受控測試工作台',async()=>{
   lastFocus=document.activeElement;epoch++;owner=null;snapshot=null;actor='rider1';body.replaceChildren();panel.showModal();await refresh();
  },true);entry.id='riderWorkbenchEntry';host.append(entry);
  if(!location.pathname.endsWith('/rider.html')){const portal=document.createElement('a');portal.href='./rider.html?v=RIDER-TEST-03';portal.textContent='開啟騎手工作站｜任務・配送・收益・我的';portal.className='rw-button';portal.style.cssText='display:block;margin:16px 0;padding:16px;background:#09923a;color:white;border-radius:12px;text-align:center;text-decoration:none';host.insertBefore(portal,entry);}
  panel=el('dialog',undefined,'rw-dialog');panel.setAttribute('aria-labelledby','rwTitle');
  const head=el('header',undefined,'rw-header'),title=el('h2','樂享騎手');title.id='rwTitle';
  const close=button('關閉',()=>panel.close(),true);close.dataset.close='true';head.append(title,close);
  status=el('p','', 'rw-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  roleBar=el('div',undefined,'rw-roles');roleBar.setAttribute('aria-label','切換模擬角色');body=el('div');
  panel.append(head,el('p','受控模擬測試 · 正式營運鎖定','rw-banner'),roleBar,status,button('重新讀取',refresh,true),body);document.body.append(panel);
  panel.addEventListener('close',()=>{epoch++;snapshot=null;owner=null;retry=null;busy=false;body.replaceChildren();roleBar.replaceChildren();panel.querySelectorAll('a').forEach(a=>a.remove());lastFocus?.focus();});
  window.addEventListener('lx-share-session-changed',clear);
 }
 Object.defineProperty(window,'LX_RIDER_WORKBENCH',{value:Object.freeze({navigationUrl}),writable:false});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();

