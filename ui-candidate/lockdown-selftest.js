"use strict";
/* Negative checks only: never writes, uploads, consents, or sends SMS. */
(()=>{
 const run=async()=>{
  const checks=[],failures=[],a=window.LX_TEST_API_ADAPTER,auth=window.LX_TEST_AUTH_ADAPTER,selector=window.LX_ADAPTER_SELECTOR;
  const check=(name,ok)=>{checks.push(name);if(!ok)failures.push(name);};
  check("test-project",a?.contract.environment.allowedProjectRef==="rfwqcrvxyjhtmafnbuyy");
  check("submit-locked",a?.contract.safeguards.allowSubmit===false);
  check("consent-locked",a?.contract.safeguards.allowConsent===false);
  check("frozen-adapter",Object.isFrozen(a));
  for(const name of ["submit","activate"]){let denied=false;try{await a[name]();}catch(e){denied=String(e.message).includes("安全鎖定");}check(name+"-denied",denied);}
  for(const mode of ["production","real","",null]){let denied=false;try{selector.getAdapter(mode);}catch(_){denied=true;}check("mode-"+mode,denied);}
  check("selector-submit-lock",selector?.assertSubmissionDisabled()===true);
  check("sms-lock",auth?.phoneOtp?.enabled===false);
  for(const name of ["requestPhoneOtp","verifyPhoneOtp"]){let denied=false;try{await auth[name]();}catch(e){denied=String(e.message).includes("安全停用");}check(name,denied);}
  for(const name of ["shareRequest","shareUpload","shareDownload","shareRemove","getRegistrationStatus","saveAddress"]){check(name,typeof auth?.[name]==="function");}
  const result={version:"SHARE-TEST-02-04",passed:failures.length===0,checks:checks.length,failures};
  document.documentElement.dataset.lxLockdownTest=result.passed?"PASS":"FAIL";return result;
 };
 Object.defineProperty(window,"LX_LOCKDOWN_SELFTEST",{value:Object.freeze({run}),writable:false,configurable:false});run();
})();
