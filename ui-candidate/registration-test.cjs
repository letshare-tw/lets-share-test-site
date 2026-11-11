"use strict";
const assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs");
const adapterSource=fs.readFileSync("test-auth-adapter.js","utf8");
const uiSource=fs.readFileSync("registration-ui.js","utf8");
const id="00000000-0000-4000-8000-000000000001";
const tick=()=>new Promise(resolve=>setImmediate(resolve));
let assertions=0;
function check(value){assert(value);assertions++;}
async function reject(p,pattern){await assert.rejects(p,pattern);assertions++;}
function adapterFixture(options={}){
 let rpcCalls=[],completeCalls=0,current=id;
 const user=()=>({id:current,email:"fixture@example.invalid",phone:"886900000001",phone_confirmed_at:"fixture",user_metadata:{}});
 const initial={user_id:id,google_verified:true,name_ready:true,phone_verified:true,adult_ready:false,registered:false,registration_enabled:false,legal_ready:false,can_complete:false,legal:null};
 let state={...initial,...options.state};
 const auth={getSession:async()=>({data:{session:options.loggedOut?null:{user:user()}}}),getUser:async()=>({data:{user:user()}})};
 const client={auth,rpc:async(name,args)=>{
  rpcCalls.push(name);
  if(name==="lx_member_registration_status"){if(options.switchUser)current="another";return {data:state};}
  if(name==="lx_save_member_adult_verification")return {data:{adult_ready:true}};
  completeCalls++;if(options.error)return {error:{message:options.error}};
  return {data:{registered:true,user_id:current}};
 }};
 const ctx={window:{supabase:{createClient:()=>client}},location:{origin:"https://letshare-tw.github.io",pathname:"/lets-share-test-site/ui-candidate/index.html"},URL};
 vm.runInNewContext(adapterSource,ctx);
 return {api:ctx.window.LX_TEST_AUTH_ADAPTER,rpcCalls,completeCalls:()=>completeCalls,setState:s=>state={...initial,...s}};
}
class Element{
 constructor(tag,doc){this.tagName=tag;this.doc=doc;this.children=[];this.handlers={};this.style={};this.attributes={};this.disabled=false;this.hidden=false;this.checked=false;this.open=false;this._text="";}
 set id(v){this._id=v;this.doc.ids[v]=this;}get id(){return this._id;}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join("");}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
 setAttribute(k,v){this.attributes[k]=v;}
 insertAdjacentElement(position,node){const parent=this.parent,index=parent.children.indexOf(this);node.parent=parent;parent.children.splice(position==="beforebegin"?index:index+1,0,node);}
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
 async fire(type){for(const fn of this.handlers[type]||[])await fn({type});await tick();}
 replaceChildren(...nodes){this.children=[];this._text="";this.append(...nodes);}
 querySelectorAll(tag){return this.children.flatMap(c=>[...(c.tagName===tag?[c]:[]),...c.querySelectorAll(tag)]);}
 focus(){this.doc.focused=this;}showModal(){this.open=true;}close(){this.open=false;}
}
function uiFixture(initial){
 const doc={ids:{},createElement(tag){return new Element(tag,this);},getElementById(id){return this.ids[id];}};
 const root=doc.createElement("main"),anchor=doc.createElement("section");anchor.id="lxMemberProfile";root.append(anchor);
 const reg=doc.createElement("p");reg.textContent="註冊狀態：尚未完成";anchor.append(reg);
 const name=doc.createElement("input");name.id="lxDisplayName";anchor.append(name);
 const win={handlers:{},addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);},async fire(type){for(const fn of this.handlers[type]||[])fn();await tick();}};
 let state=initial,calls=0;
 win.LX_TEST_AUTH_ADAPTER={getRegistrationStatus:async()=>state,saveAdultVerification:async()=>({adult_ready:true}),completeRegistration:async(version,t,p)=>{
  check(version==="fixture-v1"&&t===true&&p===true);calls++;state={...state,registered:true,registration_completed_at:"fixture"};return {registered:true};
 },getProfile:async()=>({registration_completed_at:"fixture"})};
 vm.runInNewContext(uiSource,{window:win,document:doc});
 return {doc,root,win,calls:()=>calls,setState:s=>state=s,card:()=>doc.ids.lxRegistrationCard};
}
(async()=>{
 let f=adapterFixture();check((await f.api.getRegistrationStatus()).phone_verified);
 check(f.api.phoneOtp.enabled===false);
 await reject(f.api.completeRegistration("fixture-v1",true,true),/尚未開放/);check(f.completeCalls()===0);
 await reject(f.api.completeRegistration("fixture-v1",false,true),/閱讀並確認/);
 await reject(adapterFixture({state:{user_id:"other"}}).api.getRegistrationStatus(),/身分已變更/);
 await reject(adapterFixture({switchUser:true}).api.getRegistrationStatus(),/身分已變更/);
 check(await adapterFixture({loggedOut:true}).api.getRegistrationStatus()===null);
 const ready={adult_ready:true,google_verified:true,name_ready:true,phone_verified:true,masked_phone:"09•••••001",registration_enabled:true,legal_ready:true,can_complete:true,registered:false,legal:{version:"fixture-v1",terms_text:"<img onerror=fixture> TEST TERMS",privacy_text:"TEST PRIVACY"}};
 f=adapterFixture({state:ready,error:"REG_LEGAL_VERSION_CHANGED"});
 await reject(f.api.completeRegistration("fixture-v1",true,true),/版本已更新/);check(f.completeCalls()===1);
 f=adapterFixture({state:ready});check((await f.api.completeRegistration("fixture-v1",true,true)).registered);check(f.completeCalls()===1);
 let ui=uiFixture({...ready,registration_enabled:false,legal_ready:false,can_complete:false,legal:null});await tick();
 check(!ui.card().hidden);check(ui.doc.ids.lxCompleteRegistration.disabled);
 check(!ui.doc.ids.lxRegTermsAgree.checked&&ui.doc.ids.lxRegTermsAgree.disabled);
 check(!ui.doc.ids.lxRegPrivacyAck.checked&&ui.doc.ids.lxRegPrivacyAck.disabled);
 ui.doc.ids.lxRegTermsAgree.checked=true;ui.doc.ids.lxRegPrivacyAck.checked=true;
 await ui.doc.ids.lxRegPrivacyAck.fire("change");check(ui.doc.ids.lxCompleteRegistration.disabled);check(ui.calls()===0);
 ui=uiFixture(ready);await tick();check(ui.doc.ids.lxCompleteRegistration.disabled);
 ui.doc.ids.lxRegTermsAgree.checked=true;await ui.doc.ids.lxRegTermsAgree.fire("change");check(ui.doc.ids.lxCompleteRegistration.disabled);
 ui.doc.ids.lxRegPrivacyAck.checked=true;await ui.doc.ids.lxRegPrivacyAck.fire("change");check(!ui.doc.ids.lxCompleteRegistration.disabled);
 const read=ui.root.querySelectorAll("button").find(e=>e.textContent==="閱讀會員條款");await read.fire("click");
 const dialog=ui.root.querySelectorAll("dialog")[0];check(dialog.open);check(dialog.textContent.includes("<img onerror=fixture> TEST TERMS"));
 await ui.doc.ids.lxCompleteRegistration.fire("click");check(ui.calls()===1);check(ui.doc.ids.lxCompleteRegistration.disabled);
 check(ui.card().textContent.includes("會員註冊已完成"));check(ui.root.textContent.includes("註冊狀態：已完成"));
 await ui.doc.ids.lxCompleteRegistration.fire("click");check(ui.calls()===1);
 ui.setState(null);await ui.win.fire("lx-member-state-changed");check(ui.card().hidden);check(!dialog.open);
 check(ui.doc.ids.lxRegBirthDate!==undefined);check(ui.doc.ids.lxRegAdultDeclare!==undefined);
 check(ui.doc.ids.lxRegBirthDate.type==="hidden");
 for(const kind of ["year","month","day"])check(ui.doc.ids["lxBirthWheel-"+kind]!==undefined);
 check(uiSource.includes("touch-action:pan-y"));check(uiSource.includes("scroll-snap-type:y proximity"));check(!uiSource.includes('track.addEventListener("touchmove"'));
 check(uiSource.includes("setWheelDisabled(false);"));
 check(uiSource.includes("const open=data.registration_enabled&&data.legal_ready"));
 check(uiSource.includes("dob.value=year&&month&&day?"));
 check(uiSource.includes("daysInMonth()"));
 ui=uiFixture({...ready,registration_enabled:false,legal_ready:false,can_complete:false,legal:null});await tick();
 check(ui.doc.ids.lxBirthWheelMarker!==undefined);
 check(ui.card().style.cssText.includes("background:#ffffff"));
 check(ui.card().style.cssText.includes("border:1px solid #e5e7eb"));
 check(ui.root.querySelectorAll("h2")[0].style.cssText.includes("color:#222222"));
 check(ui.root.querySelectorAll("button").find(e=>e.textContent==="確認成年資格").style.cssText.includes("background:#12834c"));
 check(ui.doc.ids.lxCompleteRegistration.disabled);
 check(ui.doc.ids.lxBirthWheelMarker.style.cssText.includes("#bfc2c5"));
 check(ui.doc.ids["lxBirthWheel-year"].style.cssText.includes("height:132px"));
 check(ui.doc.ids["lxBirthWheel-year"].style.cssText.includes("padding:44px 0"));
 check(!ui.doc.ids["lxBirthWheel-year"].handlers.touchmove);
 check(ui.doc.ids["lxBirthWheel-month"].children[0].style.cssText.includes("color:#252525"));
 check(ui.doc.ids.lxRegBirthDate.value==="2008-01-01");
 check(!ui.doc.ids["lxBirthWheel-year"].children[0].disabled);
 check(ui.doc.ids.lxRegSaveAdult.disabled);
 await ui.doc.ids["lxBirthWheel-month"].children[1].fire("click");
 check(ui.doc.ids.lxRegBirthDate.value==="2008-02-01");
 check(ui.doc.ids.lxRegSaveAdult.disabled);
 check(ui.doc.ids.lxCompleteRegistration.disabled);
 check(ui.doc.ids.lxRegTermsAgree.disabled);


 check(!uiSource.includes("signInWithOtp")&&!uiSource.includes("updateUser")&&!uiSource.includes("innerHTML"));
 console.log(JSON.stringify({result:"PASS",assertions,realNetworkRequests:0,realConsentWrites:0,realSms:0}));
})().catch(e=>{console.error(e);process.exit(1)});

