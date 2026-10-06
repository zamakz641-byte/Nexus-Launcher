import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const safePath=value=>typeof value==='string'&&value.length<240&&!value.includes('\\')&&!value.startsWith('/')&&value.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!/[<>:"|?*\x00-\x1f]/.test(part)&&!/[. ]$/.test(part)&&!/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(part));
export function unpackVerifiedZip(zip,files){
  if(!Buffer.isBuffer(zip)||zip.length>100*1024**2||!Array.isArray(files)||!files.length||files.length>128)throw Error('invalid-package');
  const expected=new Map();let total=0;
  for(const file of files){if(!safePath(file.path)||expected.has(file.path.toLowerCase())||!Number.isSafeInteger(file.size)||file.size<0||file.size>100*1024**2||!/^[a-f0-9]{64}$/.test(file.sha256))throw Error('invalid-manifest');expected.set(file.path.toLowerCase(),file);total+=file.size;}
  if(total>150*1024**2)throw Error('package-too-large');
  let end=-1;for(let i=zip.length-22;i>=Math.max(0,zip.length-65557);i--)if(zip.readUInt32LE(i)===0x06054b50&&i+22+zip.readUInt16LE(i+20)===zip.length){end=i;break;}
  if(end<0||zip.readUInt16LE(end+4)||zip.readUInt16LE(end+6)||zip.readUInt16LE(end+8)!==zip.readUInt16LE(end+10))throw Error('invalid-package');
  const count=zip.readUInt16LE(end+10),size=zip.readUInt32LE(end+12),offset=zip.readUInt32LE(end+16);
  if(count>256||offset+size!==end)throw Error('invalid-package');
  const seen=new Set(),result=[];let cursor=offset;
  for(let i=0;i<count;i++){
    if(cursor+46>end||zip.readUInt32LE(cursor)!==0x02014b50)throw Error('invalid-package');
    const flags=zip.readUInt16LE(cursor+8),method=zip.readUInt16LE(cursor+10),compressed=zip.readUInt32LE(cursor+20),length=zip.readUInt32LE(cursor+24),nameLength=zip.readUInt16LE(cursor+28),extra=zip.readUInt16LE(cursor+30),comment=zip.readUInt16LE(cursor+32),attributes=zip.readUInt32LE(cursor+38),local=zip.readUInt32LE(cursor+42);
    if(cursor+46+nameLength+extra+comment>end)throw Error('invalid-package');
    const name=new TextDecoder('utf-8',{fatal:true}).decode(zip.subarray(cursor+46,cursor+46+nameLength));cursor+=46+nameLength+extra+comment;
    const directory=name.endsWith('/'),path=directory?name.slice(0,-1):name,key=path.toLowerCase();
    if(!safePath(path)||seen.has(key)||flags&1||((attributes>>>16)&0xf000)===0xa000||![0,8].includes(method))throw Error('invalid-package');seen.add(key);
    if(directory){if(!files.some(file=>file.path.startsWith(path+'/')))throw Error('invalid-package');continue;}
    const expectedFile=expected.get(key);if(!expectedFile||expectedFile.path!==path||expectedFile.size!==length||local+30>offset||zip.readUInt32LE(local)!==0x04034b50)throw Error('invalid-package');
    const localNameLength=zip.readUInt16LE(local+26),localExtra=zip.readUInt16LE(local+28),start=local+30+localNameLength+localExtra;
    if(start+compressed>offset||zip.subarray(local+30,local+30+localNameLength).toString('utf8')!==path||zip.readUInt16LE(local+8)!==method)throw Error('invalid-package');
    const bytes=method===0?zip.subarray(start,start+compressed):inflateRawSync(zip.subarray(start,start+compressed),{maxOutputLength:Math.max(1,length)});
    if(bytes.length!==length||createHash('sha256').update(bytes).digest('hex')!==expectedFile.sha256)throw Error('checksum-mismatch');result.push({path,bytes});
  }
  if(cursor!==end||result.length!==files.length)throw Error('invalid-package');return result;
}
