"use strict";
(()=>{
 const number=(v,max)=>typeof v==='number'||typeof v==='string'&&v.trim()!==''?Number.isFinite(Number(v))&&Math.abs(Number(v))<=max?Number(v):null:null;
 function km(a,b,c,d){const p=[number(a,90),number(b,180),number(c,90),number(d,180)];if(p.some(v=>v===null))return null;const r=Math.PI/180,x=(p[2]-p[0])*r,y=(p[3]-p[1])*r,h=Math.sin(x/2)**2+Math.cos(p[0]*r)*Math.cos(p[2]*r)*Math.sin(y/2)**2;return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));}
 const format=v=>v===null||!Number.isFinite(v)?'座標未齊，暫無法估算':'約 '+v.toFixed(v<1?2:1)+' 公里';
 window.LX_RIDER_DISTANCE={km,format};
})();
