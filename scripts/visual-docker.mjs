#!/usr/bin/env node
// Runs the visual-regression suite inside the official Playwright Docker image, so that
// baselines are generated and compared in the SAME environment locally and in CI (fonts,
// rasterizer and Chromium build all differ between hosts and make screenshots non-portable).
//
//   node scripts/visual-docker.mjs          compare against the committed baselines
//   node scripts/visual-docker.mjs --update (re)generate baselines (explicit, never implicit)
//
// The image tag is derived from the installed @playwright/test version; package.json pins that
// dependency exactly and ci.yml names the same image (a unit test keeps all three aligned).
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function playwrightImage(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Unexpected @playwright/test version "${version}" (expected an exact x.y.z)`);
  }
  return `mcr.microsoft.com/playwright:v${version}-noble`;
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
