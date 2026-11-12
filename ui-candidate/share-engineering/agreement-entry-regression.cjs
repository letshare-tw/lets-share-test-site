// Requires jsdom@26.1.0. Uses actual UI scripts with a mocked backend, not Google Session acceptance.
const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,10));
function fixture(agreed=false,userId='test-A',version='SHARE-TEST-V1'){
 return {userId,draft:null,address:{home_address:'測試用完整地址'},points:[],bags:[],submission_enabled:true,service:{published:true,version,content:'測試全文\n'.repeat(100),published_at:'2026-11-11T00:00:00Z',submission_enabled:true,activated:agreed,agreed_at:agreed?'2026-11-12T00:00:00Z':null}};
}
function setup(initial,defer=false){
 const dom=new JSDOM(html,{url:'https://letshare-tw.github.io/lets-share-test-site/ui-candidate/index.html',runScripts:'outside-only'}),w=dom.window;
 let data=initial,writes=0,release,first=true,opens=0;
 w.scrollTo=()=>{};w.requestAnimationFrame=cb=>cb();
 w.HTMLDialogElement.prototype.showModal=function(){opens++;this.setAttribute('open','');};
 w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 const api={bootstrap:async()=>{if(defer&&first){first=false;await new Promise(r=>release=r);}return structuredClone(data);},activate:async()=>{writes++;data.service.activated=true;data.service.agreed_at='2026-11-12T00:00:00Z';return structuredClone(data.service);}};
 w.LX_ADAPTER_SELECTOR={getAdapter:()=>api};
 for(const file of ['share-agreement-ui.js','app.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
 const $=id=>w.document.getElementById(id),go=n=>w.document.querySelector('.bottom [data-go="'+n+'"]').click();
 return {dom,w,$,go,set:data2=>data=data2,release:()=>release(),get writes(){return writes},get opens(){return opens}};
}
(async()=>{
 const a=setup(fixture());await tick();assert.equal(a.opens,0,'home must not auto-open');a.go('share');await tick();assert.equal(a.opens,1);assert.ok(a.$('lxShareAgreementDialog').open);assert.equal(a.writes,0,'opening must never accept consent');
 const slider=a.$('lxShareAgreementSlider');assert.equal(slider.disabled,true,'scroll gate remains locked');
 a.w.document.querySelector('.share-agreement-close').click();a.go('share');await tick();assert.equal(a.opens,1,'same-view click must not loop');a.go('home');a.go('share');await tick();assert.equal(a.opens,2,'unagreed return must prompt again');a.w.document.querySelector('.share-agreement-close').click();a.w.dispatchEvent(new a.w.Event('lx-share-session-changed'));await tick();assert.equal(a.opens,3,'unagreed same-account re-login must recheck consent');a.dom.window.close();
 const b=setup(fixture(true));await tick();b.go('share');await tick();assert.equal(b.opens,0,'persisted consent must skip prompt');assert.match(b.$('shareTerms').textContent,/查看已同意/);b.$('shareTerms').click();await tick();assert.equal(b.opens,1);assert.equal(b.$('lxShareAgreementSlider').disabled,true);assert.match(b.$('lxShareAgreementHint').textContent,/才需重新確認/);b.$('lxShareAgreementSlider').value='100';b.$('lxShareAgreementSlider').dispatchEvent(new b.w.Event('change'));assert.equal(b.writes,0,'read-only review must not write consent again');b.w.document.querySelector('.share-agreement-close').click();
 b.set(fixture(false,'test-B'));b.w.dispatchEvent(new b.w.Event('lx-share-session-changed'));await tick();assert.equal(b.opens,2,'another account must not inherit consent');b.w.document.querySelector('.share-agreement-close').click();b.set(fixture(false,'test-B','SHARE-TEST-V2'));b.$('shareReload').click();await tick();assert.equal(b.opens,3,'new version must prompt');b.dom.window.close();
 const c=setup(fixture(),true);c.go('share');assert.equal(c.opens,0);c.release();await tick();assert.equal(c.opens,1,'fast navigation must prompt after bootstrap resolves');c.dom.window.close();
 const d=setup(fixture(),true);d.go('share');d.go('home');d.release();await tick();assert.equal(d.opens,0,'late response must not open over another tab');d.dom.window.close();
 const e=setup(fixture(true));await tick();e.go('share');await tick();assert.equal(e.opens,0,'fresh page with server consent must not repeat');e.dom.window.close();
 console.log('PASS: entry prompt, persisted consent, read-only review, account/version isolation, scroll gate, fast navigation and late-response suppression. Mocked backend only; no consent writes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
