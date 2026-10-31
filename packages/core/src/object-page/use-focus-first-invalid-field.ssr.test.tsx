// @vitest-environment node
import { createRef } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { useFocusFirstInvalidField } from './use-focus-first-invalid-field';

it('renders on the server without touching the DOM', () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  function Demo() {
    useFocusFirstInvalidField({ containerRef: createRef<HTMLDivElement>(), fieldErrors: { a: 'x' } });
    return <input name="a" readOnly />;
  }
  expect(renderToString(<Demo />)).toContain('name="a"');
  expect(error).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});
