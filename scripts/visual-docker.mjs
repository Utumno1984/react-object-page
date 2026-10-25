#!/usr/bin/env node
// Runs the visual-regression suite inside the official Playwright Docker image, so that
// baselines are generated and compared in the SAME environment locally and in CI (fonts,
// rasterizer and Chromium build all differ between hosts and make screenshots non-portable).
//
//   node scripts/visual-docker.mjs          compare against the committed baselines
//   node scripts/visual-docker.mjs --update (re)generate baselines (explicit, never implicit)
//
// The image is derived from the installed @playwright/test version plus a pinned digest;
// package.json pins that dependency exactly and ci.yml names the same image (a unit test keeps
// all three aligned).
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// The image is pinned by DIGEST, not only by tag: a tag on MCR is mutable, and a silent rebuild
// of `v<version>-noble` could change rendering with no change in this repo. The tag is kept
// in the reference for readability (Docker verifies the digest and ignores the tag).
//
// To update (e.g. bumping @playwright/test): 1) set the new exact version in package.json and
// `npm install`; 2) `docker pull mcr.microsoft.com/playwright:v<new>-noble` and read the digest
// with `docker inspect --format '{{index .RepoDigests 0}}' <image>`; 3) put it in
// PLAYWRIGHT_IMAGE_DIGEST below AND in the `image:` of the `visual` job in ci.yml (a unit test
// checks they agree); 4) `npm run test:visual:update` and commit the regenerated baselines
// together with all of the above.
export const PLAYWRIGHT_IMAGE_DIGEST =
  'sha256:47b510dd9230bf0b9bfc9b20102241e577ea7a99334ab4c3ca19f19770e9b8ea';

export function playwrightImage(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Unexpected @playwright/test version "${version}" (expected an exact x.y.z)`);
  }
  return `mcr.microsoft.com/playwright:v${version}-noble@${PLAYWRIGHT_IMAGE_DIGEST}`;
}

export function installedPlaywrightVersion() {
  const pkg = JSON.parse(
    readFileSync(path.join(root, 'node_modules/@playwright/test/package.json'), 'utf8'),
  );
  return pkg.version;
}

export const DOCKER_MISSING_MESSAGE = [
  'Docker is required to run the visual tests, and it is not available (or the daemon is not running).',
  'Baselines must be generated and compared inside the official Playwright image, never with the',
  'local browser, otherwise they would differ from CI. Install/start Docker (on WSL: enable the',
  'Docker Desktop WSL integration) and retry. Nothing was generated.',
].join('\n');

/** @returns {string[]} arguments for `docker run` (everything after the word "docker"). */
export function buildDockerArgs({ image, cwd, update, uid, gid }) {
  const playwrightArgs = ['playwright', 'test', '--project=visual-*'];
  if (update) playwrightArgs.push('--update-snapshots=changed');
  return [
    'run',
    '--rm',
    '--init',
    '--ipc=host',
    ...(uid !== undefined && gid !== undefined ? ['--user', `${uid}:${gid}`] : []),
    '-e',
    'HOME=/tmp',
    // Storybook is built on the host beforehand (platform independent); the container only serves it.
    '-e',
    'VISUAL_PREBUILT=1',
    // Marker checked by visual.spec.ts: baselines may only be (re)written inside this container.
    '-e',
    'VISUAL_DOCKER=1',
    '-v',
    `${cwd}:/work`,
    '-w',
    '/work',
    image,
    'npx',
    ...playwrightArgs,
  ];
}

function main() {
  const update = process.argv.includes('--update');
  const probe = spawnSync('docker', ['info'], { stdio: 'ignore' });
  if (probe.error || probe.status !== 0) {
    console.error(DOCKER_MISSING_MESSAGE);
    process.exit(1);
  }
  const image = playwrightImage(installedPlaywrightVersion());
  console.log(`Using ${image}`);
  execFileSync('npm', ['run', 'build-storybook'], { cwd: root, stdio: 'inherit' });
  const args = buildDockerArgs({
    image,
    cwd: root,
    update,
    uid: process.getuid?.(),
    gid: process.getgid?.(),
  });
  const res = spawnSync('docker', args, { stdio: 'inherit' });
  process.exit(res.status ?? 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
