/** Lower-cases and strips diacritics: "Città" and "CITTA" compare equal. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Default `useCombobox` filter: case- and diacritics-insensitive substring match on
 * `itemToString`. An empty `inputValue` keeps every item. Pure and DOM-free.
 */
export function defaultComboboxFilter<T>(
  items: readonly T[],
  inputValue: string,
  itemToString: (item: T) => string,
): T[] {
  const needle = normalize(inputValue);
  if (needle === '') return [...items];
  return items.filter((item) => normalize(itemToString(item)).includes(needle));
}
