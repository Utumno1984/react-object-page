import { act, cleanup, render } from '@testing-library/react';
import { useRef, useState, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReturnFocus } from './use-return-focus';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Waits for the animation frame in which the hook returns the focus. */
const nextFrame = () => act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

interface HostProps {
  open: boolean;
  withFallback?: boolean;
  showOpener?: boolean;
  openerDisabled?: boolean;
  autoFocusInside?: boolean;
}

function Host({ open, withFallback, showOpener = true, openerDisabled, autoFocusInside }: HostProps) {
  const fallbackRef = useRef<HTMLButtonElement>(null);
  useReturnFocus({ open, fallbackRef: withFallback ? fallbackRef : undefined });
  return (
    <>
      {showOpener && (
        <button data-testid="opener" disabled={openerDisabled}>
          opener
        </button>
      )}
      <button ref={fallbackRef} data-testid="fallback">
        fallback
      </button>
      {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the autoFocus child is the case under test */}
      {open && <input data-testid="inside" autoFocus={autoFocusInside} />}
    </>
  );
}

function setup(props: HostProps) {
  const view = render(<Host {...props} />);
  const get = (id: string) => view.queryByTestId(id) as HTMLElement | null;
  const set = (next: Partial<HostProps>) => view.rerender(<Host {...props} {...next} />);
  return { get, set, view };
}

describe('useReturnFocus', () => {
  it('returns the focus to the opener, even when an autoFocus field inside the content mounts first', async () => {
    const { get, set } = setup({ open: false, autoFocusInside: true });
    act(() => get('opener')!.focus());
    set({ open: true });
    expect(document.activeElement).toBe(get('inside'));
    set({ open: false });
    await nextFrame();
    expect(document.activeElement).toBe(get('opener'));
  });

  it('remembers the element focused before an external open (no trigger involved)', async () => {
    const { get, set } = setup({ open: false });
    act(() => get('fallback')!.focus());
    set({ open: true });
    act(() => get('inside')!.focus());
    set({ open: false });
    await nextFrame();
    expect(document.activeElement).toBe(get('fallback'));
  });

  it('remembers an element that already had the focus when the hook mounted', async () => {
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    const { get, set } = setup({ open: false });
    set({ open: true });
    act(() => get('inside')!.focus());
    set({ open: false });
    await nextFrame();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('does not return to a stale element when the focus was lost to body before opening', async () => {
    const { get, set } = setup({ open: false });
    act(() => get('opener')!.focus());
    act(() => get('opener')!.blur());
    expect(document.activeElement).toBe(document.body);
    set({ open: true });
    act(() => get('inside')!.focus());
    set({ open: false });
    await nextFrame();
    expect(document.activeElement).toBe(document.body);
  });

  it('falls back to fallbackRef when the focus was lost to body before opening', async () => {
    const { get, set } = setup({ open: false, withFallback: true });
    act(() => get('opener')!.focus());
    act(() => get('opener')!.blur());
    set({ open: true });
    act(() => get('inside')!.focus());
    set({ open: false });
    await nextFrame();
    expect(document.activeElement).toBe(get('fallback'));
  });

  it('does not track focus while open', async () => {
    const { get, set } = setup({ open: false });
    act(() => get('opener')!.focus());
    set({ open: true });
    act(() => get('fallback')!.focus());
    set({ open: false });
    await nextFrame();
    expect(document.activeElement).toBe(get('opener'));
  });

  it('goes to fallbackRef when the opener was unmounted', async () => {
    const { get, set } = setup({ open: false, withFallback: true });
    act(() => get('opener')!.focus());
    set({ open: true });
    set({ open: true, showOpener: false });
    set({ open: false, showOpener: false });
    await nextFrame();
    expect(document.activeElement).toBe(get('fallback'));
  });

  it('goes to fallbackRef when the opener is disabled', async () => {
    const { get, set } = setup({ open: false, withFallback: true });
    act(() => get('opener')!.focus());
    set({ open: true });
    set({ open: true, openerDisabled: true });
    set({ open: false, openerDisabled: true });
    await nextFrame();
    expect(document.activeElement).toBe(get('fallback'));
  });

  it('does not throw nor move the focus to an arbitrary node without a fallback', async () => {
    const { get, set } = setup({ open: false });
    act(() => get('opener')!.focus());
    set({ open: true });
    set({ open: true, showOpener: false });
    act(() => get('inside')!.focus());
    set({ open: false, showOpener: false });
    await nextFrame();
    expect(document.activeElement).toBe(document.body);
  });

  it('with nothing focused before opening, leaves the focus alone (no fallback) or uses the fallback', async () => {
    const first = setup({ open: false });
    first.set({ open: true });
    first.set({ open: false });
    await nextFrame();
    expect(document.activeElement).toBe(document.body);
    cleanup();

    const second = setup({ open: false, withFallback: true });
    second.set({ open: true });
    second.set({ open: false });
    await nextFrame();
    expect(document.activeElement).toBe(second.get('fallback'));
  });

  it('does not return a stale focus when reopened before the next frame', async () => {
    const { get, set } = setup({ open: false });
    const opener = get('opener')!;
    act(() => opener.focus());
    set({ open: true });
    act(() => get('inside')!.focus());
    const focusSpy = vi.spyOn(opener, 'focus');
    set({ open: false });
    set({ open: true });
    await nextFrame();
    await nextFrame();
    expect(focusSpy).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(opener);
  });

  it('removes its focusin listener on unmount, also when unmounted without passing through open=false', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const { view } = setup({ open: false });
    const added = add.mock.calls.filter(([type]) => type === 'focusin');
    expect(added).toHaveLength(1);
    view.unmount();
    const removed = remove.mock.calls.filter(([type]) => type === 'focusin');
    expect(removed).toHaveLength(1);
    expect(removed[0]?.[1]).toBe(added[0]?.[1]);
  });

  it('cancels a pending return when unmounted before the frame', async () => {
    const { get, set, view } = setup({ open: false });
    const opener = get('opener')!;
    act(() => opener.focus());
    set({ open: true });
    const focusSpy = vi.spyOn(opener, 'focus');
    set({ open: false });
    view.unmount();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('two overlays opened in sequence: each returns to its own opener', async () => {
    function Two(): ReactElement {
      const [first, setFirst] = useState(false);
      const [second, setSecond] = useState(false);
      useReturnFocus({ open: first });
      return (
        <>
          <button data-testid="open-first" onClick={() => setFirst(true)} />
          {first && <FirstContent second={second} setSecond={setSecond} close={() => setFirst(false)} />}
        </>
      );
    }
    function FirstContent({
      second,
      setSecond,
      close,
    }: {
      second: boolean;
      setSecond: (v: boolean) => void;
      close: () => void;
    }) {
      useReturnFocus({ open: second });
      return (
        <div>
          <button data-testid="open-second" onClick={() => setSecond(true)} />
          <button data-testid="close-first" onClick={close} />
          {second && <button data-testid="close-second" onClick={() => setSecond(false)} />}
        </div>
      );
    }
    const view = render(<Two />);
    const q = (id: string) => view.getByTestId(id);
    act(() => q('open-first').focus());
    act(() => q('open-first').click());
    act(() => q('open-second').focus());
    act(() => q('open-second').click());
    act(() => q('close-second').focus());
    act(() => q('close-second').click());
    await nextFrame();
    expect(document.activeElement).toBe(q('open-second'));
    act(() => q('close-first').focus());
    act(() => q('close-first').click());
    await nextFrame();
    expect(document.activeElement).toBe(q('open-first'));
  });
});
