"use strict";
(()=>{
 function mount({host,getKey,onCapture,onStart=()=>{},captureHost=null,facingMode='environment',fileFallback=true}){
  const message=text=>fileFallback?text:text.replace(/，?請展開下方選擇照片|，?或展開下方選擇照片|，?或選擇照片|或選擇照片/g,'，請重新開啟手機相機');
  const make=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
  const view=make('section');view.className='rider-camera';
  const video=make('video');video.muted=true;video.playsInline=true;video.autoplay=true;video.hidden=true;video.setAttribute('aria-label','現場相機取景');
  const state=make('p','在此頁面開啟相機拍攝袋件，優先使用後鏡頭。');state.className='proof-state';state.setAttribute('role','status');
  const open=make('button','開啟網頁相機'),capture=make('button','拍攝照片'),close=make('button','關閉相機');
  for(const b of [open,capture,close])b.type='button';open.className='secondary';capture.className='primary';close.className='cancel';capture.hidden=true;capture.disabled=true;close.hidden=true;
  view.append(video,state,open);if(captureHost){captureHost.append(capture);view.append(close);host.prepend(view);}else{view.append(capture,close);host.append(view);}
  let stream=null,opening=false,capturing=false,disposed=false,seq=0,scope=null;
  const allowed=()=>!disposed&&host.isConnected&&getKey()!==null;
  const current=()=>allowed()&&scope===getKey();
  const stopTracks=s=>{for(const t of s?.getTracks?.()||[])t.stop();};
  function buttons(){if(disposed)return;open.hidden=opening||!!stream;open.disabled=capturing||!allowed();capture.hidden=captureHost?false:!stream;capture.disabled=opening||capturing||!current()||!video.videoWidth||!video.videoHeight;close.hidden=!opening&&!stream;}
  function stop(){seq++;const old=stream;stream=null;scope=null;opening=false;stopTracks(old);try{video.pause();}catch(_){}video.srcObject=null;video.hidden=true;buttons();}
  function metadata(){if(!current()){stop();return;}buttons();if(stream&&video.videoWidth&&video.videoHeight)state.textContent=message('對準袋件與放置環境，按下拍攝照片。');}
  async function start(){
   if(opening||capturing||!allowed())return;
   if(window.isSecureContext===false||!navigator.mediaDevices?.getUserMedia){state.textContent=message('此瀏覽器無法使用網頁相機，請展開下方選擇照片，或使用支援的瀏覽器。');return;}
   onStart();stop();const token=++seq,expected=getKey();scope=expected;opening=true;state.textContent=message('請允許相機權限，正在開啟取景…');buttons();
   try{
    const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facingMode},width:{ideal:1280},height:{ideal:960}}});
    if(disposed||token!==seq||!allowed()||getKey()!==expected){stopTracks(acquired);return;}
    stream=acquired;video.srcObject=acquired;video.hidden=false;
    for(const track of acquired.getVideoTracks())track.addEventListener?.('ended',()=>{if(stream===acquired){stop();state.textContent=message('相機已停止，可以重新開啟或選擇照片。');}},{once:true});
    await video.play();if(disposed||token!==seq)return;if(!current()){stop();return;}
    opening=false;metadata();
   }catch(e){
    if(disposed||token!==seq)return;stop();
    state.textContent=message(({NotAllowedError:'尚未允許相機權限。請在瀏覽器允許相機，或展開下方選擇照片。',NotFoundError:'找不到可用相機，請展開下方選擇照片。',NotReadableError:'相機可能正被其他應用程式使用。請關閉其他相機後重試，或選擇照片。'})[e.name]||'相機未能開啟，請重試或展開下方選擇照片。');
   }finally{if(!disposed&&token===seq){opening=false;buttons();}}
  }
  async function take(){
   if(opening||capturing||!stream||!current()||!video.videoWidth||!video.videoHeight)return;
   const expected=getKey(),canvas=make('canvas'),scale=Math.min(1,1280/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
   try{const context=canvas.getContext('2d');if(!context)throw Error('無法擷取畫面');context.drawImage(video,0,0,canvas.width,canvas.height);}catch(_){state.textContent=message('無法擷取相機畫面，請重拍或選擇照片。');return;}
   stop();const token=seq;capturing=true;state.textContent=message('照片處理中…');buttons();
   try{const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));if(disposed||token!==seq||!allowed()||getKey()!==expected)return;if(!blob)throw Error('照片擷取失敗');const ok=await onCapture(blob);if(ok===false)throw Error('照片處理未完成');if(!disposed&&token===seq)state.textContent=message('相機已關閉，可查看下方照片預覽；需要時重新開啟重拍。');}
   catch(_){if(!disposed&&token===seq)state.textContent=message('照片未能處理，請重新開啟相機重拍或選擇照片。');}
   finally{canvas.width=canvas.height=0;if(!disposed){capturing=false;buttons();}}
  }
  function hide(){if(document.visibilityState==='hidden')stop();}
  function refresh(){if(disposed)return;if((opening||stream)&&!current()){stop();state.textContent=message('相機已關閉，請重新確認目前任務。');}buttons();}
  function closed(){stop();}
  open.addEventListener('click',start);capture.addEventListener('click',take);close.addEventListener('click',()=>{stop();state.textContent=message('相機已關閉，可重新開啟。');});video.addEventListener('loadedmetadata',metadata);video.addEventListener('canplay',metadata);
  document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',closed);window.addEventListener('lx-share-session-changed',closed);buttons();
  return Object.freeze({start,refresh,stop,destroy(){if(disposed)return;stop();disposed=true;open.removeEventListener('click',start);capture.removeEventListener('click',take);video.removeEventListener('loadedmetadata',metadata);video.removeEventListener('canplay',metadata);document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',closed);window.removeEventListener('lx-share-session-changed',closed);}});
 }
 Object.defineProperty(window,'LX_RIDER_CAMERA',{value:Object.freeze({mount})});
})();
