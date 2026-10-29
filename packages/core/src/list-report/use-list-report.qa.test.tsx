import { StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ListReportColumn, UseListReportOptions } from './types';
import { useListReport } from './use-list-report';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

interface Row {
  id: string;
  name: string;
  amount: number | null;
}
const ROWS: Row[] = [
  { id: 'a', name: 'Rossi', amount: 1250.5 },
  { id: 'b', name: 'Bianchi', amount: 3 },
];
const COLUMNS: ListReportColumn<Row>[] = [
  { id: 'name', header: 'N', accessor: (r) => r.name },
  { id: 'amount', header: 'A', accessor: (r) => r.amount },
];
const base = { rows: ROWS, columns: COLUMNS, getRowId: (r: Row) => r.id };
const setup = (o: Partial<UseListReportOptions<Row>> = {}, strict = false) =>
  renderHook(() => useListReport<Row>({ ...base, ...o }), strict ? { wrapper: StrictMode } : undefined);

describe('QA useListReport search', () => {
  it('StrictMode: delayed commit still fires exactly once', () => {
    vi.useFakeTimers();
    const onSearchQueryChange = vi.fn();
    const { result } = setup({ onSearchQueryChange }, true);
    act(() => result.current.setSearchDraft('ross'));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearchQueryChange).toHaveBeenCalledTimes(1);
    expect(result.current.searchQuery).toBe('ross');
    expect(result.current.rows.map((r) => r.id)).toEqual(['a']);
  });
  it('defaultSearchQuery initialises committed and draft', () => {
    const { result } = setup({ defaultSearchQuery: 'bianchi' });
    expect(result.current.searchDraft).toBe('bianchi');
    expect(result.current.rows.map((r) => r.id)).toEqual(['b']);
  });
  it('numeric 1250 matches, dot is literal', () => {
    const { result } = setup({ defaultSearchQuery: '1250' });
    expect(result.current.resultCount).toBe(1);
    const r2 = setup({ defaultSearchQuery: '12.0' });
    expect(r2.result.current.resultCount).toBe(0);
  });
  it('controlled parent ignoring the change: committed stays, reports once', () => {
    vi.useFakeTimers();
    const onSearchQueryChange = vi.fn();
    const { result } = setup({ searchQuery: '', onSearchQueryChange });
    act(() => result.current.setSearchDraft('ross'));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSearchQueryChange).toHaveBeenCalledTimes(1);
    expect(result.current.resultCount).toBe(2);
    expect(result.current.searchDraft).toBe('ross');
  });
  it('typing then deleting back to committed before the delay: nothing committed', () => {
    vi.useFakeTimers();
    const onSearchQueryChange = vi.fn();
    const { result } = setup({ onSearchQueryChange });
    act(() => result.current.setSearchDraft('r'));
    act(() => result.current.setSearchDraft(''));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onSearchQueryChange).not.toHaveBeenCalled();
  });
  it('commit then typing in the same batch: later draft wins and is committed later', () => {
    vi.useFakeTimers();
    const onSearchQueryChange = vi.fn();
    const { result } = setup({ onSearchQueryChange });
    act(() => {
      result.current.setSearchDraft('ro');
      result.current.commitSearch();
      result.current.setSearchDraft('ros');
    });
    expect(result.current.searchDraft).toBe('ros');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearchQueryChange.mock.calls.map((c) => c[0])).toEqual(['ro', 'ros']);
    expect(result.current.searchQuery).toBe('ros');
  });
  it('empty filters array: setFilter is a warning no-op, clearFilters does not throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = setup({ filters: [] });
    act(() => result.current.setFilter('x'));
    act(() => result.current.clearFilters());
    expect(warn).toHaveBeenCalled();
    expect(result.current.resultCount).toBe(2);
  });
});
