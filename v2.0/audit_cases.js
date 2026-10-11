"use strict";
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const E=require('./source/engine.js'),model=require('./model.json'),provenance=require('../provenance.json'),cases=[];
for(const scenario of ['central','downside','upside']){
 const result=E.run(model,scenario);assert.ok(Math.abs(result.price-provenance.scenarioValues[scenario])<1e-7,'audited value preserved');
 cases.push({label:scenario,model,scenario,result});
}
for(const discount of [10,12,16])for(const terminalMargin of [30,50,65]){
 const m=E.clone(model);Object.assign(m.assumptions,{discount,terminalMargin});
 cases.push({label:`sensitivity ${discount}/${terminalMargin}`,model:m,scenario:'central',result:E.run(m)});
}
const stresses=[{interimCredit:0},{capexMultiplier:1.25},{investmentHaircut:100}];
if(model.company==='SKHY')stresses.push({buybackFraction:0},{fx:model.assumptions.fx*1.1});
for(const a of stresses){const m=E.clone(model);Object.assign(m.assumptions,a);cases.push({label:JSON.stringify(a),model:m,scenario:'central',result:E.run(m)});}
fs.writeFileSync(path.join(__dirname,'verification/audit_cases.json'),JSON.stringify(cases));
console.log(`Prepared ${cases.length} independent ${model.company} cases`);
