import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod/v4';
import { detectedStackSchema } from '../schemas/detected-stack';
import { appExplorerAgent } from '../agents/app-explorer-agent';
import { userStoryCreatorAgent } from '../agents/user-story-creator-agent';
import { gherkinTestDesignerAgent } from '../agents/gherkin-test-designer-agent';
import { playwrightTestExecutorAgent } from '../agents/playwright-test-executor-agent';
import { executiveReporterAgent } from '../agents/executive-reporter-agent';
import { projectSandbox } from '../workspaces';

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
    discoveryPath: z.string(),
    pagesDiscovered: z.number(),
    formsDiscovered: z.number(),
    suiteReady: z.boolean().optional(),
    suiteTestCount: z.number().optional(),
    step1Error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    try {
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

      const stream = await agent.stream(prompt, {
        memory: {
          thread: `qa-${inputData.appUrl.replace(/[^a-z0-9]/gi, '')}`,
          resource: 'qa-certification',
        },
        maxSteps: 25,
        modelSettings: { maxRetries: 5 },
      });
      const resultText = await stream.text;

      let parsedResult = { pagesDiscovered: 0, formsDiscovered: 0 };
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        const pageMatch = resultText.match(/(\d+)\s*p[aá]ginas/i);
        const formMatch = resultText.match(/(\d+)\s*formularios/i);
        parsedResult = {
          pagesDiscovered: pageMatch ? parseInt(pageMatch[1], 10) : 0,
          formsDiscovered: formMatch ? parseInt(formMatch[1], 10) : 0,
        };
      }

      return {
        ...inputData,
        discoveryPath: `${inputData.testSuitePath}/functional-discovery.md`,
        pagesDiscovered: parsedResult.pagesDiscovered || 0,
        formsDiscovered: parsedResult.formsDiscovered || 0,
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

      const prompt = `Crea historias de usuario a partir del descubrimiento y el plan de QA aprobado.

QA Plan Path: ${inputData.qaPlanPath}
Discovery Path: ${inputData.discoveryPath}
Test Suite Path: ${inputData.testSuitePath}
Test Mode: ${inputData.mode}

Ejecuta el flujo:
1. Usa workspace read_file para leer ${inputData.qaPlanPath} PRIMERO — es el contrato aprobado por el humano y la FUENTE DE VERDAD
2. Usa workspace read_file para leer ${inputData.discoveryPath} como complemento (rutas, selectores, estado real de la app)
3. Crea historias de usuario que cubran TODOS los escenarios del plan para el modo ${inputData.mode}
4. Incluye criterios de aceptación verificables basados en el plan
5. Guarda user-stories.md en ${inputData.testSuitePath} usando workspace write_file
6. Retorna resumen JSON con: storiesPath, totalStories, totalCriteria

Responde SOLO con JSON válido (sin markdown).`;

      const stream = await agent.stream(prompt, {
        memory: {
          thread: `qa-stories-${inputData.mode}`,
          resource: 'qa-certification',
        },
        maxSteps: 25,
        modelSettings: { maxRetries: 5 },
      });
      const resultText = await stream.text;

      let parsedResult = { totalStories: 0, totalCriteria: 0 };
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        const storyMatch = resultText.match(/(\d+)\s*historias?/i);
        const critMatch = resultText.match(/(\d+)\s*criterios?/i);
        parsedResult = {
          totalStories: storyMatch ? parseInt(storyMatch[1], 10) : 0,
          totalCriteria: critMatch ? parseInt(critMatch[1], 10) : 0,
        };
      }

      return {
        ...inputData,
        storiesPath: `${inputData.testSuitePath}/user-stories.md`,
        totalStories: parsedResult.totalStories || 0,
        totalCriteria: parsedResult.totalCriteria || 0,
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

      const prompt = `Diseña test cases Gherkin a partir del plan de QA aprobado y las historias de usuario.

QA Plan Path: ${inputData.qaPlanPath}
Stories Path: ${inputData.storiesPath}
App URL: ${inputData.appUrl}
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

      const stream = await agent.stream(prompt, {
        memory: {
          thread: `qa-gherkin-${inputData.mode}`,
          resource: 'qa-certification',
        },
        maxSteps: 25,
        modelSettings: { maxRetries: 5 },
      });
      const resultText = await stream.text;

      let parsedResult = { totalTestCases: 0 };
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        const tcMatch = resultText.match(/(\d+)\s*test\s*cases?/i);
        parsedResult = {
          totalTestCases: tcMatch ? parseInt(tcMatch[1], 10) : 0,
        };
      }

      return {
        ...inputData,
        testCasesPath: `${inputData.testSuitePath}/test-cases`,
        totalTestCases: parsedResult.totalTestCases || 0,
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
// STEP 4: PLAYWRIGHT TEST EXECUTOR
// ===========================

const executeTestsStep = createStep({
  id: 'execute-tests',
  description: 'Ejecuta los test cases con Playwright',
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
      const agent = playwrightTestExecutorAgent;

      const prompt = `Ejecuta los test cases en ${inputData.testCasesPath}.

Test Cases Path: ${inputData.testCasesPath}
App URL: ${inputData.appUrl}
Certification Path: ${inputData.certificationPath}

Ejecuta el flujo:
1. Usa workspace list_directory para listar ${inputData.testCasesPath}
2. Para CADA archivo TC-{nn}-*.md:
   a. Usa workspace read_file para leer el test case
   b. Ejecuta cada paso Gherkin en el navegador (Given/When/Then)
   c. Captura screenshots en cada paso (devuelven base64)
   d. Embebe los screenshots en un HTML de evidencia
   e. Guarda el HTML en ${inputData.certificationPath}/evidence/Evidencia-TC-{nn}.html
   f. Registra: TC-id, passed (boolean), pasos pasados/fallidos, razón de fallos
3. Ejecuta TODOS los test cases incluso si algunos fallan
4. Retorna JSON: array de {id, passed, reason?, evidencePath}

Responde SOLO con JSON array válido:
[
  { "id": "TC-01", "passed": true, "evidencePath": "qa-output/.../evidence/Evidencia-TC-01.html" },
  { "id": "TC-02", "passed": false, "reason": "El formulario no se cargó", "evidencePath": "..." }
]`;

      const stream = await agent.stream(prompt, {
        memory: {
          thread: `qa-executor-${inputData.appUrl.replace(/[^a-z0-9]/gi, '')}`,
          resource: 'qa-certification',
        },
        maxSteps: 40,
        modelSettings: { maxRetries: 5 },
      });
      const resultText = await stream.text;

      let executedTests: any[] = [];
      try {
        const jsonMatch = resultText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          executedTests = JSON.parse(jsonMatch[0]);
        }
      } catch {
        const idMatches = resultText.match(/TC-\d+/g) || [];
        executedTests = idMatches.map((id) => ({
          id,
          passed: resultText.includes(`${id}.*passed.*true`) ? true : false,
        }));
      }

      const totalTests = executedTests.length;
      const passedCount = executedTests.filter((t) => t.passed).length;
      const failedCount = totalTests - passedCount;

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
    try {
      const agent = executiveReporterAgent;

      const prompt = `Genera el reporte de certificación en ${inputData.certificationPath}.

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
4. Clasifica según escala:
   - >= 90%: Excelente
   - >= 70%: Bueno
   - >= 50%: Regular
   - < 50%: Critico
5. Compila lista de problemas encontrados (de test cases FAIL)
6. Usa workspace read_file para leer ${inputData.testSuitePath}/user-stories.md (la suite estable)
7. Genera Reporte-Certificacion.html usando template HTML profesional
8. Guarda en ${inputData.certificationPath}/Reporte-Certificacion.html usando workspace write_file
9. Retorna JSON: reportPath, maturityScore (número), maturityClassification (texto)

Responde SOLO con JSON válido:
{
  "reportPath": "${inputData.certificationPath}/Reporte-Certificacion.html",
  "maturityScore": ${Math.round(((inputData.passedCount || 0) / (inputData.totalTests || 1)) * 100)},
  "maturityClassification": "Bueno/Excelente/Regular/Critico"
}`;

      const stream = await agent.stream(prompt, {
        memory: {
          thread: `qa-reporter-${inputData.certificationPath.replace(/[^a-z0-9]/gi, '')}`,
          resource: 'qa-certification',
        },
        maxSteps: 25,
        modelSettings: { maxRetries: 5 },
      });
      const resultText = await stream.text;

      let parsedResult = {
        reportPath: `${inputData.certificationPath}/Reporte-Certificacion.html`,
        maturityScore: Math.round(
          ((inputData.passedCount || 0) / (inputData.totalTests || 1)) * 100
        ),
        maturityClassification: 'Regular',
      };

      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Keep defaults
      }

      if (!parsedResult.maturityClassification) {
        const score = parsedResult.maturityScore;
        if (score >= 90) parsedResult.maturityClassification = 'Excelente';
        else if (score >= 70) parsedResult.maturityClassification = 'Bueno';
        else if (score >= 50) parsedResult.maturityClassification = 'Regular';
        else parsedResult.maturityClassification = 'Critico';
      }

      return {
        ...inputData,
        reportPath: parsedResult.reportPath,
        maturityScore: parsedResult.maturityScore,
        maturityClassification: parsedResult.maturityClassification,
      };
    } catch (error) {
      const score = Math.round(
        ((inputData.passedCount || 0) / (inputData.totalTests || 1)) * 100
      );
      return {
        ...inputData,
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
// WORKFLOW PRINCIPAL
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
