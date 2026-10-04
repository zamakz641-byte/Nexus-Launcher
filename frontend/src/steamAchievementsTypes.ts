export interface SteamAccountStatus { configured:boolean; storageAvailable:boolean; steamId?:string; error?:string }
export interface SteamAchievement { id:string; title:string; description:string; hidden?:boolean; unlocked:boolean; unlockTime:number|null; icon?:string }
export interface SteamAchievementResult { source:'Steam'; appId?:number; state:'ready'|'empty'|'unconfigured'|'unsupported'|'private'|'unavailable'|'offline'|'error'; lastSynced:string|null; cached:boolean; achievements:SteamAchievement[]; error?:string }
