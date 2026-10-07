// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { ConnectedAccounts } from './ConnectedAccounts';
vi.mock('../hooks/useLibraryGames',()=>({useLibraryGames:()=>[]}));
afterEach(()=>{cleanup();delete window.nexusDesktop;});
const library={source:'Steam',state:'unconfigured',lastSynced:null,cached:false,games:[]};
function fixture() {
  window.nexusDesktop={getSteamAccountStatus:vi.fn().mockResolvedValue({configured:false,storageAvailable:true}),getStoreAccountStatus:vi.fn().mockResolvedValue({configured:false,storageAvailable:true}),getSteamLibrary:vi.fn().mockResolvedValue(library),getStoreLibrary:vi.fn().mockResolvedValue({...library,source:'Epic',state:'ready',games:[{id:'owned',title:'Real owned game'}]}),connectStoreAccount:vi.fn().mockResolvedValue({configured:true,storageAvailable:true}),clearStoreAccount:vi.fn().mockResolvedValue({configured:false,storageAvailable:true})} as unknown as NonNullable<Window['nexusDesktop']>;
}
test.each(['Steam','Epic Games','GOG'])('browser opens %s glass dialog without claiming connection',async provider=>{
  render(<MemoryRouter><ConnectedAccounts locale="en"/></MemoryRouter>);
  const trigger=screen.getByRole('button',{name:`Connect ${provider}`});
  trigger.focus();fireEvent.click(trigger);
  const dialog=await screen.findByRole('dialog',{name:provider});
  expect(within(dialog).getByRole('button',{name:provider==='Steam'?'Open Steam':'Open sign-in'}).hasAttribute('disabled')).toBe(true);
  fireEvent.click(within(dialog).getByRole('button',{name:'Close'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(()=>expect(document.activeElement).toBe(trigger));
  expect(screen.getAllByText('Not connected')).toHaveLength(3);
});
test('native Epic connection retrieves owned games without claiming installation, and disconnect clears them',async()=>{
  fixture();vi.mocked(window.nexusDesktop!.getSteamLibrary).mockReturnValue(new Promise(()=>{}));
  render(<MemoryRouter><ConnectedAccounts locale="en"/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Connect Epic Games'}).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'Connect Epic Games'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Open sign-in'}).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'Open sign-in'}));
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
  await waitFor(()=>expect(screen.getByRole('button',{name:'Open sign-in'}).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'Open sign-in'}));
  await screen.findAllByText('Connection cancelled.');
  expect(screen.getAllByText('Not connected')).toHaveLength(3);
  expect(screen.getByRole('button',{name:'Open sign-in'}).hasAttribute('disabled')).toBe(false);
  fireEvent.click(screen.getByRole('button',{name:'Close'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByRole('button',{name:'Connect GOG'}).hasAttribute('disabled')).toBe(false);
});
test('changing language during a pending login does not lock account buttons',async()=>{
  fixture();let resolve!:(value:unknown)=>void;
  const pending=new Promise(r=>{resolve=r;});
  vi.mocked(window.nexusDesktop!.connectStoreAccount).mockReturnValue(pending as ReturnType<NonNullable<Window['nexusDesktop']>['connectStoreAccount']>);
  const view=render(<MemoryRouter><ConnectedAccounts locale="en"/></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Connect GOG'}).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'Connect GOG'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Open sign-in'}).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('button',{name:'Open sign-in'}));
  view.rerender(<MemoryRouter><ConnectedAccounts locale="fr"/></MemoryRouter>);
  await act(async()=>{resolve({configured:false,storageAvailable:true,error:'cancelled'});await pending;});
  expect(screen.getByRole('button',{name:'Ouvrir la connexion'}).hasAttribute('disabled')).toBe(false);
  fireEvent.click(screen.getByRole('button',{name:'Fermer'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByRole('button',{name:'Connecter GOG'}).hasAttribute('disabled')).toBe(false);
});

test('Steam window remains reachable while the account library is still loading',async()=>{
  fixture();vi.mocked(window.nexusDesktop!.getSteamLibrary).mockReturnValue(new Promise(()=>{}));
  window.nexusDesktop!.connectSteamAccount=vi.fn().mockResolvedValue({linked:true,configured:false,storageAvailable:true});
  render(<MemoryRouter><ConnectedAccounts locale="en"/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:'Connect Steam'}));
  const dialog=await screen.findByRole('dialog',{name:'Steam'});
  fireEvent.click(within(dialog).getByRole('button',{name:'Open Steam'}));
  await waitFor(()=>expect(window.nexusDesktop!.connectSteamAccount).toHaveBeenCalledOnce());
});

test('Steam refresh cannot invalidate a pending Epic authentication',async()=>{
  fixture();let resolve!:(value:unknown)=>void;
  const pending=new Promise(r=>{resolve=r;});
  vi.mocked(window.nexusDesktop!.connectStoreAccount).mockReturnValue(pending as ReturnType<NonNullable<Window['nexusDesktop']>['connectStoreAccount']>);
  window.nexusDesktop!.connectSteamAccount=vi.fn().mockResolvedValue({linked:true,configured:false,storageAvailable:true});
  render(<MemoryRouter><ConnectedAccounts locale="en"/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:'Connect Epic Games'}));
  fireEvent.click(screen.getByRole('button',{name:'Open sign-in'}));
  fireEvent.click(screen.getByRole('button',{name:'Close'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  fireEvent.click(screen.getByRole('button',{name:'Connect Steam'}));
  fireEvent.click(within(screen.getByRole('dialog',{name:'Steam'})).getByRole('button',{name:'Open Steam'}));
  await waitFor(()=>expect(window.nexusDesktop!.getSteamLibrary).toHaveBeenCalledWith(true));
  await act(async()=>{resolve({configured:true,storageAvailable:true});await pending;});
  await screen.findByText('Real owned game');
  expect(document.querySelectorAll('.account-card')[1].textContent).toContain('Connected');
  expect(screen.getByRole('dialog',{name:'Steam'})).toBeTruthy();
});

test('linked Steam identity is not presented as synchronized account data',async()=>{
  fixture();vi.mocked(window.nexusDesktop!.getSteamAccountStatus).mockResolvedValue({linked:true,configured:false,storageAvailable:true});
  render(<MemoryRouter><ConnectedAccounts locale="en"/></MemoryRouter>);
  expect(await screen.findByText('Local profile available')).toBeTruthy();
});
