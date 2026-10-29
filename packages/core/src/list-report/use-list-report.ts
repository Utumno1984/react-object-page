import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compareKeys, createCollator, toSortKey } from './compare';
import type {
  ListReportColumn,
  ListReportHeaderProps,
  ListReportSort,
  ListReportSortButtonProps,
  ListReportSortDirection,
  UseListReportOptions,
  UseListReportReturn,
} from './types';

// Bundlers replace `process.env.NODE_ENV` in consumer builds; without `process` assume development.
const isDev = (): boolean => {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return true;
  }
};

const isSortable = <Row,>(column: ListReportColumn<Row>): boolean =>
  column.sortable !== false && (column.accessor !== undefined || column.compare !== undefined);

const opposite = (direction: ListReportSortDirection): ListReportSortDirection =>
  direction === 'asc' ? 'desc' : 'asc';

/**
 * Headless List Report engine (columns + single-column sort). No DOM, no style.
 *
 * - Click cycle: `firstSortDirection` (default `'asc'`) -> the opposite -> no sort.
 * - Default comparator: numbers numerically, strings with `Intl.Collator` (numeric, case and
 *   diacritics insensitive), dates by time, booleans `false < true`, mixed types as `String(...)`.
 *   `null`, `undefined`, `''`, `NaN` and invalid dates always go last, in both directions. A
 *   custom `compare` replaces it and does not get that guarantee.
 *   The mixed-type fallback is not a total order (it is not transitive across types): do not rely
 *   on a specific order for columns that mix types.
 * - Memoize `columns` (e.g. `useMemo` or a module constant): a new array each render defeats the
 *   memoization of the handlers and the sorted rows.
 * - An uncontrolled `defaultSort`/`setSort` on a column that is not there yet stays pending until the
 *   column appears (it warns in development if `columns` is not empty); it resets to no sort only if
 *   a column that was active is removed. A `sortable: true` column with neither `accessor` nor
 *   `compare` is treated as not sortable.
 * - The sort is stable and never mutates `rows`.
 * - `onSortChange` is called only for a gesture (`toggleSort`/`setSort`), never when a controlled
 *   `sort` changes from outside.
 */
export function useListReport<Row>(options: UseListReportOptions<Row>): UseListReportReturn<Row> {
  const { rows, columns, getRowId, sort: controlledSort, defaultSort, onSortChange, locale } = options;
  const controlled = controlledSort !== undefined;

  const [internalSort, setInternalSort] = useState<ListReportSort>(defaultSort ?? null);
  // Id of the uncontrolled sort column once it has actually been present and sortable.
  const [seenColumnId, setSeenColumnId] = useState<string | null>(null);
  const requested = controlled ? controlledSort : internalSort;

  const activeColumn = useMemo(() => {
    if (!requested) return undefined;
    const column = columns.find((c) => c.id === requested.columnId);
    return column && isSortable(column) ? column : undefined;
  }, [columns, requested]);
  const sort: ListReportSort = requested && activeColumn ? requested : null;

  // Uncontrolled: a sort whose column has not appeared yet (e.g. columns loaded asynchronously) stays
  // pending. Once the column was active and then goes away (or stops being sortable) the state goes
  // back to "no sort" instead of resurrecting if the column comes back.
  if (!controlled && internalSort !== null) {
    if (activeColumn && seenColumnId !== internalSort.columnId) setSeenColumnId(internalSort.columnId);
    else if (!activeColumn && seenColumnId === internalSort.columnId) {
      setInternalSort(null);
      setSeenColumnId(null);
    }
  }

  const direction = sort?.direction;
  const hasActive = activeColumn !== undefined;
  const accessor = activeColumn?.accessor;
  const compare = activeColumn?.compare;
  const collator = useMemo(() => createCollator(locale), [locale]);

  const sortedRows = useMemo<readonly Row[]>(() => {
    if (!direction || !hasActive) return rows;
    const sign = direction === 'asc' ? 1 : -1;
    if (compare) {
      return rows
        .map((row, index) => ({ row, index }))
        .sort((a, b) => compare(a.row, b.row) * sign || a.index - b.index)
        .map((entry) => entry.row);
    }
    const entries = rows.map((row, index) => ({ row, index, key: toSortKey(accessor?.(row)) }));
    const filled = entries.filter((e) => !e.key.empty);
    const empty = entries.filter((e) => e.key.empty);
    filled.sort((a, b) => compareKeys(a.key, b.key, collator) * sign || a.index - b.index);
    return [...filled, ...empty].map((entry) => entry.row);
  }, [rows, direction, hasActive, accessor, compare, collator]);

  // Latest values for the handlers, so their identity does not depend on inline callbacks.
  // Assigned during render (not in an effect) so handlers never see a stale value.
  const latest = useRef({ columns, sort, controlled, onSortChange });
  latest.current = { columns, sort, controlled, onSortChange };

  const setSort = useCallback((next: ListReportSort) => {
    if (!latest.current.controlled) {
      setInternalSort(next);
      // Make a second gesture in the same batch start from this one, before the next render.
      const column = next && latest.current.columns.find((c) => c.id === next.columnId);
      latest.current.sort = column && isSortable(column) ? next : null;
    }
    latest.current.onSortChange?.(next);
  }, []);

  const toggleSort = useCallback(
    (columnId: string) => {
      const { columns: cols, sort: current } = latest.current;
      const column = cols.find((c) => c.id === columnId);
      if (!column || !isSortable(column)) return;
      const first = column.firstSortDirection ?? 'asc';
      let next: ListReportSort;
      if (current?.columnId === columnId && current.direction !== first) next = null;
      else if (current?.columnId === columnId) next = { columnId, direction: opposite(first) };
      else next = { columnId, direction: first };
      setSort(next);
    },
    [setSort],
  );

  const sortColumnId = sort?.columnId;
  const getHeaderProps = useCallback(
    (columnId: string): ListReportHeaderProps => {
      if (sortColumnId !== columnId || !direction) return {};
      return { 'aria-sort': direction === 'asc' ? 'ascending' : 'descending' };
    },
    [sortColumnId, direction],
  );

  const getSortButtonProps = useCallback(
    (columnId: string): ListReportSortButtonProps => {
      const column = columns.find((c) => c.id === columnId);
      if (!column || !isSortable(column)) return {};
      return { type: 'button', onClick: () => toggleSort(columnId) };
    },
    [columns, toggleSort],
  );

  // Development warnings, once per distinct problem.
  const warned = useRef(new Set<string>());
  const invalidId = requested && !activeColumn ? requested.columnId : null;
  useEffect(() => {
    if (!isDev()) return;
    const warnOnce = (key: string, message: string) => {
      if (warned.current.has(key)) return;
      warned.current.add(key);
      console.warn(`[react-object-page] useListReport: ${message}`);
    };
    // No columns yet (asynchronous loading): a pending sort is expected, not a mistake.
    if (invalidId !== null && columns.length > 0) {
      warnOnce(
        `sort:${invalidId}`,
        `the sort points at "${invalidId}", which is missing or not sortable; rows keep the input order.`,
      );
    }
    const columnIds = new Set<string>();
    for (const column of columns) {
      if (column.sortable === true && !column.accessor && !column.compare) {
        warnOnce(
          `nosort:${column.id}`,
          `column "${column.id}" is \`sortable\` but has no \`accessor\` or \`compare\`; it is treated as not sortable.`,
        );
      }
      if (columnIds.has(column.id)) warnOnce(`column:${column.id}`, `duplicate column id "${column.id}".`);
      columnIds.add(column.id);
    }
    const rowIds = new Set<string>();
    for (const row of rows) {
      const id = getRowId(row);
      if (rowIds.has(id)) warnOnce(`row:${id}`, `\`getRowId\` returned the duplicate id "${id}".`);
      rowIds.add(id);
    }
  }, [invalidId, columns, rows, getRowId]);

  return { rows: sortedRows, columns, sort, toggleSort, setSort, getHeaderProps, getSortButtonProps };
}
