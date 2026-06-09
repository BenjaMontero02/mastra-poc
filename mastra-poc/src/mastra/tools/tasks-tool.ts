import { createTool } from '@mastra/core/tools';
import { z } from 'zod/v4';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const QUEUE_DIR = path.join(PROJECT_ROOT, '.tasks', 'queue');
const DONE_DIR = path.join(PROJECT_ROOT, '.tasks', 'done');
const PLANS_DIR = path.join(PROJECT_ROOT, '.plans');

export const queueTool = createTool({
  id: 'task-queue-take',
  description: 'Take a task file from the queue. Reads and returns the content of a file in .tasks/queue. If no filename is provided, lists all available files in the queue.',
  inputSchema: z.object({
    filename: z.string().optional().describe('Name of the file to read from the queue. If omitted, lists all files.'),
  }),
  outputSchema: z.object({
    filename: z.string().nullable(),
    content: z.string().nullable(),
    files: z.array(z.string()).nullable(),
    done: z.boolean(),
  }),
  execute: async ({ filename }) => {
    await fs.mkdir(QUEUE_DIR, { recursive: true });

    if (!filename) {
      const entries = await fs.readdir(QUEUE_DIR);
      return {
        filename: null,
        content: null,
        files: entries,
        done: true,
      };
    }

    const filePath = path.join(QUEUE_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return {
      filename,
      content,
      files: null,
      done: true,
    };
  },
});

export const plansTool = createTool({
  id: 'task-plans-write',
  description: 'Guarda los planes generados en .plans/. La aprobacion humana se maneja en el workflow, no en la tool.',
  inputSchema: z.object({
    filename: z.string().describe('Name of the file to create in plans'),
    content: z.string().describe('Full plan content in markdown (code plan + QA plan)'),
  }),
  outputSchema: z.object({
    path: z.string(),
    done: z.boolean(),
  }),
  execute: async ({ filename, content }) => {
    await fs.mkdir(PLANS_DIR, { recursive: true });
    const filePath = path.join(PLANS_DIR, filename);
    await fs.writeFile(filePath, content, 'utf-8');
    return {
      path: filePath,
      done: true,
    };
  },
});

export const doneTool = createTool({
  id: 'task-done-write',
  description: 'Cierra la tarea moviendola a .tasks/done. La confirmacion humana se maneja externamente.',
  inputSchema: z.object({
    filename: z.string().describe('Name of the file to create in done'),
    content: z.string().describe('Final summary of the completed task'),
  }),
  outputSchema: z.object({
    path: z.string(),
    done: z.boolean(),
  }),
  execute: async ({ filename, content }) => {
    await fs.mkdir(DONE_DIR, { recursive: true });
    const filePath = path.join(DONE_DIR, filename);
    await fs.writeFile(filePath, content, 'utf-8');
    return {
      path: filePath,
      done: true,
    };
  },
});
