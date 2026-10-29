import { createRef } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stickyLayer } from '../overlay/layers';
import { ListReportTable } from './ListReportTable';
import { bodyCellClass, headerCellClass, ROW_HEIGHT_CLASS } from './list-report-table-styles';
import type { ListReportColumn, ListReportSort } from './types';
import { useListReport } from './use-list-report';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

interface Invoice {
  id: string;
  customer: string | null;
  amount: number | null;
}

const ROWS: Invoice[] = [
  { id: 'a', customer: 'Rossi', amount: 10 },
  { id: 'b', customer: 'Bianchi', amount: 2 },
  { id: 'c', customer: null, amount: null },
];

const COLUMNS: ListReportColumn<Invoice>[] = [
  { id: 'id', header: 'N.', width: 60, cell: (r) => r.id },
  { id: 'customer', header: 'Cliente', accessor: (r) => r.customer },
  { id: 'amount', header: 'Importo', accessor: (r) => r.amount, align: 'end', width: '20%' },
];

function Host({
  columns = COLUMNS,
  rows = ROWS,
  onSortChange,
  defaultSort,
  extra,
}: {
  columns?: ListReportColumn<Invoice>[];
  rows?: Invoice[];
  onSortChange?: (sort: ListReportSort) => void;
  defaultSort?: ListReportSort;
  extra?: Record<string, unknown>;
}) {
  const table = useListReport<Invoice>({ rows, columns, getRowId: (r) => r.id, onSortChange, defaultSort });
  return <ListReportTable table={table} aria-label="Fatture" {...extra} />;
}

describe('ListReportTable structure', () => {
  it('renders a named table, a columnheader per column and a row per row', () => {
    render(<Host />);
    const table = screen.getByRole('table', { name: 'Fatture' });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['N.', 'Cliente', 'Importo']);
    expect(within(table).getAllByRole('row')).toHaveLength(1 + ROWS.length);
  });

  it('names the table with aria-labelledby or a caption', () => {
    const { rerender } = render(
      <>
        <h2 id="t">Titolo</h2>
        <Host extra={{ 'aria-label': undefined, 'aria-labelledby': 't' }} />
      </>,
    );
    expect(screen.getByRole('table', { name: 'Titolo' })).toBeInTheDocument();
    rerender(<Host extra={{ 'aria-label': undefined, caption: 'Elenco fatture' }} />);
    expect(screen.getByRole('table', { name: 'Elenco fatture' })).toBeInTheDocument();
  });

  it('keys rows by getRowId: reordering moves the same DOM nodes', async () => {
    render(<Host />);
    const before = new Map(screen.getAllByRole('row').slice(1).map((r) => [r.textContent, r]));
    await userEvent.click(screen.getByRole('button', { name: 'Importo' }));
    const after = screen.getAllByRole('row').slice(1);
    expect(after.map((r) => r.textContent)).not.toEqual([...before.keys()]);
    for (const row of after) expect(before.get(row.textContent)).toBe(row);
  });

  it('renders null/undefined cells empty, never as text', () => {
    render(<Host />);
    const last = screen.getAllByRole('row')[3]!;
    expect(last.textContent).toBe('c');
    expect(last.textContent).not.toMatch(/null|undefined/);
    expect(within(last).getAllByRole('cell')).toHaveLength(3);
  });

  it('renders a single column', () => {
    render(<Host columns={[COLUMNS[1]!]} />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(1);
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });
});

describe('ListReportTable accessible name', () => {
  it('is required by the type', () => {
    function Missing() {
      const table = useListReport<Invoice>({ rows: ROWS, columns: COLUMNS, getRowId: (r) => r.id });
      // @ts-expect-error no aria-label, aria-labelledby or caption
      return <ListReportTable table={table} />;
    }
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Missing />);
  });

  it('warns in development when there is no name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    function Missing() {
      const table = useListReport<Invoice>({ rows: ROWS, columns: COLUMNS, getRowId: (r) => r.id });
      // @ts-expect-error no accessible name
      return <ListReportTable table={table} />;
    }
    render(<Missing />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<ListReportTable> needs an accessible name'));
  });

  it('stays silent in production and when named', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Host />);
    expect(warn).not.toHaveBeenCalled();
    cleanup();
    vi.stubEnv('NODE_ENV', 'production');
    function Missing() {
      const table = useListReport<Invoice>({ rows: ROWS, columns: COLUMNS, getRowId: (r) => r.id });
      // @ts-expect-error no accessible name
      return <ListReportTable table={table} />;
    }
    render(<Missing />);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('ListReportTable headers', () => {
  it('sortable headers hold a button named by the header text; others are plain text', () => {
    render(<Host columns={[...COLUMNS.slice(0, 2), { ...COLUMNS[2]!, sortable: false }]} />);
    expect(within(screen.getByRole('columnheader', { name: 'Cliente' })).getByRole('button', { name: 'Cliente' })).toBeInTheDocument();
    expect(within(screen.getByRole('columnheader', { name: 'N.' })).queryByRole('button')).toBeNull();
    expect(within(screen.getByRole('columnheader', { name: 'Importo' })).queryByRole('button')).toBeNull();
  });

  it('the direction icon is aria-hidden', () => {
    render(<Host />);
    const button = screen.getByRole('button', { name: 'Cliente' });
    const svg = button.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('cycles aria-sort on click and on the keyboard, calling onSortChange per gesture', async () => {
    const onSortChange = vi.fn();
    render(<Host onSortChange={onSortChange} />);
    const th = screen.getByRole('columnheader', { name: 'Importo' });
    const button = within(th).getByRole('button');
    await userEvent.click(button);
    expect(th).toHaveAttribute('aria-sort', 'ascending');
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(th).toHaveAttribute('aria-sort', 'descending');
    await userEvent.keyboard(' ');
    expect(th).not.toHaveAttribute('aria-sort');
    expect(onSortChange.mock.calls.map(([s]) => s)).toEqual([
      { columnId: 'amount', direction: 'asc' },
      { columnId: 'amount', direction: 'desc' },
      null,
    ]);
  });

  it('honors firstSortDirection desc', async () => {
    render(<Host columns={[{ ...COLUMNS[2]!, firstSortDirection: 'desc' }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Importo' }));
    expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'descending');
  });

  it('keeps the same button node (and the focus) after the rows re-order', async () => {
    render(<Host />);
    const button = screen.getByRole('button', { name: 'Importo' });
    await userEvent.click(button);
    expect(screen.getByRole('button', { name: 'Importo' })).toBe(button);
    expect(button).toHaveFocus();
  });
});

describe('ListReportTable layout', () => {
  it('declares a colgroup with the widths and a fixed layout', () => {
    const { container } = render(<Host />);
    const cols = container.querySelectorAll('col');
    expect([...cols].map((c) => c.style.width)).toEqual(['60px', '', '20%']);
    expect(container.querySelector('table')!.className).toContain('table-fixed');
  });

  it('min-width is the sum of width/minWidth (default 120px; a percentage counts as minWidth)', () => {
    const { container } = render(<Host />);
    // 60 (width) + 120 (default minWidth) + 120 (20% -> default minWidth)
    expect(container.querySelector('table')!.style.minWidth).toBe('300px');
    expect(container.querySelector('table')!.style.width).toBe('100%');
  });

  it('uses minWidth when given, mixing units with calc()', () => {
    const { container } = render(
      <Host columns={[{ id: 'id', header: 'N.', minWidth: 80 }, { id: 'c', header: 'C', minWidth: '10rem' }, { id: 'd', header: 'D', width: 50 }]} />,
    );
    expect(container.querySelector('table')!.style.minWidth).toBe('calc(130px + 10rem)');
  });

  it('with only pixel widths the table is exactly their sum (no column is stretched)', () => {
    const { container } = render(<Host columns={[{ id: 'id', header: 'N.', width: 100 }, { id: 'c', header: 'C', width: '150px' }]} />);
    expect(container.querySelector('table')!.style.width).toBe('250px');
  });

  it('every column with a width: the table is as wide as them, whatever the units', () => {
    const { container } = render(<Host columns={[{ id: 'a', header: 'A', width: 200 }, { id: 'b', header: 'B', width: '30%' }]} />);
    const table = container.querySelector('table')!;
    // (the CSS parser folds 200px / 0.7 into one number)
    expect(table.style.width).toBe('calc(285.714px)');
    expect(table.style.minWidth).toBe('calc(285.714px)');
    cleanup();
    const rem = render(<Host columns={[{ id: 'a', header: 'A', width: '10rem' }, { id: 'b', header: 'B', width: '10rem' }]} />);
    expect(rem.container.querySelector('table')!.style.width).toBe('calc(0px + 10rem + 10rem)');
  });

  it('aligns end with logical classes on header, sort button and cells', () => {
    render(<Host />);
    const th = screen.getByRole('columnheader', { name: 'Importo' });
    expect(th.className).toContain('text-end');
    expect(within(th).getByRole('button').className).toContain('justify-end');
    expect(screen.getAllByRole('cell')[2]!.className).toContain('text-end');
  });

  it('every cell has the row-height token class; the header is sticky at the sticky level', () => {
    render(<Host />);
    for (const cell of screen.getAllByRole('cell')) expect(cell.className).toContain('h-(--rop-list-report-row-height)');
    const th = screen.getByRole('columnheader', { name: 'Cliente' });
    expect(th.className).toContain('sticky');
    expect(th.className).toContain(stickyLayer);
    expect(headerCellClass).toContain(ROW_HEIGHT_CLASS);
    expect(bodyCellClass).toContain(ROW_HEIGHT_CLASS);
  });

  it('is a single scroll container that is a tab stop; maxHeight is applied to it', () => {
    const { container } = render(<Host extra={{ maxHeight: 300 }} />);
    const scroller = container.firstElementChild as HTMLElement;
    expect(scroller.className).toContain('overflow-auto');
    expect(scroller.style.maxHeight).toBe('300px');
    expect(scroller.getAttribute('tabindex')).toBe('0');
    expect(container.querySelectorAll('.overflow-auto')).toHaveLength(1);
    // the row-height variable is declared on the scroller, so the states inside it read the same value
    expect(scroller.className).toContain('[--rop-list-report-row-height:2.75rem]');
  });
});

describe('ListReportTable cells', () => {
  it('truncates text with TruncatedText by default', () => {
    render(<Host columns={[{ id: 'c', header: 'C', accessor: (r) => r.customer }]} />);
    const cell = screen.getAllByRole('cell')[0]!;
    expect(cell.firstElementChild!.className).toContain('text-ellipsis');
  });

  it('truncate: false renders a contained wrapper instead', () => {
    render(<Host columns={[{ id: 'c', header: 'C', accessor: (r) => r.customer, truncate: false }]} />);
    const inner = screen.getAllByRole('cell')[0]!.firstElementChild!;
    expect(inner.className).not.toContain('text-ellipsis');
    expect(inner.className).toContain('min-w-0');
    expect(inner.className).toContain('overflow-hidden');
  });

  it('a cell that returns a string is truncated, one that returns a node is contained', () => {
    render(
      <Host
        columns={[
          { id: 'a', header: 'A', cell: (r) => r.id.toUpperCase() },
          { id: 'b', header: 'B', cell: (r) => <strong>{r.id}</strong> },
        ]}
      />,
    );
    const row = screen.getAllByRole('row')[1]!;
    const [a, b] = within(row).getAllByRole('cell');
    expect(a!.firstElementChild!.className).toContain('text-ellipsis');
    expect(b!.firstElementChild!.className).toContain('min-w-0');
    expect(b!.querySelector('strong')).toBeInTheDocument();
  });

  it('renders 0 as text and false/null from cell as empty', () => {
    render(
      <Host
        rows={[{ id: 'z', customer: 'x', amount: 0 }]}
        columns={[
          { id: 'amount', header: 'A', cell: (r) => r.amount },
          { id: 'f', header: 'F', cell: () => false },
          { id: 'n', header: 'N', cell: () => null },
        ]}
      />,
    );
    expect(screen.getAllByRole('row')[1]!.textContent).toBe('0');
  });
});

describe('ListReportTable DOM props', () => {
  it('does not leak table or maxHeight (or the naming props) to the container', () => {
    const { container } = render(<Host extra={{ maxHeight: 200, caption: 'Cap', 'data-testid': 'x' }} />);
    const scroller = container.firstElementChild as HTMLElement;
    for (const name of ['table', 'maxheight', 'maxHeight', 'caption', 'aria-label']) expect(scroller.hasAttribute(name)).toBe(false);
    expect(scroller.getAttribute('data-testid')).toBe('x');
  });

  it('className on the container wins over the defaults', () => {
    const { container } = render(<Host extra={{ className: 'overflow-hidden min-h-8' }} />);
    const scroller = container.firstElementChild as HTMLElement;
    expect(scroller.className).toContain('overflow-hidden');
    expect(scroller.className).not.toContain('overflow-auto');
    expect(scroller.className).not.toContain('min-h-0');
    expect(scroller.className).toContain('min-h-8');
  });

  it('forwards the ref to the scroll container', () => {
    const ref = createRef<HTMLDivElement>();
    function WithRef() {
      const table = useListReport<Invoice>({ rows: ROWS, columns: COLUMNS, getRowId: (r) => r.id });
      return <ListReportTable ref={ref} table={table} aria-label="F" />;
    }
    const { container } = render(<WithRef />);
    expect(ref.current).toBe(container.firstElementChild);
  });
});
