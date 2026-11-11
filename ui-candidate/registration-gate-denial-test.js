"use strict";
(()=>{
 const auth=window.LX_TEST_AUTH_ADAPTER,host=document.getElementById("view-member");
 if(!auth||!host||!window.supabase?.createClient)return;
 const allowed=new Set(["3cdabed1-9517-412c-9b3e-6b2adf072a59","a8d732b5-886e-4d56-865d-0ae251d31384","fde806fd-659d-4456-940b-0dc46fdf398e"]);
 const project="rfwqcrvxyjhtmafnbuyy";
 const client=window.supabase.createClient("https://"+project+".supabase.co","sb_publishable_0TIzPc-ys9IDUz44Ci3a4w_rGwpqPoa",{auth:{storageKey:"lx-test-"+project+"-auth",flowType:"pkce",detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
 // REG-TEST-ACCOUNTS-01: one-time gate denial test retired; do not call registration RPC.\n return;\n const panel=document.createElement("section");panel.id="lxRegistrationGateDenialTest";panel.style.cssText="margin:16px 0;padding:16px;border:1px solid #c4dccb;border-radius:14px;background:#f7fbf8";
 const heading=document.createElement("h2");heading.textContent="REG-COMPLETE-09-E-06A｜註冊安全鎖拒絕驗收";heading.style.cssText="font-size:17px;margin:0 0 8px";
 const note=document.createElement("p");note.textContent="僅限三個指定 Google 測試帳號。先向測試資料庫確認安全鎖關閉，再以「不同意條款」參數呼叫註冊 RPC；即使鎖狀態改變，也不會完成註冊。不顯示 JWT 或會員個資。";note.style.cssText="font-size:13px";
 const btn=document.createElement("button");btn.type="button";btn.textContent="驗證安全鎖拒絕（不會完成註冊）";btn.style.cssText="background:#12834c;color:#fff;border:0;border-radius:8px;padding:12px 15px;font-size:15px";
 const output=document.createElement("pre");output.style.cssText="white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.8 system-ui,sans-serif";
 panel.append(heading,note,btn,output);(host.querySelector(".section")||host).append(panel);
 let seq=0;
 btn.addEventListener("click",async()=>{
  const ticket=++seq;btn.disabled=true;output.textContent="驗證中…";
  const stop=(msg)=>{if(ticket===seq)output.textContent=msg;};
  try{
   const before=await auth.getSession(),uid=before?.user?.id;
   if(!uid||!allowed.has(uid)){stop("STOP：未登入指定測試帳號。沒有呼叫註冊 RPC。");return;}
   const check=await client.auth.getUser();
   if(check.error||check.data?.user?.id!==uid){stop("STOP：Google Session 無法確認。沒有呼叫註冊 RPC。");return;}
   const initial=await client.rpc("lx_member_registration_status");
   if(initial.error||initial.data?.user_id!==uid){stop("STOP：本人註冊狀態無法確認。沒有呼叫註冊 RPC。");return;}
   if(initial.data.registered===true){stop("STOP：此帳號已完成註冊。沒有呼叫註冊 RPC。");return;}
   const gate=await client.rpc("lx_registration_gate_closed_for_test");
   if(gate.error||gate.data!==true){stop("STOP：無法證明安全鎖關閉。沒有呼叫註冊 RPC。");return;}
   const recheck=await auth.getSession();
   if(recheck?.user?.id!==uid){stop("STOP：Session 已變更。沒有呼叫註冊 RPC。");return;}
   // Safety invariant: explicit consent flags are FALSE; this test can NEVER satisfy registration.
   const attempt=await client.rpc("lx_complete_member_registration",{p_legal_version:"REG-TEST-V1",p_terms_agreed:false,p_privacy_acknowledged:false});
   const code=String(attempt.error?.message||"").trim();
   const final=await client.rpc("lx_member_registration_status");
   const end=await auth.getSession();
   const unchanged=!final.error&&final.data?.user_id===uid&&final.data?.registered===false&&end?.user?.id===uid;
   const denied=!!attempt.error&&code==="REG_ONCE_GATE_LOCKED"&&!attempt.data;
   stop("安全鎖狀態：PASS（呼叫前確認關閉）\n公開註冊 RPC 拒絕："+(denied?"PASS（REG_ONCE_GATE_LOCKED）":"FAIL／未確認（"+(attempt.error?"非預期錯誤":"未被拒絕")+"）")+"\n本人註冊狀態："+(unchanged?"PASS（仍未註冊）":"FAIL／未確認")+"\n整體："+(denied&&unchanged?"PASS":"FAIL／未完全驗證")+"\n本測試從未傳送同意條款=true。");
  }catch(_){stop("FAIL／未完全驗證：安全驗收中斷，沒有宣告 PASS。");}
  finally{if(ticket===seq)btn.disabled=false;}
 });
 window.addEventListener("lx-member-state-changed",()=>{++seq;output.textContent="登入狀態已變更，請重新執行。";btn.disabled=false;});
})();
