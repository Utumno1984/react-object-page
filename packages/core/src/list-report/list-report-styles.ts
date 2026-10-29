// Class names of ListReport, kept apart from its logic. Full literals on purpose, and no bare utility
// name in a comment (the CSS build scans the sources, comments included).

// A flex column that takes the height of its parent: the full height is the parent's when it has one,
// the content height when it does not (the page then scrolls and the layout never collapses to zero).
// The zero minimum height lets the table container shrink and scroll instead of pushing the page.
export const rootClass = 'flex h-full min-h-0 min-w-0 max-w-full flex-col gap-3 font-rop-sans text-rop-body text-rop-text';

// Title above, actions below on a narrow screen; side by side from 640px.
export const headerClass = 'flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4';

export const titleClass = 'min-w-0 [overflow-wrap:anywhere]';

// Invisible (not removed) while there is no count to show: the header keeps the same box.
export const countClass = 'font-normal text-rop-text-muted';
export const countHiddenClass = 'invisible';

export const actionsClass = 'flex min-w-0 flex-wrap items-center gap-2';

export const filterBarClass = 'shrink-0';

// The one scroller: it takes what is left of the column (and, without a bounded parent, the height of
// its rows).
export const tableClass = 'min-h-0 flex-1';
