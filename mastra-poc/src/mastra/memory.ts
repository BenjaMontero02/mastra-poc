import { Memory } from '@mastra/memory';
import { z } from 'zod/v4';

const taskLoopSchema = z.object({
  taskFilename: z.string().optional(),
  taskContent: z.string().optional(),
  phase: z.enum(['idle', 'planning', 'awaiting-approval', 'executing', 'testing', 'fixing', 'done']).optional(),
  iteration: z.number().optional(),
  maxIterations: z.number().optional(),
  codePlan: z.string().optional(),
  qaPlan: z.string().optional(),
  lastQAResult: z.object({
    passed: z.boolean().optional(),
    failedTests: z.array(z.string()).optional(),
    summary: z.string().optional(),
  }).optional(),
  lastFixSummary: z.string().optional(),
});

export const taskMemory = new Memory({
  name: 'Task Memory',
  options: {
    lastMessages: 50,
    workingMemory: {
      enabled: true,
      scope: 'thread',
      schema: taskLoopSchema,
    },
    observationalMemory: {
      model: 'opencode-go/deepseek-v4-pro',
      scope: 'thread',
    },
  },
});
