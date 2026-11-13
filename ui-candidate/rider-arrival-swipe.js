"use strict";
(()=>{
 function mount({host,getKey,onConfirm,labelText="向右滑動，確認抵達",pendingText="正在確認…",blockedText="請先完成前置資料",ariaLabel="向右滑動確認",tone="green"}){
  const track=document.createElement("div");track.className="arrival-swipe"+(tone==="apricot"?" delivery-apricot":"");track.setAttribute("role","group");track.setAttribute("aria-label",ariaLabel);
  const fill=document.createElement("span");fill.className="arrival-swipe-fill";fill.setAttribute("aria-hidden","true");
  const label=document.createElement("span");label.className="arrival-swipe-label";label.textContent=labelText;
  const handle=document.createElement("button");handle.type="button";handle.className="arrival-swipe-handle";handle.setAttribute("aria-label",ariaLabel);handle.title="拖曳至右側放開；鍵盤先按向右鍵，再按 Enter 確認";
  const logo=document.createElement("img");logo.src=tone==="apricot"?"rider-logo-apricot.svg?v=RIDER-SUNSHINE-ORANGE-01":"rider-logo.png";logo.alt="";logo.draggable=false;logo.setAttribute("aria-hidden","true");handle.append(logo);track.append(fill,label,handle);host.append(track);
  let pointer=null,start=0,position=0,key=null,committed=false,disposed=false;
  const travel=()=>Math.max(0,track.getBoundingClientRect().width-handle.getBoundingClientRect().width);
  const valid=()=>!disposed&&!committed&&!handle.disabled&&track.isConnected&&getKey()!==null;
  const move=x=>{position=Math.max(0,Math.min(travel(),x));handle.style.transform="translateX("+position+"px)";track.style.setProperty("--swipe-fill",(position+handle.getBoundingClientRect().width/2)+"px");label.style.opacity=String(Math.max(.12,1-position/Math.max(1,travel())));};
  function release(){const p=pointer;pointer=null;if(p!==null){try{if(handle.hasPointerCapture?.(p))handle.releasePointerCapture(p);}catch(_){}}}
  function reset(){release();key=null;move(0);track.classList.remove("dragging","armed");if(!committed){label.textContent=getKey()!==null?labelText:blockedText;label.style.opacity="1";}}
  async function finish(){
   if(!valid()||key!==getKey()||travel()<=20||position<travel()*.85){reset();return;}
   committed=true;release();track.classList.remove("dragging","armed");track.classList.add("pending");handle.disabled=true;move(travel());label.style.opacity="1";label.textContent=pendingText;
   try{await onConfirm();}
   finally{if(!disposed&&track.isConnected){committed=false;handle.disabled=false;track.classList.remove("pending");reset();refresh();}}
  }
  function down(e){if(!valid()||pointer!==null||e.isPrimary===false||e.button!==0||travel()<=20)return;reset();key=getKey();pointer=e.pointerId;start=e.clientX;track.classList.add("dragging");try{handle.setPointerCapture?.(pointer);}catch(_){reset();return;}e.preventDefault();}
  function pointerMove(e){if(pointer!==e.pointerId)return;if(!valid()||key!==getKey()){reset();return;}move(e.clientX-start);e.preventDefault();}
  function up(e){if(pointer!==e.pointerId)return;void finish();}
  function cancel(e){if(pointer===e.pointerId)reset();}
  function lost(){if(pointer!==null&&!committed)reset();}
  function keyboard(e){
   if(!valid())return;
   if(e.key==="ArrowRight"){e.preventDefault();reset();if(travel()<=20)return;key=getKey();move(travel());track.classList.add("armed");label.textContent="按 Enter 確認";label.style.opacity="1";}
   else if(e.key==="Enter"||e.key===" "){e.preventDefault();void finish();}
   else if(["Escape","Home","ArrowLeft"].includes(e.key)){e.preventDefault();reset();}
  }
  function resized(){if(!committed)reset();}
  handle.addEventListener("pointerdown",down);handle.addEventListener("pointermove",pointerMove);handle.addEventListener("pointerup",up);handle.addEventListener("pointercancel",cancel);handle.addEventListener("lostpointercapture",lost);handle.addEventListener("keydown",keyboard);
  window.addEventListener("resize",resized);window.addEventListener("pagehide",resized);
  function refresh(){if(disposed)return;const ready=getKey()!==null;handle.disabled=committed||!ready;track.classList.toggle("unready",!ready&&!committed);track.setAttribute("aria-disabled",String(!ready));if(!committed){if(!ready||key!==null&&key!==getKey())reset();label.textContent=ready?labelText:blockedText;label.style.opacity="1";}}
  refresh();
  return Object.freeze({refresh,destroy(){disposed=true;reset();handle.removeEventListener("pointerdown",down);handle.removeEventListener("pointermove",pointerMove);handle.removeEventListener("pointerup",up);handle.removeEventListener("pointercancel",cancel);handle.removeEventListener("lostpointercapture",lost);handle.removeEventListener("keydown",keyboard);window.removeEventListener("resize",resized);window.removeEventListener("pagehide",resized);}});
 }
 Object.defineProperty(window,"LX_RIDER_ARRIVAL",{value:Object.freeze({mount})});
})();
