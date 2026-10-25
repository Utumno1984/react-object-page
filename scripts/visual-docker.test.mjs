import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DOCKER_MISSING_MESSAGE,
  buildDockerArgs,
  installedPlaywrightVersion,
  playwrightImage,
} from './visual-docker.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('playwrightImage', () => {
  it('derives the official image tag from an exact version', () => {
    expect(playwrightImage('1.64.1')).toBe('mcr.microsoft.com/playwright:v1.64.1-noble');
  });
  it('rejects ranges', () => {
    expect(() => playwrightImage('^1.64.1')).toThrow(/exact/);
  });
});

describe('image pin stays aligned', () => {
  const version = installedPlaywrightVersion();
  it('package.json pins @playwright/test exactly to the installed version', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.devDependencies['@playwright/test']).toBe(version);
  });
  it('ci.yml visual job uses the same image', () => {
    expect(read('.github/workflows/ci.yml')).toContain(`image: ${playwrightImage(version)}`);
  });
});

describe('buildDockerArgs', () => {
  const base = { image: 'img:1', cwd: '/repo', uid: 1000, gid: 1000 };
  it('compares only (no update flag) by default', () => {
    const args = buildDockerArgs({ ...base, update: false });
    expect(args).toContain('--project=visual-*');
    expect(args.join(' ')).not.toContain('--update-snapshots');
    expect(args).toContain('img:1');
    expect(args).toContain('/repo:/work');
  });
  it('passes the update flag only when requested', () => {
    expect(buildDockerArgs({ ...base, update: true })).toContain('--update-snapshots=changed');
  });
});

describe('Docker missing', () => {
  it('has an explicit, actionable message', () => {
    expect(DOCKER_MISSING_MESSAGE).toMatch(/Docker is required/);
    expect(DOCKER_MISSING_MESSAGE).toMatch(/Nothing was generated/);
  });
});
