// Read-only inspection: no installs, pulls, container starts/stops or app requests.
import { diagnose } from './load-playwright.mjs';
const result = diagnose();
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.runtimeReady && (process.env.VISUAL_VERIFY_DOCKER === '0' ? result.browsers?.chromium.exists : (result.docker ? result.imagePresent : result.browsers?.chromium.exists)) ? 0 : 1;
