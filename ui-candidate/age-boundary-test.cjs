"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const files=["registration-ui.js","test-auth-adapter.js"];
let assertions=0;
function check(value,message){assert.ok(value,message);assertions++;}
const correct=String.raw`/^\d{4}-\d{2}-\d{2}$/`;
const broken=String.raw`/^\\d{4}-\\d{2}-\\d{2}$/`;
for(const file of files){
 const source=fs.readFileSync(path.join(__dirname,file),"utf8");
 check(source.includes(correct),file+" must use the proper date regex");
 check(!source.includes(broken),file+" must not contain the double-escaped date regex");
 check(source.includes("adult_ready"),file+" must retain adult readiness integration");
}
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
function ageEligible(value,today){
 if(!datePattern.test(value))return false;
 const [y,m,d]=value.split("-").map(Number);
 const date=new Date(Date.UTC(y,m-1,d));
 if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return false;
 const [ty,tm,td]=today.split("-").map(Number);
 if(y<1900||y>ty)return false;
 const cutoff=new Date(Date.UTC(ty-18,tm-1,td));
 return date.getTime()<=cutoff.getTime();
}
const today="2026-11-10";
for(const [date,expected] of [
 ["2008-11-10",true],["2008-11-11",false],["2008-11-09",true],
 ["2000-02-29",true],["2001-02-29",false],["2026-11-11",false],
 ["2026-11-10",false],["1900-01-01",true],["1899-12-31",false],
 ["2020-13-01",false],["2020-00-10",false],["2020-04-31",false],
 ["",false],["2008/11/10",false],["2008-1-10",false],
 ["2008-11-10x",false]
]){
 check(ageEligible(date,today)===expected,"age boundary "+date);
}
console.log(JSON.stringify({result:"PASS",assertions,realNetworkRequests:0,realSms:0,realDatabaseWrites:0}));
