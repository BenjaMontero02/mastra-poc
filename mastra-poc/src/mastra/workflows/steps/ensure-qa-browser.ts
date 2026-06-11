import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { PROJECT_ROOT } from '../../paths';

const execFileAsync = promisify(execFile);

/**
 * Ensure QA browser (CDP or local) is ready for test execution.
 *
 * If QA_BROWSER_CDP_URL is not set: returns { ready: true, mode: 'local' } (no-op).
 * If QA_BROWSER_CDP_URL is set: launches docker compose in host (NOT sandbox),
 * polls the CDP endpoint for health, and returns { ready, mode }.
 *
 * Called at start of exploreAppStep to cover both pipeline and standalone workflows.
 * docker compose up -d is idempotent: if already running, does nothing.
 */
export async function ensureQaBrowser(): Promise<{
  ready: boolean;
  mode: 'cdp' | 'local';
  logs?: string;
}> {
  const cdpUrl = process.env.QA_BROWSER_CDP_URL;

  // Local fallback: no browser service to manage
  if (!cdpUrl) {
    return { ready: true, mode: 'local' };
  }

  try {
    // CDP mode: launch docker compose in host
    // Resolve compose file path from PROJECT_ROOT (respects mastra dev cwd=.mastra/output)
    const composeFile = path.join(PROJECT_ROOT, 'docker', 'qa-browser.compose.yml');

    console.log(`[ensure-qa-browser] Starting docker compose from ${composeFile}...`);
    const upResult = await execFileAsync('docker', ['compose', '-f', composeFile, 'up', '-d'], {
      timeout: 30_000,
      maxBuffer: 1024 * 1024, // 1MB for logs
    });

    if (upResult.stderr) {
      console.log(`[ensure-qa-browser] docker compose output:`, upResult.stderr);
    }

    // Poll CDP endpoint for health (~30 retries x 2s = 60s total).
    // QA_BROWSER_CDP_URL es ws:// (para Playwright), pero el healthcheck va por
    // el endpoint HTTP de CDP: fetch no soporta el esquema ws://.
    const httpBase = cdpUrl.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');
    const cdpHealthUrl = `${httpBase}/json/version`;
    const maxRetries = 30;
    const retryDelayMs = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(cdpHealthUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`[ensure-qa-browser] CDP endpoint healthy on attempt ${attempt}`);
          return { ready: true, mode: 'cdp' };
        }
      } catch {
        // Not ready yet (timeout, network error, etc.)
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }

    // Timeout reached
    console.error(
      `[ensure-qa-browser] CDP endpoint not healthy after ${maxRetries * retryDelayMs / 1000}s`
    );
    return {
      ready: false,
      mode: 'cdp',
      logs: `CDP endpoint ${cdpHealthUrl} not reachable after ${maxRetries} retries`,
    };
  } catch (error) {
    const logs = error instanceof Error ? error.message : String(error);
    console.error(`[ensure-qa-browser] Failed to ensure browser:`, logs);
    return {
      ready: false,
      mode: 'cdp',
      logs,
    };
  }
}
