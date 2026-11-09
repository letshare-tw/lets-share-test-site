"use strict";
/* B-01C-05A: isolated in-memory simulation only. No network, storage or transaction. */
(()=>{
  const api=window.LX_DEMO_ADAPTER;
  if(!api||api.mode!=="offline-memory-only")throw Error("離線資料介面未載入，安全停止");
  const demoState={member:null,address:null,points:[],draft:null,receipt:null};
  let generation=0,pending=false;
  const demoPanel=document.createElement("section");
  demoPanel.className="demo-flow-panel";
  demoPanel.setAttribute("aria-label","離線測試會員與草稿");
  demoPanel.innerHTML='<h2>離線測試會員與分享流程</h2><p id="demoIdentity">載入示範會員中…</p><label for="demoPoint">模擬取件資料</label><select id="demoPoint" disabled><option value="">載入示範資料中…</option></select><p id="demoAddressInfo" role="status">不讀取真實會員地址。</p><p id="demoDraftInfo" role="status">尚未建立模擬草稿。</p><p id="demoReceiptInfo" role="status">尚未產生模擬回執。</p><p class="field-feedback">全部為記憶體假資料；重新整理即消失。不得輸入真實個資。</p>';
  document.querySelector("#view-share .share-steps").insertAdjacentElement("afterend",demoPanel);
  const demoSelect=document.getElementById("demoPoint");
  const placeInfoDemo=document.getElementById("demoAddressInfo");
  const draftInfo=document.getElementById("demoDraftInfo");
  const receiptInfo=document.getElementById("demoReceiptInfo");
  const memberDemo=document.createElement("p");
  memberDemo.className="demo-member-status";
  document.querySelector("#view-member .section").append(memberDemo);
  function invalidateDemo(){generation++;pending=false;demoState.draft=null;demoState.receipt=null;draftInfo.textContent="尚未建立模擬草稿。";receiptInfo.textContent="尚未產生模擬回執。";}
  function selectedDemoPlace(){return document.querySelector('input[name="place"]:checked')?.value==="station"?demoSelect.value:demoState.address?.id;}
  function validDemoPlace(){return getPlace()==="station"?demoState.points.some(p=>p.id===demoSelect.value):!!(demoState.address&&selectedDemoPlace()===demoState.address.id);}
  function updateDemoPlace(){
   const station=document.querySelector('input[name="place"]:checked')?.value==="station";
   demoSelect.disabled=!station;
   if(!station){placeInfoDemo.textContent=demoState.address?.label+"： "+demoState.address?.detail;}
   else{const point=demoState.points.find(p=>p.id===demoSelect.value);placeInfoDemo.textContent=point?point.label+"： "+point.detail:"請選擇示範集貨點";}
  }
  demoSelect.addEventListener("change",()=>{invalidateDemo();updateDemoPlace();resetSwipe();check()});
  Promise.all([api.getMember(),api.getAddress(),api.listCollectionPoints()]).then(([member,address,points])=>{
   demoState.member=member;demoState.address=address;demoState.points=points;
   document.getElementById("demoIdentity").textContent="測試身分："+member.name+"（沒有登入）";
   memberDemo.textContent="離線示範身分："+member.name+"；沒有讀取帳號、地址或歷程。";
   demoSelect.innerHTML='<option value="">請選擇示範集貨點</option>';
   points.forEach(p=>{const o=document.createElement("option");o.value=p.id;o.textContent=p.label;demoSelect.append(o)});
   updateDemoPlace();check();
  }).catch(()=>{document.getElementById("demoIdentity").textContent="示範資料載入失敗，無法完成模擬";});
  const names=["home","share","cart","member"];
  function go(name){
    if(!names.includes(name))return;
    for(const n of names){
      document.getElementById("view-"+n).hidden=n!==name;
      const b=document.querySelector('.bottom [data-go="'+n+'"]');
      b.classList.toggle("active",n===name);
      if(n===name)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
    }
    window.scrollTo(0,0);
  }
  document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));
  const $=id=>document.getElementById(id);
  const count=$("count"),countHelp=$("countHelp"),placeInfo=$("placeInfo"),notes=$("notes");
  const photo=$("photo"),preview=$("preview"),photoFeedback=$("photoFeedback"),cameraLabel=$("cameraLabel");
  const placed=$("placed"),formFeedback=$("formFeedback"),swipeTrack=$("swipeTrack"),swipeHandle=$("swipeHandle");
  const swipeText=$("swipeText"),demoResult=$("demoResult");
  let photoUrl=null,validPhoto=false,simulated=false,dragging=false,dragStart=0,dragX=0;
  const getPlace=()=>document.querySelector('input[name="place"]:checked')?.value||"home";
  function resetSwipe(){
    dragging=false;dragX=0;swipeHandle.style.transform="translateX(0px)";
    swipeTrack.classList.remove("completed");
    demoResult.hidden=true;simulated=false;
  }
  function check(){
    const raw=count.value.trim();
    const number=Number(raw);
    const validCount=raw!==""&&/^\d+$/.test(raw)&&Number.isSafeInteger(number)&&number>=2&&number<=1000;
    count.setAttribute("aria-invalid",String(!validCount));
    countHelp.textContent=validCount?"衣物件數有效。":"請輸入 2～1000 件整數（不能留空或輸入小數）。";
    const place=getPlace();
    placeInfo.textContent=place==="home"?"會員住址（模擬）：測試地址，不代表真實會員資料。":"已核定集貨點（模擬）：示範集貨點，未讀取任何真實據點。";
    const ready=validCount&&validPhoto&&placed.checked&&validDemoPlace()&&!!demoState.member;
    swipeHandle.disabled=!ready||pending||simulated;
    swipeTrack.classList.toggle("ready",ready);
    if(!simulated){
      formFeedback.textContent=ready?"資料已齊全，可向右滑動完成本機模擬；不會送出任何申請。":"請確認衣物件數、測試照片及分享袋勾選；取件地點僅為模擬選擇。";
      swipeText.textContent=ready?"向右滑動模擬確認 →":"請完成表單後向右滑動（僅模擬）";
    }
    return ready;
  }
  count.addEventListener("input",()=>{invalidateDemo();resetSwipe();check()});
  notes.addEventListener("input",()=>{invalidateDemo();resetSwipe();check()});
  document.querySelectorAll('input[name="place"]').forEach(el=>el.addEventListener("change",()=>{invalidateDemo();updateDemoPlace();resetSwipe();check()}));
  placed.addEventListener("change",()=>{invalidateDemo();resetSwipe();check()});
  function clearPhoto(){
    if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=null;}
    preview.removeAttribute("src");preview.hidden=true;validPhoto=false;
  }
  photo.addEventListener("change",()=>{
    invalidateDemo();resetSwipe();clearPhoto();
    const file=photo.files&&photo.files[0];
    if(!file){
      photoFeedback.textContent="尚未選擇照片。";check();return;
    }
    if(!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)||file.size===0||file.size>10*1024*1024){
      photoFeedback.textContent="請選擇 10MB 以下的 JPG、PNG、WebP 或 GIF 圖片。";check();return;
    }
    photoUrl=URL.createObjectURL(file);
    const currentUrl=photoUrl;
    preview.onload=()=>{if(photoUrl!==currentUrl)return;validPhoto=true;photoFeedback.textContent="照片已在本機預覽，沒有上傳。";check()};
    preview.onerror=()=>{if(photoUrl!==currentUrl)return;clearPhoto();photoFeedback.textContent="照片無法預覽，請重新選擇。";check()};
    preview.src=photoUrl;preview.hidden=false;
    cameraLabel.textContent="📷 重新拍攝分享放置點";
    photoFeedback.textContent="正在載入本機照片…";
    check();
  });
  function maxTravel(){return Math.max(0,swipeTrack.clientWidth-swipeHandle.offsetWidth-8)}
  function moveTo(x){
    dragX=Math.max(0,Math.min(maxTravel(),x));
    swipeHandle.style.transform="translateX("+dragX+"px)";
  }
  function finish(){
    if(pending||simulated)return;
    if(!check()){resetSwipe();check();return;}
    if(dragX>=maxTravel()*0.85&&maxTravel()>20){
      pending=true;
      const token=++generation;
      swipeHandle.disabled=true;
      swipeText.textContent="正在產生離線模擬回執…";
      const payload={count:Number(count.value),placeId:selectedDemoPlace(),hasPhoto:validPhoto,noteLength:notes.value.length};
      api.saveDraft(payload).then(draft=>{
        if(token!==generation)return null;
        demoState.draft=draft;
        draftInfo.textContent="模擬草稿："+draft.id+"（僅本機記憶體）";
        return api.submitSimulation(draft);
      }).then(receipt=>{
        if(token!==generation||!receipt)return;
        if(!demoState.draft||receipt.draftId!==demoState.draft.id)throw Error("回執與草稿不一致");
        demoState.receipt=receipt;
        pending=false;simulated=true;
        swipeTrack.classList.add("completed");
        swipeText.textContent="模擬確認完成 ✓";
        formFeedback.textContent="本機模擬完成；沒有儲存、上傳、登入或送出資料。";
        receiptInfo.textContent="模擬回執："+receipt.receiptId+"；"+receipt.message;
        demoResult.hidden=false;
        demoResult.textContent="離線模擬完成 ✓ 草稿與回執均未送出。";
        swipeHandle.disabled=true;
      }).catch(()=>{
        if(token!==generation)return;
        invalidateDemo();resetSwipe();check();
        receiptInfo.textContent="模擬失敗，未產生回執；可重新滑動再試。";
      });
      swipeHandle.style.transform="translateX("+maxTravel()+"px)";
    }else{moveTo(0)}
  }
  swipeHandle.addEventListener("pointerdown",e=>{
    if(swipeHandle.disabled||pending||simulated)return;
    resetSwipe();dragging=true;dragStart=e.clientX;
    swipeHandle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  swipeHandle.addEventListener("pointermove",e=>{if(dragging)moveTo(e.clientX-dragStart)});
  swipeHandle.addEventListener("pointerup",()=>{if(dragging){dragging=false;finish()}});
  swipeHandle.addEventListener("pointercancel",()=>{dragging=false;moveTo(0)});
  swipeHandle.addEventListener("keydown",e=>{
    if(swipeHandle.disabled||pending||simulated)return;
    if(e.key==="ArrowRight"){e.preventDefault();moveTo(maxTravel())}
    if(e.key==="Enter"||e.key===" "){e.preventDefault();moveTo(maxTravel());finish()}
  });
  window.addEventListener("resize",()=>{if(!simulated)moveTo(0)});
  window.addEventListener("pagehide",clearPhoto);
  check();go("home");
})();