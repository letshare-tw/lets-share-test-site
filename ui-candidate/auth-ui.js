"use strict";
(()=>{
 const auth=window.LX_TEST_AUTH_ADAPTER,status=document.getElementById("authStatus"),login=document.getElementById("googleLogin"),logout=document.getElementById("googleLogout");
 const panel=document.createElement("section");
 panel.id="lxMemberProfile";panel.setAttribute("aria-label","會員基本資料");panel.hidden=true;
 const name=document.createElement("p"),email=document.createElement("p"),registration=document.createElement("p"),feedback=document.createElement("p");
 panel.append(name,email,registration,feedback);status.insertAdjacentElement("afterend",panel);
 let busy=false,version=0;
 function reset(){version++;panel.hidden=true;name.textContent=email.textContent=registration.textContent=feedback.textContent="";}
 function paint(session){
  status.textContent=session?"已登入測試帳號："+session.user.email:"尚未登入測試帳號";
  login.hidden=!!session;logout.hidden=!session;
  reset();if(session)loadProfile(session,version);
 }
 async function loadProfile(session,token){
  panel.hidden=false;
  name.textContent="會員名稱：讀取中…";email.textContent="電子郵件："+session.user.email;
  registration.textContent="註冊狀態：確認中…";
  try{
   const profile=await auth.getProfile();if(token!==version)return;
   if(!profile){name.textContent="會員名稱：尚未設定";registration.textContent="註冊狀態：尚未建立會員資料";return;}
   name.textContent="會員名稱："+(profile.display_name||profile.full_name||"尚未設定");
   registration.textContent="註冊狀態："+(profile.registration_completed_at?"已完成":"尚未完成");
  }catch(_){if(token!==version)return;name.textContent="會員名稱：暫無法取得";registration.textContent="註冊狀態：暫無法確認";feedback.textContent="會員資料讀取失敗，請稍後重新整理。";}
 }
 async function action(task){if(busy)return;busy=true;login.disabled=logout.disabled=true;try{await task();}catch(_){status.textContent="登入操作未完成，請檢查網路後重試。";}finally{busy=false;login.disabled=logout.disabled=false;}}
 login.addEventListener("click",()=>action(()=>auth.signInWithGoogle()));
 logout.addEventListener("click",()=>action(async()=>{reset();await auth.signOut();paint(null);}));
 action(async()=>paint(await auth.restoreSession()));
})();
