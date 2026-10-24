import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };

/** Collects every relative file path declared in main/module/types/exports of a package.json. */
export function collectDeclaredPaths(pkg: { [key: string]: unknown }): string[] {
  const paths = new Set<string>();
  const visit = (value: Json | undefined): void => {
    if (typeof value === 'string') {
      if (value.startsWith('./')) paths.add(value);
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(visit);
    }
  };
  for (const field of ['main', 'module', 'types', 'typings', 'exports']) {
    visit(pkg[field] as Json | undefined);
  }
  return [...paths];
}

/** Returns the declared paths that do not exist on disk, relative to `packageDir`. */
export function findMissingPaths(pkg: { [key: string]: unknown }, packageDir: string): string[] {
  return collectDeclaredPaths(pkg).filter((p) => !existsSync(resolve(packageDir, p)));
}
