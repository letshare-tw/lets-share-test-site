const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../rider-bag-scan.js','utf8');
async function run(mode){
 let key=1,calls=0;const video={isConnected:true,srcObject:{},hidden:false,readyState:2,videoWidth:640};
 class D{static async getSupportedFormats(){return mode==='formats'?[]:['qr_code','code_128'];}async detect(){calls++;if(mode==='stale')key++;if(mode==='error')throw Error();return mode==='empty'?[]:[{rawValue:mode==='wrong'?'OTHER':' TEST-0014 '}];}}
 const context={window:{BarcodeDetector:mode==='unsupported'?undefined:D},document:{hidden:false},Date,setTimeout,Promise,Object,String};vm.runInNewContext(source,context);
 const result=await context.window.LX_RIDER_BAG_SCAN.scan({video,expected:'TEST-0014',getKey:()=>key,timeoutMs:10});
 return {result,calls};
}
(async()=>{for(const [mode,status] of [['correct','matched'],['wrong','mismatch'],['unsupported','unsupported'],['formats','unsupported'],['stale','cancelled'],['error','error'],['empty','timeout']]){const {result}=await run(mode);assert.equal(result.status,status,mode);if(status==='matched')assert.equal(result.value,'TEST-0014');else assert.equal(result.value,undefined);}console.log('7 scanner cases PASS; only exact decoded bag produces a value');})();
