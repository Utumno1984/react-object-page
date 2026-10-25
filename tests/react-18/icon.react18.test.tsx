import { act, createRef, version } from 'react';
import { createRoot } from 'react-dom/client';
import { Icon } from '../../packages/core/src';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return { container, unmount: () => act(() => root.unmount()) };
}

describe('Icon on React 18', () => {
  afterEach(() => vi.restoreAllMocks());

  it('runs against React 18', () => {
    expect(version.startsWith('18.')).toBe(true);
  });

  it("keeps the child's ref (read from element.ref) and composes it with the forwarded one", () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const childRef = createRef<SVGSVGElement>();
    const outerRef = createRef<SVGSVGElement>();
    const { container, unmount } = mount(
      <Icon ref={outerRef} label="Errore">
        <svg ref={childRef} className="mine" />
      </Icon>,
    );
    const svg = container.querySelector('svg');
    expect(childRef.current).toBe(svg);
    expect(outerRef.current).toBe(svg);
    expect(svg?.classList.contains('mine')).toBe(true);
    expect(svg?.classList.contains('size-(--icon-rop-md)')).toBe(true);
    expect(svg?.getAttribute('role')).toBe('img');
    unmount();
    expect(childRef.current).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
