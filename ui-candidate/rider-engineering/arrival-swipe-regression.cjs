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
 // Proof-gated integration is covered by prototype-ui-regression.cjs.
 console.log('PASS: tap/short/back/cancel/resize/account/task gates; one request per swipe; keyboard confirmation; disposal; standalone swipe completion (full proof flow in prototype-ui-regression). Mock backend/geometry, not phone touch acceptance.');
})().catch(e=>{console.error(e);process.exitCode=1;});
