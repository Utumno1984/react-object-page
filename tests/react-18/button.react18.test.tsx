import { act, createRef, version } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../../packages/core/src';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return { container, unmount: () => act(() => root.unmount()) };
}

describe('Button on React 18', () => {
  afterEach(() => vi.restoreAllMocks());

  it('runs against React 18', () => {
    expect(version.startsWith('18.')).toBe(true);
  });

  it('renders <button type="button"> and forwards the ref', () => {
    const ref = createRef<HTMLButtonElement>();
    const { container, unmount } = mount(<Button ref={ref}>Salva</Button>);
    const button = container.querySelector('button');
    expect(button?.getAttribute('type')).toBe('button');
    expect(ref.current).toBe(button);
    unmount();
  });

  it('asChild: the <a> gets the classes, the composed onClick and the ref', () => {
    const ref = createRef<HTMLAnchorElement>();
    const own = vi.fn((e: React.MouseEvent) => e.preventDefault());
    const outer = vi.fn();
    const { container, unmount } = mount(
      <Button asChild onClick={outer} ref={ref}>
        <a href="/x" onClick={own}>
          Vai
        </a>
      </Button>,
    );
    const link = container.querySelector('a');
    expect(container.querySelector('button')).toBeNull();
    expect(ref.current).toBe(link);
    expect(link?.classList.contains('bg-rop-surface')).toBe(true);
    act(() => link?.click());
    expect(own).toHaveBeenCalledOnce();
    expect(outer).toHaveBeenCalledOnce();
    unmount();
  });

  it('asChild with a plain function component child reports it cannot take the ref', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Plain = ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a {...props}>{children}</a>
    );
    const { unmount } = mount(
      <Button asChild>
        <Plain href="/x">Vai</Plain>
      </Button>,
    );
    expect(error).toHaveBeenCalledWith(expect.stringContaining('forwardRef'));
    unmount();
  });
});
