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
  /** Sortable only with an `accessor` or a `compare`; `false` opts out. */
  sortable?: boolean;
  /**
   * Replaces the default comparator. The hook applies the direction (it negates the result for
   * `desc`) and keeps the sort stable. Empty values go last only with the default comparator: a
   * custom `compare` receives every row and decides on its own.
   */
  compare?: (a: Row, b: Row) => number;
  /**
   * Included in the text search when `accessor` returns a string or a number (default: yes);
   * `false` opts out. Numbers are searched as `String(value)`: no localized formatting.
   */
  searchable?: boolean;
  /** Direction of the first click on this column. Default: `'asc'`. The cycle is first -> opposite -> none. */
  firstSortDirection?: ListReportSortDirection;
  // Layout fields: only declared here, consumed by the table component.
  align?: 'start' | 'center' | 'end';
  width?: number | string;
  minWidth?: number | string;
  truncate?: boolean;
}

/** One single-choice filter pill. Without `predicate` it keeps every row (e.g. "All"). */
export interface ListReportFilter<Row> {
  id: string;
  label: string;
  predicate?: (row: Row) => boolean;
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
  /** Single-choice filters. The active one defaults to `defaultFilter`, else the first. */
  filters?: readonly ListReportFilter<Row>[];
  /** Controlled filter id. `undefined` leaves the hook uncontrolled. */
  filter?: string;
  defaultFilter?: string;
  /** Called only for a gesture (`setFilter`, `clearFilters`), never when `filter` changes from outside. */
  onFilterChange?: (filter: string) => void;
  /** Controlled committed search query. `undefined` leaves the hook uncontrolled. */
  searchQuery?: string;
  defaultSearchQuery?: string;
  /** Called only when the query is committed by the hook (`commitSearch`, the delay, `clearFilters`). */
  onSearchQueryChange?: (query: string) => void;
  /**
   * Milliseconds after the last `setSearchDraft` before the draft is committed. Default 300;
   * `null` = only `commitSearch()` commits. A change applies from the next draft edit.
   */
  searchCommitDelay?: number | null;
  /** Replaces the per-column search text of a row (`searchable` and `accessor` are then ignored). */
  getSearchText?: (row: Row) => string;
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
  /** The `getRowId` option, handed back so a table can key its rows. */
  getRowId: (row: Row) => string;
  /** The effective sort: `null` when the requested column is missing or not sortable. */
  sort: ListReportSort;
  /** Next step of the cycle for a column; no-op for an unknown or non-sortable column. */
  toggleSort: (columnId: string) => void;
  setSort: (sort: ListReportSort) => void;
  /** `aria-sort` only on the sorted column. Spread it on the `<th>`. */
  getHeaderProps: (columnId: string) => ListReportHeaderProps;
  /** `type` and `onClick` for the button inside the header; `{}` for a non-sortable column. */
  getSortButtonProps: (columnId: string) => ListReportSortButtonProps;
  filters: readonly ListReportFilter<Row>[];
  /** Id of the active filter (`null` when there are no filters). Unknown ids apply no filter. */
  filter: string | null;
  /** No-op for the active filter or an unknown id. */
  setFilter: (filter: string) => void;
  /** The committed query, the one the rows are filtered with. */
  searchQuery: string;
  /** What the user typed; it never goes back on its own while it differs from the committed query. */
  searchDraft: string;
  setSearchDraft: (draft: string) => void;
  /** Commits the draft now and cancels the pending timer. No-op when equal to the committed query. */
  commitSearch: () => void;
  /** Back to the default filter and an empty search; notifies only the values that actually change. */
  clearFilters: () => void;
  /** Rows in input. */
  totalCount: number;
  /** Rows after filter and search (the length of `rows`). */
  resultCount: number;
}
