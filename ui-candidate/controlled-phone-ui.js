"use strict";
(()=>{
 const api=window.LX_CONTROLLED_PHONE,$=id=>document.getElementById(id);
 let busy=false,checked=false;
 function say(message){$("status").textContent=message;}
 async function inspect(raw){
  const s=await api.inspect(raw);
  say("原 Google 會員核對成功\n帳號："+s.email+"\n會員 ID："+s.id+"\n手機："+(s.phoneVerified?"已驗證":s.hasPhone?"已有手機，請先回報":"尚未綁定")+"\n"+(api.sendEnabled?"受控發送已開放":"尚未開放發送，沒有發送簡訊。"));
  return s;
 }
 $("check").addEventListener("click",async()=>{
  if(busy)return;busy=true;$("check").disabled=true;checked=false;
  try{const s=await inspect($("phone").value);checked=true;
   $("consent").disabled=!api.sendEnabled||s.attempted||s.hasPhone;
   if(!api.sendEnabled)say($("status").textContent+"\n指定測試手機格式核對成功。");
  }catch(e){say(e.message);}finally{busy=false;$("check").disabled=false;}
 });
 $("phone").addEventListener("input",()=>{checked=false;$("send").disabled=true;$("consent").checked=false;$("consent").disabled=true;});
 $("consent").addEventListener("change",()=>{$("send").disabled=!api.sendEnabled||!checked||!$("consent").checked;});
 $("send").addEventListener("click",async()=>{
  if(busy||!api.sendEnabled||!checked)return;
  busy=true;$("send").disabled=true;$("phone").disabled=true;$("check").disabled=true;$("consent").disabled=true;
  try{await api.send($("phone").value,$("consent").checked);say("已提出一次發送要求。請查看手機簡訊；不會自動重送。");$("otp").disabled=false;$("verify").disabled=false;}
  catch(e){say(e.message);}finally{busy=false;}
 });
 $("verify").addEventListener("click",async()=>{
  if(busy||!api.sendEnabled)return;busy=true;$("verify").disabled=true;
  const token=$("otp").value;$("otp").value="";
  try{const r=await api.verify($("phone").value,token);say("手機綁定成功，原 Google 會員 ID 保持不變：\n"+r.id);$("otp").disabled=true;}
  catch(e){say(e.message);}finally{busy=false;}
 });
 if(!api){say("測試元件載入失敗，已停止。");return;}
 inspect().catch(e=>say(e.message));
})();