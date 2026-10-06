// @vitest-environment jsdom
import React from 'react';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,test,vi} from 'vitest';
import {GameSaves} from './GameSaves';
import {SavesPluginCard} from './SavesPluginCard';
import {useNexusStore} from '../state/useNexusStore';
afterEach(()=>{cleanup();delete window.nexusDesktop;});
test('restore requires preview and explicit confirmation; closing restores focus',async()=>{
 useNexusStore.setState({locale:'en'});
 const restore=vi.fn().mockResolvedValue({known:true,files:1,registry:0,bytes:32});
 const preview=vi.fn().mockResolvedValue({known:true,files:1,registry:0,bytes:32,token:'confirmation'});
 window.nexusDesktop={getSavesStatus:vi.fn().mockResolvedValue({enabled:true,installed:true,automatic:false,busy:false,destination:'D:/Backups/Nexus Saves',supported:true}),inspectSaves:vi.fn().mockResolvedValue({known:true,files:1,registry:0,versions:[{id:'one',when:'2026-10-06T00:00:00Z'}]}),previewRestore:preview,restoreSaves:restore} as unknown as NonNullable<Window['nexusDesktop']>;
 render(<GameSaves gameId="game" title="Game" locale="en"/>);const trigger=screen.getByRole('button',{name:'Saves'});fireEvent.click(trigger);
 await screen.findByRole('button',{name:'Scan'});fireEvent.click(screen.getByRole('button',{name:'Scan'}));
 fireEvent.click(await screen.findByRole('button',{name:'Restore'}));await screen.findByRole('button',{name:'Restore this version'});
 expect(preview).toHaveBeenCalledWith('game','one');expect(restore).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Restore this version'}));await waitFor(()=>expect(restore).toHaveBeenCalledWith('confirmation'));
 fireEvent.click(screen.getByRole('button',{name:'Close'}));await waitFor(()=>expect(document.activeElement).toBe(trigger));
});
test('the download can be cancelled while its install request is still pending',async()=>{
 useNexusStore.setState({locale:'en'});let finish!:(value:unknown)=>void;const cancel=vi.fn().mockResolvedValue({state:'cancelled'});
 window.nexusDesktop={getSavesStatus:vi.fn().mockResolvedValue({enabled:false,installed:false,available:true,supported:true,automatic:false,busy:false}),activateSaves:vi.fn().mockImplementation(()=>new Promise(resolve=>finish=resolve)),cancelSavesSetup:cancel} as unknown as NonNullable<Window['nexusDesktop']>;
 render(<SavesPluginCard/>);fireEvent.click(await screen.findByRole('button',{name:'Install'}));fireEvent.click(await screen.findByRole('button',{name:'Cancel'}));await waitFor(()=>expect(cancel).toHaveBeenCalledOnce());finish({state:'cancelled'});
});
