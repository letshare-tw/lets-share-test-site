"use strict";
(()=>{
 const $=id=>document.getElementById(id),auth=window.LX_TEST_AUTH_ADAPTER;
 const icons={tasks:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9zM9 12h6M9 16h4"/>',ride:'<path d="M3 6h12v12H3zM15 10h4l3 4v4h-7M6 6V3h6"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',money:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M15 14h3"/>',user:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M6 19c0-6 12-6 12 0"/>',arrow:'<path d="m5 12 14-7-7 14-2-7z"/>'};
 const icon=n=>'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">'+icons[n]+'</svg>';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={unassigned:'可承接',offered:'待接單',accepted:'前往取件',picked_up:'前往交付',handover_pending:'等待收件端簽收',delivered:'已完成',exception:'異常處理中',cancelled:'已取消'};
 const errors={RIDER_CAPACITY_REACHED:'已接滿三個任務，請先完成交接。',RIDER_STALE_STATE:'任務已更新，請確認最新狀態後重試。',RIDER_QUALIFICATION_DENIED:'騎手或本次機車資格不符，請先完成審核。',RIDER_TASK_DENIED:'此任務已被承接或無權操作。',RIDER_PHOTO_REQUIRED:'請先拍攝並儲存現場照片。',RIDER_PHOTO_INVALID:'照片尚未儲存成功或不屬於此任務。',RIDER_BAG_CHECK_REQUIRED:'袋號或封袋確認不符，請重新核對。',RIDER_MEMBER_DENIED:'請使用指定且完成註冊的測試會員。',RIDER_TEST_LOCKED:'騎手測試目前關閉。'};
 let actor=['rider1','rider2'].includes(new URLSearchParams(location.search).get('actor'))?new URLSearchParams(location.search).get('actor'):'rider1';
 let data=null,owner=null,tab='tasks',currentId=null,busy=false,epoch=0,readSeq=0,modalEpoch=0,proofBlob=null,proofUrl=null,photoSeq=0,toastTimer=null,pendingCommand=null,proofControl=null,departureControl=null,trip=null;
 const active=()=>data?.tasks?.filter(t=>['accepted','picked_up','handover_pending','exception'].includes(t.status))||[];
 const current=()=>data?.tasks?.find(t=>t.id===currentId);

 const route=window.LX_RIDER_ROUTE;
 const routeScope=()=>owner&&data?.workspace_id?[owner,data.workspace_id,actor].join(':'):null;
 const routeKey=()=>'lx-rider-trip-v1:'+routeScope();
 const tripTasks=()=>trip?.scope===routeScope()?trip.ids.map(id=>data.tasks.find(t=>t.id===id)).filter(Boolean):[];
 const inTrip=()=>tripTasks().some(t=>!['delivered','cancelled'].includes(t.status));
 function restoreTrip(){if(trip?.scope===routeScope())return;trip=null;try{const saved=JSON.parse(localStorage.getItem(routeKey())||'null');if(saved?.scope===routeScope()&&Array.isArray(saved.ids)&&saved.ids.length>0&&saved.ids.length<=3&&new Set(saved.ids).size===saved.ids.length&&saved.ids.every(id=>data.tasks.some(t=>t.id===id&&t.status!=='offered')))trip=saved;}catch(_){}}
 function stops(){return route.buildStops(tripTasks());}
 function nextStop(){return stops().find(s=>!s.done);}
 function working(kind){const stop=nextStop(),t=current();return !!trip&&!!t&&stop?.kind===kind&&stop.tasks.some(x=>x.id===t.id)&&!stop.blocked;}
 function departureSignature(){return active().map(t=>[t.id,t.status,t.vehicle_id||''].join(':')).join('|');}
 function mountDeparture(){const host=$('departureConfirm');if(!host)return;const scope=routeScope(),version=epoch;
  departureControl=window.LX_RIDER_ARRIVAL?.mount({host,labelText:'向右滑動，確認出發',pendingText:'正在確認本趟路線…',blockedText:'請先承接取送任務',ariaLabel:'挑選任務完成後，向右滑動出發',getKey:()=>!busy&&owner&&version===epoch&&scope===routeScope()&&!inTrip()&&active().length>0&&active().length<=3?[epoch,scope,data.revision,departureSignature()].join(':'):null,onConfirm:async()=>{
   const expected=departureSignature();await load();if(version!==epoch||scope!==routeScope())return;
   if(inTrip()||expected!==departureSignature()||!active().length){toast('任務已更新，請重新確認路線後出發。');return;}
   trip={scope,ids:active().map(t=>t.id),started_at:new Date().toISOString()};try{localStorage.setItem(routeKey(),JSON.stringify(trip));}catch(_){toast('本次路線僅保留在目前頁面，重新整理後需再確認出發。');}
   tab='ride';render();
  }});
  if(!departureControl)host.textContent='滑動元件未載入，請重新整理。';
 }
 function stopList(items){return '<ol class="stop-list">'+items.map((s,i)=>'<li class="stop-item '+(s.kind==='delivery'?'delivery-stop ':'')+(s.done?'stop-done':'')+'"><span class="stop-number">'+(i+1)+'</span><div><b>'+esc(s.kind==='pickup'?'取件':'送件')+' · '+esc(s.label||'目的地待確認')+'</b><span class="muted">'+s.tasks.map(t=>esc(t.bag_code)).join('、')+' · '+s.tasks.filter(t=>t.status!=='cancelled').length+' 袋</span><span class="stop-state">'+(s.cancelled?'已取消':s.done?'已完成':s.blocked?'待處理／待取齊':s.waiting?'等待收件端簽收':'待完成')+'</span></div></li>').join('')+'</ol>';}

 function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').style.display='block';toastTimer=setTimeout(()=>$('toast').style.display='none',5000);}
 function releaseProof(){photoSeq++;proofBlob=null;if(proofUrl)URL.revokeObjectURL(proofUrl);proofUrl=null;}
 function closeModal(){proofControl?.destroy();proofControl=null;modalEpoch++;releaseProof();$('sheet').classList.remove('open');$('body').replaceChildren();}
 function modal(html){closeModal();$('body').innerHTML=html+'<button type="button" class="cancel" data-act="close">返回畫面</button>';$('sheet').classList.add('open');$('body').querySelector('button,input,select,textarea')?.focus();}
 function clear(){departureControl?.destroy();departureControl=null;trip=null;proofControl?.destroy();proofControl=null;epoch++;readSeq++;busy=false;data=null;owner=null;currentId=null;pendingCommand=null;closeModal();$('main').textContent='登入身分已變更，請重新讀取。';$('action').replaceChildren();$('nav').replaceChildren();lock();}
 async function load(){const version=epoch,seq=++readSeq,role=actor;
  const session=await auth.getSession();if(version!==epoch||seq!==readSeq)return;
  if(!session){clear();$('main').innerHTML='<h1>請先登入</h1><div class="card"><p>此工作站沿用測試站 Google 登入。</p><a class="primary" href="index.html">前往測試站登入</a></div>';return;}
  if(owner&&owner!==session.user.id){clear();return;}
  const result=await auth.riderRequest('bootstrap',{actor:role},session.user.id);if(version!==epoch||seq!==readSeq)return;
  owner=session.user.id;data=result;render();return result;
 }
 async function refresh(){if(busy)return;try{await load();pendingCommand=null;}catch(e){const msg=errors[e.code]||e.message||'暫時無法讀取。';toast(msg);if(!data)$('main').innerHTML='<h1>目前無法讀取</h1><div class="card"><p>'+esc(msg)+'</p><p>請按上方重新讀取，或返回會員中心確認測試登入。</p></div>';}}
 function lock(){document.querySelectorAll('.app button,.sheet button,.test-controls select').forEach(b=>{if(busy){if(b.dataset.beforeBusy===undefined)b.dataset.beforeBusy=b.disabled?'1':'0';b.disabled=true;}else if(b.dataset.beforeBusy!==undefined){b.disabled=b.dataset.beforeBusy==='1';delete b.dataset.beforeBusy;}});}
 async function command(action,payload={},options={}){
  if(busy||!owner)return null;
  if(pendingCommand){const old={...pendingCommand.payload};delete old.actor;delete old.revision;delete old.command_id;if(pendingCommand.action!==action||JSON.stringify(old)!==JSON.stringify(payload)){toast('上一筆結果尚未確認，請先按重新讀取。');return null;}}
  const version=epoch,id=owner;busy=true;lock();
  const request=pendingCommand&&pendingCommand.action===action?pendingCommand:{action,payload:{...payload,actor,revision:data?.revision||0,command_id:crypto.randomUUID()}};
  pendingCommand=request;
  try{
   const r=await auth.riderRequest(request.action,request.payload,id);if(version!==epoch)return null;
   pendingCommand=null;if(!options.keepModal)closeModal();await load();if(version!==epoch)return null;toast('已儲存並重新讀取後端。');return r;
  }catch(e){if(version!==epoch)return null;
   // Network uncertainty: never silently turn a retry into a different operation.
   if(e.code&&e.code!=='RIDER_REQUEST_FAILED')pendingCommand=null;
   await load().catch(()=>{});if(version===epoch)toast(errors[e.code]||e.message||'結果未確認，請重新讀取任務狀態。');return null;
  }finally{if(version===epoch){busy=false;lock();departureControl?.refresh();proofControl?.refresh();}}
 }
 function nav(){ $('nav').innerHTML=[['tasks','任務'],['ride','配送'],['money','收益'],['user','我的']].map(([key,label])=>`<button type="button" data-tab="${key}" class="${tab===key?'active tap-feedback':''}" ${tab===key?'aria-current="page"':''}>${icon(key)}<span>${label}</span></button>`).join(''); }
 function render(){departureControl?.destroy();departureControl=null;restoreTrip();nav();$('action').replaceChildren();
  if(!data?.workspace_id){$('main').innerHTML='<h1>開始騎手測試</h1><div class="card"><p>建立本人隔離工作區後，先完成模擬資格與車輛審核。這不授予正式工作權限。</p><button class="primary" data-act="init">建立本人模擬工作區</button></div>';return;}
  if(!currentId||!data.tasks.some(t=>t.id===currentId))currentId=active()[0]?.id||data.tasks[0]?.id||null;
  if(tab==='tasks')renderTasks();else if(tab==='ride')renderRide();else if(tab==='money')renderMoney();else renderProfile();lock();proofControl?.refresh();
 }
 function renderTasks(){const n=active().length,available=data.available_tasks||[],offered=data.tasks.filter(t=>t.status==='offered');
  const person=data.people.find(p=>p.key===actor);
  $('main').innerHTML=`<div class="eyebrow">AVAILABLE TASKS</div><div class="row"><h1>挑選任務</h1><span class="pill">待接 ${available.length+offered.length} 件</span></div><div class="capacity"><div class="row"><b>已接任務 ${n}／3 件</b><button class="textbtn" data-tab="ride">查看本趟路線 →</button></div><div class="slots">${[0,1,2].map(i=>`<i class="${i<n?'filled':''}"></i>`).join('')}</div><p class="reminder">${n>=3?'已接滿三件，完成雙方交接後釋出名額。':'目前還可接 '+(3-n)+' 件。'}</p></div>${!person?.eligible?'<div class="qual-status">尚未取得有效模擬資格。<button class="textbtn" data-act="qual">查看資格與機車 →</button></div>':''}${[...offered,...available].map(t=>`<article class="card task-card"><div class="row"><span class="pill">衣物取送 · 測試</span><span class="muted">${esc(t.bag_code)}</span></div><h2 class="task-title">${esc(t.pickup_area||'臺南取件區')} <span>→</span> ${esc(t.delivery_area||'臺南交接區')}</h2><div class="task-facts"><span>取件期限 ${esc(new Date(t.pickup_deadline).toLocaleString('zh-TW'))}</span><span>1 袋</span></div><div class="row task-bottom"><span class="muted">費率尚未核定</span><button class="primary compact" data-act="detail" data-id="${esc(t.id)}" ${n>=3?'disabled':''}>${n>=3?'已接滿三件':'查看任務 →'}</button></div></article>`).join('')}${!available.length&&!offered.length?'<div class="empty">目前沒有可承接任務。<br><button class="textbtn" data-act="qual">前往測試管理建立模擬任務</button></div>':''}<p class="muted">任務來自本人隔離的測試工作區，不會安排實際取送。</p>`;
  if(n){$('main').innerHTML+='<section class="card"><h2>'+ (inTrip()?'本趟路線進行中':'已選取送任務')+'</h2>'+active().map(t=>'<p>'+esc(t.bag_code)+' · '+esc(labels[t.status])+'</p>').join('')+'<p>承接上限以袋件計算；本趟清單以取件、送件站點計算。</p></section>';}
  if(inTrip())$('action').innerHTML='<button class="primary" data-tab="ride">返回本趟路線 →</button>';
  else {$('action').innerHTML='<div id="departureConfirm"></div>';mountDeparture();}
 }

 function renderRide(){
  const tasks=tripTasks(),items=stops();
  if(!trip||!tasks.length){const preview=route.buildStops(active());$('main').innerHTML='<h1>準備出發</h1><section class="card"><p>先挑選本趟任務，再滑動確認出發。</p>'+stopList(preview)+'<button class="textbtn" data-tab="tasks">繼續挑選任務 →</button></section>';$('action').innerHTML='<div id="departureConfirm"></div>';mountDeparture();return;}
  const done=items.filter(s=>s.done).length,stop=items.find(s=>!s.done);
  let heading='<div class="eyebrow">THIS TRIP</div><h1>本趟取送任務</h1><section class="card"><div class="row"><b>已完成 '+done+'／'+items.length+' 項</b><span class="pill">待完成 '+(items.length-done)+' 項</span></div>'+stopList(items)+'</section>';
  if(!stop){$('main').innerHTML=heading+'<section class="card"><h2>這趟分享，順利送達。</h2><p>各袋簽收回執已保留，可在收益紀錄查看。</p><button class="primary" data-tab="tasks">繼續挑選任務</button></section>';return;}
  const delivery=stop.kind==='delivery',live=stop.tasks.filter(t=>t.status!=='cancelled');
  const t=delivery?(live.find(t=>t.status==='exception')||live.find(t=>t.status==='picked_up')||live.find(t=>t.status==='handover_pending')||live[0]):live[0];
  if(!t){$('main').innerHTML=heading;return;}currentId=t.id;
  const index=items.indexOf(stop),canWork=!stop.blocked&&(!delivery||live.every(route.picked));
  const pending=live.filter(t=>t.status==='handover_pending').length,signed=live.filter(t=>t.status==='delivered').length;
  $('main').innerHTML=heading+'<div class="row"><h2>'+esc(delivery?'前往送件':t.arrived_at?'確認取件':'前往取件')+'</h2><span class="pill">第 '+(index+1)+'／'+items.length+' 項</span></div><section class="card '+(delivery?'delivery-card':'')+'"><div class="address">'+esc(stop.label)+'</div><p>'+esc(delivery?'同站逐袋核對，所有袋件簽收後才完成本站。':'核對分享袋號與封袋完整，拍照後滑動取件。')+'</p><div class="map"><svg viewBox="0 0 350 150"><path d="M0 30h350M0 120h350M65 0v150M280 0v150" stroke="#fff" stroke-width="20"/><path d="M65 120h110V50h77" fill="none" stroke="#777" stroke-width="5" stroke-dasharray="6 8"/><circle cx="252" cy="50" r="12" fill="'+(delivery?'#f4a574':'#09923a')+'"/></svg><div class="maplabel">路線示意 · 非即時地圖</div></div>'+(canWork&&['accepted','picked_up'].includes(t.status)?'<button class="secondary" data-act="navigate">'+icon('arrow')+'Google 機車導航</button>':'')+'<div class="stats"><div><strong>'+live.length+' 袋</strong><span class="muted">不開袋驗收衣物</span></div><div><strong>'+esc(t.bag_code)+'</strong><span class="muted">目前核對袋號</span></div></div>'+live.map(b=>'<div class="route"><b>'+esc(b.bag_code)+'</b><span>'+esc(labels[b.status])+'</span>'+(b.receipt_code?'<p>'+esc(b.receipt_code)+'</p>':'')+'</div>').join('')+(delivery?'<p class="muted">已簽收 '+signed+'／'+live.length+' 袋；等待簽收 '+pending+' 袋。</p>':'')+'</section>';
  if(stop.blocked){$('main').innerHTML+='<section class="card"><h2>異常處理中</h2><p>'+esc(t.exception_code||'')+'</p><p>先回報並由模擬總部處理，保留原持袋責任。</p><button class="secondary" data-act="qual">開啟測試管理</button></section>';}
  else if(stop.waiting){$('main').innerHTML+='<section class="card"><h2>已交出，等待對方簽收</h2><p>本站所有袋件簽收後，才算完成送件。</p><button class="secondary" data-act="qual">開啟測試收件端</button></section>';}
  $('main').innerHTML+='<section class="card"><h2>袋件紀錄</h2><p class="muted">'+esc(t.bag_code)+' · 取件期限 '+esc(new Date(t.pickup_deadline).toLocaleString('zh-TW'))+'</p>'+(t.pickup_photo_path?'<button class="secondary" data-act="photo" data-stage="pickup">查看取件照片</button>':'')+(t.delivery_photo_path?'<button class="secondary" data-act="photo" data-stage="delivery">查看交付照片</button>':'')+'<button class="textbtn" data-act="route">查看全程站點</button><button class="textbtn" data-act="history">查看操作歷程</button></section>';
  if(['accepted','picked_up','handover_pending'].includes(t.status))$('main').innerHTML+='<button class="textbtn" data-act="report">⚑ 異常通報</button>';
  if(canWork&&stop.kind==='pickup'&&t.status==='accepted')$('action').innerHTML='<button class="primary" data-act="'+(t.arrived_at?'pickup':'arrive')+'">'+(t.arrived_at?'確認袋號與拍照':'我已抵達取件點')+' →</button>';
  if(canWork&&delivery&&t.status==='picked_up')$('action').innerHTML='<button class="primary delivery-button" data-act="handover">核對 '+esc(t.bag_code)+' 並交付拍照 →</button>';
 }
 function renderMoney(){$('main').innerHTML=`<div class="eyebrow">YOUR EARNINGS</div><h1>我的收益</h1><div class="card"><span class="muted">本期配送收益</span><div class="money">NT$ —</div><span class="pill">正式費率與付款鎖定</span></div><div class="card"><h2>配送紀錄</h2>${data.tasks.map(t=>`<div class="route"><b>${esc(t.bag_code)}</b><span>${esc(labels[t.status])}</span>${t.receipt_code?'<p class="muted">'+esc(t.receipt_code)+'</p>':''}</div>`).join('')||'<p>尚無配送紀錄。</p>'}<p class="muted">只顯示後端任務紀錄，不以示範金額冒充已賺收益。</p></div>`;}
 function renderProfile(){const p=data.people.find(p=>p.key===actor);$('main').innerHTML=`<div class="eyebrow">RIDER PROFILE</div><h1>我的騎手資料</h1><div class="card"><div class="row"><h2>${esc(p?.label||'模擬騎手')}</h2><span class="pill">${p?.eligible?'模擬資格有效':'尚不可接單'}</span></div><p class="muted">工作區內的模擬角色，不是正式工作帳號。</p><div class="route"><b>良民證有效期限</b>${esc(p?.cert_valid_until||'尚未核准')}</div><div class="route"><b>我的機車</b>${data.vehicles.map(v=>'<p>'+esc(v.label)+' · '+esc({approved:'已核准',pending:'待審核',revoked:'授權已撤回'}[v.status])+'</p>').join('')||'尚未新增'}</div><button class="secondary" data-act="qual">查看資格、車輛與模擬證件</button><button class="cancel" data-act="history">查看操作歷程</button></div>`;}
 function detail(id){const t=[...(data.available_tasks||[]),...data.tasks].find(t=>t.id===id);if(!t)return;const cars=data.vehicles.filter(v=>v.status==='approved'&&v.owner_authorized);modal(`<h2>任務詳情</h2><span class="pill">${esc(t.bag_code)}</span><div class="route"><b>臺南取件區 → 臺南交接區</b><p>1 袋 · 取件期限 ${esc(new Date(t.pickup_deadline).toLocaleString('zh-TW'))}</p></div><p class="muted">承接成功後才顯示導航目的地。費率未核定，僅測試操作。</p><label class="choice">本趟使用機車<select id="vehicle">${cars.map(v=>`<option value="${esc(v.id)}">${esc(v.label)}</option>`).join('')}</select></label>${!cars.length?'<p class="reminder">尚無已核准機車，請先完成資格審核。</p>':''}<button class="primary" data-act="accept" data-id="${esc(t.id)}" data-kind="${t.status==='unassigned'?'claim':'accept'}" ${!cars.length||active().length>=3?'disabled':''}>確認承接任務</button>`);}
 function proofForm(kind){const t=current();if(!t||!working(kind==='pickup'?'pickup':'delivery'))return;modal(`<h2>${kind==='pickup'?'確認取件':'確認交出袋件'}</h2><p>分享袋：${esc(t.bag_code)} · 1 袋</p><label class="choice">核對袋號<input id="bag" type="text" autocomplete="off" placeholder="輸入或掃描袋號"></label><button class="secondary" data-act="scan">模擬掃描袋號</button>${kind==='pickup'?'<label class="choice"><input id="sealed" type="checkbox"> 我已核對封袋完整，未開袋</label>':''}<label class="choice">現場照片<input id="proof" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" style="display:block;width:100%;margin-top:10px"></label><img id="preview" alt="現場照片縮圖" hidden><p id="proofState" class="proof-state">照片會先在本機壓縮至 100,000 bytes 以下，再上傳私密儲存空間。</p><div id="proofConfirm"></div>`);
  const taskId=t.id;
  proofControl=window.LX_RIDER_ARRIVAL?.mount({host:$('proofConfirm'),tone:kind==='delivery'?'apricot':'green',labelText:kind==='pickup'?'向右滑動，確認取件':'向右滑動，確認交付',pendingText:kind==='pickup'?'正在確認取件…':'正在確認交付…',blockedText:kind==='pickup'?'先核對袋號、封袋並拍照':'先核對袋號並完成拍照',ariaLabel:kind==='pickup'?'核袋與拍照完成後，向右滑動確認取件':'核袋與拍照完成後，向右滑動確認交付',getKey:()=>{
   const task=current();
   return !busy&&working(kind==='pickup'?'pickup':'delivery')&&owner&&$('sheet').classList.contains('open')&&task?.id===taskId&&task.status===(kind==='pickup'?'accepted':'picked_up')&&proofBlob&&proofBlob.size>0&&proofBlob.size<=100000&&$('bag')?.value.trim()===task.bag_code&&(kind!=='pickup'||$('sealed')?.checked)?[epoch,owner,actor,taskId,data.revision,modalEpoch,photoSeq].join(':'):null;
  },onConfirm:()=>finish(kind)});
  if(!proofControl)$('proofConfirm').textContent='滑動元件未載入，請重新整理。';
 }
 async function processPhoto(file){if(!file)return;const version=epoch,modalId=modalEpoch,token=++photoSeq;proofBlob=null;proofControl?.refresh();$('proofState').textContent='照片壓縮中…';
  try{const b=await window.LX_RIDER_PHOTO.compress(file);if(version!==epoch||modalId!==modalEpoch||token!==photoSeq)return;if(proofUrl)URL.revokeObjectURL(proofUrl);proofBlob=b;proofUrl=URL.createObjectURL(b);$('preview').src=proofUrl;$('preview').hidden=false;$('proofState').textContent='已壓縮 '+b.size+' bytes；確認後才上傳。';proofControl?.refresh();}
  catch(e){if(version===epoch&&modalId===modalEpoch&&token===photoSeq)$('proofState').textContent=e.message;}
 }
 async function finish(kind){if(busy||!proofBlob||!working(kind==='pickup'?'pickup':'delivery'))return;const t=current(),version=epoch,id=owner,blob=proofBlob,startedRevision=data.revision;if($('bag').value.trim()!==t.bag_code||kind==='pickup'&&!$('sealed')?.checked){toast('請核對袋號'+(kind==='pickup'?'並確認封袋完整。':'。'));return;}
  const ext={'image/webp':'webp','image/jpeg':'jpg','image/png':'png'}[blob.type];const path=[id,data.workspace_id,t.id,actor,kind,'image',crypto.randomUUID()+'.'+ext].join('/');
  busy=true;lock();let uploaded=false;
  try{await auth.riderProofUpload(path,blob,id);uploaded=true;if(version!==epoch)return;
   busy=false;const r=await command(kind==='pickup'?'pickup':'handover',{task_id:t.id,bag_code:t.bag_code,sealed:true,photo_path:path});
   if(!r&&version===epoch){const latest=data?.tasks?.find(x=>x.id===t.id);const linked=latest?.pickup_photo_path===path||latest?.delivery_photo_path===path;if(!linked&&!pendingCommand&&latest&&data.revision>startedRevision){await auth.riderProofRemove(path,id).catch(()=>{});}}
  }catch(e){if(version===epoch){toast(e.message||'照片儲存失敗。');if(uploaded)await auth.riderProofRemove(path,id).catch(()=>{});}}
  finally{if(version===epoch){busy=false;lock();}}
 }
 function mapsUrl(t){const delivery=t.status==='picked_up';if([delivery?t.delivery_lat:t.pickup_lat,delivery?t.delivery_lng:t.pickup_lng].some(v=>v===null||v===undefined||v===''))throw Error('目的地座標不完整');const lat=Number(delivery?t.delivery_lat:t.pickup_lat),lng=Number(delivery?t.delivery_lng:t.pickup_lng);if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw Error('目的地座標不完整');const u=new URL('https://www.google.com/maps/dir/');u.searchParams.set('api','1');u.searchParams.set('destination',lat+','+lng);u.searchParams.set('travelmode','two-wheeler');u.searchParams.set('dir_action','navigate');return u.href;}
 async function navigate(){if(busy||!trip||!nextStop()||nextStop().blocked)return;const version=epoch,id=currentId,role=actor,uid=owner,expected=nextStop().kind==='pickup'?'accepted':'picked_up';try{const latest=await auth.riderRequest('bootstrap',{actor:role},uid);if(version!==epoch)return;const t=latest.tasks.find(t=>t.id===id&&t.status===expected);if(!t)throw Error('任務狀態已變更，請重新讀取。');location.assign(mapsUrl(t));}catch(e){if(version===epoch)toast(e.message);}}
 function report(){modal('<h2>異常通報</h2><p>發現袋數不符或封袋破損，請先回報，不自行開袋或改寫袋數。</p><select id="reason" class="choice"><option value="bag_missing">找不到袋件</option><option value="seal_broken">封袋破損</option><option value="address_issue">地址／袋號問題</option><option value="cannot_deliver">無法交付</option><option value="safety">現場不安全／其他</option></select><textarea id="note" maxlength="200" placeholder="補充說明（不填個資）"></textarea><button class="primary" data-act="send-report">送出通報</button>');}
 async function showPhoto(stage){const t=current(),version=epoch;try{const r=await auth.riderRequest('proof_link',{actor,task_id:t.id,stage},owner);if(version!==epoch)return;const u=new URL(r.signed_url);if(u.origin!=='https://rfwqcrvxyjhtmafnbuyy.supabase.co')throw Error('照片來源不符');modal('<h2>私密現場照片</h2><img alt="任務現場照片" src="'+esc(u.href)+'"><p class="muted">短效閱覽連結，請勿轉傳。</p>');}catch(e){if(version===epoch)toast(e.message||'照片暫時無法讀取。');}}
 function qual(){$('riderWorkbenchEntry')?.click();}
 document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.tab){if(busy)return;closeModal();tab=b.dataset.tab;render();return;}const act=b.dataset.act;if(!act)return;if(busy&&act!=='close')return;
  if(act==='close'){closeModal();return;}if(act==='qual'){qual();return;}if(act==='init'){await command('initialize');return;}if(act==='detail'){detail(b.dataset.id);return;}if(act==='accept'){const car=$('vehicle')?.value;if(!car){toast('請先核准機車。');return;}const r=await command(b.dataset.kind,{task_id:b.dataset.id,vehicle_id:car});if(r){currentId=b.dataset.id;tab='tasks';render();toast('已承接，可繼續挑選；準備好再滑動出發。');}return;}
  if(act==='arrive'){if(!working('pickup'))return;await command('arrive',{task_id:currentId});return;}if(act==='select'){currentId=b.dataset.id;tab='ride';render();return;}if(act==='pickup'||act==='handover'){proofForm(act==='pickup'?'pickup':'delivery');return;}if(act==='scan'){$('bag').value=current().bag_code;proofControl?.refresh();return;}if(act==='navigate'){await navigate();return;}if(act==='report'){report();return;}if(act==='send-report'){await command('exception',{task_id:currentId,code:$('reason').value,note:$('note').value});return;}if(act==='photo'){await showPhoto(b.dataset.stage);return;}
  if(act==='route'){modal('<h2>本趟站點任務</h2>'+stopList(stops())+'<p class="muted">依任務順序取件，再送至各收件點；不自動最佳化路線。</p>');return;}
  if(act==='history'){modal('<h2>操作歷程</h2>'+data.events.slice(-30).reverse().map(x=>'<div class="route"><b>'+esc(x.action)+'</b>'+esc(new Date(x.created_at).toLocaleString('zh-TW'))+'</div>').join(''));}
 });
 document.addEventListener('change',e=>{if(e.target.id==='proof')processPhoto(e.target.files?.[0]);else if(e.target.id==='sealed')proofControl?.refresh();});
 document.addEventListener('input',e=>{if(e.target.id==='bag')proofControl?.refresh();});
 $('actor').value=actor;$('actor').addEventListener('change',()=>{clear();actor=$('actor').value;refresh();});$('reload').addEventListener('click',refresh);$('engineering').addEventListener('click',qual);
 window.addEventListener('lx-share-session-changed',()=>{clear();refresh();});window.addEventListener('pageshow',()=>{if(owner)refresh();});window.addEventListener('focus',()=>{if(owner&&!$('sheet').classList.contains('open')&&!document.querySelector('.rw-dialog[open]'))refresh();});
 document.addEventListener('close',e=>{if(e.target.classList?.contains('rw-dialog'))refresh();},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if(e.key==='Tab'&&$('sheet').classList.contains('open')){const f=[...$('body').querySelectorAll('button:not(:disabled),input,select,textarea,a')];if(!f.length)return;const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 Object.defineProperty(window,'LX_RIDER_APP',{value:Object.freeze({mapsUrl})});refresh();
})();
