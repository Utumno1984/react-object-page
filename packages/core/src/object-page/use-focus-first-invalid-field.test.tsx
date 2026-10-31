import { cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFocusFirstInvalidField } from './use-focus-first-invalid-field';

const scrollIntoView = vi.fn();

beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});
afterEach(() => {
  cleanup();
  scrollIntoView.mockReset();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function Form({ errors, fields = ['a', 'b', 'c'] }: { errors: Partial<Record<string, string>>; fields?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusFirstInvalidField({ containerRef: ref, fieldErrors: errors });
  return (
    <div ref={ref}>
      {fields.map((n) => (
        <input key={n} name={n} aria-label={n} />
      ))}
    </div>
  );
}

describe('useFocusFirstInvalidField', () => {
  it('does nothing while fieldErrors is empty', () => {
    render(<Form errors={{}} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.body).toHaveFocus();
  });

  it('focuses and centers the first invalid field in DOM order, not in key order', () => {
    const { getByLabelText } = render(<Form errors={{ c: 'x', b: 'y' }} />);
    expect(getByLabelText('b')).toHaveFocus();
    expect(getByLabelText('a')).not.toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
    expect(scrollIntoView.mock.contexts[0]).toBe(getByLabelText('b'));
  });

  it('fires on the empty → non-empty transition and again after going empty', () => {
    const { rerender, getByLabelText } = render(<Form errors={{}} />);
    rerender(<Form errors={{ c: 'x' }} />);
    expect(getByLabelText('c')).toHaveFocus();
    // non-empty → non-empty does not steal the focus again
    getByLabelText('a').focus();
    rerender(<Form errors={{ b: 'y' }} />);
    expect(getByLabelText('a')).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    rerender(<Form errors={{}} />);
    rerender(<Form errors={{ b: 'y' }} />);
    expect(getByLabelText('b')).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('only looks inside the container', () => {
    const outside = document.createElement('input');
    outside.name = 'a';
    document.body.prepend(outside);
    const { getByLabelText } = render(<Form errors={{ a: 'x' }} />);
    expect(getByLabelText('a')).toHaveFocus();
    outside.remove();
  });

  it('console.errors once in development and does not throw when no key matches a [name]', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Form errors={{ missing: 'x', other: 'y' }} />);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('useFocusFirstInvalidField'));
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.body).toHaveFocus();
  });

  it('stays silent in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Form errors={{ missing: 'x' }} />);
    expect(error).not.toHaveBeenCalled();
  });

  it('skips a disabled or hidden first match and focuses the next one in DOM order', () => {
    function Mixed() {
      const ref = useRef<HTMLDivElement>(null);
      useFocusFirstInvalidField({ containerRef: ref, fieldErrors: { a: 'x', b: 'y', c: 'z' } });
      return (
        <div ref={ref}>
          <input name="a" type="hidden" />
          <input name="b" disabled aria-label="b" />
          <input name="c" aria-label="c" />
        </div>
      );
    }
    const { getByLabelText } = render(<Mixed />);
    expect(getByLabelText('c')).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('console.errors when every match is unfocusable', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    function OnlyDisabled() {
      const ref = useRef<HTMLDivElement>(null);
      useFocusFirstInvalidField({ containerRef: ref, fieldErrors: { a: 'x' } });
      return (
        <div ref={ref}>
          <input name="a" disabled />
        </div>
      );
    }
    render(<OnlyDisabled />);
    expect(error).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('treats a key whose value is undefined as no error', () => {
    const { rerender, getByLabelText } = render(<Form errors={{ a: undefined }} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
    rerender(<Form errors={{ a: undefined, c: 'x' }} />);
    expect(getByLabelText('c')).toHaveFocus();
  });

  it('handles field names that would need CSS escaping', () => {
    const odd = 'a"]b';
    const { getByLabelText } = render(<Form errors={{ [odd]: 'x' }} fields={['q', odd]} />);
    expect(getByLabelText(odd)).toHaveFocus();
  });
});
