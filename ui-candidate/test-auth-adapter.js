"use strict";
/* Test project Auth only. Business API adapter remains locked. */
(()=>{
 const origin="https://letshare-tw.github.io",base="/lets-share-test-site/ui-candidate/";
 const projectRef="rfwqcrvxyjhtmafnbuyy",url="https://"+projectRef+".supabase.co";
 const key="sb_publishable_0TIzPc-ys9IDUz44Ci3a4w_rGwpqPoa";
 const storageKey="lx-test-"+projectRef+"-auth",pendingKey=storageKey+"-pending";
 const contract=Object.freeze({version:"B-01C-07C-02",enabled:true,allowOAuth:true,allowSession:true,allowProfile:false,projectRef,allowedPageOrigin:origin,callbackPath:base+"auth-callback.html"});
 let client;
 function environment(){
  if(location.origin!==origin||![base,base+"index.html",contract.callbackPath].includes(location.pathname))throw Error("登入僅供指定獨立測試站使用");
 }
 function getClient(){
  environment();
  if(!window.supabase?.createClient)throw Error("登入元件未載入，請重新整理或稍後再試");
  if(!client)client=window.supabase.createClient(url,key,{auth:{storageKey,flowType:"pkce",detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
  return client;
 }
 async function verifiedSession(){
  const c=getClient();const {data,error}=await c.auth.getSession();if(error)throw error;
  if(!data.session)return null;
  const check=await c.auth.getUser();
  if(check.error||!check.data.user){await c.auth.signOut({scope:"local"});throw Error("登入狀態已失效，請重新登入");}
  return {user:{id:check.data.user.id,email:check.data.user.email||""}};
 }
 async function signInWithGoogle(){
  const c=getClient();
  localStorage.setItem(pendingKey,String(Date.now()));
  try{
   const {data,error}=await c.auth.signInWithOAuth({provider:"google",options:{redirectTo:origin+contract.callbackPath,skipBrowserRedirect:true,queryParams:{prompt:"select_account"}}});
   if(error)throw error;
   const target=new URL(data.url);if(target.origin!==url||target.pathname!=="/auth/v1/authorize")throw Error("登入目的地不符");
   location.assign(target.href);
  }catch(e){localStorage.removeItem(pendingKey);throw e;}
 }
 async function handleCallback(){
  environment();if(location.pathname!==contract.callbackPath)throw Error("回跳路徑不符");
  const params=new URLSearchParams(location.search),hash=location.hash;
  history.replaceState(null,"",location.pathname);
  const started=Number(localStorage.getItem(pendingKey));localStorage.removeItem(pendingKey);
  if(params.has("error")||hash)throw Error("Google 登入已取消或回跳格式不符，請返回重試");
  const codes=params.getAll("code");
  if(codes.length!==1||!codes[0]||!started||Date.now()-started>600000||Date.now()<started)throw Error("登入回跳已過期或不是從本站發起，請返回重新登入");
  const {error}=await getClient().auth.exchangeCodeForSession(codes[0]);if(error)throw Error("登入驗證未完成，請返回重新登入");
  const session=await verifiedSession();if(!session)throw Error("無法建立登入狀態，請重試");
  return session;
 }
 async function signOut(){
  const c=getClient();const {error}=await c.auth.signOut({scope:"local"});if(error)throw error;
  localStorage.removeItem(pendingKey);
 }
 const deny=async()=>{throw Error("安全鎖定：尚未開放會員資料與業務 API");};
 Object.defineProperty(window,"LX_TEST_AUTH_ADAPTER",{value:Object.freeze({mode:"test-auth-only",contract,signInWithGoogle,handleCallback,getSession:verifiedSession,restoreSession:verifiedSession,signOut,getProfile:deny}),writable:false,configurable:false});
})();
