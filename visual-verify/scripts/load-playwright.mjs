// Supported API: launchBrowser(name, { backend, timeout, launchOptions }).
// Raw loadChromium/loadBrowser exports remain local-only for legacy callers.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const manifest = require('../package.json');
export const expectedVersion = manifest.dependencies.playwright;
export const image = `mcr.microsoft.com/playwright:v${expectedVersion}-noble`;
const owned = new Set();
const docker = (args) => execFileSync('docker', args, { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function remove(name) {
  try { docker(['rm', '-f', name]); owned.delete(name); } catch { /* exit hook retries; never touch unowned containers */ }
}
let cleanupInstalled = false;
function installCleanup() {
  if (cleanupInstalled) return;
  cleanupInstalled = true;
  process.once('exit', () => { for (const name of owned) remove(name); });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    for (const name of owned) remove(name);
    process.exit(signal === 'SIGINT' ? 130 : 143);
  });
}

function runtime() {
  const path = `${root}node_modules/playwright/package.json`;
  if (!existsSync(path)) throw new Error(`Skill runtime missing. Run: bash ${JSON.stringify(root + 'scripts/install.sh')}`);
  const installed = require(path).version;
  if (installed !== expectedVersion) throw new Error(`Playwright ${installed} does not match pinned ${expectedVersion}. Rerun the skill installer.`);
  return require(`${root}node_modules/playwright`);
}
// These exports intentionally do not start Docker or install missing dependencies.
export function loadBrowser(name) { return runtime()[name]; }
export function loadChromium() { return loadBrowser('chromium'); }
export function loadDevices() { return runtime().devices; }
export function diagnose() {
  const result = { skillVersion: manifest.version, expectedVersion, image, runtimePath: `${root}node_modules/playwright`, docker: false, imagePresent: false, containers: [], repair: `bash ${JSON.stringify(root + 'scripts/install.sh')}` };
  try {
    const pw = runtime();
    result.runtimeReady = true;
    result.browsers = Object.fromEntries(['chromium', 'webkit'].map(name => [name, { path: pw[name].executablePath(), exists: existsSync(pw[name].executablePath()) }]));
  } catch (error) { result.runtimeReady = false; result.runtimeError = error.message; }
  try {
    docker(['info', '--format', '{{.ServerVersion}}']); result.docker = true;
    try { docker(['image', 'inspect', image]); result.imagePresent = true; } catch { /* missing image */ }
    const rows = docker(['ps', '--filter', 'name=^visual-verify-', '--format', 'json']);
    result.containers = rows.split('\n').filter(Boolean).map(line => JSON.parse(line));
  } catch (error) { result.dockerError = error.message; }
  return result;
}

export async function launchBrowser(name, { backend = process.env.VISUAL_VERIFY_DOCKER === '0' ? 'local' : 'auto', timeout = 30000, launchOptions = {} } = {}) {
  if (!['chromium', 'webkit', 'firefox'].includes(name)) throw new Error(`Unsupported browser: ${name}`);
  if (!['auto', 'docker', 'local'].includes(backend) || !Number.isFinite(timeout) || timeout <= 0) throw new Error('Invalid backend or timeout');
  const pw = runtime();
  let available = false;
  if (backend !== 'local') { try { docker(['info', '--format', '{{.ServerVersion}}']); available = true; } catch { /* auto can use local */ } }
  if (backend === 'docker' && !available) throw new Error('Docker unavailable; run doctor.mjs for diagnostics.');
  if (!available) {
    try { return { browser: await pw[name].launch({ headless: true, ...launchOptions, timeout }), where: `local (Playwright ${expectedVersion})` }; }
    catch (error) { throw new Error(`Local ${name} failed. Run doctor.mjs and explicit setup; nothing was installed. ${error.message}`); }
  }
  try { docker(['image', 'inspect', image]); } catch { throw new Error(`Docker image missing: ${image}. Run the installer explicitly; launch does not pull images.`); }
  // A dedicated server per launch: Docker allocates the loopback host port atomically.
  // No shared fixed port, reuse race, or termination of another caller's server.
  const container = `visual-verify-${randomUUID()}`;
  const serverPath = `/${randomUUID()}`;
  const serverLogs = () => {
    const result = spawnSync('docker', ['logs', '--tail', '60', container], { encoding: 'utf8', timeout: 10000 });
    return [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  };
  installCleanup();
  owned.add(container);
  try {
    docker(['run', '-d', '--pull=never', '--init', '--ipc=host', '--user', 'pwuser', '--workdir', '/home/pwuser', '--label', 'visual-verify.managed=1', '--label', `visual-verify.version=${expectedVersion}`, '--name', container, '-p', '127.0.0.1::3000', '--mount', `type=bind,source=${realpathSync(root + 'node_modules')},target=/runtime/node_modules,readonly`, image, 'node', '/runtime/node_modules/playwright/cli.js', 'run-server', '--port', '3000', '--host', '0.0.0.0', '--path', serverPath, '--max-clients', '1', '--unsafe']);
    const info = JSON.parse(docker(['inspect', container]))[0];
    if (info.Config.Image !== image || info.Config.Labels['visual-verify.version'] !== expectedVersion) throw new Error('Container identity mismatch');
    const port = info.NetworkSettings.Ports['3000/tcp']?.find(p => p.HostIp === '127.0.0.1')?.HostPort;
    if (!port) throw new Error('No loopback endpoint allocated');
    const deadline = Date.now() + timeout;
    let endpoint;
    while (Date.now() < deadline) {
      const logs = serverLogs();
      const match = logs.match(/ws:\/\/[^\s]+/);
      if (match) { endpoint = new URL(match[0]); break; }
      const state = JSON.parse(docker(['inspect', '--format', '{{json .State}}', container]));
      if (!state.Running) throw new Error(`Server exited (${state.ExitCode}): ${logs}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!endpoint) throw new Error(`Server readiness timed out after ${timeout}ms`);
    endpoint.hostname = '127.0.0.1'; endpoint.port = port;
    if (endpoint.pathname !== serverPath) throw new Error('Server endpoint identity mismatch');
    const browser = await pw[name].connect(endpoint.href, {
      timeout, exposeNetwork: '<loopback>',
      headers: { 'x-playwright-launch-options': JSON.stringify({ headless: true, ...launchOptions, timeout }) },
    });
    const close = browser.close.bind(browser);
    browser.close = async (...args) => { try { return await close(...args); } finally { remove(container); } };
    browser.on('disconnected', () => remove(container));
    return { browser, where: `docker (${container}, Playwright ${expectedVersion}, 127.0.0.1:${port})` };
  } catch (error) {
    const logs = serverLogs();
    remove(container);
    throw new Error(`Docker ${name} failed: ${error.message}${logs ? `\nServer logs:\n${logs}` : ''}`);
  }
}
