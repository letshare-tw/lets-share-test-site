"use strict";
/* Explicit, read-only Google Session probe. Never considers an empty target table proof. */
(()=>{
 const panel=document.createElement("details");panel.className="share-status-panel";
 panel.innerHTML='<summary>分享隔離驗收工具（工程測試）</summary><p>先由小P確認另一個測試帳號的草稿及照片確實存在，再於此用目前 Google Session 測試。空資料不能算隔離 PASS。本工具不寫入資料。</p><label>另一測試帳號的草稿識別碼<input id="shareProbeRequest" autocomplete="off"></label><label>該草稿照片路徑（有照片才填）<input id="shareProbePhoto" autocomplete="off"></label><button type="button">執行分享唯讀隔離驗收</button><pre role="status" style="white-space:pre-wrap"></pre>';
 document.querySelector("#view-member .section").append(panel);const button=panel.querySelector("button"),out=panel.querySelector("pre");let seq=0;
 button.addEventListener("click",async()=>{const token=++seq;button.disabled=true;out.textContent="驗收中…";try{const results=await window.LX_TEST_AUTH_ADAPTER.shareIsolationProbe(document.getElementById("shareProbeRequest").value.trim(),document.getElementById("shareProbePhoto").value.trim());if(token!==seq)return;out.textContent=results.map(r=>r.target+"："+r.status).join("\n")+"\n只有確認目標資料存在且屬其他帳號，DENIED 才可列為隔離 PASS。未填照片路徑＝Storage 未驗收。";}catch(e){if(token===seq)out.textContent=e.message;}finally{if(token===seq)button.disabled=false;}});
 function reset(){++seq;out.textContent="登入狀態已變更，請重新驗收。";panel.querySelectorAll("input").forEach(el=>el.value="");button.disabled=false;}
 window.addEventListener("lx-share-session-changed",reset);window.addEventListener("lx-member-state-changed",reset);
 const sizes=document.createElement("details");sizes.className="share-status-panel";
 sizes.innerHTML='<summary>照片大小限制驗收（工程測試）</summary><p>明確執行後，使用本人草稿路徑向 Storage 上傳 100000 與 100001 bytes 的暫存測試圖，隨即清理；不變更草稿照片、協議或提交紀錄。</p><button type="button">執行照片大小與清理驗收</button><pre role="status" style="white-space:pre-wrap"></pre>';
 panel.insertAdjacentElement("afterend",sizes);const sizeButton=sizes.querySelector("button"),sizeOut=sizes.querySelector("pre");let running=false;
 sizeButton.addEventListener("click",async()=>{if(running)return;running=true;sizeButton.disabled=true;sizeOut.textContent="驗收中…";try{const result=await window.LX_TEST_AUTH_ADAPTER.sharePhotoLimitProbe();sizeOut.textContent=result.map(r=>r.bytes+" bytes："+r.status+"；暫存檔清理："+r.cleanup).join("\n");}catch(_){sizeOut.textContent="驗收未完成。請確認已登入並儲存本人草稿；若曾開始上傳，需核對暫存檔清理。";}finally{running=false;sizeButton.disabled=false;}});
 window.addEventListener("lx-share-session-changed",()=>{sizeOut.textContent="登入狀態已變更，請重新驗收。";});
})();
