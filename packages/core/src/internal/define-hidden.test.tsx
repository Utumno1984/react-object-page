import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineHidden } from './define-hidden';

afterEach(() => vi.restoreAllMocks());

describe('defineHidden', () => {
  it('hidden properties spread on a DOM element: no React warning, no attribute, still readable', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const props = defineHidden(
      { id: 'x', 'aria-label': 'named' },
      { state: 'locked', interactionBlocked: true, onSomethingCustom: () => undefined },
    );

    const { container } = render(<div {...props} data-testid="el" />);
    const el = container.firstElementChild as HTMLElement;

    expect(errors).not.toHaveBeenCalled();
    expect(warnings).not.toHaveBeenCalled();
    expect(Array.from(el.attributes).map((a) => a.name).sort()).toEqual(['aria-label', 'data-testid', 'id']);
    expect(el.outerHTML).not.toMatch(/state|locked|interactionblocked|somethingcustom/i);
    expect(Object.keys(props)).toEqual(['id', 'aria-label']);
    expect(props.state).toBe('locked');
    expect(props.interactionBlocked).toBe(true);
    expect(typeof props.onSomethingCustom).toBe('function');
  });

  it('works on a component target too (spread of a plain object into a component prop bag)', () => {
    const hidden = defineHidden({}, { layer: 'popover' });
    expect({ ...hidden }).toEqual({});
    expect(hidden.layer).toBe('popover');
  });
});
