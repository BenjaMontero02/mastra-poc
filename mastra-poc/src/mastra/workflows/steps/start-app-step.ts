import { projectSandbox } from '../../workspaces';
import type { DetectedStack } from '../../schemas/detected-stack';

/**
 * Arranque determinista de la aplicacion dentro del sandbox.
 *
 * Sin agentes LLM: ejecuta comandos directos via projectSandbox.executeCommand
 * y hace el health-check con fetch desde el HOST (que es donde corre el
 * browser de QA).
 *
 * Topología:
 * - Health-check: desde el HOST en http://localhost:{port} (fetch del host)
 * - appUrl (para browser QA):
 *   - Si QA_BROWSER_CDP_URL está definida (browser en Docker): http://host.docker.internal:{port}
 *   - Si no: http://localhost:{port} (browser local en el host)
 *
 * Metodos:
 * - compose (recomendado): `docker compose up -d --build`. Como el daemon es
 *   el del host (socket montado), los contenedores de la app son hermanos del
 *   sandbox y sus puertos publicados quedan accesibles en localhost del host.
 * - script (fallback): `nohup npm run dev|start` dentro del sandbox.
 *   LIMITACION: el contenedor del sandbox no publica puertos al host, por lo
 *   que QA no podra acceder a la app. Los repos deben preferir docker-compose.
 */

export interface StartAppResult {
  appUrl: string;
  started: boolean;
  method: 'compose' | 'script';
  port?: number;
  logs?: string;
}

const HEALTH_RETRIES = 30;
const HEALTH_INTERVAL_MS = 2000;

/**
 * Determina el host a usar en appUrl para el browser de QA.
 * Si el browser está en Docker (QA_BROWSER_CDP_URL definida), debe usar host.docker.internal.
 * Si el browser corre localmente en el host, usa localhost.
 */
function getAppHost(): string {
  return process.env.QA_BROWSER_CDP_URL ? 'host.docker.internal' : 'localhost';
}

async function exec(command: string, args: string[], cwd?: string, timeout = 120_000) {
  if (!projectSandbox.executeCommand) {
    throw new Error('El sandbox no soporta executeCommand');
  }
  return projectSandbox.executeCommand(command, args, { cwd, timeout });
}

async function hasComposeFile(repoPath: string): Promise<boolean> {
  const result = await exec('sh', [
    '-c',
    `test -f "${repoPath}/docker-compose.yml" || test -f "${repoPath}/docker-compose.yaml" || test -f "${repoPath}/compose.yml" || test -f "${repoPath}/compose.yaml"`,
  ]);
  return result.success;
}

function candidatePorts(detectedStack: DetectedStack): number[] {
  const ports = [detectedStack.port, 3000, 8080, 8000, 5173, 4200, 4000].filter(
    (p): p is number => typeof p === 'number',
  );
  return [...new Set(ports)];
}

/** Health-check desde el host: primer puerto que responda gana. */
async function healthCheck(ports: number[]): Promise<number | null> {
  for (let attempt = 0; attempt < HEALTH_RETRIES; attempt++) {
    for (const port of ports) {
      try {
        const res = await fetch(`http://localhost:${port}`, {
          signal: AbortSignal.timeout(1500),
        });
        // Cualquier respuesta HTTP (incluso 4xx) significa que hay un server escuchando
        if (res.status < 500 || res.status >= 200) return port;
      } catch {
        // sin server en ese puerto todavia
      }
    }
    await new Promise(resolve => setTimeout(resolve, HEALTH_INTERVAL_MS));
  }
  return null;
}

async function collectLogs(repoPath: string, method: 'compose' | 'script'): Promise<string> {
  const cmd =
    method === 'compose'
      ? `cd "${repoPath}" && docker compose logs --tail 50 2>&1`
      : 'tail -n 50 /tmp/app.log 2>/dev/null || echo "sin logs"';
  try {
    const result = await exec('sh', ['-c', cmd]);
    return (result.stdout + '\n' + result.stderr).trim().slice(-4000);
  } catch (error) {
    return `No se pudieron obtener logs: ${String(error)}`;
  }
}

export async function startApp(repoPath: string, detectedStack: DetectedStack): Promise<StartAppResult> {
  const ports = candidatePorts(detectedStack);

  try {
    const useCompose = await hasComposeFile(repoPath);

    if (useCompose) {
      const up = await exec('sh', ['-c', `cd "${repoPath}" && docker compose up -d --build 2>&1`], undefined, 600_000);
      if (!up.success) {
        return {
          appUrl: '',
          started: false,
          method: 'compose',
          logs: `docker compose up fallo (exit ${up.exitCode}):\n${(up.stdout + up.stderr).slice(-4000)}`,
        };
      }
      const port = await healthCheck(ports);
      if (port === null) {
        return {
          appUrl: '',
          started: false,
          method: 'compose',
          logs: `La app no respondio en los puertos ${ports.join(', ')} tras ${HEALTH_RETRIES * 2}s.\n${await collectLogs(repoPath, 'compose')}`,
        };
      }
      const appHost = getAppHost();
      return { appUrl: `http://${appHost}:${port}`, started: true, method: 'compose', port };
    }

    // Fallback script: el puerto NO se publica al host (ver LIMITACION arriba).
    await exec('sh', [
      '-c',
      `cd "${repoPath}" && (nohup npm run dev > /tmp/app.log 2>&1 || nohup npm run start > /tmp/app.log 2>&1) &`,
    ]);
    const port = await healthCheck(ports);
    if (port === null) {
      return {
        appUrl: '',
        started: false,
        method: 'script',
        logs: `Sin docker-compose.yml y la app no es accesible desde el host (limitacion del fallback script). Logs:\n${await collectLogs(repoPath, 'script')}`,
      };
    }
    const appHost = getAppHost();
    return { appUrl: `http://${appHost}:${port}`, started: true, method: 'script', port };
  } catch (error) {
    return {
      appUrl: '',
      started: false,
      method: 'compose',
      logs: `Error al levantar la app: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
