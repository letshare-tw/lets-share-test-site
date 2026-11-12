"use strict";(()=>{
 async function compress(file){
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size===0||file.size>20*1024*1024)throw Error("請選擇 20MB 以下的 JPG、PNG 或 WebP；系統會壓縮為 100KB 以下。");
  const image=new Image(),url=URL.createObjectURL(file);
  try{image.src=url;await image.decode();if(image.naturalWidth*image.naturalHeight>48000000)throw Error("照片尺寸過大，請降低相機解析度後重拍。");
   const canvas=document.createElement("canvas");let edge=1600;
   for(let step=0;step<8;step++){
    const scale=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext("2d");if(!ctx)throw Error("此瀏覽器無法處理照片。");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const result=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",Math.max(.5,.86-step*.06)));
    if(result&&["image/webp","image/png","image/jpeg"].includes(result.type)&&result.size>0&&result.size<=100000)return result;
    edge=Math.round(edge*.78);
   }throw Error("照片無法壓縮至 100KB，請重新拍攝；此照片不會上傳。");
  }finally{URL.revokeObjectURL(url);}
 }
Object.defineProperty(window,"LX_RIDER_PHOTO",{value:Object.freeze({compress})});})();
