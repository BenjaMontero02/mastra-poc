import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod/v4';

const taskInputSchema = z.object({
  filename: z.string().describe('Nombre del archivo de tarea en .tasks/queue'),
});

const taskOutputSchema = z.object({
  status: z.enum(['completed', 'failed', 'max-iterations']),
  taskFilename: z.string(),
  summary: z.string(),
  iterations: z.number(),
});

const takeTask = createStep({
  id: 'take-task',
  description: 'Lee la tarea del queue',
  inputSchema: taskInputSchema,
  outputSchema: z.object({
    filename: z.string(),
    content: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('parent-supervisor');
    if (!agent) throw new Error('parent-supervisor agent not found');

    const result = await agent.generate([
      { role: 'user', content: `Usá el tool task-queue-take con filename "${inputData.filename}" y devolvé el contenido.` },
    ]);

    return {
      filename: inputData.filename,
      content: result.text,
    };
  },
});

const createPlans = createStep({
  id: 'create-plans',
  description: 'Genera planes de código y QA',
  inputSchema: z.object({
    filename: z.string(),
    content: z.string(),
  }),
  outputSchema: z.object({
    filename: z.string(),
    content: z.string(),
    plans: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('parent-supervisor');
    if (!agent) throw new Error('parent-supervisor agent not found');

    const result = await agent.generate([
      { role: 'user', content: `Delegá al plan-creator la siguiente tarea y devolvé los planes generados:\n\n${inputData.content}` },
    ], {
      memory: { thread: `task-${inputData.filename}`, resource: 'task-pipeline' },
    });

    return {
      filename: inputData.filename,
      content: inputData.content,
      plans: result.text,
    };
  },
});

const approvePlans = createStep({
  id: 'approve-plans',
  description: 'Pausa para aprobación humana de los planes',
  inputSchema: z.object({
    filename: z.string(),
    content: z.string(),
    plans: z.string(),
  }),
  outputSchema: z.object({
    filename: z.string(),
    content: z.string(),
    plans: z.string(),
    approved: z.boolean(),
  }),
  resumeSchema: z.object({
    approved: z.boolean(),
    feedback: z.string().optional(),
  }),
  suspendSchema: z.object({
    reason: z.string(),
    plans: z.string(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const { approved, feedback } = resumeData ?? {};

    if (approved === undefined) {
      return await suspend({
        reason: 'Los planes necesitan aprobación humana antes de ejecutar.',
        plans: inputData.plans,
      });
    }

    if (!approved) {
      return await suspend({
        reason: `Planes rechazados. Feedback: ${feedback ?? 'Sin feedback'}. Revisá y aprobá o rechazá nuevamente.`,
        plans: inputData.plans,
      });
    }

    return {
      filename: inputData.filename,
      content: inputData.content,
      plans: inputData.plans,
      approved: true,
    };
  },
});

const executeLoop = createStep({
  id: 'execute-loop',
  description: 'Loop code↔QA hasta pasar todos los tests',
  inputSchema: z.object({
    filename: z.string(),
    content: z.string(),
    plans: z.string(),
    approved: z.boolean(),
  }),
  outputSchema: taskOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('parent-supervisor');
    if (!agent) throw new Error('parent-supervisor agent not found');

    const threadId = `task-${inputData.filename}`;

    const result = await agent.generate([
      { role: 'user', content: `Ejecutá el loop de implementación con los siguientes planes:\n\n${inputData.plans}\n\nTarea original:\n${inputData.content}` },
    ], {
      memory: { thread: threadId, resource: 'task-pipeline' },
      maxSteps: 30,
    });

    const text = result.text;
    const isPassed = text.includes('PASSED') || text.includes('passed') || text.includes('pasó');
    const isMaxIterations = text.includes('máximo') || text.includes('max iterations') || text.includes('5 iteraciones');

    return {
      status: isMaxIterations ? 'max-iterations' : isPassed ? 'completed' : 'failed',
      taskFilename: inputData.filename,
      summary: text,
      iterations: 1,
    };
  },
});

export const taskPipelineWorkflow = createWorkflow({
  id: 'task-pipeline',
  inputSchema: taskInputSchema,
  outputSchema: taskOutputSchema,
})
  .then(takeTask)
  .then(createPlans)
  .then(approvePlans)
  .then(executeLoop)
  .commit();
