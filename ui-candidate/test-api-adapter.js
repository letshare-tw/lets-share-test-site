"use strict";
/* SHARE-TEST-02-04: allowlisted test backend only. Consent/submission hard-locked. */
(()=>{
 const environment=Object.freeze({allowedProjectRef:"rfwqcrvxyjhtmafnbuyy",allowedOrigin:"https://rfwqcrvxyjhtmafnbuyy.supabase.co",enabled:true});
 const blocked=async()=>{throw Error("安全鎖定：分享協議尚待確認，不能啟用服務或正式提交。");};
 function auth(){const a=window.LX_TEST_AUTH_ADAPTER;if(!a?.shareRequest)throw Error("分享登入介面未就緒。");return a;}
 const adapter=Object.freeze({mode:"test-share-drafts",contract:Object.freeze({version:"SHARE-TEST-02-04",environment,safeguards:Object.freeze({allowNetwork:true,allowUpload:true,allowSubmit:false,allowConsent:false})}),
  async bootstrap(){const s=await auth().getSession();if(!s)throw Error("請先使用 Google 登入並完成會員註冊。");return {userId:s.user.id,...await auth().shareRequest("bootstrap",{},s.user.id)};},
  createDraft:(id)=>auth().shareRequest("create",{},id),
  saveDraft:(requestId,details,id)=>auth().shareRequest("save",{request_id:requestId,details},id),
  preflight:(requestId,id)=>auth().shareRequest("preflight",{request_id:requestId},id),
  uploadPhoto:(path,blob,id)=>auth().shareUpload(path,blob,id),
  downloadPhoto:(path,id)=>auth().shareDownload(path,id),
  removePhoto:(path,id)=>auth().shareRemove(path,id),
  submit:blocked,activate:blocked
 });
 Object.defineProperty(window,"LX_TEST_API_ADAPTER",{value:adapter,writable:false,configurable:false});
})();
