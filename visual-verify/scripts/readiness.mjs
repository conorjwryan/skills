// Shared post-action readiness for screenshot and touch commands.
export function readinessArg(a, key, value) {
  if (['--ready-selector', '--ready-js', '--ready-timeout', '--settle'].includes(key)) {
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    a[key.slice(2)] = value;
    return true;
  }
  return false;
}
export function validateReadiness(a) {
  for (const [key, fallback, minimum] of [['ready-timeout', 10000, 1], ['settle', 0, 0]]) {
    a[key] = Number(a[key] ?? fallback);
    if (!Number.isFinite(a[key]) || a[key] < minimum) throw new Error(`Invalid --${key}`);
  }
}
export async function waitForReady(page, a) {
  const deadline = Date.now() + a['ready-timeout'];
  const remaining = () => Math.max(1, deadline - Date.now());
  try {
    if (a['ready-selector']) await page.locator(a['ready-selector']).first().waitFor({ state: 'visible', timeout: remaining() });
    if (a['ready-js']) {
      // Poll asynchronous predicates without leaving a pending promise unbounded.
      const expression = a['ready-js'];
      while (true) {
        const budget = remaining();
        const ready = await evaluateBounded(page, expression, budget);
        if (ready) break;
        if (Date.now() >= deadline) throw new Error('Predicate remained false');
        await page.waitForTimeout(Math.min(100, remaining()));
      }
    }
    if (a.settle) await page.waitForTimeout(a.settle);
  } catch (error) {
    throw new Error(`Post-action readiness failed (selector=${JSON.stringify(a['ready-selector'] ?? null)}, js=${JSON.stringify(a['ready-js'] ?? null)}, timeout=${a['ready-timeout']}ms): ${error.message}`);
  }
  return { selector: a['ready-selector'] ?? null, predicate: a['ready-js'] ?? null, timeout: a['ready-timeout'], settle: a.settle };
}

// Expressions may return promises. Reject pending work without waiting indefinitely.
export async function evaluateBounded(page, expression, timeout) {
  let timer;
  try {
    return await Promise.race([
      page.evaluate(expression),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Page evaluation timed out after ${timeout}ms`)), timeout); }),
    ]);
  } finally { clearTimeout(timer); }
}
