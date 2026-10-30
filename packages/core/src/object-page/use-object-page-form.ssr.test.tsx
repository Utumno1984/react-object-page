// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useObjectPageForm } from './use-object-page-form';

type Form = { name: string; amount: number };

function Demo() {
  const form = useObjectPageForm<Form>({ baseline: { name: 'ACME', amount: 10 } });
  return (
    <form>
      <input readOnly value={form.values.name} />
      <output>{form.isDirty ? 'dirty' : 'clean'}</output>
      <output>{form.isSaving ? 'saving' : 'idle'}</output>
    </form>
  );
}

describe('useObjectPageForm SSR', () => {
  it('renders on the server with the baseline values and no errors', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const html = renderToString(<Demo />);
    expect(html).toContain('value="ACME"');
    expect(html).toContain('clean');
    expect(html).toContain('idle');
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
