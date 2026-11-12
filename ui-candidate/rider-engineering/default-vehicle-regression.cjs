const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('assert/strict'),root=path.join(__dirname,'..'),wait=()=>new Promise(r=>setTimeout(r,10));
async function check(vehicles,tasks,expected){
 const d=new JSDOM(fs.readFileSync(path.join(root,'rider.html'),'utf8'),{runScripts:'outside-only',url:'https://letshare-tw.github.io/lets-share-test-site/ui-candidate/rider.html'}),w=d.window,doc=w.document,calls=[];
 const data={workspace_id:'w',revision:1,people:[{key:'rider1',eligible:true}],vehicles,tasks,available_tasks:[{id:'new',status:'unassigned',bag_code:'TEST-NEW',pickup_deadline:new Date().toISOString()}],events:[]};
 w.LX_TEST_AUTH_ADAPTER={getSession:async()=>({user:{id:'A'}}),riderRequest:async(a,p)=>{if(a==='bootstrap')return structuredClone(data);calls.push({a,p});return {ok:true}}};
 for(const f of ['rider-route.js','rider-arrival-swipe.js','rider-app.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));await wait();doc.querySelector('[data-act=detail]').click();assert.equal(doc.querySelector('#body select'),null);assert.equal(doc.querySelector('#vehicle'),null);assert.ok(!doc.querySelector('#body').textContent.includes('機車'));for(const v of vehicles)assert.ok(!doc.querySelector('#body').textContent.includes(v.label));
 const accept=doc.querySelector('[data-act=accept]');assert.equal(accept.disabled,!expected);accept.click();await wait();if(expected){assert.equal(calls.length,1);assert.equal(calls[0].a,'claim');assert.equal(calls[0].p.vehicle_id,expected);assert.ok(doc.querySelector('h1').textContent.includes('挑選任務'))}else assert.equal(calls.length,0);d.window.close();
}
(async()=>{
 const v1={id:'v1',label:'BIKE-ONE',rider_key:'rider1',status:'approved',owner_authorized:true},v2={...v1,id:'v2',label:'BIKE-TWO'};
 await check([v1],[],'v1');await check([v1,v2],[{id:'old',status:'delivered',vehicle_id:'v2'}],'v2');await check([v1,{...v2,status:'revoked'}],[{id:'old',status:'delivered',vehicle_id:'v2'}],'v1');await check([{...v1,status:'pending'}],[],null);await check([{...v1,owner_authorized:false}],[],null);await check([{...v1,rider_key:'rider2'}],[],null);
 console.log('PASS no vehicle control/name in task detail; automatic approved default; last-used approved preference; revoked fallback; missing approval/authorization or other rider blocks claim. Mock backend, not phone or server qualification tests.');
})().catch(e=>{console.error(e);process.exitCode=1});
