// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useListReport } from './use-list-report';

interface Row {
  id: string;
  amount: number | null;
}
const ROWS: Row[] = [
  { id: 'a', amount: 10 },
  { id: 'b', amount: 2 },
  { id: 'c', amount: null },
];

function Demo() {
  const report = useListReport<Row>({
    rows: ROWS,
    columns: [{ id: 'amount', header: 'Amount', accessor: (r) => r.amount }],
    getRowId: (r) => r.id,
    defaultSort: { columnId: 'amount', direction: 'asc' },
  });
  return (
    <table>
      <thead>
        <tr>
          <th {...report.getHeaderProps('amount')}>
            <button {...report.getSortButtonProps('amount')}>Amount</button>
          </th>
        </tr>
      </thead>
      <tbody>
        {report.rows.map((r) => (
          <tr key={r.id}>
            <td>{String(r.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

describe('useListReport on the server (node environment, no DOM globals)', () => {
  it('renders sorted rows without errors and without a `document`', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const html = renderToString(<Demo />);
    expect(html).toContain('aria-sort="ascending"');
    expect(html).toContain('type="button"');
    expect(html.indexOf('<td>2</td>')).toBeLessThan(html.indexOf('<td>10</td>'));
    expect(html.indexOf('<td>10</td>')).toBeLessThan(html.indexOf('<td>null</td>'));
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
