// Class names of the Object Page layout, kept apart from its logic. Full literals on purpose, and no
// bare utility name in a comment (the CSS build scans the sources, comments included).

// A flex column that takes the height of its parent: the parent's when it has one, the content's when
// it does not (the document then scrolls: still one scroller). The zero minimum height lets the scroll
// area shrink and scroll instead of pushing the footer slot out.
export const rootClass = 'flex h-full min-h-0 min-w-0 max-w-full flex-col font-rop-sans text-rop-body text-rop-text';

// The one scroller: header and sections scroll together inside it. A single-column grid with a zero
// minimum column width: a wide child scrolls inside its own section, never widens the page.
export const scrollerClass =
  'grid min-h-0 flex-1 grid-cols-1 content-start gap-6 overflow-y-auto overflow-x-hidden px-4 pt-4 sm:px-6 ' +
  'focus-visible:[outline:2px_solid_var(--color-rop-primary)] focus-visible:[outline-offset:-2px]';

// Room below the last section: the virtual keyboard's height (published by Field) plus a margin, so the
// last field can be scrolled above the keyboard.
export const scrollerStyle = { paddingBottom: 'calc(var(--rop-keyboard-inset, 0px) + 1rem)' } as const;

// Where the footer goes. Never inside the scroller; empty (zero height) until a footer is mounted.
export const footerSlotClass = 'shrink-0';

// Title (and status) above, actions below on a narrow screen; side by side from 640px.
export const headerClass = 'flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4';
export const headerIdentityClass = 'flex min-w-0 flex-col gap-1';
export const headerTitleRowClass = 'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1';
// A very long title wraps; it is never truncated (it is the identity of the object).
export const headerTitleClass = 'min-w-0 [overflow-wrap:anywhere]';
export const headerSubtitleClass = 'min-w-0 text-rop-text-muted [overflow-wrap:anywhere]';
export const headerActionsClass = 'flex min-w-0 flex-wrap items-center gap-2';

// Sections stop below whatever the Anchor Bar will pin at the top (it sets the variable).
export const sectionClass = 'flex min-w-0 flex-col gap-3';
export const sectionStyle = { scrollMarginTop: 'var(--rop-object-page-sticky-offset, 0px)' } as const;
export const sectionTitleClass = 'min-w-0 [overflow-wrap:anywhere]';
// A wide child (a table) scrolls inside the section body, not the page. An overflow container clips on
// every side, so it gets 4px of padding (cancelled by the negative margin): the focus indicator, drawn
// up to 4px outside a control that fills the body, must not be cut.
export const sectionBodyClass = 'min-w-0 -m-1 overflow-x-auto p-1';
