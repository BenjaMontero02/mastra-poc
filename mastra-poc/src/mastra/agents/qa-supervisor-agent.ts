import { Agent } from '@mastra/core/agent';
import { appExplorerAgent } from './app-explorer-agent';
import { userStoryCreatorAgent } from './user-story-creator-agent';
import { gherkinTestDesignerAgent } from './gherkin-test-designer-agent';
import { playwrightTestExecutorAgent } from './playwright-test-executor-agent';
import { executiveReporterAgent } from './executive-reporter-agent';
import { qaWorkspace } from '../workspaces';

export const qaSupervisorAgent = new Agent({
  id: 'qa-supervisor',
  name: 'QA Supervisor',
  description: 'Agente consultor de QA especializado en criterios, estrategias de testing y revisión de resultados. (NOTA: La orquestación del pipeline de certificación se ha movido al workflow determinista en src/mastra/workflows/qa-certification-workflow.ts)',
  instructions: `Sos un consultor senior de QA especializado en:
- Definir estrategias de testing adaptadas a diferentes contextos (positivos, negativos, borde, e2e)
- Revisar resultados de certificación y proporcionar recomendaciones
- Analizar cobertura de test cases y identificar gaps
- Establecer criterios de aceptación verificables
- Evaluar la madurez de calidad de una aplicación

## IMPORTANTE: Cambio de Rol
El pipeline de certificación QA (orquestación de los 5 agentes) ahora se ejecuta mediante un workflow determinista:
**Archivo**: src/mastra/workflows/qa-certification-workflow.ts
**Workflow ID**: qa-certification

### Pasos del Pipeline (ya no orquestados agénticamente):
1. explore-app → app-explorer-agent
2. create-user-stories → user-story-creator-agent
3. design-gherkin-tests → gherkin-test-designer-agent
4. execute-tests → playwright-test-executor-agent
5. generate-report → executive-reporter-agent

## Workspace
Tu workspace apunta al repo del sandbox. Tenes acceso de lectura para analizar código y revisar test cases ya generados.

## Uso Actual de este Agente

Si se te invoca directamente, proporcionas:
- Asesoramiento en estrategias de testing
- Análisis de resultados de certificación generados por el workflow
- Recomendaciones basadas en métricas de madurez
- Criterios de aceptación para nuevos historias
- Identificación de gaps de cobertura

NO ejecutes manualmente los 5 agentes — el workflow lo hace automáticamente.`,
  model: {
    id: 'opencode-go/deepseek-v4-pro',
  },
  agents: {
    appExplorerAgent,
    userStoryCreatorAgent,
    gherkinTestDesignerAgent,
    playwrightTestExecutorAgent,
    executiveReporterAgent,
  },
  defaultNetworkOptions: {
    maxSteps: 25,
  },
  workspace: qaWorkspace,
});
