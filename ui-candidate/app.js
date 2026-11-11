"use strict";
/* SHARE-TEST-02-04: existing visual shell, real draft persistence, no consent/submission. */
(()=>{
 const api=window.LX_ADAPTER_SELECTOR.getAdapter("test"),$=id=>document.getElementById(id);
 const names=["home","share","cart","member"];
 function go(name){if(!names.includes(name))return;for(const n of names){$("view-"+n).hidden=n!==name;const b=document.querySelector('.bottom [data-go="'+n+'"]');b.classList.toggle("active",n===name);if(n===name)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");}window.scrollTo(0,0);}
 document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));
 const panel=document.createElement("section");panel.className="share-status-panel";
 panel.innerHTML='<p id="shareIdentity" role="status">正在確認分享測試資格…</p><p id="shareDraftInfo" role="status">尚未讀取草稿。</p><label for="sharePoint">已核准集貨點</label><select id="sharePoint" disabled><option value="">暫無可用集貨點</option></select><div class="share-actions"><button id="shareReload" type="button">重新讀取草稿</button><button id="shareSave" type="button" class="primary" disabled>儲存分享草稿</button><button id="shareAddress" type="button">前往會員中心補填地址</button></div><button id="shareTerms" type="button">閱讀分享服務說明（待確認）</button><p id="shareOperation" role="status" aria-live="polite"></p>';
 document.querySelector("#view-share .share-steps").insertAdjacentElement("afterend",panel);
 const count=$("count"),notes=$("notes"),photo=$("photo"),preview=$("preview"),placed=$("placed"),point=$("sharePoint");
 const save=$("shareSave"),reload=$("shareReload"),operation=$("shareOperation"),track=$("swipeTrack"),handle=$("swipeHandle");
 let state=null,userId=null,requestId=null,path=null,savedPath=null,blob=null,photoUrl=null,seq=0,busy=false,dirty=false;
 function releasePhoto(){if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;preview.removeAttribute("src");preview.hidden=true;blob=null;}
 function clear(){releasePhoto();state=null;userId=null;requestId=null;path=null;savedPath=null;dirty=false;count.value="2";notes.value="";photo.value="";placed.checked=false;point.replaceChildren(new Option("暫無可用集貨點",""));point.disabled=true;$("shareHistory").replaceChildren();$("shareDraftInfo").textContent="尚未讀取草稿。";$("photoFeedback").textContent="尚未選擇照片。";$("placeInfo").textContent="登入並完成會員註冊後，才能讀取本人取件地址。";check();}
 function kind(){return document.querySelector('input[name="place"]:checked')?.value==="station"?"collection_point":"home";}
 function validCount(){return /^\d+$/.test(count.value.trim())&&Number(count.value)>=2&&Number(count.value)<=1000;}
 function validPlace(){return state&&(kind()==="home"?(state.address?.home_address||"").trim().length>=6:state.points.some(p=>p.id===point.value));}
 function check(){
  const valid=validCount();count.setAttribute("aria-invalid",String(!valid));$("countHelp").textContent=valid?"衣物件數有效。":"請輸入 2～1000 件整數。";
  save.disabled=busy||!userId||!valid||!validPlace()||Array.from(notes.value).length>200;
  reload.disabled=busy;photo.disabled=busy||!userId;count.disabled=notes.disabled=placed.disabled=busy||!userId;
  document.querySelectorAll('input[name="place"]').forEach(el=>el.disabled=busy||!userId);
  point.disabled=busy||!userId||kind()!=="collection_point"||!state?.points?.length;
  // Deliberately locked even when every field is complete. No legal consent is collected.
  handle.disabled=true;handle.style.transform="translateX(0px)";track.classList.remove("ready","completed");
  $("swipeText").textContent="協議待確認，正式提交尚未開放";
  $("formFeedback").textContent=dirty?"有尚未儲存的變更，請按「儲存分享草稿」。":"可儲存及重新讀取本人草稿；本階段不能正式提交。";
 }
 function placeInfo(){const selected=state?.points?.find(p=>p.id===point.value);$("placeInfo").textContent=kind()==="home"?(state?.address?.home_address||"尚未填寫取件地址，請到會員中心補填並儲存，再重新讀取草稿。"):(selected?selected.name+"："+selected.address_text:"目前沒有可選用的核准集貨點，請使用會員住址。");check();}
 function paintHistory(bags){const host=$("shareHistory");host.replaceChildren();if(!bags?.length){host.textContent="目前沒有已提交分享紀錄。草稿不會產生正式袋號。";return;}for(const bag of bags){const row=document.createElement("p");const date=new Date(bag.pickup_deadline_at);row.textContent=bag.bag_code+"｜"+bag.bag_status+"｜取件期限："+(Number.isNaN(date.getTime())?"待確認":date.toLocaleString("zh-TW",{timeZone:"Asia/Taipei"}));host.append(row);}}
 async function reloadDraft(){
  const token=++seq;busy=true;clear();operation.textContent="正在讀取本人分享資料…";check();
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
   if(path){try{const file=await api.downloadPhoto(path,userId);if(token!==seq)return;photoUrl=URL.createObjectURL(file);preview.src=photoUrl;preview.hidden=false;$("photoFeedback").textContent="已讀取本人私有放置點照片。";}catch(e){if(token===seq){$("photoFeedback").textContent=e.message;operation.textContent="草稿已讀取，但照片載入失敗；請重試。";}}}
  }catch(e){if(token===seq){clear();$("shareIdentity").textContent=e.message;operation.textContent="尚未載入分享資料，未執行寫入。";}}
  finally{if(token===seq){busy=false;check();}}
 }
 function changed(){dirty=true;operation.textContent="";check();}
 count.addEventListener("input",changed);notes.addEventListener("input",changed);placed.addEventListener("change",changed);
 point.addEventListener("change",()=>{changed();placeInfo();});document.querySelectorAll('input[name="place"]').forEach(el=>el.addEventListener("change",()=>{changed();placeInfo();}));
 async function compress(file){
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size===0||file.size>20*1024*1024)throw Error("請選擇 20MB 以下的 JPG、PNG 或 WebP；系統會壓縮為 300KB 以下。");
  const image=new Image(),url=URL.createObjectURL(file);
  try{image.src=url;await image.decode();if(image.naturalWidth*image.naturalHeight>48000000)throw Error("照片尺寸過大，請降低相機解析度後重拍。");
   const canvas=document.createElement("canvas");let edge=1600;
   for(let step=0;step<8;step++){
    const scale=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext("2d");if(!ctx)throw Error("此瀏覽器無法處理照片。");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const result=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",Math.max(.5,.86-step*.06)));
    if(result&&["image/webp","image/png","image/jpeg"].includes(result.type)&&result.size>0&&result.size<=300000)return result;
    edge=Math.round(edge*.78);
   }throw Error("照片無法壓縮至 300KB，請重新拍攝。");
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
 const dialog=document.createElement("dialog");dialog.className="share-terms-dialog";dialog.innerHTML='<h2>分享服務說明｜待確認</h2><div class="share-terms-content"><p>本頁是測試說明，尚未發布為分享協議，不會記錄法律同意。</p><p>分享衣物交付後依約移轉所有權，原則不退回；驗收不合格衣物須事先授權依法轉贈或回收。商品售出後，原分享者可獲成交金額 10% 現金回饋。</p><p>請使用合格防拆破壞袋，封妥並放在安全、明顯、經允許的位置，拍攝放置點供取件辨識。正式開放後，有效申報將以申報時間起算 48 小時取件期限；測試階段不安排實際騎手。</p><p>目前僅開放本人草稿與照片測試，正式提交、分享服務啟用與法律同意持續鎖定。完整協議須經豪哥確認後另行發布。</p></div><button type="button">關閉說明</button>';
 document.body.append(dialog);$("shareTerms").addEventListener("click",()=>{dialog.showModal();document.body.classList.add("share-modal-open");});function closeTerms(){dialog.close();document.body.classList.remove("share-modal-open");}dialog.querySelector("button").addEventListener("click",closeTerms);dialog.addEventListener("close",()=>document.body.classList.remove("share-modal-open"));
 window.addEventListener("lx-share-session-changed",()=>{++seq;busy=false;clear();$("shareIdentity").textContent="登入狀態已變更，正在重新確認…";reloadDraft();});
 window.addEventListener("lx-member-state-changed",()=>{if(!busy&&!dirty)reloadDraft();});
 $("googleLogout").addEventListener("click",()=>{++seq;busy=false;clear();operation.textContent="已清除目前畫面的分享資料。";});
 window.addEventListener("pagehide",()=>{++seq;busy=false;clear();});window.addEventListener("pageshow",e=>{if(e.persisted)reloadDraft();});
 go("home");reloadDraft();
})();
