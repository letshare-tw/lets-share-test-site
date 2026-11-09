"use strict";
/* B-01C-06D: browser-only negative test; no network, credentials or data mutation. */
(()=>{
 const names=["checkEnvironment","connect","signIn","getMember","getAddress","listCollectionPoints","saveDraft","preflight","uploadPhoto","submit"];
 const a=window.LX_TEST_API_ADAPTER;
 const result={version:"B-01C-06D",passed:false,checks:0,failures:[]};
 const run=async()=>{
  if(!a||a.mode!=="contract-locked"||a.contract?.environment?.enabled!==false)result.failures.push("adapter-lock");
  if(a?.contract?.environment?.allowedProjectRef!=="rfwqcrvxyjhtmafnbuyy")result.failures.push("project-allowlist");
  if(a?.contract?.safeguards?.allowNetwork!==false)result.failures.push("network-lock");
  for(const name of names){
   try{await a[name]();result.failures.push(name+":unexpected-success")}
   catch(e){if(!String(e?.message||"").includes("安全鎖定"))result.failures.push(name+":unexpected-error");else result.checks++}
  }
  result.passed=result.failures.length===0&&result.checks===names.length;
  document.documentElement.dataset.lxLockdownTest=result.passed?"PASS":"FAIL";
  if(!result.passed)console.error("B-01C-06D lockdown selftest FAIL",result.failures);
  else console.info("B-01C-06D lockdown selftest PASS",result.checks);
  return result;
 };
 Object.defineProperty(window,"LX_LOCKDOWN_SELFTEST",{value:Object.freeze({run}),writable:false,configurable:false});
 run().catch(e=>{document.documentElement.dataset.lxLockdownTest="FAIL";console.error(e)});
})();
