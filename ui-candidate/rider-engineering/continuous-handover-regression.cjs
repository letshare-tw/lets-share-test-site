// Mock RPC/Storage regression; does not certify phone camera or real Storage E2E.
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'..','rider-app.js'),'utf8');
let epoch=1,owner='owner',actor='rider1',scope='owner:w:rider1',busy=false,data={revision:1,workspace_id:'w',tasks:[1,2,3].map(id=>({id,bag_code:'TEST-'+id,status:'picked_up'}))},currentId=1,proofBlob=new Blob(['image'],{type:'image/jpeg'}),proofControl={refresh(){}},cameraControl=null,rendered=0,closed=0,lose=true,calls=[];
const nodes={bag:{value:'TEST-1'},batchProgress:{textContent:''}},$=id=>nodes[id],routeScope=()=>scope,current=()=>data.tasks.find(t=>t.id===currentId),working=()=>true,lock=()=>{},closeModal=()=>closed++,render=()=>rendered++,toast=()=>{},errors={},nextStop=()=>({tasks:data.tasks.filter(t=>t.status==='picked_up')}),crypto=require('crypto').webcrypto;
let deliveryBatch={scope,epoch,items:data.tasks.map(t=>({id:t.id,code:t.bag_code,blob:proofBlob,path:null,payload:null,done:false}))};
const auth={riderProofUpload:async(path)=>calls.push(['upload',path]),riderRequest:async(action,payload)=>{if(action==='bootstrap')return structuredClone(data);calls.push(['handover',payload.task_id]);const t=data.tasks.find(t=>t.id===payload.task_id);t.delivery_photo_path=payload.photo_path;t.status='handover_pending';data.revision++;if(lose){lose=false;const e=Error('network');e.code='RIDER_REQUEST_FAILED';throw e;}return {ok:true}}};
eval(source.slice(source.indexOf(' function batchValid'),source.indexOf(' function mapsUrl')));
(async()=>{
 const batch=deliveryBatch;await submitDeliveryBatch(batch);assert.ok(deliveryBatch);assert.equal(busy,false);assert.equal(calls.filter(c=>c[0]==='handover').length,1);
 await submitDeliveryBatch(batch);assert.equal(deliveryBatch,null);assert.equal(calls.filter(c=>c[0]==='handover').length,3);assert.equal(calls.filter(c=>c[0]==='upload').length,3);
 assert.ok(data.tasks.every(t=>t.status==='handover_pending'));assert.equal(rendered,1);assert.equal(closed,1);scope='other';assert.equal(batchValid(batch),false);
 assert.ok(source.includes('details class="batch-list"'));assert.ok(source.includes("if(busy)return;deliveryBatch=null;closeModal();"));
 console.log('PASS serial three-bag submission, committed-but-lost response readback, no duplicate commands, pending receipt, scoped batch and folded conditions. Mock only.');
})().catch(e=>{console.error(e);process.exitCode=1});
