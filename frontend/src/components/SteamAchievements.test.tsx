// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { SteamAchievements, SteamAccountSettings } from './SteamAchievements';
afterEach(() => { cleanup(); delete window.nexusDesktop; });
test('Steam opens its client without any API key or technical profile input',async()=>{
 window.nexusDesktop={getSteamAccountStatus:vi.fn().mockResolvedValue({configured:false,linked:false,storageAvailable:true}),connectSteamAccount:vi.fn().mockResolvedValue({configured:true,linked:true,storageAvailable:true})} as unknown as NonNullable<Window['nexusDesktop']>;
 render(<SteamAccountSettings locale="en"/>);fireEvent.click(screen.getByRole('button',{name:'Open Steam'}));await screen.findByText('Local profile available');expect(window.nexusDesktop.connectSteamAccount).toHaveBeenCalledOnce();expect(screen.queryByRole('textbox')).toBeNull();expect(document.querySelector('input[type=password]')).toBeNull();
});
test('browser explains desktop requirement without fabricated progress', () => {
  render(<SteamAchievements appId={10} locale="en" />);
  expect(screen.getByText(/desktop app/i)).toBeTruthy();
});
test('initial synchronization displays source, real count and unlock', async () => {
  window.nexusDesktop = { getSteamAchievements: vi.fn().mockResolvedValue({source:'Steam',state:'ready',cached:false,lastSynced:'2026-10-04T10:00:00Z',achievements:[{id:'A',title:'Real achievement',description:'Win',unlocked:true,unlockTime:1234}]}) } as unknown as NonNullable<Window['nexusDesktop']>;
  render(<SteamAchievements appId={10} locale="en" />);
  expect(await screen.findByText('Real achievement')).toBeTruthy();
  expect(screen.getByText('1 / 1')).toBeTruthy();
  expect(window.nexusDesktop.getSteamAchievements).toHaveBeenCalledWith(10,'en',false);
  fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
  await waitFor(() => expect(window.nexusDesktop!.getSteamAchievements).toHaveBeenCalledWith(10,'en',true));
});
test.each([{appId:20,locale:'en' as const},{appId:10,locale:'fr' as const}])('old manual refresh cannot overwrite a new game or language: %j', async next => {
  const result = (title:string) => ({source:'Steam',state:'ready',cached:false,lastSynced:'2026-10-04T10:00:00Z',achievements:[{id:'A',title,description:'',unlocked:true,unlockTime:null}]});
  let resolveOld!:(value:unknown)=>void, resolveNew!:(value:unknown)=>void;
  const oldRefresh = new Promise(resolve=>{resolveOld=resolve;}), newLoad = new Promise(resolve=>{resolveNew=resolve;});
  window.nexusDesktop = {getSteamAchievements:vi.fn().mockResolvedValueOnce(result('Initial')).mockReturnValueOnce(oldRefresh).mockReturnValueOnce(newLoad)} as unknown as NonNullable<Window['nexusDesktop']>;
  const view = render(<SteamAchievements appId={10} locale="en" />);
  await screen.findByText('Initial');fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
  view.rerender(<SteamAchievements {...next} />);
  await act(async()=>{resolveOld(result('Stale'));await oldRefresh;});
  expect(screen.queryByText('Stale')).toBeNull();
  expect(screen.getByRole('button',{name:next.locale === 'fr' ? 'Actualiser' : 'Refresh'}).hasAttribute('disabled')).toBe(true);
  await act(async()=>{resolveNew(result('Current'));await newLoad;});
  expect(screen.getByText('Current')).toBeTruthy();
});

test('Steam session data changes refresh visible achievement progress and unsubscribe',async()=>{
  let notify!:()=>void;const unsubscribe=vi.fn();
  window.nexusDesktop={onSteamDataChanged:vi.fn(fn=>{notify=fn;return unsubscribe;}),getSteamAchievements:vi.fn().mockResolvedValueOnce({source:'Steam',state:'empty',cached:false,lastSynced:null,achievements:[]}).mockResolvedValue({source:'Steam',state:'ready',cached:false,lastSynced:null,achievements:[{id:'new',title:'Session unlock',description:'',unlocked:true,unlockTime:1234}]})} as unknown as NonNullable<Window['nexusDesktop']>;
  const view=render(<SteamAchievements appId={10} locale="en"/>);await waitFor(()=>expect(window.nexusDesktop!.onSteamDataChanged).toHaveBeenCalled());
  act(()=>notify());expect(await screen.findByText('Session unlock')).toBeTruthy();expect(window.nexusDesktop.getSteamAchievements).toHaveBeenLastCalledWith(10,'en',true);
  view.unmount();expect(unsubscribe).toHaveBeenCalledOnce();
});
test('partial Steam cache shows reported progress even without cached achievement definitions',async()=>{
 window.nexusDesktop={getSteamAchievements:vi.fn().mockResolvedValue({source:'Steam',state:'ready',lastSynced:null,cached:true,local:true,total:15,unlockedCount:4,achievements:[]})} as unknown as NonNullable<Window['nexusDesktop']>;
 render(<SteamAchievements appId={10} locale="en"/>);await screen.findByText('4 / 15');expect(screen.getByText('List available on this device')).toBeTruthy();
});
