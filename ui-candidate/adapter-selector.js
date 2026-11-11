"use strict";
(()=>{
 const real=window.LX_TEST_API_ADAPTER,demo=window.LX_DEMO_ADAPTER;
 const allowed=location.origin==="https://letshare-tw.github.io"&&["/lets-share-test-site/ui-candidate/","/lets-share-test-site/ui-candidate/index.html"].includes(location.pathname);
 if(!real||real.contract?.environment.allowedProjectRef!=="rfwqcrvxyjhtmafnbuyy"||real.contract.safeguards.allowSubmit!==false)throw Error("分享環境安全檢查失敗");
 const selector=Object.freeze({mode:"test-drafts-only",active:"test",getAdapter(mode="test"){
  if(mode==="demo")return demo;if(mode!=="test"||!allowed)throw Error("未授權的分享環境");return real;
 },selectMode(){throw Error("未授權切換環境");},assertSubmissionDisabled(){return real.contract.safeguards.allowSubmit===false;}});
 Object.defineProperty(window,"LX_ADAPTER_SELECTOR",{value:selector,writable:false,configurable:false});
})();
