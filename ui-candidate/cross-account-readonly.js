"use strict";
(()=>{
 const auth=window.LX_TEST_AUTH_ADAPTER;
 const host=document.getElementById("view-member");
 if(!auth||!host||!window.supabase?.createClient)return;
 const refs=Object.freeze(["3cdabed1-9517-412c-9b3e-6b2adf072a59","a8d732b5-886e-4d56-865d-0ae251d31384","fde806fd-659d-4456-940b-0dc46fdf398e"]);
 const project="rfwqcrvxyjhtmafnbuyy";
 const key="sb_publishable_0TIzPc-ys9IDUz44Ci3a4w_rGwpqPoa";
 const client=window.supabase.createClient("https://"+project+".supabase.co",key,{auth:{storageKey:"lx-test-"+project+"-auth",flowType:"pkce",detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
 const panel=document.createElement("section");panel.id="lxCrossAccountReadOnly";panel.style.cssText="margin:16px 0;padding:16px;border:1px solid #c4dccb;border-radius:14px;background:#f7fbf8";
 const heading=document.createElement("h2");heading.textContent="REG-TEST-EXEMPT-05-A-03｜跨帳號唯讀隔離驗收";heading.style.cssText="font-size:17px;margin:0 0 8px";
 const note=document.createElement("p");note.textContent="使用目前登入的 Google Session，只查詢其他指定測試帳號的識別欄位。不顯示 UUID、個資或登入憑證；不修改任何資料。";note.style.cssText="font-size:13px";
 const btn=document.createElement("button");btn.type="button";btn.textContent="執行跨帳號唯讀驗收";btn.style.cssText="background:#12834c;color:#fff;border:0;border-radius:8px;padding:12px 15px;font-size:15px";
 const output=document.createElement("pre");output.style.cssText="white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.8 system-ui,sans-serif";
 panel.append(heading,note,btn,output);host.querySelector(".section")?.append(panel);
 let seq=0;
 const fail=(name,reason)=>name+"：FAIL（"+reason+"）";
 btn.addEventListener("click",async()=>{
  const token=++seq;btn.disabled=true;output.textContent="驗證中…";
  const results=[];
  try{
   const before=await auth.getSession();
   if(!before?.user?.id){output.textContent="未登入：不執行查詢";return;}
   const mine=before.user.id;
   if(!refs.includes(mine)){output.textContent="非指定測試帳號：不執行查詢";return;}
   const check=await client.auth.getUser();
   if(check.error||check.data?.user?.id!==mine){output.textContent="Session 驗證失敗：未執行查詢";return;}
   const others=refs.filter(id=>id!==mine);
   for(let i=0;i<others.length;i++){
    const target=others[i],label="目標 "+(i+1);
    for(const [table,col] of [["profiles","id"],["lx_member_registration_consents","user_id"]]){
     const r=await client.from(table).select(col).eq(col,target).limit(1);
     const name=label+" "+table;
     if(r.error)results.push(fail(name,"查詢錯誤 "+String(r.error.code||"unknown").slice(0,18)));
     else if(!Array.isArray(r.data))results.push(fail(name,"無法確認回傳"));
     else results.push(name+"："+(r.data.length===0?"PASS（0 筆）":"FAIL（讀到非本人資料）"));
    }
   }
   const rpc=await client.rpc("lx_member_registration_status");
   if(rpc.error)results.push(fail("本人註冊 RPC","請求錯誤"));
   else results.push("本人註冊 RPC："+(rpc.data?.user_id===mine?"PASS":"FAIL（身分不一致）"));
   const after=await auth.getSession();
   if(!after?.user?.id||after.user.id!==mine)results.push(fail("Session 前後一致","登入身分改變"));
   else results.push("Session 前後一致：PASS");
   if(token===seq)output.textContent="驗收完成（僅顯示狀態，不顯示任何會員資料）\n"+results.join("\n")+"\n整體："+(results.length===6&&results.every(v=>v.includes("：PASS"))?"PASS":"FAIL／未完全驗證");
  }catch(_){if(token===seq)output.textContent="驗收中斷：未完全驗證。請重新登入後再試。";}
  finally{if(token===seq)btn.disabled=false;}
 });
 window.addEventListener("lx-member-state-changed",()=>{++seq;output.textContent="登入狀態已變更，請重新執行驗收。";btn.disabled=false;});
})();
