"use strict";
/* SHARE-TEST-V1: allowlisted test consent and submission; server-gated. */
(()=>{
 const environment=Object.freeze({allowedProjectRef:"rfwqcrvxyjhtmafnbuyy",allowedOrigin:"https://rfwqcrvxyjhtmafnbuyy.supabase.co",enabled:true});
 function auth(){const a=window.LX_TEST_AUTH_ADAPTER;if(!a?.shareRequest)throw Error("分享登入介面未就緒。");return a;}
 const adapter=Object.freeze({mode:"test-share-controlled",contract:Object.freeze({version:"SHARE-TEST-V1",environment,safeguards:Object.freeze({allowNetwork:true,allowUpload:true,allowSubmit:true,allowConsent:true,testOnly:true})}),
  async bootstrap(){const s=await auth().getSession();if(!s)throw Error("請先使用 Google 登入並完成會員註冊。");return {userId:s.user.id,...await auth().shareRequest("bootstrap",{},s.user.id)};},
  createDraft:(id)=>auth().shareRequest("create",{},id),
  saveDraft:(requestId,details,id)=>auth().shareRequest("save",{request_id:requestId,details},id),
  preflight:(requestId,id)=>auth().shareRequest("preflight",{request_id:requestId},id),
  uploadPhoto:(path,blob,id)=>auth().shareUpload(path,blob,id),
  downloadPhoto:(path,id)=>auth().shareDownload(path,id),
  removePhoto:(path,id)=>auth().shareRemove(path,id),
  activate:(version,id)=>auth().shareRequest("activate",{agreement_version:version,explicit_agreement:true},id),
  submit:(requestId,version,placed,id)=>auth().shareRequest("submit",{request_id:requestId,agreement_version:version,placement_confirmed:placed===true,transfer_agreed:true,no_return_agreed:true,recycling_agreed:true},id),
  receipt:(requestId,id)=>auth().shareRequest("receipt",{request_id:requestId},id)
 });
 Object.defineProperty(window,"LX_TEST_API_ADAPTER",{value:adapter,writable:false,configurable:false});
})();
