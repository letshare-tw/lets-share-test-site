"use strict";
/* Test project Auth only. Business API adapter remains locked. */
(()=>{
 const origin="https://letshare-tw.github.io",base="/lets-share-test-site/ui-candidate/";
 const projectRef="rfwqcrvxyjhtmafnbuyy",url="https://"+projectRef+".supabase.co";
 const key="sb_publishable_0TIzPc-ys9IDUz44Ci3a4w_rGwpqPoa";
 const storageKey="lx-test-"+projectRef+"-auth",pendingKey=storageKey+"-pending";
 const contract=Object.freeze({version:"B-01D-03-C06",enabled:true,allowOAuth:true,allowSession:true,allowProfile:true,projectRef,allowedPageOrigin:origin,callbackPath:base+"auth-callback.html"});
 let client;
 function environment(){
  if(location.origin!==origin||location.pathname!==base+"controlled-phone.html")throw Error("登入僅供指定獨立測試站使用");
 }
 function getClient(){
  environment();
  if(!window.supabase?.createClient)throw Error("登入元件未載入，請重新整理或稍後再試");
  if(!client)client=window.supabase.createClient(url,key,{auth:{storageKey,flowType:"pkce",detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
  return client;
 }

 // C07C-02: separate entry. No change to the public adapter or its SMS lock.
 const SEND_AUTHORIZED=false; // Implementation-only release: no SMS authorized.
 const targetId="80fcf7ae-101f-41b3-bcf2-9212706ac733";
 const phoneDigest="e892b7bb1bca8dd683ef939b48599088a2490eb1cb2af69dba79ed4b1ff6c8bf";
 const expiresAt=Date.parse("2026-11-12T00:00:00+08:00");
 const attemptKey="lx-C07C-02-attempt-"+projectRef+"-"+targetId;
 let stopped=false;
 function normalize(raw){
  const value=String(raw||"").trim().replace(/[ -]/g,"");
  if(/^09[0-9]{8}$/.test(value))return "+886"+value.slice(1);
  if(/^\+8869[0-9]{8}$/.test(value))return value;
  throw Error("請輸入台灣手機：09 開頭十碼。");
 }
 function gate(){
  environment();
  if(Date.now()>=expiresAt)throw Error("本次測試入口已到期，請回報小P。");
 }
 async function checkedUser(){
  gate();
  const {data,error}=await getClient().auth.getUser();
  if(error||!data.user)throw Error("請先返回測試站，使用原 Google 帳號登入。");
  const u=data.user;
  if(u.id!==targetId||!u.identities?.some(i=>i.provider==="google"))throw Error("不是本次指定的原 Google 會員，已停止。");
  return u;
 }
 async function checkPhone(raw){
  const phone=normalize(raw);
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(phone));
  const hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
  if(hash!==phoneDigest)throw Error("僅限先前確認、末三碼 916 的測試手機。");
  return phone;
 }
 async function inspect(raw){
  const u=await checkedUser();
  if(raw!==undefined)await checkPhone(raw);
  return {id:u.id,email:u.email||"",google:true,phoneVerified:!!u.phone_confirmed_at,
   hasPhone:!!u.phone,sendEnabled:SEND_AUTHORIZED,attempted:!!localStorage.getItem(attemptKey)};
 }
 function safeFailure(error){
  const code=String(error?.code||"unknown").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,50);
  return Error("操作未完成，已停止；不會自動重送。錯誤代碼："+code);
 }
 async function send(raw,consent){
  gate();
  if(!SEND_AUTHORIZED)throw Error("尚未開放發送；目前僅檢查，不會發送簡訊。");
  if(consent!==true)throw Error("請先確認本次只發送一次。");
  if(!navigator.locks)throw Error("此瀏覽器缺少跨分頁鎖定能力，已停止。");
  return navigator.locks.request(attemptKey,async()=>{
   if(stopped||localStorage.getItem(attemptKey))throw Error("本次已使用一次發送機會，不可重送。");
   const u=await checkedUser(),phone=await checkPhone(raw);
   if(u.phone||u.phone_confirmed_at||u.phone_change)throw Error("會員已有手機或待驗證變更，請先回報小P。");
   localStorage.setItem(attemptKey,JSON.stringify({state:"attempted",at:Date.now()}));
   try{
    const {error}=await getClient().auth.updateUser({phone});
    if(error)throw error;
    await checkedUser();
    localStorage.setItem(attemptKey,JSON.stringify({state:"pending",at:Date.now()}));
    return {pending:true};
   }catch(error){stopped=true;throw safeFailure(error);}
  });
 }
 async function verify(raw,token){
  gate();
  if(!SEND_AUTHORIZED)throw Error("目前未開放簡訊驗證。");
  if(stopped)throw Error("本次操作已停止，請回報小P。");
  if(typeof token!=="string"||!/^[0-9]{6}$/.test(token.trim()))throw Error("請輸入六位數驗證碼。");
  const u=await checkedUser(),phone=await checkPhone(raw);
  const pending=JSON.parse(localStorage.getItem(attemptKey)||"null");
  if(pending?.state!=="pending"||Date.now()-pending.at>600000||Date.now()<pending.at)throw Error("沒有有效的待驗證要求；不可重新發送。");
  localStorage.setItem(attemptKey,JSON.stringify({...pending,state:"verifying"}));
  try{
   const {error}=await getClient().auth.verifyOtp({phone,token:token.trim(),type:"phone_change"});
   if(error)throw error;
   const latest=await checkedUser();
   if(latest.id!==u.id||!latest.phone_confirmed_at||latest.phone.replace(/^\+/,"")!==phone.slice(1))throw Error("驗證結果不符，已停止。");
   localStorage.setItem(attemptKey,JSON.stringify({state:"verified",at:Date.now()}));
   return {verified:true,id:latest.id};
  }catch(error){stopped=true;throw safeFailure(error);}
 }
 Object.defineProperty(window,"LX_CONTROLLED_PHONE",{value:Object.freeze({inspect,send,verify,sendEnabled:SEND_AUTHORIZED}),writable:false,configurable:false});
})();
