"use strict";
/* SHARE-TEST-V1: controlled test consent/submission, no real logistics or transactions. */
(()=>{
 const api=window.LX_ADAPTER_SELECTOR.getAdapter("test"),$=id=>document.getElementById(id);
 const names=["home","share","cart","member"];
 function go(name){if(!names.includes(name))return;for(const n of names){$("view-"+n).hidden=n!==name;const b=document.querySelector('.bottom [data-go="'+n+'"]');b.classList.toggle("active",n===name);if(n===name)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");}window.scrollTo(0,0);}
 document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));
 const panel=document.createElement("section");panel.className="share-status-panel";
 panel.innerHTML='<p id="shareIdentity" role="status">正在確認分享測試資格…</p><p id="shareDraftInfo" role="status">尚未讀取草稿。</p><label for="sharePoint">已核准集貨點</label><select id="sharePoint" disabled><option value="">暫無可用集貨點</option></select><div class="share-actions"><button id="shareReload" type="button">重新讀取草稿</button><button id="shareSave" type="button" class="primary" disabled>儲存分享草稿</button><button id="shareAddress" type="button">前往會員中心補填地址</button></div><button id="shareTerms" type="button">閱讀分享服務說明（待確認）</button><p id="shareConsentStatus" role="status">尚未確認分享測試協議。</p><p id="shareOperation" role="status" aria-live="polite"></p>';
 document.querySelector("#view-share .share-steps").insertAdjacentElement("afterend",panel);
 const count=$("count"),notes=$("notes"),photo=$("photo"),preview=$("preview"),placed=$("placed"),point=$("sharePoint");
 const save=$("shareSave"),reload=$("shareReload"),operation=$("shareOperation"),track=$("swipeTrack"),handle=$("swipeHandle");
 const photoLimitHint=document.createElement("p");photoLimitHint.className="help";photoLimitHint.textContent="新照片會先在本機壓縮至 100KB 以下，再於儲存草稿時上傳。";photo.insertAdjacentElement("afterend",photoLimitHint);
 let state=null,userId=null,requestId=null,path=null,savedPath=null,blob=null,photoUrl=null,seq=0,busy=false,dirty=false,submitState="idle",dragging=false,dragStart=0,dragX=0;
 function releasePhoto(){if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;preview.removeAttribute("src");preview.hidden=true;blob=null;}
 function clear(){resetSwipe();submitState="idle";releasePhoto();state=null;userId=null;requestId=null;path=null;savedPath=null;dirty=false;count.value="2";notes.value="";photo.value="";placed.checked=false;point.replaceChildren(new Option("暫無可用集貨點",""));point.disabled=true;$("shareHistory").replaceChildren();$("shareConsentStatus").textContent="尚未確認分享測試協議。";$("shareDraftInfo").textContent="尚未讀取草稿。";$("photoFeedback").textContent="尚未選擇照片。";$("placeInfo").textContent="登入並完成會員註冊後，才能讀取本人取件地址。";check();}
 function kind(){return document.querySelector('input[name="place"]:checked')?.value==="station"?"collection_point":"home";}
 function validCount(){return /^\d+$/.test(count.value.trim())&&Number(count.value)>=2&&Number(count.value)<=1000;}
 function validPlace(){return state&&(kind()==="home"?(state.address?.home_address||"").trim().length>=6:state.points.some(p=>p.id===point.value));}
 function resetSwipe(){dragging=false;dragX=0;handle.style.transform="translateX(0px)";track.classList.remove("ready","completed");}
 function consentReady(){return !!(state?.service?.published&&state.service.activated&&state.service.version&&state.service.agreed_at);}
 function readyToSubmit(){return !!(userId&&state?.submission_enabled&&state.service?.submission_enabled&&consentReady()&&requestId&&path&&savedPath===path&&!blob&&!dirty&&placed.checked&&validCount()&&validPlace()&&Array.from(notes.value).length<=200&&submitState==="idle");}
 function check(){
  const valid=validCount(),blocked=busy||!userId||submitState!=="idle";count.setAttribute("aria-invalid",String(!valid));$("countHelp").textContent=valid?"衣物件數有效。":"請輸入 2～1000 件整數。";
  save.disabled=blocked||!valid||!validPlace()||Array.from(notes.value).length>200;
  reload.disabled=busy;photo.disabled=blocked;count.disabled=notes.disabled=placed.disabled=blocked;
  document.querySelectorAll('input[name="place"]').forEach(el=>el.disabled=blocked);
  point.disabled=blocked||kind()!=="collection_point"||!state?.points?.length;
  const ready=readyToSubmit()&&!busy;handle.disabled=!ready;track.classList.toggle("ready",ready);
  const legal=state?.service;
  $("shareConsentStatus").textContent=consentReady()?"已同意分享測試協議："+legal.version+"。":legal?.published?"請先閱讀並滑動同意分享測試協議："+legal.version:"分享測試協議尚未載入或未發布。";
  if(submitState==="submitted"){$("swipeText").textContent="測試申請已提交 ✓";track.classList.add("completed");$("formFeedback").textContent="測試提交成功，不安排實際騎手取件。";}
  else if(submitState==="uncertain"){$("swipeText").textContent="請重新讀取確認提交結果";$("formFeedback").textContent="提交結果尚未確認，請按「重新讀取草稿」核對本人分享紀錄。暫不建立新申請。";}
  else{
   const missing=[];
   if(!userId)missing.push("登入指定測試會員");
   if(!valid)missing.push("填寫 2～1000 件衣物");
   if(!validPlace())missing.push("補齊取件地址或選擇核准集貨點");
   if(!requestId||!path||savedPath!==path||blob||dirty)missing.push("儲存照片與草稿");
   if(!consentReady())missing.push("到頁面上方開啟「閱讀並確認分享測試協議」，讀到底後滑動同意");
   if(!placed.checked)missing.push("勾選上方的測試情境確認");
   if(Array.from(notes.value).length>200)missing.push("將放置說明縮短至 200 字內");
   $("swipeText").textContent=ready?"向右滑動提交測試申請 →":!consentReady()?"請先完成分享測試協議確認":"請完成下列待辦後再滑動";
   $("formFeedback").textContent=!state?.submission_enabled?"測試提交目前未開放。":ready?"資料已齊全，滑動後會建立測試申請與袋號；不安排實際取件。":"尚需完成："+missing.join("；")+"。";
  }
 }
 function placeInfo(){const selected=state?.points?.find(p=>p.id===point.value);$("placeInfo").textContent=kind()==="home"?(state?.address?.home_address||"尚未填寫取件地址，請到會員中心補填並儲存，再重新讀取草稿。"):(selected?selected.name+"："+selected.address_text:"目前沒有可選用的核准集貨點，請使用會員住址。");check();}
 function paintHistory(bags){const host=$("shareHistory");host.replaceChildren();if(!bags?.length){host.textContent="目前沒有已提交測試分享紀錄。草稿不會產生袋號。";return;}for(const bag of bags){const row=document.createElement("p");const date=new Date(bag.pickup_deadline_at);row.textContent=bag.bag_code+"｜"+bag.bag_status+"｜測試取件期限："+(Number.isNaN(date.getTime())?"待確認":date.toLocaleString("zh-TW",{timeZone:"Asia/Taipei"}));host.append(row);}}
 async function reloadDraft(){
  const uncertain=submitState==="uncertain"?requestId:null;const token=++seq;busy=true;clear();operation.textContent="正在讀取本人分享資料…";check();
  try{
   const result=await api.bootstrap();if(token!==seq)return;
   state=result;userId=result.userId;requestId=result.draft?.id||null;
   const d=result.draft?.details;
   point.replaceChildren(new Option(result.points.length?"請選擇核准集貨點":"暫無可用集貨點",""));
   result.points.forEach(p=>point.add(new Option(p.name,p.id)));
   document.querySelector('input[name="place"][value="'+(d?.pickup_kind==="collection_point"?"station":"home")+'"]').checked=true;
   count.value=String(d?.clothing_count||2);notes.value=d?.placement_note??result.address?.home_placement_note??"";point.value=d?.collection_point_id||"";
   path=savedPath=d?.placement_photo_path||null;
   $("shareIdentity").textContent="已連接本人測試會員；草稿與照片存放於測試環境。";
   $("shareDraftInfo").textContent=requestId?"已讀取本人草稿。尚未正式提交，也沒有分享袋號。":"尚未建立草稿；按儲存後才會寫入測試資料。";
   paintHistory(result.bags);placeInfo();operation.textContent=requestId?"草稿重新讀取成功。":"分享測試已就緒。";
   if(d?.pickup_kind==="home"&&d.pickup_address_snapshot!==result.address?.home_address){dirty=true;operation.textContent="會員地址已更新，請重新儲存草稿確認取件地址。";}
   if(uncertain){const receipt=result.bags.find(b=>b.share_request_id===uncertain);if(receipt){requestId=uncertain;showReceipt({...receipt,request_id:uncertain,test_only:true});}else if(result.draft?.id!==uncertain){submitState="uncertain";requestId=uncertain;operation.textContent="提交結果仍無法確認，請保留畫面並聯繫小P，不要建立新申請。";}}
   if(path){try{const file=await api.downloadPhoto(path,userId);if(token!==seq)return;photoUrl=URL.createObjectURL(file);preview.src=photoUrl;preview.hidden=false;$("photoFeedback").textContent="已讀取本人私有放置點照片。";}catch(e){if(token===seq){$("photoFeedback").textContent=e.message;operation.textContent="草稿已讀取，但照片載入失敗；請重試。";}}}
  }catch(e){if(token===seq){clear();$("shareIdentity").textContent=e.message;operation.textContent="尚未載入分享資料，未執行寫入。";}}
  finally{if(token===seq){busy=false;check();}}
 }
 function changed(){resetSwipe();dirty=true;operation.textContent="";check();}
 count.addEventListener("input",changed);notes.addEventListener("input",changed);placed.addEventListener("change",()=>{resetSwipe();check();});
 point.addEventListener("change",()=>{changed();placeInfo();});document.querySelectorAll('input[name="place"]').forEach(el=>el.addEventListener("change",()=>{changed();placeInfo();}));
 async function compress(file){
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size===0||file.size>20*1024*1024)throw Error("請選擇 20MB 以下的 JPG、PNG 或 WebP；系統會壓縮為 100KB 以下。");
  const image=new Image(),url=URL.createObjectURL(file);
  try{image.src=url;await image.decode();if(image.naturalWidth*image.naturalHeight>48000000)throw Error("照片尺寸過大，請降低相機解析度後重拍。");
   const canvas=document.createElement("canvas");let edge=1600;
   for(let step=0;step<8;step++){
    const scale=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext("2d");if(!ctx)throw Error("此瀏覽器無法處理照片。");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const result=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",Math.max(.5,.86-step*.06)));
    if(result&&["image/webp","image/png","image/jpeg"].includes(result.type)&&result.size>0&&result.size<=100000)return result;
    edge=Math.round(edge*.78);
   }throw Error("照片無法壓縮至 100KB，請重新拍攝；此照片不會上傳。");
  }finally{URL.revokeObjectURL(url);}
 }
 photo.addEventListener("change",async()=>{
  const file=photo.files?.[0];if(!file)return;const token=++seq;busy=true;check();$("photoFeedback").textContent="正在處理照片…";
  try{const result=await compress(file);if(token!==seq)return;releasePhoto();blob=result;path=null;photoUrl=URL.createObjectURL(result);preview.src=photoUrl;preview.hidden=false;dirty=true;$("photoFeedback").textContent="照片已壓縮（"+Math.ceil(result.size/1000)+"KB）；按儲存草稿才會上傳。";$("cameraLabel").textContent="📷 重新拍攝分享放置點";}
  catch(e){if(token===seq)$("photoFeedback").textContent=e.message;}
  finally{if(token===seq){busy=false;check();}}
 });
 save.addEventListener("click",async()=>{
  check();if(save.disabled)return;const token=++seq,id=userId;busy=true;operation.textContent="正在儲存草稿…";check();
  let uploaded=null;
  try{
   if(!requestId){const created=await api.createDraft(id);if(token!==seq)return;requestId=created.id;}
   if(blob){const ext={"image/webp":"webp","image/png":"png","image/jpeg":"jpg"}[blob.type];const random=crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0,8);const next=id+"/"+requestId+"/"+Date.now()+"-"+random+"."+ext;
    await api.uploadPhoto(next,blob,id);uploaded=next;if(token!==seq)return;path=next;}
   const result=await api.saveDraft(requestId,{clothing_count:Number(count.value),pickup_kind:kind(),collection_point_id:kind()==="collection_point"?point.value:null,placement_note:notes.value.trim(),placement_photo_path:path},id);
   if(token!==seq)return;if(result.id!==requestId||!result.saved||result.details?.placement_photo_path!==path)throw Error("草稿回傳驗證失敗，請重新讀取。");
   const old=savedPath;savedPath=path;blob=null;dirty=false;$("shareDraftInfo").textContent="本人草稿已儲存。尚未正式提交，也沒有分享袋號。";operation.textContent="草稿已儲存；可重新整理確認資料仍在。";
   if(path)$("photoFeedback").textContent="本人私有照片已上傳並關聯草稿。";
   if(old&&old!==path){try{await api.removePhoto(old,id);}catch(_){if(token===seq)operation.textContent+=" 舊照片清理未完成，可稍後重試。";}}
  }catch(e){if(token===seq){dirty=true;operation.textContent=e.message+" 請先重新讀取草稿確認狀態。";}if(uploaded){try{await api.removePhoto(uploaded,id);}catch(_){/* Never delete a referenced photo; policy refuses it. */}}}
  finally{if(token===seq){busy=false;check();}}
 });
 reload.addEventListener("click",()=>{if(!dirty||window.confirm("有尚未儲存的變更，確定重新讀取嗎？"))reloadDraft();});
 $("shareAddress").addEventListener("click",()=>{go("member");const entry=[...document.querySelectorAll("#view-member .member-item")].find(e=>e.textContent.includes("會員資料"));entry?.click();});
 const history=document.createElement("section");history.className="share-status-panel";history.innerHTML='<h2>我的分享</h2><div id="shareHistory" role="status">登入後可查詢本人分享紀錄。</div>';
 document.querySelector("#view-member .section").append(history);
 const historyEntry=[...document.querySelectorAll("#view-member .member-item")].find(e=>e.textContent.includes("我的分享"));if(historyEntry){historyEntry.setAttribute("role","button");historyEntry.tabIndex=0;const open=()=>history.scrollIntoView({behavior:"smooth",block:"start"});historyEntry.addEventListener("click",open);historyEntry.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}});}
 window.LX_SHARE_AGREEMENT_UI.mount({button:$("shareTerms"),getDocument:()=>api.bootstrap(),agree:(version,id)=>api.activate(version,id),onAgreed:(legal,id)=>{if(id!==userId)return;state.service=legal;state.submission_enabled=legal.submission_enabled;operation.textContent="分享測試協議已同意並確認儲存；尚未提交申請。";resetSwipe();check();}});
 function showReceipt(receipt){
  if(receipt.test_only!==true||!receipt.bag_code||receipt.request_id!==requestId)throw Error("提交回執與申請不一致，請重新讀取。");
  submitState="submitted";const date=new Date(receipt.pickup_deadline_at);operation.textContent="測試提交成功｜袋號："+receipt.bag_code+"｜測試取件期限："+date.toLocaleString("zh-TW",{timeZone:"Asia/Taipei"})+"。不安排實際取件，不需交付衣物。";
  $("shareDraftInfo").textContent="本次測試申請已提交，不能再編輯原草稿。";
  const row={...receipt,share_request_id:receipt.request_id};state.bags=[row,...(state.bags||[]).filter(b=>b.share_request_id!==receipt.request_id)];paintHistory(state.bags);check();
 }
 function maxTravel(){return Math.max(0,track.clientWidth-handle.offsetWidth-8);}
 function moveSwipe(x){dragX=Math.max(0,Math.min(maxTravel(),x));handle.style.transform="translateX("+dragX+"px)";}
 async function finishSubmit(){
  if(busy||!readyToSubmit())return;
  if(dragX<maxTravel()*.85||maxTravel()<=20){resetSwipe();return;}
  const token=++seq,id=userId,submittedId=requestId,version=state.service.version;busy=true;operation.textContent="正在檢查及提交測試申請…";check();let dispatched=false;
  try{
   const pre=await api.preflight(submittedId,id);if(token!==seq)return;if(pre.ready!==true||pre.agreement_version!==version)throw Error(pre.reason||"提交資料或協議版本已改變，請重新讀取。");
   dispatched=true;const receipt=await api.submit(submittedId,version,placed.checked,id);if(token!==seq)return;showReceipt(receipt);
  }catch(e){
   if(token!==seq)return;
   if(dispatched){try{const receipt=await api.receipt(submittedId,id);if(token!==seq)return;showReceipt(receipt);}catch(_){if(token===seq){submitState="uncertain";operation.textContent=e.message+" 提交可能已完成，請先重新讀取本人紀錄確認。";}}}
   else{resetSwipe();operation.textContent=e.message;}
  }finally{if(token===seq){busy=false;check();}}
 }
 handle.addEventListener("pointerdown",e=>{if(handle.disabled)return;resetSwipe();dragging=true;dragStart=e.clientX;handle.setPointerCapture(e.pointerId);e.preventDefault();});
 handle.addEventListener("pointermove",e=>{if(dragging)moveSwipe(e.clientX-dragStart);});
 handle.addEventListener("pointerup",()=>{if(dragging){dragging=false;finishSubmit();}});
 handle.addEventListener("pointercancel",resetSwipe);
 handle.addEventListener("keydown",e=>{if(handle.disabled)return;if(e.key==="ArrowRight"){e.preventDefault();moveSwipe(maxTravel());}if(e.key==="Enter"||e.key===" "){e.preventDefault();if(dragX>=maxTravel()*.85)finishSubmit();}});
 window.addEventListener("resize",()=>{if(submitState==="idle")resetSwipe();});
 window.addEventListener("lx-share-session-changed",()=>{++seq;busy=false;clear();$("shareIdentity").textContent="登入狀態已變更，正在重新確認…";reloadDraft();});
 window.addEventListener("lx-member-state-changed",()=>{if(!busy&&!dirty)reloadDraft();});
 $("googleLogout").addEventListener("click",()=>{++seq;busy=false;clear();operation.textContent="已清除目前畫面的分享資料。";});
 window.addEventListener("pagehide",()=>{++seq;busy=false;clear();});window.addEventListener("pageshow",e=>{if(e.persisted)reloadDraft();});
 go("home");reloadDraft();
})();
