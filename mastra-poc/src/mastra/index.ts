import 'dotenv/config';

import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, MastraStorageExporter, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { taskPipelineWorkflow } from './workflows/task-pipeline';
import { qaCertificationWorkflow, qaSuiteDesignWorkflow } from './workflows/qa-certification-workflow';
import { parentSupervisorAgent } from './agents/parent-supervisor-agent';
import { taskRefinerAgent } from './agents/task-refiner-agent';
import { stackDetectorAgent } from './agents/stack-detector-agent';
import { planCreatorAgent } from './agents/plan-creator-agent';
import { codeSupervisorAgent } from './agents/code-supervisor-agent';
import { qaSupervisorAgent } from './agents/qa-supervisor-agent';
import { appExplorerAgent } from './agents/app-explorer-agent';
import { userStoryCreatorAgent } from './agents/user-story-creator-agent';
import { gherkinTestDesignerAgent } from './agents/gherkin-test-designer-agent';
import { playwrightTestExecutorAgent } from './agents/playwright-test-executor-agent';
import { executiveReporterAgent } from './agents/executive-reporter-agent';
import { docWriterAgent } from './agents/doc-writer-agent';
import { codeReviewerAgent } from './agents/code-reviewer-agent';
import { frontendArchitectAgent } from './agents/frontend-architect-agent';
import { backendArchitectAgent } from './agents/backend-architect-agent';
import { queueTool, doneTool, plansTool, approvePlansTool } from './tools/tasks-tool';
import { writeTaskTool } from './tools/write-task-tool';
import { taskMemory } from './memory';
import { skillsWorkspace, projectWorkspace, frontendArchitectWorkspace, backendArchitectWorkspace, qaWorkspace } from './workspaces';

export const mastra = new Mastra({
  workflows: { taskPipelineWorkflow, qaCertificationWorkflow, qaSuiteDesignWorkflow },
  agents: {
    parentSupervisorAgent,
  },
  tools: { queueTool, doneTool, plansTool, approvePlansTool, writeTaskTool },
  memory: { taskMemory },
  mcpServers: {},
  workspace: skillsWorkspace,
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db",
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    }
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'debug',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new MastraStorageExporter(),
          new MastraPlatformExporter(),
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(),
        ],
      },
    },
  }),
});

mastra.addWorkspace(projectWorkspace);
mastra.addWorkspace(frontendArchitectWorkspace);
mastra.addWorkspace(backendArchitectWorkspace);
mastra.addWorkspace(qaWorkspace);

// Inyecta storage/logger/observability en agentes ocultos (no expuestos en el registro público).
// Solo parentSupervisorAgent queda visible en playground/API.
const hiddenAgents = [
  taskRefinerAgent,
  stackDetectorAgent,
  planCreatorAgent,
  codeSupervisorAgent,
  qaSupervisorAgent,
  appExplorerAgent,
  userStoryCreatorAgent,
  gherkinTestDesignerAgent,
  playwrightTestExecutorAgent,
  executiveReporterAgent,
  docWriterAgent,
  codeReviewerAgent,
  frontendArchitectAgent,
  backendArchitectAgent,
];

for (const agent of hiddenAgents) {
  (agent as unknown as { __registerMastra(m: Mastra): void }).__registerMastra(mastra);
}
