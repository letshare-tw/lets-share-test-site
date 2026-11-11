"use strict";
/* Shared test Auth client; SHARE-TEST-02-04 scoped bridge, submission locked. */
(()=>{
 const origin="https://letshare-tw.github.io",base="/lets-share-test-site/ui-candidate/";
 const projectRef="rfwqcrvxyjhtmafnbuyy",url="https://"+projectRef+".supabase.co";
 const key="sb_publishable_0TIzPc-ys9IDUz44Ci3a4w_rGwpqPoa";
 const storageKey="lx-test-"+projectRef+"-auth",pendingKey=storageKey+"-pending";
 const contract=Object.freeze({version:"B-01D-03-C06",enabled:true,allowOAuth:true,allowSession:true,allowProfile:true,projectRef,allowedPageOrigin:origin,callbackPath:base+"auth-callback.html"});
 let client;
 function environment(){
  if(location.origin!==origin||![base,base+"index.html",contract.callbackPath].includes(location.pathname))throw Error("登入僅供指定獨立測試站使用");
 }
 function getClient(){
  environment();
  if(!window.supabase?.createClient)throw Error("登入元件未載入，請重新整理或稍後再試");
  if(!client){
   client=window.supabase.createClient(url,key,{auth:{storageKey,flowType:"pkce",detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
   // SIGNED_IN can repeat when the native camera returns or the tab regains focus.
   // Only a changed account (including sign-out) invalidates private share state.
   let observedUserId;
   client.auth.onAuthStateChange((_event,session)=>{
    const nextUserId=session?.user?.id||null;
    if(nextUserId===observedUserId)return;
    observedUserId=nextUserId;
    setTimeout(()=>window.dispatchEvent(new Event("lx-share-session-changed")),0);
   });
  }
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
  pendingPhone=null;
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

 // C06: fully staged Auth phone-change flow; hard-disabled until separate provider approval.
 const phoneOtp=Object.freeze({enabled:false,reason:"安全停用：測試專案 Twilio Verify 尚未授權啟用，未發送任何簡訊。",flow:"phone_change",country:"+886"});
 let pendingPhone=null;
 function normalizeTaiwanPhone(raw){
  if(typeof raw!=="string")throw Error("請輸入台灣手機號碼");
  const value=raw.trim().replace(/[ -]/g,"");
  if(/^09[0-9]{8}$/.test(value))return "+886"+value.slice(1);
  if(/^\+8869[0-9]{8}$/.test(value))return value;
  throw Error("手機格式不正確，請輸入 09 開頭的十碼手機號碼");
 }
 function validatePhoneToken(raw){
  if(typeof raw!=="string"||!/^\d{6}$/.test(raw.trim()))throw Error("請輸入六位數驗證碼");
  return raw.trim();
 }
 async function requestPhoneOtp(raw){
  if(!phoneOtp.enabled)throw Error(phoneOtp.reason);
  const session=await verifiedSession();if(!session)throw Error("請先使用 Google 登入");
  const phone=normalizeTaiwanPhone(raw),userId=session.user.id;
  if(session.user.phoneVerified&&session.user.phone===phone)throw Error("此手機已完成驗證");
  pendingPhone=null;
  const {error}=await getClient().auth.updateUser({phone});
  if(error)throw Error("發送驗證碼失敗，請稍後再試");
  const latest=await verifiedSession();
  if(!latest||latest.user.id!==userId)throw Error("會員身分發生變化，請重新登入");
  pendingPhone={phone,userId,createdAt:Date.now()};
  return {pending:true,phone};
 }
 async function verifyPhoneOtp(raw,token){
  if(!phoneOtp.enabled)throw Error(phoneOtp.reason);
  const session=await verifiedSession();if(!session)throw Error("請先使用 Google 登入");
  const phone=normalizeTaiwanPhone(raw),code=validatePhoneToken(token);
  if(!pendingPhone||pendingPhone.phone!==phone||pendingPhone.userId!==session.user.id||Date.now()-pendingPhone.createdAt>600000)throw Error("驗證要求不存在或已逾時，請重新發送");
  const originalId=session.user.id;
  const {error}=await getClient().auth.verifyOtp({phone,token:code,type:"phone_change"});
  if(error)throw Error("驗證碼錯誤或已過期");
  const latest=await verifiedSession();
  if(!latest||latest.user.id!==originalId||!latest.user.phoneVerified||latest.user.phone!==phone)throw Error("手機驗證結果與原會員不一致");
  pendingPhone=null;
  return {verified:true,phone,userId:originalId};
 }
 function cleanAddress(value,max){if(typeof value!=="string")throw Error("地址欄位格式不正確");const v=value.trim();if(Array.from(v).length>max||Array.from(v).some(ch=>{const n=ch.codePointAt(0);return n<32||n===127;}))throw Error("地址欄位含無效字元或過長");return v;}
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
  if(error)throw Error("後端拒絕寫入（代碼："+String(error.code||"unknown").slice(0,20)+"），請回報小P");
  if(!data||data.id!==session.user.id||Object.keys(payload).some(k=>data[k]!==payload[k]))throw Error("地址儲存驗證失敗");
  return data;
 }
 function registrationError(error){
  const reasons={REG_LOGIN_REQUIRED:"請先使用 Google 登入。",REG_PROFILE_REQUIRED:"尚未建立會員資料。",REG_LOCKED:"註冊尚未開放，請等待條款確認。",REG_EXPLICIT_CONSENT_REQUIRED:"請由本人確認會員條款與隱私權政策。",REG_LEGAL_VERSION_CHANGED:"文件版本已更新，請重新閱讀並確認。",REG_LEGAL_NOT_PUBLISHED:"文件尚未發布、已到期或已撤回。",REG_GOOGLE_REQUIRED:"請使用原 Google 會員帳號。",REG_PHONE_VERIFICATION_REQUIRED:"請先完成手機驗證。",REG_NAME_REQUIRED:"會員名稱須為 2～30 個字元。",REG_ADULT_VERIFICATION_REQUIRED:"請先完成出生日期及成年聲明。",REG_UNDERAGE_OR_INVALID_BIRTH:"出生日期不符合年滿18歲的資格。",REG_ADULT_DECLARATION_REQUIRED:"請確認成年聲明。",REG_ALREADY_COMPLETED:"此會員已完成註冊。"};
  return Error(reasons[error?.message]||"註冊操作未完成，請重新確認狀態後再試。");
 }
 async function saveAdultVerification(birthDate,declared){
  if(typeof birthDate!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)||declared!==true)throw Error("請填寫有效生日並確認成年聲明。");
  const before=await verifiedSession();if(!before)throw Error("請先使用 Google 登入。");
  const {data,error}=await getClient().rpc("lx_save_member_adult_verification",{p_birth_date:birthDate,p_adult_declared:true});
  if(error)throw registrationError(error);
  const after=await verifiedSession();
  if(!data?.adult_ready||!after||before.user.id!==after.user.id)throw Error("成年資格確認失敗，請重新登入。");
  return data;
 }
 async function getRegistrationStatus(){
  const session=await verifiedSession();if(!session)return null;
  const {data,error}=await getClient().rpc("lx_member_registration_status");
  if(error)throw registrationError(error);
  const latest=await verifiedSession();
  if(!data||data.user_id!==session.user.id||!latest||latest.user.id!==session.user.id)throw Error("會員身分已變更，請重新確認。");
  return {...data,masked_phone:latest.user.phoneVerified&&latest.user.phone?"09•••••"+latest.user.phone.slice(-3):""};
 }
 async function completeRegistration(legalVersion,termsAgreed,privacyAcknowledged){
  if(typeof legalVersion!=="string"||!legalVersion||termsAgreed!==true||privacyAcknowledged!==true)throw Error("請閱讀並確認會員條款與隱私權政策。");
  const before=await getRegistrationStatus();
  if(!before?.can_complete||before.legal?.version!==legalVersion)throw Error("註冊尚未開放或文件版本已更新，請重新確認。");
  const {data,error}=await getClient().rpc("lx_complete_member_registration",{p_legal_version:legalVersion,p_terms_agreed:true,p_privacy_acknowledged:true});
  if(error)throw registrationError(error);
  const latest=await verifiedSession();
  if(!data?.registered||data.user_id!==before.user_id||!latest||latest.user.id!==before.user_id)throw Error("註冊結果與原會員不一致，請重新確認。");
  return data;
 }
 const shareErrors={SHARE_SUBMISSION_LOCKED:"分享測試提交暫時關閉，請稍後重新讀取。",SHARE_VERSION_CHANGED:"協議版本已更新，請重新開啟文件閱讀確認。",SHARE_LEGAL_UNPUBLISHED:"分享測試協議尚未發布。",SHARE_EXPLICIT_CONSENT_REQUIRED:"請由本人閱讀並明確同意測試協議。",SHARE_CONSENT_REQUIRED:"請先閱讀並同意目前版本的測試協議。",SHARE_PLACEMENT_REQUIRED:"請先勾選已完成分享袋測試情境確認。",SHARE_DETAILS_REQUIRED:"請先儲存分享草稿。",SHARE_DETAILS_INCOMPLETE:"資料尚未齊全，請檢查照片、地址及衣物件數。",SHARE_RECEIPT_NOT_FOUND:"尚未找到提交回執，請重新讀取本人分享紀錄。",SHARE_MEMBER_DENIED:"此帳號尚未開放分享測試，請使用指定且已註冊的測試會員。",SHARE_ADDRESS_CHANGED:"會員地址已更新，請重新儲存草稿確認取件地址。",SHARE_ADDRESS_REQUIRED:"請先在會員中心儲存完整取件地址。",SHARE_PHOTO_INVALID:"照片尚未完成上傳或格式不符，請重新拍攝並儲存。",SHARE_DRAFT_DENIED:"找不到可編輯的本人草稿，請重新讀取。",SHARE_INVALID_NOTE:"放置說明限 200 字，請移除特殊控制字元。",SHARE_INVALID_COUNT:"衣物件數須為 2～1000 件整數。",SHARE_POINT_UNAVAILABLE:"集貨點目前無法使用，請改選取件地點。"};
 async function shareIdentity(expected){
  const session=await verifiedSession();
  if(!session||expected&&session.user.id!==expected)throw Error("登入身分已變更，請重新讀取分享資料。");
  return session.user.id;
 }
 async function shareRequest(action,payload={},expected){
  if(!["bootstrap","create","save","preflight","activate","submit","receipt"].includes(action))throw Error("分享操作未開放。");
  const id=await shareIdentity(expected);
  const {data,error}=await getClient().functions.invoke("share-test-api",{body:{action,payload}});
  await shareIdentity(id);
  if(error||data?.error){let code=data?.error;try{if(!code&&error?.context)code=(await error.context.json()).error;}catch(_){}
   throw Error(shareErrors[code]||"分享服務暫時無法使用，請重新讀取後再試。");}
  if(!data||!("data" in data))throw Error("分享服務回傳不完整。");
  return data.data;
 }
 function validSharePath(path,id){return typeof path==="string"&&new RegExp("^"+id+"/[0-9a-f-]{36}/[0-9]+-[a-z0-9]{1,8}\\.(jpg|png|webp)$").test(path);}
 async function shareUpload(path,blob,expected){
  const id=await shareIdentity(expected);
  if(!validSharePath(path,id)||!blob||blob.size<1||blob.size>100000||!["image/jpeg","image/png","image/webp"].includes(blob.type))throw Error("照片須為 100KB 以下的 JPG、PNG 或 WebP，請重新拍攝。");
  const r=await getClient().storage.from("share-placement-photos").upload(path,blob,{contentType:blob.type,upsert:false,cacheControl:"0"});
  await shareIdentity(id);if(r.error)throw Error("照片上傳失敗，草稿未送出，請稍後重試。");return path;
 }
 async function shareDownload(path,expected){
  const id=await shareIdentity(expected);if(!validSharePath(path,id))throw Error("照片不屬於目前會員。");
  const r=await getClient().storage.from("share-placement-photos").download(path);
  await shareIdentity(id);if(r.error||!r.data)throw Error("照片讀取失敗，請重新讀取或重新拍攝。");return r.data;
 }
 async function shareRemove(path,expected){
  const id=await shareIdentity(expected);if(!validSharePath(path,id))throw Error("照片不屬於目前會員。");
  const r=await getClient().storage.from("share-placement-photos").remove([path]);
  await shareIdentity(id);if(r.error)throw Error("未使用照片清理未完成。");
 }
 async function shareIsolationProbe(requestId,path){
  const id=await shareIdentity();if(!/^[0-9a-f-]{36}$/.test(requestId))throw Error("請輸入測試草稿識別碼。");
  const results=[];
  for(const table of ["lx_share_requests","lx_share_draft_details","lx_share_draft_placements"]){
   const col=table==="lx_share_requests"?"id":"request_id";
   const r=await getClient().from(table).select(col).eq(col,requestId);
   results.push({target:table,status:r.error?"ERROR":r.data?.length===0?"DENIED":"VISIBLE"});
  }
  const gateway=await getClient().rpc("lx_share_test_gateway",{p_actor:id,p_action:"bootstrap",p_payload:{}});
  results.push({target:"service-only RPC",status:gateway.error?.code==="42501"?"DENIED":"FAIL"});
  if(path){
   if(path.length>200||!new RegExp("^[0-9a-f-]{36}/"+requestId+"/[0-9]+-[a-z0-9]{1,8}\\.(jpg|png|webp)$").test(path))throw Error("測試照片路徑格式不正確。");
   const r=await getClient().storage.from("share-placement-photos").download(path);
   results.push({target:"private photo",status:r.data?"VISIBLE":r.error?.name==="StorageApiError"&&["400","403","404"].includes(String(r.error.status??r.error.statusCode))?"DENIED":"ERROR"});
  }
  await shareIdentity(id);return results;
 }
 Object.defineProperty(window,"LX_TEST_AUTH_ADAPTER",{value:Object.freeze({mode:"test-auth-only",contract,signInWithGoogle,handleCallback,getSession:verifiedSession,restoreSession:verifiedSession,signOut,getProfile,saveDisplayName,phoneOtp,normalizeTaiwanPhone,validatePhoneToken,requestPhoneOtp,verifyPhoneOtp,saveAddress,saveAdultVerification,getRegistrationStatus,completeRegistration,shareRequest,shareUpload,shareDownload,shareRemove,shareIsolationProbe}),writable:false,configurable:false});
})();

