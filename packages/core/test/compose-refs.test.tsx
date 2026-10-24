import { createRef, type Ref } from 'react';
import { render } from '@testing-library/react';
import { composeRefs } from '../src';

describe('composeRefs', () => {
  it('gives the same node to a callback ref and an object ref at mount, null at unmount', () => {
    const calls: Array<HTMLDivElement | null> = [];
    const callbackRef = (node: HTMLDivElement | null) => {
      calls.push(node);
    };
    const objectRef = createRef<HTMLDivElement>();

    const { unmount, getByTestId } = render(
      <div data-testid="node" ref={composeRefs(callbackRef, objectRef, undefined)} />,
    );
    const node = getByTestId('node');

    expect(calls).toEqual([node]);
    expect(objectRef.current).toBe(node);

    unmount();

    expect(calls).toEqual([node, null]);
    expect(objectRef.current).toBeNull();
  });

  it('does not throw when every ref is undefined', () => {
    expect(() => {
      const { unmount } = render(<div ref={composeRefs<HTMLDivElement>(undefined, undefined)} />);
      unmount();
    }).not.toThrow();
  });

  it('does not throw with no refs at all', () => {
    expect(() => {
      const { unmount } = render(<div ref={composeRefs<HTMLDivElement>()} />);
      unmount();
    }).not.toThrow();
  });

  it('handles the same ref passed twice', () => {
    const objectRef = createRef<HTMLDivElement>();
    const { unmount, getByTestId } = render(
      <div data-testid="node" ref={composeRefs(objectRef, objectRef)} />,
    );
    expect(objectRef.current).toBe(getByTestId('node'));
    unmount();
    expect(objectRef.current).toBeNull();
  });

  it('handles the same callback ref passed twice (called once per slot)', () => {
    const calls: Array<HTMLDivElement | null> = [];
    const callbackRef = (node: HTMLDivElement | null) => {
      calls.push(node);
    };
    const { unmount, getByTestId } = render(
      <div data-testid="node" ref={composeRefs(callbackRef, callbackRef)} />,
    );
    const node = getByTestId('node');
    expect(calls).toEqual([node, node]);
    unmount();
    expect(calls).toEqual([node, node, null, null]);
  });

  it('calls the cleanup returned by a callback ref instead of passing null (React 19 semantics)', () => {
    const cleanup = vi.fn();
    const setup = vi.fn(() => cleanup);
    const ref = setup as unknown as Ref<HTMLDivElement>;
    const { unmount } = render(<div ref={composeRefs(ref)} />);
    expect(setup).toHaveBeenCalledTimes(1);
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledTimes(1);
  });

  it('is invoked directly: sets all refs and clears them via the returned cleanup or null', () => {
    const a = createRef<HTMLElement>();
    const b = createRef<HTMLElement>();
    const el = document.createElement('span');
    const composed = composeRefs<HTMLElement>(a, b);

    const cleanup = composed(el);
    expect(a.current).toBe(el);
    expect(b.current).toBe(el);

    cleanup();
    expect(a.current).toBeNull();
    expect(b.current).toBeNull();

    composed(el);
    composed(null);
    expect(a.current).toBeNull();
    expect(b.current).toBeNull();
  });
});
