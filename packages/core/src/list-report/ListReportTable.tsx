import { forwardRef, useEffect, type CSSProperties, type HTMLAttributes, type ReactElement, type ReactNode, type Ref } from 'react';
import { Icon } from '../icon/Icon';
import { internalIcons } from '../internal/icons';
import { hasContent } from '../internal/react-nodes';
import { TruncatedText } from '../truncated-text/TruncatedText';
import { cn } from '../utils/cn';
import {
  ALIGN_JUSTIFY,
  ALIGN_TEXT,
  bodyCellClass,
  captionClass,
  containerClass,
  headerCellClass,
  nodeWrapperClass,
  sortButtonClass,
  sortIconAscendingClass,
  sortIconClass,
  sortIconIdleClass,
  tableClass,
} from './list-report-table-styles';
import type { ListReportColumn, UseListReportReturn } from './types';

/** The table must have an accessible name: at least one of the three. */
type TableName =
  | { 'aria-label': string; 'aria-labelledby'?: string; caption?: ReactNode }
  | { 'aria-labelledby': string; 'aria-label'?: string; caption?: ReactNode }
  | { caption: ReactNode; 'aria-label'?: string; 'aria-labelledby'?: string };

export type ListReportTableProps<Row> = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label' | 'aria-labelledby'> & {
  /** What `useListReport` returned: the table only renders it. */
  table: UseListReportReturn<Row>;
  /**
   * Maximum height of the scroll container (px or any CSS length). Without it the container takes
   * the height its parent gives it (e.g. a flex child with `min-height: 0`).
   */
  maxHeight?: number | string;
} & TableName;

// Bundlers replace `process.env.NODE_ENV` in consumer builds; without `process` assume development.
const isDev = (): boolean => {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return true;
  }
};

const DEFAULT_MIN_WIDTH = 120;

const toCss = (value: number | string): string => (typeof value === 'number' ? `${value}px` : value.trim());
const isPercent = (value: number | string | undefined): boolean => typeof value === 'string' && value.trim().endsWith('%');

/** The value in px when it is a plain pixel length (`120` or `'120px'`), else `null`. */
function pixels(value: number | string | undefined): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d+(\.\d+)?px$/.test(value.trim())) return Number.parseFloat(value);
  return null;
}

/**
 * `min-width` of the table: the sum of the `width` (or, for columns without one or with a
 * percentage, the `minWidth`) of every column. When every column has a pixel `width` there is no
 * flexible column to absorb extra space, so the table is exactly that wide too: each column keeps
 * the width it declared in a container wider than the sum. Otherwise the table fills the container.
 */
function tableSize<Row>(columns: readonly ListReportColumn<Row>[]): { width: string; minWidth: string } {
  let px = 0;
  const other: string[] = [];
  for (const column of columns) {
    const base = column.width !== undefined && !isPercent(column.width) ? column.width : (column.minWidth ?? DEFAULT_MIN_WIDTH);
    const known = pixels(base);
    if (known === null) other.push(toCss(base));
    else px += known;
  }
  const minWidth = other.length === 0 ? `${px}px` : `calc(${[`${px}px`, ...other].join(' + ')})`;
  const rigid = columns.length > 0 && columns.every((column) => pixels(column.width) !== null);
  return { minWidth, width: rigid ? minWidth : '100%' };
}

type CellValue = { kind: 'empty' } | { kind: 'text'; text: string } | { kind: 'node'; node: ReactNode };

function cellValue<Row>(column: ListReportColumn<Row>, row: Row): CellValue {
  if (column.cell) {
    const content = column.cell(row);
    if (content === null || content === undefined || typeof content === 'boolean') return { kind: 'empty' };
    if (typeof content === 'string' || typeof content === 'number') return { kind: 'text', text: String(content) };
    return { kind: 'node', node: content };
  }
  if (!column.accessor) return { kind: 'empty' };
  const value = column.accessor(row);
  return value === null || value === undefined ? { kind: 'empty' } : { kind: 'text', text: String(value) };
}

function renderCell<Row>(column: ListReportColumn<Row>, row: Row): ReactNode {
  const value = cellValue(column, row);
  if (value.kind === 'empty') return null;
  if (value.kind === 'node') return <div className={nodeWrapperClass}>{value.node}</div>;
  return column.truncate === false ? <div className={nodeWrapperClass}>{value.text}</div> : <TruncatedText>{value.text}</TruncatedText>;
}

function ListReportTableImpl<Row>(props: ListReportTableProps<Row>, ref: Ref<HTMLDivElement>) {
  const { table, maxHeight, caption, className, style, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, ...rest } = props;
  const { columns } = table;

  const named = !!ariaLabel?.trim() || !!ariaLabelledby?.trim() || hasContent(caption);
  useEffect(() => {
    if (!named && isDev()) {
      console.warn('[react-object-page] <ListReportTable> needs an accessible name: pass `aria-label`, `aria-labelledby` or `caption`.');
    }
  }, [named]);

  const size = tableSize(columns);
  const containerStyle: CSSProperties = { ...(maxHeight !== undefined ? { maxHeight } : null), ...style };

  return (
    // A scrollable region must be reachable by keyboard (axe `scrollable-region-focusable`).
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div tabIndex={0} {...rest} ref={ref} className={cn(containerClass, className)} style={containerStyle}>
      <table
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className={tableClass}
        style={{ width: size.width, minWidth: size.minWidth }}
      >
        {hasContent(caption) ? <caption className={captionClass}>{caption}</caption> : null}
        <colgroup>
          {columns.map((column) => (
            <col key={column.id} style={column.width !== undefined ? { width: toCss(column.width) } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => {
              const align = column.align ?? 'start';
              const sortable = table.getSortButtonProps(column.id).onClick !== undefined;
              const sorted = table.sort?.columnId === column.id ? table.sort.direction : null;
              return (
                <th
                  key={column.id}
                  scope="col"
                  {...table.getHeaderProps(column.id)}
                  className={cn(headerCellClass, ALIGN_TEXT[align])}
                >
                  {sortable ? (
                    <button {...table.getSortButtonProps(column.id)} className={cn(sortButtonClass, ALIGN_JUSTIFY[align])}>
                      <TruncatedText>{column.header}</TruncatedText>
                      <Icon size="xs" className={cn(sortIconClass, sorted === null && sortIconIdleClass, sorted === 'asc' && sortIconAscendingClass)}>
                        {internalIcons['chevron-down']}
                      </Icon>
                    </button>
                  ) : (
                    <TruncatedText>{column.header}</TruncatedText>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={table.getRowId(row)}>
              {columns.map((column) => (
                <td key={column.id} className={cn(bodyCellClass, ALIGN_TEXT[column.align ?? 'start'])}>
                  {renderCell(column, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The List Report table: a native `<table>` that renders the state of `useListReport`.
 *
 * - Widths are declared (`<colgroup>` + `table-layout: fixed`): a long cell never widens its
 *   column. The table has a `min-width` (sum of `width`/`minWidth`, default `minWidth` 120px) and
 *   scrolls inside its own container; the page does not overflow.
 * - Sortable headers are buttons inside `<th aria-sort>`; the sort logic stays in the hook.
 * - Text cells (a string/number from `cell`, or `String(accessor(row))`) are truncated with
 *   `TruncatedText` unless the column sets `truncate: false`. A `cell` that returns a React node is
 *   placed in a `min-width: 0; overflow: hidden` wrapper; its layout (and its height) is the
 *   consumer's responsibility. `null`/`undefined` give an empty cell.
 * - One scroller: the container (`forwardRef`) scrolls both ways and the header sticks to its top.
 *   Size it with the parent (flex) or with `maxHeight`. It is a tab stop so the keyboard can scroll.
 * - Every row has the height of `--rop-list-report-row-height`.
 *
 * An accessible name is required: `aria-label`, `aria-labelledby` or a (visually hidden) `caption`.
 */
export const ListReportTable = /* @__PURE__ */ forwardRef(ListReportTableImpl) as <Row>(
  props: ListReportTableProps<Row> & { ref?: Ref<HTMLDivElement> },
) => ReactElement | null;
