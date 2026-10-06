import {spawn} from 'node:child_process';

// One bounded command per owned process. Save contents and raw paths are never logged.
export function runSaves(executable,command,{spawnProcess=spawn,timeout=120000}={}){
 return new Promise((resolve,reject)=>{
  const child=spawnProcess(executable,[],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let bytes=0,output=[],settled=false,aborted;
  const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(result);};
  // A requested termination is not an exited child: keep the caller's lock until close.
  const abort=code=>{if(aborted||settled)return;aborted=code;child.kill();};
  const timer=setTimeout(()=>abort('operation-timeout'),timeout);
  child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>1024*1024)abort('invalid-engine-response');else output.push(chunk);});
  child.stderr.on('data',()=>{});
  child.on('error',()=>finish(Error('engine-unavailable')));
  child.on('close',code=>{
   if(settled)return;
   if(aborted){finish(Error(aborted));return;}
   try{const result=JSON.parse(Buffer.concat(output).toString('utf8'));if(code!==0||result.ok===false)throw Error(result.error||'operation-failed');finish(null,result);}
   catch(error){finish(Error(/^[a-z-]{1,50}$/.test(error.message)?error.message:'invalid-engine-response'));}
  });
  child.stdin.on('error',()=>abort('engine-unavailable'));
  child.stdin.end(JSON.stringify(command));
 });
}
