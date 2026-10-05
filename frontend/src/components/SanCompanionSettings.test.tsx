// @vitest-environment jsdom
import React from 'react';
import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,expect,test,vi} from 'vitest';
import {SanCompanionSettings} from './SanCompanionSettings';
afterEach(()=>{cleanup();delete window.nexusDesktop;});
test('SAN setup points to official download and enables detected companion without a key',async()=>{
 const base={enabled:false,installed:false,executable:'',supported:true};
 window.nexusDesktop={getSanCompanionStatus:vi.fn().mockResolvedValue(base),openSanDownload:vi.fn().mockResolvedValue({ok:true}),chooseSanExecutable:vi.fn().mockResolvedValue({...base,installed:true,executable:'SAN.exe'}),setSanCompanionEnabled:vi.fn().mockResolvedValue({...base,enabled:true,installed:true,executable:'SAN.exe'})} as unknown as NonNullable<Window['nexusDesktop']>;
 render(<SanCompanionSettings locale="en"/>);await screen.findByText(/Install SAN from its official page/);
 fireEvent.click(screen.getByRole('button',{name:'Download SAN'}));expect(window.nexusDesktop.openSanDownload).toHaveBeenCalledOnce();
 fireEvent.click(screen.getByRole('button',{name:'Choose SAN (.exe)'}));await screen.findByText('Installed SAN detected.');
 fireEvent.click(screen.getByRole('checkbox'));await waitFor(()=>expect(window.nexusDesktop!.setSanCompanionEnabled).toHaveBeenCalledWith(true));
 expect(screen.getByText(/history inside Nexus still require Steam synchronization/)).toBeTruthy();
});

test('changing language during detection does not leave controls disabled',async()=>{
 let resolveOld!:(value:unknown)=>void;const pending=new Promise(resolve=>{resolveOld=resolve;});const value={enabled:false,installed:false,executable:'',supported:true};
 window.nexusDesktop={getSanCompanionStatus:vi.fn().mockResolvedValueOnce(value).mockReturnValueOnce(pending).mockResolvedValue(value)} as unknown as NonNullable<Window['nexusDesktop']>;
 const view=render(<SanCompanionSettings locale="en"/>);await screen.findByText(/Install SAN from its official page/);fireEvent.click(screen.getByRole('button',{name:'Detect'}));view.rerender(<SanCompanionSettings locale="fr"/>);
 await screen.findByText(/Installez SAN depuis/);expect(screen.getByRole('button',{name:'Détecter'}).hasAttribute('disabled')).toBe(false);resolveOld(value);
});
