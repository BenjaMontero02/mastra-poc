import { AgentBrowser, type BrowserToolName } from '@mastra/agent-browser';

// Build browser config based on whether CDP is available
// If QA_BROWSER_CDP_URL is set, connect via CDP (requires scope: 'shared')
// Otherwise, launch local headless (scope: 'thread' for isolation)
const getCdpUrl = () => process.env.QA_BROWSER_CDP_URL;
const cdpUrl = getCdpUrl();

const excludedTools: BrowserToolName[] = ['browser_screenshot']; // Use custom capture_evidence_screenshot instead

const browserConfig = cdpUrl
  ? {
      headless: true,
      viewport: { width: 1280, height: 720 },
      cdpUrl,
      scope: 'shared' as const, // CDP requires shared scope (single browser instance)
      excludeTools: excludedTools,
    }
  : {
      headless: true,
      viewport: { width: 1280, height: 720 },
      scope: 'thread' as const, // Local launch: each thread gets isolated browser
      excludeTools: excludedTools,
    };

export const qaBrowser = new AgentBrowser(browserConfig);
