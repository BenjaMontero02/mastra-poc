import { Agent } from '@mastra/core/agent';

export const weatherAgent = new Agent({
  id: 'weather-agent',
  name: 'Weather Agent',
  description: 'Agente que proporciona informacion meteorologica.',
  instructions: 'You are a weather assistant.',
  model: { id: 'opencode-go/deepseek-v4-pro' },
});
