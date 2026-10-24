import { describe, expect, it } from 'vitest';
import { evaluateChangesetGate, parseNameStatus } from './check-changeset.mjs';

describe('evaluateChangesetGate', () => {
  it('fails when a package file changes without a changeset, with actionable guidance', () => {
    const r = evaluateChangesetGate(['packages/core/src/index.ts']);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('npx changeset');
    expect(r.message).toContain('npx changeset --empty');
    expect(r.message).toContain('packages/core/src/index.ts');
  });

  it('passes when a package file changes together with an added changeset', () => {
    const r = evaluateChangesetGate(['packages/core/src/index.ts', '.changeset/brave-lions-run.md']);
    expect(r.ok).toBe(true);
  });

  it('passes for docs/.github/scripts-only changes without changeset', () => {
    expect(
      evaluateChangesetGate(['docs/a.md', '.github/workflows/ci.yml', 'scripts/x.mjs', 'README.md']).ok,
    ).toBe(true);
  });

  it('passes for an empty diff', () => {
    expect(evaluateChangesetGate([]).ok).toBe(true);
  });

  it('requires a changeset for a deleted package file', () => {
    expect(evaluateChangesetGate([{ status: 'D', path: 'packages/core/src/old.ts' }]).ok).toBe(false);
  });

  it('requires a changeset for a rename (old and new paths both listed)', () => {
    const files = parseNameStatus('D\0packages/core/src/a.ts\0A\0packages/core/src/b.ts\0');
    expect(files).toHaveLength(2);
    expect(evaluateChangesetGate(files).ok).toBe(false);
  });

  it('requires a changeset for a rename moving a file out of packages/*', () => {
    const files = parseNameStatus('D\0packages/core/src/a.ts\0A\0docs/a.ts\0');
    expect(evaluateChangesetGate(files).ok).toBe(false);
  });

  it('requires a changeset for test-only changes under packages/*', () => {
    const r = evaluateChangesetGate(['packages/core/test/compose-refs.test.tsx']);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('test-only');
  });

  it('does not count .changeset/README.md or non-markdown files as a changeset', () => {
    expect(evaluateChangesetGate(['packages/core/a.ts', '.changeset/README.md']).ok).toBe(false);
    expect(evaluateChangesetGate(['packages/core/a.ts', '.changeset/config.json']).ok).toBe(false);
  });

  it('does not count a deleted changeset', () => {
    const files = [
      { status: 'M', path: 'packages/core/a.ts' },
      { status: 'D', path: '.changeset/old.md' },
    ];
    expect(evaluateChangesetGate(files).ok).toBe(false);
  });

  it('is decided only from the given diff: a changeset already on main is not in the list', () => {
    // The CLI diffs merge-base..HEAD, so a pre-existing .changeset/initial-core-scaffold.md is absent.
    expect(evaluateChangesetGate(['packages/core/src/new.ts']).ok).toBe(false);
  });
});
