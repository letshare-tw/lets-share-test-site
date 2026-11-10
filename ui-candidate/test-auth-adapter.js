"use strict";
/* Test project Auth only. Business API adapter remains locked. */
(()=>{
 const origin="https://letshare-tw.github.io",base="/lets-share-test-site/ui-candidate/";
 const projectRef="rfwqcrvxyjhtmafnbuyy",url="https://"+projectRef+".supabase.co";
 const key="sb_publishable_0TIzPc-ys9IDUz44Ci3a4w_rGwpqPoa";
 const storageKey="lx-test-"+projectRef+"-auth",pendingKey=storageKey+"-pending";
 const contract=Object.freeze({version:"B-01D-03-C02",enabled:true,allowOAuth:true,allowSession:true,allowProfile:true,projectRef,allowedPageOrigin:origin,callbackPath:base+"auth-callback.html"});
 let client;
 function environment(){
  if(location.origin!==origin||![base,base+"index.html",contract.callbackPath].includes(location.pathname))throw Error("登入僅供指定獨立測試站使用");
 }
 function getClient(){
  environment();
  if(!window.supabase?.createClient)throw Error("登入元件未載入，請重新整理或稍後再試");
  if(!client)client=window.supabase.createClient(url,key,{auth:{storageKey,flowType:"pkce",detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
  return client;
 }
 async function verifiedSession(){
  const c=getClient();const {data,error}=await c.auth.getSession();if(error)throw error;
  if(!data.session)return null;
  const check=await c.auth.getUser();
  if(check.error||!check.data.user){await c.auth.signOut({scope:"local"});throw Error("登入狀態已失效，請重新登入");}
  const meta=check.data.user.user_metadata||{};
  const rawAvatar=meta.avatar_url||meta.picture||"";
  let avatarUrl="";
  try{const u=new URL(rawAvatar);if(u.protocol==="https:"&&(u.hostname==="googleusercontent.com"||u.hostname.endsWith(".googleusercontent.com")))avatarUrl=u.href;}catch(_){}
  const googleName=[meta.full_name,meta.name,[meta.given_name,meta.family_name].filter(Boolean).join(" ")].find(v=>typeof v==="string"&&v.trim())||"";
  return {user:{id:check.data.user.id,email:check.data.user.email||"",avatarUrl,googleName:googleName.trim(),phone:check.data.user.phone||"",phoneVerified:!!check.data.user.phone_confirmed_at}};
 }
 async function signInWithGoogle(){
  const c=getClient();
  localStorage.setItem(pendingKey,String(Date.now()));
  try{
   const {data,error}=await c.auth.signInWithOAuth({provider:"google",options:{redirectTo:origin+contract.callbackPath,skipBrowserRedirect:true,queryParams:{prompt:"select_account"}}});
   if(error)throw error;
   const target=new URL(data.url);if(target.origin!==url||target.pathname!=="/auth/v1/authorize")throw Error("登入目的地不符");
   location.assign(target.href);
  }catch(e){localStorage.removeItem(pendingKey);throw e;}
 }
 async function handleCallback(){
  environment();if(location.pathname!==contract.callbackPath)throw Error("回跳路徑不符");
  const params=new URLSearchParams(location.search),hash=location.hash;
  history.replaceState(null,"",location.pathname);
  const started=Number(localStorage.getItem(pendingKey));localStorage.removeItem(pendingKey);
  if(params.has("error")||hash)throw Error("Google 登入已取消或回跳格式不符，請返回重試");
  const codes=params.getAll("code");
  if(codes.length!==1||!codes[0]||!started||Date.now()-started>600000||Date.now()<started)throw Error("登入回跳已過期或不是從本站發起，請返回重新登入");
  const {error}=await getClient().auth.exchangeCodeForSession(codes[0]);if(error)throw Error("登入驗證未完成，請返回重新登入");
  const session=await verifiedSession();if(!session)throw Error("無法建立登入狀態，請重試");
  return session;
 }
 async function signOut(){
  const c=getClient();const {error}=await c.auth.signOut({scope:"local"});if(error)throw error;
  localStorage.removeItem(pendingKey);
 }
 async function getProfile(){
  const session=await verifiedSession();if(!session)return null;
  const {data,error}=await getClient().from("profiles").select("id,display_name,full_name,registration_completed_at,address_city,address_district,address_street,address_detail,home_address,home_placement_note").eq("id",session.user.id).maybeSingle();
  if(error)throw Error("會員資料暫時無法讀取，請稍後重試");
  return data;
 }
 async function saveDisplayName(value){
  const session=await verifiedSession();if(!session)throw Error("請先登入");
  if(typeof value!=="string")throw Error("會員名稱格式不正確");
  const cleaned=value.trim(),length=Array.from(cleaned).length;
  if(length<2||length>30)throw Error("會員名稱須為 2～30 個字元");
  const {data,error}=await getClient().from("profiles").update({display_name:cleaned}).eq("id",session.user.id).select("id,display_name").maybeSingle();
  if(error)throw Error("會員名稱儲存失敗，請稍後重試");
  if(!data||data.id!==session.user.id||data.display_name!==cleaned)throw Error("找不到可更新的本人會員資料");
  return data;
 }

 // SMS provider status is unverified: no request is ever sent from this build.
 const phoneOtp=Object.freeze({enabled:false,reason:"測試專案 SMS 提供者尚未確認，為避免發送簡訊已安全停用。"});
 async function requestPhoneOtp(){throw Error(phoneOtp.reason);}
 async function verifyPhoneOtp(){throw Error(phoneOtp.reason);}
 function cleanAddress(value,max){if(typeof value!=="string")throw Error("地址欄位格式不正確");const v=value.trim();if(Array.from(v).length>max||/[\\u0000-\\u001f\\u007f]/.test(v))throw Error("地址欄位含無效字元或過長");return v;}
 async function saveAddress(fields){
  const session=await verifiedSession();if(!session)throw Error("請先登入");
  if(!fields||typeof fields!=="object")throw Error("地址格式不正確");
  const city=cleanAddress(fields.address_city,20),district=cleanAddress(fields.address_district,20);
  const street=cleanAddress(fields.address_street,120),detail=cleanAddress(fields.address_detail,120);
  const note=cleanAddress(fields.home_placement_note,200);
  if(!city||!district||!street)throw Error("請填寫縣市、行政區及街道門牌");
  const home=[city,district,street,detail].filter(Boolean).join("");
  if(Array.from(home).length>250)throw Error("地址內容過長");
  const payload={address_city:city,address_district:district,address_street:street,address_detail:detail,home_address:home,home_placement_note:note};
  const {data,error}=await getClient().from("profiles").update(payload).eq("id",session.user.id).select("id,address_city,address_district,address_street,address_detail,home_address,home_placement_note").maybeSingle();
  if(error)throw Error("地址儲存失敗，請稍後重試");
  if(!data||data.id!==session.user.id||Object.keys(payload).some(k=>data[k]!==payload[k]))throw Error("地址儲存驗證失敗");
  return data;
 }
 Object.defineProperty(window,"LX_TEST_AUTH_ADAPTER",{value:Object.freeze({mode:"test-auth-only",contract,signInWithGoogle,handleCallback,getSession:verifiedSession,restoreSession:verifiedSession,signOut,getProfile,saveDisplayName,phoneOtp,requestPhoneOtp,verifyPhoneOtp,saveAddress}),writable:false,configurable:false});
})();
