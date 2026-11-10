"use strict";
(()=>{
 const auth=window.LX_TEST_AUTH_ADAPTER,status=document.getElementById("authStatus"),login=document.getElementById("googleLogin"),logout=document.getElementById("googleLogout");
 const panel=document.createElement("section");panel.id="lxMemberProfile";panel.setAttribute("aria-label","會員基本資料");panel.hidden=true;
 panel.style.margin="18px 0";panel.style.padding="16px";panel.style.border="1px solid #e1e9e3";panel.style.borderRadius="14px";
 const heading=document.createElement("div");heading.style.display="flex";heading.style.alignItems="center";heading.style.gap="14px";
 const avatar=document.createElement("img");avatar.alt="Google 帳號頭像";avatar.width=64;avatar.height=64;avatar.referrerPolicy="no-referrer";avatar.style.cssText="width:64px;height:64px;border-radius:50%;object-fit:cover;display:none;background:#eef4ee";
 const fallback=document.createElement("span");fallback.textContent="👤";fallback.setAttribute("aria-label","預設會員頭像");fallback.style.cssText="display:flex;width:64px;height:64px;align-items:center;justify-content:center;border-radius:50%;background:#eef4ee;font-size:34px;flex-shrink:0";
 const identity=document.createElement("div");identity.style.minWidth="0";
 const name=document.createElement("p"),email=document.createElement("p"),registration=document.createElement("p"),feedback=document.createElement("p");
 name.style.margin="0 0 5px";email.style.cssText="margin:0;overflow-wrap:anywhere;font-size:14px";registration.style.margin="14px 0";feedback.style.cssText="font-size:14px;color:#a44";
 identity.append(name,email);heading.append(avatar,fallback,identity);
 const edit=document.createElement("div");edit.style.marginTop="14px";
 const label=document.createElement("label");label.textContent="編輯會員名稱（2～30 字元）";label.htmlFor="lxDisplayName";label.style.display="block";
 const input=document.createElement("input");input.id="lxDisplayName";input.type="text";input.maxLength=60;input.autocomplete="nickname";input.placeholder="請輸入會員名稱";input.style.cssText="display:block;box-sizing:border-box;width:100%;max-width:360px;padding:10px;margin:8px 0;border:1px solid #aeb9af;border-radius:8px;font-size:16px";
 const save=document.createElement("button");save.type="button";save.textContent="儲存名稱";save.style.cssText="background:#12834c;color:white;border:0;border-radius:8px;padding:10px 18px;font-size:16px";
 edit.append(label,input,save);panel.append(heading,registration,edit,feedback);status.insertAdjacentElement("afterend",panel);

 // C06: phone change controls staged, SMS hard-disabled pending separate authorization.
 const contact=document.createElement("section");contact.id="lxMemberContact";contact.hidden=true;contact.style.cssText="margin:16px 0;padding:16px;border:1px solid #e1e9e3;border-radius:14px";
 const h=document.createElement("h2");h.textContent="手機與取件地址";h.style.cssText="font-size:19px;margin:0 0 12px";
 const phoneState=document.createElement("p");phoneState.setAttribute("aria-live","polite");
 const phoneLabel=document.createElement("label");phoneLabel.textContent="手機號碼（台灣）";phoneLabel.htmlFor="lxPhone";
 const phoneInput=document.createElement("input");phoneInput.id="lxPhone";phoneInput.type="tel";phoneInput.autocomplete="tel";phoneInput.inputMode="tel";phoneInput.placeholder="09xxxxxxxx";phoneInput.maxLength=13;phoneInput.disabled=true;
 const otpButton=document.createElement("button");otpButton.type="button";otpButton.textContent="發送驗證碼（尚未啟用）";otpButton.disabled=true;
 const otpInput=document.createElement("input");otpInput.type="text";otpInput.inputMode="numeric";otpInput.placeholder="六位數驗證碼";otpInput.maxLength=6;otpInput.autocomplete="one-time-code";otpInput.disabled=true;
 const otpVerify=document.createElement("button");otpVerify.type="button";otpVerify.textContent="驗證手機（尚未啟用）";otpVerify.disabled=true;
 const smsNotice=document.createElement("p");smsNotice.textContent="公開測試站暫停發送簡訊；已驗證的手機狀態照常顯示。";smsNotice.style.cssText="font-size:13px;color:#9b501b";
 const phoneFeedback=document.createElement("p");phoneFeedback.setAttribute("role","status");phoneFeedback.style.cssText="font-size:14px;color:#366b4b";
 phoneInput.addEventListener("input",()=>{
  const value=phoneInput.value.trim();
  if(!value){phoneFeedback.textContent="請輸入 09 開頭的十碼手機號碼";return;}
  try{const normalized=auth.normalizeTaiwanPhone(value);phoneFeedback.textContent="手機格式正確："+normalized+"；SMS 發送尚未啟用。";}
  catch(e){phoneFeedback.textContent=e.message;}
 });
 otpButton.addEventListener("click",async()=>{
  if(!auth.phoneOtp.enabled){phoneFeedback.textContent=auth.phoneOtp.reason;return;}
  if(busy||!activeUserId)return;
  const token=version,userId=activeUserId;busy=true;otpButton.disabled=true;
  try{await auth.requestPhoneOtp(phoneInput.value);if(token===version&&userId===activeUserId){phoneFeedback.textContent="驗證碼已發送，請輸入六位數驗證碼";otpInput.disabled=false;otpVerify.disabled=false;}}
  catch(e){if(token===version)phoneFeedback.textContent=e.message;}
  finally{busy=false;if(token===version)otpButton.disabled=!auth.phoneOtp.enabled;}
 });
 otpVerify.addEventListener("click",async()=>{
  if(!auth.phoneOtp.enabled){phoneFeedback.textContent=auth.phoneOtp.reason;return;}
  if(busy||!activeUserId)return;
  const token=version,userId=activeUserId;busy=true;otpVerify.disabled=true;
  try{const result=await auth.verifyPhoneOtp(phoneInput.value,otpInput.value);if(token!==version||userId!==activeUserId||result.userId!==userId)return;otpInput.value="";otpInput.disabled=true;phoneState.textContent="手機已驗證："+result.phone;phoneFeedback.textContent="手機驗證成功，會員 ID 保持不變";}
  catch(e){if(token===version)phoneFeedback.textContent=e.message;}
  finally{busy=false;if(token===version)otpVerify.disabled=!auth.phoneOtp.enabled;}
 });
 const fields=[["address_city","縣市","例如：臺南市",20],["address_district","鄉鎮市區","例如：安南區",20],["address_street","街道門牌","路名、巷弄及門牌",120],["address_detail","樓層／補充地址","例如：3樓之2",120],["home_placement_note","衣物放置位置","例如：管理室旁指定置物架",200]];
 const districts={
 "臺南市":"中西區 東區 南區 北區 安平區 安南區 永康區 歸仁區 新化區 左鎮區 玉井區 楠西區 南化區 仁德區 關廟區 龍崎區 官田區 麻豆區 佳里區 西港區 七股區 將軍區 學甲區 北門區 新營區 後壁區 白河區 東山區 六甲區 下營區 柳營區 鹽水區 善化區 大內區 山上區 新市區 安定區".split(" "),
 "高雄市":"新興區 前金區 苓雅區 鹽埕區 鼓山區 旗津區 前鎮區 三民區 楠梓區 小港區 左營區 仁武區 大社區 岡山區 路竹區 阿蓮區 田寮區 燕巢區 橋頭區 梓官區 彌陀區 永安區 湖內區 鳳山區 大寮區 林園區 鳥松區 大樹區 旗山區 美濃區 六龜區 內門區 杉林區 甲仙區 桃源區 那瑪夏區 茂林區 茄萣區".split(" "),
 "臺北市":"中正區 大同區 中山區 松山區 大安區 萬華區 信義區 士林區 北投區 內湖區 南港區 文山區".split(" "),
 "新北市":"板橋區 三重區 中和區 永和區 新莊區 新店區 土城區 蘆洲區 樹林區 鶯歌區 三峽區 淡水區 汐止區 瑞芳區 五股區 泰山區 林口區 八里區 深坑區 石碇區 坪林區 三芝區 石門區 金山區 萬里區 平溪區 雙溪區 貢寮區 烏來區".split(" "),
 "臺中市":"中區 東區 南區 西區 北區 北屯區 西屯區 南屯區 太平區 大里區 霧峰區 烏日區 豐原區 后里區 石岡區 東勢區 和平區 新社區 潭子區 大雅區 神岡區 大肚區 沙鹿區 龍井區 梧棲區 清水區 大甲區 外埔區 大安區".split(" "),
 "桃園市":"桃園區 中壢區 平鎮區 八德區 楊梅區 蘆竹區 大溪區 龜山區 大園區 觀音區 新屋區 龍潭區 復興區".split(" ")
 };
 function setOptions(select,values,placeholder){
  select.dataset.values=JSON.stringify(values);
  select.dataset.placeholder=placeholder;
  if(!values.includes(select.value))select.value="";
  select.textContent=select.value||placeholder;
  select.setAttribute("aria-label",select.value||placeholder);
 }
 function chooseOption(select,value){
  select.value=value;select.textContent=value||select.dataset.placeholder||"請選擇";
  select.dispatchEvent(new Event("change",{bubbles:true}));
 }
 function closeMenus(except){
  for(const el of Object.values(inputs))if(el.dataset?.picker==="true"&&el!==except){el.nextElementSibling.hidden=true;el.setAttribute("aria-expanded","false");}
 }
 function makePicker(key,labelText){
  const btn=document.createElement("button");btn.type="button";btn.dataset.picker="true";btn.value="";
  btn.setAttribute("aria-haspopup","listbox");btn.setAttribute("aria-expanded","false");btn.setAttribute("aria-label",labelText);
  btn.style.cssText="display:block;box-sizing:border-box;width:100%;max-width:420px;padding:12px;text-align:left;background:#f4f5f4;color:#222;border:1px solid #aeb9af;border-radius:8px;font-size:16px";
  const menu=document.createElement("div");menu.hidden=true;menu.setAttribute("role","listbox");
  menu.style.cssText="box-sizing:border-box;width:100%;max-width:420px;max-height:260px;overflow-y:auto;border:1px solid #b9c8bc;border-radius:10px;background:white;box-shadow:0 5px 16px #0002;margin:-3px 0 12px";
  btn.addEventListener("click",()=>{
   if(btn.disabled)return;
   const opening=menu.hidden;closeMenus(btn);menu.hidden=!opening;btn.setAttribute("aria-expanded",String(opening));
   if(!opening)return;
   menu.replaceChildren();
   for(const value of JSON.parse(btn.dataset.values||"[]")){
    const option=document.createElement("button");option.type="button";option.textContent=value;option.setAttribute("role","option");
    option.setAttribute("aria-selected",String(btn.value===value));
    option.style.cssText="display:block;width:100%;padding:13px 16px;text-align:left;border:0;border-bottom:1px solid #eee;background:white;color:#222;font-size:16px";
    option.addEventListener("click",()=>{chooseOption(btn,value);menu.hidden=true;btn.setAttribute("aria-expanded","false");btn.focus();});
    menu.append(option);
   }
  });
  btn.addEventListener("keydown",e=>{if(e.key==="Escape"){menu.hidden=true;btn.setAttribute("aria-expanded","false");}});
  return {btn,menu};
 }
 const inputs={};
 for(const [key,title,placeholder,max] of fields){
  const label=document.createElement("label");label.textContent=title;label.htmlFor="lx-"+key;
  const picker=key==="address_city"||key==="address_district"?makePicker(key,title):null;
  const el=picker?picker.btn:key==="home_placement_note"?document.createElement("textarea"):document.createElement("input");
  el.id="lx-"+key;if(!picker){el.placeholder=placeholder;el.maxLength=max;}el.disabled=true;
  if(!picker)el.style.cssText="display:block;box-sizing:border-box;width:100%;max-width:420px;padding:10px;margin:6px 0 12px;border:1px solid #aeb9af;border-radius:8px;font-size:16px";
  inputs[key]=el;contact.append(label,el);if(picker)contact.append(picker.menu);
 }
 setOptions(inputs.address_city,Object.keys(districts),"請選擇縣市");
 setOptions(inputs.address_district,[],"請先選擇縣市");
 inputs.address_city.addEventListener("change",()=>{
  setOptions(inputs.address_district,districts[inputs.address_city.value]||[],"請選擇行政區");
  inputs.address_district.value="";inputs.address_district.textContent="請選擇行政區";
 });
 const addressSave=document.createElement("button");addressSave.type="button";addressSave.textContent="儲存取件地址";addressSave.disabled=true;addressSave.style.cssText="background:#12834c;color:white;border:0;border-radius:8px;padding:11px 18px;font-size:16px";
 const addressFeedback=document.createElement("p");addressFeedback.setAttribute("role","status");addressFeedback.style.cssText="font-size:14px;color:#366b4b";
 const phoneBox=document.createElement("div");phoneBox.style.cssText="display:grid;gap:8px;margin-bottom:20px";
 for(const e of [phoneLabel,phoneInput,phoneState,phoneFeedback,otpButton,otpInput,otpVerify,smsNotice])phoneBox.append(e);
 contact.prepend(h,phoneBox);contact.append(addressSave,addressFeedback);panel.insertAdjacentElement("afterend",contact);
 function clearContact(){closeMenus();contact.hidden=true;phoneState.textContent="";phoneFeedback.textContent="";phoneInput.value="";otpInput.value="";addressFeedback.textContent="";for(const el of Object.values(inputs)){el.value="";el.disabled=true;}addressSave.disabled=true;}
 function paintContact(session,profile){
  contact.hidden=false;phoneInput.value=session.user.phone||"";phoneInput.disabled=false;otpInput.disabled=true;otpButton.disabled=true;otpVerify.disabled=true;
  phoneState.textContent=session.user.phoneVerified&&session.user.phone?"手機已驗證："+session.user.phone:"手機尚未驗證";
  if(profile){
   const city=profile.address_city||"",district=profile.address_district||"";
   if(city&&!districts[city]){districts[city]=[district].filter(Boolean);setOptions(inputs.address_city,Object.keys(districts),"請選擇縣市");}
   inputs.address_city.value=city;inputs.address_city.textContent=city||"請選擇縣市";
   setOptions(inputs.address_district,districts[city]||[],"請選擇行政區");
   if(district&&!districts[city]?.includes(district)){setOptions(inputs.address_district,[...(districts[city]||[]),district],"請選擇行政區");}
   inputs.address_district.value=district;inputs.address_district.textContent=district||"請選擇行政區";
   for(const key of Object.keys(inputs))if(key!=="address_city"&&key!=="address_district")inputs[key].value=profile[key]||"";
   for(const el of Object.values(inputs))el.disabled=false;addressSave.disabled=false;
  }
  else{addressFeedback.textContent="尚未建立會員資料，地址暫時無法儲存。";}
 }
 addressSave.addEventListener("click",async()=>{
  if(busy||!profileExists||!activeUserId)return;
  const values=Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value]));
  if(!values.address_city.trim()||!values.address_district.trim()||!values.address_street.trim()){addressFeedback.textContent="請填寫縣市、行政區及街道門牌。";return;}
  const token=version,userId=activeUserId;busy=true;addressSave.disabled=true;logout.disabled=true;addressFeedback.textContent="儲存中…";
  try{
   await auth.saveAddress(values);
   if(token!==version||userId!==activeUserId)return;
   const latest=await auth.getProfile();
   if(token!==version||userId!==activeUserId)return;
   if(!latest||Object.keys(values).some(k=>latest[k]!==values[k].trim()))throw Error("重新讀取驗證失敗");
   for(const k of Object.keys(inputs))inputs[k].value=latest[k]||"";
   addressFeedback.textContent="取件地址已儲存，重新讀取驗證成功。";
  }catch(_){if(token===version)addressFeedback.textContent="地址儲存未完成："+String(_?.message||"未知錯誤");}
  finally{busy=false;if(token===version){addressSave.disabled=false;logout.disabled=false;}}
 });

 let busy=false,version=0,activeUserId="",profileExists=false;
 function reset(){clearContact();version++;activeUserId="";profileExists=false;panel.hidden=true;avatar.removeAttribute("src");avatar.style.display="none";fallback.style.display="flex";name.textContent=email.textContent=registration.textContent=feedback.textContent="";input.value="";input.disabled=save.disabled=true;}
 function showAvatar(url){avatar.removeAttribute("src");avatar.style.display="none";fallback.style.display="flex";if(!url)return;avatar.onload=()=>{avatar.style.display="block";fallback.style.display="none";};avatar.onerror=()=>{avatar.style.display="none";fallback.style.display="flex";};avatar.src=url;}
 function paint(session){
  status.textContent=session?"已登入測試帳號："+session.user.email:"尚未登入測試帳號";
  login.hidden=!!session;logout.hidden=!session;reset();
  if(session){activeUserId=session.user.id;panel.hidden=false;showAvatar(session.user.avatarUrl);loadProfile(session,version);}
  window.dispatchEvent(new Event("lx-member-state-changed"));
 }
 async function loadProfile(session,token){
  name.textContent="會員名稱：讀取中…";email.textContent="電子郵件："+session.user.email;registration.textContent="註冊狀態：確認中…";
  try{
   const profile=await auth.getProfile();if(token!==version||activeUserId!==session.user.id)return;
   profileExists=!!profile;
   if(!profile){paintContact(session,null);name.textContent="會員名稱："+(session.user.googleName||"尚未設定");registration.textContent="註冊狀態：尚未建立會員資料";feedback.textContent="尚未建立會員資料，暫時無法儲存名稱。";return;}
   paintContact(session,profile);
   name.textContent="會員名稱："+(profile.display_name?.trim()||session.user.googleName||"尚未設定");
   input.value=profile.display_name||"";input.disabled=save.disabled=false;
   registration.textContent="註冊狀態："+(profile.registration_completed_at?"已完成":"尚未完成");
  }catch(_){if(token!==version)return;name.textContent="會員名稱：暫無法取得";registration.textContent="註冊狀態：暫無法確認";feedback.textContent="會員資料讀取失敗，請稍後重新整理。";}
 }
 async function action(task){if(busy)return;busy=true;login.disabled=logout.disabled=true;try{await task();}catch(_){status.textContent="登入操作未完成，請檢查網路後重試。";}finally{busy=false;login.disabled=logout.disabled=false;}}
 save.addEventListener("click",async()=>{
  if(busy||!profileExists||!activeUserId)return;
  const value=input.value.trim(),length=Array.from(value).length;
  if(length<2||length>30){feedback.textContent="會員名稱須為 2～30 個字元，不能只輸入空白。";return;}
  busy=true;save.disabled=input.disabled=logout.disabled=true;feedback.textContent="儲存中…";
  const token=version,userId=activeUserId;
  try{
   await auth.saveDisplayName(value);
   if(token!==version||userId!==activeUserId)return;
   const profile=await auth.getProfile();
   if(token!==version||userId!==activeUserId)return;
   if(!profile||profile.display_name!==value)throw Error("重新讀取驗證失敗");
   name.textContent="會員名稱："+profile.display_name;input.value=profile.display_name;feedback.textContent="會員名稱已儲存。";
   window.dispatchEvent(new Event("lx-member-state-changed"));
  }catch(_){if(token===version)feedback.textContent="儲存失敗或驗證未完成，請稍後重試。";}
  finally{busy=false;if(token===version){save.disabled=input.disabled=false;logout.disabled=false;}}
 });
 login.addEventListener("click",()=>action(()=>auth.signInWithGoogle()));
 logout.addEventListener("click",()=>action(async()=>{reset();await auth.signOut();paint(null);}));
 action(async()=>paint(await auth.restoreSession()));
})();

