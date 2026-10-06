import {_electron as electron} from 'playwright-core';
import {mkdir,mkdtemp} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'),out=join(root,'artifacts/qa/saves-desktop');await mkdir(out,{recursive:true});
const profile=await mkdtemp(join(out,'profile-'));
const {ELECTRON_RUN_AS_NODE:_,...env}=process.env;env.NEXUS_STEAM_ROOT=join(profile,'empty-steam');
const app=await electron.launch({executablePath:join(root,'release/win-unpacked/Nexus Launcher.exe'),args:[`--user-data-dir=${profile}`],cwd:root,env});
try{
 const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.locator('.startup-sequence').waitFor();await page.keyboard.press('Escape');
 await page.evaluate(()=>{localStorage.setItem('nexus.onboarding.complete.v1','true');localStorage.setItem('nexus.locale.v1','en');});await page.reload();await page.locator('.startup-sequence').waitFor();await page.keyboard.press('Escape');
 const modules=await page.evaluate(()=>window.nexusDesktop.getModuleStatus());assert.equal(modules.find(item=>item.id==='saves').state,'ready');
 await page.locator('.top-navigation__route[href="/downloads"]').click();await page.getByRole('heading',{name:'Nexus Saves',exact:true}).waitFor();
 const status=await page.evaluate(()=>window.nexusDesktop.getSavesStatus());assert.equal(status.id,'nexus-saves');assert.equal(status.automatic,false);assert.equal(status.installed,false);
 await page.screenshot({path:join(out,'plugins-packaged-en.png')});assert.deepEqual(errors,[]);
 console.log(JSON.stringify({packaged:true,realIpc:true,savesReady:true,automaticOff:true,consolePlugins:true,errors}));
}finally{await app.close();}
