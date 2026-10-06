// @vitest-environment jsdom
import React from 'react';import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';import {afterEach,expect,test,vi} from 'vitest';import {SteamNotifications} from './SteamNotifications';
afterEach(()=>{cleanup();delete window.nexusDesktop;});
test('missing companion offers activation even when saved preference was enabled',async()=>{
 const status={enabled:true,installed:false,supported:true,state:'idle',progress:0};window.nexusDesktop={getSteamNotificationStatus:vi.fn().mockResolvedValue(status),activateSteamNotifications:vi.fn()} as unknown as NonNullable<Window['nexusDesktop']>;
 render(<SteamNotifications locale="en"/>);await screen.findByRole('button',{name:'Enable'});expect(screen.queryByRole('button',{name:'Disable'})).toBeNull();
});
test('one activation button sets up notifications with no manual executable or key fields',async()=>{
 const status={enabled:false,installed:false,supported:true,state:'idle',progress:0};window.nexusDesktop={getSteamNotificationStatus:vi.fn().mockResolvedValueOnce(status).mockResolvedValue({...status,enabled:true,installed:true,state:'ready'}),activateSteamNotifications:vi.fn().mockResolvedValue({...status,enabled:true,installed:true,state:'ready'})} as unknown as NonNullable<Window['nexusDesktop']>;
 render(<SteamNotifications locale="en"/>);fireEvent.click(screen.getByRole('button',{name:'Enable'}));await screen.findByRole('button',{name:'Disable'});expect(window.nexusDesktop.activateSteamNotifications).toHaveBeenCalledOnce();expect(screen.queryByText(/API/)).toBeNull();expect(screen.queryByText(/exe/)).toBeNull();expect(screen.getByRole('button',{name:'Customize'})).toBeTruthy();
});
test('changing locale during activation keeps the action usable after completion',async()=>{
 let done!:(value:unknown)=>void;const pending=new Promise(resolve=>{done=resolve;});const status={enabled:false,installed:false,supported:true,state:'idle',progress:0};window.nexusDesktop={getSteamNotificationStatus:vi.fn().mockResolvedValue(status),activateSteamNotifications:vi.fn().mockReturnValue(pending)} as unknown as NonNullable<Window['nexusDesktop']>;
 const view=render(<SteamNotifications locale="en"/>);fireEvent.click(screen.getByRole('button',{name:'Enable'}));view.rerender(<SteamNotifications locale="fr"/>);done({...status,enabled:true,installed:true,state:'ready'});await waitFor(()=>expect(screen.getByRole('button',{name:'Désactiver'}).hasAttribute('disabled')).toBe(false));
});
