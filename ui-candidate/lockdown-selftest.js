"use strict";
/* B-01C-06D: browser-only negative test; no network, credentials or data mutation. */
(()=>{
 const names=["checkEnvironment","connect","signIn","getMember","getAddress","listCollectionPoints","saveDraft","preflight","uploadPhoto","submit"];
 const a=window.LX_TEST_API_ADAPTER;
 const result={version:"B-01D-03-C02",passed:false,checks:0,failures:[]};
 const run=async()=>{
  if(!a||a.mode!=="contract-locked"||a.contract?.environment?.enabled!==false)result.failures.push("adapter-lock");
  if(a?.contract?.environment?.allowedProjectRef!=="rfwqcrvxyjhtmafnbuyy")result.failures.push("project-allowlist");
  if(a?.contract?.safeguards?.allowNetwork!==false)result.failures.push("network-lock");
  for(const name of names){
   try{await a[name]();result.failures.push(name+":unexpected-success")}
   catch(e){if(!String(e?.message||"").includes("安全鎖定"))result.failures.push(name+":unexpected-error");else result.checks++}
  }
  const selector=window.LX_ADAPTER_SELECTOR;
  if(!selector||selector.mode!=="offline-only"||selector.active!=="demo"||!selector.assertBackendDisabled())result.failures.push("selector-lock");
  if(selector?.getAdapter("demo")!==window.LX_DEMO_ADAPTER)result.failures.push("demo-compatibility");
  for(const mode of ["test","real","production","",null]){
   try{selector.getAdapter(mode);result.failures.push("selector-allowed:"+String(mode))}
   catch(e){if(!String(e?.message||"").includes("未授權"))result.failures.push("selector-error:"+String(mode));else result.checks++}
  }
  try{selector.selectMode("real");result.failures.push("mode-switch-allowed")}
  catch(e){if(!String(e?.message||"").includes("未授權"))result.failures.push("mode-switch-error");else result.checks++}
  const auth=window.LX_TEST_AUTH_ADAPTER;
  if(!auth||auth.mode!=="test-auth-only"||auth.contract?.projectRef!=="rfwqcrvxyjhtmafnbuyy"||auth.contract?.allowProfile!==true)result.failures.push("auth-scope");
  if(auth?.phoneOtp?.enabled!==false||typeof auth?.requestPhoneOtp!=="function"||typeof auth?.verifyPhoneOtp!=="function")result.failures.push("sms-lock");else result.checks++;
  for(const name of ["requestPhoneOtp","verifyPhoneOtp"]){try{await auth[name]();result.failures.push(name+":unexpected-success");}catch(e){if(String(e.message).includes("安全停用"))result.checks++;else result.failures.push(name+":unexpected-error");}}
  if(typeof auth.getProfile==="function"&&typeof auth.saveAddress==="function"&&typeof auth.saveDisplayName==="function")result.checks++;else result.failures.push("profile-methods");
  result.passed=result.failures.length===0&&result.checks===names.length+10;
  document.documentElement.dataset.lxLockdownTest=result.passed?"PASS":"FAIL";
  if(!result.passed)console.error("B-01C-06D lockdown selftest FAIL",result.failures);
  else console.info("B-01C-06D lockdown selftest PASS",result.checks);
  return result;
 };
 Object.defineProperty(window,"LX_LOCKDOWN_SELFTEST",{value:Object.freeze({run}),writable:false,configurable:false});
 run().catch(e=>{document.documentElement.dataset.lxLockdownTest="FAIL";console.error(e)});
})();
