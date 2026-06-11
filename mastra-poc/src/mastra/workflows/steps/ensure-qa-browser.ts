import { execFile } from 'child_process';
import { promisify } from 'util';
import { QA_BROWSER_CDP_URL } from '../../browsers/qa-browser';

const execFileAsync = promisify(execFile);

const CONTAINER_NAME = 'mastra-qa-browser';
const CONTAINER_IMAGE = 'ghcr.io/browserless/chromium:latest';
const HOST_PORT = '9222';
const CONTAINER_PORT = '3000';

/**
 * Ensure QA browser (CDP) is ready for test execution.
 *
 * Gestiona programáticamente el contenedor Docker del browser sin depender de
 * docker-compose (que requería resolución de rutas a archivos que no existen
 * cuando mastra dev corre con cwd=.mastra/output).
 *
 * Flujo:
 * 1. Verifica disponibilidad del daemon Docker (docker info)
 * 2. Inspecciona el contenedor mastra-qa-browser:
 *    - Si está running: pasa directo al polling de salud
 *    - Si existe pero no corre: docker start
 *    - Si no existe: docker run con la config (puertos, env vars, restart policy)
 * 3. Realiza polling del endpoint CDP http://localhost:9222/json/version (~30 reintentos x 2s)
 *
 * La configuración del contenedor (puerto 9222→3000, env vars de browserless,
 * restart policy) vive acá porque el step ejecuta en el host y no puede depender
 * de archivos compose externos.
 *
 * Called at start of exploreAppStep to cover both pipeline and standalone workflows.
 */
export async function ensureQaBrowser(): Promise<{
  ready: boolean;
  mode: 'cdp';
  logs?: string;
}> {
  try {
    // Quick check: Docker daemon must be running
    await execFileAsync('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 10_000 });
  } catch (error) {
    const logs = error instanceof Error ? error.message : String(error);
    return {
      ready: false,
      mode: 'cdp',
      logs: `Docker daemon no disponible. Iniciá Docker Desktop antes de correr la certificacion QA. Detalle: ${logs}`,
    };
  }

  try {
    // Step 1: Check container status via docker inspect
    console.log(`[ensure-qa-browser] Inspeccionando contenedor ${CONTAINER_NAME}...`);
    let containerStatus: string | null = null;

    try {
      const inspectResult = await execFileAsync(
        'docker',
        ['inspect', CONTAINER_NAME, '--format', '{{.State.Status}}'],
        { timeout: 10_000 }
      );
      containerStatus = inspectResult.stdout.trim();
      console.log(`[ensure-qa-browser] Estado actual del contenedor: ${containerStatus}`);
    } catch (error) {
      // Container does not exist
      console.log(`[ensure-qa-browser] Contenedor no existe, será creado`);
    }

    // Step 2: Manage container lifecycle
    if (containerStatus === 'running') {
      console.log(`[ensure-qa-browser] Contenedor ya está corriendo`);
    } else if (containerStatus) {
      // Container exists but is not running (exited, paused, created, etc.)
      console.log(
        `[ensure-qa-browser] Contenedor existe pero no corre (status: ${containerStatus}). Iniciando...`
      );
      try {
        await execFileAsync('docker', ['start', CONTAINER_NAME], { timeout: 30_000 });
        console.log(`[ensure-qa-browser] Contenedor iniciado exitosamente`);
      } catch (error) {
        const logs = error instanceof Error ? error.message : String(error);
        console.error(`[ensure-qa-browser] Fallo al iniciar contenedor:`, logs);
        return {
          ready: false,
          mode: 'cdp',
          logs: `No se pudo iniciar el contenedor ${CONTAINER_NAME}: ${logs}`,
        };
      }
    } else {
      // Container does not exist, create it
      console.log(`[ensure-qa-browser] Creando y levantando contenedor ${CONTAINER_NAME}...`);
      try {
        const runResult = await execFileAsync(
          'docker',
          [
            'run',
            '-d',
            '--name',
            CONTAINER_NAME,
            '-p',
            `${HOST_PORT}:${CONTAINER_PORT}`,
            '-e',
            'SESSION_TIMEOUT=1800000',
            '-e',
            'MAX_CONCURRENT_SESSIONS=5',
            '-e',
            'KEEP_ALIVE=true',
            '--restart',
            'unless-stopped',
            CONTAINER_IMAGE,
          ],
          { timeout: 600_000, maxBuffer: 1024 * 1024 } // Pull de imagen puede tomar minutos
        );
        console.log(
          `[ensure-qa-browser] Contenedor creado: ${runResult.stdout.trim().substring(0, 12)}`
        );
      } catch (error) {
        const logs = error instanceof Error ? error.message : String(error);
        console.error(`[ensure-qa-browser] Fallo al crear contenedor:`, logs);
        return {
          ready: false,
          mode: 'cdp',
          logs: `No se pudo crear el contenedor ${CONTAINER_NAME}: ${logs}`,
        };
      }
    }

    // Step 3: Poll CDP endpoint for health (~30 retries x 2s = 60s total).
    // QA_BROWSER_CDP_URL es ws:// (para Playwright), pero el healthcheck va por
    // el endpoint HTTP de CDP: fetch no soporta el esquema ws://.
    const httpBase = QA_BROWSER_CDP_URL.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');
    const cdpHealthUrl = `${httpBase}/json/version`;
    const maxRetries = 30;
    const retryDelayMs = 2000;

    console.log(`[ensure-qa-browser] Realizando polling del endpoint CDP ${cdpHealthUrl}...`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(cdpHealthUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`[ensure-qa-browser] Endpoint CDP saludable en intento ${attempt}`);
          return { ready: true, mode: 'cdp' };
        }
      } catch {
        // Not ready yet (timeout, network error, etc.)
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }

    // Timeout reached
    console.error(
      `[ensure-qa-browser] Endpoint CDP no saludable después de ${maxRetries * retryDelayMs / 1000}s`
    );
    return {
      ready: false,
      mode: 'cdp',
      logs: `Endpoint CDP ${cdpHealthUrl} no respondió después de ${maxRetries} reintentos`,
    };
  } catch (error) {
    const logs = error instanceof Error ? error.message : String(error);
    console.error(`[ensure-qa-browser] Fallo al asegurar browser:`, logs);
    return {
      ready: false,
      mode: 'cdp',
      logs,
    };
  }
}
