"use strict";
/* NAV-TEST-01: own-address preview only. No geocoding, GPS, persistence or rider access. */
(()=>{
 function buildUrl(address){
  if(typeof address!=="string")throw Error("取件地址格式不正確。");
  const destination=address.trim();
  if(destination.length<6||Array.from(destination).length>250||/[\u0000-\u001f\u007f]/.test(destination))throw Error("請先補齊並儲存取件地址。");
  const url=new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api","1");url.searchParams.set("destination",destination);url.searchParams.set("travelmode","two-wheeler");
  if(url.href.length>2048)throw Error("地址過長，無法開啟導航。");return url.href;
 }
 function mount({host,getContext,validateContext,navigate=url=>window.location.assign(url)}){
  const section=document.createElement("div"),button=document.createElement("button"),hint=document.createElement("p"),status=document.createElement("p");
  button.type="button";button.id="shareNavigationPreview";button.textContent="Google Maps 機車導航預覽";
  hint.className="muted";hint.textContent="按下後將本次顯示的取件地址交給 Google Maps，預設機車路線。確認目的地與機車模式後，可在 Google Maps 開始導航；本功能不代表已派單。返回樂享家可繼續操作。";
  status.id="shareNavigationStatus";status.setAttribute("role","status");status.setAttribute("aria-live","polite");
  section.append(button,hint,status);host.insertAdjacentElement("afterend",section);
  let pending=false,epoch=0,identity="";
  const key=c=>c?[c.userId,c.selectionKey,c.address].join("\n"):"";
  function refresh(){const c=getContext(),next=key(c);if(next!==identity){identity=next;++epoch;pending=false;status.textContent="";}button.disabled=pending||!c?.eligible;}
  button.addEventListener("click",async()=>{
   refresh();if(button.disabled)return;const original=getContext(),token=++epoch;pending=true;button.disabled=true;status.textContent="正在確認本人取件地址…";
   try{
    if(!await validateContext(original)||token!==epoch||key(getContext())!==key(original)||!getContext()?.eligible)throw Error("登入身分或取件地址已變更，請重新讀取草稿後再試。");
    const url=buildUrl(original.address);status.textContent="正在開啟 Google Maps；請確認選中機車模式與正確目的地。";navigate(url);
   }catch(e){if(token===epoch)status.textContent=e.message;}
   finally{if(token===epoch){pending=false;refresh();}}
  });
  refresh();return Object.freeze({refresh});
 }
 Object.defineProperty(window,"LX_NAVIGATION_PREVIEW",{value:Object.freeze({buildUrl,mount}),writable:false,configurable:false});
})();
