// Full literals (Tailwind scan). One rule for every value, whatever its type (string, link, mono
// text, button, multi-line node): `dd` never branches on what it holds.

/**
 * Root: the size container. `container-type: inline-size` must sit on an ANCESTOR of the elements
 * that change layout (an element cannot query itself), so the `<dl>` grid lives one level down.
 * Inline-size containment gives the box NO intrinsic width: `w-full` keeps it from collapsing as a
 * flex item (it fills the row), but in a shrink-to-fit parent (auto-width table cell,
 * `inline-block`, `fit-content`) the parent would size it to 0. `min-w-32` (8rem) is the floor
 * that keeps such a list readable (stacked) instead of one character per line; the parent should
 * still be given a real width.
 */
export const ROOT = '@container block w-full min-w-32 max-w-full';

export const LIST_BASE = 'm-0 grid gap-x-4 gap-y-3 p-0';

// Full literals (Tailwind's scan cannot see a class built by concatenation). Inline = label
// column as wide as the longest label, at most 40% of the list, values take the rest.
export const LAYOUT_CLASS = {
  inline: 'grid-cols-[fit-content(40%)_minmax(0,1fr)]',
  stacked: 'grid-cols-[minmax(0,1fr)]',
  // Below the `--container-rop-description-list` threshold: stacked; at or above it: inline.
  auto: 'grid-cols-[minmax(0,1fr)] @rop-description-list:grid-cols-[fit-content(40%)_minmax(0,1fr)]',
} as const;

/**
 * Item: spans the whole row and shares the list's column tracks (subgrid), so every value starts
 * on the same vertical line. In a single column the `dt` and the `dd` simply stack.
 */
export const ITEM = 'col-span-full grid grid-cols-subgrid items-start gap-y-0.5';

// Full literals, no interpolation: a template literal at module level counts as a side effect for
// the bundler and would keep these strings in the bundle of every other import.
export const TERM = 'm-0 min-w-0 p-0 font-rop-sans text-rop-body text-start text-rop-text-muted [overflow-wrap:anywhere]';
export const DETAILS = 'm-0 min-w-0 p-0 font-rop-sans text-rop-body text-start text-rop-text [overflow-wrap:anywhere]';
