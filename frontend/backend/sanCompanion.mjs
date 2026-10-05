import {readFile, writeFile, mkdir, rename, readdir, stat} from 'node:fs/promises';
import {join, basename, dirname, isAbsolute} from 'node:path';
import {spawn, execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const executableName=/^Steam Achievement Notifier(?: \(V[\d.]+\))?\.exe$/i;
async function running(exe){
  const env={...process.env};for(const key of Object.keys(env))if(key.toLowerCase()==='psmodulepath')delete env[key];
  env.PSModulePath=join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','Modules');
  const {stdout}=await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-CimInstance Win32_Process | Where-Object {$_.Name -like 'Steam Achievement Notifier*.exe'} | Select-Object -ExpandProperty ExecutablePath) | ConvertTo-Json -Compress"],{env,windowsHide:true,timeout:6000});
  const paths=JSON.parse(stdout||'[]');return (Array.isArray(paths)?paths:[paths]).some(path=>typeof path==='string'&&path.toLowerCase()===exe.toLowerCase());
}
// Optional installed companion. No SAN source, native binaries or credentials are bundled.
export class SanCompanion {
  constructor(root,{platform=process.platform,programRoots=[join(process.env.LOCALAPPDATA||root,'Programs'),process.env.ProgramFiles,process.env['ProgramFiles(x86)']].filter(Boolean),spawn:spawnProcess=spawn,isRunning=running}={}){
    Object.assign(this,{root,platform,programRoots,spawn:spawnProcess,isRunning});this.file=join(root,'san-companion.json');this.writes=Promise.resolve();
  }
  async preferences(){try{const value=JSON.parse(await readFile(this.file,'utf8'));return {enabled:value.enabled===true,executable:typeof value.executable==='string'?value.executable:''};}catch{return {enabled:false,executable:''};}}
  async valid(exe){return typeof exe==='string'&&isAbsolute(exe)&&executableName.test(basename(exe))&&(await stat(exe).catch(()=>null))?.isFile();}
  async detect(preferred){
    if(this.platform!=='win32')return '';
    if(await this.valid(preferred))return preferred;
    for(const root of this.programRoots){for(const entry of await readdir(root,{withFileTypes:true}).catch(()=>[])){
      if(!entry.isDirectory()||!/^Steam Achievement Notifier/i.test(entry.name))continue;
      const dir=join(root,entry.name);for(const file of await readdir(dir).catch(()=>[])){const exe=join(dir,file);if(await this.valid(exe))return exe;}
    }}return '';
  }
  async status(){const prefs=await this.preferences(),exe=await this.detect(prefs.executable);return {enabled:prefs.enabled,installed:!!exe,executable:exe,supported:this.platform==='win32'};}
  save(value){const task=this.writes.then(async()=>{await mkdir(this.root,{recursive:true});await writeFile(this.file+'.tmp',JSON.stringify(value),'utf8');await rename(this.file+'.tmp',this.file);});this.writes=task.catch(()=>{});return task;}
  async choose(executable){if(this.platform!=='win32'||!await this.valid(executable))throw new Error('invalid-san-executable');const prefs=await this.preferences();await this.save({...prefs,executable});return this.status();}
  async enable(enabled){if(typeof enabled!=='boolean')throw new Error('invalid-preference');const value=await this.status();if(enabled&&!value.installed)throw new Error('san-not-installed');await this.save({enabled,executable:value.executable});return this.status();}
  ensureStarted(){if(this.pending)return this.pending;this.pending=this.start().finally(()=>{this.pending=null;});return this.pending;}
  async start(){
    const value=await this.status();if(!value.enabled)return {state:'disabled'};if(!value.installed)return {state:'missing'};
    try{
      if(this.child||await this.isRunning(value.executable))return {state:'running'};
      const child=this.spawn(value.executable,[],{cwd:dirname(value.executable),shell:false,detached:true,stdio:'ignore',windowsHide:true});
      await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});
      this.child=child;child.once('exit',()=>{if(this.child===child)this.child=null;});child.on('error',()=>{if(this.child===child)this.child=null;});child.unref();return {state:'running'};
    }catch{return {state:'error'};}
  }
}
