"use strict";
(()=>{
 const holds=t=>['accepted','picked_up'].includes(t.status)||(t.status==='exception'&&!t.rider_handover_at);
 const picked=t=>!!t.picked_up_at||['picked_up','handover_pending','delivered'].includes(t.status)||['picked_up','handover_pending'].includes(t.previous_status);
 function destination(t){
  const lat=t.delivery_lat,lng=t.delivery_lng;
  // Only merge a known receiver at the exact same destination. Missing identity never merges.
  if(!t.receiver_key||!t.delivery_label||[lat,lng].some(v=>v===null||v===undefined||v===''||!Number.isFinite(Number(v)))||Math.abs(Number(lat))>90||Math.abs(Number(lng))>180)return 'single:'+t.id;
  return JSON.stringify([t.receiver_key,t.delivery_location_id||'',t.delivery_label.trim(),Number(lat),Number(lng)]);
 }
 function buildStops(tasks){
  const stops=tasks.map(t=>({key:'pickup:'+t.id,kind:'pickup',label:t.pickup_label,tasks:[t],done:picked(t)||t.status==='cancelled',cancelled:t.status==='cancelled',waiting:false,blocked:t.status==='exception'&&!picked(t)}));
  const groups=new Map();for(const t of tasks){const key=destination(t);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(t);}
  for(const [key,bags] of groups){const live=bags.filter(t=>t.status!=='cancelled');stops.push({key:'delivery:'+key,kind:'delivery',label:bags[0].delivery_label,tasks:bags,done:live.every(t=>['handover_pending','delivered'].includes(t.status)),cancelled:!live.length,waiting:live.length>0&&live.every(t=>['handover_pending','delivered'].includes(t.status))&&!live.every(t=>t.status==='delivered'),blocked:live.some(t=>t.status==='exception'||!picked(t))});}
  return stops;
 }
 Object.defineProperty(window,'LX_RIDER_ROUTE',{value:Object.freeze({buildStops,picked,holds})});
})();
