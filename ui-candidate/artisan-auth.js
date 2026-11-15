'use strict';
(()=>{
 const auth=window.LX_TEST_AUTH_ADAPTER,main=document.getElementById('main');
 let user=null,ready=false,loading=false,busy=false;
 const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const copy={ARTISAN_REGISTRATION_REQUIRED:'這個帳號尚未完成會員註冊，請先到會員中心完成本人註冊。',ARTISAN_TEST_ACCOUNT_NOT_ALLOWED:'目前僅開放既有四帳號測試白名單。',ARTISAN_WORKSPACE_DISABLED:'本人測試工作站已停用，請聯絡管理者。'};
 function gate(message,action){
  document.body.classList.add('auth-pending');
  main.innerHTML='<section class="card auth-gate"><h1>職人工作站</h1><p>'+esc(message)+'</p>'+(user?'<p class="small muted">目前帳號：'+esc(user.email)+'</p>':'')+(action==='login'?'<button class="primary" id="artisanLogin">使用 Google 登入</button>':action==='activate'?'<button class="primary" id="artisanActivate">啟用本人職人測試工作站</button><p class="small muted">僅測試身份與容量設定，不代表正式職人資格或合作同意。</p>':'')+'<p id="authError" class="error-text" role="status"></p><a href="index.html">返回會員中心</a>'+(user?' · <button class="text-btn" id="artisanLogout">登出</button>':'')+'</section>';
 }
 async function request(action,payload={}){if(!user)throw Error('請先登入');return auth.artisanRequest(action,payload,user.id);}
 async function boot(){if(loading||ready)return;loading=true;try{
  const s=await auth.getSession();user=s?.user||null;
  if(!user){gate('沿用樂享家測試站的 Google 帳號，核對本人身份後進入。','login');return;}
  const state=await request('status');
  if(!state.activated){gate('身份已確認。請由本人啟用測試工作站。','activate');return;}
  window.LX_ARTISAN_STATE=state;
  const person=document.querySelector('.side-person');if(person)person.innerHTML='<div class="avatar">'+esc((state.display_name||'職').slice(0,1))+'</div><div>'+esc(state.display_name)+'<small>本人測試工作站</small></div>';
  const script=document.createElement('script');script.src='artisan-app.js?v=ARTISAN-CAMERA-03';
  script.onload=()=>{ready=true;document.body.classList.remove('auth-pending');};
  script.onerror=()=>gate('工作站程式載入失敗，請重新整理。');document.body.append(script);
 }catch(e){gate(copy[e.code]||'登入或工作站讀取未完成，請重新整理重試。');}finally{loading=false;}}
 function addTools(){const panel=document.createElement('div');panel.className='auth-tools';panel.innerHTML='<span>'+esc(user?.email)+'</span><a href="index.html">會員中心</a><button type="button" id="artisanLogout">登出</button>';main.prepend(panel);}
 function sync(next){window.LX_ARTISAN_STATE=next;capacity=next.capacity;paused=!next.receiving_open;bags.splice(0,bags.length,...(next.bags||[]));}
 async function update(action,payload){if(busy)return;busy=true;try{const next=await request(action,payload);sync(next);if(dialog.open)closeDialog();render();toast('本人測試設定已儲存。');}catch(e){toast(copy[e.code]||'設定尚未確認儲存，請重新讀取後再試。');}finally{busy=false;}}
 window.LX_ARTISAN_AUTH={addTools,addReceiveTools,receiveBatch,get receivingBusy(){return receivingBusy;},saveCapacity(){const n=Number(document.getElementById('capacityValue').value);if(!Number.isInteger(n)||n<1||n>100){document.getElementById('capacityError').textContent='請輸入 1～100 袋的整數。';return;}update('capacity',{capacity:n});},toggleReceiving(){update('receiving',{open:paused});}};

 let receivingBusy=false,pendingCommand=null;
 function addReceiveTools(){const node=document.createElement('details');node.className='received-details';node.innerHTML='<summary>收件測試工具／袋碼</summary><section class="card"><p class="small muted">僅操作本人測試資料，不會建立真實分享申請。獨立測試袋不會冒充騎手現場交接證據。</p><button class="secondary" id="createReceiveFixtures">① 建立三袋測試資料</button><button class="secondary" id="simulateReceiveHandover" style="margin-top:10px">② 模擬測試袋已交件</button><button class="secondary" id="refreshReceiveBags" style="margin-top:10px">重新讀取騎手交件與回執</button>'+bags.map(b=>'<div class="receipt-row"><div><b>'+esc(b.id)+'</b><small>'+esc(b.source==='fixture'?'獨立測試袋':'騎手測試工作站')+' · '+esc(b.state==='received'?'已收件':b.state==='transit'?'尚未交件':'待簽收')+'</small></div><button class="text-btn" data-qr-bag="'+esc(b.id)+'">袋碼</button></div>').join('')+'</section>';main.append(node);}
 async function receiveBatch(){if(receivingBusy)return;if(!receiveQueue.length)return;if(!document.getElementById('batchSeal').checked){toast('請先核對全部袋號、袋數與封袋外觀。');return;}
 const codes=[...receiveQueue].sort(),signature=JSON.stringify(codes);if(!pendingCommand||pendingCommand.signature!==signature)pendingCommand={signature,id:crypto.randomUUID()};receivingBusy=true;const button=document.getElementById('batchReceive');button.disabled=true;stopScan();
 try{const next=await request('receive_batch',{command_id:pendingCommand.id,codes,confirmed:true});sync(next);receiveQueue=[];pendingCommand=null;render();toast('已存檔 '+codes.length+' 袋，可重新整理確認回執。');}
 catch(e){try{const next=await request('status');sync(next);const completed=codes.every(code=>bags.some(b=>b.id===code&&b.state==='received'));if(completed){receiveQueue=[];pendingCommand=null;render();toast('已讀回全部袋件收件成功。');}else{receiveQueue=receiveQueue.filter(code=>bags.some(b=>b.id===code&&b.state==='pending'));render();toast('收件尚未確認全部成功，清單已讀回，請核對後重試。');}}catch{toast('結果不確定，請按重新讀取，勿更換帳號或重建提交。');}}
 finally{receivingBusy=false;const b=document.getElementById('batchReceive');if(b)b.disabled=!receiveQueue.length;}}
 async function testAction(action){if(receivingBusy)return;receivingBusy=true;stopScan();try{const next=await request(action,action==='status'?{}:{confirm_test_only:true});sync(next);receiveQueue=receiveQueue.filter(code=>bags.some(b=>b.id===code&&b.state==='pending'));render();toast(action==='create_test_bags'?'三袋測試資料已建立；請接著模擬交件。':action==='simulate_handover'?'測試袋已交件，可掃碼或輸入袋號。':'已重新讀取收件狀態。');}catch{toast('測試資料操作未完成，請重新讀取。');}finally{receivingBusy=false;}}
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='createReceiveFixtures')testAction('create_test_bags');if(b.id==='simulateReceiveHandover')testAction('simulate_handover');if(b.id==='refreshReceiveBags')testAction('status');if(b.dataset.qrBag){const bag=bags.find(x=>x.id===b.dataset.qrBag);if(!bag)return;stopScan();const qr=qrcode(0,'M');qr.addData(bag.id);qr.make();openDialog('測試袋條碼','<div class="bag-qr">'+qr.createSvgTag({cellSize:6,margin:4,scalable:true})+'</div><p class="bag-code">'+esc(bag.id)+'</p><p class="dialog-desc">可用另一個螢幕顯示或列印後掃描。同一支手機請使用手動輸入袋號。</p><button class="secondary" data-close>返回收件</button>');}});
 document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='artisanLogin'){b.disabled=true;try{await auth.signInWithGoogle('artisan');}catch{b.disabled=false;document.getElementById('authError').textContent='登入未開始，請重試。';}}
  if(b.id==='artisanActivate'){if(busy)return;busy=true;b.disabled=true;try{await request('activate',{confirm_test_only:true});await boot();}catch(err){gate(copy[err.code]||'測試工作站啟用未完成，請重新讀取。');}finally{busy=false;}}
  if(b.id==='artisanLogout'){document.body.classList.add('auth-pending');main.innerHTML='<section class="card">登出中…</section>';if(typeof stopScan==='function')stopScan();if(typeof stopGarmentCamera==='function')stopGarmentCamera();try{await auth.signOut();location.replace('artisan.html');}catch{location.reload();}}
 });
 window.addEventListener('lx-share-session-changed',async()=>{if(!ready)return;try{const s=await auth.getSession();if(s?.user?.id!==user?.id){document.body.classList.add('auth-pending');if(typeof stopScan==='function')stopScan();if(typeof stopGarmentCamera==='function')stopGarmentCamera();main.replaceChildren();location.reload();}}catch{location.reload();}});
 boot();
})();
