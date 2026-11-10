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
 let busy=false,version=0,activeUserId="",profileExists=false;
 function reset(){version++;activeUserId="";profileExists=false;panel.hidden=true;avatar.removeAttribute("src");avatar.style.display="none";fallback.style.display="flex";name.textContent=email.textContent=registration.textContent=feedback.textContent="";input.value="";input.disabled=save.disabled=true;}
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
   if(!profile){name.textContent="會員名稱：尚未設定";registration.textContent="註冊狀態：尚未建立會員資料";feedback.textContent="尚未建立會員資料，暫時無法儲存名稱。";return;}
   name.textContent="會員名稱："+(profile.display_name||profile.full_name||"尚未設定");
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
