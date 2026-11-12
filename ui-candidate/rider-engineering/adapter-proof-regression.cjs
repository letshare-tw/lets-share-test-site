const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const d=new JSDOM('',{runScripts:'outside-only',url:'https://letshare-tw.github.io/lets-share-test-site/ui-candidate/rider.html'}),w=d.window;
 let uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',uploads=0;
 const sdk={auth:{onAuthStateChange:()=>{},getSession:async()=>({data:{session:{user:{id:uid}}}}),getUser:async()=>({data:{user:{id:uid,email:'test@example.invalid',user_metadata:{}}}})},storage:{from:()=>({upload:async()=>{uploads++;return{};},remove:async()=>({})})},functions:{invoke:async()=>({data:{data:{ok:true}}})}};
 w.supabase={createClient:()=>sdk};w.eval(fs.readFileSync(path.join(__dirname,'..','test-auth-adapter.js'),'utf8'));const a=w.LX_TEST_AUTH_ADAPTER;
 const pathOwn=uid+'/w/t/rider1/pickup/image/file.webp';await a.riderProofUpload(pathOwn,new w.Blob([new Uint8Array(100000)],{type:'image/webp'}),uid);assert.equal(uploads,1);
 await assert.rejects(()=>a.riderProofUpload(pathOwn,new w.Blob([new Uint8Array(100001)],{type:'image/webp'}),uid));assert.equal(uploads,1);
 await assert.rejects(()=>a.riderProofUpload('other/w/t/file.webp',new w.Blob([1],{type:'image/webp'}),uid));assert.equal(uploads,1);
 assert.equal((await a.riderRequest('bootstrap',{},uid)).ok,true);
 sdk.functions.invoke=async()=>{uid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';return {data:{data:{secret:'old'}}};};
 await assert.rejects(()=>a.riderRequest('bootstrap',{},'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));
 d.window.close();console.log('PASS: real adapter on rider.html, 100000 accepted / 100001 and foreign owner refused before upload; late API result rejected after account change. Mock SDK, not actual Storage.');
})().catch(e=>{console.error(e);process.exitCode=1;});
