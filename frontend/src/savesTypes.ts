import type {CaptureEngineStatus} from './captureTypes';
export interface SavesStatus extends CaptureEngineStatus {destination?:string;automatic:boolean;busy:boolean;last?:{gameId:string;when:string}}
export interface SaveVersion {id:string;when:string}
export interface SavesScan {known:boolean;files:number;registry:number;bytes:number;versions?:SaveVersion[];token?:string}
