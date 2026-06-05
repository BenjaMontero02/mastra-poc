import { MCPServer } from '@mastra/mcp';
import { appExplorerAgent } from '../agents/app-explorer-agent';
import { userStoryCreatorAgent } from '../agents/user-story-creator-agent';
import { gherkinTestDesignerAgent } from '../agents/gherkin-test-designer-agent';
import { playwrightTestExecutorAgent } from '../agents/playwright-test-executor-agent';
import { executiveReporterAgent } from '../agents/executive-reporter-agent';

export const qaPlaywrightMCP = new MCPServer({
  id: 'qa-playwright',
  name: 'QA Playwright MCP',
  version: '1.0.0',
  description: 'Servidor MCP que expone agentes especializados del pipeline de certificacion QA. Los agentes App Explorer y Playwright Test Executor usan AgentBrowser internamente para navegacion Playwright con snapshot+refs.',
  instructions: `Agentes QA disponibles como herramientas ask_:

- ask_appExplorerAgent: Explorar una aplicacion web y documentar funcionalidad
- ask_userStoryCreatorAgent: Crear historias de usuario a partir de discovery funcional
- ask_gherkinTestDesignerAgent: Diseinar test cases Gherkin (BDD)
- ask_playwrightTestExecutorAgent: Ejecutar test cases con Playwright en navegador
- ask_executiveReporterAgent: Generar reporte HTML de certificacion QA`,
  tools: {},
  agents: {
    appExplorerAgent,
    userStoryCreatorAgent,
    gherkinTestDesignerAgent,
    playwrightTestExecutorAgent,
    executiveReporterAgent,
  },
});
