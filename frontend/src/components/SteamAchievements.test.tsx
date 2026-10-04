// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { SteamAchievements, SteamAccountSettings } from './SteamAchievements';
afterEach(() => { cleanup(); delete window.nexusDesktop; });
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
test('account key clears after validation and remains outside renderer persistence', async () => {
  window.nexusDesktop = {getSteamAccountStatus:vi.fn().mockResolvedValue({configured:false,storageAvailable:true}),saveSteamAccount:vi.fn().mockResolvedValue({configured:true,storageAvailable:true,steamId:'76561198000000000'})} as unknown as NonNullable<Window['nexusDesktop']>;
  render(<SteamAccountSettings locale="en" />);
  const input = screen.getByLabelText('Steam Web API key') as HTMLInputElement;
  fireEvent.change(screen.getByLabelText('SteamID64'),{target:{value:'76561198000000000'}});
  fireEvent.change(input,{target:{value:'a'.repeat(32)}});
  fireEvent.click(screen.getByRole('button',{name:'Connect'}));
  await waitFor(() => expect(input.value).toBe(''));
  expect(localStorage.getItem('steamApiKey')).toBeNull();
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
