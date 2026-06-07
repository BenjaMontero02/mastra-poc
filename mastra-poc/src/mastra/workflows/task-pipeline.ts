import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod/v4';

const taskInputSchema = z.object({
  filename: z.string().describe('Nombre del archivo de tarea en .tasks/queue'),
  repoUrl: z.string().describe('URL del repo Git (HTTPS). Ej: https://github.com/org/repo.git'),
});

const taskOutputSchema = z.object({
  status: z.enum(['completed', 'failed', 'max-iterations']),
  taskFilename: z.string(),
  summary: z.string(),
  iterations: z.number(),
});

const gitSetup = createStep({
  id: 'git-setup',
  description: 'Clona el repo en el sandbox Docker, activa el workspace y crea branch',
  inputSchema: z.object({
    filename: z.string(),
    repoUrl: z.string(),
  }),
  outputSchema: z.object({
    filename: z.string(),
    repoUrl: z.string(),
    taskId: z.string(),
    branch: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('parent-supervisor');
    if (!agent) throw new Error('parent-supervisor agent not found');

    const result = await agent.generate(
      `Configura el sandbox para trabajar con el repo ${inputData.repoUrl}.
Tarea: ${inputData.filename}
Pasos:
1. Configura git auth con GITHUB_TOKEN (si esta disponible)
2. git clone ${inputData.repoUrl} en /workspace/<taskId>
3. printf '<taskId>' > /workspace/current (activa sandbox)
4. git checkout -b feature/<taskId>
Devolve el taskId y el nombre de la branch.`,
      {
        memory: { thread: `task-${inputData.filename}`, resource: 'task-pipeline' },
        maxSteps: 25,
      },
    );

    return {
      filename: inputData.filename,
      repoUrl: inputData.repoUrl,
      taskId: inputData.filename.replace(/^TASK-\d+-/, '').replace('.md', ''),
      branch: `feature/${inputData.filename.replace(/^TASK-\d+-/, '').replace('.md', '')}`,
    };
  },
});

const takeTask = createStep({
  id: 'take-task',
  description: 'Lee la tarea del queue',
  inputSchema: z.object({
    filename: z.string(),
    repoUrl: z.string(),
    taskId: z.string(),
    branch: z.string(),
  }),
  outputSchema: z.object({
    filename: z.string(),
    content: z.string(),
    repoUrl: z.string(),
    taskId: z.string(),
    branch: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('parent-supervisor');
    if (!agent) throw new Error('parent-supervisor agent not found');

    const result = await agent.generate(
      `Usa el tool task-queue-take con filename "${inputData.filename}" y devolve SOLO el contenido de la tarea.`,
      { memory: { thread: `task-${inputData.filename}`, resource: 'task-pipeline' }, maxSteps: 25 },
    );

    return {
      filename: inputData.filename,
      content: result.text,
      repoUrl: inputData.repoUrl,
      taskId: inputData.taskId,
      branch: inputData.branch,
    };
  },
});

const createPlans = createStep({
  id: 'create-plans',
  description: 'Genera planes de codigo y QA',
  inputSchema: z.object({
    filename: z.string(),
    content: z.string(),
    repoUrl: z.string(),
    taskId: z.string(),
    branch: z.string(),
  }),
  outputSchema: z.object({
    filename: z.string(),
    content: z.string(),
    plans: z.string(),
    taskId: z.string(),
    branch: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('parent-supervisor');
    if (!agent) throw new Error('parent-supervisor agent not found');

    const result = await agent.generate(
      `Delega al plan-creator la siguiente tarea y devolve los planes generados:\n\n${inputData.content}`,
      { memory: { thread: `task-${inputData.filename}`, resource: 'task-pipeline' }, maxSteps: 25 },
    );

    return {
      filename: inputData.filename,
      content: inputData.content,
      plans: result.text,
      taskId: inputData.taskId,
      branch: inputData.branch,
    };
  },
});

const approvePlans = createStep({
  id: 'approve-plans',
  description: 'Pausa para aprobacion humana de los planes',
  inputSchema: z.object({
    filename: z.string(),
    content: z.string(),
    plans: z.string(),
    taskId: z.string(),
    branch: z.string(),
  }),
  outputSchema: z.object({
    filename: z.string(),
    content: z.string(),
    plans: z.string(),
    approved: z.boolean(),
    taskId: z.string(),
    branch: z.string(),
    feedback: z.string().optional(),
  }),
  resumeSchema: z.object({
    approved: z.boolean(),
    feedback: z.string().optional(),
  }),
  suspendSchema: z.object({
    reason: z.string(),
    plans: z.string(),
    taskId: z.string(),
    branch: z.string(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const { approved, feedback } = resumeData ?? {};

    if (approved === undefined) {
      return await suspend({
        reason: 'Los planes necesitan aprobacion humana antes de ejecutar.',
        plans: inputData.plans,
        taskId: inputData.taskId,
        branch: inputData.branch,
      });
    }

    if (!approved) {
      return await suspend({
        reason: `Planes rechazados. Feedback: ${feedback ?? 'Sin feedback'}. Corregi y reenvia.`,
        plans: inputData.plans,
        taskId: inputData.taskId,
        branch: inputData.branch,
      });
    }

    return {
      filename: inputData.filename,
      content: inputData.content,
      plans: inputData.plans,
      approved: true,
      taskId: inputData.taskId,
      branch: inputData.branch,
      feedback,
    };
  },
});

const executeLoop = createStep({
  id: 'execute-loop',
  description: 'Loop code->QA hasta pasar todos los tests',
  inputSchema: z.object({
    filename: z.string(),
    content: z.string(),
    plans: z.string(),
    approved: z.boolean(),
    taskId: z.string(),
    branch: z.string(),
  }),
  outputSchema: taskOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('parent-supervisor');
    if (!agent) throw new Error('parent-supervisor agent not found');

    const threadId = `task-${inputData.filename}`;

    const result = await agent.generate(
      `Ejecuta el loop de implementacion con los siguientes planes.
Branch: ${inputData.branch}
Planes:\n${inputData.plans}\n\nTarea original:\n${inputData.content}

Delega al code-supervisor (que implementa, commitea y pushea). Luego delega al qa-supervisor. Repeti hasta que QA pase o maximo 5 iteraciones.`,
      {
        memory: { thread: threadId, resource: 'task-pipeline' },
        maxSteps: 30,
      },
    );

    const text = result.text;
    const isPassed = text.includes('PASSED') || text.includes('passed') || text.includes('paso');
    const isMaxIterations = text.includes('maximo') || text.includes('max iterations') || text.includes('5 iteraciones');

    return {
      status: isMaxIterations ? 'max-iterations' : isPassed ? 'completed' : 'failed',
      taskFilename: inputData.filename,
      summary: text,
      iterations: 1,
    };
  },
});

const closeTask = createStep({
  id: 'close-task',
  description: 'Cierra la tarea y limpia el sandbox',
  inputSchema: z.object({
    status: z.enum(['completed', 'failed', 'max-iterations']),
    taskFilename: z.string(),
    summary: z.string(),
    iterations: z.number(),
  }),
  outputSchema: taskOutputSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('parent-supervisor');
    if (!agent) throw new Error('parent-supervisor agent not found');

    const result = await agent.generate(
      `La tarea ${inputData.taskFilename} termino con status: ${inputData.status}.
Resumen: ${inputData.summary}

Usa task-done-write para moverla a .tasks/done (el usuario aprobara o rechazara via HITL).
Luego rm -f /workspace/current para limpiar el sandbox.`,
      { memory: { thread: `task-${inputData.taskFilename}`, resource: 'task-pipeline' }, maxSteps: 10 },
    );

    return {
      status: inputData.status,
      taskFilename: inputData.taskFilename,
      summary: result.text,
      iterations: inputData.iterations,
    };
  },
});

export const taskPipelineWorkflow = createWorkflow({
  id: 'task-pipeline',
  inputSchema: taskInputSchema,
  outputSchema: taskOutputSchema,
})
  .then(gitSetup)
  .then(takeTask)
  .then(createPlans)
  .then(approvePlans)
  .then(executeLoop)
  .then(closeTask)
  .commit();
