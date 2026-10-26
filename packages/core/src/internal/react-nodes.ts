import { Children, isValidElement, type ReactNode } from 'react';

/** True if the node would render something: `null`, booleans, `undefined` and `''` count as empty. */
export function hasContent(node: ReactNode): boolean {
  return Children.toArray(node).some((child) => child !== '');
}

/** Plain text of a React node (strings and numbers, depth first); elements without text give ''. */
export function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}
