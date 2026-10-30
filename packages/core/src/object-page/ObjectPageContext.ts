import { createContext, useContext, type RefObject } from 'react';
import type { TitleLevel } from '../typography/Title';

// Bundlers replace `process.env.NODE_ENV` in consumer builds; without `process` assume development.
export const isDev = (): boolean => {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return true;
  }
};

/** One entry of the section registry: what an Anchor Bar needs to list and reach a section. */
export interface ObjectPageSectionInfo {
  /** The DOM id of the `<section>`. */
  id: string;
  /** The plain text of the section's title (never the icon or other nodes of it). */
  title: string;
}

/** What a section tells the registry about itself. `element` is what gives the DOM order. */
export interface ObjectPageSectionEntry extends ObjectPageSectionInfo {
  element: HTMLElement;
}

export interface ObjectPageContextValue {
  /** Level of the header's title; the sections' titles are one level below. */
  headingLevel: TitleLevel;
  /** The page's one scroll container (header and sections live inside it). */
  scrollerRef: RefObject<HTMLDivElement | null>;
  /** The slot below the scroller, where the footer will go. `null` until the page has mounted. */
  footerSlot: HTMLDivElement | null;
  /** The registered sections, in DOM order (not in mount order). */
  sections: readonly ObjectPageSectionInfo[];
  /** Registers (or updates) a section. `key` is unique per mounted section. */
  registerSection: (key: string, entry: ObjectPageSectionEntry) => void;
  unregisterSection: (key: string) => void;
}

export const ObjectPageContext = /* @__PURE__ */ createContext<ObjectPageContextValue | null>(null);

/**
 * The page's context. Outside an `ObjectPage` it throws in development (a clear message instead
 * of a missing scroller later) and returns `null` in production, where the caller degrades.
 */
export function useObjectPageContext(consumer: string): ObjectPageContextValue | null {
  const context = useContext(ObjectPageContext);
  if (!context && isDev()) {
    throw new Error(`${consumer} must be rendered inside an <ObjectPage>.`);
  }
  return context;
}

/**
 * The sections of the surrounding `ObjectPage`, in DOM order, as `{ id, title }`. Updated when a
 * section is added, removed, renamed or moved. Internal: the Anchor Bar builds on it.
 */
export function useObjectPageSections(): readonly ObjectPageSectionInfo[] {
  return useObjectPageContext('useObjectPageSections')?.sections ?? [];
}
