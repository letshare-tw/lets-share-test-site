"use strict";
/* B-01C-05A: isolated in-memory simulation only. No network, storage or transaction. */
(()=>{
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
    const ready=validCount&&validPhoto&&placed.checked;
    swipeHandle.disabled=!ready;
    swipeTrack.classList.toggle("ready",ready);
    if(!simulated){
      formFeedback.textContent=ready?"資料已齊全，可向右滑動完成本機模擬；不會送出任何申請。":"請確認衣物件數、測試照片及分享袋勾選；取件地點僅為模擬選擇。";
      swipeText.textContent=ready?"向右滑動模擬確認 →":"請完成表單後向右滑動（僅模擬）";
    }
    return ready;
  }
  count.addEventListener("input",()=>{resetSwipe();check()});
  notes.addEventListener("input",()=>{resetSwipe();check()});
  document.querySelectorAll('input[name="place"]').forEach(el=>el.addEventListener("change",()=>{resetSwipe();check()}));
  placed.addEventListener("change",()=>{resetSwipe();check()});
  function clearPhoto(){
    if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=null;}
    preview.removeAttribute("src");preview.hidden=true;validPhoto=false;
  }
  photo.addEventListener("change",()=>{
    resetSwipe();clearPhoto();
    const file=photo.files&&photo.files[0];
    if(!file){
      photoFeedback.textContent="尚未選擇照片。";check();return;
    }
    if(!file.type.startsWith("image/")){
      photoFeedback.textContent="請選擇圖片檔案。";check();return;
    }
    photoUrl=URL.createObjectURL(file);
    preview.onload=()=>{validPhoto=true;photoFeedback.textContent="照片已在本機預覽，沒有上傳。";check()};
    preview.onerror=()=>{clearPhoto();photoFeedback.textContent="照片無法預覽，請重新選擇。";check()};
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
    if(!check()){resetSwipe();check();return;}
    if(dragX>=maxTravel()*0.85&&maxTravel()>20){
      simulated=true;swipeTrack.classList.add("completed");
      swipeText.textContent="模擬確認完成 ✓";
      formFeedback.textContent="本機模擬已完成；沒有儲存、上傳、登入或送出資料。";
      demoResult.hidden=false;
      swipeHandle.style.transform="translateX("+maxTravel()+"px)";
    }else{moveTo(0)}
  }
  swipeHandle.addEventListener("pointerdown",e=>{
    if(swipeHandle.disabled)return;
    resetSwipe();dragging=true;dragStart=e.clientX;
    swipeHandle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  swipeHandle.addEventListener("pointermove",e=>{if(dragging)moveTo(e.clientX-dragStart)});
  swipeHandle.addEventListener("pointerup",()=>{if(dragging){dragging=false;finish()}});
  swipeHandle.addEventListener("pointercancel",()=>{dragging=false;moveTo(0)});
  swipeHandle.addEventListener("keydown",e=>{
    if(swipeHandle.disabled)return;
    if(e.key==="ArrowRight"){e.preventDefault();moveTo(maxTravel())}
    if(e.key==="Enter"||e.key===" "){e.preventDefault();moveTo(maxTravel());finish()}
  });
  window.addEventListener("resize",()=>{if(!simulated)moveTo(0)});
  window.addEventListener("pagehide",clearPhoto);
  check();go("home");
})();