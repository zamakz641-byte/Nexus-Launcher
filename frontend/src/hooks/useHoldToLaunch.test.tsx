// @vitest-environment jsdom
import { act, render, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useHoldToLaunch } from './useHoldToLaunch';
afterEach(() => { cleanup(); vi.useRealTimers(); });
function Fixture({ launch, click }: { launch: (id: string) => void; click: () => void }) {
  useHoldToLaunch(launch);
  return <button data-launch-game="game-a" onClick={click}>Game</button>;
}
it('holding Enter launches once, suppresses click, and short presses retain normal action', () => {
  vi.useFakeTimers(); const launch = vi.fn(), click = vi.fn();
  const { getByRole } = render(<Fixture launch={launch} click={click} />);
  const button = getByRole('button'); button.focus();
  fireEvent.keyDown(button, { key: 'Enter' });
  act(() => vi.advanceTimersByTime(700));
  fireEvent.keyDown(button, { key: 'Enter', repeat: true });
  fireEvent.keyUp(button, { key: 'Enter' }); fireEvent.click(button);
  expect(launch).toHaveBeenCalledExactlyOnceWith('game-a'); expect(click).not.toHaveBeenCalled();
  fireEvent.keyDown(button, { key: 'Enter' }); fireEvent.keyUp(button, { key: 'Enter' });
  expect(click).toHaveBeenCalledTimes(1);
});
it('moving focus cancels the hold', () => {
  vi.useFakeTimers(); const launch = vi.fn();
  const { getByRole } = render(<Fixture launch={launch} click={() => {}} />);
  fireEvent.keyDown(getByRole('button'), { key: ' ' });
  fireEvent.blur(getByRole('button'));
  act(() => vi.advanceTimersByTime(1000)); expect(launch).not.toHaveBeenCalled();
});
it('window deactivation cancels a hold even when the button remains focused', () => {
  vi.useFakeTimers(); const launch = vi.fn();
  const { getByRole } = render(<Fixture launch={launch} click={() => {}} />);
  fireEvent.keyDown(getByRole('button'), { key: 'Enter' });
  window.dispatchEvent(new Event('blur'));
  act(() => vi.advanceTimersByTime(1000)); expect(launch).not.toHaveBeenCalled();
});
