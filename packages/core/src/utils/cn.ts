import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import tokensCss from '../styles/tokens.css?raw';
import { parseTokenScale } from './token-scale';

export type { ClassValue };

type Merge = (classes: string) => string;
let twMerge: Merge | undefined;

// Created on first use, not at module load: a top-level call would be a side effect that keeps
// tailwind-merge in the bundle of consumers that import only other exports (e.g. composeRefs).
function getMerge(): Merge {
  if (twMerge) return twMerge;
  const scale = parseTokenScale(tokensCss);
  // Groups are derived from tokens.css: a new token is known to the merge with no further edit.
  twMerge = extendTailwindMerge({
    extend: {
      theme: {
        color: scale.color,
        text: scale.text,
        font: scale.font,
        radius: scale.radius,
      },
      classGroups: {
        // The default z-index group is called `z` in tailwind-merge: extend it, don't add another.
        z: [{ z: scale['z-index'] }],
      },
    },
  });
  return twMerge;
}

/**
 * Joins class names (clsx syntax) and resolves conflicting Tailwind utilities, the last one
 * winning. Aware of the library tokens: two z-index tokens conflict, while a token font size
 * and a token text color do not.
 */
export function cn(...inputs: ClassValue[]): string {
  return getMerge()(clsx(inputs));
}
