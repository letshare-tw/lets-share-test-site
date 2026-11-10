"use strict";
(()=>{
 const auth=window.LX_TEST_AUTH_ADAPTER,status=document.getElementById("authStatus"),login=document.getElementById("googleLogin"),logout=document.getElementById("googleLogout");
 const panel=document.createElement("section");panel.id="lxMemberProfile";panel.setAttribute("aria-label","會員基本資料");panel.hidden=true;
 panel.style.margin="18px 0";panel.style.padding="16px";panel.style.border="1px solid #e1e9e3";panel.style.borderRadius="14px";
 const heading=document.createElement("div");heading.style.display="flex";heading.style.alignItems="center";heading.style.gap="14px";
 const avatar=document.createElement("img");avatar.alt="Google 帳號頭像";avatar.width=64;avatar.height=64;avatar.referrerPolicy="no-referrer";avatar.style.cssText="width:64px;height:64px;border-radius:50%;object-fit:cover;display:none;background:#eef4ee";
 const fallback=document.createElement("span");fallback.textContent="👤";fallback.setAttribute("aria-label","預設會員頭像");fallback.style.cssText="display:flex;width:64px;height:64px;align-items:center;justify-content:center;border-radius:50%;background:#eef4ee;font-size:34px;flex-shrink:0";
 const identity=document.createElement("div");identity.style.minWidth="0";
 const name=document.createElement("p"),email=document.createElement("p"),registration=document.createElement("p"),feedback=document.createElement("p");
 name.style.margin="0 0 5px";email.style.cssText="margin:0;overflow-wrap:anywhere;font-size:14px";registration.style.margin="14px 0";feedback.style.cssText="font-size:14px;color:#a44";
 identity.append(name,email);heading.append(avatar,fallback,identity);
 const edit=document.createElement("div");edit.style.marginTop="14px";
 const label=document.createElement("label");label.textContent="編輯會員名稱（2～30 字元）";label.htmlFor="lxDisplayName";label.style.display="block";
 const input=document.createElement("input");input.id="lxDisplayName";input.type="text";input.maxLength=60;input.autocomplete="nickname";input.placeholder="請輸入會員名稱";input.style.cssText="display:block;box-sizing:border-box;width:100%;max-width:360px;padding:10px;margin:8px 0;border:1px solid #aeb9af;border-radius:8px;font-size:16px";
 const save=document.createElement("button");save.type="button";save.textContent="儲存名稱";save.style.cssText="background:#12834c;color:white;border:0;border-radius:8px;padding:10px 18px;font-size:16px";
 edit.append(label,input,save);panel.append(heading,registration,edit,feedback);status.insertAdjacentElement("afterend",panel);

 // Member contact/address panel. OTP intentionally disabled until SMS provider approval.
 const contact=document.createElement("section");contact.id="lxMemberContact";contact.hidden=true;contact.style.cssText="margin:16px 0;padding:16px;border:1px solid #e1e9e3;border-radius:14px";
 const h=document.createElement("h2");h.textContent="手機與取件地址";h.style.cssText="font-size:19px;margin:0 0 12px";
 const phoneState=document.createElement("p");phoneState.setAttribute("aria-live","polite");
 const phoneLabel=document.createElement("label");phoneLabel.textContent="手機號碼（台灣）";phoneLabel.htmlFor="lxPhone";
 const phoneInput=document.createElement("input");phoneInput.id="lxPhone";phoneInput.type="tel";phoneInput.autocomplete="tel";phoneInput.inputMode="tel";phoneInput.placeholder="09xxxxxxxx";phoneInput.maxLength=13;phoneInput.disabled=true;
 const otpButton=document.createElement("button");otpButton.type="button";otpButton.textContent="發送驗證碼（尚未啟用）";otpButton.disabled=true;
 const otpInput=document.createElement("input");otpInput.type="text";otpInput.inputMode="numeric";otpInput.placeholder="六位數驗證碼";otpInput.maxLength=6;otpInput.disabled=true;
 const otpVerify=document.createElement("button");otpVerify.type="button";otpVerify.textContent="驗證手機（尚未啟用）";otpVerify.disabled=true;
 const smsNotice=document.createElement("p");smsNotice.textContent="安全鎖定：測試專案 SMS 提供者尚未確認，不能寄送或驗證簡訊。";smsNotice.style.cssText="font-size:13px;color:#9b501b";
 const fields=[["address_city","縣市","例如：臺南市",20],["address_district","鄉鎮市區","例如：安南區",20],["address_street","街道門牌","路名、巷弄及門牌",120],["address_detail","樓層／補充地址","例如：3樓之2",120],["home_placement_note","衣物放置位置","例如：管理室旁指定置物架",200]];
 const inputs={};
 for(const [key,title,placeholder,max] of fields){
  const label=document.createElement("label");label.textContent=title;label.htmlFor="lx-"+key;
  const el=key==="home_placement_note"?document.createElement("textarea"):document.createElement("input");
  el.id="lx-"+key;el.placeholder=placeholder;el.maxLength=max;el.disabled=true;
  el.style.cssText="display:block;box-sizing:border-box;width:100%;max-width:420px;padding:10px;margin:6px 0 12px;border:1px solid #aeb9af;border-radius:8px;font-size:16px";
  inputs[key]=el;contact.append(label,el);
 }
 const addressSave=document.createElement("button");addressSave.type="button";addressSave.textContent="儲存取件地址";addressSave.disabled=true;addressSave.style.cssText="background:#12834c;color:white;border:0;border-radius:8px;padding:11px 18px;font-size:16px";
 const addressFeedback=document.createElement("p");addressFeedback.setAttribute("role","status");addressFeedback.style.cssText="font-size:14px;color:#366b4b";
 const phoneBox=document.createElement("div");phoneBox.style.cssText="display:grid;gap:8px;margin-bottom:20px";
 for(const e of [phoneLabel,phoneInput,phoneState,otpButton,otpInput,otpVerify,smsNotice])phoneBox.append(e);
 contact.prepend(h,phoneBox);contact.append(addressSave,addressFeedback);panel.insertAdjacentElement("afterend",contact);
 function clearContact(){contact.hidden=true;phoneState.textContent="";phoneInput.value="";addressFeedback.textContent="";for(const el of Object.values(inputs)){el.value="";el.disabled=true;}addressSave.disabled=true;}
 function paintContact(session,profile){
  contact.hidden=false;phoneInput.value=session.user.phone||"";
  phoneState.textContent=session.user.phoneVerified&&session.user.phone?"手機已驗證："+session.user.phone:"手機尚未驗證";
  if(profile){for(const key of Object.keys(inputs))inputs[key].value=profile[key]||"";for(const el of Object.values(inputs))el.disabled=false;addressSave.disabled=false;}
  else{addressFeedback.textContent="尚未建立會員資料，地址暫時無法儲存。";}
 }
 addressSave.addEventListener("click",async()=>{
  if(busy||!profileExists||!activeUserId)return;
  const values=Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value]));
  if(!values.address_city.trim()||!values.address_district.trim()||!values.address_street.trim()){addressFeedback.textContent="請填寫縣市、行政區及街道門牌。";return;}
  const token=version,userId=activeUserId;busy=true;addressSave.disabled=true;logout.disabled=true;addressFeedback.textContent="儲存中…";
  try{
   await auth.saveAddress(values);
   if(token!==version||userId!==activeUserId)return;
   const latest=await auth.getProfile();
   if(token!==version||userId!==activeUserId)return;
   if(!latest||Object.keys(values).some(k=>latest[k]!==values[k].trim()))throw Error("重新讀取驗證失敗");
   for(const k of Object.keys(inputs))inputs[k].value=latest[k]||"";
   addressFeedback.textContent="取件地址已儲存，重新讀取驗證成功。";
  }catch(_){if(token===version)addressFeedback.textContent="地址儲存失敗或驗證未完成，請檢查內容後重試。";}
  finally{busy=false;if(token===version){addressSave.disabled=false;logout.disabled=false;}}
 });

 let busy=false,version=0,activeUserId="",profileExists=false;
 function reset(){clearContact();version++;activeUserId="";profileExists=false;panel.hidden=true;avatar.removeAttribute("src");avatar.style.display="none";fallback.style.display="flex";name.textContent=email.textContent=registration.textContent=feedback.textContent="";input.value="";input.disabled=save.disabled=true;}
 function showAvatar(url){avatar.removeAttribute("src");avatar.style.display="none";fallback.style.display="flex";if(!url)return;avatar.onload=()=>{avatar.style.display="block";fallback.style.display="none";};avatar.onerror=()=>{avatar.style.display="none";fallback.style.display="flex";};avatar.src=url;}
 function paint(session){
  status.textContent=session?"已登入測試帳號："+session.user.email:"尚未登入測試帳號";
  login.hidden=!!session;logout.hidden=!session;reset();
  if(session){activeUserId=session.user.id;panel.hidden=false;showAvatar(session.user.avatarUrl);loadProfile(session,version);}
 }
 async function loadProfile(session,token){
  name.textContent="會員名稱：讀取中…";email.textContent="電子郵件："+session.user.email;registration.textContent="註冊狀態：確認中…";
  try{
   const profile=await auth.getProfile();if(token!==version||activeUserId!==session.user.id)return;
   profileExists=!!profile;
   if(!profile){paintContact(session,null);name.textContent="會員名稱："+(session.user.googleName||"尚未設定");registration.textContent="註冊狀態：尚未建立會員資料";feedback.textContent="尚未建立會員資料，暫時無法儲存名稱。";return;}
   paintContact(session,profile);
   name.textContent="會員名稱："+(profile.display_name?.trim()||session.user.googleName||"尚未設定");
   input.value=profile.display_name||"";input.disabled=save.disabled=false;
   registration.textContent="註冊狀態："+(profile.registration_completed_at?"已完成":"尚未完成");
  }catch(_){if(token!==version)return;name.textContent="會員名稱：暫無法取得";registration.textContent="註冊狀態：暫無法確認";feedback.textContent="會員資料讀取失敗，請稍後重新整理。";}
 }
 async function action(task){if(busy)return;busy=true;login.disabled=logout.disabled=true;try{await task();}catch(_){status.textContent="登入操作未完成，請檢查網路後重試。";}finally{busy=false;login.disabled=logout.disabled=false;}}
 save.addEventListener("click",async()=>{
  if(busy||!profileExists||!activeUserId)return;
  const value=input.value.trim(),length=Array.from(value).length;
  if(length<2||length>30){feedback.textContent="會員名稱須為 2～30 個字元，不能只輸入空白。";return;}
  busy=true;save.disabled=input.disabled=logout.disabled=true;feedback.textContent="儲存中…";
  const token=version,userId=activeUserId;
  try{
   await auth.saveDisplayName(value);
   if(token!==version||userId!==activeUserId)return;
   const profile=await auth.getProfile();
   if(token!==version||userId!==activeUserId)return;
   if(!profile||profile.display_name!==value)throw Error("重新讀取驗證失敗");
   name.textContent="會員名稱："+profile.display_name;input.value=profile.display_name;feedback.textContent="會員名稱已儲存。";
  }catch(_){if(token===version)feedback.textContent="儲存失敗或驗證未完成，請稍後重試。";}
  finally{busy=false;if(token===version){save.disabled=input.disabled=false;logout.disabled=false;}}
 });
 login.addEventListener("click",()=>action(()=>auth.signInWithGoogle()));
 logout.addEventListener("click",()=>action(async()=>{reset();await auth.signOut();paint(null);}));
 action(async()=>paint(await auth.restoreSession()));
})();
