// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../field/Field';
import { Combobox } from './Combobox';

const CITIES = [
  { value: 'mi', label: 'Milano' },
  { value: 'to', label: 'Torino' },
];

describe('Combobox on the server', () => {
  it('renders the closed input (selection text, aria-controls to a hidden listbox) without touching the DOM', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const html = renderToString(
      <Field label="Comune">
        <Combobox options={CITIES} defaultValue="to" />
      </Field>,
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('value="Torino"');
    expect(html).toContain('role="listbox"');
    expect(html).not.toContain('role="option"');
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
