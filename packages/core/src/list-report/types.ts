import type { ReactNode } from 'react';

export type ListReportSortDirection = 'asc' | 'desc';

/** Single-column sort state. `null` = no sort (the input order). */
export type ListReportSort = { columnId: string; direction: ListReportSortDirection } | null;

export interface ListReportColumn<Row> {
  /** Unique, stable id of the column. */
  id: string;
  header: ReactNode;
  /** Value used for sorting (and, in later tickets, filtering and searching). */
  accessor?: (row: Row) => unknown;
  /** Cell content for the table that consumes the hook; the hook itself never calls it. */
  cell?: (row: Row) => ReactNode;
  /** Default: `true` when the column has an `accessor` or a `compare`. */
  sortable?: boolean;
  /**
   * Replaces the default comparator. The hook applies the direction (it negates the result for
   * `desc`) and keeps the sort stable. Empty values go last only with the default comparator: a
   * custom `compare` receives every row and decides on its own.
   */
  compare?: (a: Row, b: Row) => number;
  /** Direction of the first click on this column. Default: `'asc'`. The cycle is first -> opposite -> none. */
  firstSortDirection?: ListReportSortDirection;
  // Layout fields: only declared here, consumed by the table component.
  align?: 'start' | 'center' | 'end';
  width?: number | string;
  minWidth?: number | string;
  truncate?: boolean;
}

export interface UseListReportOptions<Row> {
  rows: readonly Row[];
  columns: readonly ListReportColumn<Row>[];
  /** Unique, stable id of a row (a duplicate is reported with a development warning). */
  getRowId: (row: Row) => string;
  /** Controlled sort (`null` = none). `undefined` leaves the hook uncontrolled. */
  sort?: ListReportSort;
  defaultSort?: ListReportSort;
  /** Called only for a gesture (`toggleSort`, `setSort`), never when `sort` changes from outside. */
  onSortChange?: (sort: ListReportSort) => void;
  /** Locale of the default string comparator (`Intl.Collator`). Default: the runtime locale. */
  locale?: string | string[];
}

export interface ListReportHeaderProps {
  'aria-sort'?: 'ascending' | 'descending';
}

export interface ListReportSortButtonProps {
  type?: 'button';
  onClick?: () => void;
}

export interface UseListReportReturn<Row> {
  /** The sorted rows (the input array itself when no sort is active; the input is never mutated). */
  rows: readonly Row[];
  columns: readonly ListReportColumn<Row>[];
  /** The effective sort: `null` when the requested column is missing or not sortable. */
  sort: ListReportSort;
  /** Next step of the cycle for a column; no-op for an unknown or non-sortable column. */
  toggleSort: (columnId: string) => void;
  setSort: (sort: ListReportSort) => void;
  /** `aria-sort` only on the sorted column. Spread it on the `<th>`. */
  getHeaderProps: (columnId: string) => ListReportHeaderProps;
  /** `type` and `onClick` for the button inside the header; `{}` for a non-sortable column. */
  getSortButtonProps: (columnId: string) => ListReportSortButtonProps;
}
