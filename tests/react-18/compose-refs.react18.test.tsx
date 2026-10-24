import { act, createRef, version } from 'react';
import { createRoot } from 'react-dom/client';
import { composeRefs } from '../../packages/core/src';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return {
    container,
    unmount: () => act(() => root.unmount()),
  };
}

describe('composeRefs on React 18', () => {
  afterEach(() => vi.restoreAllMocks());

  it('runs against React 18', () => {
    expect(version.startsWith('18.')).toBe(true);
  });

  it('assigns the same node to callback and object refs, null on unmount', () => {
    const calls: Array<HTMLDivElement | null> = [];
    const callbackRef = (node: HTMLDivElement | null) => {
      calls.push(node);
    };
    const objectRef = createRef<HTMLDivElement>();

    const { container, unmount } = mount(
      <div ref={composeRefs(callbackRef, objectRef, undefined)} />,
    );
    const node = container.firstElementChild as HTMLDivElement;
    expect(calls).toEqual([node]);
    expect(objectRef.current).toBe(node);

    unmount();
    expect(calls).toEqual([node, null]);
    expect(objectRef.current).toBeNull();
  });

  it('does not log "A callback ref should not return a function"', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = mount(<div ref={composeRefs(createRef<HTMLDivElement>(), () => {})} />);
    unmount();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('handles all-undefined refs and the same ref twice', () => {
    const objectRef = createRef<HTMLDivElement>();
    const a = mount(<div ref={composeRefs<HTMLDivElement>(undefined, undefined)} />);
    a.unmount();
    const b = mount(<div ref={composeRefs(objectRef, objectRef)} />);
    expect(objectRef.current).not.toBeNull();
    b.unmount();
    expect(objectRef.current).toBeNull();
  });
});
