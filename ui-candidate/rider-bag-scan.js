"use strict";
(()=>{
 async function scan({video,expected,getKey,timeoutMs=7000}){
  const key=getKey(),valid=()=>key!=null&&getKey()===key&&!document.hidden&&video?.isConnected&&!!video.srcObject&&!video.hidden;
  if(!valid())return {status:'cancelled'};
  const Detector=window.BarcodeDetector;
  if(!Detector)return {status:'unsupported'};
  try{
   const supported=await Detector.getSupportedFormats();
   if(!valid())return {status:'cancelled'};
   const formats=['qr_code','code_128'].filter(f=>supported.includes(f));
   if(!formats.length)return {status:'unsupported'};
   const detector=new Detector({formats}),deadline=Date.now()+timeoutMs;
   while(Date.now()<deadline){
    if(!valid())return {status:'cancelled'};
    if(video.readyState>=2&&video.videoWidth>0){
     const codes=await detector.detect(video);
     if(!valid())return {status:'cancelled'};
     const values=codes.map(c=>String(c.rawValue??'').trim()).filter(Boolean);
     if(values.includes(expected))return {status:'matched',value:values.find(v=>v===expected)};
     if(values.length)return {status:'mismatch'};
    }
    await new Promise(resolve=>setTimeout(resolve,200));
   }
   return {status:'timeout'};
  }catch(_){return {status:valid()?'error':'cancelled'};}
 }
 Object.defineProperty(window,'LX_RIDER_BAG_SCAN',{value:Object.freeze({scan})});
})();
