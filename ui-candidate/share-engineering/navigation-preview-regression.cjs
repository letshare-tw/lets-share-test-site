// jsdom@26.1.0; actual navigation component with mocked identity validation. No external requests.
const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dom=new JSDOM('<div id="placeInfo"></div>',{runScripts:'outside-only',url:'https://letshare-tw.github.io/lets-share-test-site/ui-candidate/index.html'}),w=dom.window;
w.eval(fs.readFileSync(path.join(__dirname,'..','navigation-preview.js'),'utf8'));
const nav=w.LX_NAVIGATION_PREVIEW,wait=()=>new Promise(r=>setTimeout(r,5));
(async()=>{
 const address='臺南市測試區測試路1號 & travelmode=driving #定位',u=new URL(nav.buildUrl(address));
 assert.equal(u.origin,'https://www.google.com');assert.equal(u.pathname,'/maps/dir/');assert.equal(u.searchParams.get('destination'),address);assert.equal(u.searchParams.get('travelmode'),'two-wheeler');assert.equal(u.searchParams.get('api'),'1');assert.equal(u.searchParams.has('dir_action'),false);assert.equal(u.searchParams.size,3);assert.equal(u.hash,'');
 for(const a of ['',null,'短','測試地址\n含控制字元','字'.repeat(251)])assert.throws(()=>nav.buildUrl(a));
 let ctx=null,valid=true,checks=0,urls=[],release;
 const instance=nav.mount({host:w.document.getElementById('placeInfo'),getContext:()=>ctx,validateContext:async()=>{checks++;return valid;},navigate:url=>urls.push(url)}),button=w.document.getElementById('shareNavigationPreview');
 assert.equal(button.disabled,true);ctx={userId:'A',selectionKey:'home:',address:'臺南市測試區測試路1號',eligible:true};instance.refresh();assert.equal(button.disabled,false);assert.equal(checks,0,'render must not call any backend or Maps');
 button.click();button.click();await wait();assert.equal(urls.length,1,'duplicate click sends one navigation');assert.equal(checks,1);
 valid=false;button.click();await wait();assert.equal(urls.length,1,'server mismatch must prevent navigation');
 ctx.eligible=false;instance.refresh();assert.equal(button.disabled,true,'dirty/busy context blocked');ctx=null;instance.refresh();assert.equal(button.disabled,true,'signout clears entry');
 const host=w.document.createElement('div');w.document.body.append(host);ctx={userId:'A',selectionKey:'home:',address:'臺南市測試區測試路1號',eligible:true};
 const race=nav.mount({host,getContext:()=>ctx,validateContext:()=>new Promise(r=>release=r),navigate:url=>urls.push(url)});const b=host.nextElementSibling.querySelector('button');b.click();ctx={...ctx,userId:'B'};race.refresh();release(true);await wait();assert.equal(urls.length,1,'account switch during validation must not transmit old address');
 console.log('PASS: exact motorcycle parameters, encoded address, input validation, no automatic Maps request, login/dirty gates, duplicate click, fresh backend check and account-switch race. Mock validation; not native Google Maps acceptance.');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
