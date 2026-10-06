import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
export function mediaRange(value,size){
  if(!value)return {start:0,end:size-1,status:200};
  const match=/^bytes=(\d*)-(\d*)$/.exec(value);if(!match||(!match[1]&&!match[2]))return null;
  if ([match[1],match[2]].some(value=>value&&!Number.isSafeInteger(Number(value))))return null;
  const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2])),end=match[1]?(match[2]?Math.min(size-1,Number(match[2])):size-1):size-1;
  return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&start<size&&end>=start?{start,end,status:206}:null;
}
export async function serveCapture(service,request){
  const entry=await service.authorize(new URL(request.url).searchParams.get('id'));if(!entry)return new Response('Not found',{status:404});
  const range=mediaRange(request.headers.get('range'),entry.size);if(!range)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${entry.size}`}});
  const headers={'Content-Type':entry.mime,'Content-Length':String(range.end-range.start+1),'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  if(range.status===206)headers['Content-Range']=`bytes ${range.start}-${range.end}/${entry.size}`;
  if(request.method==='HEAD')return new Response(null,{status:range.status,headers});
  return new Response(Readable.toWeb(createReadStream(entry.file,{start:range.start,end:range.end})),{status:range.status,headers});
}
