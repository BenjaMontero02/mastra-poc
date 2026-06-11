import { Tool, type ToolExecutionContext } from '@mastra/core/tools';
import { z } from 'zod';
import { AgentBrowser } from '@mastra/agent-browser';
import { qaWorkspace } from '../workspaces';
import path from 'path';

/**
 * Schema for capturing evidence screenshots.
 * Receives step label and evidence directory path, captures screenshot
 * directly from Playwright Page, writes PNG to sandbox, returns path only.
 */
const captureEvidenceScreenshotSchema = z.object({
  stepLabel: z.string().describe('Label for the step (e.g., "Given-setup", "When-login", "Then-verify")'),
  evidenceDir: z.string().describe('Path inside sandbox where to save screenshot (e.g., /workspace/cert-iter-1/evidence)'),
});

type CaptureEvidenceScreenshotInput = z.infer<typeof captureEvidenceScreenshotSchema>;

/**
 * Create the capture_evidence_screenshot tool.
 *
 * This tool captures a screenshot from the current Playwright page
 * (accessed via AgentBrowser's protected threadManager) and saves it
 * as a PNG file inside the project sandbox. The tool returns only the
 * file path — never the base64 data — to avoid inflating LLM context.
 *
 * @param browser - The AgentBrowser instance
 * @returns Tool definition for use in agent
 */
export function createCaptureEvidenceScreenshotTool(
  browser: AgentBrowser
): Tool<CaptureEvidenceScreenshotInput, { path: string }> {
  return new Tool({
    id: 'capture_evidence_screenshot',
    description: 'Captura screenshot de la página actual y lo guarda como PNG en el sandbox. Devuelve solo la ruta del archivo (sin base64).',
    inputSchema: captureEvidenceScreenshotSchema,
    execute: async (input: CaptureEvidenceScreenshotInput, context?: ToolExecutionContext) => {
      try {
        // Sanitize stepLabel to create a valid filename
        const sanitized = input.stepLabel
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        // Normalize and validate evidenceDir path (prevent path traversal)
        const normalizedDir = path.posix.normalize(input.evidenceDir);
        if (
          !normalizedDir.startsWith('/workspace/') ||
          normalizedDir.split('/').includes('..') ||
          !/^\/workspace\/[A-Za-z0-9._\/-]+$/.test(normalizedDir)
        ) {
          throw new Error(`Invalid evidenceDir (path traversal detected): ${input.evidenceDir}`);
        }

        // Get threadManager from browser via casting (it's protected but known to exist)
        const threadManager = (browser as any).threadManager;
        if (!threadManager || typeof threadManager.getPageForThread !== 'function') {
          throw new Error('Cannot access threadManager from browser');
        }

        // Get threadId from execution context (for thread-isolated browsers)
        const threadId = context?.agent?.threadId;

        // Get current page from thread manager using threadId
        const page = await threadManager.getPageForThread(threadId);

        // Capture screenshot as PNG buffer
        const screenshotBuffer = await page.screenshot({ fullPage: false });

        // Create filename with timestamp-based ordering (HHMMSS-label)
        const now = new Date();
        const timestamp = now.getHours().toString().padStart(2, '0') +
          now.getMinutes().toString().padStart(2, '0') +
          now.getSeconds().toString().padStart(2, '0');
        const filename = `${timestamp}-${sanitized}.png`;

        // Normalize final filepath and validate it's still within workspace
        const filepath = path.posix.normalize(`${normalizedDir}/${filename}`);
        if (!filepath.startsWith('/workspace/')) {
          throw new Error(`Filepath escapes workspace: ${filepath}`);
        }

        // Write PNG directly via workspace filesystem (avoids shell argument limit)
        if (!qaWorkspace.filesystem) {
          throw new Error('qaWorkspace.filesystem not available');
        }

        await qaWorkspace.filesystem.writeFile(filepath, screenshotBuffer);

        // Return only the path (no base64)
        return { path: filepath };
      } catch (error) {
        throw new Error(
          `capture_evidence_screenshot failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  });
}
