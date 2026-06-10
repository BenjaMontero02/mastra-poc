import path from 'path';
import fs from 'fs';

/**
 * Sube desde startDir hasta encontrar un directorio que contenga `anchor`.
 * Ignora candidatos dentro de `.mastra`: el bundle de `mastra dev` (cwd
 * .mastra/output) puede contener copias parciales de carpetas como .agents.
 */
function findUp(anchor: string, startDir: string = process.cwd()): string | null {
  let dir = path.resolve(startDir);
  for (;;) {
    const insideBundle = dir.split(path.sep).includes('.mastra');
    if (!insideBundle && fs.existsSync(path.join(dir, anchor))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Raíz externa del proyecto (donde viven .tasks y .plans).
 * `mastra dev` corre con cwd=.mastra/output, así que no se puede asumir
 * una posición fija respecto del cwd: se busca hacia arriba.
 * Orden: env TASKS_ROOT → walk-up de .tasks → walk-up de .git → legacy cwd/..
 */
export const PROJECT_ROOT = (() => {
  if (process.env.TASKS_ROOT) return path.resolve(process.env.TASKS_ROOT);
  const byTasks = findUp('.tasks');
  if (byTasks) return byTasks;
  const byGit = findUp('.git');
  if (byGit) return byGit;
  console.warn(
    `[paths] No se encontró .tasks ni .git subiendo desde ${process.cwd()}; usando fallback cwd/.. — definí TASKS_ROOT en .env si las rutas quedan mal.`,
  );
  return path.resolve(process.cwd(), '..');
})();

/**
 * Raíz de la app Mastra (donde vive .agents/skills).
 * Orden: env APP_ROOT → walk-up de .agents/skills → cwd.
 */
export const APP_ROOT = (() => {
  if (process.env.APP_ROOT) return path.resolve(process.env.APP_ROOT);
  const byAgents = findUp(path.join('.agents', 'skills'));
  if (byAgents) return byAgents;
  return process.cwd();
})();

export const QUEUE_DIR = path.join(PROJECT_ROOT, '.tasks', 'queue');
export const DONE_DIR = path.join(PROJECT_ROOT, '.tasks', 'done');
export const PLANS_DIR = path.join(PROJECT_ROOT, '.plans');
export const SKILLS_DIR = path.join(APP_ROOT, '.agents', 'skills');
