import { normalizeText } from '../internal/normalize-text';
import type { ListReportColumn } from './types';

/**
 * Splits a committed query into normalized terms: trimmed, split on whitespace, lower-cased and
 * without diacritics. A blank query gives no terms (= no search). Terms are literal text, never a regex.
 */
export function parseSearchTerms(query: string): string[] {
  const trimmed = query.trim();
  return trimmed === '' ? [] : normalizeText(trimmed).split(/\s+/);
}

/** Text of a cell for the search: strings and finite numbers (`String(value)`); anything else is skipped. */
function cellText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

/** Normalized searchable texts of one row. */
export function rowSearchTexts<Row>(
  row: Row,
  columns: readonly ListReportColumn<Row>[],
  getSearchText?: (row: Row) => string,
): string[] {
  if (getSearchText) return [normalizeText(getSearchText(row))];
  const texts: string[] = [];
  for (const column of columns) {
    if (column.searchable === false || !column.accessor) continue;
    const text = cellText(column.accessor(row));
    if (text !== null) texts.push(normalizeText(text));
  }
  return texts;
}

/** Every term must be a substring of the text of at least one searchable column. */
export function matchesSearch<Row>(
  row: Row,
  terms: readonly string[],
  columns: readonly ListReportColumn<Row>[],
  getSearchText?: (row: Row) => string,
): boolean {
  const texts = rowSearchTexts(row, columns, getSearchText);
  return terms.every((term) => texts.some((text) => text.includes(term)));
}
