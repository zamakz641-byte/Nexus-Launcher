import {mkdir,readFile,writeFile,rename,readdir,realpath,stat} from 'node:fs/promises';
import {join,basename,dirname,extname,relative,isAbsolute} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';

const types={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm'};
const inside=(file,root)=>{const path=relative(root,file);return path!== '..'&&!path.startsWith('..\\')&&!path.startsWith('../')&&!isAbsolute(path);};
function folderName(title){const clean=String(title||'Desktop').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').replace(/[. ]+$/g,'').trim().slice(0,80);return !clean||/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(clean)?'Desktop':clean;}

export class CaptureModule {
  id='capture';
  constructor(dir,{root,externalRoots=async()=>[],screenshot,companion}={}){
    this.file=join(dir,'capture-library.json');this.root=root;this.externalRoots=externalRoots;
    this.screenshotProvider=screenshot;this.companion=companion;this.index=new Map();this.sessions=new Map();this.writes=Promise.resolve();this.captures=new Set();this.stopped=false;
  }
  async preferences(){try{const value=JSON.parse(await readFile(this.file,'utf8'));return {roots:Array.isArray(value.roots)?value.roots.filter(x=>typeof x==='string').slice(0,16):[],favorites:Array.isArray(value.favorites)?value.favorites.filter(x=>typeof x==='string').slice(0,2000):[]};}catch{return {roots:[],favorites:[]};}}
  save(change){const task=this.writes.then(async()=>{const prefs=await this.preferences();await mkdir(dirname(this.file),{recursive:true});await writeFile(this.file+'.tmp',JSON.stringify(change(prefs)),'utf8');await rename(this.file+'.tmp',this.file);});this.writes=task.catch(()=>{});return task;}
  async addFolder(path){const root=await realpath(path);if(!(await stat(root)).isDirectory())throw Error('invalid-folder');await this.save(prefs=>({...prefs,roots:[...new Set([...prefs.roots,root])].slice(-16)}));return this.refresh();}
  async roots(){const prefs=await this.preferences(),external=await this.externalRoots();return [...new Set([this.root,...prefs.roots,...external].filter(Boolean))];}
  list(){if(this.scanning)return this.scanning;this.scanning=this.scan().finally(()=>{this.scanning=null;});return this.scanning;}
  async refresh(){if(this.scanning)await this.scanning;return this.list();}
  async scan(){
    const prefs=await this.preferences(),items=[],index=new Map(),errors=[];let visited=0,truncated=false;
    for(const source of await this.roots()){
      let root;try{root=await realpath(source);}catch{if(prefs.roots.includes(source))errors.push(basename(source));continue;}
      const visit=async(folder,depth)=>{
        let entries;try{entries=await readdir(folder,{withFileTypes:true});}catch{errors.push(basename(folder));return;}
        for(const entry of entries){if(++visited>10000){truncated=true;return;}const path=join(folder,entry.name);
          if(entry.isSymbolicLink())continue;
          if(entry.isDirectory()){if(depth<4)await visit(path,depth+1);continue;}
          if(entry.name.endsWith('_clip.png')&&entries.some(other=>other.name===entry.name.replace(/_clip\.png$/,'.mp4')))continue;
          const mime=types[extname(entry.name).toLowerCase()];if(!entry.isFile()||!mime)continue;
          try{const file=await realpath(path);if(!inside(file,root))continue;const info=await stat(file);if(!info.isFile()||info.size<=0||info.size>8*1024**3)continue;
            const id=createHash('sha256').update(process.platform==='win32'?file.toLowerCase():file).digest('hex');if(index.has(id))continue;
            index.set(id,{file,root,mime});items.push({id,kind:mime.startsWith('video/')?'clip':'image',name:entry.name,game:folder===root?'Desktop':/^(Clips|Screenshots)$/i.test(basename(folder))?basename(dirname(folder)):basename(folder),source:root===this.root?'Nexus':basename(root),createdAt:info.mtime.toISOString(),bytes:info.size,favorite:prefs.favorites.includes(id),url:`nexus://media/capture?id=${id}`});
          }catch{/* A recording may be moved while scanning. */}
        }
      };
      await visit(root,0);if(truncated)break;
    }
    items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));const visible=items.slice(0,500);this.index=new Map(visible.map(item=>[item.id,index.get(item.id)]));
    return {items:visible,roots:prefs.roots,truncated:truncated||items.length>500,errors};
  }
  async authorize(id){if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))return null;const entry=this.index.get(id);if(!entry)return null;
    try{const file=await realpath(entry.file);if(file!==entry.file||!inside(file,entry.root))return null;const info=await stat(file);if(!info.isFile()||info.size>8*1024**3)return null;return {...entry,size:info.size};}catch{return null;}
  }
  async favorite(id,value){if(typeof value!=='boolean'||!await this.authorize(id))throw Error('invalid-media');await this.save(prefs=>({...prefs,favorites:value?[...new Set([...prefs.favorites,id])]:prefs.favorites.filter(item=>item!==id)}));return this.refresh();}
  start({on,publish}){
    this.publish=publish;
    on('GameStarted',async event=>{this.sessions.set(event.sessionId,event);if(this.companion)await this.companion.gameStarted(event);});
    on('GameStopped',async event=>{this.sessions.delete(event.sessionId);if(this.companion)await this.companion.gameStopped(event);});
    on('ScreenshotRequested',()=>this.screenshot());
  }
  screenshot(locale){
    if(this.stopped)return Promise.reject(Error('capture-stopped'));
    if(locale==='fr'||locale==='en')this.locale=locale;
    const task=this.takeScreenshot();this.captures.add(task);
    task.then(()=>this.captures.delete(task),()=>this.captures.delete(task));return task;
  }
  async takeScreenshot(){
    const context=[...this.sessions.values()].at(-1),game=folderName(context?.title),folder=join(this.root,game);
    const data=await this.screenshotProvider();if(!Buffer.isBuffer(data)||data.length<8||data.length>64*1024**2||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('capture-failed');
    await mkdir(folder,{recursive:true});const trustedRoot=await realpath(this.root),trustedFolder=await realpath(folder);if(!inside(trustedFolder,trustedRoot))throw Error('invalid-folder');
    const file=join(trustedFolder,`${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID().slice(0,8)}.png`);
    await writeFile(file,data,{flag:'wx'});await this.refresh();
    const id=createHash('sha256').update(process.platform==='win32'?file.toLowerCase():file).digest('hex');
    void this.publish?.('CaptureSaved',{id,kind:'image',gameId:context?.gameId,gameTitle:context?.title,locale:context?.locale||this.locale||'fr'});return {ok:true,id};
  }
  async adoptSaved(message,context){
    if(!['image','clip'].includes(message.kind)||typeof message.file!=='string'||!isAbsolute(message.file))throw Error('invalid-media');
    const root=await realpath(this.root),file=await realpath(message.file),info=await stat(file);
    const mime=types[extname(file).toLowerCase()];
    if(!inside(file,root)||!info.isFile()||info.size<=0||info.size>8*1024**3||!mime||mime.startsWith('video/')!==(message.kind==='clip'))throw Error('invalid-media');
    await this.refresh();const id=createHash('sha256').update(process.platform==='win32'?file.toLowerCase():file).digest('hex');
    void this.publish?.('CaptureSaved',{id,kind:message.kind,gameId:context?.gameId,gameTitle:context?.title,locale:context?.locale||this.locale||'fr'});return {ok:true,id};
  }
  async stop(){this.stopped=true;await Promise.allSettled([...this.captures]);await this.writes;if(this.companion?.dispose)await this.companion.dispose();else await this.companion?.disconnect();}
}
