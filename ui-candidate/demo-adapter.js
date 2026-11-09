"use strict";
/* B-01C-05C — replaceable, in-memory demo adapter. NO network, storage or real transactions. */
(()=>{
 const fixture=Object.freeze({
  member:Object.freeze({id:"DEMO-MEMBER-001",name:"示範會員（非真實登入）"}),
  address:Object.freeze({id:"DEMO-HOME",label:"示範會員地址",detail:"示範地址（不顯示真實門牌）"}),
  points:Object.freeze([{id:"DEMO-POINT-A",label:"示範集貨點 A",detail:"示範集貨點（無實際位置）"},{id:"DEMO-POINT-B",label:"示範集貨點 B",detail:"示範集貨點（無實際位置）"}])
 });
 let sequence=0;
 const copy=x=>JSON.parse(JSON.stringify(x));
 const adapter=Object.freeze({
  mode:"offline-memory-only",
  async getMember(){return copy(fixture.member)},
  async getAddress(){return copy(fixture.address)},
  async listCollectionPoints(){return copy(fixture.points)},
  async saveDraft(payload){return {id:"DEMO-DRAFT-"+String(++sequence).padStart(3,"0"),status:"simulated",clothingCount:payload.count,placeId:payload.placeId,hasPhoto:payload.hasPhoto}},
  async submitSimulation(draft){if(!draft||!/^DEMO-DRAFT-\\d+$/.test(draft.id))throw Error("Invalid demo draft");return {receiptId:draft.id.replace("DEMO-DRAFT-","DEMO-RECEIPT-"),draftId:draft.id,status:"simulation-only",message:"離線模擬完成；未建立正式申請、分享袋編號或取件期限"}}
 });
 Object.defineProperty(window,"LX_DEMO_ADAPTER",{value:adapter,writable:false,configurable:false});
})();