import { projectSandbox } from '../../workspaces';

/**
 * Teardown determinista del sandbox (best-effort, nunca lanza excepciones).
 *
 * 1. Baja la app: `docker compose down -v` en el repo (si hay compose) y mata
 *    procesos de script en background.
 * 2. Detiene y DESTRUYE el contenedor del sandbox via la API nativa de
 *    DockerSandbox (stop() + destroy()). Como no hay bind mount, todo el
 *    contenido del workspace muere con el contenedor — por eso el pipeline
 *    SIEMPRE pushea la rama antes de llegar aca.
 *
 * Si el proceso host crashea antes de este teardown, el contenedor queda vivo:
 * DockerSandbox se reconecta por id/label ('mastra-task-sandbox') en la
 * proxima corrida, o se limpia a mano con `docker rm -f mastra-task-sandbox`.
 */

export interface TeardownResult {
  cleaned: boolean;
  details: string;
}

export async function teardownSandbox(repoPath: string): Promise<TeardownResult> {
  const details: string[] = [];

  // 1) Bajar la app del compose (contenedores hermanos en el daemon del host)
  try {
    if (projectSandbox.executeCommand) {
      const down = await projectSandbox.executeCommand(
        'sh',
        ['-c', `cd "${repoPath}" 2>/dev/null && docker compose down -v 2>&1 || true`],
        { timeout: 120_000 },
      );
      details.push(down.success ? 'App detenida (compose down -v)' : `compose down con avisos: ${down.stderr.slice(-300)}`);
      await projectSandbox.executeCommand('sh', ['-c', 'pkill -f "npm run" 2>/dev/null || true'], { timeout: 15_000 });
    }
  } catch (error) {
    details.push(`No se pudo bajar la app: ${error instanceof Error ? error.message : String(error)}`);
  }

  // 2) Detener y destruir el contenedor del sandbox
  try {
    await projectSandbox.stop();
    details.push('Sandbox detenido');
  } catch (error) {
    details.push(`stop() fallo: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    await projectSandbox.destroy();
    details.push('Sandbox destruido (contenedor eliminado)');
  } catch (error) {
    details.push(`destroy() fallo: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { cleaned: true, details: details.join('. ') };
}
