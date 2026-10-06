import {createConnection} from 'node:net';
import {randomUUID} from 'node:crypto';
export class GameHQPipe {
  constructor({endpoint='\\\\.\\pipe\\GameHQ.Local.v1',timeout=1500}={}){this.endpoint=endpoint;this.timeout=timeout;this.pending=new Map();this.capabilities=[];}
  connect(){if(this.ready)return Promise.resolve();if(this.connecting)return this.connecting;
    this.connecting=this.open().finally(()=>{this.connecting=null;});return this.connecting;
  }
  async open(){
    if(Date.now()<(this.maintenanceUntil||0))throw Error('maintenance');
    this.disconnect();const socket=createConnection(this.endpoint);this.socket=socket;let buffer=Buffer.alloc(0);
    socket.on('data',data=>{try{buffer=Buffer.concat([buffer,data]);if(buffer.length>256*1024)throw Error('invalid-frame');while(buffer.length>=4){const length=buffer.readUInt32LE();if(!length||length>65536)throw Error('invalid-frame');if(buffer.length<length+4)break;const text=new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(4,length+4));const message=JSON.parse(text);buffer=buffer.subarray(length+4);if(!message||typeof message.type!=='string')throw Error('invalid-frame');if(message.type==='app.maintenance')this.maintenanceUntil=Date.now()+Math.min(300,Math.max(5,Number(message.retryAfterSeconds)||30))*1000;const pending=this.pending.get(message.requestId);if(pending){this.pending.delete(message.requestId);clearTimeout(pending.timer);message.type==='error'?pending.reject(Error('engine-unavailable')):pending.resolve(message);}}}catch{this.disconnect();}});
    socket.on('error',()=>{if(this.socket===socket)this.disconnect();});socket.on('close',()=>{if(this.socket===socket)this.disconnect();});
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{reject(Error('engine-timeout'));socket.destroy();},this.timeout);socket.once('connect',()=>{clearTimeout(timer);resolve();});socket.once('error',()=>{clearTimeout(timer);reject(Error('engine-offline'));});socket.once('close',()=>{clearTimeout(timer);reject(Error('engine-offline'));});});
    const hello=await this.send({type:'hello',client:'Nexus.Launcher',clientVersion:'2.4.0',protocolMin:1,protocolMax:1});
    if(hello.type!=='hello.ack'||hello.protocolSelected!==1||!Array.isArray(hello.capabilities)){this.disconnect();throw Error('engine-incompatible');}
    this.capabilities=hello.capabilities.filter(x=>typeof x==='string');this.ready=true;
  }
  send(message){if(!this.socket||this.socket.destroyed)return Promise.reject(Error('engine-offline'));const requestId=randomUUID(),payload=Buffer.from(JSON.stringify({...message,requestId}));if(payload.length>65536)return Promise.reject(Error('invalid-frame'));const frame=Buffer.alloc(payload.length+4);frame.writeUInt32LE(payload.length);payload.copy(frame,4);
    return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(requestId);reject(Error('engine-timeout'));},this.timeout);this.pending.set(requestId,{resolve,reject,timer});this.socket.write(frame,error=>{if(error){clearTimeout(timer);this.pending.delete(requestId);reject(Error('engine-offline'));}});});
  }
  async request(type,fields={}){await this.connect();const capability=type.startsWith('playnite.')?'game.lifecycle.v1':type==='status.request'?'status.v1':type;
    if(!this.capabilities.includes(capability))throw Error('engine-incompatible');const reply=await this.send({...fields,type});
    if(type==='status.request'?reply.type!=='status.response':reply.type!=='ack'||reply.acceptedType!==type)throw Error('engine-incompatible');return reply;
  }
  disconnect(){this.ready=false;const socket=this.socket;this.socket=null;socket?.destroy();for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(Error('engine-offline'));}this.pending.clear();}
}
