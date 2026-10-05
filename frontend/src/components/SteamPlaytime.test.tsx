// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { SteamPlaytime } from './SteamPlaytime';
afterEach(()=>{cleanup();delete window.nexusDesktop;});
test('linked identity without API access explains missing playtime instead of disappearing',async()=>{
  window.nexusDesktop={getSteamLibrary:vi.fn().mockResolvedValue({state:'key-required',games:[],lastSynced:null,cached:false})} as unknown as NonNullable<Window['nexusDesktop']>;
  render(<MemoryRouter><SteamPlaytime appId={10} locale="fr"/></MemoryRouter>);
  expect(await screen.findByText(/clé Steam Web API/i)).toBeTruthy();
  expect(screen.getByRole('link',{name:'Activer la synchronisation'})).toBeTruthy();
});
test('real Steam hours can be refreshed and zero is a valid returned value',async()=>{
  window.nexusDesktop={getSteamLibrary:vi.fn().mockResolvedValue({state:'ready',games:[{id:'10',playtimeMinutes:0}],lastSynced:'2026-10-05T10:00:00Z',cached:false})} as unknown as NonNullable<Window['nexusDesktop']>;
  render(<MemoryRouter><SteamPlaytime appId={10} locale="en"/></MemoryRouter>);
  expect(await screen.findByText('0 h 0 min')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Refresh Steam playtime'}));
  expect(window.nexusDesktop.getSteamLibrary).toHaveBeenLastCalledWith(true);
});
