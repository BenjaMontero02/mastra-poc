import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, MastraStorageExporter, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { weatherWorkflow } from './workflows/weather-workflow';
import { taskPipelineWorkflow } from './workflows/task-pipeline';
import { parentSupervisorAgent } from './agents/parent-supervisor-agent';
import { taskRefinerAgent } from './agents/task-refiner-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import { queueTool, doneTool, plansTool } from './tools/tasks-tool';
import { writeTaskTool } from './tools/write-task-tool';
import { taskMemory } from './memory';
import { skillsWorkspace, projectWorkspace, docsWorkspace, frontendArchitectWorkspace, backendArchitectWorkspace, qaWorkspace } from './workspaces';

export const mastra = new Mastra({
  workflows: { weatherWorkflow, taskPipelineWorkflow },
  agents: {
    parentSupervisorAgent,
    taskRefinerAgent,
  },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  tools: { queueTool, doneTool, plansTool, writeTaskTool },
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
mastra.addWorkspace(docsWorkspace);
mastra.addWorkspace(frontendArchitectWorkspace);
mastra.addWorkspace(backendArchitectWorkspace);
mastra.addWorkspace(qaWorkspace);
