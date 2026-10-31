import { act, version } from 'react';
import { createRoot } from 'react-dom/client';
import { ObjectPage, ObjectPageFooter, ObjectPageHeader, ObjectPageSection } from '../../packages/core/src';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount(withHeader: boolean) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (visible: boolean) =>
    act(() =>
      root.render(
        <ObjectPage>
          {withHeader ? <ObjectPageHeader title="Fattura" /> : null}
          <ObjectPageFooter visible={visible} message="Errore" messageTone="error" className="custom-x">
            <button>Salva</button>
          </ObjectPageFooter>
          <ObjectPageSection id="a" title="A">
            x
          </ObjectPageSection>
        </ObjectPage>,
      ),
    );
  return { container, root, render };
}

describe('ObjectPageFooter on React 18', () => {
  afterEach(() => vi.restoreAllMocks());

  it('runs against React 18', () => {
    expect(version.startsWith('18.')).toBe(true);
  });

  it('is inert from the first render when hidden, and inert goes on and off with `visible` (attribute set by hand)', () => {
    const { container, root, render } = mount(true);
    render(false);
    const footer = container.querySelector('[data-object-page-footer]') as HTMLElement;
    expect(footer.hasAttribute('inert')).toBe(true);
    expect(footer.className).toContain('custom-x');
    render(true);
    expect(footer.hasAttribute('inert')).toBe(false);
    expect(footer.getAttribute('role')).toBe('region');
    render(false);
    expect(footer.hasAttribute('inert')).toBe(true);
    act(() => root.unmount());
    container.remove();
  });

  it('visible at the first render: no inert', () => {
    const { container, root, render } = mount(true);
    render(true);
    expect((container.querySelector('[data-object-page-footer]') as HTMLElement).hasAttribute('inert')).toBe(false);
    act(() => root.unmount());
    container.remove();
  });

  it('moves the focus to the header title when it hides with the focus on Salva', () => {
    const { container, root, render } = mount(true);
    render(true);
    (container.querySelector('button') as HTMLButtonElement).focus();
    render(false);
    expect(document.activeElement).toBe(container.querySelector('h1'));
    expect(document.activeElement).not.toBe(document.body);
    act(() => root.unmount());
    container.remove();
  });

  it('moves the focus to the page root without a header', () => {
    const { container, root, render } = mount(false);
    render(true);
    (container.querySelector('button') as HTMLButtonElement).focus();
    render(false);
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement?.contains(container.querySelector('[data-object-page-footer]'))).toBe(true);
    act(() => root.unmount());
    container.remove();
  });

  it('does not leak its own props to the DOM and keeps the live region mounted', () => {
    const { container, root, render } = mount(true);
    render(true);
    const footer = container.querySelector('[data-object-page-footer]') as HTMLElement;
    for (const name of ['visible', 'message', 'messagetone', 'tonelabel']) expect(footer.hasAttribute(name)).toBe(false);
    expect(footer.querySelector('[role="status"]')).not.toBeNull();
    act(() => root.unmount());
    container.remove();
  });
});
