export interface GameActivityResult {
  source:'Nexus';state:'ready'|'unavailable';sessions:Array<{
    sessionId:string;gameId:string;title:string;startedAt:string;stoppedAt:string|null;
    durationSeconds:number|null;state:'running'|'completed'|'interrupted';
  }>;
}
