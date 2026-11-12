"use strict";
/* SHARE-TEST-V1: published document from server; consent only after a person's slide. */
(()=>{
 function mount({button,getDocument,agree,onAgreed=()=>{}}){
  if(!button||typeof getDocument!=="function"||typeof agree!=="function")throw Error("分享協議介面未就緒");
  button.textContent="閱讀並確認分享測試協議";
  const dialog=document.createElement("dialog");dialog.id="lxShareAgreementDialog";dialog.className="share-agreement-dialog";dialog.setAttribute("aria-labelledby","lxShareAgreementTitle");
  const title=document.createElement("h2");title.id="lxShareAgreementTitle";title.textContent="分享測試協議";
  const notice=document.createElement("p");notice.className="share-agreement-notice";
  const text=document.createElement("div");text.id="lxShareAgreementText";text.className="share-agreement-content";text.tabIndex=0;text.setAttribute("role","region");text.setAttribute("aria-label","分享測試協議全文，可獨立捲動");
  const footer=document.createElement("div");footer.className="share-agreement-footer";
  const hint=document.createElement("p");hint.id="lxShareAgreementHint";hint.setAttribute("role","status");hint.setAttribute("aria-live","polite");
  const track=document.createElement("div");track.className="share-agreement-track";
  const close=document.createElement("button");close.type="button";close.className="share-agreement-close";close.textContent="關閉文件";
  footer.append(hint,track,close);dialog.append(title,notice,text,footer);document.body.append(dialog);
  let settled=false,pending=false,lock=null,epoch=0,documentState=null,swipe=null;
  function resetSlider(){swipe?.destroy();swipe=null;}
  function mountSlider(){if(swipe)return;track.replaceChildren();swipe=window.LX_RIDER_ARRIVAL.mount({host:track,labelText:"向右滑動，同意測試協議",pendingText:"正在確認同意…",blockedText:"請先閱讀文件到底",ariaLabel:"向右滑動同意分享測試協議",getKey:()=>dialog.open&&!settled&&!pending&&documentState?.service?.published&&documentState.service.submission_enabled&&atBottom()?[epoch,documentState.userId,documentState.service.version].join(":"):null,onConfirm:finish});}
  function atBottom(){return text.clientHeight>0&&text.scrollHeight>0&&text.scrollTop+text.clientHeight>=text.scrollHeight-4;}
  function update(){
   if(!dialog.open||settled||pending)return;
   const available=documentState?.service?.published&&documentState.service.submission_enabled;
   const ready=!!available&&atBottom();mountSlider();swipe.refresh();track.classList.toggle("read-ready",ready);
   hint.textContent=!documentState?"正在讀取已發布文件…":!available?"分享測試目前未開放確認，請稍後重新讀取。":ready?"已到文件底部，請由本人向右滑動同意測試協議。":"請先將文件捲動到底，再使用下方滑動確認。";
   
  }
  function lockBackground(){if(lock)return;const body=document.body.style,html=document.documentElement.style;lock={y:window.scrollY,body:{position:body.position,top:body.top,left:body.left,right:body.right,width:body.width,overflow:body.overflow},overscroll:html.overscrollBehavior};html.overscrollBehavior="none";Object.assign(body,{position:"fixed",top:"-"+lock.y+"px",left:"0",right:"0",width:"100%",overflow:"hidden"});}
  function unlockBackground(){if(!lock)return;const old=lock;lock=null;Object.assign(document.body.style,old.body);document.documentElement.style.overscrollBehavior=old.overscroll;window.scrollTo(0,old.y);}
  function dismiss(){++epoch;if(dialog.open)dialog.close();unlockBackground();resetSlider();settled=false;pending=false;documentState=null;close.disabled=false;}
  async function open(){
   dismiss();const token=epoch;track.classList.remove("read-ready","read-complete");text.textContent="正在讀取已發布文件…";title.textContent="分享測試協議";notice.textContent="本測試不安排實際收衣、物流、交易或回饋。滑動同意與提交申請是兩個獨立步驟。";
   lockBackground();try{dialog.showModal();}catch(e){unlockBackground();throw e;}text.scrollTop=0;update();
   try{const result=await getDocument();if(token!==epoch)return;
    if(!result?.userId||!result.service?.published||!result.service.version||!result.service.content||!result.service.published_at)throw Error("尚無可確認的已發布協議。");
    documentState=result;title.textContent="分享測試協議｜"+result.service.version;
    const published=new Date(result.service.published_at).toLocaleString("zh-TW",{timeZone:"Asia/Taipei"});
    text.textContent="發布／生效時間（台灣）："+published+"\n\n"+result.service.content;text.scrollTop=0;
    if(result.service.activated===true&&result.service.agreed_at){
     settled=true;swipe?.refresh();track.querySelector(".arrival-swipe-label").textContent="此版本已同意，無需再次確認";
     hint.textContent="你已同意此版本，可隨時查看全文；分享規章更新版本時才需重新確認。";
    }else requestAnimationFrame(()=>{if(token===epoch)update();});
   }catch(e){if(token===epoch){documentState=null;text.textContent="文件讀取未完成，沒有寫入同意。請關閉後重新開啟。";hint.textContent=e.message;swipe?.refresh();}}
  }
  async function finish(){
   if(!dialog.open||settled||pending)return;
   if(!atBottom()){swipe?.refresh();update();return;}
   const token=epoch,shown=documentState;pending=true;close.disabled=true;hint.textContent="請稍候，確認成功前不會顯示已同意。";
   try{const result=await agree(shown.service.version,shown.userId);if(token!==epoch)return;
    if(!result?.published||result.activated!==true||result.version!==shown.service.version||!result.agreed_at)throw Error("同意結果未確認，請重新讀取狀態。");
    pending=false;settled=true;track.classList.add("read-complete");hint.textContent="同意已儲存；尚未提交分享申請。";close.disabled=false;
    onAgreed(result,shown.userId);dialog.close();
   }catch(e){if(token===epoch){pending=false;close.disabled=false;resetSlider();update();hint.textContent=e.message+" 請確認狀態或重新開啟文件後再試。";}}
  }
  text.addEventListener("scroll",update);window.addEventListener("resize",update);close.addEventListener("click",dismiss);dialog.addEventListener("cancel",e=>{if(pending)e.preventDefault();else dismiss();});dialog.addEventListener("close",()=>{++epoch;resetSlider();unlockBackground();});button.addEventListener("click",open);window.addEventListener("lx-share-session-changed",dismiss);window.addEventListener("pagehide",dismiss);
  return Object.freeze({open,close:dismiss});
 }
 Object.defineProperty(window,"LX_SHARE_AGREEMENT_UI",{value:Object.freeze({mount,mode:"published-test-agreement"}),writable:false,configurable:false});
})();
