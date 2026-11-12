const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert/strict'),root=path.join(__dirname,'..'),wait=()=>new Promise(r=>setTimeout(r,12));
async function boot(){
 const d=new JSDOM(fs.readFileSync(path.join(root,'rider.html'),'utf8'),{runScripts:'outside-only',url:'https://letshare-tw.github.io/lets-share-test-site/ui-candidate/rider.html'}),w=d.window,doc=w.document,calls=[],gps=[];
 let owner='A',pending=null,block=false;
 const task={id:'t1',bag_code:'TEST-ONE',status:'unassigned',pickup_deadline:new Date().toISOString(),pickup_label:'測試地址 <img src=x onerror=evil()>',delivery_label:'模擬送件地址',pickup_lat:0,pickup_lng:0,delivery_lat:0,delivery_lng:1};
 const data={workspace_id:'w',revision:1,people:[{key:'rider1',eligible:true}],vehicles:[{id:'v',status:'approved',owner_authorized:true}],tasks:[],available_tasks:[task],events:[]};
 Object.defineProperty(w.navigator,'geolocation',{value:{getCurrentPosition(ok,err,options){gps.push({ok,err,options});}}});
 w.LX_TEST_AUTH_ADAPTER={getSession:async()=>({user:{id:owner}}),riderRequest:async(action,payload,id)=>{calls.push({action,payload,id});if(payload.task_id&&block)return new Promise(r=>pending=r);return {...structuredClone(data),...(payload.task_id?{task_preview:structuredClone(task)}:{})};}};
 for(const f of ['rider-route.js','rider-arrival-swipe.js','rider-distance.js','rider-app.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));await wait();
 return {d,w,doc,calls,gps,task,data,click:s=>doc.querySelector(s).click(),block:v=>block=v,resolve:()=>pending({...structuredClone(data),task_preview:structuredClone(task)}),switchOwner:()=>{owner='B';w.dispatchEvent(new w.Event('lx-share-session-changed'));}};
}
(async()=>{
 const x=await boot(),{w,doc,gps,calls}=x,math=w.LX_RIDER_DISTANCE;
 assert.ok(Math.abs(math.km(0,0,0,1)-111.19508)<0.001);assert.equal(math.km(1,2,1,2),0);assert.ok(Math.abs(math.km(0,0,0,180)-20015.11444)<0.01);
 for(const v of [null,undefined,'',true,NaN,Infinity,91])assert.equal(math.km(v,0,0,0),null);
 x.block(true);x.click('[data-act=detail]');assert.equal(doc.querySelector('[data-act=accept]').disabled,true);x.resolve();await wait();
 assert.ok(doc.querySelector('#taskPreview').textContent.includes('111.2 公里'));assert.equal(doc.querySelector('#taskPreview img'),null);assert.ok(doc.querySelector('#taskPreview').textContent.includes('<img'));assert.equal(gps.length,2);assert.equal(gps[1].options.timeout,10000);
 gps[1].ok({coords:{latitude:0,longitude:0.5}});assert.ok(doc.querySelector('#pickupDistance').textContent.includes('55.6 公里'));assert.equal(doc.querySelector('[data-act=accept]').disabled,false);
 x.click('#retryPosition');gps[2].err({code:1});assert.ok(doc.querySelector('#pickupDistance').textContent.includes('未允許定位'));assert.equal(doc.querySelector('[data-act=accept]').disabled,false);
 assert.ok(calls.every(c=>!('latitude' in c.payload)&&!('longitude' in c.payload)));assert.ok(!w.localStorage.length);
 x.click('#retryPosition');x.click('[data-act=close]');gps[3].ok({coords:{latitude:0,longitude:0}});assert.equal(doc.querySelector('#pickupDistance'),null);
 x.click('[data-act=detail]');x.click('[data-act=close]');x.resolve();await wait();assert.equal(doc.querySelector('#taskPreview'),null,'late address read after close ignored');
 x.click('[data-act=detail]');x.switchOwner();x.resolve();await wait();assert.equal(doc.querySelector('#taskPreview'),null,'late address read after account switch ignored');
 x.d.window.close();console.log('PASS known/missing/invalid distance, escaped address, pending gate, GPS success/denial/retry, no position transmission/storage, stale close/account suppression. Mock GPS/Auth/backend, not phone.');
})().catch(e=>{console.error(e);process.exitCode=1});
