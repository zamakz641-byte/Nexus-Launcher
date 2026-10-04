import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(()=>localStorage.setItem('nexus.onboarding.complete.v1','true'));
const game={id:'qa-detail',title:'Strikers Club',platform:'Steam',folderPath:'C:/QA',executablePath:'C:/QA/game.exe',modifiedAt:new Date().toISOString(),artworkUrl:'/assets/brand/nexus-mark.png',metadata:{description:{fr:'Une description unique de ce jeu.',en:'One description of this game.'},steamAppId:123}};
await page.route('**/api/library/**',route=>{
  const path=new URL(route.request().url()).pathname;
  return route.fulfill({json:path.endsWith('/scan')?{games:[game],roots:[],manualGames:[]}:path.endsWith('/changes')?{changed:false}:{providers:{},profileName:'QA'}});
});
const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:13293';
try {
  await page.goto(`${base}/library`);await page.locator('.library-entry').first().click();await page.locator('.game-detail__cover').waitFor();
  assert.equal(await page.locator('.game-detail__hero > p').count(),0);
  assert.equal(await page.locator('.game-detail__customize').count(),0);
  const customize=page.getByRole('button',{name:'Personnaliser',exact:true});await customize.click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
  assert.equal(await customize.evaluate(element=>element===document.activeElement),true);
  await mkdir('artifacts/qa/accounts',{recursive:true});
  for(const width of [1920,640]) {
    await page.setViewportSize({width,height:width===640?720:1080});await page.waitForTimeout(300);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
    await page.screenshot({path:`artifacts/qa/accounts/detail-${width}.png`});
  }
  await page.getByRole('button',{name:'Relier mes comptes',exact:true}).click();await page.locator('.connected-accounts').waitFor();
  assert.equal(await page.locator('.account-card').count(),3);
  for(const name of ['Steam','Epic Games','GOG'])assert.equal(await page.getByRole('button',{name:`Connecter ${name}`,exact:true}).isDisabled(),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await page.screenshot({path:'artifacts/qa/accounts/accounts-640.png'});
  await page.setViewportSize({width:1920,height:1080});await page.screenshot({path:'artifacts/qa/accounts/accounts-1920.png'});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({visualCover:true,noDuplicateDescription:true,customizationDialog:true,focusRestored:true,threeProviders:true,noFakeBrowserLogin:true,noOverflow:true,errors}));
}finally{await browser.close();}
