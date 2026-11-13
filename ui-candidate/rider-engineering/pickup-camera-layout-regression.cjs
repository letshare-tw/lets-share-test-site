const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'rider.html'),'utf8'),wait=()=>new Promise(r=>setTimeout(r,15));
function boot(data,session,seed={}){
 const d=new JSDOM(html,{runScripts:'outside-only',url:'https://letshare-tw.github.io/lets-share-test-site/ui-candidate/rider.html'}),w=d.window,doc=w.document,calls=[],uploads=[],removed=[];
 for(const [k,v] of Object.entries(seed))w.localStorage.setItem(k,v);
 w.URL.createObjectURL=()=> 'blob:local-test';w.URL.revokeObjectURL=()=>{};w.LX_RIDER_PHOTO={compress:async()=>new w.Blob([new Uint8Array(50000)],{type:'image/webp'})};
 w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.play=async function(){Object.defineProperty(this,'videoWidth',{value:1280,configurable:true});Object.defineProperty(this,'videoHeight',{value:960,configurable:true})};
 if(session.webCamera){
  Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async constraints=>{
   assert.equal(constraints.audio,false);session.cameraRequests=(session.cameraRequests||0)+1;
   const track={stop(){session.cameraStops=(session.cameraStops||0)+1},addEventListener(){}};
   return {getTracks:()=>[track],getVideoTracks:()=>[track]};
  }}});
  w.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});w.HTMLCanvasElement.prototype.toBlob=function(fn,type){fn(new w.Blob(['frame'],{type}))};
 }
 w.LX_TEST_AUTH_ADAPTER={getSession:async()=>({user:{id:session.owner}}),riderProofUpload:async(p,b,id)=>{assert.equal(id,session.owner);assert.equal(b.size,50000);uploads.push(p)},riderProofRemove:async p=>removed.push(p),riderRequest:async(action,payload,id)=>{
  calls.push({action,payload,id});if(action==='bootstrap')return {...structuredClone(data),...(payload.task_id?{task_preview:[...data.available_tasks,...data.tasks].find(t=>t.id===payload.task_id)}:{})};
  assert.equal(id,session.owner);const t=data.tasks.find(x=>x.id===payload.task_id);
  if(action==='claim'){const found=data.available_tasks.find(x=>x.id===payload.task_id);data.tasks.push({...found,status:'accepted',vehicle_id:payload.vehicle_id});data.available_tasks=data.available_tasks.filter(x=>x.id!==found.id);}
  if(action==='arrive')t.arrived_at=new Date().toISOString();
  if(action==='pickup'){assert.ok(payload.photo_path);t.pickup_photo_path=payload.photo_path;t.picked_up_at=new Date().toISOString();t.status='picked_up';}
  if(action==='handover'){assert.ok(payload.photo_path);t.delivery_photo_path=payload.photo_path;t.status='handover_pending';}
  data.revision++;if(session.failAction===action){session.failAction=null;throw Object.assign(new Error('Response lost after commit'),{code:'RIDER_REQUEST_FAILED'})}return {ok:true};
 }};
 for(const f of ['rider-arrival-swipe.js','rider-camera.js','rider-route.js','rider-distance.js','rider-app.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));
 const click=s=>{const e=doc.querySelector(s);assert.ok(e,s);e.click()};
 const swipe=(host,x=260,end='pointerup')=>{const h=doc.querySelector(host+' .arrival-swipe-handle'),track=h.parentNode;track.getBoundingClientRect=()=>({width:340});h.getBoundingClientRect=()=>({width:72});h.setPointerCapture=()=>{};for(const [type,cx] of [['pointerdown',0],['pointermove',x],[end,x]]){const e=new w.MouseEvent(type,{clientX:cx,button:0,bubbles:true,cancelable:true});Object.defineProperties(e,{pointerId:{value:1},isPrimary:{value:true}});h.dispatchEvent(e)}};
 const proof=async(kind)=>{if(!doc.querySelector('.sheet.open'))click('[data-act='+kind+']');assert.equal(doc.querySelector('#proofConfirm button').disabled,true);doc.querySelector('#bag').value=doc.querySelector('#body').textContent.match(/分享袋：\s*([^\s·]+)/)[1];doc.querySelector('#bag').dispatchEvent(new w.Event('input',{bubbles:true}));if(kind==='pickup'){doc.querySelector('#sealed').checked=true;doc.querySelector('#sealed').dispatchEvent(new w.Event('change',{bubbles:true}))}if(session.webCamera){await wait();click('#riderCamera button.primary');}else{Object.defineProperty(doc.querySelector('#proof'),'files',{value:[{}],configurable:true});doc.querySelector('#proof').dispatchEvent(new w.Event('change',{bubbles:true}));}await wait();assert.equal(doc.querySelector('#preview').hidden,false);assert.equal(doc.querySelector('#proofConfirm button').disabled,false);assert.equal(doc.querySelector('#proofConfirm img').getAttribute('src').split('?')[0],kind==='pickup'?'rider-logo.png':'rider-logo-apricot.svg');doc.querySelector('#proofConfirm button').click();swipe('#proofConfirm',30);swipe('#proofConfirm',260,'pointercancel');await wait();swipe('#proofConfirm');await wait();await wait()};
 return {d,w,doc,calls,uploads,removed,click,swipe,proof};
}
function flowCount(ctx,selector){assert.equal(ctx.doc.querySelectorAll('#main .stop-item').length,0,'full flow must not occupy working screen');const before=ctx.calls.length;ctx.click('#main [data-act=route]');assert.ok(ctx.doc.querySelector('.sheet.open'));const n=ctx.doc.querySelectorAll('#body '+selector).length;ctx.click('[data-act=close]');assert.equal(ctx.calls.length,before,'viewing flow must not mutate or read backend');return n;}

(async()=>{
 const task={id:'t1',bag_code:'TEST-001',receiver_key:'receiver',status:'picked_up',clothing_count:2,pickup_deadline:'2026-11-15T00:00:00Z',pickup_label:'取件點',delivery_label:'職人家',pickup_lat:22.99,pickup_lng:120.21,delivery_lat:23,delivery_lng:120.22};
 const data={workspace_id:'w1',revision:1,people:[{key:'rider1',eligible:true}],vehicles:[],available_tasks:[],events:[],tasks:[task]},session={owner:'A',webCamera:true};
 const seed={'lx-rider-trip-v1:A:w1:rider1':JSON.stringify({scope:'A:w1:rider1',ids:['t1']})};
 const ctx=boot(data,session,seed);await wait();ctx.click('[data-tab=ride]');ctx.click('[data-act=handover]');await wait();
 const {doc}=ctx,host=doc.querySelector('#riderCamera'),controls=doc.querySelector('.proof-camera-controls');
 assert.equal(host.firstElementChild.classList.contains('rider-camera'),true,'viewfinder before controls');
 assert.ok(controls.children[0].contains(doc.querySelector('#bag')));assert.ok(controls.children[0].contains(doc.querySelector('[data-act=scan]')));
 assert.ok(controls.children[1].contains(doc.querySelector('#riderCamera button.primary')));
 assert.equal(doc.querySelectorAll('video').length,1);assert.equal(session.cameraRequests,1);
 assert.equal(doc.querySelectorAll('#bag').length,1);assert.equal(doc.querySelectorAll('#preview').length,1);
 assert.equal(doc.querySelector('#riderCamera button.primary').disabled,false);
 doc.querySelector('#bag').value='TEST-001';doc.querySelector('#bag').dispatchEvent(new ctx.w.Event('input',{bubbles:true}));
 ctx.click('#riderCamera button.primary');await wait();
 assert.equal(doc.querySelector('#preview').hidden,false);assert.equal(session.cameraStops,1);assert.equal(ctx.uploads.length,0);
 assert.equal(doc.querySelector('#proofCapture button').hidden,false);assert.equal(doc.querySelector('#proofCapture button').disabled,true);
 assert.equal(doc.querySelector('#proofConfirm button').disabled,false);
 ctx.swipe('#proofConfirm');await wait();await wait();assert.equal(data.tasks[0].status,'handover_pending');assert.equal(ctx.uploads.length,1);
 ctx.d.window.close();
 const pickupData={...data,revision:10,tasks:[{...task,status:'accepted',arrived_at:null,pickup_photo_path:null}]},pickupSession={owner:'A',webCamera:true};
 const pickup=boot(pickupData,pickupSession,seed);await wait();pickup.click('[data-tab=ride]');pickup.click('[data-act=arrive]');await wait();
 const pc=pickup.doc.querySelector('.proof-camera-controls');
 assert.ok(pc.children[0].contains(pickup.doc.querySelector('#bag')));
 assert.ok(pc.children[1].contains(pickup.doc.querySelector('#proofCapture button')));
 assert.equal(pickup.doc.querySelector('#riderCamera').classList.contains('pickup-camera'),true);
 assert.equal(pickup.doc.querySelector('[data-act=scan]').classList.contains('delivery-button'),false);
 assert.equal(pickup.doc.querySelectorAll('video').length,1);
 pickup.doc.querySelector('#bag').value='TEST-001';pickup.doc.querySelector('#bag').dispatchEvent(new pickup.w.Event('input',{bubbles:true}));
 pickup.click('#proofCapture button');await wait();assert.equal(pickup.doc.querySelector('#preview').hidden,false);
 assert.equal(pickup.doc.querySelector('#proofConfirm button').disabled,true,'seal consent remains required');
 pickup.doc.querySelector('#sealed').checked=true;pickup.doc.querySelector('#sealed').dispatchEvent(new pickup.w.Event('change',{bubbles:true}));
 assert.equal(pickup.doc.querySelector('#proofConfirm button').disabled,false);
 pickup.swipe('#proofConfirm');await wait();await wait();assert.equal(pickupData.tasks[0].status,'picked_up');assert.equal(pickup.uploads.length,1);pickup.d.window.close();
 console.log('PASS: delivery shared viewfinder; left bag/scan; right capture; one camera; preview; final swipe upload. DOM/media mocks; phone layout pending.');
})().catch(e=>{console.error(e);process.exitCode=1});

