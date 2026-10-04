// @vitest-environment jsdom
import React from 'react';
import { cleanup,render,screen,fireEvent } from '@testing-library/react';
import { afterEach,expect,test,vi } from 'vitest';
import { RouteErrorBoundary } from './RouteErrorBoundary';
afterEach(cleanup);
test('failed route keeps recovery controls visible without exposing raw exception details',()=>{
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  const fail=()=>{throw new Error('private unexpected stack');};
  const Broken=fail;
  const reload=vi.fn();
  render(<RouteErrorBoundary locale="en" onReload={reload}><Broken/></RouteErrorBoundary>);
  expect(screen.getByText('This screen could not load')).toBeTruthy();
  expect(screen.queryByText('private unexpected stack')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Reload Nexus'}));expect(reload).toHaveBeenCalledOnce();log.mockRestore();
});
