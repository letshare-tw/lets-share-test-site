"use strict";
/* REG-01: basic registration only; no SMS and no sharing activation. */
(()=>{
 const auth=window.LX_TEST_AUTH_ADAPTER,anchor=document.getElementById("lxMemberProfile");
 if(!auth||!anchor)return;
 const card=document.createElement("section");card.id="lxRegistrationCard";card.hidden=true;
 card.setAttribute("aria-label","完成會員註冊");
 card.style.cssText="margin:18px 0;padding:20px;border:1px solid #cfe1d4;border-radius:16px;background:#f5faf6";
 const title=document.createElement("h2");title.textContent="完成會員註冊";title.style.cssText="font-size:22px;margin:0 0 12px";
 const summary=document.createElement("p");summary.setAttribute("role","status");summary.setAttribute("aria-live","polite");
 const checklist=document.createElement("ul");checklist.style.cssText="padding-left:24px;line-height:1.9";
 const editName=document.createElement("button");editName.type="button";editName.textContent="修改會員名稱";
 editName.style.cssText="border:0;background:transparent;color:#087d43;text-decoration:underline;padding:10px 0;font-size:16px";
 editName.addEventListener("click",()=>document.getElementById("lxDisplayName")?.focus());
 const documents=document.createElement("div");documents.style.cssText="display:flex;flex-wrap:wrap;gap:12px";
 const termsButton=document.createElement("button"),privacyButton=document.createElement("button");
 for(const button of [termsButton,privacyButton]){button.type="button";button.disabled=true;button.style.cssText="background:white;color:#087d43;border:1px solid #b9cfbf;border-radius:8px;padding:12px;font-size:16px;min-height:48px";}
 termsButton.textContent="閱讀會員條款";privacyButton.textContent="閱讀隱私權政策";documents.append(termsButton,privacyButton);
 function consent(text,id){
  const label=document.createElement("label");label.style.cssText="display:flex;gap:10px;align-items:flex-start;margin:16px 0;font-size:16px";
  const input=document.createElement("input");input.type="checkbox";input.id=id;input.checked=false;input.disabled=true;input.style.cssText="width:22px;height:22px;flex-shrink:0";
  const span=document.createElement("span");span.textContent=text;label.append(input,span);return {label,input};
 }
 const terms=consent("我已閱讀並同意會員條款","lxRegTermsAgree");
 const privacy=consent("我已閱讀並知悉隱私權政策","lxRegPrivacyAck");
 const submit=document.createElement("button");submit.id="lxCompleteRegistration";submit.type="button";submit.disabled=true;submit.textContent="完成註冊（條款確認中）";
 submit.style.cssText="display:block;width:100%;padding:14px;border:0;border-radius:10px;background:#12834c;color:white;font-size:18px;min-height:52px";
 const note=document.createElement("p");note.textContent="真實姓名與地址於使用相關服務時補填；已填資料會保留。分享服務須另外啟用。";note.style.cssText="font-size:14px;color:#526457";
 const refreshButton=document.createElement("button");refreshButton.type="button";refreshButton.textContent="重新確認註冊狀態";refreshButton.style.cssText="border:0;background:transparent;color:#087d43;text-decoration:underline;padding:10px 0;font-size:16px";
 const dialog=document.createElement("dialog");dialog.setAttribute("aria-label","會員文件全文");dialog.style.cssText="box-sizing:border-box;width:min(94vw,680px);max-height:85vh;border:0;border-radius:16px;padding:22px";
 const dialogTitle=document.createElement("h2"),dialogText=document.createElement("div"),close=document.createElement("button");
 dialogText.style.cssText="white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.8";close.type="button";close.textContent="關閉文件";close.style.cssText="padding:12px 18px;margin-top:16px;font-size:16px";close.addEventListener("click",()=>dialog.close());
 dialog.append(dialogTitle,dialogText,close);
 card.append(title,summary,checklist,editName,documents,terms.label,privacy.label,submit,note,refreshButton,dialog);
 anchor.insertAdjacentElement("beforebegin",card);
 let state=null,revision=0,busy=false;
 function lock(){
  if(dialog.open)dialog.close();
  terms.input.checked=privacy.input.checked=false;
  terms.input.disabled=privacy.input.disabled=submit.disabled=termsButton.disabled=privacyButton.disabled=true;
  submit.style.opacity=".55";
 }
 function updateButton(){
  submit.disabled=busy||!state?.can_complete||state.registered||!terms.input.checked||!privacy.input.checked;
  submit.style.opacity=submit.disabled?".55":"1";
 }
 function row(text,ready){const li=document.createElement("li");li.textContent=(ready?"✓ ":"待完成：")+text;checklist.append(li);}
 function paint(data){
  state=data;checklist.replaceChildren();
  row("Google 帳號",data.google_verified);row("會員名稱（2～30 字）",data.name_ready);row(data.phone_verified&&data.masked_phone?"手機驗證（"+data.masked_phone+"）":"手機驗證",data.phone_verified);
  row("會員條款與隱私權政策發布",data.legal_ready);
  const open=data.registration_enabled&&data.legal_ready;
  termsButton.disabled=privacyButton.disabled=!data.legal_ready;
  terms.input.disabled=privacy.input.disabled=!open||data.registered;
  if(data.registered){summary.textContent="會員註冊已完成。";submit.textContent="註冊已完成";terms.input.checked=privacy.input.checked=false;}
  else if(!open){summary.textContent="帳號資料已讀取。會員條款與隱私權政策確認中，暫時無法完成註冊。";submit.textContent="完成註冊（尚未開放）";}
  else{summary.textContent="請確認必要資料，閱讀文件後由本人勾選。";submit.textContent="完成註冊";}
  updateButton();
 }
 async function refresh(){
  const current=++revision;lock();state=null;
  try{
   const data=await auth.getRegistrationStatus();if(current!==revision)return;
   if(!data){card.hidden=true;return;}
   card.hidden=false;paint(data);
  }catch(_){if(current!==revision)return;card.hidden=false;checklist.replaceChildren();summary.textContent="暫時無法確認註冊狀態，請稍後重新確認。";submit.textContent="完成註冊（暫不可用）";}
 }
 function openDocument(kind){
  if(!state?.legal_ready||!state.legal)return;
  dialogTitle.textContent=(kind==="terms"?"會員條款":"隱私權政策")+"｜"+state.legal.version;
  dialogText.textContent=kind==="terms"?state.legal.terms_text:state.legal.privacy_text;
  dialog.showModal();
 }
 termsButton.addEventListener("click",()=>openDocument("terms"));privacyButton.addEventListener("click",()=>openDocument("privacy"));
 terms.input.addEventListener("change",updateButton);privacy.input.addEventListener("change",updateButton);
 refreshButton.addEventListener("click",()=>{if(!busy)refresh();});
 window.addEventListener("lx-member-state-changed",()=>{busy=false;refresh();});
 submit.addEventListener("click",async()=>{
  if(submit.disabled||busy||!state?.legal)return;
  busy=true;const current=revision,version=state.legal.version;updateButton();refreshButton.disabled=true;
  summary.textContent="正在確認註冊資料…";
  try{
   await auth.completeRegistration(version,terms.input.checked,privacy.input.checked);
   if(current!==revision)return;
   await refresh();
   const profile=await auth.getProfile();
   if(current+1!==revision||!state?.registered)return;
   // Reflect the server-confirmed timestamp in the existing member section.
   const profilePanel=document.getElementById("lxMemberProfile");
   for(const p of profilePanel.querySelectorAll("p"))if(p.textContent.startsWith("註冊狀態："))p.textContent="註冊狀態："+(profile?.registration_completed_at?"已完成":"尚未完成");
  }catch(error){
   if(current!==revision)return;
   lock();state=null;summary.textContent=error.message||"註冊未完成，請重新確認狀態後再試。";
  }finally{busy=false;refreshButton.disabled=false;updateButton();}
 });
 refresh();
})();

