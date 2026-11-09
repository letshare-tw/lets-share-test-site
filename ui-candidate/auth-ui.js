"use strict";
(()=>{
 const auth=window.LX_TEST_AUTH_ADAPTER,status=document.getElementById("authStatus"),login=document.getElementById("googleLogin"),logout=document.getElementById("googleLogout");
 let busy=false;
 function paint(session){status.textContent=session?"已登入測試帳號："+session.user.email:"尚未登入測試帳號";login.hidden=!!session;logout.hidden=!session;}
 async function action(task){if(busy)return;busy=true;login.disabled=logout.disabled=true;try{await task();}catch(_){status.textContent="登入操作未完成，請檢查網路後重試。";}finally{busy=false;login.disabled=logout.disabled=false;}}
 login.addEventListener("click",()=>action(()=>auth.signInWithGoogle()));
 logout.addEventListener("click",()=>action(async()=>{await auth.signOut();paint(null);}));
 action(async()=>paint(await auth.restoreSession()));
})();
