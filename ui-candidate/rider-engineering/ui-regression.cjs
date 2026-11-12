const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'..','rider-workbench.js'),'utf8');
const wait=()=>new Promise(r=>setTimeout(r,5));
function page(adapter){const d=new JSDOM('<main id="view-member"><section class="section"></section></main>',{runScripts:'outside-only',url:'https://letshare-tw.github.io/lets-share-test-site/ui-candidate/index.html'});const w=d.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 Object.defineProperty(w,'LX_TEST_AUTH_ADAPTER',{value:adapter});w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));return d;
}
(async()=>{
 let owner='A',calls=[],pending,block=false;
 const data={workspace_id:'work-A',revision:1,people:[{key:'rider1',application:'draft',eligible:false}],vehicles:[],documents:[],tasks:[],events:[]};
 const adapter={getSession:async()=>({user:{id:owner}}),riderRequest:async(action,payload,expected)=>{calls.push({action,payload,expected});if(block)return new Promise(r=>pending=r);return structuredClone(data);}};
 const d=page(adapter),w=d.window,doc=w.document;
 doc.querySelector('#riderWorkbenchEntry').click();await wait();await wait();
 assert.ok(doc.querySelector('dialog').open);assert.ok(doc.body.textContent.includes('目前僅建立印有 TEST'));assert.ok(!doc.querySelector('input[type=file]'),'real credential inputs must not exist');
 assert.equal(calls[0].action,'bootstrap');assert.equal(calls[0].expected,'A');
 const buttons=()=>[...doc.querySelectorAll('button')];
 buttons().find(b=>b.textContent==='送出模擬資格申請').click();await wait();assert.ok(!calls.some(c=>c.action==='submit_application'),'unconfirmed simulation declaration must block');
 doc.querySelector('input[type=checkbox]').checked=true;buttons().find(b=>b.textContent==='送出模擬資格申請').click();await wait();await wait();
 assert.ok(calls.some(c=>c.action==='submit_application'&&c.payload.simulation_confirmed===true));
 const task={pickup_lat:22.9971,pickup_lng:120.2125,delivery_lat:23.004,delivery_lng:120.211};
 const url=new URL(w.LX_RIDER_WORKBENCH.navigationUrl(task));assert.equal(url.origin,'https://www.google.com');assert.equal(url.searchParams.get('travelmode'),'two-wheeler');assert.equal(url.searchParams.get('dir_action'),'navigate');assert.equal(url.searchParams.has('origin'),false);
 const multi=new URL(w.LX_RIDER_WORKBENCH.navigationUrl(task,false,[task,task,task]));assert.equal(multi.searchParams.get('waypoints').split('|').length,3);
 assert.throws(()=>w.LX_RIDER_WORKBENCH.navigationUrl(task,false,[task,task,task,task]));assert.throws(()=>w.LX_RIDER_WORKBENCH.navigationUrl({...task,pickup_lat:999}));
 const delivery=new URL(w.LX_RIDER_WORKBENCH.navigationUrl(task,true));assert.equal(delivery.searchParams.get('destination'),'23.004,120.211');
 // A delayed old-account response must not rehydrate private work data after signout/account switch.
 block=true;buttons().find(b=>b.textContent==='重新讀取').click();await wait();owner='B';w.dispatchEvent(new w.Event('lx-share-session-changed'));pending({...data,people:[{key:'rider1',application:'draft',review_note:'OLD_ACCOUNT_SECRET'}]});await wait();
 assert.equal(doc.querySelector('dialog').open,false);assert.ok(!doc.body.textContent.includes('OLD_ACCOUNT_SECRET'));assert.ok(!doc.body.textContent.includes('work-A'));
 d.window.close();console.log('PASS: real module / mock adapter: consent gating, no real file input, owner-bound requests, exact motorcycle/direct-navigation parameters, waypoint limits, coordinate validation and delayed response after account change. Not a mobile or native Maps test.');
})().catch(e=>{console.error(e);process.exitCode=1;});
