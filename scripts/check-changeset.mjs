#!/usr/bin/env node
// Changeset gate: every PR that touches a file under packages/* must add a changeset.
// Pure logic lives in `evaluateChangesetGate` (unit tested); the CLI computes the touched files
// with a merge-base diff (base..HEAD), never from the global repo state.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PACKAGE_RE = /^packages\/[^/]+\//;
const CHANGESET_RE = /^\.changeset\/(?!README\.md$)[^/]+\.md$/;

export const GUIDANCE = [
  'This PR touches files under packages/* but adds no changeset (.changeset/*.md).',
  'Run `npx changeset` and commit the generated file,',
  'or `npx changeset --empty` for a change that must not trigger a release.',
  'Only newly added changesets with a valid `---` frontmatter count (modifying an existing one does not).',
  'The rule is deliberately simple: any change under packages/* (including renames, deletions,',
  'and test-only changes) needs a changeset.',
].join('\n');

/**
 * @param {Array<string | { path: string, status?: string }>} changedFiles files touched by the
 *   PR (merge-base..HEAD). Strings count as added/modified; a status of "D" marks a deletion.
 * @param {(path: string) => string | null} [readContent] returns the content of an added changeset;
 *   when given, the changeset must have a valid `---...---` frontmatter (empty is fine for --empty).
 * @returns {{ ok: boolean, message: string, packageFiles: string[], changesets: string[] }}
 */
export function hasValidFrontmatter(content) {
  return typeof content === 'string' && /^---\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/.test(content);
}

export function evaluateChangesetGate(changedFiles, readContent) {
  const entries = changedFiles.map((f) => (typeof f === 'string' ? { path: f, status: 'A' } : { status: 'A', ...f }));
  const packageFiles = entries.filter((e) => PACKAGE_RE.test(e.path)).map((e) => e.path);
  // Only ADDED changesets count: a modified one already existed on the base branch.
  const changesets = entries
    .filter((e) => CHANGESET_RE.test(e.path) && e.status === 'A')
    .filter((e) => !readContent || hasValidFrontmatter(readContent(e.path)))
    .map((e) => e.path);

  if (packageFiles.length === 0) {
    return { ok: true, message: 'No file under packages/* touched: no changeset required.', packageFiles, changesets };
  }
  if (changesets.length === 0) {
    return {
      ok: false,
      message: `${GUIDANCE}\nTouched files under packages/*:\n${packageFiles.map((p) => `  - ${p}`).join('\n')}`,
      packageFiles,
      changesets,
    };
  }
  return { ok: true, message: `Changeset found: ${changesets.join(', ')}`, packageFiles, changesets };
}

/** Parses `git diff --name-status --no-renames -z` output (renames appear as delete + add). */
export function parseNameStatus(output) {
  const parts = output.split('\0').filter(Boolean);
  const entries = [];
  for (let i = 0; i + 1 < parts.length; i += 2) entries.push({ status: parts[i], path: parts[i + 1] });
  return entries;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

export function collectChangedFiles(baseRef, headRef = 'HEAD') {
  const base = git(['merge-base', baseRef, headRef]).trim();
  return parseNameStatus(git(['diff', '--name-status', '--no-renames', '-z', base, headRef]));
}

export function readAtRef(path, ref = 'HEAD') {
  try {
    return git(['show', `${ref}:${path}`]);
  } catch {
    return null;
  }
}

function main() {
  const baseRef = process.env.BASE_REF || 'origin/main';
  let files;
  try {
    files = collectChangedFiles(baseRef);
  } catch (error) {
    console.error(`Cannot compute the merge-base with ${baseRef} (is the checkout shallow? use fetch-depth: 0).`);
    console.error(String(error.message ?? error));
    process.exit(2);
  }
  const result = evaluateChangesetGate(files, (p) => readAtRef(p));
  if (result.ok) {
    console.log(result.message);
  } else {
    console.error(result.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
