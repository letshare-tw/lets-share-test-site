const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'rider.html'),'utf8'),source=fs.readFileSync(path.join(root,'rider-app.js'),'utf8'),wait=()=>new Promise(r=>setTimeout(r,15));
(async()=>{
 const d=new JSDOM(html,{runScripts:'outside-only',url:'https://letshare-tw.github.io/lets-share-test-site/ui-candidate/rider.html'}),w=d.window,doc=w.document;
 let owner='A',calls=[],uploaded=[],release,blocking=false;
 const task={id:'t1',bag_code:'TEST-0001',status:'unassigned',pickup_deadline:new Date().toISOString(),pickup_lat:22.9971,pickup_lng:120.2125,delivery_lat:23.004,delivery_lng:120.211,pickup_label:'模擬取件',delivery_label:'模擬交付'};
 const data={workspace_id:'w1',revision:1,people:[{key:'rider1',label:'模擬騎手 A',eligible:true}],vehicles:[{id:'v1',label:'TEST-機車 1',status:'approved',owner_authorized:true}],tasks:[],available_tasks:[{...task}],events:[]};
 w.URL.createObjectURL=()=> 'blob:local-test';w.URL.revokeObjectURL=()=>{};
 w.LX_RIDER_PHOTO={compress:async()=>new w.Blob([new Uint8Array(50000)],{type:'image/webp'})};
 w.LX_TEST_AUTH_ADAPTER={getSession:async()=>({user:{id:owner}}),riderProofUpload:async(p,b,id)=>{assert.equal(id,'A');assert.equal(b.size,50000);uploaded.push(p);},riderProofRemove:async()=>{},riderRequest:async(action,payload,id)=>{
  calls.push({action,payload,id});assert.equal(id,owner);
  if(action==='bootstrap'){if(blocking)return new Promise(r=>release=r);return structuredClone(data);}
  if(action==='claim'){data.available_tasks=[];data.tasks=[{...task,status:'accepted'}];}
  if(action==='arrive')data.tasks[0].arrived_at=new Date().toISOString();
  if(action==='pickup'){assert.ok(payload.photo_path);data.tasks[0].pickup_photo_path=payload.photo_path;data.tasks[0].status='picked_up';}
  if(action==='handover'){assert.ok(payload.photo_path);data.tasks[0].delivery_photo_path=payload.photo_path;data.tasks[0].status='handover_pending';}
  data.revision++;return {ok:true};
 }};
 w.eval(fs.readFileSync(path.join(root,'rider-arrival-swipe.js'),'utf8'));w.eval(source);w.dispatchEvent(new w.Event('lx-share-session-changed'));await wait();
 assert.equal(doc.querySelectorAll('#nav button').length,4);assert.ok(doc.querySelector('#main').textContent.includes('待接 1 件'));
 const click=s=>{const e=doc.querySelector(s);assert.ok(e,s);e.click();};
 click('[data-act=detail]');assert.equal(doc.querySelector('#vehicle').value,'v1');click('[data-act=accept]');await wait();
 assert.ok(calls.some(c=>c.action==='claim'&&c.payload.vehicle_id==='v1'));assert.ok(doc.querySelector('#main').textContent.includes('前往取件'));
 {const h=doc.querySelector('.arrival-swipe-handle'),track=doc.querySelector('.arrival-swipe');track.getBoundingClientRect=()=>({width:340});h.getBoundingClientRect=()=>({width:56});h.setPointerCapture=()=>{};for(const [type,x] of [['pointerdown',0],['pointermove',260],['pointerup',260]]){const e=new w.MouseEvent(type,{clientX:x,button:0,bubbles:true,cancelable:true});Object.defineProperties(e,{pointerId:{value:1},isPrimary:{value:true}});h.dispatchEvent(e);}}await wait();assert.ok(data.tasks[0].arrived_at);click('[data-act=pickup]');assert.equal(doc.querySelector('#finish').disabled,true);
 Object.defineProperty(doc.querySelector('#proof'),'files',{value:[{}],configurable:true});doc.querySelector('#proof').dispatchEvent(new w.Event('change',{bubbles:true}));await wait();
 assert.equal(doc.querySelector('#preview').hidden,false);assert.equal(doc.querySelector('#finish').disabled,false);
 click('[data-act=finish]');await wait();assert.equal(uploaded.length,0,'bag/seal gate before upload');
 click('[data-act=scan]');doc.querySelector('#sealed').checked=true;click('[data-act=finish]');await wait();await wait();
 assert.equal(uploaded.length,1);assert.match(uploaded[0],/^A\/w1\/t1\/rider1\/pickup\/image\/[0-9a-f-]+\.webp$/);assert.equal(data.tasks[0].status,'picked_up');
 click('[data-act=handover]');click('[data-act=scan]');Object.defineProperty(doc.querySelector('#proof'),'files',{value:[{}],configurable:true});doc.querySelector('#proof').dispatchEvent(new w.Event('change',{bubbles:true}));await wait();click('[data-act=finish]');await wait();await wait();
 assert.equal(data.tasks[0].status,'handover_pending');assert.ok(doc.querySelector('#main').textContent.includes('等待對方簽收'));assert.ok(!doc.querySelector('#main').textContent.includes('這趟分享，順利送達'));
 click('[data-tab=money]');assert.ok(doc.querySelector('#main').textContent.includes('NT$ —'));
 const u=new URL(w.LX_RIDER_APP.mapsUrl({...task,status:'accepted'}));assert.equal(u.searchParams.get('travelmode'),'two-wheeler');assert.equal(u.searchParams.get('dir_action'),'navigate');assert.equal(u.searchParams.has('origin'),false);
 assert.throws(()=>w.LX_RIDER_APP.mapsUrl({...task,pickup_lat:91}));assert.throws(()=>w.LX_RIDER_APP.mapsUrl({...task,pickup_lat:null}));
 data.tasks=[1,2,3].map(i=>({...task,id:'active'+i,status:'accepted'}));data.available_tasks=[{...task,id:'free'}];click('#reload');await wait();click('[data-tab=tasks]');assert.equal(doc.querySelector('[data-act=detail]').disabled,true,'busy unlock must preserve three-task gate');
 data.tasks=[];data.available_tasks=[{...task,bag_code:'<img src=x onerror=alert(1)>'}];click('#reload');await wait();click('[data-tab=user]');click('[data-tab=tasks]');assert.equal(doc.querySelector('#main img'),null,'server text escaped');
 blocking=true;click('#reload');await wait();owner='B';w.dispatchEvent(new w.Event('lx-share-session-changed'));release({...data,people:[{key:'rider1',label:'OLD_SECRET',eligible:true}]});await wait();assert.ok(!doc.body.textContent.includes('OLD_SECRET'));assert.equal(doc.querySelectorAll('#nav button').length,0);
 d.window.close();console.log('PASS: prototype module with mocked Auth/Storage: backend claim/arrival, vehicle binding, bag/seal gates, compressed preview/upload paths, handover waits for receiver, fee lock, capacity disabled state, XSS escaping, motorcycle URL and account-switch stale response suppression. Not phone/Google/Storage end-to-end.');
})().catch(e=>{console.error(e);process.exitCode=1;});
