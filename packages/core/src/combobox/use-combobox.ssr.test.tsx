// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useCombobox } from './use-combobox';

const ITEMS = [
  { id: 'mi', label: 'Milano' },
  { id: 'to', label: 'Torino' },
];

function Demo({ selected }: { selected?: (typeof ITEMS)[number] }) {
  const c = useCombobox({
    items: ITEMS,
    itemToString: (i) => i.label,
    itemToKey: (i) => i.id,
    defaultSelectedItem: selected,
  });
  return (
    <div>
      <input {...c.getInputProps()} />
      <ul {...c.getListboxProps()}>
        {c.filteredItems.map((item, index) => (
          <li key={item.id} {...c.getOptionProps(item, index)}>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

describe('useCombobox on the server (node environment, no DOM globals)', () => {
  it('renders without errors and without a `document`', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const html = renderToString(<Demo selected={ITEMS[0]} />);
    expect(html).toContain('role="combobox"');
    expect(html).toContain('value="Milano"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('role="listbox"');
    expect(html).toContain('role="option"');
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
