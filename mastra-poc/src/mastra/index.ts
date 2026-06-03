import { Mastra } from '@mastra/core/mastra';
import { Memory } from '@mastra/memory';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from "@mastra/duckdb";
import { MastraCompositeStore } from '@mastra/core/storage';
import { Observability, MastraStorageExporter, MastraPlatformExporter, SensitiveDataFilter } from '@mastra/observability';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { translatorAgent } from './agents/translator-agent';
import { codeReviewerAgent } from './agents/code-reviewer-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import { queueTool, doneTool, plansTool } from './tools/tasks-tool';
import { skillsWorkspace, projectWorkspace, docsWorkspace } from './workspaces';

const taskMemory = new Memory({
  name: 'Task Memory',
  options: {
    lastMessages: 50,
    workingMemory: {
      enabled: true,
    },
  },
});

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent, translatorAgent, codeReviewerAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  tools: { queueTool, doneTool, plansTool },
  memory: { taskMemory },
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
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new MastraStorageExporter(), // Persists observability events to Mastra Storage
          new MastraPlatformExporter(), // Sends observability events to Mastra Platform (if MASTRA_PLATFORM_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
});

mastra.addWorkspace(projectWorkspace);
mastra.addWorkspace(docsWorkspace);
