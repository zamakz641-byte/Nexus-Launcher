import {mkdir,open,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export class OfficialInstaller {
  constructor(dir,companion,{fetch=globalThis.fetch,openSteam=async()=>{},runInstaller,minSize=20*1024*1024,policy}={}){Object.assign(this,{dir,companion,fetch,openSteam,runInstaller,minSize,policy});this.state='idle';this.progress=0;}
  async status(){return {...await this.companion.status(),state:this.state,progress:this.progress,error:this.error};}
  activate(){if(this.pending)return this.pending;this.pending=this.run().finally(()=>{this.pending=null;});return this.pending;}
  cancel(){this.controller?.abort();}
  async run(){
    this.error=undefined;this.controller=new AbortController();const signal=this.controller.signal;let temp;
    try{
      await this.openSteam();if(signal.aborted)throw new Error('cancelled');const status=await this.companion.status();if(!status.supported)throw new Error('unsupported');
      if(!status.installed){
        this.state='downloading';this.progress=0;
        const release=await this.fetch(this.policy.release,{signal});if(!release.ok)throw new Error('download-failed');
        const data=await release.json();const asset=data.assets?.find(x=>this.policy.name.test(x.name));
        if(!asset||!Number.isInteger(asset.size)||asset.size<this.minSize||asset.size>350*1024*1024||!/^sha256:[a-f0-9]{64}$/.test(asset.digest)||!this.policy.url.test(asset.browser_download_url))throw new Error('invalid-release');
        await mkdir(join(this.dir,'installers'),{recursive:true});const target=join(this.dir,'installers',asset.name);temp=target+'.part';
        const response=await this.fetch(asset.browser_download_url,{signal});if(!response.ok||!response.body)throw new Error('download-failed');
        const file=await open(temp,'w'),reader=response.body.getReader(),hash=createHash('sha256');let received=0;
        try{while(true){const {done,value}=await reader.read();if(done)break;if(signal.aborted)throw new Error('cancelled');received+=value.length;if(received>asset.size)throw new Error('invalid-download');hash.update(value);let offset=0;while(offset<value.length){const {bytesWritten}=await file.write(value,offset,value.length-offset);if(!bytesWritten)throw new Error('disk-error');offset+=bytesWritten;}this.progress=Math.floor(received/asset.size*100);}}finally{await file.close();reader.releaseLock();}
        if(received!==asset.size||hash.digest('hex')!==asset.digest.slice(7))throw new Error('checksum-mismatch');await rename(temp,target);temp=null;
        if(signal.aborted)throw new Error('cancelled');this.state='installing';await this.runInstaller(target);
        if(!(await this.companion.status()).installed)throw new Error('install-cancelled');
      }
      if(signal.aborted)throw new Error('cancelled');await this.companion.enable(true);
      if((await this.companion.ensureStarted()).state!=='running')throw new Error('start-failed');this.state='ready';this.progress=100;
    }catch(error){this.state=signal.aborted?'cancelled':'error';this.error=['unsupported','invalid-release','checksum-mismatch','install-cancelled','start-failed'].includes(error.message)?error.message:'download-failed';}
    finally{if(temp)await rm(temp,{force:true}).catch(()=>{});this.controller=null;}
    return this.status();
  }
}
