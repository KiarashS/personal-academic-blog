// One way for every build script to start Chromium.
//
// In order: the browser named by CHROMIUM_EXECUTABLE; Playwright's own
// download for the pinned version; and, when that download is missing, the
// newest Chromium already in Playwright's browser folder. The last case is a
// machine with a browser baked in for a different Playwright release, such
// as a sandbox image or a container that predates the latest upgrade: the
// pinned build is not there, an older one is, and it runs these scripts fine.
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

// Where Playwright keeps its browsers: the environment's override, or its
// default cache. `0` means inside node_modules, which has nothing to offer
// beyond what Playwright itself already looked for.
function browsersDir() {
  const configured = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (configured && configured !== '0') return configured;
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Caches', 'ms-playwright');
  if (process.platform === 'win32')
    return join(process.env.LOCALAPPDATA ?? homedir(), 'ms-playwright');
  return join(homedir(), '.cache', 'ms-playwright');
}

// The binaries a Chromium install folder can hold, full browser first. The
// folder names inside have changed between releases (`chrome-linux`, then
// `chrome-linux64`), so both are tried.
const BINARIES = {
  chromium: [
    'chrome-linux64/chrome',
    'chrome-linux/chrome',
    'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
    'chrome-win/chrome.exe',
  ],
  chromium_headless_shell: [
    'chrome-headless-shell-linux64/chrome-headless-shell',
    'chrome-linux/headless_shell',
    'chrome-headless-shell-mac-arm64/chrome-headless-shell',
    'chrome-headless-shell-mac-x64/chrome-headless-shell',
    'chrome-headless-shell-win64/chrome-headless-shell.exe',
  ],
};

/** The newest Chromium in Playwright's browser folder, or undefined. */
export function installedChromium() {
  const dir = browsersDir();
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return undefined;
  }
  const installs = entries
    .map((name) => /^(chromium|chromium_headless_shell)-(\d+)$/.exec(name))
    .filter(Boolean)
    // Newest revision first; at the same revision, the full browser.
    .sort((a, b) => Number(b[2]) - Number(a[2]) || a[1].length - b[1].length);
  for (const [folder, kind] of installs) {
    for (const binary of BINARIES[kind]) {
      const path = join(dir, folder, binary);
      if (existsSync(path)) return path;
    }
  }
  return undefined;
}

/** `chromium.launch`, with the fallbacks above. */
export async function launchChromium(options = {}) {
  const configured = process.env.CHROMIUM_EXECUTABLE;
  if (configured) return chromium.launch({ ...options, executablePath: configured });
  try {
    return await chromium.launch(options);
  } catch (error) {
    if (!/Executable doesn't exist/.test(String(error?.message))) throw error;
    const fallback = installedChromium();
    if (!fallback) throw error;
    console.warn(
      `chromium: Playwright's own build is not installed; using ${fallback}. ` +
        'Run `npx playwright install chromium` for the pinned one, or set CHROMIUM_EXECUTABLE.',
    );
    return chromium.launch({ ...options, executablePath: fallback });
  }
}
