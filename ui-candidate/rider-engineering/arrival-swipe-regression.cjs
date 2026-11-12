const {JSDOM}=require('jsdom'),fs=require('fs'),assert=require('node:assert/strict'),path=require('path'),root=path.join(__dirname,'..');
const moduleSource=fs.readFileSync(path.join(root,'rider-arrival-swipe.js'),'utf8'),appSource=fs.readFileSync(path.join(root,'rider-app.js'),'utf8'),wait=()=>new Promise(r=>setTimeout(r,5));
function setup(getKey,onConfirm){const dom=new JSDOM('<div id="host"></div>',{runScripts:'outside-only',url:'https://letshare-tw.github.io/lets-share-test-site/ui-candidate/rider.html'}),w=dom.window;w.eval(moduleSource);const host=w.document.querySelector('#host'),instance=w.LX_RIDER_ARRIVAL.mount({host,getKey,onConfirm}),track=host.firstChild,handle=track.querySelector('button');track.getBoundingClientRect=()=>({width:340});handle.getBoundingClientRect=()=>({width:56});handle.setPointerCapture=()=>{};handle.hasPointerCapture=()=>true;handle.releasePointerCapture=()=>{};return {dom,w,host,instance,track,handle};}
function pointer(w,b,type,x,id=1){const e=new w.MouseEvent(type,{clientX:x,button:0,bubbles:true,cancelable:true});Object.defineProperties(e,{pointerId:{value:id},isPrimary:{value:true}});b.dispatchEvent(e);}
function key(w,b,k){b.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));}
(async()=>{
 let scope='A:task1:rev1',calls=0,release;const s=setup(()=>scope,async()=>{calls++;await new Promise(r=>release=r);}),{w,handle:b}=s;
 b.click();pointer(w,b,'pointerdown',0);pointer(w,b,'pointerup',0);assert.equal(calls,0,'tap must not arrive');
 pointer(w,b,'pointerdown',0);pointer(w,b,'pointermove',60);pointer(w,b,'pointerup',60);assert.equal(calls,0,'short drag cancels');
 pointer(w,b,'pointerdown',0);pointer(w,b,'pointermove',260);pointer(w,b,'pointercancel',260);assert.equal(calls,0,'OS cancellation must not arrive');
 pointer(w,b,'pointerdown',0);pointer(w,b,'pointermove',260);pointer(w,b,'pointermove',20);pointer(w,b,'pointerup',20);assert.equal(calls,0,'drag back cancels');
 pointer(w,b,'pointerdown',0);pointer(w,b,'pointermove',260);scope='B:task1:rev1';pointer(w,b,'pointerup',260);assert.equal(calls,0,'account change invalidates drag');
 pointer(w,b,'pointerdown',0);pointer(w,b,'pointermove',260);scope='B:task2:rev1';pointer(w,b,'pointerup',260);assert.equal(calls,0,'task change invalidates drag');
 pointer(w,b,'pointerdown',0);pointer(w,b,'pointermove',260);w.dispatchEvent(new w.Event('resize'));pointer(w,b,'pointerup',260);assert.equal(calls,0,'resize resets gesture');
 key(w,b,'Enter');assert.equal(calls,0,'bare Enter cannot arrive');key(w,b,'ArrowRight');key(w,b,'Escape');key(w,b,'Enter');assert.equal(calls,0,'keyboard cancellation');
 pointer(w,b,'pointerdown',0);pointer(w,b,'pointermove',260);pointer(w,b,'pointerup',260);pointer(w,b,'pointerup',260);key(w,b,'Enter');assert.equal(calls,1,'completed swipe emits exactly once while pending');release();await wait();
 key(w,b,'ArrowRight');key(w,b,'Enter');assert.equal(calls,2,'two-step keyboard confirmation');release();await wait();
 pointer(w,b,'pointerdown',0);pointer(w,b,'pointermove',260);s.instance.destroy();pointer(w,b,'pointerup',260);assert.equal(calls,2,'removed control cannot confirm');assert.equal(b.querySelector('img').getAttribute('src'),'rider-logo.png');s.dom.window.close();
 // Verify the actual app binds the swipe to arrive and removes the old click shortcut.
 const html=fs.readFileSync(path.join(root,'rider.html'),'utf8'),dom=new JSDOM(html,{runScripts:'outside-only',url:'https://letshare-tw.github.io/lets-share-test-site/ui-candidate/rider.html'}),x=dom.window;let arrives=0;
 const data={workspace_id:'w',revision:1,people:[{key:'rider1',eligible:true}],vehicles:[],available_tasks:[],events:[],tasks:[{id:'task1',bag_code:'TEST-SWIPE',status:'accepted',arrived_at:null,pickup_label:'模擬取件',delivery_label:'模擬交接',pickup_deadline:new Date().toISOString()}]};
 x.LX_TEST_AUTH_ADAPTER={getSession:async()=>({user:{id:'A'}}),riderRequest:async(action,payload)=>{if(action==='arrive'){assert.equal(payload.task_id,'task1');arrives++;data.tasks[0].arrived_at=new Date().toISOString();data.revision++;}return action==='bootstrap'?structuredClone(data):{ok:true};}};
 x.eval(moduleSource);x.eval(appSource);await wait();x.document.querySelector('[data-tab=ride]').click();const track=x.document.querySelector('.arrival-swipe'),h=track.querySelector('button');track.getBoundingClientRect=()=>({width:340});h.getBoundingClientRect=()=>({width:56});h.setPointerCapture=()=>{};
 assert.equal(x.document.querySelector('[data-act=arrive]'),null,'old click action absent');h.click();assert.equal(arrives,0);pointer(x,h,'pointerdown',0);pointer(x,h,'pointermove',260);pointer(x,h,'pointerup',260);await wait();await wait();assert.equal(arrives,1);assert.ok(x.document.querySelector('[data-act=pickup]'));assert.equal(x.document.querySelector('.arrival-swipe'),null);dom.window.close();
 console.log('PASS: tap/short/back/cancel/resize/account/task gates; one request per swipe; keyboard confirmation; disposal; actual app arrive binding and next-stage rendering. Mock backend/geometry, not phone touch acceptance.');
})().catch(e=>{console.error(e);process.exitCode=1;});
