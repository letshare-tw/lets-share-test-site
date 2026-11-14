"use strict";
(()=>{
 function mount({host,header,getContext}){
  const auth=window.LX_TEST_AUTH_ADAPTER,ctx=getContext(),key=JSON.stringify(ctx);
  let dead=false,url=null,photoUrl=null,photo=null,camera=null,dialog=null,guideCleanup=null,seq=0,working=false;
  const valid=()=>!dead&&JSON.stringify(getContext())===key;
  const api=(action,blob)=>auth.riderAvatar(action,ctx.workspace,ctx.actor,blob,ctx.owner);
  const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
  function revoke(){if(url)URL.revokeObjectURL(url);url=null;}
  function show(blob){
   revoke();if(blob)url=URL.createObjectURL(blob);
   for(const target of [header,host?.querySelector('.selfie-current')].filter(Boolean)){target.replaceChildren();if(url){const img=node('img');img.src=url;img.alt='本人騎手頭像';target.append(img);}else target.textContent='騎';}
  }
  const status=host?.querySelector('[role="status"]');
  async function read(){const ticket=++seq;try{const blob=await api('read');if(!valid()||ticket!==seq)return;if(blob&&(blob.size>100000||!['image/jpeg','image/png','image/webp'].includes(blob.type)))throw Error('頭像格式不符。');show(blob);if(status)status.textContent=blob?'已儲存本人自拍頭像。':'尚未設定自拍頭像。';}catch(e){if(valid()&&ticket===seq&&status)status.textContent=e.message;}}
  function cleanEditor(){guideCleanup?.();guideCleanup=null;camera?.destroy();camera=null;if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;photo=null;dialog?.remove();dialog=null;}
  function open(){
   if(!valid()||working)return;cleanEditor();dialog=node('dialog');dialog.className='rw-dialog selfie-dialog';
   dialog.innerHTML='<h2>騎手自拍頭像</h2><p class="selfie-note">請將完整頭部放進中央圓框，頭頂與下巴留些空間。圓框僅供定位，儲存保留完整照片。</p><div class="selfie-camera"></div><img class="selfie-preview" alt="待儲存自拍預覽" hidden><details><summary>選擇現有自拍照</summary><input type="file" accept="image/jpeg,image/png,image/webp"></details><p role="status"></p><button type="button" class="primary selfie-save" disabled>儲存自拍頭像</button><button type="button" class="cancel selfie-close">取消</button>';
   document.body.append(dialog);dialog.showModal();
   const own=dialog,ticket=++seq,preview=dialog.querySelector('.selfie-preview'),msg=dialog.querySelector('[role="status"]'),save=dialog.querySelector('.selfie-save');
   const active=()=>valid()&&dialog===own&&own.open&&ticket===seq;
   const reset=()=>{photo=null;if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;preview.hidden=true;preview.removeAttribute('src');save.disabled=true;};
   async function prepare(file){
    if(!file||!active()||working)return false;reset();msg.textContent='自拍照壓縮中…';const photoTicket=++photoSeq;
    try{const blob=await window.LX_RIDER_PHOTO.compress(file);if(!active()||photoTicket!==photoSeq)return false;photo=blob;photoUrl=URL.createObjectURL(blob);preview.src=photoUrl;preview.hidden=false;save.disabled=false;msg.textContent='預覽確認後，按儲存自拍頭像。';return true;}
    catch(e){if(active()&&photoTicket===photoSeq)msg.textContent=e.message;return false;}
   }
   let photoSeq=0;
   camera=window.LX_RIDER_CAMERA?.mount({host:dialog.querySelector('.selfie-camera'),facingMode:'user',getKey:()=>active()&&!working?key:null,onStart:()=>{photoSeq++;reset();},onCapture:prepare});
   dialog.querySelector('input').addEventListener('change',e=>{camera?.stop();void prepare(e.target.files?.[0]);});
   dialog.querySelector('.selfie-close').onclick=()=>{if(!working){seq++;cleanEditor();}};
   dialog.addEventListener('cancel',e=>{if(working)e.preventDefault();else{seq++;cleanEditor();}});
   dialog.addEventListener('close',()=>{if(dialog===own){seq++;cleanEditor();}});
   save.onclick=async()=>{
    if(!active()||!photo||working)return;working=true;camera?.stop();save.disabled=true;dialog.querySelector('.selfie-close').disabled=true;dialog.querySelector('input').disabled=true;msg.textContent='正在儲存自拍頭像…';
    try{await api('save',photo);if(!active())return;const stored=await api('read');if(!active())return;if(!stored)throw Error('請重新讀取確認頭像儲存結果。');show(stored);if(status)status.textContent='自拍頭像已儲存。';seq++;cleanEditor();}
    catch(e){if(active())msg.textContent=e.message;}
    finally{working=false;if(active()){save.disabled=!photo;own.querySelector('.selfie-close').disabled=false;own.querySelector('input').disabled=false;}}
   };
   const video=dialog.querySelector('.selfie-camera video');
   if(video){
    const frame=node('div');frame.className='selfie-viewfinder';
    const guide=node('div');guide.className='selfie-guide';guide.setAttribute('aria-hidden','true');
    const circle=node('div');circle.className='selfie-guide-circle';guide.append(circle);
    video.before(frame);frame.append(video,guide);
    const resize=()=>{
     if(!active())return;const box=video.getBoundingClientRect();
     const fit=video.videoWidth&&video.videoHeight?Math.min(box.width/video.videoWidth,box.height/video.videoHeight):0;
     const width=fit?video.videoWidth*fit:box.width,height=fit?video.videoHeight*fit:box.height;
     frame.style.setProperty('--selfie-guide-size',Math.max(0,Math.min(width,height)*0.72)+'px');
    };
    const observer=window.ResizeObserver?new ResizeObserver(resize):null;observer?.observe(video);
    video.addEventListener('loadedmetadata',resize);window.addEventListener('resize',resize);
    guideCleanup=()=>{observer?.disconnect();video.removeEventListener('loadedmetadata',resize);window.removeEventListener('resize',resize);};
    resize();
   }
   void camera?.start();
  }
  host?.querySelector('.selfie-edit')?.addEventListener('click',open);
  const remove=host?.querySelector('.selfie-remove');
  if(remove)remove.onclick=async()=>{
   if(!valid()||working)return;working=true;remove.disabled=true;
   try{await api('remove');if(!valid())return;const remaining=await api('read');if(!valid())return;if(remaining)throw Error('頭像尚未移除，請重試。');show(null);if(status)status.textContent='自拍頭像已移除。';}
   catch(e){if(valid()&&status)status.textContent=e.message;}
   finally{working=false;if(valid())remove.disabled=false;}
  };
  void read();
  return {destroy(){dead=true;seq++;cleanEditor();revoke();header?.replaceChildren(document.createTextNode('騎'));}};
 }
 Object.defineProperty(window,'LX_RIDER_AVATAR',{value:Object.freeze({mount})});
})();
