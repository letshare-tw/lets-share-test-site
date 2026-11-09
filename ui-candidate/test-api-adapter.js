"use strict";
/* B-01C-06B: C09 V5 contract only. Inert on all hosts; NO requests, auth, uploads or submissions. */
(()=>{
 const CONTRACT=Object.freeze({
  version:"C09-V5-contract-06B",
  target:"lets-share-test",
  status:"LOCKED",
  identity:Object.freeze({memberId:"auth.users.id (uuid)",profileId:"profiles.id (uuid)",name:"profiles.display_name",registration:"profiles.registration_completed_at"}),
  address:Object.freeze({source:"profiles",address:"home_address",placementNote:"home_placement_note"}),
  collectionPoint:Object.freeze({source:"lx_approved_collection_points",id:"id (uuid)",label:"name",detail:"address_text",required:"enabled=true AND approved_at IS NOT NULL"}),
  draft:Object.freeze({create:"lx_create_share_draft()",requestId:"lx_share_requests.id (uuid)",detailsTable:"lx_share_draft_details",fields:Object.freeze(["request_id","user_id","clothing_count","pickup_kind","pickup_address_snapshot","collection_point_id","placement_note","placement_photo_path"])}),
  photo:Object.freeze({bucket:"share-placement-photos",visibility:"private",path:"{user_uuid}/{draft_uuid}/{timestamp}-{random}.webp",maxCompressedBytes:300000,formats:Object.freeze(["image/jpeg","image/png","image/webp"])}),
  agreement:Object.freeze({preflight:"lx_share_submission_preflight(p_request_id)",settings:"lx_share_submission_settings",versions:"lx_share_agreement_versions",consents:"lx_share_service_consents"}),
  submit:Object.freeze({rpc:"lx_submit_share_request",trustedEdgeRequired:true,fields:Object.freeze(["p_request_id","p_agreement_version","p_transfer_agreed","p_no_return_agreed","p_recycling_agreed"]),result:"lx_share_bags.bag_code; pickup_deadline_at"}),
  safeguards:Object.freeze({defaultOffline:true,allowNetwork:false,allowAuth:false,allowUpload:false,allowSubmit:false,allowRealData:false})
 });
 const blocked=async()=>{throw Error("B-01C-06B 安全鎖定：僅資料契約，未授權任何後端操作");};
 const adapter=Object.freeze({mode:"contract-locked",contract:CONTRACT,
  getMember:blocked,getAddress:blocked,listCollectionPoints:blocked,
  saveDraft:blocked,preflight:blocked,uploadPhoto:blocked,submit:blocked
 });
 Object.defineProperty(window,"LX_TEST_API_ADAPTER",{value:adapter,writable:false,configurable:false});
})();
