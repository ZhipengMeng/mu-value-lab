'use strict';
const fs=require('fs'),assert=require('assert/strict'),path=require('path');
const c=require('./model.json'),E=require('./source/engine.js');let n=0,checks=[];
const check=(x,l)=>{assert(x,l);n++;checks.push(l);};
const near=(x,y,l)=>check(Math.abs(x-y)<=1e-8*Math.max(1,Math.abs(y)),l);
const modify=(f,k='central')=>{const a=E.clone(c);f(a);return E.run(a,k);};
const b=E.run(c),all=E.all(c);
near(c.company==='MU'?c.price/176.15:c.price/(470320*.1/1340.88),b.marketPE,'Forward P/E independently recomputed');
near(b.rows[0].revenue,c.company==='MU'?275.21:531.44,'Central first-year consensus revenue');
near(b.rows[0].opex,c.company==='MU'?9.341:25,'First-year expense bridge');
if(c.company==='MU'){
 near(c.facts.openingNwc,36.197+10.372-3.518-4.447-.396-4.386,'Trade, tax and capital payables separated');
 near(c.facts.taxLiability,5.626+9.820,'Prior current and noncurrent taxes reserved');
 near(b.rows[1].revenue,320.57,'FY2028 consensus revenue separately anchored');
 const q=modify(m=>m.assumptions.sbc+=1);
 near(q.rows[0].usdEPS,b.rows[0].usdEPS,'SBC does not alter adjusted-style EPS');
 check(q.rows[0].economicEPS<b.rows[0].economicEPS&&q.price<b.price,'SBC is an economic charge, not an addback');
}else{
 near(c.facts.openingNwc,47.821395+17.985706-3.043239,'Opening trade working capital');
 near(b.shares,728.8655-40*1e6/1662000,'Buyback reduces ordinary shares with cash');
 near(b.stub.ebit,266.14-98.152891,'CY2026 operating bridge uses H1 actual, not Q2 net profit');
 near(c.segments.reduce((v,x)=>v+x.revenue,0),79.318746,'Reported DRAM/NAND/other reconcile to Q2 total');
 const q=modify(m=>m.assumptions.buybackFraction=0);
 near(q.shares,728.8655,'No buyback restores post-IPO ordinary shares');
 near(q.equity-b.equity,40,'No buyback restores cash, no invented profit');
 const fx=modify(m=>m.assumptions.fx*=1.1);
 near(fx.price,b.price/1.1,'FX conversion inverse and applied once');
 near(fx.rows[0].usdEPS,b.rows[0].usdEPS/1.1,'EPS same ADS / FX conversion as valuation');
 near(modify(m=>m.assumptions.sbc=1).price,b.price,'K-IFRS SBC not charged twice');
 check(b.marketPE>4.17,'Unreconciled provider headline is not a model input');
}
check(all.downside.price<b.price&&b.price<all.upside.price,'Scenario ordering follows operating assumptions');
check(modify(m=>m.assumptions.discount+=1).price<b.price,'Higher discount lowers valuation');
check(modify(m=>m.assumptions.terminalMargin+=5).price>b.price,'Higher sustainable margin raises valuation');
check(modify(m=>m.assumptions.capexMultiplier=1.2).price<b.price,'Higher investment requirement lowers valuation');
check(modify(m=>m.assumptions.interimCredit=0).price<b.price,'Unverified interim credit can be removed');
const quote=modify(m=>m.price*=2);near(quote.price,b.price,'Market quote cannot fit intrinsic value');near(quote.marketPE,2*b.marketPE,'P/E responds mechanically to market quote');
const noGrowth=modify(m=>m.assumptions.terminalGrowth=0);near(noGrowth.terminalReinvestment,0,'Zero perpetual growth requires no incremental growth investment');
for(const [key,r] of Object.entries(all)){
 check(r.rows.length===8&&r.fade.length===4,key+' full explicit and fade horizons');
 check(r.funded,key+' liquidity nonnegative');
 for(const x of r.rows){
  near(x.revenues.reduce((a,b)=>a+b,0),x.revenue,key+' '+x.year+' segment sum');
  near(x.nopat+x.da-x.capex-x.deltaNwc,x.fcff,key+' '+x.year+' cash-flow identity');
  near(x.netIncome*c.epsScale/r.shares,x.eps,key+' '+x.year+' native EPS');
  check(x.cogs>=x.da*.8,key+' '+x.year+' positive manufacturing cash cost');
 }
 near(r.explicitPV+r.fadePV+r.terminalPV,r.enterprise,key+' enterprise value');
 near(r.enterprise+r.equityBridge,r.equity,key+' equity value');
}
for(const f of [m=>m.assumptions.sharesMn=0,m=>m.assumptions.discount=m.assumptions.terminalGrowth,m=>m.scenarios.central.rows[0].volume[0]=-100,m=>m.assumptions.tax=NaN]){
 let failed=false;try{modify(f);}catch{failed=true;}check(failed,'Invalid financial input rejected');
}
let custom=E.clone(c);custom.scenarios.central.rows[0].revenueTarget=null;const customBase=E.run(custom);custom.scenarios.central.rows[0].asp[0]+=5;check(E.run(custom).rows[0].revenue>customBase.rows[0].revenue,'Unanchored revenue responds to business pricing');
const report={company:c.company,status:'pass',checks:n,checksPerformed:checks,scope:'Numerical and economic invariants; not validation of future forecasts.'};
fs.writeFileSync(path.join(__dirname,'verification/engine_report.json'),JSON.stringify(report,null,2));console.log({company:c.company,checks:n,status:'pass'});
