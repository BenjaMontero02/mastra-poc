import { createTool } from '@mastra/core/tools';
import { z } from 'zod/v4';
import fs from 'fs/promises';
import path from 'path';
import { QUEUE_DIR } from '../paths';

export const writeTaskTool = createTool({
  id: 'task-queue-write',
  description:
    'Escribe una tarea refinada (especificacion funcional) en .tasks/queue/. El filename debe seguir el formato "TASK-XXX-slug-descriptivo.md". El content es la especificacion funcional completa en markdown.',
  inputSchema: z.object({
    filename: z.string().describe('Nombre del archivo, ej: TASK-001-login-sso-microsoft.md'),
    content: z.string().describe('Contenido completo de la especificacion funcional en markdown'),
  }),
  outputSchema: z.object({
    path: z.string(),
    done: z.boolean(),
  }),
  execute: async ({ filename, content }) => {
    await fs.mkdir(QUEUE_DIR, { recursive: true });
    const filePath = path.join(QUEUE_DIR, filename);
    await fs.writeFile(filePath, content, 'utf-8');
    return {
      path: filePath,
      done: true,
    };
  },
});
