import { createStep, createWorkflow } from '@mastra/core/workflows';
import { RequestContext } from '@mastra/core/request-context';
import { z } from 'zod/v4';
import fs from 'fs';
import path from 'path';
import { detectedStackSchema } from '../schemas/detected-stack';
import { projectSandbox } from '../workspaces';
import { stackDetectorAgent } from '../agents/stack-detector-agent';
import { planCreatorAgent } from '../agents/plan-creator-agent';
import { codeSupervisorAgent } from '../agents/code-supervisor-agent';
import { startApp } from './steps/start-app-step';
import { teardownSandbox } from './steps/teardown-sandbox-step';
import { createPullRequest } from './qa-certification-workflow';
import { QUEUE_DIR, DONE_DIR, PLANS_DIR } from '../paths';

/**
 * Pipeline principal de tareas (sandbox-only storage).
 *
 * Todo el trabajo vive DENTRO del contenedor del sandbox (/workspace/<taskId>);
 * no hay bind mount al host. La persistencia se garantiza pusheando SIEMPRE la
 * rama feature al final del ciclo (pase o no pase QA); el PR solo se crea si
 * QA certifico. El teardown destruye el contenedor al cerrar.
 *
 * Manejo de contexto:
 * - Plumbing (git, arranque de app, teardown, mover tareas) es determinista:
 *   comandos directos via projectSandbox.executeCommand, sin agentes LLM.
 * - Los agentes reciben el stack detectado por dos vias complementarias:
 *   bloque "Stack detectado" en el prompt (para el modelo) y RequestContext
 *   con clave 'detectedStack' (para los resolvers dinamicos de skills).
 * - Entre fases viajan datos tipados y rutas de archivos, nunca documentos
 *   completos: los planes se escriben en .qa/ dentro del repo y los agentes
 *   los leen desde su workspace.
 */

const MAX_ITERATIONS = 20;

// --- Helpers deterministas sobre el sandbox ---

async function sandboxExec(script: string, timeout = 120_000) {
  if (!projectSandbox.executeCommand) {
    throw new Error('El sandbox no soporta executeCommand');
  }
  return projectSandbox.executeCommand('sh', ['-c', script], { timeout });
}

/** Escribe un archivo dentro del contenedor sin problemas de escaping (via base64). */
async function sandboxWriteFile(containerPath: string, content: string) {
  const b64 = Buffer.from(content, 'utf-8').toString('base64');
  const dir = path.posix.dirname(containerPath);
  return sandboxExec(`mkdir -p "${dir}" && printf '%s' '${b64}' | base64 -d > "${containerPath}"`);
}

function buildStackContext(detectedStack: unknown): string {
  return `## Stack detectado (del repositorio)\n\`\`\`json\n${JSON.stringify(detectedStack, null, 2)}\n\`\`\``;
}

function buildRequestContext(detectedStack: unknown): RequestContext {
  const rc = new RequestContext();
  rc.set('detectedStack', detectedStack);
  return rc;
}

// --- Schemas ---

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

const baseStateShape = {
  filename: z.string(),
  repoUrl: z.string(),
  taskId: z.string(),
  branch: z.string(),
  repoPath: z.string(),
};

const failedTestSchema = z.object({
  id: z.string(),
  reason: z.string(),
  evidencePath: z.string().optional(),
});

/**
 * Estado del loop code→QA. inputSchema === outputSchema: en dountil, el step
 * recibe su propio output como input en cada vuelta. Los campos del loop son
 * opcionales para que el output de approve-plans (primera vuelta) valide.
 */
const iterationStateSchema = z.object({
  ...baseStateShape,
  approved: z.boolean(),
  detectedStack: detectedStackSchema,
  codePlan: z.string(),
  qaPlan: z.string(),
  iteration: z.number().optional(),
  passed: z.boolean().optional(),
  aborted: z.boolean().optional(),
  appUrl: z.string().optional(),
  failedTests: z.array(failedTestSchema).optional(),
  qaNotes: z.string().optional(),
  maturityScore: z.number().optional(),
  totalTests: z.number().optional(),
  codeSummary: z.string().optional(),
});

// --- Steps ---

const gitSetup = createStep({
  id: 'git-setup',
  description: 'Levanta el sandbox, clona el repo dentro del contenedor y crea la branch feature',
  inputSchema: taskInputSchema,
  outputSchema: z.object({ ...baseStateShape }),
  execute: async ({ inputData }) => {
    // Sanitizacion: taskId se interpola en comandos de shell y nombres de rama.
    const rawId = inputData.filename.replace(/^TASK-\d+-/, '').replace(/\.md$/, '');
    const taskId = rawId.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (!taskId) throw new Error(`No se pudo derivar un taskId valido de "${inputData.filename}"`);

    if (!/^https:\/\/[A-Za-z0-9._/@:-]+$/.test(inputData.repoUrl)) {
      throw new Error(`repoUrl invalida o con caracteres no permitidos: ${inputData.repoUrl}`);
    }

    const branch = `feature/${taskId}`;
    const repoPath = `/workspace/${taskId}`;

    await projectSandbox.start();

    // ${GITHUB_TOKEN} se expande DENTRO del contenedor (esta en su env); el
    // token nunca viaja en el texto del comando.
    const setup = await sandboxExec(
      `set -e
git config --global url."https://\${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
git config --global user.email "mastra-agent@tsoftglobal.com"
git config --global user.name "Mastra Agent"
git config --global --add safe.directory '*'
rm -rf "${repoPath}"
git clone "${inputData.repoUrl}" "${repoPath}"
cd "${repoPath}"
git checkout -b "${branch}"`,
      300_000,
    );

    if (!setup.success) {
      throw new Error(`git-setup fallo (exit ${setup.exitCode}): ${(setup.stderr || setup.stdout).slice(-2000)}`);
    }

    return { filename: inputData.filename, repoUrl: inputData.repoUrl, taskId, branch, repoPath };
  },
});

const detectStack = createStep({
  id: 'detect-stack',
  description: 'Detecta el stack tecnologico del repositorio desde AGENTS.md y manifiestos',
  inputSchema: z.object({ ...baseStateShape }),
  outputSchema: z.object({ ...baseStateShape, detectedStack: detectedStackSchema }),
  execute: async ({ inputData }) => {
    const stackFallback = {
      languages: [],
      frontend: null,
      backend: null,
      runCommands: { compose: false },
      conventions: [],
      inferred: true,
    };

    try {
      const result = await stackDetectorAgent.generate(
        `Detecta el stack del repo clonado en ${inputData.repoPath}. Primero lista el contenido de la raíz (execute_command: ls -la) y lee SOLO los archivos que existan (AGENTS.md, package.json, pom.xml, requirements.txt, go.mod, docker-compose.yml, etc.). Si el repo solo tiene AGENTS.md, deriva todo el stack de ese archivo. Si el repo está vacío o no hay información suficiente, devuelve un stack mínimo con inferred: true y listas vacías. NUNCA consideres un error que falten manifiestos. Devuelve SOLO el JSON del stack detectado.`,
        {
          memory: { thread: `task-${inputData.filename}`, resource: 'task-pipeline' },
          maxSteps: 20,
          structuredOutput: { schema: detectedStackSchema },
        },
      );

      const detectedStack = result.object || stackFallback;
      return { ...inputData, detectedStack };
    } catch (error) {
      console.warn(
        `[detect-stack] Error al detectar stack en ${inputData.repoPath}: ${error instanceof Error ? error.message : String(error)}. Usando fallback.`,
      );
      return { ...inputData, detectedStack: stackFallback };
    }
  },
});

const takeTask = createStep({
  id: 'take-task',
  description: 'Lee la especificacion de la tarea desde .tasks/queue (host, determinista)',
  inputSchema: z.object({ ...baseStateShape, detectedStack: detectedStackSchema }),
  outputSchema: z.object({ ...baseStateShape, detectedStack: detectedStackSchema, content: z.string() }),
  execute: async ({ inputData }) => {
    const taskFile = path.join(QUEUE_DIR, inputData.filename);
    if (!fs.existsSync(taskFile)) {
      throw new Error(`No existe la tarea ${inputData.filename} en ${QUEUE_DIR}`);
    }
    const content = fs.readFileSync(taskFile, 'utf-8');
    return { ...inputData, content };
  },
});

const createPlans = createStep({
  id: 'create-plans',
  description: 'Genera plan de codigo y plan de QA con el plan-creator (structured output)',
  inputSchema: z.object({ ...baseStateShape, detectedStack: detectedStackSchema, content: z.string() }),
  outputSchema: z.object({
    ...baseStateShape,
    detectedStack: detectedStackSchema,
    content: z.string(),
    codePlan: z.string(),
    qaPlan: z.string(),
    planSummary: z.string(),
  }),
  execute: async ({ inputData }) => {
    const plansSchema = z.object({
      codePlan: z.string().describe('Plan de implementacion completo en markdown'),
      qaPlan: z.string().describe('Plan de QA completo en markdown'),
      summary: z.string().describe('Resumen ejecutivo de ambos planes (max 10 lineas)'),
    });

    const result = await planCreatorAgent.generate(
      `${buildStackContext(inputData.detectedStack)}

El repositorio esta clonado en ${inputData.repoPath} dentro del sandbox: explora su estructura con execute_command para que los planes referencien paths reales.

### Tarea
${inputData.content}

Genera el Plan de Codigo y el Plan de QA.`,
      {
        memory: { thread: `task-${inputData.filename}`, resource: 'task-pipeline' },
        maxSteps: 40,
        structuredOutput: { schema: plansSchema },
        requestContext: buildRequestContext(inputData.detectedStack),
      },
    );

    const plans = result.object;
    if (!plans?.codePlan || !plans?.qaPlan) {
      throw new Error('El plan-creator no devolvio los dos planes esperados');
    }

    // Copia host (visibilidad para el humano en el HITL) y copia en el sandbox
    // (fuente de verdad para los agentes de implementacion y QA).
    fs.mkdirSync(PLANS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(PLANS_DIR, inputData.filename),
      `# Planes — ${inputData.filename}\n\n${plans.summary}\n\n---\n\n${plans.codePlan}\n\n---\n\n${plans.qaPlan}\n`,
      'utf-8',
    );
    await sandboxWriteFile(`${inputData.repoPath}/.qa/code-plan.md`, plans.codePlan);
    await sandboxWriteFile(`${inputData.repoPath}/.qa/qa-plan.md`, plans.qaPlan);

    return {
      ...inputData,
      codePlan: plans.codePlan,
      qaPlan: plans.qaPlan,
      planSummary: plans.summary,
    };
  },
});

const approvePlans = createStep({
  id: 'approve-plans',
  description: 'Pausa para aprobacion humana de los planes (HITL)',
  inputSchema: z.object({
    ...baseStateShape,
    detectedStack: detectedStackSchema,
    content: z.string(),
    codePlan: z.string(),
    qaPlan: z.string(),
    planSummary: z.string(),
  }),
  outputSchema: iterationStateSchema,
  resumeSchema: z.object({
    approved: z.boolean(),
    feedback: z.string().optional(),
  }),
  suspendSchema: z.object({
    reason: z.string(),
    planSummary: z.string(),
    plansPath: z.string(),
    taskId: z.string(),
    branch: z.string(),
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const { approved, feedback } = resumeData ?? {};

    if (approved === undefined) {
      return await suspend({
        reason: 'Los planes necesitan aprobacion humana antes de ejecutar.',
        planSummary: inputData.planSummary,
        plansPath: path.join(PLANS_DIR, inputData.filename),
        taskId: inputData.taskId,
        branch: inputData.branch,
      });
    }

    return {
      filename: inputData.filename,
      repoUrl: inputData.repoUrl,
      taskId: inputData.taskId,
      branch: inputData.branch,
      repoPath: inputData.repoPath,
      approved,
      detectedStack: inputData.detectedStack,
      codePlan: inputData.codePlan,
      qaPlan: inputData.qaPlan,
      qaNotes: approved ? '' : `Planes rechazados por el usuario. Feedback: ${feedback ?? 'sin feedback'}`,
    };
  },
});

const codeQaIteration = createStep({
  id: 'code-qa-iteration',
  description: 'Una iteracion del ciclo: implementar (code-supervisor) → levantar app → certificar (qa-certification)',
  inputSchema: iterationStateSchema,
  outputSchema: iterationStateSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData.approved) {
      return { ...inputData, iteration: inputData.iteration ?? 0, passed: false, aborted: true };
    }

    const iteration = (inputData.iteration ?? 0) + 1;
    const requestContext = buildRequestContext(inputData.detectedStack);
    const thread = `task-${inputData.filename}`;
    const stackContext = buildStackContext(inputData.detectedStack);

    // --- Fase 1: implementacion / fix ---
    const isFirstIteration = iteration === 1;
    const codePrompt = isFirstIteration
      ? `${stackContext}

Implementa el siguiente plan en el repo ${inputData.repoPath} (branch ${inputData.branch}).
El plan tambien esta en ${inputData.repoPath}/.qa/code-plan.md.

${inputData.codePlan}

Recorda: commit local por cada unidad de trabajo (NO push), y deja lista la
infraestructura ejecutable (docker-compose.yml con servicios frontend y backend
separados y puertos publicados al host).`
      : `${stackContext}

Iteracion ${iteration}/${MAX_ITERATIONS} de fixes en ${inputData.repoPath} (branch ${inputData.branch}).
QA fallo en la iteracion anterior. Tests fallidos:
\`\`\`json
${JSON.stringify(inputData.failedTests ?? [], null, 2)}
\`\`\`
Notas de QA: ${inputData.qaNotes || 'sin notas'}
${inputData.appUrl ? `La app corria en ${inputData.appUrl}.` : 'ATENCION: la app no llego a levantar; los logs estan en las notas.'}

Corregi UNICAMENTE lo necesario para que esos tests pasen. Commit local (NO push).`;

    const codeResult = await codeSupervisorAgent.generate(codePrompt, {
      memory: { thread, resource: 'task-pipeline' },
      maxSteps: 80,
      requestContext,
    });

    // Red de seguridad: commit de cualquier cambio que el supervisor no commiteo.
    await sandboxExec(
      `cd "${inputData.repoPath}" && git add -A && (git commit -m "chore(${inputData.taskId}): cierre iteracion ${iteration}" || true)`,
    );

    // --- Fase 2: levantar la app (determinista) ---
    const app = await startApp(inputData.repoPath, inputData.detectedStack);
    if (!app.started) {
      return {
        ...inputData,
        iteration,
        passed: false,
        aborted: false,
        appUrl: '',
        failedTests: [{ id: 'startup', reason: 'La aplicacion no levanto' }],
        qaNotes: `La app no levanto (metodo: ${app.method}). Logs:\n${app.logs ?? 'sin logs'}`,
        codeSummary: codeResult.text.slice(0, 2000),
      };
    }

    // --- Fase 3: certificacion QA (sub-workflow determinista) ---
    const qaWorkflow = mastra?.getWorkflow('qa-certification');
    if (!qaWorkflow) throw new Error('qa-certification workflow not found');

    let qa: {
      passed: boolean;
      maturityScore: number;
      totalTests: number;
      failedTests: { id: string; reason: string; evidencePath?: string }[];
      reportPath: string;
      notes: string;
    };
    try {
      const run = await qaWorkflow.createRun();
      const qaRun = await run.start({
        inputData: {
          appUrl: app.appUrl,
          qaPlanPath: `${inputData.repoPath}/.qa/qa-plan.md`,
          certificationPath: `${inputData.repoPath}/.qa/cert-iter-${iteration}`,
          mode: 'positivos',
          taskId: inputData.taskId,
          branch: inputData.branch,
          repoUrl: inputData.repoUrl,
          detectedStack: inputData.detectedStack,
        },
        requestContext,
      } as never);
      qa =
        (qaRun as { status?: string; result?: typeof qa }).status === 'success' && (qaRun as { result?: typeof qa }).result
          ? ((qaRun as { result: typeof qa }).result)
          : {
              passed: false,
              maturityScore: 0,
              totalTests: 0,
              failedTests: [{ id: 'qa-workflow', reason: `El workflow de QA termino con status ${(qaRun as { status?: string }).status}` }],
              reportPath: '',
              notes: 'El sub-workflow de certificacion no completo correctamente.',
            };
    } catch (error) {
      qa = {
        passed: false,
        maturityScore: 0,
        totalTests: 0,
        failedTests: [{ id: 'qa-workflow', reason: error instanceof Error ? error.message : String(error) }],
        reportPath: '',
        notes: 'Excepcion al ejecutar el sub-workflow de certificacion.',
      };
    }

    return {
      ...inputData,
      iteration,
      passed: qa.passed,
      aborted: false,
      appUrl: app.appUrl,
      failedTests: qa.failedTests,
      qaNotes: qa.notes,
      maturityScore: qa.maturityScore,
      totalTests: qa.totalTests,
      codeSummary: codeResult.text.slice(0, 2000),
    };
  },
});

const publishResults = createStep({
  id: 'publish-results',
  description: 'Push de la rama SIEMPRE (preserva el trabajo); PR solo si QA certifico',
  inputSchema: iterationStateSchema,
  outputSchema: z.object({
    ...taskOutputSchema.shape,
    repoPath: z.string(),
  }),
  execute: async ({ inputData }) => {
    const iterations = inputData.iteration ?? 0;
    const parts: string[] = [];

    let status: 'completed' | 'failed' | 'max-iterations';
    if (inputData.aborted) {
      status = 'failed';
      parts.push('Ciclo abortado (planes no aprobados).');
    } else if (inputData.passed) {
      status = 'completed';
      parts.push(`QA certifico en la iteracion ${iterations} (madurez ${inputData.maturityScore ?? 0}%).`);
    } else {
      status = iterations >= MAX_ITERATIONS ? 'max-iterations' : 'failed';
      parts.push(`QA no certifico tras ${iterations} iteraciones. Ultimas notas: ${inputData.qaNotes ?? 'sin notas'}`);
    }

    // Push SIEMPRE que haya trabajo: sin bind mount, la rama remota es la unica
    // persistencia del codigo una vez destruido el contenedor.
    if (!inputData.aborted) {
      const push = await sandboxExec(
        `cd "${inputData.repoPath}" && git add -A && (git commit -m "chore(${inputData.taskId}): cierre de ciclo" || true) && git push -u origin "${inputData.branch}" 2>&1`,
        180_000,
      );
      parts.push(push.success ? `Rama ${inputData.branch} pusheada.` : `PUSH FALLO: ${(push.stderr || push.stdout).slice(-1500)}`);

      if (inputData.passed && push.success) {
        const pr = await createPullRequest({
          repoUrl: inputData.repoUrl,
          branch: inputData.branch,
          taskId: inputData.taskId,
          qaSummary: {
            passed: true,
            maturityScore: inputData.maturityScore ?? 0,
            totalTests: inputData.totalTests ?? 0,
            failedCount: (inputData.failedTests ?? []).length,
          },
          summary: inputData.codeSummary ?? 'Implementacion completada segun planes aprobados.',
        });
        parts.push(pr.prUrl ? `PR creado: ${pr.prUrl}` : `PR no creado: ${pr.error ?? 'error desconocido'}`);
      } else if (!inputData.passed) {
        parts.push('PR no creado (QA no certifico).');
      }
    }

    return {
      status,
      taskFilename: inputData.filename,
      summary: parts.join('\n'),
      iterations,
      repoPath: inputData.repoPath,
    };
  },
});

const closeTask = createStep({
  id: 'close-task',
  description: 'Teardown del sandbox (destruye el contenedor) y archivo de la tarea',
  inputSchema: z.object({
    ...taskOutputSchema.shape,
    repoPath: z.string(),
  }),
  outputSchema: taskOutputSchema,
  execute: async ({ inputData }) => {
    const teardown = await teardownSandbox(inputData.repoPath);

    // Mover la tarea a done (host, determinista)
    let archived = '';
    try {
      fs.mkdirSync(DONE_DIR, { recursive: true });
      const from = path.join(QUEUE_DIR, inputData.taskFilename);
      const to = path.join(DONE_DIR, inputData.taskFilename);
      if (fs.existsSync(from)) {
        fs.renameSync(from, to);
        archived = `Tarea archivada en .tasks/done/${inputData.taskFilename}.`;
      } else {
        archived = 'La tarea ya no estaba en el queue.';
      }
    } catch (error) {
      archived = `No se pudo archivar la tarea: ${error instanceof Error ? error.message : String(error)}`;
    }

    return {
      status: inputData.status,
      taskFilename: inputData.taskFilename,
      summary: `${inputData.summary}\n${archived}\nTeardown: ${teardown.details}`,
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
  .then(detectStack)
  .then(takeTask)
  .then(createPlans)
  .then(approvePlans)
  .dountil(
    codeQaIteration,
    async ({ inputData }) =>
      Boolean(inputData.aborted) || Boolean(inputData.passed) || (inputData.iteration ?? 0) >= MAX_ITERATIONS,
  )
  .then(publishResults)
  .then(closeTask)
  .commit();
