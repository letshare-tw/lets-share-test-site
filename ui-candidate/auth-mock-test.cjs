const vm=require('vm'),fs=require('fs'),assert=require('assert/strict');
const source=fs.readFileSync(require('path').join(__dirname,'test-auth-adapter.js'),'utf8');
let checks=0;function ok(v){assert(v);checks++;}
function setup(path='index.html',search='',hash='',started=Date.now()){
 const map=new Map(),calls=[];if(started)map.set('lx-test-rfwqcrvxyjhtmafnbuyy-auth-pending',String(started));
 const loc={origin:'https://letshare-tw.github.io',pathname:'/lets-share-test-site/ui-candidate/'+path,search,hash,assign:u=>calls.push(['assign',u])};
 const auth={getSession:async()=>({data:{session:{user:{id:'fake'}}}}),getUser:async()=>({data:{user:{id:'verified',email:'test@example.com'}}}),signOut:async o=>{calls.push(['out',o]);return{}},signInWithOAuth:async o=>{calls.push(['in',o]);return{data:{url:'https://rfwqcrvxyjhtmafnbuyy.supabase.co/auth/v1/authorize?provider=google'}}},exchangeCodeForSession:async code=>{calls.push(['exchange',code]);return{}}};
 const ctx={window:{supabase:{createClient:(...a)=>{calls.push(['client',...a]);return{auth}}}},location:loc,localStorage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},history:{replaceState:()=>calls.push(['clear'])},URL,URLSearchParams,Date,Error};
 vm.runInNewContext(source,ctx);return{a:ctx.window.LX_TEST_AUTH_ADAPTER,ctx,auth,calls,map};
}
(async()=>{
 let s=setup();await s.a.signInWithGoogle();ok(s.calls.some(c=>c[0]==='assign'));let options=s.calls.find(c=>c[0]==='in')[1];ok(options.options.redirectTo==='https://letshare-tw.github.io/lets-share-test-site/ui-candidate/auth-callback.html');ok(options.provider==='google');ok(s.calls.find(c=>c[0]==='client')[3].auth.flowType==='pkce');ok(s.calls.find(c=>c[0]==='client')[3].auth.detectSessionInUrl===false);
 s=setup();ok((await s.a.restoreSession()).user.id==='verified');s.auth.getSession=async()=>({data:{session:null}});ok(await s.a.getSession()===null);
 s=setup();s.auth.getUser=async()=>({error:Error('invalid'),data:{}});await assert.rejects(s.a.getSession());checks++;ok(s.calls.some(c=>c[0]==='out'));
 s=setup();await s.a.signOut();ok(s.map.size===0);ok(s.calls.find(c=>c[0]==='out')[1].scope==='local');await assert.rejects(s.a.getProfile());checks++;
 s=setup('auth-callback.html','?code=valid');ok((await s.a.handleCallback()).user.id==='verified');ok(s.calls[0][0]==='clear');ok(s.calls.some(c=>c[0]==='exchange'));await assert.rejects(s.a.handleCallback());checks++;
 for(const args of [['auth-callback.html',''],['auth-callback.html','?code=x&code=y'],['auth-callback.html','?error=access_denied'],['auth-callback.html','?code=x','#access_token=bad'],['auth-callback.html','?code=x','',Date.now()-700000],['auth-callback.html','?code=x','',0]]){s=setup(...args);await assert.rejects(s.a.handleCallback());checks++;ok(!s.calls.some(c=>c[0]==='exchange'));ok(s.calls[0][0]==='clear');}
 s=setup();s.ctx.location.origin='https://evil.example';await assert.rejects(s.a.signInWithGoogle());checks++;ok(!s.calls.length);
 s=setup('other.html');await assert.rejects(s.a.getSession());checks++;
 s=setup();s.auth.signInWithOAuth=async()=>({data:{url:'https://evil.example/'}});await assert.rejects(s.a.signInWithGoogle());checks++;ok(!s.calls.some(c=>c[0]==='assign'));
 console.log('Auth mock checks PASS:',checks);
})().catch(e=>{console.error(e);process.exitCode=1});
