"use strict";
(()=>{
 const message=document.getElementById('message');
 window.LX_TEST_AUTH_ADAPTER.handleCallback().then(()=>{
  const returnArtisan=sessionStorage.getItem('lx-test-auth-return')==='artisan';
  sessionStorage.removeItem('lx-test-auth-return');
  message.textContent=returnArtisan?'登入成功，返回職人工作站中…':'登入成功，返回賣場中…';
  location.replace(returnArtisan?'./artisan.html':'./index.html');
 }).catch(e=>{sessionStorage.removeItem('lx-test-auth-return');message.textContent=e.message||'登入未完成，請返回重試。';});
})();
