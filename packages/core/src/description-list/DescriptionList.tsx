import { createContext, forwardRef, useContext, useMemo, type HTMLAttributes, type ReactNode } from 'react';
import { hasContent } from '../internal/react-nodes';
import { cn } from '../utils/cn';
import { DETAILS, ITEM, LAYOUT_CLASS, LIST_BASE, ROOT, TERM } from './description-list-styles';

export type DescriptionListLayout = 'auto' | 'inline' | 'stacked';

const DEFAULT_EMPTY_LABEL = 'Not specified';
const DEFAULT_EMPTY_PLACEHOLDER = '—';

// Bundlers replace `process.env.NODE_ENV` in consumer builds; without `process` assume development.
const isDev = (): boolean => {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return true;
  }
};

interface DescriptionListContextValue {
  emptyLabel: string;
  emptyPlaceholder: ReactNode;
}

const DescriptionListContext = createContext<DescriptionListContextValue | null>(null);

export interface DescriptionListProps extends HTMLAttributes<HTMLDListElement> {
  /**
   * `inline`: value to the side of the label, in one shared column. `stacked`: value under the
   * label. `auto` (default): decided by a CSS container query on the width of the list's own
   * container, not of the window: inline from `--container-rop-description-list` (24rem) up,
   * stacked below it (a container exactly at the threshold is inline; the query is a plain
   * `min-width`, so there is no flicker around it). No JavaScript measures anything and there is
   * no transition: the switch is instantaneous.
   */
  layout?: DescriptionListLayout;
  /** Visually hidden text read in place of an empty value. Default (English): "Not specified". */
  emptyLabel?: string;
  /** Visible stand-in for an empty value (hidden from assistive technology). Default `—`. */
  emptyPlaceholder?: ReactNode;
}

/**
 * Read-only key/value pairs: a semantic `<dl>` of `DescriptionListItem`s. `className` and `ref`
 * go to the `<dl>`; the element wrapping it (the size container) is an implementation detail.
 * Empty values (`null`, `undefined`, `false`, `''`, an empty fragment or array) show a
 * placeholder; `0` and `NaN` are values.
 */
export const DescriptionList = /* @__PURE__ */ forwardRef<HTMLDListElement, DescriptionListProps>(
  function DescriptionList(
    {
      layout = 'auto',
      emptyLabel = DEFAULT_EMPTY_LABEL,
      emptyPlaceholder = DEFAULT_EMPTY_PLACEHOLDER,
      className,
      ...rest
    },
    ref,
  ) {
    const context = useMemo(() => ({ emptyLabel, emptyPlaceholder }), [emptyLabel, emptyPlaceholder]);
    return (
      <DescriptionListContext.Provider value={context}>
        <div className={ROOT}>
          <dl {...rest} ref={ref} className={cn(LIST_BASE, LAYOUT_CLASS[layout], className)} />
        </div>
      </DescriptionListContext.Provider>
    );
  },
);

export interface DescriptionListItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The term (`<dt>`). A string or a node (e.g. with an icon). */
  label: ReactNode;
  /** The value (`<dd>`): any node. Empty values render the list's placeholder. */
  children?: ReactNode;
  /** Overrides the list's `emptyLabel` for this item. */
  emptyLabel?: string;
}

/** One term/value pair. Must be a child of `DescriptionList` (throws in development otherwise). */
export const DescriptionListItem = /* @__PURE__ */ forwardRef<HTMLDivElement, DescriptionListItemProps>(
  function DescriptionListItem({ label, children, emptyLabel, className, ...rest }, ref) {
    const context = useContext(DescriptionListContext);
    if (!context && isDev()) {
      throw new Error('[react-object-page] <DescriptionListItem> must be rendered inside a <DescriptionList>.');
    }
    const filled = hasContent(children);
    return (
      <div {...rest} ref={ref} className={cn(ITEM, className)}>
        <dt className={TERM}>{label}</dt>
        <dd className={DETAILS}>
          {filled ? (
            children
          ) : (
            <>
              <span aria-hidden="true">{context?.emptyPlaceholder ?? DEFAULT_EMPTY_PLACEHOLDER}</span>
              <span className="sr-only">{emptyLabel ?? context?.emptyLabel ?? DEFAULT_EMPTY_LABEL}</span>
            </>
          )}
        </dd>
      </div>
    );
  },
);
