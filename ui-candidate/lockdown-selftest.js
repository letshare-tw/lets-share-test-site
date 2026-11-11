"use strict";
/* Read-only configuration checks; never calls activate, submit, save, upload or SMS. */
(()=>{
 const run=async()=>{
  const checks=[],failures=[],a=window.LX_TEST_API_ADAPTER,auth=window.LX_TEST_AUTH_ADAPTER,selector=window.LX_ADAPTER_SELECTOR;
  const check=(name,ok)=>{checks.push(name);if(!ok)failures.push(name);};
  check("test-project",a?.contract.environment.allowedProjectRef==="rfwqcrvxyjhtmafnbuyy");
  check("test-only",a?.contract.safeguards.testOnly===true);check("frozen-adapter",Object.isFrozen(a));check("published-legal-ui",window.LX_SHARE_AGREEMENT_UI?.mode==="published-test-agreement");
  for(const name of ["bootstrap","activate","submit","receipt","preflight"])check("method-"+name,typeof a?.[name]==="function");
  for(const mode of ["production","real","",null]){let denied=false;try{selector.getAdapter(mode);}catch(_){denied=true;}check("mode-"+mode,denied);}
  check("selector-test-only",selector?.assertTestOnly()===true);check("sms-lock",auth?.phoneOtp?.enabled===false);
  for(const name of ["requestPhoneOtp","verifyPhoneOtp"]){let denied=false;try{await auth[name]();}catch(e){denied=String(e.message).includes("安全停用");}check(name,denied);}
  const result={version:"SHARE-TEST-V1",passed:failures.length===0,checks:checks.length,failures};document.documentElement.dataset.lxLockdownTest=result.passed?"PASS":"FAIL";return result;
 };
 Object.defineProperty(window,"LX_LOCKDOWN_SELFTEST",{value:Object.freeze({run}),writable:false,configurable:false});run();
})();
