import { Agent } from '@mastra/core/agent';

export const codeReviewerAgent = new Agent({
  id: 'code-reviewer-agent',
  name: 'Code Reviewer Agent',
  description: 'Agente que revisa codigo y sugiere mejoras.',
  instructions: 'You are a code reviewer.',
  model: { id: 'opencode-go/deepseek-v4-pro' },
});
