import { createTool } from '@mastra/core/tools';
import { z } from 'zod/v4';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

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

export const doneTool = createTool({
  id: 'task-done-write',
  description: 'Place a completed task file in .tasks/done. Creates the file with the given content.',
  inputSchema: z.object({
    filename: z.string().describe('Name of the file to create in done'),
    content: z.string().describe('Content to write to the file'),
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

export const plansTool = createTool({
  id: 'task-plans-write',
  description: 'Place a plan file in .plans/. Creates the file with the given content.',
  inputSchema: z.object({
    filename: z.string().describe('Name of the file to create in plans'),
    content: z.string().describe('Content to write to the file'),
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
