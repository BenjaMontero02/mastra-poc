import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod/v4';
import { detectedStackSchema } from '../schemas/detected-stack';
import { appExplorerAgent } from '../agents/app-explorer-agent';
import { userStoryCreatorAgent } from '../agents/user-story-creator-agent';
import { gherkinTestDesignerAgent } from '../agents/gherkin-test-designer-agent';
import { playwrightTestExecutorAgent } from '../agents/playwright-test-executor-agent';
import { executiveReporterAgent } from '../agents/executive-reporter-agent';
import { projectSandbox } from '../workspaces';
import { ensureQaBrowser } from './steps/ensure-qa-browser';

// --- Helper para generar HTML de evidencia determinísticamente ---

interface StepResult {
  gherkin: string;
  action: string;
  result: string;
  passed: boolean;
  screenshotPath: string;
}

interface TestExecutionResult {
  id: string;
  passed: boolean;
  reason: string;
  steps?: StepResult[];
}

/**
 * HTML escape helper to prevent XSS from LLM-generated or user-controlled content
 */
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validate screenshot filename against whitelist pattern
 */
function isValidScreenshotFilename(filename: string): boolean {
  return /^[A-Za-z0-9._-]+\.png$/.test(filename);
}

/**
 * Genera HTML de evidencia determinísticamente a partir del resultado del test.
 * El HTML contiene referencias relativas a las imágenes PNG (./nn-label.png).
 * Todas las interpolaciones de texto se escapan para prevenir XSS.
 */
function buildEvidenceHtml(tcId: string, tcResult: TestExecutionResult): string {
  const now = new Date().toISOString();
  const passed = tcResult.passed ? 'PASSED' : 'FAILED';
  const passedColor = tcResult.passed ? '#28a745' : '#dc3545';

  let stepsHtml = '';
  if (Array.isArray(tcResult.steps)) {
    stepsHtml = tcResult.steps
      .map((step, idx) => {
        const stepPassed = step.passed ? 'PASS' : 'FAIL';
        const stepColor = step.passed ? '#28a745' : '#dc3545';

        // Extract and validate filename (prevent path traversal and XSS)
        const rawFilename = step.screenshotPath.split('/').pop() || `step-${idx}.png`;
        const imgFilename = isValidScreenshotFilename(rawFilename) ? rawFilename : null;

        const imgHtml = imgFilename
          ? `<img src="./${escapeHtml(imgFilename)}" style="max-width: 100%; border: 1px solid #ccc; border-radius: 3px;" alt="Step ${idx + 1} screenshot" />`
          : `<div style="padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 3px; color: #666; font-size: 12px;">Screenshot unavailable (invalid filename)</div>`;

        return `
    <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
      <div style="margin-bottom: 10px;">
        <strong>Step ${idx + 1}: ${escapeHtml(step.gherkin)}</strong><br/>
        <span style="font-size: 12px; color: #666;">Action: ${escapeHtml(step.action)}</span><br/>
        <span style="font-size: 12px; color: #666;">Result: ${escapeHtml(step.result)}</span>
      </div>
      <div style="margin-bottom: 10px;">
        <span style="display: inline-block; padding: 4px 8px; background-color: ${stepColor}; color: white; border-radius: 3px; font-weight: bold; font-size: 12px;">
          ${stepPassed}
        </span>
      </div>
      <div style="margin-top: 10px;">
        ${imgHtml}
      </div>
    </div>`;
      })
      .join('');
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Test Evidence - ${escapeHtml(tcId)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
    .container { max-width: 1000px; margin: 0 auto; background-color: white; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 6px 6px 0 0; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { font-size: 14px; opacity: 0.9; }
    .content { padding: 30px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .info-table tr { border-bottom: 1px solid #eee; }
    .info-table td { padding: 12px; font-size: 14px; }
    .info-table td:first-child { font-weight: bold; width: 150px; background-color: #f9f9f9; }
    .result-badge { display: inline-block; padding: 8px 16px; background-color: ${passedColor}; color: white; border-radius: 4px; font-weight: bold; font-size: 14px; }
    .steps { margin-top: 30px; }
    .steps h2 { font-size: 18px; margin-bottom: 20px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .footer { border-top: 1px solid #eee; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Test Execution Evidence</h1>
      <p>Test Case: ${escapeHtml(tcId)}</p>
    </div>
    <div class="content">
      <table class="info-table">
        <tr><td>Test Case ID</td><td>${escapeHtml(tcId)}</td></tr>
        <tr><td>Status</td><td><span class="result-badge">${passed}</span></td></tr>
        <tr><td>Reason</td><td>${escapeHtml(tcResult.reason)}</td></tr>
        <tr><td>Timestamp</td><td>${escapeHtml(now)}</td></tr>
        ${Array.isArray(tcResult.steps) ? `<tr><td>Total Steps</td><td>${tcResult.steps.length}</td></tr>` : ''}
        ${Array.isArray(tcResult.steps) ? `<tr><td>Passed Steps</td><td>${tcResult.steps.filter(s => s.passed).length}</td></tr>` : ''}
      </table>
      ${stepsHtml ? `<div class="steps"><h2>Step Details</h2>${stepsHtml}</div>` : ''}
    </div>
    <div class="footer">
      Generated at ${escapeHtml(now)} | Mastra QA Certification
    </div>
  </div>
</body>
</html>`;
}

// --- Helpers para derivar IDs únicos con fallbacks (compatibilidad standalone) ---

/**
 * Deriva o fallback de execId: si viene executionId, usalo; sino, sanitiza appUrl.
 * Esto permite que el workflow funcione sin executionId pero con memoria aislada por appUrl.
 */
function deriveExecId(inputData: { executionId?: string; appUrl: string }): string {
  if (inputData.executionId) {
    return inputData.executionId;
  }
  // Fallback: sanitiza appUrl para generar un ID único (pero acotado a la app, no a la ejecución)
  return `url-${inputData.appUrl.replace(/[^a-z0-9]/gi, '').slice(0, 20)}`;
}

/**
 * Deriva o fallback de iteración: si viene iteration, usalo; sino, 0.
 */
function deriveIteration(iteration?: number): number {
  return iteration ?? 0;
}

/**
 * Deriva resourceId para el memory.resource: si viene resourceId, úsalo; sino, fallback a 'qa-certification'.
 */
function deriveResourceId(resourceId?: string): string {
  return resourceId ? `project-${resourceId}` : 'qa-certification';
}

/**
 * Watchdog contra cuelgues del agente o browser (unhandled rejections en agent-browser).
 * Envuelve una promesa en Promise.race con un timeout que resuelve en error.
 * Defensa contra: waitForNavigation huérfanas, browser crashes, LLM delays anormales.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);
}

// ===========================
// SCHEMAS DE AGENTES (structuredOutput)
// ===========================

// Schema para respuesta del explore-app step
const exploreAppResultSchema = z.object({
  pagesDiscovered: z.number().default(0),
  formsDiscovered: z.number().default(0),
});

// Schema para respuesta del create-user-stories step
const userStoriesResultSchema = z.object({
  totalStories: z.number().default(0),
  totalCriteria: z.number().default(0),
});

// Schema para respuesta del design-gherkin-tests step
const testDesignResultSchema = z.object({
  totalTestCases: z.number().default(0),
});

// Schema para respuesta del execute-tests step (test executor agent)
const stepResultSchema = z.object({
  gherkin: z.string().default(''),
  action: z.string().default(''),
  result: z.string().default(''),
  passed: z.boolean().default(false),
  screenshotPath: z.string().default(''),
});

const testExecutionResultSchema = z.object({
  id: z.string().default(''),
  passed: z.boolean().default(false),
  reason: z.string().default(''),
  steps: z.array(stepResultSchema).optional().default([]),
});

// Schema para respuesta del generate-report step
const reportResultSchema = z.object({
  reportPath: z.string(),
  maturityScore: z.number().default(0),
  maturityClassification: z.string().default('Regular'),
});

// ===========================
// SCHEMAS DE ENTRADA Y SALIDA
// ===========================

export const qaCertificationInputSchema = z.object({
  appUrl: z.string().describe('URL de la aplicación corriendo'),
  qaPlanPath: z.string().describe('Ruta del plan de QA dentro del sandbox'),
  certificationPath: z.string().describe('Carpeta de salida (qa-output/...)'),
  testSuitePath: z.string().describe('Carpeta fija de la suite de tests, reutilizada entre iteraciones'),
  regenerateSuite: z.boolean().default(false).describe('Si true, borra y regenera la suite aunque exista'),
  mode: z
    .enum(['positivos', 'negativos', 'borde', 'e2e'])
    .default('positivos')
    .describe('Modo de prueba'),
  taskId: z.string().describe('ID de la tarea'),
  branch: z.string().describe('Rama de feature'),
  repoUrl: z.string().describe('URL del repositorio'),
  detectedStack: z
    .any()
    .optional()
    .describe('Stack tecnológico detectado (opcional)'),
  onlyTestIds: z
    .array(z.string())
    .optional()
    .describe('Si presente, ejecutar SOLO estos test case IDs (TC-nn). Si vacio, ejecutar suite completa.'),
  executionId: z.string().optional().describe('ID de ejecución único (opcional, para aislar memoria por tarea)'),
  iteration: z.number().optional().describe('Número de iteración actual (opcional, para aislar memoria por iteración)'),
  resourceId: z.string().optional().describe('ID del recurso/proyecto para aislar memoria (opcional, fallback a qa-certification)'),
});

export const qaCertificationOutputSchema = z.object({
  passed: z.boolean().describe('Si la certificación pasó'),
  maturityScore: z.number().describe('Puntuación de madurez 0-100'),
  totalTests: z.number().describe('Total de test cases'),
  failedTests: z
    .array(
      z.object({
        id: z.string(),
        reason: z.string(),
        evidencePath: z.string().optional(),
      })
    )
    .describe('Test cases que fallaron'),
  reportPath: z.string().describe('Ruta del reporte final'),
  notes: z.string().describe('Notas adicionales (contexto para code-supervisor)'),
});

// ===========================
// STEP 1: APP EXPLORER
// ===========================

const exploreAppStep = createStep({
  id: 'explore-app',
  description: 'Navega la app y genera functional-discovery.md (o reutiliza suite existente)',
  inputSchema: qaCertificationInputSchema,
  outputSchema: z.object({
    ...qaCertificationInputSchema.shape,
    onlyTestIds: z.array(z.string()).optional(),
    discoveryPath: z.string(),
    pagesDiscovered: z.number(),
    formsDiscovered: z.number(),
    suiteReady: z.boolean().optional(),
    suiteTestCount: z.number().optional(),
    step1Error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    try {
      // --- Ensure QA browser (CDP or local) is ready ---
      const browserReady = await ensureQaBrowser();
      if (!browserReady.ready) {
        throw new Error(`QA browser not ready (${browserReady.mode}): ${browserReady.logs}`);
      }

      // --- Check determinista: ¿existe suite ya generada? ---

      // Sanitizacion: testSuitePath llega como input del workflow (invocable
      // directo via playground/API) y se usa en comandos de shell del sandbox.
      // Se pasa como argumento posicional ($1), nunca interpolado en el script.
      if (
        !/^[A-Za-z0-9._/-]+$/.test(inputData.testSuitePath) ||
        !inputData.testSuitePath.startsWith('/workspace/') ||
        inputData.testSuitePath.includes('..')
      ) {
        throw new Error(`testSuitePath invalido o fuera de /workspace: ${inputData.testSuitePath}`);
      }

      // Si regenerateSuite es true, limpiar la suite existente
      if (inputData.regenerateSuite && projectSandbox.executeCommand) {
        try {
          await projectSandbox.executeCommand('sh', ['-c', 'rm -rf -- "$1"', 'sh', inputData.testSuitePath]);
        } catch {
          // Ignorar si falla (puede no existir)
        }
      }

      // Contar test cases existentes en la suite
      let suiteTestCount = 0;
      if (projectSandbox.executeCommand) {
        try {
          const listResult = await projectSandbox.executeCommand('sh', [
            '-c',
            'ls -- "$1"/test-cases/TC-*.md 2>/dev/null | wc -l',
            'sh',
            inputData.testSuitePath,
          ]);
          suiteTestCount = listResult.success
            ? parseInt(listResult.stdout?.trim() || '0', 10)
            : 0;
        } catch {
          suiteTestCount = 0;
        }
      }

      // Si hay TCs existentes, la suite está lista: reutilizar sin agente
      if (suiteTestCount > 0) {
        return {
          ...inputData,
          discoveryPath: `${inputData.testSuitePath}/functional-discovery.md`,
          pagesDiscovered: 0, // No se explora de nuevo
          formsDiscovered: 0,
          suiteReady: true,
          suiteTestCount,
        };
      }

      // --- Primera vez: explorar app y generar discovery en testSuitePath ---
      const agent = appExplorerAgent;

      const prompt = `Navega la aplicación en ${inputData.appUrl} y genera functional-discovery.md en ${inputData.testSuitePath}.

URL: ${inputData.appUrl}
Test Suite Path: ${inputData.testSuitePath}

${
  inputData.detectedStack
    ? `Stack detectado:
\`\`\`json
${JSON.stringify(inputData.detectedStack, null, 2)}
\`\`\``
    : ''
}

Ejecuta el flujo:
1. browser_goto a ${inputData.appUrl}
2. browser_snapshot + browser_screenshot del estado inicial
3. Explora la estructura sistematicamente
4. Documenta todas las páginas, formularios y flujos encontrados
5. Guarda functional-discovery.md en ${inputData.testSuitePath} usando workspace write_file
6. Retorna resumen JSON con: discoveryPath, pagesDiscovered, formsDiscovered

Responde SOLO con JSON válido (sin markdown ni explicaciones).`;

      const execId = deriveExecId(inputData);
      const iter = deriveIteration(inputData.iteration);
      const resource = deriveResourceId(inputData.resourceId);

      const stream = await agent.stream(prompt, {
        memory: {
          thread: `qa-explore-${execId}-iter-${iter}`,
          resource,
        },
        maxSteps: 25,
        structuredOutput: { schema: exploreAppResultSchema, model: { id: 'opencode-go/qwen3.7-plus' } },
        modelSettings: { maxRetries: 2 },
      });
      // Watchdog: 8 min timeout against unhandled rejections (browser crashes, LLM hangs)
      let parsedResult: { pagesDiscovered?: number; formsDiscovered?: number } | null = null;
      try {
        parsedResult = await withTimeout(stream.object, 8 * 60_000, 'explore-app');
      } catch {
        // Fallback a defaults si no parsea
        parsedResult = null;
      }

      const finalResult = {
        pagesDiscovered: parsedResult?.pagesDiscovered ?? 0,
        formsDiscovered: parsedResult?.formsDiscovered ?? 0,
      };

      return {
        ...inputData,
        discoveryPath: `${inputData.testSuitePath}/functional-discovery.md`,
        pagesDiscovered: finalResult.pagesDiscovered,
        formsDiscovered: finalResult.formsDiscovered,
        suiteReady: false,
      };
    } catch (error) {
      return {
        ...inputData,
        discoveryPath: '',
        pagesDiscovered: 0,
        formsDiscovered: 0,
        step1Error: String(error),
      };
    }
  },
});

// ===========================
// STEP 2: USER STORY CREATOR
// ===========================

const createUserStoriesStep = createStep({
  id: 'create-user-stories',
  description: 'Crea historias de usuario a partir del descubrimiento y plan de QA',
  inputSchema: z.object({
    ...qaCertificationInputSchema.shape,
    discoveryPath: z.string().optional(),
    suiteReady: z.boolean().optional(),
    suiteTestCount: z.number().optional(),
    step1Error: z.string().optional(),
  }),
  outputSchema: z.object({
    ...qaCertificationInputSchema.shape,
    onlyTestIds: z.array(z.string()).optional(),
    discoveryPath: z.string().optional(),
    pagesDiscovered: z.number().optional(),
    formsDiscovered: z.number().optional(),
    storiesPath: z.string().optional(),
    totalStories: z.number().optional(),
    totalCriteria: z.number().optional(),
    suiteReady: z.boolean().optional(),
    suiteTestCount: z.number().optional(),
    step1Error: z.string().optional(),
    step2Error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.step1Error) {
      return inputData;
    }

    // --- Skip si la suite ya está lista ---
    if (inputData.suiteReady) {
      return {
        ...inputData,
        storiesPath: `${inputData.testSuitePath}/user-stories.md`,
        totalStories: 0, // No se regeneran
        totalCriteria: 0,
      };
    }

    try {
      const agent = userStoryCreatorAgent;

      // Construir prompt condicionalmente: omitir referencia al discovery si no existe
      let discoverySection = '';
      if (inputData.discoveryPath && inputData.discoveryPath.trim()) {
        discoverySection = `2. Usa workspace read_file para leer ${inputData.discoveryPath} como complemento (rutas, selectores, estado real de la app)
`;
      } else {
        discoverySection = `2. No hay descubrimiento disponible. La fuente exclusiva es el plan de QA aprobado.
`;
      }

      const prompt = `Crea historias de usuario a partir del plan de QA aprobado.

QA Plan Path: ${inputData.qaPlanPath}
${inputData.discoveryPath ? `Discovery Path: ${inputData.discoveryPath}` : ''}
Test Suite Path: ${inputData.testSuitePath}
Test Mode: ${inputData.mode}

Ejecuta el flujo:
1. Usa workspace read_file para leer ${inputData.qaPlanPath} PRIMERO — es el contrato aprobado por el humano y la FUENTE DE VERDAD
${discoverySection}3. Crea historias de usuario que cubran TODOS los escenarios del plan para el modo ${inputData.mode}
4. Incluye criterios de aceptación verificables basados en el plan
5. Guarda user-stories.md en ${inputData.testSuitePath} usando workspace write_file
6. Retorna resumen JSON con: storiesPath, totalStories, totalCriteria

Responde SOLO con JSON válido (sin markdown).`;

      const execId = deriveExecId(inputData);
      const iter = deriveIteration(inputData.iteration);
      const resource = deriveResourceId(inputData.resourceId);

      const stream = await agent.stream(prompt, {
        memory: {
          thread: `qa-stories-${inputData.mode}-${execId}-iter-${iter}`,
          resource,
        },
        maxSteps: 25,
        structuredOutput: { schema: userStoriesResultSchema, model: { id: 'opencode-go/qwen3.7-plus' } },
        modelSettings: { maxRetries: 2 },
      });

      let parsedResult: { totalStories?: number; totalCriteria?: number } | null = null;
      try {
        parsedResult = await stream.object;
      } catch {
        // Fallback a defaults si no parsea
        parsedResult = null;
      }

      const finalResult = {
        totalStories: parsedResult?.totalStories ?? 0,
        totalCriteria: parsedResult?.totalCriteria ?? 0,
      };

      return {
        ...inputData,
        onlyTestIds: inputData.onlyTestIds,
        storiesPath: `${inputData.testSuitePath}/user-stories.md`,
        totalStories: finalResult.totalStories,
        totalCriteria: finalResult.totalCriteria,
      };
    } catch (error) {
      return {
        ...inputData,
        step2Error: String(error),
      };
    }
  },
});

// ===========================
// STEP 3: GHERKIN TEST DESIGNER
// ===========================

const designGherkinTestsStep = createStep({
  id: 'design-gherkin-tests',
  description: 'Diseña test cases en formato Gherkin basados en plan de QA',
  inputSchema: z.object({
    ...qaCertificationInputSchema.shape,
    discoveryPath: z.string().optional(),
    pagesDiscovered: z.number().optional(),
    formsDiscovered: z.number().optional(),
    storiesPath: z.string().optional(),
    totalStories: z.number().optional(),
    totalCriteria: z.number().optional(),
    suiteReady: z.boolean().optional(),
    suiteTestCount: z.number().optional(),
    step1Error: z.string().optional(),
    step2Error: z.string().optional(),
  }),
  outputSchema: z.object({
    ...qaCertificationInputSchema.shape,
    onlyTestIds: z.array(z.string()).optional(),
    discoveryPath: z.string().optional(),
    pagesDiscovered: z.number().optional(),
    formsDiscovered: z.number().optional(),
    storiesPath: z.string().optional(),
    totalStories: z.number().optional(),
    totalCriteria: z.number().optional(),
    testCasesPath: z.string().optional(),
    totalTestCases: z.number().optional(),
    suiteReady: z.boolean().optional(),
    suiteTestCount: z.number().optional(),
    step1Error: z.string().optional(),
    step2Error: z.string().optional(),
    step3Error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.step1Error || inputData.step2Error) {
      return inputData;
    }

    // --- Skip si la suite ya está lista ---
    if (inputData.suiteReady) {
      return {
        ...inputData,
        testCasesPath: `${inputData.testSuitePath}/test-cases`,
        totalTestCases: inputData.suiteTestCount || 0,
      };
    }

    try {
      const agent = gherkinTestDesignerAgent;

      // Construir prompt condicionalmente: omitir URL si está vacía
      const appUrlSection = inputData.appUrl && inputData.appUrl.trim() ? `App URL: ${inputData.appUrl}` : '';

      const prompt = `Diseña test cases Gherkin a partir del plan de QA aprobado y las historias de usuario.

QA Plan Path: ${inputData.qaPlanPath}
Stories Path: ${inputData.storiesPath}
${appUrlSection}
Test Suite Path: ${inputData.testSuitePath}
Test Mode: ${inputData.mode}

Ejecuta el flujo:
1. Usa workspace read_file para leer ${inputData.qaPlanPath} PRIMERO — contiene los escenarios Given/When/Then aprobados
2. Usa workspace read_file para leer ${inputData.storiesPath}
3. Diseña test cases en formato Gherkin adaptados al modo ${inputData.mode}
4. Garantiza que CADA criterio de aceptación del plan tenga al menos un TC de cobertura
5. Crea carpeta ${inputData.testSuitePath}/test-cases/ (usar workspace create_directory)
6. Guarda cada TC como TC-{nn}-{descripcion}.md usando workspace write_file
7. Retorna resumen JSON con: testCasesPath, totalTestCases

Responde SOLO con JSON válido.`;

      const execId = deriveExecId(inputData);
      const iter = deriveIteration(inputData.iteration);
      const resource = deriveResourceId(inputData.resourceId);

      const stream = await agent.stream(prompt, {
        memory: {
          thread: `qa-gherkin-${inputData.mode}-${execId}-iter-${iter}`,
          resource,
        },
        maxSteps: 25,
        structuredOutput: { schema: testDesignResultSchema, model: { id: 'opencode-go/qwen3.7-plus' } },
        modelSettings: { maxRetries: 2 },
      });

      let parsedResult: { totalTestCases?: number } | null = null;
      try {
        parsedResult = await stream.object;
      } catch {
        // Fallback a defaults si no parsea
        parsedResult = null;
      }

      const finalResult = {
        totalTestCases: parsedResult?.totalTestCases ?? 0,
      };

      return {
        ...inputData,
        onlyTestIds: inputData.onlyTestIds,
        testCasesPath: `${inputData.testSuitePath}/test-cases`,
        totalTestCases: finalResult.totalTestCases,
      };
    } catch (error) {
      return {
        ...inputData,
        step3Error: String(error),
      };
    }
  },
});

// ===========================
// STEP 4: PLAYWRIGHT TEST EXECUTOR (LOOP SECUENCIAL POR TC)
// ===========================

// Presupuesto de tiempo para ejecucion de tests: 30 minutos
const EXECUTION_BUDGET_MS = 30 * 60_000;

const executeTestsStep = createStep({
  id: 'execute-tests',
  description: 'Ejecuta los test cases con Playwright (secuencial, uno por uno)',
  inputSchema: z.object({
    ...qaCertificationInputSchema.shape,
    testCasesPath: z.string().optional(),
    totalTestCases: z.number().optional(),
    step1Error: z.string().optional(),
    step2Error: z.string().optional(),
    step3Error: z.string().optional(),
  }),
  outputSchema: z.object({
    ...qaCertificationInputSchema.shape,
    testCasesPath: z.string().optional(),
    totalTestCases: z.number().optional(),
    executedTests: z.array(
      z.object({
        id: z.string(),
        passed: z.boolean(),
        reason: z.string().optional(),
        evidencePath: z.string().optional(),
      })
    ).optional(),
    totalTests: z.number().optional(),
    passedCount: z.number().optional(),
    failedCount: z.number().optional(),
    step1Error: z.string().optional(),
    step2Error: z.string().optional(),
    step3Error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.step1Error || inputData.step2Error || inputData.step3Error) {
      return inputData;
    }

    try {
      // Listado determinista de TCs (sin LLM)
      if (!projectSandbox.executeCommand) {
        throw new Error('El sandbox no soporta executeCommand');
      }

      // Sanitizacion: testCasesPath se usa en comando shell
      if (
        !/^[A-Za-z0-9._\/-]+$/.test(inputData.testCasesPath || '') ||
        !inputData.testCasesPath?.startsWith('/workspace/')
      ) {
        throw new Error(`testCasesPath invalido: ${inputData.testCasesPath}`);
      }

      // Listar archivos TC-*.md
      const listResult = await projectSandbox.executeCommand('sh', [
        '-c',
        'ls -- "$1"/TC-*.md 2>/dev/null | sort -V',
        'sh',
        inputData.testCasesPath,
      ]);

      let tcFiles: string[] = [];
      if (listResult.success && listResult.stdout) {
        tcFiles = listResult.stdout
          .trim()
          .split('\n')
          .filter((f) => f.trim());
      }

      // Extraer IDs deterministicamente (TC-{nn})
      const tcIds = tcFiles.map((f) => {
        const match = f.match(/TC-(\d+)/);
        return match ? `TC-${match[1]}` : null;
      }).filter(Boolean) as string[];

      // Filtro: si onlyTestIds esta presente, ejecutar SOLO esos (match exacto)
      let testsToExecute = tcIds;
      if (inputData.onlyTestIds && inputData.onlyTestIds.length > 0) {
        const filtered = tcIds.filter((id) => inputData.onlyTestIds!.includes(id));
        // Defensa: si el filtro da lista vacia (IDs desincronizados), ejecutar suite completa
        // para no quedarse sin hacer nada
        if (filtered.length === 0) {
          console.warn('[execute-tests] onlyTestIds solicitados no encontraron coincidencias en suite. Ejecutando suite completa como fallback.');
          testsToExecute = tcIds;
        } else {
          testsToExecute = filtered;
        }
      }

      const executedTests: Array<{
        id: string;
        passed: boolean;
        reason?: string;
        evidencePath?: string;
      }> = [];
      const startedAt = Date.now();
      const agent = playwrightTestExecutorAgent;

      for (const tcId of testsToExecute) {
        // Presupuesto de tiempo: si se agoto, marcar restantes como agotado
        const elapsedMs = Date.now() - startedAt;
        if (elapsedMs > EXECUTION_BUDGET_MS) {
          executedTests.push({
            id: tcId,
            passed: false,
            reason: 'presupuesto de tiempo de la iteracion agotado',
          });
          continue;
        }

        try {
          // Memoria unica por TC e iteracion para evitar arrastrar contexto
          const execId = deriveExecId(inputData);
          const iter = deriveIteration(inputData.iteration);
          const resource = deriveResourceId(inputData.resourceId);
          const threadId = `qa-executor-${tcId}-${execId}-iter-${iter}`;

          const evidenceDir = `${inputData.certificationPath}/evidence`;
          const prompt = `Ejecuta el test case ${tcId} en ${inputData.testCasesPath}.

Test Case ID: ${tcId}
Test Cases Path: ${inputData.testCasesPath}
App URL: ${inputData.appUrl}
Evidence Dir: ${evidenceDir}

Ejecuta el flujo:
1. Usa workspace read_file para leer ${inputData.testCasesPath}/${tcId}-*.md
2. Ejecuta cada paso Gherkin en el navegador (Given/When/Then), máx 10 pasos
3. En cada paso, usa capture_evidence_screenshot con stepLabel (ej: "01-given-setup") y evidenceDir = "${evidenceDir}"
   - El tool devuelve solo la ruta PNG, NO base64
   - Los archivos PNG se guardan en el sandbox y se versionan en git
4. Registra resultado de cada paso (PASS/FAIL) con la ruta PNG correspondiente
5. Responde SOLO con un JSON estructurado (sin HTML):
{
  "id": "${tcId}",
  "passed": true/false,
  "reason": "descripcion o razon de fallo",
  "steps": [
    {
      "gherkin": "Given ...",
      "action": "...",
      "result": "...",
      "passed": true/false,
      "screenshotPath": "/workspace/.../01-given.png"
    }
  ]
}`;

          const stream = await agent.stream(prompt, {
            memory: {
              thread: threadId,
              resource,
            },
            maxSteps: 50,
            structuredOutput: { schema: testExecutionResultSchema, model: { id: 'opencode-go/qwen3.7-plus' } },
            modelSettings: { maxRetries: 2 },
          });
          // Watchdog: 5 min timeout per TC against unhandled rejections (browser/LLM hangs)
          const parsedExecution = await withTimeout(stream.object, 5 * 60_000, `test-executor-${tcId}`);

          const htmlPath = `${inputData.certificationPath}/evidence/Evidencia-${tcId}.html`;
          let tcResult = {
            id: tcId,
            passed: false,
            reason: 'respuesta del executor no parseable',
            evidencePath: htmlPath,
          };

          let parsedExecutionResult: TestExecutionResult | null = null;

          try {
            if (parsedExecution) {
              parsedExecutionResult = parsedExecution as TestExecutionResult;
              tcResult = {
                id: tcId,
                passed: Boolean(parsedExecutionResult.passed),
                reason: parsedExecutionResult.reason || 'Sin descripción',
                evidencePath: htmlPath,
              };
            }
          } catch {
            // Si no parsea, mantener default (passed: false)
          }

          // Generar HTML determinísticamente si logramos parsear el JSON con steps
          if (parsedExecutionResult) {
            try {
              const htmlContent = buildEvidenceHtml(tcId, parsedExecutionResult);
              // Escribir HTML al sandbox via base64 -d para evitar escaping
              if (!projectSandbox.executeCommand) {
                throw new Error('projectSandbox.executeCommand not available');
              }

              const base64Html = Buffer.from(htmlContent).toString('base64');
              const writeResult = await projectSandbox.executeCommand('sh', [
                '-c',
                `echo "$1" | base64 -d > "$2"`,
                'sh',
                base64Html,
                htmlPath,
              ]);

              if (!writeResult.success) {
                console.error(`[execute-tests] Failed to write HTML for ${tcId}: ${writeResult.stderr}`);
              }
            } catch (htmlError) {
              console.error(`[execute-tests] HTML generation failed for ${tcId}:`, htmlError);
            }
          }

          executedTests.push(tcResult);
        } catch (tcError) {
          executedTests.push({
            id: tcId,
            passed: false,
            reason: tcError instanceof Error ? tcError.message : String(tcError),
          });
        }
      }

      const totalTests = executedTests.length;
      const passedCount = executedTests.filter((t) => t.passed).length;
      const failedCount = executedTests.filter((t) => !t.passed).length;

      return {
        ...inputData,
        executedTests,
        totalTests,
        passedCount,
        failedCount,
      };
    } catch (error) {
      return {
        ...inputData,
        executedTests: [],
        totalTests: 0,
        passedCount: 0,
        failedCount: 0,
      };
    }
  },
});

// ===========================
// STEP 5: EXECUTIVE REPORTER
// ===========================

const generateReportStep = createStep({
  id: 'generate-report',
  description: 'Genera reporte final de certificación',
  inputSchema: z.object({
    ...qaCertificationInputSchema.shape,
    executedTests: z.array(
      z.object({
        id: z.string(),
        passed: z.boolean(),
        reason: z.string().optional(),
        evidencePath: z.string().optional(),
      })
    ).optional(),
    totalTests: z.number().optional(),
    passedCount: z.number().optional(),
    failedCount: z.number().optional(),
    step1Error: z.string().optional(),
    step2Error: z.string().optional(),
    step3Error: z.string().optional(),
  }),
  outputSchema: z.object({
    ...qaCertificationInputSchema.shape,
    onlyTestIds: z.array(z.string()).optional(),
    executedTests: z.array(
      z.object({
        id: z.string(),
        passed: z.boolean(),
        reason: z.string().optional(),
        evidencePath: z.string().optional(),
      })
    ).optional(),
    totalTests: z.number().optional(),
    passedCount: z.number().optional(),
    failedCount: z.number().optional(),
    reportPath: z.string().optional(),
    maturityScore: z.number().optional(),
    maturityClassification: z.string().optional(),
    step1Error: z.string().optional(),
    step2Error: z.string().optional(),
    step3Error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    // Corrida parcial (re-test): calcular score por codigo, NO invocar agente
    if (inputData.onlyTestIds && inputData.onlyTestIds.length > 0) {
      const score = Math.round(
        ((inputData.passedCount || 0) / (inputData.totalTests || 1)) * 100
      );
      const classification =
        score >= 90 ? 'Excelente' : score >= 70 ? 'Bueno' : score >= 50 ? 'Regular' : 'Critico';

      return {
        ...inputData,
        onlyTestIds: inputData.onlyTestIds,
        reportPath: '',
        maturityScore: score,
        maturityClassification: classification,
      };
    }

    // Corrida completa: invocar agente reporter
    try {
      const agent = executiveReporterAgent;

      const prompt = `Genera el reporte de certificacion en ${inputData.certificationPath}.

Certification Path: ${inputData.certificationPath}
Test Suite Path: ${inputData.testSuitePath}
Total Tests: ${inputData.totalTests || 0}
Passed: ${inputData.passedCount || 0}
Failed: ${inputData.failedCount || 0}

Resultado de test cases ejecutados:
\`\`\`json
${JSON.stringify(inputData.executedTests || [], null, 2)}
\`\`\`

Ejecuta el flujo:
1. Usa workspace list_directory para listar ${inputData.certificationPath}/evidence
2. Para CADA HTML en evidence, extrae metricas de resultado
3. Calcula maturityScore: (${inputData.passedCount || 0} / ${inputData.totalTests || 1}) * 100 = X%
4. Clasifica segun escala:
   - >= 90%: Excelente
   - >= 70%: Bueno
   - >= 50%: Regular
   - < 50%: Critico
5. Compila lista de problemas encontrados (de test cases FAIL)
6. Usa workspace read_file para leer ${inputData.testSuitePath}/user-stories.md (la suite estable)
7. Genera Reporte-Certificacion.html usando template HTML profesional
8. Guarda en ${inputData.certificationPath}/Reporte-Certificacion.html usando workspace write_file
9. Retorna JSON: reportPath, maturityScore (numero), maturityClassification (texto)

Responde SOLO con JSON valido:
{
  "reportPath": "${inputData.certificationPath}/Reporte-Certificacion.html",
  "maturityScore": ${Math.round(((inputData.passedCount || 0) / (inputData.totalTests || 1)) * 100)},
  "maturityClassification": "Bueno/Excelente/Regular/Critico"
}`;

      const execId = deriveExecId(inputData);
      const iter = deriveIteration(inputData.iteration);
      const resource = deriveResourceId(inputData.resourceId);

      const stream = await agent.stream(prompt, {
        memory: {
          thread: `qa-reporter-${execId}-iter-${iter}`,
          resource,
        },
        maxSteps: 25,
        structuredOutput: { schema: reportResultSchema, model: { id: 'opencode-go/qwen3.7-plus' } },
        modelSettings: { maxRetries: 2 },
      });

      let parsedResult: { reportPath?: string; maturityScore?: number; maturityClassification?: string } | null = null;
      try {
        parsedResult = await stream.object;
      } catch {
        // Keep defaults
        parsedResult = null;
      }

      const defaultScore = Math.round(
        ((inputData.passedCount || 0) / (inputData.totalTests || 1)) * 100
      );

      const finalResult = {
        reportPath: parsedResult?.reportPath ?? `${inputData.certificationPath}/Reporte-Certificacion.html`,
        maturityScore: parsedResult?.maturityScore ?? defaultScore,
        maturityClassification: parsedResult?.maturityClassification ?? 'Regular',
      };

      // Auto-classify si no viene de la respuesta
      if (!parsedResult?.maturityClassification) {
        const score = finalResult.maturityScore;
        if (score >= 90) finalResult.maturityClassification = 'Excelente';
        else if (score >= 70) finalResult.maturityClassification = 'Bueno';
        else if (score >= 50) finalResult.maturityClassification = 'Regular';
        else finalResult.maturityClassification = 'Critico';
      }

      return {
        ...inputData,
        onlyTestIds: inputData.onlyTestIds,
        reportPath: finalResult.reportPath,
        maturityScore: finalResult.maturityScore,
        maturityClassification: finalResult.maturityClassification,
      };
    } catch (error) {
      const score = Math.round(
        ((inputData.passedCount || 0) / (inputData.totalTests || 1)) * 100
      );
      return {
        ...inputData,
        onlyTestIds: inputData.onlyTestIds,
        reportPath: `${inputData.certificationPath}/Reporte-Certificacion.html`,
        maturityScore: score,
        maturityClassification: score < 50 ? 'Critico' : 'Regular',
      };
    }
  },
});

// ===========================
// STEP 6: FINALIZE
// ===========================

const finalizeStep = createStep({
  id: 'finalize',
  description: 'Compila resultado final del workflow',
  inputSchema: z.object({
    ...qaCertificationInputSchema.shape,
    executedTests: z.array(
      z.object({
        id: z.string(),
        passed: z.boolean(),
        reason: z.string().optional(),
        evidencePath: z.string().optional(),
      })
    ).optional(),
    totalTests: z.number().optional(),
    passedCount: z.number().optional(),
    failedCount: z.number().optional(),
    reportPath: z.string().optional(),
    maturityScore: z.number().optional(),
    maturityClassification: z.string().optional(),
    step1Error: z.string().optional(),
    step2Error: z.string().optional(),
    step3Error: z.string().optional(),
  }),
  outputSchema: qaCertificationOutputSchema,
  execute: async ({ inputData }) => {
    // Chequear errores en steps críticos (1, 2, 3)
    if (inputData.step1Error) {
      return {
        passed: false,
        maturityScore: 0,
        totalTests: 0,
        failedTests: [],
        reportPath: '',
        notes: `App Explorer falló: ${inputData.step1Error}`,
      };
    }

    if (inputData.step2Error) {
      return {
        passed: false,
        maturityScore: 0,
        totalTests: 0,
        failedTests: [],
        reportPath: '',
        notes: `User Story Creator falló: ${inputData.step2Error}`,
      };
    }

    if (inputData.step3Error) {
      return {
        passed: false,
        maturityScore: 0,
        totalTests: 0,
        failedTests: [],
        reportPath: '',
        notes: `Gherkin Test Designer falló: ${inputData.step3Error}`,
      };
    }

    const totalTests = inputData.totalTests || 0;
    const passedCount = inputData.passedCount || 0;
    const failedCount = inputData.failedCount || 0;
    const executedTests = inputData.executedTests || [];

    const failedTestsArray = executedTests
      .filter((t) => !t.passed)
      .map((t) => ({
        id: t.id,
        reason: t.reason || 'Falló durante la ejecución',
        evidencePath: t.evidencePath,
      }));

    const passed = failedCount === 0 && totalTests > 0;
    const notes =
      totalTests === 0
        ? 'No se ejecutaron test cases'
        : failedCount > 0 && passedCount > 0
          ? `${passedCount} de ${totalTests} tests pasaron. Ver reporte para detalles.`
          : failedCount === totalTests
            ? 'Todos los tests fallaron. Ver reporte para detalles.'
            : `Certificación exitosa: ${passedCount} de ${totalTests} tests pasaron.`;

    return {
      passed,
      maturityScore: inputData.maturityScore || 0,
      totalTests,
      failedTests: failedTestsArray,
      reportPath: inputData.reportPath || '',
      notes,
    };
  },
});

// ===========================
// WORKFLOW PRINCIPAL: QA CERTIFICATION
// ===========================

export const qaCertificationWorkflow = createWorkflow({
  id: 'qa-certification',
  inputSchema: qaCertificationInputSchema,
  outputSchema: qaCertificationOutputSchema,
})
  .then(exploreAppStep)
  .then(createUserStoriesStep)
  .then(designGherkinTestsStep)
  .then(executeTestsStep)
  .then(generateReportStep)
  .then(finalizeStep)
  .commit();

// ===========================
// WORKFLOW: QA SUITE DESIGN (paralelo en iteración 1)
// ===========================

/**
 * Output schema para el workflow de diseño de suite.
 * Es simplificado: solo retorna testCasesPath y totalTestCases.
 */
export const qaSuiteDesignOutputSchema = z.object({
  testCasesPath: z.string().describe('Ruta de la carpeta de test cases generada'),
  totalTestCases: z.number().describe('Total de test cases diseñados'),
  storiesPath: z.string().optional().describe('Ruta del archivo user-stories.md'),
});

/**
 * Workflow de diseño paralelo de suite QA.
 * Reutiliza createUserStoriesStep y designGherkinTestsStep sin exploración de app.
 * Pensado para correr EN PARALELO con la implementación de código en la iteración 1.
 *
 * Flujo:
 * 1. Check determinista: si ya existen TCs en testSuitePath/test-cases/, termina early (idempotencia)
 * 2. createUserStoriesStep: genera user-stories.md desde qa-plan (sin discovery)
 * 3. designGherkinTestsStep: genera TCs Gherkin desde plan + stories (sin app URL)
 */
export const qaSuiteDesignWorkflow = createWorkflow({
  id: 'qa-suite-design',
  inputSchema: qaCertificationInputSchema,
  outputSchema: qaSuiteDesignOutputSchema,
})
  .then(
    createStep({
      id: 'check-suite-ready',
      description: 'Check determinista: si ya existen TCs, termina early (idempotencia)',
      inputSchema: qaCertificationInputSchema,
      outputSchema: z.object({
        ...qaCertificationInputSchema.shape,
        suiteReady: z.boolean().optional(),
        suiteTestCount: z.number().optional(),
        discoveryPath: z.string().optional(),
        step1Error: z.string().optional(),
      }),
      execute: async ({ inputData }) => {
        try {
          // Sanitizacion: testSuitePath se usa en comandos shell
          if (
            !/^[A-Za-z0-9._/-]+$/.test(inputData.testSuitePath) ||
            !inputData.testSuitePath.startsWith('/workspace/') ||
            inputData.testSuitePath.includes('..')
          ) {
            throw new Error(`testSuitePath invalido o fuera de /workspace: ${inputData.testSuitePath}`);
          }

          // Contar test cases existentes en la suite
          let suiteTestCount = 0;
          if (projectSandbox.executeCommand) {
            try {
              const listResult = await projectSandbox.executeCommand('sh', [
                '-c',
                'ls -- "$1"/test-cases/TC-*.md 2>/dev/null | wc -l',
                'sh',
                inputData.testSuitePath,
              ]);
              suiteTestCount = listResult.success
                ? parseInt(listResult.stdout?.trim() || '0', 10)
                : 0;
            } catch {
              suiteTestCount = 0;
            }
          }

          // Si hay TCs existentes, la suite está lista: retornar sin generar
          if (suiteTestCount > 0) {
            return {
              ...inputData,
              discoveryPath: '', // No hay discovery en diseño paralelo
              suiteReady: true,
              suiteTestCount,
              step1Error: undefined,
            };
          }

          // Suite no existe aún, continuar con generación
          return {
            ...inputData,
            discoveryPath: '', // Sin exploración de app en diseño paralelo
            suiteReady: false,
            step1Error: undefined,
          };
        } catch (error) {
          return {
            ...inputData,
            discoveryPath: '',
            suiteReady: false,
            step1Error: String(error),
          };
        }
      },
    })
  )
  .then(createUserStoriesStep)
  .then(designGherkinTestsStep)
  .then(
    createStep({
      id: 'finalize-suite-design',
      description: 'Compila resultado final del diseño de suite',
      inputSchema: z.object({
        ...qaCertificationInputSchema.shape,
        suiteReady: z.boolean().optional(),
        suiteTestCount: z.number().optional(),
        storiesPath: z.string().optional(),
        totalStories: z.number().optional(),
        totalCriteria: z.number().optional(),
        testCasesPath: z.string().optional(),
        totalTestCases: z.number().optional(),
        step1Error: z.string().optional(),
        step2Error: z.string().optional(),
        step3Error: z.string().optional(),
      }),
      outputSchema: qaSuiteDesignOutputSchema,
      execute: async ({ inputData }) => {
        // Si algún step falló, retornar error con defaults
        if (inputData.step1Error || inputData.step2Error || inputData.step3Error) {
          return {
            testCasesPath: '',
            totalTestCases: 0,
            storiesPath: '',
          };
        }

        // Si la suite estaba lista (check-suite-ready encontró TCs), usar count conocido
        if (inputData.suiteReady && inputData.suiteTestCount) {
          return {
            testCasesPath: `${inputData.testSuitePath}/test-cases`,
            totalTestCases: inputData.suiteTestCount,
            storiesPath: `${inputData.testSuitePath}/user-stories.md`,
          };
        }

        // Suite se generó en esta corrida
        return {
          testCasesPath: inputData.testCasesPath || `${inputData.testSuitePath}/test-cases`,
          totalTestCases: inputData.totalTestCases || 0,
          storiesPath: inputData.storiesPath || `${inputData.testSuitePath}/user-stories.md`,
        };
      },
    })
  )
  .commit();

// ===========================
// STEP: CREATE PR (exportado separadamente)
// ===========================

export interface CreatePullRequestInput {
  repoUrl: string;
  branch: string;
  taskId: string;
  qaSummary: {
    passed: boolean;
    maturityScore: number;
    totalTests: number;
    failedCount: number;
  };
  summary: string;
}

/**
 * Crea el Pull Request en GitHub via REST API. Es responsabilidad del lado QA:
 * SOLO se crea cuando la certificacion paso (guard interno). Nunca lanza
 * excepciones: devuelve { error } en caso de fallo.
 */
export async function createPullRequest(inputData: CreatePullRequestInput): Promise<{
  prUrl?: string;
  prNumber?: number;
  error?: string;
}> {
  if (!inputData.qaSummary.passed) {
    return { error: 'PR no creado: la certificacion QA no paso' };
  }
  try {
    const match = inputData.repoUrl.match(
      /github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/
    );
    if (!match) {
      return {
        error: `No se pudo parsear repoUrl: ${inputData.repoUrl}`,
      };
    }

      const [, owner, repo] = match;
      const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

      // Obtener rama default del repo
      const repoInfoResponse = await fetch(baseUrl, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!repoInfoResponse.ok) {
        return {
          error: `No se pudo obtener info del repo: ${repoInfoResponse.statusText}`,
        };
      }

      const repoInfo = (await repoInfoResponse.json()) as {
        default_branch?: string;
      };
      const defaultBranch = repoInfo.default_branch || 'main';

      // Crear PR
      const prBody = `## Certificación QA

**Task ID**: ${inputData.taskId}
**Rama**: ${inputData.branch}

### Resumen de Cambios
${inputData.summary}

### Resultados de QA
- **Estado**: ${inputData.qaSummary.passed ? '✅ PASÓ' : '❌ FALLÓ'}
- **Madurez**: ${inputData.qaSummary.maturityScore}%
- **Tests**: ${inputData.qaSummary.totalTests - inputData.qaSummary.failedCount}/${inputData.qaSummary.totalTests} pasaron
${inputData.qaSummary.failedCount > 0 ? `- **Fallos**: ${inputData.qaSummary.failedCount} test cases no pasaron` : ''}`;

      const prResponse = await fetch(`${baseUrl}/pulls`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `feat(${inputData.taskId}): Implementación certificada por QA`,
          head: inputData.branch,
          base: defaultBranch,
          body: prBody,
        }),
      });

      if (!prResponse.ok) {
        const errorData = (await prResponse.json()) as { message?: string };
        return {
          error: `Error al crear PR: ${errorData.message || prResponse.statusText}`,
        };
      }

      const prData = (await prResponse.json()) as {
        html_url?: string;
        number?: number;
      };

      return {
        prUrl: prData.html_url,
        prNumber: prData.number,
      };
  } catch (error) {
    return {
      error: `Excepción al crear PR: ${String(error)}`,
    };
  }
}

/** Wrapper como step de workflow por si se quiere cablear directo en un pipeline. */
export const createPrStep = createStep({
  id: 'create-pr',
  description: 'Crea un Pull Request en GitHub después del push (solo si QA pasó)',
  inputSchema: z.object({
    repoUrl: z.string(),
    branch: z.string(),
    taskId: z.string(),
    qaSummary: z.object({
      passed: z.boolean(),
      maturityScore: z.number(),
      totalTests: z.number(),
      failedCount: z.number(),
    }),
    summary: z.string().describe('Resumen de código/cambios'),
  }),
  outputSchema: z.object({
    prUrl: z.string().optional(),
    prNumber: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ inputData }) => createPullRequest(inputData),
});
