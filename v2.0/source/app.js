'use strict';
(()=>{
const $=s=>document.getElementById(s),E=MemoryValue;
const original=JSON.parse($('modelData').textContent);let model=E.clone(original),selected='central',year=2027,results=null,rendering=false;
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(x,d=2)=>Number.isFinite(x)?x.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const usd=(x,d=0)=>'$'+num(x,d),pct=(x,d=1)=>num(x,d)+'%',signed=(x,d=1)=>(x>=0?'+':'')+pct(x,d),nat=x=>num(x,2)+' '+model.unitShort;
const source=id=>model.sources.find(x=>x.id===id);
const link=id=>{const s=source(id);return s?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`:'';};
const table=(headers,rows,cls='')=>`<div class="tablewrap"><table class="${cls}"><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((x,i)=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const inp=(scope,key,value,extra='')=>`<input type="number" data-scope="${scope}" data-key="${key}" value="${value===null?'':esc(value)}" step="any" ${extra}>`;
const tag=(name,cls='assumption')=>`<span class="tag ${cls}">${esc(name)}</span>`;
const peText=(price,eps)=>eps>0?num(price/eps)+'×':'N/M';
const firstYear=()=>model.company==='MU'?'FY2027':'CY2027';
function staticContent(){
 $('subtitle').textContent=model.headline;$('business').textContent=model.overview;
 $('scenario').innerHTML=Object.entries(model.scenarios).map(([k,s])=>`<option value="${esc(k)}">${esc(s.name)}</option>`).join('');
 $('driverYear').innerHTML=Array.from({length:8},(_,i)=>`<option>${2027+i}</option>`).join('');
 $('policies').innerHTML=model.assumptionsNotes.map(t=>`<p class="policy">${esc(t)}</p>`).join('');
 $('limitations').innerHTML='<ul>'+model.limitations.map(t=>`<li>${esc(t)}</li>`).join('')+'</ul>';
 $('factCards').innerHTML=model.evidence.map(f=>`<article class="factcard">${tag(f.status,f.status==='Reported'||f.status.startsWith('Reported ')?'fact':'outlook')}<strong>${esc(f.label)}</strong><div>${esc(f.value)}</div><p>${esc(f.meaning)}</p><small>${link(f.source)}</small></article>`).join('');
 $('sources').innerHTML='<div class="sources">'+model.sources.map(s=>`<p><b>${esc(s.id.toUpperCase())}</b> · ${link(s.id)}<br>${esc(s.kind)} · Published/updated ${esc(s.date)} · ${esc(s.locator)}</p>`).join('')+'</div>';
 $('comparison').textContent=model.comparisonNote;
}
const fields=[
 ['discount','Business discount rate (%)','Assumed nominal rate in the operating currency.'],['terminalGrowth','Perpetual growth (%)','Assumed; must stay below discount rate and return on capital.'],['terminalMargin','Central terminal operating margin (%)','Downside is 20 points lower; upside is 15 points higher. Economic margin after SBC.'],['terminalRoi','Terminal return on new capital (%)','After-tax return; determines growth reinvestment.'],['tax','Operating tax (%)','MU FY2027 guidance; SKHY assumption. Future years assumed.'],['netInterest','Recurring net interest / other ('+original.unitShort+')','EPS only; excluded from enterprise cash flow. Annual assumption.'],['sbc','MU economic SBC ('+original.unitShort+')','FY2027, then +6% yearly; SKHY already includes SBC in operating costs.'],['dso','Receivable days','Revenue × days / 365.'],['dio','Inventory days','Cost of sales × days / 365.'],['dpo','Trade-payable days','Cost of sales × days / 365.'],['accruedPct','Other operating accruals (% of revenue)','Excludes income taxes and capital payables.'],['capexMultiplier','Capex / D&A schedule multiplier','1.00 uses the scenario schedule. Scales both spending and depreciation.'],['operatingReserve','Operating cash reserve ('+original.unitShort+')','Reserved from equity bridge.'],['interimCredit','Estimated interim cash credited (%)','0 removes all estimated cash generated since the last balance date.'],['sharesMn','Starting share count (millions)','MU guided diluted shares; SKHY post-IPO ordinary shares before modeled buyback.'],['fx','Operating currency per USD','MU 1.00; SKHY frozen indicative KRW/USD.'],['investmentHaircut','SKHY investment-value haircut (%)','Applied to long-term non-operating investments.'],['ipoFeePct','SKHY IPO fee allowance (%)','Gross issuance verified; fee rate assumed.'],['buybackFraction','SKHY announced buyback executed (%)','Pro forma assumption. Cash and shares reduced together.'],['buybackPrice','SKHY buyback price (KRW/ordinary)','Announcement reference price used as an assumed execution price.'],['gmShock','Additional gross-margin shift (points)','Explicit sensitivity applied to every forecast year; 0 is the original scenario.']
];
function editors(){
 $('scenario').value=selected;$('driverYear').value=year;
 const a=model.assumptions,z=model.scenarios[selected].rows.find(x=>x.year===year);
 $('inputs').innerHTML=fields.filter(x=>!(model.company==='MU'&&['investmentHaircut','ipoFeePct','buybackFraction','buybackPrice'].includes(x[0]))&&!(model.company==='SKHY'&&x[0]==='sbc')).map(([k,label,help])=>`<label>${esc(label)} ${inp('assumptions',k,a[k],`aria-label="${esc(label)}" id="input-${k}"`)}<small>${esc(help)}</small></label>`).join('');
 $('driverEditor').innerHTML=table(['Business','Shipment / bit growth %','Price / mix input %','Cash cost per unit change %'],model.segments.map((s,i)=>[esc(s.name),inp('volume',i,z.volume[i],`aria-label="${esc(s.short)} shipment growth"`),inp('asp',i,z.asp[i],`aria-label="${esc(s.short)} price mix"`),inp('cost',i,z.cost[i],`aria-label="${esc(s.short)} unit cost change"`)]));
 $('yearEditor').innerHTML=table(['Annual input for '+year,'Value ('+model.unitShort+')','Interpretation'],[['Revenue target',inp('row','revenueTarget',z.revenueTarget,'aria-label="Revenue target"'),'Blank means revenue follows the drivers.'],['Capital spending',inp('row','capex',z.capex,'aria-label="Capital spending"'),'Cash investment; multiplied by the capex control.'],['Depreciation',inp('row','da',z.da,'aria-label="Depreciation"'),'Included in operating costs; added back once.'],['Cash operating expense',inp('row','opex',z.opex,'aria-label="Cash operating expense"'),'Excludes 20% of D&A allocated to operating expense.']]);
}
function clearOutputs(message){
 $('errors').hidden=false;$('errors').textContent=message;$('hero').innerHTML='<div><div class="label">Valuation unavailable</div><div class="value">Invalid inputs</div><p>Correct the inputs before using any results.</p></div>';
 for(const id of ['cases','keyNumbers','consensus','ratioNote','earningsBridge','earningsNotes','peGrid','segments','stub','forecast','valueBridge','balanceBridge','fade','matrix','balanceSensitivity','terminalNote','funding'])$(id).innerHTML='';
 $('save').disabled=true;results=null;
}
function render(){
 if(rendering)return;
 rendering=true;
 try{
  editors();
  $('state').textContent=JSON.stringify(model)===JSON.stringify(original)?'Original v2.0 assumptions':'Custom assumptions — reported evidence and consensus snapshots are unchanged';
  results=E.all(model);const r=results[selected],z=r.rows[0],a=model.assumptions,con=model.consensus.find(x=>x.year===2027),max=Math.max(...Object.values(results).map(x=>x.price));
  $('errors').hidden=true;$('errors').textContent='';$('save').disabled=false;
  $('hero').innerHTML=`<div><div class="label">${esc(r.scenarioName)} · conditional value</div><div class="value">${r.funded?usd(r.price):'Funding gap'}</div><div>per ${model.company==='SKHY'?'U.S. ADS':'diluted share'} · ${r.funded?signed(r.upside)+' vs reference price':'financing assumption required'}</div><p>${esc(model.scenarios[selected].description)}</p></div><div><div class="label">Reference close · October 9, 2026</div><div class="quote">${usd(model.price,2)}</div><p>Consensus revenue anchors are estimates. Costs, capital spending and cash conversion generate the model’s earnings. The displayed central case is one assumption set, not a verified fair-price finding.</p>${model.company==='SKHY'?`<p>1 ADS = 0.1 ordinary share · ₩${num(a.fx)} / $1<br>Implied ordinary-share value: ₩${num(r.nativePrice,0)}</p>`:''}</div>`;
  $('cases').innerHTML=Object.entries(results).map(([k,v])=>`<button class="case ${k===selected?'active':''}" data-case="${k}" aria-pressed="${k===selected}"><span>${esc(k.toUpperCase())} · terminal OM ${num(v.terminalMargin,0)}%</span><strong>${v.funded?usd(v.price):'Funding gap'}</strong><span>${v.funded?signed(v.upside)+' vs close · '+num(v.pe)+'× consensus EPS':'Financing and dilution unresolved'}</span><div class="bar" style="width:${Math.max(0,v.price/max*100)}%"></div></button>`).join('');
  $('keyNumbers').innerHTML=[[num(r.marketPE)+'×','Market P/E on published 2027 EPS'],[usd(z.usdEPS,2),firstYear()+' model EPS'],[signed(r.epsGapPct,2),'Model EPS vs published consensus'],[pct(r.terminalShare),'Enterprise value from terminal period']].map(([v,l])=>`<div class="tile"><strong>${v}</strong><span>${esc(l)}</span></div>`).join('');
  $('consensus').innerHTML=table(['Published annual estimate','Revenue','Native EPS','EPS per quoted share','Recalculated P/E at close'],model.consensus.map(x=>{const eps=E.quotedEPS(model,x.eps,a);return [`${esc(x.period)}<small>${esc(x.epsBasis)} · updated ${esc(x.updated)}</small>`,nat(x.revenue),(model.company==='SKHY'?'₩':'$')+num(x.eps,2),usd(eps,2),peText(model.price,eps)];}))+`<p class="sourcecaption">${tag('External consensus','estimate')} ${link('consensus')} · These are annual estimates, not a verified NTM series. Quoted price is the regular close; after-hours prices are excluded.</p>`;
  if(model.company==='SKHY'){
   const implied=model.price/model.headlinePE*a.fx/model.ordinaryPerQuote;
   $('ratioNote').innerHTML=`<b>Provider discrepancy remains unresolved.</b> CY2027 EPS ₩${num(con.eps,0)} × 0.1 ÷ ${num(a.fx)} = ${usd(r.consensusEPS,2)} per ADS; ${usd(model.price,2)} ÷ that EPS = <b>${num(r.marketPE)}×</b>. The displayed 4.17× headline instead requires ₩${num(implied,0)} ordinary-share EPS at this FX. Its period/basis was not verified. The CY2026 table’s 0.64× also fails the ADS conversion (recalculated ${peText(model.price,E.quotedEPS(model,model.consensus[0].eps,a))}). Neither vendor ratio is an input. ${link('headline')}`;
  }else $('ratioNote').innerHTML=`<b>Forward P/E matches the published FY2027 EPS:</b> ${usd(model.price,2)} ÷ $176.15 = ${num(r.marketPE)}×. FY2028 EPS has a different denominator and produces ${peText(model.price,E.quotedEPS(model,model.consensus[1].eps,a))}. Those annual periods are not interchangeable.`;
  const pre=z.ebit+a.netInterest;
  $('earningsBridge').innerHTML=table(['Line item',firstYear()],[[`Revenue ${tag(z.revenueTarget===null?'Driver forecast':selected==='central'?'Consensus revenue anchor':'Scenario revenue assumption',selected==='central'&&z.revenueTarget!==null?'estimate':'assumption')}`,nat(z.revenue)],['Gross profit / margin',nat(z.gross)+' / '+pct(z.gm)],['Operating expense including D&A',nat(z.opex)],['Operating income before extra economic SBC',nat(z.ebit)],['Recurring interest / other assumption',nat(a.netInterest)],['Tax on positive pretax income',nat(Math.max(pre,0)*a.tax/100)],['Minority earnings assumption',nat(model.epsMinority)],['Net income for EPS bridge',nat(z.netIncome)],['Shares used (millions)',num(r.shares,4)],['Model '+(model.company==='MU'?'adjusted-style':'recurring')+' EPS',usd(z.usdEPS,2)],['Economic EPS (SBC retained)',usd(z.economicEPS,2)],['Published consensus EPS per quote',usd(r.consensusEPS,2)],['Residual difference',usd(z.usdEPS-r.consensusEPS,2)+' / '+signed(r.epsGapPct,2)],['Market P/E on model EPS',peText(model.price,z.usdEPS)],['DCF value / consensus EPS',r.funded?num(r.pe)+'×':'Withheld: funding gap']]);
  const requiredEbit=(con.eps*r.shares/model.epsScale+model.epsMinority)/(1-a.tax/100)-a.netInterest;
  let notes=`<p>The first-year modeled operating income is ${nat(z.ebit)}. Matching the published EPS exactly with this share count, tax rate and recurring income would require ${nat(requiredEbit)} operating income, or ${pct((requiredEbit+z.opex)/z.revenue*100)} gross margin. <b>The difference is displayed, not inserted as an unexplained earnings adjustment.</b></p>`;
  if(model.company==='MU'){
   const q=model.facts.q1Revenue,step=(model.consensus[0].revenue-4*q)/6;
   notes+=`<p>The provider also publishes FY2027 net income of $196.36B. Its adjusted EPS × 1.15B guided shares implies ${usd(176.15*1.15,2)}B. The provider’s earnings bases, analyst samples and weighted shares are not fully reconciled; the ${usd(176.15*1.15-196.36,2)}B difference is disclosed.</p><p>Q1 guidance is $61.5B revenue and $38.15 adjusted EPS. A linear quarterly revenue bridge to the original FY2027 consensus is ${[0,1,2,3].map(i=>usd(q+i*step,2)+'B').join(' → ')}. Quarters 2–4 are a derived illustration, not company guidance.</p><p>FY2028 model EPS: ${usd(r.rows[1].usdEPS,2)} versus published $206.33 (${signed((r.rows[1].usdEPS/206.33-1)*100,2)}). SBC is charged separately for economic value; the result is not asserted to be GAAP EPS.</p>`;
  }else{
   notes+=`<p>Model EPS uses ${num(r.shares,3)}M pro forma ordinary shares after an assumed ${nat(model.facts.buybackBudget*a.buybackFraction/100)} buyback at ₩${num(a.buybackPrice,0)}. Current completion is unverified. The provider’s precise forward diluted-share basis is not available.</p><p>CY2026 provider net income of ₩257.23T and adjusted EPS of ₩355,218.93 should not be treated as recurring memory profit. Reported Q2 finance income is material. The cash-flow model removes portfolio gains/dividends and includes investment assets separately.</p><p>CY2027 rounded public EPS is ₩470.32K. The model separately assumes a 25% tax rate, ₩3T recurring interest and ₩0.2T minority earnings. Matching that consensus approximately is a cross-check, not proof of the forecast.</p>`;
  }
  $('earningsNotes').innerHTML=notes;
  $('peGrid').innerHTML=table(['Assumed P/E','4×','6×','8×','10×','12×'],[['2027 EPS × multiple',...[4,6,8,10,12].map(x=>usd(r.consensusEPS*x))]]);
  $('segments').innerHTML=table(['Business','Reported quarterly sales','Reported GM','2027 modeled sales','2027 modeled GM','2027 solved price/mix'],model.segments.map((s,i)=>[`${esc(s.name)}<small>${esc(s.driver)}</small>`,nat(s.revenue),s.gm===null?'Undisclosed':pct(s.gm,0)+(s.short==='Other'?' assumption':''),nat(z.revenues[i]),pct((z.revenues[i]-z.segmentCogs[i])/z.revenues[i]*100),signed(z.actualAsp[i])]))+`<p class="muted">Reported quarter: ${model.company==='MU'?'Q4 FY2026':'Q2 CY2026'}. Forecast mix, shipment changes, prices and product costs are assumptions. ${model.company==='SKHY'?'Product margins are derived from assumed cost allocation; they are not reported DRAM or NAND margins.':'Rounded business-unit margins and the small Other residual are reconciled in the source notes.'}</p>`;
  if(r.stub){const x=r.stub;$('stub').innerHTML='<h3>H2 CY2026 bridge before the first full forecast year</h3>'+table(['Line item','Amount ('+model.unitShort+')'],[['Revenue: CY2026 consensus less reported H1',num(x.revenue)],['Operating income: consensus less reported H1',num(x.ebit)],['Normalized operating profit after tax',num(x.nopat)],['D&A assumption',num(x.da)],['H2 capex: assumed full year less actual H1',num(x.capex)],['Working-capital investment',num(x.deltaNwc)],['Economic H2 FCFF',num(x.fcff)],['Elapsed portion credited to equity bridge',num(x.pastCash)],['Remaining portion discounted',num(x.future)]])+`<p class="muted">${pct(x.elapsed*100)} of H2 elapsed at the quote date. Uniform accrual is assumed; previously accrued taxes are reserved separately. Remaining cash uses a December 31 payment date.</p>`;}else $('stub').innerHTML='';
  $('forecast').innerHTML=table(['Year','Revenue','Economic EBIT','Taxed operating profit','D&A','Cash capex','Δ working capital','Economic FCFF','PV after quote date'],r.rows.map(x=>[x.year,nat(x.revenue),nat(x.economicEbit),nat(x.nopat),nat(x.da),nat(x.capex),nat(x.deltaNwc),nat(x.fcff),nat(x.pv)]));
  $('valueBridge').innerHTML=table(['Value component',model.unitShort],[['Explicit forecast cash flows, present value',num(r.explicitPV)],['Four-year normalization, present value',num(r.fadePV)],['Terminal business value, present value',num(r.terminalPV)],['Enterprise value',num(r.enterprise)],['Net balance-sheet / interim adjustment',num(r.equityBridge)],['Equity value',num(r.equity)],['Shares (millions)',num(r.shares,4)],['Value per ordinary share',r.funded?(model.company==='SKHY'?'₩':'$')+num(r.nativePrice,2):'Withheld: funding gap'],['Value per quoted share',r.funded?usd(r.price,2):'Withheld: funding gap']]);
  $('balanceBridge').innerHTML=table(['Component',model.unitShort],r.bridge.filter(x=>x.value!==0).map(x=>[`${esc(x.label)}<small>${esc(x.status)}</small>`,num(x.value)]));
  $('fade').innerHTML=table(['Year','Revenue','Economic operating margin','Operating profit after tax','Total reinvestment','FCFF'],r.fade.map(x=>[x.year,nat(x.revenue),pct(x.margin),nat(x.nopat),nat(x.reinvestment),nat(x.fcff)]));
  $('terminalNote').textContent=`Terminal year ${r.fade.at(-1).year+1}: NOPAT ${nat(r.terminalNopat)} less growth reinvestment ${nat(r.terminalReinvestment)} = FCFF ${nat(r.terminalFCFF)}. Reinvestment = NOPAT × ${a.terminalGrowth}% growth ÷ ${a.terminalRoi}% return on capital. Value = FCFF ÷ (${a.discount}% − ${a.terminalGrowth}%), discounted to the quote date. Growth reinvestment includes capital spending net of D&A and working capital; those are not deducted again.`;
  $('funding').textContent=r.funded?`Modeled minimum liquidity: ${nat(r.minimumLiquidity)} after conservative claim reserves. This uses estimated interim cash and does not verify bank cash or scheduled obligations.`:`Funding gap: modeled minimum liquidity ${nat(r.minimumLiquidity)}. Additional financing/dilution is required; a quoted-share valuation is withheld.`;$('funding').classList.toggle('fundingbad',!r.funded);
  const sens=E.sensitivity(model,selected);$('matrix').innerHTML=table(['Discount rate / terminal OM','30%','40%','50%','60%','70%'],sens.map(x=>[pct(x.discount,0),...x.values.map(y=>`<span class="${y.price>=model.price?'accent':'negative'}">${usd(y.price)}</span>`)]),'matrix');
  let noCash=E.clone(model);noCash.assumptions.interimCredit=0;const nr=E.run(noCash,selected);
  let check=`Removing the estimated interim cash credit changes this scenario from ${usd(r.price)} to ${usd(nr.price)}. `;
  if(model.company==='SKHY'){
   let weak=E.clone(model);weak.assumptions.fx*=1.1;
   let nobuy=E.clone(model);nobuy.assumptions.buybackFraction=0;
   check+=`A 10% higher KRW/USD conversion (weaker won, unchanged KRW operations) gives ${usd(E.run(weak,selected).price)} per ADS. Omitting the pro forma buyback changes the value to ${usd(E.run(nobuy,selected).price)}; cash and shares both change.`;
  }
  $('balanceSensitivity').textContent=check;
  if(!r.funded){$('matrix').innerHTML='<p>Resolve the funding gap before interpreting per-share sensitivities.</p>';$('balanceSensitivity').textContent='Additional funding or dilution has not been modeled.';}
 }catch(e){clearOutputs(e.message);}finally{rendering=false;}
}
function importText(text){
 const s=JSON.parse(text);if(s.schema!==2||s.company!==original.company||!s.model||s.model.company!==original.company)throw new Error('Wrong company or model version.');
 for(const k of Object.keys(original))if(!['assumptions','scenarios'].includes(k)&&JSON.stringify(s.model[k])!==JSON.stringify(original[k]))throw new Error('Reported evidence and consensus must match this version.');
 E.validate(s.model);E.all(s.model);if(!Object.hasOwn(s.model.scenarios,s.scenario))throw new Error('Unknown scenario.');
 model=E.clone(s.model);selected=s.scenario;render();$('status').textContent='Assumptions loaded and recalculated.';
}
document.addEventListener('change',async ev=>{
 if(rendering)return;
 const t=ev.target;
 if(t.id==='scenario'){selected=t.value;render();return;}
 if(t.id==='driverYear'){year=Number(t.value);render();return;}
 if(t.id==='load'){
  const f=t.files[0];if(!f)return;try{importText(await f.text());}catch(e){$('status').textContent='Load rejected: '+e.message;}t.value='';return;
 }
 if(t.dataset.scope){
  const scope=t.dataset.scope,k=t.dataset.key,raw=t.value;
  const value=raw===''?(scope==='row'&&k==='revenueTarget'?null:NaN):Number(raw);
  if(scope==='assumptions')model.assumptions[k]=value;
  else{const z=model.scenarios[selected].rows.find(x=>x.year===year);if(scope==='row')z[k]=value;else z[scope][Number(k)]=value;}
  render();
 }
});
document.addEventListener('click',ev=>{
 const b=ev.target.closest('[data-case]');if(b){selected=b.dataset.case;render();}
});
$('reset').onclick=()=>{model=E.clone(original);selected='central';year=2027;$('status').textContent='Defaults restored.';render();};
$('print').onclick=()=>window.print();
$('save').onclick=()=>{if(!results)return;const data={...E.session(model,selected),results:results[selected]};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=model.company.toLowerCase()+'_v2_0_assumptions.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
staticContent();render();window.ValueLabUI={getModel:()=>E.clone(model),getResults:()=>E.clone(results),getScenario:()=>selected,importText};
})();
