'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const E=require('./engine.js');
const models=Object.fromEntries(['MU','SKHY','SNDK'].map(c=>[c,JSON.parse(fs.readFileSync(path.join(root,'inputs',c.toLowerCase()+'.json')))]));
fs.writeFileSync(path.join(root,'inputs/sndk.json'),JSON.stringify(models.SNDK,null,2)+'\n');
const results=Object.fromEntries(Object.entries(models).map(([c,m])=>[c,E.all(m)]));
const cy=(c,arr)=>c==='SNDK'?(arr[0]+arr[1])/2:c==='MU'?(arr[0]*8+arr[1]*4)/12:arr[0];
const conEPS=c=>models[c].consensus.filter(x=>x.year>=2027).map(x=>E.quotedEPS(models[c],x.eps,models[c].assumptions));
const summary=Object.fromEntries(Object.entries(models).map(([c,m])=>{const z=results[c].central,eps=cy(c,conEPS(c)),modelEPS=cy(c,z.rows.map(x=>x.usdEPS));const fcff=cy(c,z.rows.map(x=>x.fcff)),mktCap=m.price/m.ordinaryPerQuote*m.assumptions.fx*z.shares/m.epsScale;return [c,{price:m.price,consensusCYEPS:eps,modelCYEPS:modelEPS,cyPE:m.price/eps,cyModelPE:m.price/modelEPS,annualPE:z.marketPE,fair:z.price,upside:z.upside,downside:results[c].downside.price,bull:results[c].upside.price,cyFCFF:fcff,cyFCFFYield:fcff/(mktCap-z.equityBridge)*100,marketCapNative:mktCap,marketEnterpriseNative:mktCap-z.equityBridge,terminalShare:z.terminalShare,fairCYMultiple:z.price/eps,epsGap:z.epsGapPct,impliedUSDReturn:null}];}));
function modified(c,edit){const m=E.clone(models[c]);edit(m);return E.run(m);}
function solve(fn,target,lo,hi){for(let i=0;i<100;i++){const mid=(lo+hi)/2;if(fn(mid)>target)lo=mid;else hi=mid;}return (lo+hi)/2;}
for(const c of Object.keys(models))summary[c].impliedUSDReturn=solve(r=>modified(c,m=>m.assumptions.discount=r).price,models[c].price,3.01,40);
const grid=[];for(const discount of [10,12,14,16])for(const margin of [30,40,50,60,70]){let vals={};for(const c of Object.keys(models))vals[c]=modified(c,m=>{m.assumptions.discount=discount;m.assumptions.terminalMargin=margin;}).upside;grid.push({discount,margin,upside:vals,rank:Object.keys(vals).sort((a,b)=>vals[b]-vals[a])});}
const broader=[];for(const discount of [10,12,14,16])for(const margin of [30,40,50,60,70])for(const roi of [15,25,35])for(const growth of [0,1,2,3]){const vals={};for(const c of Object.keys(models))vals[c]=modified(c,m=>{Object.assign(m.assumptions,{discount,terminalMargin:margin,terminalRoi:roi,terminalGrowth:growth});}).upside;broader.push({discount,margin,roi,growth,rank:Object.keys(vals).sort((a,b)=>vals[b]-vals[a])});}
const experiments=[
 ['No estimated interim cash',c=>modified(c,m=>m.assumptions.interimCredit=0)],
 ['25% higher capital investment and D&A',c=>modified(c,m=>m.assumptions.capexMultiplier=1.25)],
 ['5-point lower gross margin each explicit year',c=>modified(c,m=>m.assumptions.gmShock=-5)],
 ['Additional 20% price declines at the start of CY2029 and CY2030',c=>modified(c,m=>{const f=c==='SNDK'?6:c==='MU'?8:12;const level=y=>y<2029?1:y===2029?.8:.64;let prior=1;for(const row of m.scenarios.central.rows){const current=level(row.year-1)*(12-f)/12+level(row.year)*f/12;const factor=current/prior;if(row.revenueTarget!==null)row.revenueTarget*=current;else row.asp=row.asp.map(p=>((1+p/100)*factor-1)*100);prior=current;}})],
 ['5% revenue cash drain persists into terminal period',c=>modified(c,m=>m.assumptions.terminalLeakage=5)]
].map(([name,fn])=>({name,values:Object.fromEntries(Object.keys(models).map(c=>{const z=fn(c);return [c,{price:z.price,upside:z.upside,funded:z.funded}];}))}));
const muUpside=summary.MU.upside,skTarget=models.SKHY.price*(1+muUpside/100);
const skBreakRate=solve(r=>modified('SKHY',m=>m.assumptions.discount=r).price,skTarget,3.01,40);
const skSpecific={breakEvenDiscountToMU:skBreakRate,relativeValueHaircutToMU:100*(1-(1+muUpside/100)/(1+summary.SKHY.upside/100)),epsHaircutToMuPE:100*(1-summary.SKHY.cyPE/summary.MU.cyPE),fxWeakeningToMuUpside:100*(summary.SKHY.fair/skTarget-1),cases:[]};
for(const [name,fn] of [['14% KRW return',m=>m.assumptions.discount=14],['16% KRW return',m=>m.assumptions.discount=16],['Won depreciates 2% annually; USD required return 12%',m=>m.assumptions.discount=((1.12*1.02)-1)*100],['Won depreciates 2% annually and starts 10% weaker',m=>{m.assumptions.discount=((1.12*1.02)-1)*100;m.assumptions.fx*=1.1;}],['No buyback executed',m=>m.assumptions.buybackFraction=0],['All long-term investments written off',m=>m.assumptions.investmentHaircut=100]]){const r=modified('SKHY',fn);skSpecific.cases.push({name,price:r.price,upside:r.upside,beatsMU:r.upside>muUpside});}
const sndkCash=[0,50,100,150,200].map(scale=>{const z=modified('SNDK',m=>m.assumptions.allowanceScale=scale);return{scale,value:z.price,upside:z.upside,funded:z.funded};});
// In-memory audit of one existing terminal assumption. Historical files remain untouched.
const oldFile=path.join(root,'reference/sndk_valuation_v1_5.js');
const old=require(oldFile),oldPreset=old.createPreset('guidance'),oldR=old.calculateModel(oldPreset.model).scenarios.management.valuation;
const patched=fs.readFileSync(oldFile,'utf8').replace('const normalEbitMargin=sum(normalized.map(r=>r.economicEbit))/sum(normalized.map(r=>r.totalRevenue));','const normalEbitMargin=Math.min(.5,sum(normalized.map(r=>r.economicEbit))/sum(normalized.map(r=>r.totalRevenue)));');
const context={module:{exports:{}},console};vm.runInNewContext(patched,context);const old50=context.module.exports,capR=old50.calculateModel(old50.createPreset("guidance").model).scenarios.management.valuation;
const legacy={original:{low:oldR.pvLow,high:oldR.pvHigh,mid:(oldR.pvLow+oldR.pvHigh)/2,terminalMargin:oldR.normalEbitMargin,terminalShareLow:(oldR.branchLow.totalPV-oldR.branchLow.pvFcf)/oldR.branchLow.totalPV*100,terminalShareHigh:(oldR.branchHigh.totalPV-oldR.branchHigh.pvFcf)/oldR.branchHigh.totalPV*100},terminal50Only:{low:capR.pvLow,high:capR.pvHigh,mid:(capR.pvLow+capR.pvHigh)/2},newCentral:summary.SNDK.fair};
const out={asOf:'2026-10-09',method:'Common calendar 2027 EPS via straight month-weighting of annual forecasts; same nominal return under flat FX, 2% growth, 25% incremental ROIC, 50% economic terminal margin; separate operating and cash assumptions.',summary,results,grid,broaderGrid:{count:broader.length,wins:Object.fromEntries(Object.keys(models).map(c=>[c,broader.filter(x=>x.rank[0]===c).length])),rankOrders:[...new Set(broader.map(x=>x.rank.join(' > ')))]},experiments,skSpecific,sndkCash,legacy};
fs.writeFileSync(path.join(root,'results.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,results:undefined,grid:undefined},null,2));
