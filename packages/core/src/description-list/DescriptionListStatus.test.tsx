import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../status-badge/StatusBadge';
import { DescriptionList, DescriptionListItem } from './DescriptionList';
import { DescriptionListStatus } from './DescriptionListStatus';

const BADGE = <StatusBadge tone="warning">Archiviato</StatusBadge>;
const DETAIL = 'Archiviato il 12/10/2026 da M. Rossi';

describe('DescriptionListStatus', () => {
  it.each([
    ['status + detail', BADGE, DETAIL],
    ['status only', BADGE, undefined],
    ['detail only', undefined, DETAIL],
    ['neither (undefined)', undefined, undefined],
    ['neither (null)', null, null],
  ])('renders %s without errors, warnings or "undefined"/"null" text', (_name, status, detail) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<DescriptionListStatus status={status} detail={detail} data-testid="row" />);
    expect(screen.getByTestId('row')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/undefined|null/);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });

  it('keeps the row (and its reserved height) mounted when empty: no text, no role, no children', () => {
    render(<DescriptionListStatus data-testid="row" />);
    const row = screen.getByTestId('row');
    expect(row.textContent).toBe('');
    expect(row.childElementCount).toBe(0);
    expect(row.hasAttribute('role')).toBe(false);
    expect(row.hasAttribute('aria-live')).toBe(false);
    expect(row.hasAttribute('aria-label')).toBe(false);
    // the height comes from the body line-height token, not from a literal
    expect(row.className).toContain('min-h-[var(--text-rop-body--line-height)]');
  });

  it('empty and full rows share the same classes (same reserved height)', () => {
    render(
      <>
        <DescriptionListStatus data-testid="empty" />
        <DescriptionListStatus data-testid="full" status={BADGE} detail={DETAIL} />
      </>,
    );
    expect(screen.getByTestId('empty').className).toBe(screen.getByTestId('full').className);
  });

  it('reads the badge, then the detail; static: no live region or role anywhere', () => {
    const { container } = render(<DescriptionListStatus status={BADGE} detail={DETAIL} data-testid="row" />);
    const row = screen.getByTestId('row');
    expect(row.textContent).toBe(`Archiviato${DETAIL}`);
    const texts = Array.from(row.querySelectorAll('*')).filter((el) => el.children.length === 0);
    expect(texts[0]).toHaveTextContent('Archiviato');
    expect(texts[texts.length - 1]).toHaveTextContent(DETAIL);
    expect(container.querySelector('[role],[aria-live]')).toBeNull();
  });

  it('an empty-string detail leaves no orphan node between badge and detail', () => {
    render(<DescriptionListStatus status={BADGE} detail="" data-testid="row" />);
    const row = screen.getByTestId('row');
    expect(row.childElementCount).toBe(1);
    expect(row.textContent).toBe('Archiviato');
  });

  it('a blank status leaves no wrapper either', () => {
    render(<DescriptionListStatus status="   " detail={DETAIL} data-testid="row" />);
    expect(screen.getByTestId('row').childElementCount).toBe(1);
  });

  it('truncates the detail with TruncatedText and keeps the whole text in the DOM; a node works too', () => {
    render(
      <DescriptionListStatus
        data-testid="row"
        detail={
          <>
            Archiviato il <time dateTime="2026-10-12">12/10/2026</time>
          </>
        }
      />,
    );
    const detail = screen.getByTestId('row').firstElementChild as HTMLElement;
    expect(detail.className).toContain('overflow-hidden');
    expect(detail.className).toContain('text-ellipsis');
    expect(detail.className).toContain('whitespace-nowrap');
    expect(detail).toHaveTextContent('Archiviato il 12/10/2026');
  });

  it('does not leak status/detail to the DOM; className wins via cn; forwards the ref and HTML props', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <DescriptionListStatus
        ref={ref}
        status={BADGE}
        detail={DETAIL}
        className="min-h-0 gap-x-4"
        id="st"
        data-testid="row"
      />,
    );
    const row = screen.getByTestId('row');
    expect(ref.current).toBe(row);
    expect(row.id).toBe('st');
    expect(row.hasAttribute('status')).toBe(false);
    expect(row.hasAttribute('detail')).toBe(false);
    expect(row.className).toContain('min-h-0');
    expect(row.className).not.toContain('min-h-[var(--text-rop-body--line-height)]');
    expect(row.className).toContain('gap-x-4');
    expect(row.className).not.toContain('gap-x-2');
  });

  it('has no transition (instant appear/disappear)', () => {
    render(<DescriptionListStatus status={BADGE} detail={DETAIL} data-testid="row" />);
    const all = [screen.getByTestId('row'), ...Array.from(screen.getByTestId('row').querySelectorAll('*'))];
    for (const el of all) expect(String((el as HTMLElement).className)).not.toMatch(/transition|animate|duration/);
  });

  it('is a sibling of the list: the <dl> only contains item <div>s', () => {
    const { container } = render(
      <>
        <DescriptionListStatus status={BADGE} />
        <DescriptionList>
          <DescriptionListItem label="A">1</DescriptionListItem>
        </DescriptionList>
      </>,
    );
    expect(container.querySelector('dl')!.children).toHaveLength(1);
    expect(container.querySelector('dl')!.contains(container.firstElementChild)).toBe(false);
  });
});

describe('DescriptionListItem variant="summary"', () => {
  it('renders a <div> with <dt>/<dd> inside the same <dl>, no nested wrapper', () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionListItem label="Netto">1.000,00 €</DescriptionListItem>
        <DescriptionListItem label="Totale" variant="summary">
          1.234,00 €
        </DescriptionListItem>
      </DescriptionList>,
    );
    const dl = container.querySelector('dl')!;
    expect(Array.from(dl.children).map((c) => c.tagName)).toEqual(['DIV', 'DIV']);
    const summary = dl.children[1] as HTMLElement;
    expect(Array.from(summary.children).map((c) => c.tagName)).toEqual(['DT', 'DD']);
    expect(summary.className).toContain('font-semibold');
    expect(summary.className).toContain('tabular-nums');
    expect(dl.children[0]!.className).not.toContain('font-semibold');
  });

  it('shares the column setup of the normal items (same layout classes)', () => {
    const { container } = render(
      <DescriptionList layout="inline">
        <DescriptionListItem label="A">1</DescriptionListItem>
        <DescriptionListItem label="B" variant="summary">
          2
        </DescriptionListItem>
      </DescriptionList>,
    );
    const [a, b] = Array.from(container.querySelector('dl')!.children) as HTMLElement[];
    expect(b!.className).toContain('grid-cols-subgrid');
    expect(a!.className).toContain('grid-cols-subgrid');
  });

  it('marks only summary items (the separator rule keys on the previous sibling)', () => {
    const { container } = render(
      <DescriptionList>
        <DescriptionListItem label="A">1</DescriptionListItem>
        <DescriptionListItem label="S1" variant="summary">
          2
        </DescriptionListItem>
        <DescriptionListItem label="S2" variant="summary">
          3
        </DescriptionListItem>
        <DescriptionListItem label="B" variant="default">
          4
        </DescriptionListItem>
        <DescriptionListItem label="S3" variant="summary">
          5
        </DescriptionListItem>
      </DescriptionList>,
    );
    const marks = Array.from(container.querySelector('dl')!.children).map((c) => c.hasAttribute('data-rop-summary'));
    expect(marks).toEqual([false, true, true, false, true]);
  });

  it('does not leak `variant` to the DOM; className wins; ref forwarded; empty value still gets the placeholder', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <DescriptionList>
        <DescriptionListItem ref={ref} label="Totale" variant="summary" className="font-normal" data-testid="s">
          {null}
        </DescriptionListItem>
      </DescriptionList>,
    );
    const item = screen.getByTestId('s');
    expect(ref.current).toBe(item);
    expect(item.hasAttribute('variant')).toBe(false);
    expect(item.className).toContain('font-normal');
    expect(item.className).not.toContain('font-semibold');
    expect(item).toHaveTextContent('Not specified');
  });

  it('an unknown variant (untyped JS) acts as default', () => {
    render(
      <DescriptionList>
        <DescriptionListItem label="X" variant={'bogus' as 'summary'} data-testid="x">
          1
        </DescriptionListItem>
      </DescriptionList>,
    );
    expect(screen.getByTestId('x').hasAttribute('data-rop-summary')).toBe(false);
  });
});
