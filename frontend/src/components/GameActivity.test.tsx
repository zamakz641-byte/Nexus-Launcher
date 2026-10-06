// @vitest-environment jsdom
import React from 'react';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,test,vi} from 'vitest';
import {GameActivity} from './GameActivity';
afterEach(()=>{cleanup();delete window.nexusDesktop;});
test('actual session duration and interruption translate without invented hardware statistics',async()=>{
 window.nexusDesktop={getGameActivity:vi.fn().mockResolvedValue({source:'Nexus',state:'ready',sessions:[{sessionId:'one',gameId:'game',title:'Game',startedAt:'2026-10-06T10:00:00Z',durationSeconds:8220,state:'completed'},{sessionId:'two',gameId:'game',title:'Game',startedAt:'2026-10-06T09:00:00Z',durationSeconds:null,state:'interrupted'}]}),onActivityChanged:vi.fn().mockReturnValue(()=>{})} as unknown as NonNullable<Window['nexusDesktop']>;
 const view=render(<GameActivity gameId="game" locale="fr"/>);await screen.findByText('2 h 17 min');expect(screen.getByText('Session interrompue')).toBeTruthy();view.rerender(<GameActivity gameId="game" locale="en"/>);expect(screen.getByText('Interrupted session')).toBeTruthy();expect(screen.queryByText(/FPS|GPU/)).toBeNull();
});
test('a late history reply cannot replace the newly selected game',async()=>{
 let done!:(value:unknown)=>void;const pending=new Promise(resolve=>done=resolve);
 window.nexusDesktop={getGameActivity:vi.fn().mockReturnValueOnce(pending).mockResolvedValue({source:'Nexus',state:'ready',sessions:[]})} as unknown as NonNullable<Window['nexusDesktop']>;
 const view=render(<GameActivity gameId="first" locale="en"/>);view.rerender(<GameActivity gameId="second" locale="en"/>);await screen.findByText(/Launch this game/);done({source:'Nexus',state:'unavailable',sessions:[]});await waitFor(()=>expect(screen.queryByText('History unavailable')).toBeNull());
});
