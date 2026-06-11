# Sandbox Docker personalizado

Imagen Docker personalizada para el sandbox del pipeline de tareas, que incluye:
- Node.js 22
- Git
- Docker CLI (para ejecutar docker-compose dentro del sandbox)
- Docker Compose Plugin
- curl (para health-checks)

## Construcción

Desde la raíz del proyecto:

```bash
docker build -t mastra-sandbox:latest -f docker/sandbox.Dockerfile docker/
```

Luego, el pipeline utilizará `mastra-sandbox:latest` como imagen del sandbox Docker en `projectWorkspace` (ver `src/mastra/workspaces.ts`).

## Cómo funciona

El sandbox monta el socket de Docker (`/var/run/docker.sock`) del host, permitiendo que:
1. El code-supervisor cree/valide `docker-compose.yml` dentro del sandbox
2. El pipeline levante la aplicación con `docker compose up -d --build` (determinista, sin agentes)
3. Los contenedores de la app sean hermanos del sandbox (corren en el Docker del host)
4. Los puertos publicados de la app queden accesibles en `localhost` del host (donde corre QA)

## Almacenamiento: todo vive en el sandbox

**No hay bind mount del workspace al host.** El repo clonado vive exclusivamente en el
filesystem del contenedor (`/workspace/<taskId>`) y se destruye con el teardown al cerrar
la tarea. La persistencia del trabajo se garantiza con el **push de la rama feature al
final de cada ciclo** (se pushea siempre, pase o no pase QA; el PR solo se crea si QA
certifica).

**Sandbox por tarea, con id unico:**
Cada tarea levanta su propio sandbox con id `mastra-task-sandbox-<taskId>`, evitando
reutilizar contenedores con archivos viejos de corridas previas crasheadas. Los contenedores
huerfanos se limpian best-effort en git-setup (antes de start()) mediante limpieza por
nombre y etiqueta de compose. Limpieza manual de huerfanos:
```bash
docker rm -f $(docker ps -aq --filter name=mastra-task-sandbox)
```

## ⚠️ Seguridad: socket de Docker montado

Montar `/var/run/docker.sock` le da al sandbox control total sobre el Docker del host
(equivalente a root en el host). Es un tradeoff aceptado para esta POC interna de un
solo usuario.

**Ruta de hardening si esto escala a uso real o multi-tenant**: interponer un proxy de
socket con superficie mínima de API, por ejemplo
[`tecnativa/docker-socket-proxy`](https://github.com/Tecnativa/docker-socket-proxy)
(habilitar solo `CONTAINERS`, `IMAGES`, `BUILD`, `NETWORKS`, `POST`; denegar `EXEC`
sobre contenedores ajenos, `VOLUMES` del host, etc.), y apuntar el `DOCKER_HOST` del
sandbox al proxy en lugar del socket real. Alternativas más pesadas: rootless Docker,
Sysbox o Kata Containers.
