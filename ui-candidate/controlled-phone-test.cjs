const vm=require("node:vm"),fs=require("node:fs"),assert=require("node:assert/strict"),{webcrypto}=require("node:crypto");
const source=fs.readFileSync("controlled-phone-adapter.js","utf8").replace(/const phoneDigest="[a-f0-9]+"/,'const phoneDigest="'+require("node:crypto").createHash("sha256").update("+886900000001").digest("hex")+'"');
const id="80fcf7ae-101f-41b3-bcf2-9212706ac733";
function setup({enabled=false,path="controlled-phone.html",userId=id,google=true,fail=false,storage=new Map(),expired=false}={}){
 let calls=0,verified=false,tail=Promise.resolve();
 const user=()=>({id:userId,email:"test@example.com",identities:google?[{provider:"google"}]:[],phone:verified?"886900000001":"",phone_confirmed_at:verified?"yes":null});
 const auth={getUser:async()=>({data:{user:user()}}),updateUser:async()=>{calls++;return {error:fail?{code:"provider_error"}:null}},verifyOtp:async o=>{assert.equal(o.type,"phone_change");verified=true;return {error:null}}};
 class Clock extends Date{static now(){return Date.parse(expired?"2026-11-13T08:00:00Z":"2026-11-10T08:00:00Z")}}
 const ctx={window:{supabase:{createClient:()=>({auth})}},Date:Clock,location:{origin:"https://letshare-tw.github.io",pathname:"/lets-share-test-site/ui-candidate/"+path},crypto:webcrypto,TextEncoder,URL,navigator:{locks:{request:(_k,fn)=>{const p=tail.then(fn);tail=p.catch(()=>{});return p}}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 vm.runInNewContext(enabled?source.replace("const SEND_AUTHORIZED=false","const SEND_AUTHORIZED=true"):source,ctx);
 return {api:ctx.window.LX_CONTROLLED_PHONE,calls:()=>calls,storage};
}
(async()=>{
 let assertions=0;const rejects=async(p,re)=>{await assert.rejects(p,re);assertions++};
 let t=setup();await t.api.inspect("0900000001");assertions++;
 await rejects(t.api.send("0900000001",true),/尚未開放/);assert.equal(t.calls(),0);assertions++;
 await rejects(t.api.verify("0900000001","123456"),/未開放/);
 await rejects(setup({path:"index.html"}).api.inspect(),/僅供指定/);
 await rejects(setup({userId:"another"}).api.inspect(),/不是本次/);
 await rejects(setup({google:false}).api.inspect(),/不是本次/);
 await rejects(setup({expired:true}).api.inspect(),/到期/);
 await rejects(t.api.inspect("0911111111"),/僅限先前/);
 await rejects(t.api.inspect("bad"),/09 開頭/);
 t=setup({enabled:true});await rejects(t.api.send("0900000001",false),/先確認/);
 const results=await Promise.allSettled([t.api.send("0900000001",true),t.api.send("0900000001",true)]);
 assert.equal(results.filter(r=>r.status==="fulfilled").length,1);assert.equal(t.calls(),1);assertions+=2;
 await rejects(setup({enabled:true,storage:t.storage}).api.send("0900000001",true),/不可重送/);
 await rejects(t.api.verify("0900000001","abcdef"),/六位數/);
 assert.equal((await t.api.verify("+886900000001","123456")).id,id);assertions++;
 await rejects(t.api.send("0900000001",true),/不可重送/);
 t=setup({enabled:true,fail:true});await rejects(t.api.send("0900000001",true),/provider_error/);await rejects(t.api.send("0900000001",true),/不可重送/);assert.equal(t.calls(),1);assertions++;
 assert(!source.includes("signInWithOtp"));assertions++;
 console.log(JSON.stringify({assertions,result:"PASS",realNetworkRequests:0,realSms:0}));
})().catch(e=>{console.error(e);process.exit(1)});

