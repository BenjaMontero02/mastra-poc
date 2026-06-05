import { AgentBrowser } from '@mastra/agent-browser';

export const qaBrowser = new AgentBrowser({
  headless: true,
  viewport: { width: 1280, height: 720 },
  scope: 'thread',
});
