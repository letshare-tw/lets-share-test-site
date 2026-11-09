"use strict";
/* B-01C-07C-01: inert test Auth contract. No SDK, OAuth, tokens, storage or requests. */
(()=>{
 const contract=Object.freeze({
  version:"B-01C-07C-01",mode:"locked",enabled:false,
  callbackPath:"/lets-share-test-site/ui-candidate/auth-callback.html",
  allowedPageOrigin:"https://letshare-tw.github.io",
  projectRef:"rfwqcrvxyjhtmafnbuyy",
  allowOAuth:false,allowSession:false,allowProfile:false,
  note:"Callback is an inert placeholder; enabling auth requires separate approval."
 });
 const deny=async()=>{throw Error("B-01C-07C-01 安全鎖定：未授權登入、回跳或 Session 操作");};
 const adapter=Object.freeze({mode:"auth-locked",contract,
  signInWithGoogle:deny,handleCallback:deny,getSession:deny,refreshSession:deny,
  getProfile:deny,signOut:deny,restoreSession:deny
 });
 Object.defineProperty(window,"LX_TEST_AUTH_ADAPTER",{value:adapter,writable:false,configurable:false});
})();
