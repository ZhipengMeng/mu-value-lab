'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const app=path.join(__dirname,'memory_valuation_comparison.html'),checks=[];
const check=(v,m)=>{assert.ok(v,m);checks.push(m);};
(async()=>{
 const executablePath=process.env.BROWSER_EXECUTABLE||process.env.SNDK_BROWSER_EXECUTABLE||[chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/chromium'].find(p=>fs.existsSync(p));
 const browser=await chromium.launch({headless:true,executablePath});
 try{
  for(const [layout,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
   const context=await browser.newContext({viewport:{width,height},offline:true}),page=await context.newPage(),errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
   await page.goto(pathToFileURL(app).href);
   check((await page.locator('#winner').innerText()).startsWith('SKHY'),layout+' default ranking');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),layout+' no page overflow');
   const rows=await page.evaluate(()=>window.comparisonRows);
   check(Math.abs(rows.find(x=>x.company==='MU').pe-5.526019010794264)<1e-8,layout+' MU calendarized PE');
   check(Math.abs(rows.find(x=>x.company==='SKHY').pe-4.819036962068379)<1e-8,layout+' SKHY ADS PE');
   for(const c of ['sndk','mu','skhy'])check(await page.locator('a[href="https://zhipengmeng.github.io/'+c+'-value-lab/"]').count()===2,layout+' separate '+c+' model links');
   check(await page.locator('a[download]').getAttribute('href')==='memory_valuation_comparison.html',layout+' comparison download');
   await page.locator('#extra').fill('4');await page.locator('#extra').dispatchEvent('change');
   check((await page.locator('#winner').innerText()).startsWith('MU'),layout+' risk premium changes ranking');
   await page.locator('#reset').click();await page.locator('#annualFx').fill('2');await page.locator('#annualFx').dispatchEvent('change');await page.locator('#fx').fill('10');await page.locator('#fx').dispatchEvent('change');
   check((await page.locator('#winner').innerText()).startsWith('MU'),layout+' FX risk changes ranking');
   await page.locator('#reset').click();await page.locator('#rate').fill('');await page.locator('#rate').dispatchEvent('change');
   check(await page.locator('#error').isVisible(),layout+' invalid discount rejected');
   check((await page.locator('#liveTable').innerText())==='',layout+' invalid outputs cleared');
   await page.locator('#reset').click();await page.locator('#interim').uncheck();
   check((await page.locator('#liveTable').innerText()).includes('1,948'),layout+' interim cash removal recalculates');
   await page.locator('#reset').click();await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:path.join(__dirname,'verification',layout+'.png')});
   check(errors.length===0,layout+' no script errors');check(requests.length===0,layout+' offline without external requests');
   await context.close();
  }
  const report={status:'pass',checks:checks.length,checksPerformed:checks,htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(app)).digest('hex'),scope:'Offline desktop/mobile behavior and explicit public links; live link checks follow deployment.'};
  fs.writeFileSync(path.join(__dirname,'verification/browser_report.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS comparison browser:',checks.length);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
