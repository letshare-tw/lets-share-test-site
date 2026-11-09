"use strict";
(()=>{
 const message=document.getElementById("message");
 window.LX_TEST_AUTH_ADAPTER.handleCallback().then(()=>{message.textContent="登入成功，返回賣場中…";location.replace("./index.html");}).catch(e=>{message.textContent=e.message||"登入未完成，請返回重試。";});
})();
