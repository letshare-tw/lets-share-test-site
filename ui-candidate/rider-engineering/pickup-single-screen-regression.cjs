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
 const task={id:'t1',bag_code:'TEST-001',receiver_key:'receiver',status:'accepted',clothing_count:2,pickup_deadline:'2026-11-15T00:00:00Z',pickup_label:'取件點',delivery_label:'職人家',pickup_lat:22.99,pickup_lng:120.21,delivery_lat:23,delivery_lng:120.22};
 const data={workspace_id:'w1',revision:1,people:[{key:'rider1',eligible:true}],vehicles:[],available_tasks:[],events:[],tasks:[task]};
 const seed={'lx-rider-trip-v1:A:w1:rider1':JSON.stringify({scope:'A:w1:rider1',ids:['t1']})};
 const ctx=boot(data,{owner:'A'},seed);await wait();ctx.click('[data-tab=ride]');
 assert.ok(ctx.doc.body.classList.contains('pickup-mode'));
 assert.equal(ctx.doc.querySelectorAll('#main .route').length,0);
 assert.ok(ctx.doc.querySelector('[data-act=bag-records]').classList.contains('records-link'));
 assert.ok(ctx.doc.querySelector('[data-act=arrive]'));
 ctx.click('[data-act=compact-settings]');assert.ok(ctx.doc.querySelector('#compactActor'));assert.equal(ctx.doc.querySelector('#compactActor').value,'rider1');ctx.click('[data-act=close]');
 ctx.click('[data-act=bag-records]');await wait();assert.equal(ctx.doc.querySelectorAll('.bag-record-row').length,1);ctx.click('[data-act=close]');
 ctx.click('[data-tab=tasks]');assert.equal(ctx.doc.body.classList.contains('pickup-mode'),false);
 ctx.click('[data-tab=ride]');assert.equal(ctx.doc.body.classList.contains('pickup-mode'),true);
 assert.equal(ctx.calls.every(c=>c.action==='bootstrap'),true,'query/settings do not mutate tasks');
 ctx.d.window.close();console.log('PASS: compact pickup scope; settings accessible; text query modal; no repeated rows; tab cleanup; read-only viewing. Phone dimensions not rendered.');
})().catch(e=>{console.error(e);process.exitCode=1});
