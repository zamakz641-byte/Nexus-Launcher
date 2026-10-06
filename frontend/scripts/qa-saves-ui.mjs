import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out=join(root,'artifacts/qa/saves');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 for(const locale of ['fr','en'])for(const width of [1920,640]){
  const context=await browser.newContext({viewport:{width,height:width===1920?1080:720}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(locale=>{
   localStorage.setItem('nexus.locale.v1',locale);localStorage.setItem('nexus.onboarding.complete.v1','true');
   const library={games:[{id:'saves-fixture',title:'Nexus Save Fixture',folderPath:'D:/Fixture',executablePath:'D:/Fixture/game.exe',executableName:'game.exe',modifiedAt:'2026-10-06T00:00:00Z',artworkUrl:'/assets/brand/nexus-mark.png'}],roots:[],manualGames:[],scanErrors:{}};
   const status={installed:true,enabled:true,available:true,supported:true,state:'ready',version:'0.1.1',downloadBytes:12500000,installedBytes:27000000,automatic:false,busy:false,destination:'D:/Cloud/Nexus Saves'};
   const scan={known:true,files:3,registry:0,bytes:256,versions:[{id:'fixture-v1',when:'2026-10-06T10:00:00Z'}]};
   window.nexusDesktop={platform:'win32',scanLibrary:async()=>library,listLibrary:async()=>library,onLibraryChanged:()=>()=>{},system:async()=>({profileName:'QA',libraryRoot:'D:/Fixture',providers:{local:true,steamStore:false,steamGridDb:false}}),getSavesStatus:async()=>status,inspectSaves:async()=>scan,backupSaves:async()=>scan,previewRestore:async()=>({...scan,token:'fixture-token'}),restoreSaves:async()=>scan,getGameActivity:async()=>({state:'ready',source:'Nexus',sessions:[]}),onActivityChanged:()=>()=>{},getCaptureEngineStatus:async()=>({installed:false,enabled:false,available:false,supported:true}),getSteamAccountStatus:async()=>({configured:false}),onSteamDataChanged:()=>()=>{}};
  },locale);
  await page.goto('http://127.0.0.1:13294/');await page.locator('.startup-sequence').waitFor();await page.keyboard.press('Escape');await page.locator('.top-navigation__route[href="/downloads"]').click();
  try{await page.getByRole('heading',{name:'Nexus Saves',exact:true}).waitFor({timeout:12000});}catch(error){console.log(JSON.stringify({errors,text:await page.locator('body').innerText()}));throw error;}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:join(out,`plugins-${locale}-${width}.png`)});
  await page.locator('.top-navigation__route[href="/library"]').click();await page.locator('button.library-entry').first().click();
  const trigger=page.getByRole('button',{name:locale==='fr'?'Sauvegardes':'Saves',exact:true});await trigger.click();await page.getByRole('button',{name:locale==='fr'?'Analyser':'Scan',exact:true}).click();
  await page.getByRole('button',{name:locale==='fr'?'Restaurer':'Restore',exact:true}).click();await page.getByRole('button',{name:locale==='fr'?'Restaurer cette version':'Restore this version',exact:true}).waitFor();
  const dimensions=await page.locator('.saves-dialog').evaluate(element=>({width:element.getBoundingClientRect().width,scroll:element.scrollWidth,client:element.clientWidth}));assert.ok(dimensions.scroll<=dimensions.client+1);
  await page.screenshot({path:join(out,`restore-${locale}-${width}.png`)});
  await page.keyboard.press('Escape');assert.ok(await trigger.evaluate(element=>document.activeElement===element));assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log(JSON.stringify({frEn:true,desktopAndCompact:true,noOverflow:true,restorePreview:true,escapeFocus:true,fixtureOnly:true}));
}finally{await browser.close();}
