"use strict";
/* B-01C-07B — fail-closed adapter selection. No backend mode is implemented. */
(()=>{
 const demo=window.LX_DEMO_ADAPTER;
 const locked=window.LX_TEST_API_ADAPTER;
 const allowedMethods=["getMember","getAddress","listCollectionPoints","saveDraft","submitSimulation"];
 if(!demo||demo.mode!=="offline-memory-only"||!Object.isFrozen(demo)||allowedMethods.some(k=>typeof demo[k]!=="function"))throw Error("B-01C-07B：離線介面無效，安全停止");
 if(!locked||locked.mode!=="contract-locked"||locked.contract?.environment?.enabled!==false||locked.contract?.safeguards?.allowNetwork!==false)throw Error("B-01C-07B：後端安全鎖異常，安全停止");
 const reject=()=>{throw Error("B-01C-07B：未授權的真實模式已拒絕")};
 const selector=Object.freeze({
  mode:"offline-only",
  active:"demo",
  getAdapter(requested="demo"){if(requested!=="demo")return reject();return demo},
  selectMode(requested){if(requested!=="demo")return reject();return demo},
  assertBackendDisabled(){return locked.mode==="contract-locked"&&locked.contract.environment.enabled===false&&locked.contract.safeguards.allowNetwork===false}
 });
 Object.defineProperty(window,"LX_ADAPTER_SELECTOR",{value:selector,writable:false,configurable:false});
})();
