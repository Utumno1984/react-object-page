import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { Title, type TitleLevel } from '../typography/Title';
import { cn } from '../utils/cn';
import { ListReportFilterBar } from './ListReportFilterBar';
import { ListReportTable, type ListReportTableStatus } from './ListReportTable';
import type { ListReportTableLabels } from './ListReportTableStates';
import {
  actionsClass,
  countClass,
  countHiddenClass,
  filterBarClass,
  headerClass,
  rootClass,
  tableClass,
  titleClass,
} from './list-report-styles';
import type { UseListReportReturn } from './types';

/** Texts of `ListReport`: those of `ListReportTable` plus the count in the header (Italian defaults). */
export interface ListReportLabels extends ListReportTableLabels {
  /** The count next to the title. Default: `(n)`, and `(n di m)` when a pill or the search hide some of the rows. */
  count: (resultCount: number, totalCount: number) => string;
}

const DEFAULT_COUNT = (resultCount: number, totalCount: number): string =>
  resultCount === totalCount ? `(${resultCount})` : `(${resultCount} di ${totalCount})`;

export type ListReportProps<Row> = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> & {
  /** Heading of the report. Its text (and only its text) is the accessible name of the table. */
  title: ReactNode;
  /** Heading level of the title. Default 2 (the page's own `h1` sits above the report). */
  titleLevel?: TitleLevel;
  /** What `useListReport` returned. */
  table: UseListReportReturn<Row>;
  /** Buttons next to the title (below it on a narrow screen). */
  actions?: ReactNode;
  /** Passed to `ListReportTable` as is. */
  status?: ListReportTableStatus;
  /** Passed to `ListReportTable` as is. */
  errorMessage?: ReactNode;
  /** Passed to `ListReportTable` as is. */
  onRetry?: () => void;
  /**
   * The "clear filters" button of the "no results" state. Default: `table.clearFilters()` and the
   * focus on the search box (or, without one, on the first pill). Passing it replaces that default.
   */
  onClearFilters?: () => void;
  /** Passed to `ListReportTable` as is. */
  loadingRowCount?: number;
  /** Texts of the table (passed as is) and of the count. */
  labels?: Partial<ListReportLabels>;
  /** Accessible name of the group of pills (see `ListReportFilterBar`). */
  filtersLabel?: string;
  /** Accessible name of the search box (see `ListReportFilterBar`). */
  searchLabel?: string;
  /** Renders the search box. Default `true`. Without it and without `filters` there is no bar at all. */
  showSearch?: boolean;
};

function ListReportImpl<Row>(props: ListReportProps<Row>, ref: Ref<HTMLDivElement>) {
  const {
    title,
    titleLevel = 2,
    table,
    actions,
    status,
    errorMessage,
    onRetry,
    onClearFilters,
    loadingRowCount,
    labels,
    filtersLabel,
    searchLabel,
    showSearch = true,
    className,
    ...rest
  } = props;
  const nameId = `${useId()}-name`;
  const barRef = useRef<HTMLDivElement | null>(null);
  const verifyClear = useRef(false);
  const [, recheck] = useState(0);
  // After "Azzera filtri" has been applied: if there is still nothing to see (the default pill itself leaves
  // no result), go to the unfiltered pill (the first without a predicate, else the first): one more
  // change, only in that case.
  useEffect(() => {
    if (!verifyClear.current) return;
    verifyClear.current = false;
    if (table.resultCount > 0 || table.totalCount === 0) return;
    const open = table.filters.find((f) => f.predicate === undefined) ?? table.filters[0];
    if (open && open.id !== table.filter) table.setFilter(open.id);
  });
  const count = labels?.count ?? DEFAULT_COUNT;

  const showBar = showSearch || table.filters.length > 0;
  // The count is hidden (not removed) while there is nothing true to say: no rows yet, or an error.
  const countShown = status !== 'error' && !(status === 'loading' && table.totalCount === 0);

  // The button that was clicked leaves with the state: the focus goes to the search box (the first pill
  // when there is none), where the user goes on filtering, never to the body.
  const clearFilters = () => {
    table.clearFilters();
    // `clearFilters` goes back to the *default* pill: when that one leaves no result the button would be
    // dead. The check runs after the render that follows (the forced one covers a no-op `clearFilters`).
    verifyClear.current = true;
    recheck((n) => n + 1);
    // Only the bar is searched (an `actions` slot may hold its own inputs).
    const bar = barRef.current;
    const target = bar?.querySelector<HTMLElement>('input[type="search"]') ?? bar?.querySelector<HTMLElement>('[role="radio"]');
    target?.focus();
  };

  return (
    <div {...rest} ref={ref} className={cn(rootClass, className)}>
      <div className={headerClass}>
        <Title level={titleLevel} className={titleClass}>
          <span id={nameId}>{title}</span>{' '}
          <span className={cn(countClass, !countShown && countHiddenClass)}>{count(table.resultCount, table.totalCount)}</span>
        </Title>
        {actions ? <div className={actionsClass}>{actions}</div> : null}
      </div>
      {showBar ? (
        <ListReportFilterBar
          ref={barRef}
          table={table}
          filtersLabel={filtersLabel}
          searchLabel={searchLabel}
          showSearch={showSearch}
          className={filterBarClass}
        />
      ) : null}
      <ListReportTable
        table={table}
        aria-labelledby={nameId}
        className={tableClass}
        status={status}
        errorMessage={errorMessage}
        onRetry={onRetry}
        onClearFilters={onClearFilters ?? clearFilters}
        loadingRowCount={loadingRowCount}
        labels={labels}
      />
    </div>
  );
}

/**
 * The List Report floorplan (simple version): title with the result count, an actions slot, the bar of
 * pills and search and the table in one flex column that fills its parent, with a **single scroller**
 * (the table's container: title, actions and the bar stay put, the table header sticks to its top).
 *
 * - Give it a parent with a height (`height`, or a flex/grid cell with `min-height: 0`) and only the
 *   table scrolls. In the normal flow of the document (no height) it does not collapse: the table grows
 *   with its rows and the page scrolls. Either way there is one scroller.
 * - The table is named by the title text (`aria-labelledby`, no duplicated text; a title with an icon
 *   still names it by its text). The count `(n)` / `(n di m)` is part of the heading and **not** a live
 *   region. The only live region is the table's: it announces its changes of state (loading, empty, no
 *   results, error, data back), not a change of the number of results while the data stays on screen.
 * - "Azzera filtri" works without wiring (`table.clearFilters()`; when the default pill itself leaves no
 *   result it then goes to the unfiltered pill), then the focus goes to the search box or the first pill of the bar.
 * - The count is part of the heading's name ("Fatture (12 di 40)"); the table's name stays "Fatture".
 * - `status`, `errorMessage`, `onRetry`, `loadingRowCount` and `labels` reach `ListReportTable` unchanged;
 *   `filtersLabel`, `searchLabel` and `showSearch` reach `ListReportFilterBar`. The other props go on the root.
 *
 * The parts stay exported (`ListReportFilterBar`, `ListReportTable`) for other layouts.
 */
export const ListReport = /* @__PURE__ */ forwardRef(ListReportImpl) as <Row>(
  props: ListReportProps<Row> & { ref?: Ref<HTMLDivElement> },
) => ReactElement | null;
