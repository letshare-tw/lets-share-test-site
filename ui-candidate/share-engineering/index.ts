import { createClient } from "npm:@supabase/supabase-js@2.119.0";
const project="https://rfwqcrvxyjhtmafnbuyy.supabase.co";
const origin="https://letshare-tw.github.io";
Deno.serve(async (req:Request)=>{
 const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"};
 const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
 if(req.headers.get("origin")&&req.headers.get("origin")!==origin)return reply(403,{error:"SHARE_ORIGIN_DENIED"});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return reply(405,{error:"SHARE_METHOD_DENIED"});
 if(Deno.env.get("SUPABASE_URL")!==project)return reply(503,{error:"SHARE_ENVIRONMENT_DENIED"});
 const authorization=req.headers.get("authorization")||"";
 if(!/^Bearer \S+$/.test(authorization))return reply(401,{error:"SHARE_LOGIN_REQUIRED"});
 try{
  const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
  const userClient=createClient(project,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:verified,error:authError}=await userClient.auth.getUser(authorization.slice(7));
  if(authError||!verified.user||verified.user.is_anonymous)return reply(401,{error:"SHARE_LOGIN_REQUIRED"});
  if(!["uc.jimmy88@gmail.com","sys@yougo.com.tw"].includes((verified.user.email||"").toLowerCase()))return reply(403,{error:"SHARE_MEMBER_DENIED"});
  const raw=await req.text();if(raw.length>8192)return reply(413,{error:"SHARE_PAYLOAD_TOO_LARGE"});
  const body=JSON.parse(raw);
  if(!body||typeof body!=="object"||Array.isArray(body))return reply(400,{error:"SHARE_ACTION_DENIED"});
  if(!["bootstrap","create","save","preflight","activate","submit","receipt"].includes(body.action))return reply(400,{error:"SHARE_ACTION_DENIED"});
  const admin=createClient(project,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",{auth:{persistSession:false,autoRefreshToken:false}});
  // p_actor comes only from Auth verification, never from the body. SQL entry is service-role-only.
  const {data,error}=await admin.rpc("lx_share_test_gateway",{p_actor:verified.user.id,p_action:body.action,p_payload:body.payload||{}});
  if(error){const safe=/^SHARE_[A-Z_]+$/.test(error.message)?error.message:"SHARE_OPERATION_FAILED";return reply(safe==="SHARE_MEMBER_DENIED"?403:safe==="SHARE_SUBMISSION_LOCKED"?423:400,{error:safe});}
  return reply(200,{data});
 }catch(_){return reply(400,{error:"SHARE_REQUEST_FAILED"});}
});
