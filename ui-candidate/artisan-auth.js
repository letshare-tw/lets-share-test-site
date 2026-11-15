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
  const script=document.createElement('script');script.src='artisan-app.js?v=ARTISAN-TEST-01';
  script.onload=()=>{ready=true;document.body.classList.remove('auth-pending');};
  script.onerror=()=>gate('工作站程式載入失敗，請重新整理。');document.body.append(script);
 }catch(e){gate(copy[e.code]||'登入或工作站讀取未完成，請重新整理重試。');}finally{loading=false;}}
 function addTools(){const panel=document.createElement('div');panel.className='auth-tools';panel.innerHTML='<span>'+esc(user?.email)+'</span><a href="index.html">會員中心</a><button type="button" id="artisanLogout">登出</button>';main.prepend(panel);}
 async function update(action,payload){if(busy)return;busy=true;try{const next=await request(action,payload);window.LX_ARTISAN_STATE=next;capacity=next.capacity;paused=!next.receiving_open;if(dialog.open)closeDialog();render();toast('本人測試設定已儲存。');}catch(e){toast(copy[e.code]||'設定尚未確認儲存，請重新讀取後再試。');}finally{busy=false;}}
 window.LX_ARTISAN_AUTH={addTools,saveCapacity(){const n=Number(document.getElementById('capacityValue').value);if(!Number.isInteger(n)||n<1||n>100){document.getElementById('capacityError').textContent='請輸入 1～100 袋的整數。';return;}update('capacity',{capacity:n});},toggleReceiving(){update('receiving',{open:paused});}};
 document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='artisanLogin'){b.disabled=true;try{await auth.signInWithGoogle('artisan');}catch{b.disabled=false;document.getElementById('authError').textContent='登入未開始，請重試。';}}
  if(b.id==='artisanActivate'){if(busy)return;busy=true;b.disabled=true;try{await request('activate',{confirm_test_only:true});await boot();}catch(err){gate(copy[err.code]||'測試工作站啟用未完成，請重新讀取。');}finally{busy=false;}}
  if(b.id==='artisanLogout'){document.body.classList.add('auth-pending');main.innerHTML='<section class="card">登出中…</section>';if(typeof stopScan==='function')stopScan();try{await auth.signOut();location.replace('artisan.html');}catch{location.reload();}}
 });
 window.addEventListener('lx-share-session-changed',async()=>{if(!ready)return;try{const s=await auth.getSession();if(s?.user?.id!==user?.id){document.body.classList.add('auth-pending');if(typeof stopScan==='function')stopScan();main.replaceChildren();location.reload();}}catch{location.reload();}});
 boot();
})();
