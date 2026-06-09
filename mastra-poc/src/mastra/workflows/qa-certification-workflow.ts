import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod/v4';
import { detectedStackSchema } from '../schemas/detected-stack';
import { appExplorerAgent } from '../agents/app-explorer-agent';
import { userStoryCreatorAgent } from '../agents/user-story-creator-agent';
import { gherkinTestDesignerAgent } from '../agents/gherkin-test-designer-agent';
import { playwrightTestExecutorAgent } from '../agents/playwright-test-executor-agent';
import { executiveReporterAgent } from '../agents/executive-reporter-agent';

// ===========================
// SCHEMAS DE ENTRADA Y SALIDA
// ===========================

export const qaCertificationInputSchema = z.object({
  appUrl: z.string().describe('URL de la aplicación corriendo'),
  qaPlanPath: z.string().describe('Ruta del plan de QA dentro del sandbox'),
  certificationPath: z.string().describe('Carpeta de salida (qa-output/...)'),
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
  description: 'Navega la app y genera functional-discovery.md',
  inputSchema: qaCertificationInputSchema,
  outputSchema: z.object({
    ...qaCertificationInputSchema.shape,
    discoveryPath: z.string(),
    pagesDiscovered: z.number(),
    formsDiscovered: z.number(),
    step1Error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    try {
      const agent = appExplorerAgent;

      const prompt = `Navega la aplicación en ${inputData.appUrl} y genera functional-discovery.md en ${inputData.certificationPath}.

URL: ${inputData.appUrl}
Certification Path: ${inputData.certificationPath}

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
5. Guarda functional-discovery.md en ${inputData.certificationPath} usando workspace write_file
6. Retorna resumen JSON con: discoveryPath, pagesDiscovered, formsDiscovered

Responde SOLO con JSON válido (sin markdown ni explicaciones).`;

      const result = await agent.generate(prompt, {
        memory: {
          thread: `qa-${inputData.appUrl.replace(/[^a-z0-9]/gi, '')}`,
          resource: 'qa-certification',
        },
        maxSteps: 25,
      });

      let parsedResult = { pagesDiscovered: 0, formsDiscovered: 0 };
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        const pageMatch = result.text.match(/(\d+)\s*p[aá]ginas/i);
        const formMatch = result.text.match(/(\d+)\s*formularios/i);
        parsedResult = {
          pagesDiscovered: pageMatch ? parseInt(pageMatch[1], 10) : 0,
          formsDiscovered: formMatch ? parseInt(formMatch[1], 10) : 0,
        };
      }

      return {
        ...inputData,
        discoveryPath: `${inputData.certificationPath}/functional-discovery.md`,
        pagesDiscovered: parsedResult.pagesDiscovered || 0,
        formsDiscovered: parsedResult.formsDiscovered || 0,
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
  description: 'Crea historias de usuario a partir del descubrimiento',
  inputSchema: z.object({
    ...qaCertificationInputSchema.shape,
    discoveryPath: z.string().optional(),
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
    step1Error: z.string().optional(),
    step2Error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.step1Error) {
      return inputData;
    }

    try {
      const agent = userStoryCreatorAgent;

      const prompt = `Crea historias de usuario a partir de ${inputData.discoveryPath}.

Discovery Path: ${inputData.discoveryPath}
Certification Path: ${inputData.certificationPath}
Test Mode: ${inputData.mode}

Ejecuta el flujo:
1. Usa workspace read_file para leer ${inputData.discoveryPath}
2. Analiza el descubrimiento funcional
3. Crea historias de usuario adaptadas al modo ${inputData.mode}
4. Incluye criterios de aceptación verificables
5. Guarda user-stories.md en ${inputData.certificationPath} usando workspace write_file
6. Retorna resumen JSON con: storiesPath, totalStories, totalCriteria

Responde SOLO con JSON válido (sin markdown).`;

      const result = await agent.generate(prompt, {
        memory: {
          thread: `qa-stories-${inputData.mode}`,
          resource: 'qa-certification',
        },
        maxSteps: 25,
      });

      let parsedResult = { totalStories: 0, totalCriteria: 0 };
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        const storyMatch = result.text.match(/(\d+)\s*historias?/i);
        const critMatch = result.text.match(/(\d+)\s*criterios?/i);
        parsedResult = {
          totalStories: storyMatch ? parseInt(storyMatch[1], 10) : 0,
          totalCriteria: critMatch ? parseInt(critMatch[1], 10) : 0,
        };
      }

      return {
        ...inputData,
        storiesPath: `${inputData.certificationPath}/user-stories.md`,
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
  description: 'Diseña test cases en formato Gherkin',
  inputSchema: z.object({
    ...qaCertificationInputSchema.shape,
    discoveryPath: z.string().optional(),
    pagesDiscovered: z.number().optional(),
    formsDiscovered: z.number().optional(),
    storiesPath: z.string().optional(),
    totalStories: z.number().optional(),
    totalCriteria: z.number().optional(),
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
    step1Error: z.string().optional(),
    step2Error: z.string().optional(),
    step3Error: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.step1Error || inputData.step2Error) {
      return inputData;
    }

    try {
      const agent = gherkinTestDesignerAgent;

      const prompt = `Diseña test cases Gherkin a partir de ${inputData.storiesPath}.

Stories Path: ${inputData.storiesPath}
App URL: ${inputData.appUrl}
Certification Path: ${inputData.certificationPath}
Test Mode: ${inputData.mode}

Ejecuta el flujo:
1. Usa workspace read_file para leer ${inputData.storiesPath}
2. Analiza cada historia de usuario
3. Diseña test cases en formato Gherkin adaptados al modo ${inputData.mode}
4. Crea carpeta ${inputData.certificationPath}/test-cases/ (usar workspace create_directory)
5. Guarda cada TC como TC-{nn}-{descripcion}.md usando workspace write_file
6. Retorna resumen JSON con: testCasesPath, totalTestCases

Responde SOLO con JSON válido.`;

      const result = await agent.generate(prompt, {
        memory: {
          thread: `qa-gherkin-${inputData.mode}`,
          resource: 'qa-certification',
        },
        maxSteps: 25,
      });

      let parsedResult = { totalTestCases: 0 };
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        const tcMatch = result.text.match(/(\d+)\s*test\s*cases?/i);
        parsedResult = {
          totalTestCases: tcMatch ? parseInt(tcMatch[1], 10) : 0,
        };
      }

      return {
        ...inputData,
        testCasesPath: `${inputData.certificationPath}/test-cases`,
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

      const result = await agent.generate(prompt, {
        memory: {
          thread: `qa-executor-${inputData.appUrl.replace(/[^a-z0-9]/gi, '')}`,
          resource: 'qa-certification',
        },
        maxSteps: 40,
      });

      let executedTests: any[] = [];
      try {
        const jsonMatch = result.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          executedTests = JSON.parse(jsonMatch[0]);
        }
      } catch {
        const idMatches = result.text.match(/TC-\d+/g) || [];
        executedTests = idMatches.map((id) => ({
          id,
          passed: result.text.includes(`${id}.*passed.*true`) ? true : false,
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
6. Usa workspace read_file para leer ${inputData.certificationPath}/user-stories.md (si existe)
7. Genera Reporte-Certificacion.html usando template HTML profesional
8. Guarda en ${inputData.certificationPath}/Reporte-Certificacion.html usando workspace write_file
9. Retorna JSON: reportPath, maturityScore (número), maturityClassification (texto)

Responde SOLO con JSON válido:
{
  "reportPath": "${inputData.certificationPath}/Reporte-Certificacion.html",
  "maturityScore": ${Math.round(((inputData.passedCount || 0) / (inputData.totalTests || 1)) * 100)},
  "maturityClassification": "Bueno/Excelente/Regular/Critico"
}`;

      const result = await agent.generate(prompt, {
        memory: {
          thread: `qa-reporter-${inputData.certificationPath.replace(/[^a-z0-9]/gi, '')}`,
          resource: 'qa-certification',
        },
        maxSteps: 25,
      });

      let parsedResult = {
        reportPath: `${inputData.certificationPath}/Reporte-Certificacion.html`,
        maturityScore: Math.round(
          ((inputData.passedCount || 0) / (inputData.totalTests || 1)) * 100
        ),
        maturityClassification: 'Regular',
      };

      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
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
