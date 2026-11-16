// Resolve Playwright and start browsers.
//
// When Docker is available, browsers run inside Microsoft's Playwright image
// (mcr.microsoft.com/playwright), which already contains Chromium, WebKit and
// every system library they need. Nothing extra is installed on the host.
// Without Docker, the locally installed Playwright browsers are used.
// Set VISUAL_VERIFY_DOCKER=0 to force local browsers.
import { createRequire } from "node:module";
import { execFileSync, execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const PORT = 39123;

function resolvePlaywright() {
  try {
    return { playwright: require("playwright"), version: require("playwright/package.json").version };
  } catch {
    try {
      const root = execSync("npm root -g", { encoding: "utf8" }).trim();
      return { playwright: require(`${root}/playwright`), version: require(`${root}/playwright/package.json`).version };
    } catch (e) {
      throw new Error(
        "Playwright not found. Run: bash ~/.claude/skills/visual-verify/scripts/install.sh\n" + String(e)
      );
    }
  }
}

function loadPlaywright() {
  return resolvePlaywright().playwright;
}

export function loadChromium() {
  return loadPlaywright().chromium;
}

/** "chromium" or "webkit" (Safari's engine). */
export function loadBrowser(name) {
  return loadPlaywright()[name];
}

/** Playwright's phone and tablet presets, e.g. devices["iPhone 15"]. */
export function loadDevices() {
  return loadPlaywright().devices;
}

function dockerAvailable() {
  if (process.env.VISUAL_VERIFY_DOCKER === "0") return false;
  try {
    execFileSync("docker", ["info", "--format", "{{.ServerVersion}}"], { stdio: "ignore", timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Starts (or reuses) a Playwright server container matching the local Playwright
 * version. Host networking lets it open localhost dev servers.
 */
function ensureContainer(version) {
  const name = `visual-verify-playwright-${version}`;
  const running = execFileSync("docker", ["ps", "--filter", `name=^${name}$`, "--format", "{{.Names}}"], { encoding: "utf8" }).trim();
  if (!running) {
    execFileSync("docker", ["rm", "-f", name], { stdio: "ignore" });
    execFileSync("docker", [
      "run", "-d", "--rm", "--init", "--ipc=host", "--network", "host", "--name", name,
      "--user", "pwuser", "--workdir", "/home/pwuser",
      `mcr.microsoft.com/playwright:v${version}-noble`,
      "/bin/sh", "-c", `npx -y playwright@${version} run-server --port ${PORT} --host 127.0.0.1`,
    ], { stdio: ["ignore", "ignore", "inherit"], timeout: 15 * 60 * 1000 });
  }
  return name;
}

/**
 * Launches `name` ("chromium" or "webkit"). Returns { browser, where }, where
 * `where` says whether it ran in Docker or locally, for honest reporting.
 */
export async function launchBrowser(name) {
  const { playwright, version } = resolvePlaywright();
  if (dockerAvailable()) {
    const container = ensureContainer(version);
    const endpoint = `ws://127.0.0.1:${PORT}/`;
    // The first run downloads the image and the Playwright package; give it time.
    const deadline = Date.now() + 5 * 60 * 1000;
    let lastError;
    while (Date.now() < deadline) {
      try {
        const browser = await playwright[name].connect(endpoint, { timeout: 10000 });
        return { browser, where: `docker (${container})` };
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    throw new Error(`The Playwright Docker server did not start. Check: docker logs ${container}\n${lastError}`);
  }
  return { browser: await playwright[name].launch(), where: "local" };
}
