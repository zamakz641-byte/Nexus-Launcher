// @vitest-environment jsdom
import '../i18n';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Onboarding } from './Onboarding';
afterEach(cleanup);
it('asks for the game folder first and cancellation does not complete the choice', async () => {
  const add = vi.fn().mockResolvedValue(null), complete = vi.fn();
  const view = render(<Onboarding open onComplete={complete} onAddFolder={add} />);
  expect(view.getByRole('button', { name: /Choisir mon dossier/i })).toBeTruthy();
  expect(view.getByRole('button', { name: 'Continuer' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(view.getByRole('button', { name: /Choisir mon dossier/i }));
  await waitFor(() => expect(add).toHaveBeenCalledTimes(1));
  expect(view.getByRole('button', { name: 'Continuer' }).hasAttribute('disabled')).toBe(true);
  expect(complete).not.toHaveBeenCalled();
});
