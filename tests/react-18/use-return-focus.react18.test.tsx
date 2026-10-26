import { act, version } from 'react';
import { createRoot } from 'react-dom/client';
import { useReturnFocus } from '../../packages/core/src/overlay/use-return-focus';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const nextFrame = () => act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

function Host({ open }: { open: boolean }) {
  useReturnFocus({ open });
  return (
    <>
      <button data-testid="opener">opener</button>
      {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the autoFocus child is the case under test */}
      {open && <input data-testid="inside" autoFocus />}
    </>
  );
}

function mount(open: boolean) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<Host open={open} />));
  return {
    set: (next: boolean) => act(() => root.render(<Host open={next} />)),
    get: (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement | null,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('useReturnFocus on React 18', () => {
  it('runs against React 18', () => {
    expect(version.startsWith('18.')).toBe(true);
  });

  it('returns the focus to the opener even with an autoFocus field inside the content', async () => {
    const view = mount(false);
    act(() => view.get('opener')!.focus());
    view.set(true);
    expect(document.activeElement).toBe(view.get('inside'));
    view.set(false);
    await nextFrame();
    expect(document.activeElement).toBe(view.get('opener'));
    view.unmount();
  });

  it('cancels the pending return when the overlay reopens before the next frame', async () => {
    const view = mount(false);
    act(() => view.get('opener')!.focus());
    view.set(true);
    view.set(false);
    view.set(true);
    await nextFrame();
    expect(document.activeElement).toBe(view.get('inside'));
    view.unmount();
  });

  it('remembers the real opener across a close-reopen-close before the first frame fires (regression)', async () => {
    const view = mount(false);
    const opener = view.get('opener')!;
    act(() => opener.focus());
    view.set(true);
    view.set(false); // schedules a return
    view.set(true); // reopens before that frame: must not forget the opener
    view.set(false); // second close: must still return to the real opener
    await nextFrame();
    expect(document.activeElement).toBe(opener);
    view.unmount();
  });
});
