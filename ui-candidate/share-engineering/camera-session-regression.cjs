// Run: node ui-candidate/share-engineering/camera-session-regression.cjs
// Mocked SDK event regression, not native camera/Google Session acceptance.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const actor='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';let callback,events=0;
const window={dispatchEvent:()=>events++,supabase:{createClient:()=>({auth:{onAuthStateChange:f=>callback=f,getSession:async()=>({data:{session:{}}}),getUser:async()=>({data:{user:{id:actor,user_metadata:{}}}})}})}};
const context={window,location:{origin:'https://letshare-tw.github.io',pathname:'/lets-share-test-site/ui-candidate/index.html'},Event:class{constructor(type){this.type=type}},setTimeout,URL,Error,Object,Array,Date,RegExp};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','test-auth-adapter.js'),'utf8'),context);
const tick=()=>new Promise(r=>setTimeout(r,10));
(async()=>{
 await window.LX_TEST_AUTH_ADAPTER.getSession();callback('INITIAL_SESSION',{user:{id:actor}});await tick();const baseline=events;
 callback('SIGNED_IN',{user:{id:actor}});await tick();assert.equal(events,baseline,'camera-return same-user event must preserve share state');
 callback('TOKEN_REFRESHED',{user:{id:actor}});await tick();assert.equal(events,baseline);
 callback('SIGNED_IN',{user:{id:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'}});await tick();assert.equal(events,baseline+1,'account switch must invalidate private state');
 callback('SIGNED_OUT',null);await tick();assert.equal(events,baseline+2,'signout must invalidate private state');
 console.log('PASS: same-account return/refresh preserved; account switch/signout invalidated. Mocked SDK only.');
})().catch(e=>{console.error(e);process.exitCode=1;});
