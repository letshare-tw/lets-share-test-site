// Boundary and failure-path tests. Mocked SDK/encoder; not a real camera test.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..'),actor='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';let uploads=0;
const window={dispatchEvent(){},supabase:{createClient:()=>({auth:{onAuthStateChange(){},getSession:async()=>({data:{session:{}}}),getUser:async()=>({data:{user:{id:actor,user_metadata:{}}}})},storage:{from:()=>({upload:async()=>{uploads++;return {};}})}})}};
vm.runInNewContext(fs.readFileSync(path.join(root,'test-auth-adapter.js'),'utf8'),{window,location:{origin:'https://letshare-tw.github.io',pathname:'/lets-share-test-site/ui-candidate/index.html'},setTimeout,URL,Event:class{}});
const source=fs.readFileSync(path.join(root,'app.js'),'utf8'),start=source.indexOf('async function compress(file)'),end=source.indexOf(' photo.addEventListener("change"',start);
function encoder(sizes,type='image/webp'){
 let calls=0,revoked=0;const canvas={getContext:()=>({fillRect(){},drawImage(){}}),toBlob:cb=>cb({type,size:sizes[Math.min(calls++,sizes.length-1)]})};
 const ctx={Image:class{naturalWidth=4032;naturalHeight=3024;async decode(){}},URL:{createObjectURL:()=>'',revokeObjectURL:()=>revoked++},document:{createElement:()=>canvas}};
 vm.createContext(ctx);const compress=vm.runInContext('('+source.slice(start,end).trim()+')',ctx);return {compress,get calls(){return calls},get revoked(){return revoked}};
}
(async()=>{
 const target=actor+'/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/123-test.webp',upload=window.LX_TEST_AUTH_ADAPTER.shareUpload;
 await upload(target,{size:100000,type:'image/webp'},actor);assert.equal(uploads,1);
 await assert.rejects(upload(target,{size:100001,type:'image/webp'},actor),/100KB/);assert.equal(uploads,1,'oversize must never reach Storage');
 await assert.rejects(upload(target,{size:0,type:'image/webp'},actor),/100KB/);
 await assert.rejects(upload(target,{size:90000,type:'text/plain'},actor),/100KB/);
 const retry=encoder([180000,100001,100000]);assert.equal((await retry.compress({type:'image/jpeg',size:4000000})).size,100000);assert.equal(retry.calls,3);assert.equal(retry.revoked,1);
 const failure=encoder([100001]);await assert.rejects(failure.compress({type:'image/png',size:4000000}),/100KB/);assert.equal(failure.calls,8);assert.equal(failure.revoked,1);
 const fallback=encoder([120000,98000],'image/png');assert.equal((await fallback.compress({type:'image/jpeg',size:4000000})).size,98000);
 console.log('PASS: exact 100000 accepted; 100001/empty/wrong MIME refused before upload; encoder retries/fallback/failure and URL cleanup verified. Mocked SDK/encoder only.');
})().catch(e=>{console.error(e);process.exitCode=1;});
