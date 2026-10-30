import { createRef, useState, type ReactNode } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Icon } from '../icon/Icon';
import { internalIcons } from '../internal/icons';
import { ObjectPage } from './ObjectPage';
import { useObjectPageSections } from './ObjectPageContext';
import { ObjectPageHeader } from './ObjectPageHeader';
import { ObjectPageSection } from './ObjectPageSection';
import { SECTION_GAP_PX } from './object-page-styles';

/** Prints the registry as JSON, so a test reads exactly what a consumer of the hook gets. */
function RegistryProbe() {
  const sections = useObjectPageSections();
  return <output data-testid="registry">{JSON.stringify(sections)}</output>;
}
const registry = () => JSON.parse(screen.getByTestId('registry').textContent ?? '[]') as { id: string; title: string }[];

afterEach(() => vi.restoreAllMocks());

describe('ObjectPage structure', () => {
  it('has one scroll container holding the header and every section, plus an empty footer slot below it', () => {
    const { container } = render(
      <ObjectPage>
        <ObjectPageHeader title="Fattura" actions={<button>Salva</button>} />
        <ObjectPageSection id="a" title="A">
          x
        </ObjectPageSection>
        <ObjectPageSection id="b" title="B">
          y
        </ObjectPageSection>
      </ObjectPage>,
    );
    const scrollers = container.querySelectorAll('[data-object-page-scroller]');
    expect(scrollers).toHaveLength(1);
    const scroller = scrollers[0] as HTMLElement;
    expect(scroller).toHaveClass('overflow-y-auto', 'min-h-0', 'flex-1');
    expect(within(scroller).getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(within(scroller).getAllByRole('region')).toHaveLength(2);
    const slot = container.querySelector('[data-object-page-footer-slot]') as HTMLElement;
    expect(slot).toBeEmptyDOMElement();
    expect(scroller.nextElementSibling).toBe(slot);
    expect(scroller.contains(slot)).toBe(false);
  });

  it('is a flex column that takes the height of the parent', () => {
    const { container } = render(<ObjectPage data-testid="root" />);
    expect(container.firstElementChild).toHaveClass('flex', 'flex-col', 'h-full', 'min-h-0');
  });

  it('pads the bottom of the scroller with the virtual keyboard inset', () => {
    const { container } = render(<ObjectPage />);
    const scroller = container.querySelector('[data-object-page-scroller]') as HTMLElement;
    expect(scroller.style.paddingBottom).toContain('var(--rop-keyboard-inset, 0px)');
  });

  it('makes the scroller reachable with the keyboard (tabindex 0)', async () => {
    const { container } = render(
      <ObjectPage>
        <ObjectPageSection id="a" title="Solo testo">
          testo
        </ObjectPageSection>
      </ObjectPage>,
    );
    const scroller = container.querySelector('[data-object-page-scroller]') as HTMLElement;
    expect(scroller).toHaveAttribute('tabindex', '0');
    await userEvent.tab();
    expect(scroller).toHaveFocus();
  });

  it('renders with no sections (header only) and with a single one, without errors', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <ObjectPage>
        <ObjectPageHeader title="Solo intestazione" />
        <RegistryProbe />
      </ObjectPage>,
    );
    expect(registry()).toEqual([]);
    rerender(
      <ObjectPage>
        <ObjectPageHeader title="Solo intestazione" />
        <ObjectPageSection id="uno" title="Uno">
          x
        </ObjectPageSection>
        <RegistryProbe />
      </ObjectPage>,
    );
    expect(registry()).toEqual([{ id: 'uno', title: 'Uno' }]);
    expect(error).not.toHaveBeenCalled();
  });
});

describe('heading hierarchy and regions', () => {
  it('uses h1 for the header and h2 for the sections by default', () => {
    render(
      <ObjectPage>
        <ObjectPageHeader title="Fattura 2026/0142" />
        <ObjectPageSection id="dati" title="Dati generali">
          x
        </ObjectPageSection>
      </ObjectPage>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Fattura 2026/0142' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Dati generali' })).toBeInTheDocument();
  });

  it.each([1, 2, 3, 4] as const)('headingLevel=%s: header at that level, sections at the next', (level) => {
    render(
      <ObjectPage headingLevel={level}>
        <ObjectPageHeader title="Titolo" />
        <ObjectPageSection id="s" title="Sezione">
          x
        </ObjectPageSection>
      </ObjectPage>,
    );
    expect(screen.getByRole('heading', { level, name: 'Titolo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: level + 1, name: 'Sezione' })).toBeInTheDocument();
  });

  it('makes each section a region named by its own title, and gives it the id', () => {
    render(
      <ObjectPage>
        <ObjectPageSection id="dati" title="Dati generali">
          x
        </ObjectPageSection>
        <ObjectPageSection id="righe" title="Righe">
          y
        </ObjectPageSection>
      </ObjectPage>,
    );
    const dati = screen.getByRole('region', { name: 'Dati generali' });
    expect(dati.tagName).toBe('SECTION');
    expect(dati).toHaveAttribute('id', 'dati');
    expect(screen.getByRole('region', { name: 'Righe' })).toHaveAttribute('id', 'righe');
  });

  it('names the region with the text of the title only when the title holds an icon', () => {
    render(
      <ObjectPage>
        <ObjectPageSection
          id="dati"
          title={
            <>
              <Icon>{internalIcons.info}</Icon> Dati generali
            </>
          }
        >
          x
        </ObjectPageSection>
      </ObjectPage>,
    );
    expect(screen.getByRole('region', { name: 'Dati generali' })).toBeInTheDocument();
  });

  it('registers exactly the accessible name of the region, also for titles rendered by a component or with hidden parts', () => {
    const Label = () => <>Dati generali</>;
    render(
      <ObjectPage>
        <ObjectPageSection
          id="a"
          title={
            <>
              <Icon>{internalIcons.info}</Icon> Con icona
            </>
          }
        >
          x
        </ObjectPageSection>
        <ObjectPageSection id="b" title={<Label />}>
          x
        </ObjectPageSection>
        <ObjectPageSection
          id="c"
          title={
            <>
              Visibile <span aria-hidden="true">nascosto</span>
            </>
          }
        >
          x
        </ObjectPageSection>
        <RegistryProbe />
      </ObjectPage>,
    );
    expect(registry()).toEqual([
      { id: 'a', title: 'Con icona' },
      { id: 'b', title: 'Dati generali' },
      { id: 'c', title: 'Visibile' },
    ]);
    for (const { title } of registry()) expect(screen.getByRole('region', { name: title })).toBeInTheDocument();
  });

  it('declares the sticky offset variable as the scroll margin of a section', () => {
    render(
      <ObjectPage>
        <ObjectPageSection id="dati" title="Dati">
          x
        </ObjectPageSection>
      </ObjectPage>,
    );
    expect(screen.getByRole('region', { name: 'Dati' }).style.scrollMarginTop).toBe(
      'calc(var(--rop-object-page-sticky-offset, 0px) + ' + SECTION_GAP_PX + 'px)',
    );
  });
});

describe('ObjectPageHeader', () => {
  it('renders subtitle, status and actions in their slots', () => {
    render(
      <ObjectPage>
        <ObjectPageHeader title="Fattura" subtitle="ACME srl" status={<span>Da approvare</span>} actions={<button>Approva</button>} />
      </ObjectPage>,
    );
    expect(screen.getByText('ACME srl')).toBeInTheDocument();
    expect(screen.getByText('Da approvare')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approva' })).toBeInTheDocument();
  });

  it('omits the empty optional slots, and wraps (not truncates) a long title', () => {
    const { container } = render(
      <ObjectPage>
        <ObjectPageHeader title="Titolo lunghissimo" subtitle={false} status={null} actions={<> </>} />
      </ObjectPage>,
    );
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveClass('[overflow-wrap:anywhere]');
    expect(heading.className).not.toMatch(/truncate|text-ellipsis|whitespace-nowrap/);
    const header = heading.closest('div')?.parentElement?.parentElement as HTMLElement;
    // identity block only: no status, no actions container
    expect(header.children).toHaveLength(1);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('stacks the actions under the title and puts them beside it from 640px', () => {
    render(
      <ObjectPage>
        <ObjectPageHeader title="Fattura" actions={<button>Approva</button>} />
      </ObjectPage>,
    );
    const header = screen.getByRole('heading', { level: 1 }).closest('div')?.parentElement?.parentElement as HTMLElement;
    expect(header).toHaveClass('flex-col', 'sm:flex-row');
    expect(screen.getByRole('button', { name: 'Approva' }).parentElement).toHaveClass('flex-wrap');
  });
});

describe('section registry', () => {
  it('lists { id, title } in DOM order, not in mount order', () => {
    function Page({ showMiddle }: { showMiddle: boolean }) {
      return (
        <ObjectPage>
          <ObjectPageSection id="a" title="A">
            x
          </ObjectPageSection>
          {showMiddle ? (
            <ObjectPageSection id="b" title="B">
              x
            </ObjectPageSection>
          ) : null}
          <ObjectPageSection id="c" title="C">
            x
          </ObjectPageSection>
          <RegistryProbe />
        </ObjectPage>
      );
    }
    const { rerender } = render(<Page showMiddle={false} />);
    expect(registry().map((s) => s.id)).toEqual(['a', 'c']);
    // B mounts after A and C but sits between them in the DOM.
    rerender(<Page showMiddle />);
    expect(registry().map((s) => s.id)).toEqual(['a', 'b', 'c']);
    rerender(<Page showMiddle={false} />);
    expect(registry().map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('finds a section wrapped in a component of the consumer', () => {
    const Wrapper = ({ children }: { children: ReactNode }) => <div className="grupo">{children}</div>;
    render(
      <ObjectPage>
        <Wrapper>
          <ObjectPageSection id="nested" title="Annidata">
            x
          </ObjectPageSection>
        </Wrapper>
        <ObjectPageSection id="flat" title="Piatta">
          x
        </ObjectPageSection>
        <RegistryProbe />
      </ObjectPage>,
    );
    expect(registry()).toEqual([
      { id: 'nested', title: 'Annidata' },
      { id: 'flat', title: 'Piatta' },
    ]);
  });

  it('follows a rename and an id change', async () => {
    function Page() {
      const [n, setN] = useState(1);
      return (
        <ObjectPage>
          <ObjectPageSection id={`s${n}`} title={`Titolo ${n}`}>
            x
          </ObjectPageSection>
          <button onClick={() => setN(2)}>cambia</button>
          <RegistryProbe />
        </ObjectPage>
      );
    }
    render(<Page />);
    expect(registry()).toEqual([{ id: 's1', title: 'Titolo 1' }]);
    await userEvent.click(screen.getByRole('button', { name: 'cambia' }));
    expect(registry()).toEqual([{ id: 's2', title: 'Titolo 2' }]);
  });

  it('uses the text of a title with markup, and follows a keyed reorder', async () => {
    function Page() {
      const [order, setOrder] = useState(['a', 'b']);
      return (
        <ObjectPage>
          {order.map((id) => (
            <ObjectPageSection key={id} id={id} title={<strong>Sezione {id}</strong>}>
              x
            </ObjectPageSection>
          ))}
          <button onClick={() => setOrder(['b', 'a'])}>inverti</button>
          <RegistryProbe />
        </ObjectPage>
      );
    }
    render(<Page />);
    expect(registry()).toEqual([
      { id: 'a', title: 'Sezione a' },
      { id: 'b', title: 'Sezione b' },
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'inverti' }));
    // The reorder changes neither id nor title: the DOM mutation is what the registry reacts to.
    await act(async () => {
      await Promise.resolve();
    });
    expect(registry().map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('keeps the same array identity when a mutation inside the scroller changes no section (no re-render ripple)', async () => {
    const seen: unknown[] = [];
    function Spy() {
      seen.push(useObjectPageSections());
      return null;
    }
    function Page() {
      const [extra, setExtra] = useState(false);
      return (
        <ObjectPage>
          <ObjectPageSection id="a" title="A">
            x
          </ObjectPageSection>
          {extra ? <p>messaggio comparso</p> : null}
          <button onClick={() => setExtra(true)}>aggiungi</button>
          <Spy />
        </ObjectPage>
      );
    }
    render(<Page />);
    const before = seen[seen.length - 1];
    await userEvent.click(screen.getByRole('button', { name: 'aggiungi' }));
    // The observer runs in a microtask: let it fire.
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText('messaggio comparso')).toBeInTheDocument();
    expect(seen[seen.length - 1]).toBe(before);
  });

  it('follows a title that changes without its section re-rendering', async () => {
    let setLabel: (text: string) => void = () => undefined;
    function Label() {
      const [text, set] = useState('Prima');
      setLabel = set;
      return <>{text}</>;
    }
    render(
      <ObjectPage>
        <ObjectPageSection id="a" title={<Label />}>
          x
        </ObjectPageSection>
        <RegistryProbe />
      </ObjectPage>,
    );
    expect(registry()).toEqual([{ id: 'a', title: 'Prima' }]);
    act(() => setLabel('Dopo'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(registry()).toEqual([{ id: 'a', title: 'Dopo' }]);
  });
});

describe('development errors', () => {
  it('warns on a duplicate section id and does not crash', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <ObjectPage>
        <ObjectPageSection id="dup" title="Uno">
          x
        </ObjectPageSection>
        <ObjectPageSection id="dup" title="Due">
          y
        </ObjectPageSection>
      </ObjectPage>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('duplicate id "dup"'));
    expect(screen.getAllByRole('region')).toHaveLength(2);
  });

  it('does not warn when ids are unique', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <ObjectPage>
        <ObjectPageSection id="a" title="Uno">
          x
        </ObjectPageSection>
        <ObjectPageSection id="b" title="Due">
          y
        </ObjectPageSection>
      </ObjectPage>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('throws a clear error for a section outside an ObjectPage', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <ObjectPageSection id="orfana" title="Orfana">
          x
        </ObjectPageSection>,
      ),
    ).toThrow('ObjectPageSection must be rendered inside an <ObjectPage>.');
  });

  it('throws a clear error for a header outside an ObjectPage', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ObjectPageHeader title="Orfano" />)).toThrow('ObjectPageHeader must be rendered inside an <ObjectPage>.');
  });
});

describe('props, className and refs', () => {
  it('lets className win over the defaults on every part (cn merges conflicts)', () => {
    render(
      <ObjectPage className="gap-9 h-auto" data-testid="root">
        <ObjectPageHeader title="T" className="gap-9" data-testid="header" />
        <ObjectPageSection id="s" title="S" className="gap-9" data-testid="section">
          x
        </ObjectPageSection>
      </ObjectPage>,
    );
    const root = screen.getByTestId('root');
    expect(root).toHaveClass('h-auto');
    expect(root).not.toHaveClass('h-full');
    expect(screen.getByTestId('header')).toHaveClass('gap-9');
    expect(screen.getByTestId('header')).not.toHaveClass('gap-3');
    expect(screen.getByTestId('section')).toHaveClass('gap-9');
    expect(screen.getByTestId('section')).not.toHaveClass('gap-3');
  });

  it('forwards refs to the root, the header and the section element', () => {
    const rootRef = createRef<HTMLDivElement>();
    const headerRef = createRef<HTMLDivElement>();
    const sectionRef = createRef<HTMLElement>();
    render(
      <ObjectPage ref={rootRef}>
        <ObjectPageHeader ref={headerRef} title="T" />
        <ObjectPageSection ref={sectionRef} id="s" title="S">
          x
        </ObjectPageSection>
      </ObjectPage>,
    );
    expect(rootRef.current).toBe(screen.getByRole('heading', { level: 1 }).closest('[data-object-page-scroller]')?.parentElement);
    expect(headerRef.current).toContainElement(screen.getByRole('heading', { level: 1 }));
    expect(sectionRef.current).toBe(screen.getByRole('region', { name: 'S' }));
  });

  it('leaks no non-DOM prop to the DOM (title/headingLevel/status/actions/subtitle)', () => {
    const { container } = render(
      <ObjectPage headingLevel={2} id="pagina">
        <ObjectPageHeader title="T" subtitle="s" status="st" actions={<button>a</button>} />
        <ObjectPageSection id="s" title="S">
          x
        </ObjectPageSection>
      </ObjectPage>,
    );
    const attributes = Array.from(container.querySelectorAll('*')).flatMap((el) => Array.from(el.attributes).map((a) => a.name.toLowerCase()));
    for (const leaked of ['headinglevel', 'title', 'subtitle', 'status', 'actions']) {
      expect(attributes).not.toContain(leaked);
    }
    expect(container.querySelector('#pagina')).not.toBeNull();
  });
});
