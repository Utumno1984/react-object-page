import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ListReportTable } from './ListReportTable';
import type { ListReportColumn, ListReportSort, ListReportSortDirection } from './types';
import { useListReport } from './use-list-report';

interface Invoice {
  id: string;
  customer: string;
  description: string;
  amount: number;
  date: string;
}

const CUSTOMERS = [
  'Bianchi & Associati S.r.l. - Servizi di consulenza amministrativa',
  'Rossi Costruzioni',
  'Verdi Forniture Industriali S.p.A. - Divisione Nord-Ovest',
  'Neri',
  'Gialli Trasporti e Logistica Internazionale S.r.l.',
];

// Deterministic (no Math.random): the visual baselines must never change between runs.
function makeInvoices(count: number): Invoice[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `F-${String(i + 1).padStart(4, '0')}`,
    customer: CUSTOMERS[i % CUSTOMERS.length]!,
    description: `Fattura in attesa di approvazione da parte dell’ufficio acquisti, riferimento ordine ${1000 + i * 7}`,
    amount: ((i * 7919) % 9973) + 0.5,
    date: new Date(Date.UTC(2026, 0, 1 + ((i * 13) % 300))).toISOString().slice(0, 10),
  }));
}

const money = (value: number): string => `€ ${value.toFixed(2)}`;

function columns(firstDateDirection: ListReportSortDirection = 'desc'): ListReportColumn<Invoice>[] {
  return [
    { id: 'id', header: 'N.', accessor: (r) => r.id, width: 90 },
    { id: 'customer', header: 'Cliente', accessor: (r) => r.customer, minWidth: 160 },
    { id: 'description', header: 'Descrizione', accessor: (r) => r.description, sortable: false, minWidth: 200 },
    { id: 'amount', header: 'Importo', accessor: (r) => r.amount, cell: (r) => money(r.amount), align: 'end', width: 120 },
    { id: 'date', header: 'Data', accessor: (r) => r.date, firstSortDirection: firstDateDirection, width: 120 },
  ];
}

interface TableDemoProps {
  rows: Invoice[];
  columns: ListReportColumn<Invoice>[];
  maxHeight?: number;
  onSortChange?: (sort: ListReportSort) => void;
  defaultSort?: ListReportSort;
  dir?: 'ltr' | 'rtl';
  label?: string;
}

function TableDemo({ rows, columns: cols, maxHeight, onSortChange, defaultSort, dir, label = 'Fatture' }: TableDemoProps) {
  const table = useListReport<Invoice>({ rows, columns: cols, getRowId: (r) => r.id, onSortChange, defaultSort });
  return <ListReportTable table={table} aria-label={label} maxHeight={maxHeight} dir={dir} data-testid="scroller" />;
}

interface PlaygroundArgs {
  maxHeight: number;
  containerWidth: number;
  dir: 'ltr' | 'rtl';
  dateFirstSort: ListReportSortDirection;
  onSortChange: (sort: ListReportSort) => void;
}

const meta: Meta<PlaygroundArgs> = {
  title: 'Data/ListReportTable',
  parameters: { layout: 'fullscreen' },
  argTypes: {
    maxHeight: { control: { type: 'range', min: 160, max: 700, step: 10 }, description: 'maxHeight del contenitore di scroll (px)' },
    containerWidth: { control: { type: 'range', min: 320, max: 1200, step: 10 }, description: 'Larghezza del riquadro demo (px)' },
    dir: { control: 'radio', options: ['ltr', 'rtl'] },
    dateFirstSort: {
      control: 'radio',
      options: ['asc', 'desc'],
      description: '`firstSortDirection` della colonna "Data"',
    },
    onSortChange: { control: false },
  },
  args: { maxHeight: 360, containerWidth: 900, dir: 'ltr', dateFirstSort: 'desc', onSortChange: fn() },
};

export default meta;
type Story = StoryObj<PlaygroundArgs>;

const PAGE: CSSProperties = { padding: 16, fontFamily: 'system-ui, sans-serif' };
const NO_CONTROLS = { controls: { disable: true } };
const INVOICES = makeInvoices(40);

/**
 * Controls: `maxHeight` of the scroll container, `containerWidth` of the demo box (narrow it to see the
 * horizontal scroll stay inside the box), `dir`, and `firstSortDirection` of the "Data" column;
 * `onSortChange` shows up in Actions. The play function clicks "Importo" twice and checks that the
 * rows are in descending order, that the header says so and that exactly two sort changes were notified.
 */
export const Playground: Story = {
  render: ({ maxHeight, containerWidth, dir, dateFirstSort, onSortChange }) => {
    const cols = columns(dateFirstSort);
    return (
      <div style={PAGE}>
        <div style={{ width: containerWidth, maxWidth: '100%' }} data-testid="box">
          <TableDemo rows={INVOICES} columns={cols} maxHeight={maxHeight} onSortChange={onSortChange} dir={dir} />
        </div>
      </div>
    );
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const header = canvas.getByRole('columnheader', { name: 'Importo' });
    const button = within(header).getByRole('button');
    await userEvent.click(button);
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    await userEvent.click(button);
    await expect(header).toHaveAttribute('aria-sort', 'descending');

    const expected = [...INVOICES].sort((a, b) => b.amount - a.amount).slice(0, 3).map((r) => money(r.amount));
    const rows = canvas.getAllByRole('row').slice(1, 4);
    await expect(rows.map((r) => within(r).getAllByRole('cell')[3]!.textContent)).toEqual(expected);

    await expect(args.onSortChange).toHaveBeenCalledTimes(2);
    await expect(args.onSortChange).toHaveBeenNthCalledWith(1, { columnId: 'amount', direction: 'asc' });
    await expect(args.onSortChange).toHaveBeenNthCalledWith(2, { columnId: 'amount', direction: 'desc' });
  },
};

/** The table as it comes, unsorted: a stable starting point for the keyboard and geometry checks. */
export const Plain: Story = {
  parameters: NO_CONTROLS,
  render: () => (
    <div style={PAGE}>
      <div style={{ width: 900 }}>
        <TableDemo rows={INVOICES} columns={columns()} maxHeight={360} />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('columnheader')).toHaveLength(5);
    await expect(canvas.getAllByRole('row')).toHaveLength(INVOICES.length + 1);
    for (const header of canvas.getAllByRole('columnheader')) await expect(header).not.toHaveAttribute('aria-sort');
  },
};

const WIDE_BOX: CSSProperties = { width: 1000 };

/** Every column declares a width (px and %): each keeps it, the table is as wide as the columns together. */
export const MixedWidths: Story = {
  parameters: NO_CONTROLS,
  render: () => (
    <div style={PAGE}>
      <div style={WIDE_BOX}>
        <TableDemo
          rows={INVOICES.slice(0, 4)}
          columns={[
            { id: 'id', header: 'N.', accessor: (r) => r.id, width: 200 },
            { id: 'customer', header: 'Cliente', accessor: (r) => r.customer, width: '30%' },
          ]}
        />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [first, second] = within(canvasElement).getAllByRole('columnheader');
    await expect(Math.round(first!.getBoundingClientRect().width)).toBe(200);
    // 30% is a share of the table itself, which is 200px / 0.7 wide
    await expect(Math.abs(second!.getBoundingClientRect().width - 0.3 * (200 / 0.7))).toBeLessThanOrEqual(1);
  },
};

/** Every column in rem: no stretching to the container either. */
export const RemWidths: Story = {
  parameters: NO_CONTROLS,
  render: () => (
    <div style={PAGE}>
      <div style={WIDE_BOX}>
        <TableDemo
          rows={INVOICES.slice(0, 4)}
          columns={[
            { id: 'id', header: 'N.', accessor: (r) => r.id, width: '10rem' },
            { id: 'customer', header: 'Cliente', accessor: (r) => r.customer, width: '10rem' },
          ]}
        />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [first] = within(canvasElement).getAllByRole('columnheader');
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    await expect(Math.abs(first!.getBoundingClientRect().width - 10 * rem)).toBeLessThanOrEqual(1);
  },
};

/** Long texts truncated, right-aligned amounts, a sorted column (the arrow marks the direction). */
export const LongTexts: Story = {
  tags: ['visual'],
  parameters: NO_CONTROLS,
  render: () => (
    <div style={PAGE}>
      <TableDemo rows={INVOICES.slice(0, 8)} columns={columns()} defaultSort={{ columnId: 'amount', direction: 'desc' }} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('columnheader', { name: 'Importo' })).toHaveAttribute('aria-sort', 'descending');
    const first = canvas.getAllByRole('row')[1]!;
    const description = within(first).getAllByRole('cell')[2]!.firstElementChild as HTMLElement;
    await expect(description.scrollWidth).toBeGreaterThan(description.clientWidth);
  },
};

/** A narrow box: the table scrolls horizontally inside it, the page does not. */
export const NarrowContainer: Story = {
  tags: ['visual'],
  parameters: NO_CONTROLS,
  render: () => (
    <div style={PAGE}>
      <div style={{ width: 340, maxWidth: '100%' }}>
        <TableDemo rows={INVOICES.slice(0, 8)} columns={columns()} />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const scroller = within(canvasElement).getByTestId('scroller');
    await expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  },
};

/** Scrolled down and to the side: the header stays on top of the scroll container. */
export const StickyAfterScroll: Story = {
  tags: ['visual'],
  parameters: NO_CONTROLS,
  render: () => (
    <div style={PAGE}>
      <div style={{ width: 420, maxWidth: '100%' }}>
        <TableDemo rows={INVOICES} columns={columns()} maxHeight={260} />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const scroller = within(canvasElement).getByTestId('scroller');
    scroller.scrollTop = 220;
    scroller.scrollLeft = 80;
    await expect(scroller.scrollTop).toBeGreaterThan(0);
    const header = within(canvasElement).getAllByRole('columnheader')[0]!;
    await expect(Math.abs(header.getBoundingClientRect().top - scroller.getBoundingClientRect().top)).toBeLessThanOrEqual(1);
  },
};

const MANY: ListReportColumn<Invoice>[] = Array.from({ length: 20 }, (_, i) => ({
  id: `c${i}`,
  header: i === 3 ? 'Un’intestazione molto lunga che non deve andare a capo' : `Col. ${i + 1}`,
  accessor: (r: Invoice) => `${r.id}/${i + 1}`,
}));

/** Twenty columns in a phone-sized box: horizontal scroll inside the box, header sticky. */
export const TwentyColumns: Story = {
  tags: ['visual'],
  parameters: NO_CONTROLS,
  render: () => (
    <div style={PAGE}>
      <div style={{ width: 360, maxWidth: '100%' }}>
        <TableDemo rows={INVOICES.slice(0, 12)} columns={MANY} maxHeight={240} />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const scroller = within(canvasElement).getByTestId('scroller');
    await expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth * 3);
    const cols = within(canvasElement).getAllByRole('columnheader');
    await expect(cols).toHaveLength(20);
  },
};

/** `dir="rtl"`: start and end swap, the ellipsis and the sort arrow follow. */
export const Rtl: Story = {
  parameters: NO_CONTROLS,
  render: () => (
    <div style={PAGE}>
      <TableDemo rows={INVOICES.slice(0, 6)} columns={columns()} dir="rtl" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const th = canvas.getByRole('columnheader', { name: 'Importo' });
    await expect(getComputedStyle(th).textAlign).toBe('end');
    const scroller = canvas.getByTestId('scroller');
    // End in rtl is the left edge: the amount cell is to the left of the customer cell.
    const cells = within(canvas.getAllByRole('row')[1]!).getAllByRole('cell');
    await expect(cells[3]!.getBoundingClientRect().left).toBeLessThan(cells[1]!.getBoundingClientRect().left);
    await expect(getComputedStyle(scroller).direction).toBe('rtl');
  },
};
