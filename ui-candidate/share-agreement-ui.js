"use strict";
/* SHARE-AGREEMENT-UI-01: unpublished candidate reading rehearsal only.
 * No network, consent RPC, storage, service activation or submission. */
(()=>{
 const version="SHARE-TEST-V1-CANDIDATE";
 const content="# 分享服務協議候選稿｜SHARE-TEST-V1-CANDIDATE\n\n狀態：未發布、未生效、不收集同意。須經豪哥逐文確認後，才能建立資料庫發布版本。本稿不授權開啟提交。本次工程僅測試草稿與照片，不安排實際取件。\n\n## 一、服務內容\n\n樂享家協助分享者交付仍具使用價值的衣物，由樂享職人檢查、整理、拍照與建檔，再由總部審核核價及上架。初期處理上衣與外套；衣物件數、衣況及可受理範圍依申請畫面說明。\n\n## 二、交付與處理授權\n\n分享者確認有權處分所交付衣物。衣物實際交付樂享家或受託收件人後，依本協議移轉所有權，由樂享家安排後續循環使用及處理。分享者同意交付後不要求退回原衣物；驗收不合格或最終未售出的衣物，亦授權樂享家依法安排轉贈或回收。\n\n## 三、售出回饋\n\n商品成功售出後，原分享者可依平台規則取得成交金額 10% 現金回饋。未售出衣物不產生售出回饋，平台不保證每件衣物均能上架或售出。回饋累積、提領門檻及匯款作業依已發布的會員帳務規則辦理，不以草稿、申報袋數或預估價格視為已產生回饋。\n\n## 四、分享袋與放置位置\n\n請使用合格防拆破壞袋，確認封袋完整；放在明顯、安全、經允許的指定位置，並提供正確取件地址、放置說明及放置點照片。請避免阻礙通行、放在未獲允許的空間，或拍攝無關的人臉及敏感資料。騎手僅負責袋件取送與交接，不開袋逐件驗收。\n\n## 五、申報與取件\n\n儲存草稿或上傳照片不等於正式申報，也不產生袋號或取件期限。正式開放後，分享者須確認資料與協議，完成滑動提交，並取得系統成功回執，才算有效申報。取件期限以成功申報時間起算 48 小時；此期限指騎手完成取件，不是交付職人的期限。分享袋編號、狀態與期限以本人分享紀錄為準。\n\n## 六、資料使用\n\n取件地址、放置說明及照片供平台完成分享處理、必要交接與取件辨識使用。照片保存在私有儲存空間，不作公開商品照片。個人資料的使用、保存及權利行使，依已發布的隱私權政策及必要作業規範辦理；本稿不另行設定尚未定案的保存期限。\n\n## 七、異常與聯繫\n\n發現袋件找不到、破損、編號不符或其他異常時，由受派騎手依異常流程通報，再由平台處理。分享者可透過本人分享紀錄及平台正式提供的聯繫管道查詢。草稿與照片測試不視為已受理實際物流服務。\n\n## 八、版本與明確同意\n\n正式發布時必須提供完整內容、版本及生效資訊，由會員本人閱讀並明確確認「所有權移轉」「交付後不退回」「不合格或最終未售衣物依法轉贈／回收」。不得預勾、代勾或以會員註冊同意取代分享服務同意；版本變更時由後端確認適用版本。\n\n確認前仍須檢查：本稿與既有已發布會員條款、隱私政策是否一致，以及會員可用的正式聯繫入口。工程不得自行將候選稿標示為已發布。\n";
 function mount({button,onPreviewComplete=()=>{}}){
  if(!button)throw Error("分享協議閱讀入口不存在");
  button.textContent="閱讀並確認分享協議（測試）";
  const dialog=document.createElement("dialog");dialog.id="lxShareAgreementDialog";dialog.className="share-agreement-dialog";dialog.setAttribute("aria-labelledby","lxShareAgreementTitle");
  const title=document.createElement("h2");title.id="lxShareAgreementTitle";title.textContent="分享服務協議｜候選稿";
  const notice=document.createElement("p");notice.className="share-agreement-notice";notice.textContent="尚未發布。本次僅測試閱讀與滑動操作，不記錄法律同意，不會啟用分享服務或提交申請。";
  const text=document.createElement("div");text.id="lxShareAgreementText";text.className="share-agreement-content";text.tabIndex=0;text.setAttribute("role","region");text.setAttribute("aria-label","分享協議全文，可獨立捲動");text.textContent=content;
  const footer=document.createElement("div");footer.className="share-agreement-footer";
  const hint=document.createElement("p");hint.id="lxShareAgreementHint";hint.setAttribute("role","status");hint.setAttribute("aria-live","polite");
  const track=document.createElement("div");track.className="share-agreement-track";
  const caption=document.createElement("span");caption.textContent="向右滑動確認閱讀（測試） »";
  const knob=document.createElement("div");knob.className="share-agreement-knob";knob.textContent="›";knob.setAttribute("aria-hidden","true");
  const slider=document.createElement("input");slider.id="lxShareAgreementSlider";slider.type="range";slider.min="0";slider.max="100";slider.step="1";slider.value="0";slider.disabled=true;slider.setAttribute("aria-label","向右滑動確認分享協議閱讀測試");slider.setAttribute("aria-describedby",hint.id);
  const close=document.createElement("button");close.type="button";close.className="share-agreement-close";close.textContent="關閉文件";
  track.append(caption,knob,slider);footer.append(hint,track,close);dialog.append(title,notice,text,footer);document.body.append(dialog);
  let settled=false,lock=null,closeTimer=null,epoch=0;
  function resetSlider(){slider.value="0";knob.style.left="5px";}
  function atBottom(){return text.clientHeight>0&&text.scrollHeight>0&&text.scrollTop+text.clientHeight>=text.scrollHeight-4;}
  function update(){
   if(!dialog.open||settled)return;
   const ready=atBottom();slider.disabled=!ready;track.classList.toggle("read-ready",ready);
   hint.textContent=ready?"已到文件底部，可向右滑動完成閱讀操作測試。":"請先將文件捲動到底，再使用下方滑動確認。";
   if(!ready)resetSlider();
  }
  function lockBackground(){
   if(lock)return;
   const body=document.body.style,html=document.documentElement.style;
   lock={y:window.scrollY,body:{position:body.position,top:body.top,left:body.left,right:body.right,width:body.width,overflow:body.overflow},overscroll:html.overscrollBehavior};
   html.overscrollBehavior="none";Object.assign(body,{position:"fixed",top:"-"+lock.y+"px",left:"0",right:"0",width:"100%",overflow:"hidden"});
  }
  function unlockBackground(){if(!lock)return;const old=lock;lock=null;Object.assign(document.body.style,old.body);document.documentElement.style.overscrollBehavior=old.overscroll;window.scrollTo(0,old.y);}
  function dismiss(){++epoch;if(closeTimer!==null)clearTimeout(closeTimer);closeTimer=null;if(dialog.open)dialog.close();unlockBackground();resetSlider();slider.disabled=true;settled=false;}
  function open(){
   dismiss();const token=epoch;hint.textContent="請先將文件捲動到底，再使用下方滑動確認。";track.classList.remove("read-ready","read-complete");caption.textContent="向右滑動確認閱讀（測試） »";
   lockBackground();try{dialog.showModal();}catch(e){unlockBackground();throw e;}
   text.scrollTop=0;requestAnimationFrame(()=>{if(token===epoch)update();});
  }
  function finish(){
   if(!dialog.open||settled||slider.disabled)return;
   if(!atBottom()||Number(slider.value)<95){resetSlider();update();return;}
   settled=true;slider.value="100";slider.disabled=true;knob.style.left="calc(100% - 65px)";track.classList.add("read-complete");caption.textContent="閱讀操作測試完成 ✓";
   hint.textContent="僅完成介面測試，未記錄法律同意；正式提交仍鎖定。";
   const token=epoch;closeTimer=setTimeout(()=>{if(token!==epoch)return;closeTimer=null;dialog.close();onPreviewComplete({version,previewOnly:true,consentRecorded:false});},180);
  }
  slider.addEventListener("input",()=>{if(slider.disabled||settled)return;knob.style.left="calc(5px + (100% - 70px) * "+Number(slider.value)/100+")";});
  slider.addEventListener("pointerdown",()=>knob.classList.add("dragging"));
  slider.addEventListener("pointerup",()=>{knob.classList.remove("dragging");finish();});
  slider.addEventListener("pointercancel",()=>{knob.classList.remove("dragging");resetSlider();});
  slider.addEventListener("change",finish);
  slider.addEventListener("keyup",e=>{if(e.key==="Enter"||e.key===" "||e.key.startsWith("Arrow")||e.key==="End")finish();});
  text.addEventListener("scroll",update);window.addEventListener("resize",update);
  close.addEventListener("click",dismiss);dialog.addEventListener("cancel",dismiss);
  dialog.addEventListener("close",()=>{++epoch;if(closeTimer!==null)clearTimeout(closeTimer);closeTimer=null;unlockBackground();});
  button.addEventListener("click",open);
  window.addEventListener("lx-share-session-changed",dismiss);window.addEventListener("pagehide",dismiss);
  return Object.freeze({open,close:dismiss,version,previewOnly:true});
 }
 Object.defineProperty(window,"LX_SHARE_AGREEMENT_UI",{value:Object.freeze({mount,version,previewOnly:true}),writable:false,configurable:false});
})();
