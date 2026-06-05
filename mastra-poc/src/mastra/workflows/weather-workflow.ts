import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod/v4';

const noopStep = createStep({
  id: 'noop',
  description: 'Step placeholder',
  inputSchema: z.object({}),
  outputSchema: z.object({ done: z.boolean() }),
  execute: async () => ({ done: true }),
});

export const weatherWorkflow = createWorkflow({
  id: 'weather-workflow',
  inputSchema: z.object({}),
  outputSchema: z.object({ done: z.boolean() }),
})
  .then(noopStep)
  .commit();
