// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { useObjectPageForm } from './use-object-page-form';

it('renders on the server with validate and an empty fieldErrors, without touching the DOM', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  function Demo() {
    const form = useObjectPageForm<{ name: string }>({ baseline: { name: 'ACME' }, validate: () => ({ name: 'x' }) });
    return <output>{Object.keys(form.fieldErrors).length}</output>;
  }
  expect(renderToString(<Demo />)).toContain('>0<');
  expect(error).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});
