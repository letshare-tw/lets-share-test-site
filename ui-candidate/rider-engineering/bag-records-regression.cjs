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
  calls.push({action,payload,id});if(action==='proof_link'){if(session.proofDeferred)return await new Promise(resolve=>session.resolveProof=resolve);if(session.proofFailure)throw Error('unavailable');return {signed_url:session.badOrigin?'https://other.invalid/photo':'https://rfwqcrvxyjhtmafnbuyy.supabase.co/storage/v1/object/sign/test/'+payload.task_id};}if(action==='bootstrap')return {...structuredClone(data),...(payload.task_id?{task_preview:[...data.available_tasks,...data.tasks].find(t=>t.id===payload.task_id)}:{})};
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
 const base={workspace_id:'w1',revision:1,people:[{key:'rider1',eligible:true}],vehicles:[],available_tasks:[],events:[]};
 const task={receiver_key:'receiver',status:'picked_up',pickup_deadline:'2026-11-15T00:00:00Z',pickup_lat:22.99,pickup_lng:120.21,delivery_lat:23.004,delivery_lng:120.211,pickup_label:'取件',delivery_label:'職人家',pickup_photo_path:'private/example',clothing_count:2};
 const make=()=>({...base,tasks:[1,2,3].map(i=>({...task,id:'t'+i,bag_code:'TEST-00'+i,...(i===1?{status:'handover_pending',rider_handover_at:'2026-11-13T00:00:00Z'}:{})}))});
 const seed={'lx-rider-trip-v1:A:w1:rider1':JSON.stringify({scope:'A:w1:rider1',ids:['t1','t2','t3']})};
 const app=boot(make(),{owner:'A'},seed);await wait();app.click('[data-tab=ride]');
 assert.equal(app.doc.querySelectorAll('#main .route').length,0,'delivery main has no per-bag long list');
 assert.equal(app.doc.querySelector('#main h2'),null,'no separate bag record card');
 assert.equal(app.doc.querySelector('[data-act=bag-records]').classList.contains('records-link'),true);
 assert.equal(app.calls.filter(x=>x.action==='proof_link').length,0,'no private links until opened');
 const before=app.calls.length;app.click('[data-act=bag-records]');await wait();await wait();
 assert.equal(app.doc.querySelectorAll('.bag-record-row').length,3);
 assert.equal(app.doc.querySelectorAll('.bag-thumb img').length,3);
 assert.ok(app.doc.querySelector('#bagRecordList').textContent.includes('等待收件端簽收'));
 assert.ok(app.doc.querySelector('#bagRecordList').textContent.includes('共 2 件'));
 assert.deepEqual(app.calls.slice(before).map(c=>c.action),['proof_link','proof_link','proof_link']);
 assert.equal(app.calls.slice(before).every(c=>c.payload.stage==='pickup'&&c.id==='A'),true);
 app.click('.bag-thumb');assert.equal(app.doc.querySelector('#bagRecordList').hidden,true);assert.equal(app.doc.querySelector('#bagRecordViewer').hidden,false);app.click('#backBagRecords');assert.equal(app.doc.querySelector('#bagRecordList').hidden,false);
 app.click('[data-act=close]');assert.equal(app.doc.querySelector('#bagRecordList'),null);app.d.window.close();
 for(const option of ['proofFailure','badOrigin']){
  const session={owner:'A',[option]:true},ctx=boot(make(),session,seed);await wait();ctx.click('[data-tab=ride]');ctx.click('[data-act=bag-records]');await wait();assert.equal(ctx.doc.querySelectorAll('.bag-thumb').length,0);assert.ok(ctx.doc.querySelector('#bagRecordList').textContent.includes('照片暫無法讀取'));ctx.d.window.close();
 }
 const session={owner:'A',proofDeferred:true},ctx=boot(make(),session,seed);await wait();ctx.click('[data-tab=ride]');ctx.click('[data-act=bag-records]');await wait();ctx.click('[data-act=close]');session.resolveProof({signed_url:'https://rfwqcrvxyjhtmafnbuyy.supabase.co/photo'});await wait();assert.equal(ctx.doc.querySelector('.sheet.open'),null);assert.equal(ctx.calls.filter(c=>c.action==='proof_link').length,1,'closed modal stops remaining links');ctx.d.window.close();
 const s={owner:'A',proofDeferred:true},changed=boot(make(),s,seed);await wait();changed.click('[data-tab=ride]');changed.click('[data-act=bag-records]');await wait();s.owner='B';changed.w.dispatchEvent(new changed.w.Event('lx-share-session-changed'));s.resolveProof({signed_url:'https://rfwqcrvxyjhtmafnbuyy.supabase.co/photo'});await wait();assert.equal(changed.doc.querySelector('.bag-thumb'),null);changed.d.window.close();
 const noPhoto=make();noPhoto.tasks[1].pickup_photo_path=null;const empty=boot(noPhoto,{owner:'A'},seed);await wait();empty.click('[data-tab=ride]');empty.click('[data-act=bag-records]');await wait();assert.ok(empty.doc.querySelector('#bagRecordList').textContent.includes('尚無取件照片'));assert.equal(empty.calls.filter(c=>c.action==='proof_link').length,2);empty.d.window.close();
 console.log('PASS: compact delivery; 3-bag thumbnail/message modal; lazy scoped read-only links; zoom/back; no-photo/error/origin guards; close/session late-response isolation. Mock DOM/backend, phone acceptance pending.');
})().catch(e=>{console.error(e);process.exitCode=1});
