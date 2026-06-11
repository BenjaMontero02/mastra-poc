import { AgentBrowser, type BrowserToolName } from '@mastra/agent-browser';

// QA browser siempre conecta via CDP a un contenedor Chromium dockerizado
export const QA_BROWSER_CDP_URL = 'ws://localhost:9222';

const excludedTools: BrowserToolName[] = ['browser_screenshot']; // Use custom capture_evidence_screenshot instead

const browserConfig = {
  headless: true,
  viewport: { width: 1280, height: 720 },
  cdpUrl: QA_BROWSER_CDP_URL,
  scope: 'shared' as const, // CDP requires shared scope (single browser instance)
  excludeTools: excludedTools,
};

export const qaBrowser = new AgentBrowser(browserConfig);
