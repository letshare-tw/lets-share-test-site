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
 const adultBox=document.createElement("div");adultBox.style.cssText="margin:14px 0;padding:12px;border:1px solid #d3e4d7;border-radius:10px";
 const dobLabel=document.createElement("label");dobLabel.textContent="出生年月日（年滿18歲）";dobLabel.htmlFor="lxRegBirthDate";
 const dob=document.createElement("input");dob.id="lxRegBirthDate";dob.type="hidden";dob.value="";
 const wheel=document.createElement("div");wheel.id="lxBirthWheel";wheel.setAttribute("role","group");wheel.setAttribute("aria-label","出生年月日三欄滾輪");wheel.style.cssText="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-width:360px;margin:12px 0;position:relative";
 const wheelColumns=[],wheelSelections={year:null,month:null,day:null},wheelHeight=44;
 const wheelData={year:Array.from({length:new Date().getFullYear()-1899},(_,i)=>new Date().getFullYear()-i),month:Array.from({length:12},(_,i)=>i+1),day:[]};
 function daysInMonth(){return new Date(wheelSelections.year||2000,wheelSelections.month||1,0).getDate();}
 function syncBirth(){const {year,month,day}=wheelSelections;dob.value=year&&month&&day?String(year).padStart(4,"0")+"-"+String(month).padStart(2,"0")+"-"+String(day).padStart(2,"0"):"";}
 function populateWheel(kind){
  const column=wheelColumns.find(c=>c.kind===kind);if(!column)return;
  const values=kind==="day"?Array.from({length:daysInMonth()},(_,i)=>i+1):wheelData[kind];
  column.track.replaceChildren();column.values=values;
  for(const value of values){const option=document.createElement("button");option.type="button";option.textContent=String(value).padStart(kind==="year"?4:2,"0");option.setAttribute("aria-label",kind+" "+value);option.style.cssText="display:block;box-sizing:border-box;width:100%;height:44px;border:0;background:transparent;color:#263d2e;font-size:21px;font-weight:500;scroll-snap-align:center;flex:none";option.addEventListener("click",()=>chooseWheel(kind,value,true));column.track.append(option);}
  if(wheelSelections[kind]!==null){const index=values.indexOf(wheelSelections[kind]);if(index>=0)column.track.scrollTop=index*wheelHeight;}
 }
 function chooseWheel(kind,value,scroll){
  if(dob.disabled)return;
  wheelSelections[kind]=value;
  if(kind!=="day"&&wheelSelections.day>daysInMonth()){wheelSelections.day=daysInMonth();populateWheel("day");}
  syncBirth();const column=wheelColumns.find(c=>c.kind===kind);
  if(scroll&&column){const index=column.values.indexOf(value);if(index>=0)column.track.scrollTop=index*wheelHeight;}
  for(const c of wheelColumns){const selected=wheelSelections[c.kind];for(const child of c.track.children)child.setAttribute("aria-pressed",String(Number(child.textContent)===selected));}
 }
 for(const [kind,label] of [["year","年"],["month","月"],["day","日"]]){
  const column=document.createElement("div");column.style.cssText="min-width:0;text-align:center";
  const heading=document.createElement("div");heading.textContent=label;heading.style.cssText="font-size:14px;color:#526457;margin-bottom:5px";
  const track=document.createElement("div");track.id="lxBirthWheel-"+kind;track.setAttribute("aria-label",label+"，上下滑動選擇");track.style.cssText="height:220px;overflow-y:auto;overscroll-behavior:contain;scroll-snap-type:y mandatory;scrollbar-width:none;padding:88px 0;box-sizing:border-box;border:1px solid #cfe1d4;border-radius:12px;background:linear-gradient(#f5faf6,#fff 36%,#fff 64%,#f5faf6)";
  const entry={kind,track,values:[]};wheelColumns.push(entry);column.append(heading,track);wheel.append(column);
  track.addEventListener("scroll",()=>{if(dob.disabled)return;const index=Math.max(0,Math.min(entry.values.length-1,Math.round(track.scrollTop/wheelHeight)));const value=entry.values[index];if(value!==undefined&&wheelSelections[kind]!==value)chooseWheel(kind,value,false);});
 }
 const wheelHint=document.createElement("p");wheelHint.textContent="上下滑動年、月、日，中央位置為選取值";wheelHint.style.cssText="font-size:13px;color:#526457;margin:4px 0";
 for(const kind of ["year","month","day"])populateWheel(kind);
 function resetWheel(){for(const kind of ["year","month","day"])wheelSelections[kind]=null;dob.value="";for(const c of wheelColumns)c.track.scrollTop=0;}
 function setWheelDisabled(disabled){dob.disabled=disabled;wheel.style.opacity=disabled?".55":"1";for(const c of wheelColumns){c.track.style.pointerEvents=disabled?"none":"auto";for(const option of c.track.children)option.disabled=disabled;}}

 const adultLabel=document.createElement("label");adultLabel.style.cssText="display:flex;gap:10px;align-items:center";
 const adultCheck=document.createElement("input");adultCheck.type="checkbox";adultCheck.id="lxRegAdultDeclare";adultCheck.checked=false;
 const adultText=document.createElement("span");adultText.textContent="我確認本人已年滿18歲，且出生日期填寫屬實。";adultLabel.append(adultCheck,adultText);
 const adultSave=document.createElement("button");adultSave.type="button";adultSave.id="lxRegSaveAdult";adultSave.textContent="確認成年資格";adultSave.style.cssText="display:block;margin:12px 0;padding:12px;background:#12834c;color:white;border:0;border-radius:8px";
 const adultFeedback=document.createElement("p");adultFeedback.setAttribute("role","status");
 adultBox.append(dobLabel,wheel,wheelHint,dob,adultLabel,adultSave,adultFeedback);
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
 card.append(title,summary,checklist,editName,adultBox,documents,terms.label,privacy.label,submit,note,refreshButton,dialog);
 anchor.insertAdjacentElement("beforebegin",card);
 let state=null,revision=0,busy=false;
 function lock(){
  if(dialog.open)dialog.close();
  terms.input.checked=privacy.input.checked=false;adultCheck.checked=false;resetWheel();adultFeedback.textContent="";
  terms.input.disabled=privacy.input.disabled=submit.disabled=termsButton.disabled=privacyButton.disabled=true;
  submit.style.opacity=".55";
 }
 function updateButton(){
  submit.disabled=busy||!state?.adult_ready||!state?.can_complete||state.registered||!terms.input.checked||!privacy.input.checked;
  submit.style.opacity=submit.disabled?".55":"1";
 }
 function row(text,ready){const li=document.createElement("li");li.textContent=(ready?"✓ ":"待完成：")+text;checklist.append(li);}
 function paint(data){
  state=data;checklist.replaceChildren();
  row("Google 帳號",data.google_verified);row("會員名稱（2～30 字）",data.name_ready);row(data.phone_verified&&data.masked_phone?"手機驗證（"+data.masked_phone+"）":"手機驗證",data.phone_verified);
  row("出生日期與年滿18歲聲明",!!data.adult_ready);row("會員條款與隱私權政策發布",data.legal_ready);
  const open=data.registration_enabled&&data.legal_ready;
  termsButton.disabled=privacyButton.disabled=!data.legal_ready;adultSave.disabled=busy||!!data.registered||!open;setWheelDisabled(!!data.registered||!open);adultCheck.disabled=!!data.registered||!open;
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
 adultSave.addEventListener("click",async()=>{
  if(busy||!state||state.registered||!state.registration_enabled||!state.legal_ready)return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dob.value)||!adultCheck.checked){adultFeedback.textContent="請填寫生日並勾選成年聲明。";return;}
  const [y,m,d]=dob.value.split("-").map(Number),date=new Date(Date.UTC(y,m-1,d));
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d){adultFeedback.textContent="出生日期無效。";return;}
  busy=true;adultSave.disabled=true;adultFeedback.textContent="正在確認成年資格…";
  const current=revision;
  try{await auth.saveAdultVerification(dob.value,true);if(current!==revision)return;await refresh();adultFeedback.textContent="成年資格已確認。";}
  catch(e){if(current===revision)adultFeedback.textContent=e?.message||"成年資格確認失敗。";}
  finally{busy=false;adultSave.disabled=!!state?.registered||!state?.registration_enabled||!state?.legal_ready;updateButton();}
 });
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

