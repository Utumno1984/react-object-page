// Full literals (Tailwind scan). One rule for every value, whatever its type (string, link, mono
// text, button, multi-line node): `dd` never branches on what it holds.

/**
 * Root: the size container. `container-type: inline-size` must sit on an ANCESTOR of the elements
 * that change layout (an element cannot query itself), so the `<dl>` grid lives one level down.
 * `w-full` keeps it from collapsing to 0 as a flex item or in an auto table cell (inline-size
 * containment gives it no intrinsic width); `min-w-0` lets it shrink in a flex row.
 */
export const ROOT = '@container block w-full min-w-0 max-w-full';

// Label column: as wide as the longest label, at most 40% of the list; values take the rest.
const INLINE_COLUMNS = 'grid-cols-[fit-content(40%)_minmax(0,1fr)]';
const STACKED_COLUMNS = 'grid-cols-[minmax(0,1fr)]';

export const LIST_BASE = 'm-0 grid gap-x-4 gap-y-3 p-0';

export const LAYOUT_CLASS = {
  inline: INLINE_COLUMNS,
  stacked: STACKED_COLUMNS,
  // Below the `--container-rop-description-list` threshold: stacked; at or above it: inline.
  auto: `${STACKED_COLUMNS} @rop-description-list:${INLINE_COLUMNS}`,
} as const;

/**
 * Item: spans the whole row and shares the list's column tracks (subgrid), so every value starts
 * on the same vertical line. In a single column the `dt` and the `dd` simply stack.
 */
export const ITEM = 'col-span-full grid grid-cols-subgrid items-start gap-y-0.5';

const TEXT = 'm-0 min-w-0 p-0 font-rop-sans text-rop-body text-start [overflow-wrap:anywhere]';
export const TERM = `${TEXT} text-rop-text-muted`;
export const DETAILS = `${TEXT} text-rop-text`;
