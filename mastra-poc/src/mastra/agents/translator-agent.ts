import { Agent } from '@mastra/core/agent';

export const translatorAgent = new Agent({
  id: 'translator-agent',
  name: 'Translator Agent',
  description: 'Agente que traduce texto entre idiomas.',
  instructions: 'You are a translation assistant.',
  model: { id: 'opencode-go/deepseek-v4-pro' },
});
