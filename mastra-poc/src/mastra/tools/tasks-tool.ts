import { createTool } from '@mastra/core/tools';
import { z } from 'zod/v4';
import fs from 'fs/promises';
import path from 'path';
import { QUEUE_DIR, DONE_DIR, PLANS_DIR } from '../paths';

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

export const approvePlansTool = createTool({
  id: 'task-approve-plans',
  description: 'Aprueba o rechaza los planes de una tarea cuyo task-pipeline está suspendido esperando aprobación humana (HITL). SOLO usar cuando el usuario confirme explícitamente la aprobación o el rechazo. Nunca aprobar por iniciativa propia.',
  inputSchema: z.object({
    approved: z.boolean().describe('true para aprobar los planes, false para rechazarlos'),
    feedback: z.string().optional().describe('Feedback adicional para el equipo de implementación (obligatorio si se rechaza)'),
    taskId: z.string().optional().describe('ID de la tarea para desambiguar si hay múltiples runs suspendidos'),
  }),
  outputSchema: z.object({
    resumed: z.boolean(),
    taskId: z.string().optional(),
    approved: z.boolean().optional(),
    pending: z.array(z.string()).optional(),
    message: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ approved, feedback, taskId }, { mastra }) => {
    try {
      if (!mastra) {
        return {
          resumed: false,
          message: 'Error: instancia de mastra no disponible',
          error: 'mastra-undefined',
        };
      }

      // Obtener el workflow task-pipeline
      const workflow = mastra.getWorkflowById('task-pipeline');
      if (!workflow) {
        return {
          resumed: false,
          message: 'Error: workflow task-pipeline no encontrado',
          error: 'workflow-not-found',
        };
      }

      // Listar todos los runs del workflow
      const runs = await workflow.listWorkflowRuns();
      if (!runs || runs.runs.length === 0) {
        return {
          resumed: false,
          message: 'No hay tareas en ejecución',
        };
      }

      // Filtrar runs suspendidos con step 'approve-plans'
      const suspendedRuns: Array<{
        workflowRun: any;
        suspendedTaskId: string;
        runId: string;
      }> = [];

      for (const run of runs.runs) {
        let snapshot: any = run.snapshot;
        if (typeof snapshot === 'string') {
          try {
            snapshot = JSON.parse(snapshot);
          } catch {
            continue;
          }
        }

        // Buscar el step 'approve-plans' en suspendedPaths
        if (
          snapshot &&
          typeof snapshot === 'object' &&
          snapshot.status === 'suspended' &&
          snapshot.suspendedPaths &&
          Object.keys(snapshot.suspendedPaths).includes('approve-plans')
        ) {
          // Extraer taskId de los pasos del snapshot
          const approveStepResult = snapshot.steps?.['approve-plans'];
          if (approveStepResult && approveStepResult.suspendPayload) {
            const suspendedTaskId = approveStepResult.suspendPayload.taskId;
            suspendedRuns.push({
              workflowRun: run,
              suspendedTaskId,
              runId: run.runId,
            });
          }
        }
      }

      if (suspendedRuns.length === 0) {
        return {
          resumed: false,
          message: 'No hay tareas esperando aprobación en el step approve-plans',
        };
      }

      // Filtrar por taskId si fue proporcionado
      let targetRun = suspendedRuns[0];
      if (taskId) {
        const matching = suspendedRuns.filter((r) => r.suspendedTaskId === taskId);
        if (matching.length === 0) {
          const availableIds = suspendedRuns.map((r) => r.suspendedTaskId);
          return {
            resumed: false,
            pending: availableIds,
            message: `El taskId "${taskId}" no se encontró. Tareas disponibles esperando aprobación: ${availableIds.join(', ')}`,
          };
        }
        targetRun = matching[0];
      } else if (suspendedRuns.length > 1) {
        // Múltiples runs suspendidos y no se especificó taskId
        const availableIds = suspendedRuns.map((r) => r.suspendedTaskId);
        return {
          resumed: false,
          pending: availableIds,
          message: `Hay ${suspendedRuns.length} tareas esperando aprobación. Especificá el taskId: ${availableIds.join(', ')}`,
        };
      }

      // Crear una instancia de Run para reanudar
      const run = await workflow.createRun({ runId: targetRun.runId });

      // Disparar resume en background (no awaitar el resultado completo)
      const resumePromise = run.resume({
        step: 'approve-plans',
        resumeData: { approved, feedback },
      });

      resumePromise.catch((err) => {
        console.error('[task-approve-plans] resume fallo:', err instanceof Error ? err.message : String(err));
      });

      return {
        resumed: true,
        taskId: targetRun.suspendedTaskId,
        approved,
        message: `Pipeline reanudado para tarea ${targetRun.suspendedTaskId}. Decision: ${approved ? 'APROBADO' : 'RECHAZADO'}. Seguí el progreso en la pestaña Workflows.`,
      };
    } catch (error) {
      return {
        resumed: false,
        message: 'Error al procesar aprobación',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
