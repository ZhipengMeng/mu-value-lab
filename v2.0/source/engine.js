'use strict';
(function(root){
const clone=x=>JSON.parse(JSON.stringify(x)), sum=x=>x.reduce((a,b)=>a+b,0);
const days=(a,b)=>(Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000;
function validate(c){
 const a=c.assumptions, errs=[];
 const range=(k,lo,hi)=>{if(!Number.isFinite(a[k])||a[k]<lo||a[k]>hi)errs.push(k+' must be between '+lo+' and '+hi);};
 for(const [k,l,h] of [['discount',1,40],['terminalGrowth',0,6],['terminalMargin',0,85],['terminalRoi',7,70],['tax',0,50],['netInterest',-20,30],['sbc',0,30],['dso',0,180],['dio',0,500],['dpo',0,300],['accruedPct',0,20],['operatingReserve',0,200],['interimCredit',0,100],['investmentHaircut',0,100],['ipoFeePct',0,5],['buybackFraction',0,100],['buybackPrice',1,10000000],['fx',1,3000],['capexMultiplier',0.5,2],['sharesMn',1,5000],['gmShock',-20,10]])range(k,l,h);
 if(a.discount<=a.terminalGrowth)errs.push('Discount rate must exceed perpetual growth.');
 if(a.terminalRoi<=a.terminalGrowth)errs.push('Terminal return on capital must exceed perpetual growth.');
 if(c.company!=='MU'&&c.company!=='SKHY')errs.push('Unknown company.');
 if(c.schema!==2)errs.push('Unsupported model version.');
 if(!Array.isArray(c.segments)||c.segments.length<1)errs.push('Missing business drivers.');
 for(const [key,s] of Object.entries(c.scenarios)){
  if(s.rows.length!==8)errs.push(key+': eight forecast years required.');
  s.rows.forEach((r,i)=>{
   if(r.year!==2027+i)errs.push(key+': year sequence invalid.');
   for(const k of ['volume','asp','cost']){
    if(!Array.isArray(r[k])||r[k].length!==c.segments.length||r[k].some(x=>!Number.isFinite(x)||x<=-95||x>200))errs.push(key+': invalid '+k);
   }
   for(const k of ['capex','da','opex'])if(!Number.isFinite(r[k])||r[k]<0)errs.push(key+': invalid '+k);
   if(r.revenueTarget!==null&&(!Number.isFinite(r.revenueTarget)||r.revenueTarget<=0))errs.push(key+': invalid revenue target');
  });
 }
 if(errs.length)throw new Error(errs.join(' '));
 return true;
}
function unitEPS(c,native,shares){return native*c.epsScale/shares;}
function quotedEPS(c,nativeEPS,a){return nativeEPS*c.ordinaryPerQuote/a.fx;}
function workingCapital(c,rev,cogs,a){return rev*a.dso/365+cogs*(a.dio-a.dpo)/365-rev*a.accruedPct/100;}
function run(c,key='central'){
 validate(c);if(!c.scenarios[key])throw new Error('Unknown scenario');
 const a=c.assumptions,s=c.scenarios[key],f=c.facts;
 const buyback=c.company==='SKHY'?f.buybackBudget*a.buybackFraction/100:0;
 const repurchasedMn=buyback*c.epsScale/a.buybackPrice;
 const shares=a.sharesMn-repurchasedMn;if(shares<=0)throw new Error('Buyback leaves no shares.');
 const r=a.discount/100,g=a.terminalGrowth/100, tax=a.tax/100;
 const endDate=y=>c.company==='MU'?(y===2027?'2027-09-02':y+'-08-31'):y+'-12-31';
 const datePV=(x,date)=>x/Math.pow(1+r,days(c.asOf,date)/365.25);
 const bridge=[];const add=(label,value,status)=>{bridge.push({label,value,status});return value;};
 let equityBridge=add('Reported cash and liquid investments',f.cash,'reported');
 equityBridge+=add('Borrowings and finance claims',-f.debt,'reported');
 equityBridge+=add('Reserved previously accrued taxes',-f.taxLiability,'reported; conservative settlement assumption');
 equityBridge+=add('Customer deposit liability reserve',-f.customerDeposits,'reported; full reserve assumption');
 equityBridge+=add('Operating cash reserve',-a.operatingReserve,'assumption');
 if(c.company==='SKHY'){
  equityBridge+=add('July gross IPO proceeds',f.ipoGross,'reported subsequent event');
  equityBridge+=add('Estimated IPO fees',-f.ipoGross*a.ipoFeePct/100,'assumption; net proceeds not independently verified');
  equityBridge+=add('Buyback cash, pro forma',-buyback,'assumption applied to announced plan; completion unverified');
  equityBridge+=add('Non-operating investments after haircut',f.investments*(1-a.investmentHaircut/100),'reported carrying value × assumed realization');
  equityBridge+=add('Deferred tax and minority claims',-f.investmentClaims,'reported; full deduction assumption');
 }
 let previousNwc=f.openingNwc,stub=null,pastCash=0,stubPV=0;
 if(c.company==='SKHY'){
  const rev=f.cy2026ConsensusRevenue,op=f.cy2026ConsensusEbit-f.halfEbit;
  const yearCogs=rev-f.cy2026ConsensusEbit-c.anchor.opex;
  const nwc=workingCapital(c,rev,yearCogs,a),delta=nwc-previousNwc;
  const capex=c.stub.capexYear*a.capexMultiplier-f.halfCashCapex,da=c.stub.daHalf;
  const nopat=op-Math.max(op,0)*tax;
  const fcff=nopat+da-capex-delta;
  const elapsed=days('2026-06-30',c.asOf)/days('2026-06-30','2026-12-31');
  pastCash=fcff*elapsed*a.interimCredit/100;
  const future=fcff*(1-elapsed);stubPV=datePV(future,'2026-12-31');
  stub={label:'H2 CY2026 bridge',revenue:rev-f.halfRevenue,ebit:op,nopat,da,capex,nwc,deltaNwc:delta,fcff,elapsed,pastCash,future,pv:stubPV};
  previousNwc=nwc;
 }
 let prevRev=c.anchor.revenues.slice();
 let cashCosts=c.anchor.cashCosts.slice();
 let rows=[];
 for(let k=0;k<s.rows.length;k++){
  const z=s.rows[k];
  const beforePrice=prevRev.map((v,i)=>v*(1+z.volume[i]/100));
  const rawRev=beforePrice.map((v,i)=>v*(1+z.asp[i]/100));
  const priceScale=z.revenueTarget===null?1:z.revenueTarget/sum(rawRev);
  const revenues=rawRev.map(v=>v*priceScale);
  const actualAsp=z.asp.map(v=>((1+v/100)*priceScale-1)*100);
  cashCosts=cashCosts.map((v,i)=>v*(1+z.volume[i]/100)*(1+z.cost[i]/100));
  const da=z.da*a.capexMultiplier;
  const cogs=cashCosts.map((v,i)=>v+da*c.anchor.manufacturingDaShare*c.anchor.daWeights[i]-revenues[i]*a.gmShock/100);
  if(cogs.some(v=>v<0))throw new Error('Gross-margin shock implies negative manufacturing cost.');
  const revenue=sum(revenues),cost=sum(cogs),gross=revenue-cost;
  const opex=z.opex+da*(1-c.anchor.manufacturingDaShare);
  const ebit=gross-opex;
  const sbc=c.company==='MU'?a.sbc*Math.pow(1.06,k):0;
  const economicEbit=ebit-sbc;
  const nopat=economicEbit-Math.max(economicEbit,0)*tax;
  const netIncome=(ebit+a.netInterest)-Math.max(ebit+a.netInterest,0)*tax-c.epsMinority;
  const economicNI=(economicEbit+a.netInterest)-Math.max(economicEbit+a.netInterest,0)*tax-c.epsMinority;
  const eps=unitEPS(c,netIncome,shares),usdEPS=quotedEPS(c,eps,a);
  const economicEPS=quotedEPS(c,unitEPS(c,economicNI,shares),a);
  const nwc=workingCapital(c,revenue,cost,a),deltaNwc=nwc-previousNwc;
  const capex=z.capex*a.capexMultiplier,fcff=nopat+da-capex-deltaNwc;
  let fraction=1,past=0;
  if(c.company==='MU'&&k===0){
   const elapsed=days(c.balanceDate,c.asOf)/days(c.balanceDate,endDate(z.year));
   fraction=1-elapsed;past=fcff*elapsed*a.interimCredit/100;pastCash+=past;
  }
  rows.push({year:z.year,endDate:endDate(z.year),revenue,cogs:cost,gross,gm:gross/revenue*100,opex,ebit,sbc,economicEbit,nopat,netIncome,eps,usdEPS,economicEPS,da,capex,nwc,deltaNwc,fcff,pv:datePV(fcff*fraction,endDate(z.year)),fraction,past,priceScale,actualAsp,revenues,segmentCogs:cogs,volume:z.volume,costChange:z.cost,revenueTarget:z.revenueTarget});
  prevRev=revenues;previousNwc=nwc;
 }
 equityBridge+=add('Estimated interim owner-cash adjustment',pastCash,'assumption; uniform accrual, adjustable 0–100% credit');
 const last=rows.at(-1), prev=rows.at(-2);
 const startGrowth=Math.max(g,Math.min(.12,last.revenue/prev.revenue-1));
 const startMargin=last.economicEbit/last.revenue;
 const targetMargin=(a.terminalMargin+s.marginOffset)/100;
 if(targetMargin<0||targetMargin>.9)throw new Error('Scenario terminal margin outside 0–90%.');
 const startReinvest=last.capex-last.da+last.deltaNwc;
 let fade=[],rev=last.revenue;
 for(let j=1;j<=4;j++){
  const t=j/4, growth=startGrowth*(1-t)+g*t, margin=startMargin*(1-t)+targetMargin*t;
  rev*=1+growth;const ebit=rev*margin,nopat=ebit*(1-tax);
  const reinvest=startReinvest*(1-t)+nopat*growth/(a.terminalRoi/100)*t;
  const fcff=nopat-reinvest,year=last.year+j;
  fade.push({year,revenue:rev,margin:margin*100,nopat,reinvestment:reinvest,fcff,pv:datePV(fcff,endDate(year)),endDate:endDate(year)});
 }
 const terminalNopat=rev*(1+g)*targetMargin*(1-tax);
 const terminalReinvestment=terminalNopat*g/(a.terminalRoi/100);
 const terminalFCFF=terminalNopat-terminalReinvestment;
 const terminalValue=terminalFCFF/(r-g),terminalPV=datePV(terminalValue,fade.at(-1).endDate);
 const explicitPV=sum(rows.map(x=>x.pv))+stubPV,fadePV=sum(fade.map(x=>x.pv)),enterprise=explicitPV+fadePV+terminalPV;
 const equity=enterprise+equityBridge;
 const nativePrice=equity*c.epsScale/shares,price=quotedEPS(c,nativePrice,a);
 const consensusEPS=quotedEPS(c,c.consensus.find(x=>x.year===2027).eps,a);
 const pe=price/consensusEPS, marketPE=c.price/consensusEPS;
 const gap=(rows[0].usdEPS/consensusEPS-1)*100;
 const historicalClaimCash=f.cash-f.debt-f.taxLiability-f.customerDeposits-a.operatingReserve+(c.company==='SKHY'?f.ipoGross*(1-a.ipoFeePct/100)-buyback:0)+pastCash;
 let liquidity=historicalClaimCash,minimumLiquidity=liquidity;
 if(stub){liquidity+=stub.future;minimumLiquidity=Math.min(minimumLiquidity,liquidity);}
 rows.forEach(x=>{liquidity+=x.fcff*x.fraction;minimumLiquidity=Math.min(minimumLiquidity,liquidity);});
 return {company:c.company,scenario:key,scenarioName:s.name,rows,stub,fade,bridge,shares,repurchasedMn,equityBridge,explicitPV,fadePV,terminalPV,terminalValue,terminalFCFF,terminalNopat,terminalReinvestment,terminalMargin:targetMargin*100,enterprise,equity,nativePrice,price,pe,marketPE,consensusEPS,epsGapPct:gap,terminalShare:terminalPV/enterprise*100,upside:(price/c.price-1)*100,minimumLiquidity,funded:minimumLiquidity>=0};
}
function all(c){return Object.fromEntries(Object.keys(c.scenarios).map(k=>[k,run(c,k)]));}
function sensitivity(c,key){return [10,12,14,16].map(discount=>({discount,values:[30,40,50,60,70].map(margin=>{let n=clone(c);n.assumptions.discount=discount;n.assumptions.terminalMargin=margin;n.scenarios[key].marginOffset=0;return {margin,price:run(n,key).price};})}));}
function session(c,key){return {schema:2,company:c.company,scenario:key,model:clone(c)};}
const api={run,all,validate,clone,session,sensitivity,workingCapital,unitEPS,quotedEPS,days};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MemoryValue=api;
})(typeof window!=='undefined'?window:globalThis);
