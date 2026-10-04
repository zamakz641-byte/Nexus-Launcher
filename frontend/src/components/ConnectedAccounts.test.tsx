// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { ConnectedAccounts } from './ConnectedAccounts';
vi.mock('../hooks/useLibraryGames',()=>({useLibraryGames:()=>[]}));
afterEach(()=>{cleanup();delete window.nexusDesktop;});
const library={source:'Steam',state:'unconfigured',lastSynced:null,cached:false,games:[]};
function fixture() {
  window.nexusDesktop={getSteamAccountStatus:vi.fn().mockResolvedValue({configured:false,storageAvailable:true}),getStoreAccountStatus:vi.fn().mockResolvedValue({configured:false,storageAvailable:true}),getSteamLibrary:vi.fn().mockResolvedValue(library),getStoreLibrary:vi.fn().mockResolvedValue({...library,source:'Epic',state:'ready',games:[{id:'owned',title:'Real owned game'}]}),connectStoreAccount:vi.fn().mockResolvedValue({configured:true,storageAvailable:true}),clearStoreAccount:vi.fn().mockResolvedValue({configured:false,storageAvailable:true})} as unknown as NonNullable<Window['nexusDesktop']>;
}
test('account login buttons in browser explain desktop and never mark connected',()=>{
  render(<MemoryRouter><ConnectedAccounts locale="en"/></MemoryRouter>);
  expect(screen.getByRole('button',{name:'Connect Epic Games'}).hasAttribute('disabled')).toBe(true);
  expect(screen.getAllByText('Not connected')).toHaveLength(3);
});
test('native Epic connection retrieves owned games without claiming installation, and disconnect clears them',async()=>{
  fixture();render(<MemoryRouter><ConnectedAccounts locale="en"/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Connect Epic Games'}).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'Connect Epic Games'}));
  await screen.findByText('Real owned game');
  expect(window.nexusDesktop!.connectStoreAccount).toHaveBeenCalledWith('epic');
  expect(screen.getByText('Not detected on this device')).toBeTruthy();
  expect(screen.queryByRole('button',{name:'Open game details'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Disconnect'}));
  await waitFor(()=>expect(screen.queryByText('Real owned game')).toBeNull());
});
test('cancelled login preserves disconnected state and re-enables buttons',async()=>{
  fixture();vi.mocked(window.nexusDesktop!.connectStoreAccount).mockResolvedValue({configured:false,storageAvailable:true,error:'cancelled'});
  render(<MemoryRouter><ConnectedAccounts locale="en"/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Connect GOG'}).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'Connect GOG'}));
  await screen.findByText('Connection cancelled.');
  expect(screen.getAllByText('Not connected')).toHaveLength(3);
  expect(screen.getByRole('button',{name:'Connect GOG'}).hasAttribute('disabled')).toBe(false);
});
test('changing language during a pending login does not lock account buttons',async()=>{
  fixture();let resolve!:(value:unknown)=>void;
  const pending=new Promise(r=>{resolve=r;});
  vi.mocked(window.nexusDesktop!.connectStoreAccount).mockReturnValue(pending as ReturnType<NonNullable<Window['nexusDesktop']>['connectStoreAccount']>);
  const view=render(<MemoryRouter><ConnectedAccounts locale="en"/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Connect GOG'}).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'Connect GOG'}));
  view.rerender(<MemoryRouter><ConnectedAccounts locale="fr"/></MemoryRouter>);
  await act(async()=>{resolve({configured:false,storageAvailable:true,error:'cancelled'});await pending;});
  expect(screen.getByRole('button',{name:'Connecter GOG'}).hasAttribute('disabled')).toBe(false);
});
