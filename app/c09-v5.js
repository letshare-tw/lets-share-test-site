// P1-FIX test branch only. No service-role credentials or production endpoint.
// Only a page served from loopback may inject isolated test endpoints.
const loopback=['127.0.0.1','localhost'].includes(location.hostname);
const localConfig=loopback?globalThis.__P1_LOCAL_TEST_CONFIG__:null;
const localUrl=(value)=>{try{const u=new URL(value);return u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname);}catch{return false;}};
const CONFIG=Object.freeze({
  base:localConfig&&localUrl(localConfig.base)?localConfig.base:'https://rfwqcrvxyjhtmafnbuyy.supabase.co',
  key:localConfig&&localUrl(localConfig.base)?String(localConfig.key||''):'',
  submitEndpoint:localConfig&&localUrl(localConfig.submitEndpoint)?localConfig.submitEndpoint:'',
  sessionKey:'lx_supabase_auth_v066g',
  bucket:'share-placement-photos'
});
const $=id=>document.getElementById(id);
const state={token:'',uid:'',draft:'',address:'',points:[],photo:'',version:'',busy:false,ready:false};
const PHOTO_MAX_BYTES=300000;
const PHOTO_MAX_EDGE=1280;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const note=(message)=>{$('status').textContent=message;};
const setBusy=(busy)=>{state.busy=busy;$('save').disabled=busy;$('preflight').disabled=busy||!state.draft;$('submit').disabled=busy||!state.ready||!CONFIG.submitEndpoint;};
function session(){
 try{return JSON.parse(sessionStorage.getItem(CONFIG.sessionKey)||'null');}catch{return null;}
}
function parseUid(token){
 try{const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');const claim=JSON.parse(atob(part));return uuid.test(claim.sub)?claim.sub:'';}catch{return '';}
}
async function request(path,body,method){
 if(!CONFIG.key||!state.token)throw Error('尚未設定測試專案金鑰或登入資訊');
 const r=await fetch(CONFIG.base+'/rest/v1/'+path,{method:method||(body===undefined?'GET':'POST'),
 headers:{apikey:CONFIG.key,Authorization:'Bearer '+state.token,'Content-Type':'application/json',
 ...(method==='POST'&&path.startsWith('lx_share_draft_details')?{Prefer:'resolution=merge-duplicates,return=representation'}:{})},
 ...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!r.ok){const x=await r.json().catch(()=>({}));throw Error(x.message||x.error||'資料庫操作失敗 '+r.status);}
 const text=await r.text();return text?JSON.parse(text):null;
}
function kind(){return document.querySelector('input[name="kind"]:checked').value;}
function validate(){
 const count=Number($('count').value);
 if(!Number.isInteger(count)||count<2||count>1000)throw Error('衣物件數須為 2～1000');
 if(kind()==='home'&&!state.address.trim())throw Error('請先設定住家地址');
 if(kind()==='collection_point'&&!$('pointSelect').value)throw Error('請選擇核准集貨點');
 const file=$('photo').files[0];
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size===0)throw Error('照片需為有效的 JPG、PNG 或 WEBP');
 if(!$('placed').checked)throw Error('請確認分享袋已放妥');
 return {count,file};
}
async function compressPhoto(file){
 // Never upload an original photo. Decode and encode as WebP, resizing to <=1280 px.
 const image=await createImageBitmap(file).catch(()=>{throw Error('照片無法解碼，請重新拍攝');});
 try{
  const ratio=Math.min(1,PHOTO_MAX_EDGE/Math.max(image.width,image.height));
  let width=Math.max(1,Math.round(image.width*ratio));
  let height=Math.max(1,Math.round(image.height*ratio));
  for(let scale=0;scale<5;scale++){
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('手機不支援照片壓縮');
   ctx.drawImage(image,0,0,width,height);
   for(const quality of [0.8,0.72,0.62,0.5,0.38]){
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
    if(!blob||blob.type!=='image/webp')throw Error('手機不支援 WebP 壓縮，請使用更新的瀏覽器');
    if(blob.size>0&&blob.size<=PHOTO_MAX_BYTES)return blob;
   }
   width=Math.max(1,Math.round(width*0.8));height=Math.max(1,Math.round(height*0.8));
  }
  throw Error('照片壓縮後仍超過 300 KB，請重新拍攝較簡單的畫面');
 }finally{image.close();}
}
if(loopback)globalThis.__P1_COMPRESS_PHOTO__=compressPhoto;
async function upload(file,path){
 const r=await fetch(CONFIG.base+'/storage/v1/object/'+CONFIG.bucket+'/'+path,{method:'POST',
 headers:{apikey:CONFIG.key,Authorization:'Bearer '+state.token,'Content-Type':file.type,'x-upsert':'false'},body:file});
 if(!r.ok){const x=await r.json().catch(()=>({}));throw Error(x.message||x.error||'照片上傳失敗 '+r.status);}
}
async function save(){
 if(state.busy)return;
 try{
  const {count,file}=validate();setBusy(true);state.ready=false;state.version='';$('agreement').classList.add('hidden');
  if(!state.draft){note('建立分享草稿…');const id=await request('rpc/lx_create_share_draft',{});if(!uuid.test(id))throw Error('草稿編號無效');state.draft=id;}
  note('正在將照片壓縮至 300 KB 以下…');
  const compressed=await compressPhoto(file);
  // V5 storage policy requires owner/draft/timestamp-random.ext.
  if(!state.photo){const ext='webp';
   const rand=crypto.randomUUID().replaceAll('-','').slice(0,8);
   state.photo=state.uid+'/'+state.draft+'/'+Date.now()+'-'+rand+'.'+ext;
   note('上傳照片…');try{await upload(compressed,state.photo);}catch(e){state.photo='';throw e;}
  }
  const point=state.points.find(p=>p.id===$('pointSelect').value);
  const details={request_id:state.draft,user_id:state.uid,clothing_count:count,pickup_kind:kind(),
   pickup_address_snapshot:kind()==='home'?state.address:point?.address_text||null,
   collection_point_id:kind()==='collection_point'?point.id:null,
   placement_note:$('note').value.trim()||null,placement_photo_path:state.photo};
  note('儲存分享明細…');
  await request('lx_share_draft_details?on_conflict=request_id',details,'POST');
  note('草稿已儲存。編號：'+state.draft+'\n尚未正式申報，48 小時取件期限尚未開始。');
 }catch(e){note('儲存失敗：'+e.message+'\n若照片已上傳，請勿重複上傳；可再次儲存明細。');}
 finally{setBusy(false);}
}
async function preflight(){
 if(state.busy||!state.draft)return;
 try{setBusy(true);state.ready=false;const check=await request('rpc/lx_share_submission_preflight',{p_request_id:state.draft});
  if(!check?.ready){note('尚不可提交：'+(check?.reason||'請完成資料與正式協議'));return;}
  const version=check.agreement_version;
  const rows=await request('lx_share_agreement_versions?version=eq.'+encodeURIComponent(version)+'&select=version,content,published_at');
  if(!Array.isArray(rows)||rows.length!==1||!rows[0].published_at)throw Error('找不到已發布協議');
  state.version=version;state.ready=true;$('terms').textContent=rows[0].content;$('agreement').classList.remove('hidden');
  note('提交前檢查通過。請詳閱目前版本協議，再勾選三項同意。');
 }catch(e){note('檢查失敗：'+e.message);}finally{setBusy(false);}
}
async function submit(){
 if(state.busy||!state.ready)return;
 if(!CONFIG.submitEndpoint){note('安全鎖定：尚未部署並核准受信任 Edge 提交 API，不能正式提交。');return;}
 if(!['transfer','noReturn','recycling'].every(id=>$(id).checked)){note('請先明確同意全部三項協議');return;}
 try{setBusy(true);
  const body={request_id:state.draft,agreement_version:state.version,transfer_agreed:true,no_return_agreed:true,recycling_agreed:true};
  const r=await fetch(CONFIG.submitEndpoint,{method:'POST',headers:{Authorization:'Bearer '+state.token,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(result.error||'提交失敗 '+r.status);
  if(!result.bag_id||!result.pickup_deadline_at)throw Error('回執不完整，請先查詢申請狀態，不要重複提交');
  state.ready=false;note('正式申報成功！\n分享袋編號：'+result.bag_code+'\n取件期限：'+result.pickup_deadline_at+'\n'+(result.replayed?'（已確認先前提交結果）':''));
 }catch(e){note('提交未確認：'+e.message+'\n請先查詢申請紀錄，不要反覆送出。');}
 finally{setBusy(false);}
}
async function init(){
 const s=session();state.token=s?.token||'';state.uid=parseUid(state.token);
 if(!state.uid){note('請先登入測試會員');$('identity').textContent='尚未登入';return;}
 $('identity').textContent='測試會員已登入';
 if(!CONFIG.key){note('安全鎖定：未設定測試專案 publishable key，本頁不會連線或寫入資料');$('save').disabled=true;return;}
 try{
  const home=await request('rpc/lx_get_my_home_address',{});const item=Array.isArray(home)?home[0]:home;
  state.address=item?.address_text||'';
 }catch(e){
  // Local V5 schema has no legacy home-address RPC; use the member's own RLS-protected profile.
  try{const profiles=await request('profiles?select=home_address&id=eq.'+state.uid);
   state.address=profiles?.[0]?.home_address||'';
  }catch(profileError){note('住家地址讀取失敗：'+profileError.message);}
 }
 $('address').textContent=state.address||'尚未設定住家地址';
 try{
  state.points=await request('lx_approved_collection_points?select=id,name,address_text,placement_note&enabled=eq.true&order=name.asc');
  for(const p of state.points){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;$('pointSelect').append(option);}
 }catch(e){note('集貨點讀取失敗：'+e.message);}
}
document.querySelectorAll('input[name="kind"]').forEach(el=>el.addEventListener('change',()=>{
 const home=kind()==='home';$('home').classList.toggle('hidden',!home);$('point').classList.toggle('hidden',home);
 state.ready=false;$('agreement').classList.add('hidden');
}));
$('photo').addEventListener('change',()=>{state.photo='';state.ready=false;const f=$('photo').files[0];if(f){$('preview').src=URL.createObjectURL(f);}});
$('save').addEventListener('click',save);$('preflight').addEventListener('click',preflight);$('submit').addEventListener('click',submit);
init();
