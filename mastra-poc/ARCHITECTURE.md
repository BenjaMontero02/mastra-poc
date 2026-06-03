# Architecture - Task Pipeline System

## Decision 1: Agent hierarchy instead of workflow as main orchestrator

**Decisión**: El orquestador principal es un `Agent`, no un `Workflow`.

**Fundamento**: El padre supervisor debe tomar decisiones abiertas (a quién delegar, evaluar
resultados, decidir si re-iterar). Los workflows son para pipelines deterministas.
Lo único que requiere workflow es el mecanismo de human-in-the-loop (`suspend`/`resume`),
que solo existe en workflows. Por eso habrá un workflow mínimo como cáscara alrededor
del agente.

```
Agent parent-supervisor (toma decisiones)
  └── Workflow wrapper (solo provee HITL via suspend/resume)
```

## Decision 2: Sub-agentes como tools del padre

**Decisión**: Los supervisores (code, QA) son `agents` en el config del agente padre.
Mastra los expone como tools que el padre invoca pasando un prompt.

**Fundamento**: Esto mantiene el contexto aislado por agente. El padre decide exactamente
qué información pasa a cada sub-agente en su prompt. Los sub-agentes no comparten memoria
entre sí — evita contaminación de contexto.

```
parent-supervisor
  ├── llama a code-supervisor: "Implementá este plan: {plan}"
  │   └── code-supervisor delega a coders, devuelve resumen
  └── llama a qa-supervisor: "Probá esto. Código: {resumen}. Endpoint: {url}"
      └── qa-supervisor corre tests, devuelve { passed, failed, detalles }
```

## Decision 6: Memoria por hilo de tarea, no global

**Decisión**: El parent-supervisor tiene memoria. Cada tarea (archivo en `.tasks/queue`)
genera su propio `threadId`, aislando el contexto de cada ejecución.

**Fundamento**: La memoria es el diario del loop code↔QA↔fix. Sin memoria, cada iteración
arranca desde cero — el code-supervisor recibe solo los errores en el prompt y tiene
que re-descubrir la arquitectura. Con memoria, el padre orquesta con contexto completo.

```
task-001 (login-page.md)
├── threadId: "task-login-page-md"
├── parent-supervisor  ←  taskMemory (ve TODO el historial)
│   ├── iteración 1: code → QA → 3 fallos
│   ├── iteración 2: code (fix) → QA → 1 fallo
│   └── iteración 3: code (fix) → QA → OK ✓
│
├── code-supervisor  ←  sin memoria propia (recibe prompt del padre)
├── qa-supervisor    ←  sin memoria propia (recibe prompt del padre)
│
├── docs/            ←  artefactos de salida (filesystem, no memoria)
└── project/         ←  código generado (filesystem, no memoria)
```

**Qué va en cada lado:**

| Memoria del padre (thread) | Workspaces (filesystem) |
|---|---|
| "Code-supervisor generó X, QA falló en Y" | `docs/login-page/test-report.md` |
| "Fix aplicado: middleware cambiado" | `docs/login-page/architecture.md` |
| "QA pasó todos los tests en iteración 3" | `project/login-page/src/` |
| Diario interno del loop, decisiones | Artefactos finales para el humano |

**Configuración en Mastra:**

```ts
// src/mastra/index.ts
import { Memory } from '@mastra/memory';

const taskMemory = new Memory({
  name: 'Task Memory',
  options: {
    lastMessages: 50,       // contexto amplio para loops largos
    workingMemory: { enabled: true }, // estado estructurado entre iteraciones
  },
});

// En Mastra config:
memory: { taskMemory },

// El parent-supervisor usará: memory: taskMemory
// El threadId se genera del nombre de archivo de la tarea
```

**Por qué NO memoria en los sub-agentes:**

- Los sub-agentes son stateless tools invocados por el padre
- El padre les pasa el contexto exacto en el prompt
- Si tuvieran memoria, podrían "recordar" cosas de una tarea anterior → contaminación
- El padre es el único que necesita el contexto acumulado del loop

**Por qué NO memoria global para todas las tareas:**
- Cada tarea es un problema distinto (ej. login-page ≠ payment-flow)
- Un solo thread mezclaría contextos de tareas diferentes
- Cada archivo en `.tasks/queue` → su propio `threadId` → memoria aislada

## Decision 3: Tres workspaces separados

### skills (global)
- Path: `~/.agents/skills`
- Propósito: Skills compartidas por todos los agentes
- Modo: Read-only práctico (los agentes consultan skills, no las modifican)
- Registro: `workspace` global en Mastra config → heredado por todos los agentes

### project (code-supervisor + coders)
- Path: `C:\DEV\mastra-poc\workspaces\project`
- Propósito: Donde los agentes de código crean y modifican archivos
- Skills: hereda skills globales
- Registro: `addWorkspace()`, se asignará directamente al code-supervisor

### docs (qa-supervisor + testers)
- Path: `C:\DEV\mastra-poc\workspaces\docs`
- Mount `/project` read-only: el QA puede leer el código del proyecto para testear
  pero no puede modificarlo accidentalmente
- Propósito: Reportes de pruebas, logs, documentación generada por QA
- Skills: hereda skills globales
- Registro: `addWorkspace()`, se asignará directamente al qa-supervisor

```
workspaces/
├── project/     ← code-supervisor escribe código acá
└── docs/        ← qa-supervisor escribe reportes acá
    └── /project ← mount read-only a workspaces/project (lectura del código)
```

## Decision 4: Human-in-the-loop en aprobación de planes

**Decisión**: El plan-creator genera dos planes (código + QA). Ambos deben ser aprobados
por un humano antes de ejecutarse.

**Implementación**: El workflow wrapper usa `suspend()` para pausar la ejecución y mostrar
los planes en Studio. El humano revisa, aprueba/rechaza, y llama a `run.resume()` con
feedback. Si rechaza, el agente padre re-genera los planes.

## Decision 5: Loop code ↔ QA hasta pasar todas las pruebas

**Decisión**: El agente padre implementa un loop: ejecuta code-supervisor → ejecuta
qa-supervisor → si hay fallos, pasa los detalles al code-supervisor para corregir →
repite hasta que todos los tests pasen.

**Implementación**: El workflow wrapper usa `dountil()` con condición basada en
resultados de QA. Alternativamente, el agente padre puede manejar el loop
internamente si tiene suficiente contexto.

## Estructura actual del proyecto

```
C:\DEV\mastra-poc\
├── .tasks/
│   ├── queue/        ← tareas pendientes (tools: queueTool, doneTool)
│   └── done/         ← tareas completadas
├── .plans/           ← planes generados (tool: plansTool)
├── workspaces/
│   ├── project/      ← código generado por code-supervisor
│   └── docs/         ← reportes y docs de QA
└── mastra-poc/
    └── src/mastra/
        ├── index.ts          ← Mastra config (agents, tools, workspaces, memory)
        ├── workspaces.ts     ← definición de los 3 workspaces
        ├── tools/
        │   ├── weather-tool.ts
        │   └── tasks-tool.ts ← queueTool, doneTool, plansTool
        ├── agents/           ← weather, translator, code-reviewer (existentes)
        │   └── ...           ← FALTA: parent-supervisor, plan-creator,
        │                         code-supervisor, qa-supervisor
        └── workflows/        ← weather-workflow (existente)
            └── ...           ← FALTA: task-pipeline (wrapper HITL)

## Infraestructura lista vs. pendiente

| Componente | Estado |
|---|---|
| `.tasks/queue` + `.tasks/done` + `.plans/` | **Listo** |
| `workspaces/project` + `workspaces/docs` | **Listo** |
| `workspaces.ts` (3 workspaces definidos) | **Listo** |
| `tasks-tool.ts` (queueTool, doneTool, plansTool) | **Listo** |
| `Memory` (`taskMemory` con working memory) | **Listo** |
| `parent-supervisor` agent | Pendiente |
| `plan-creator` agent | Pendiente |
| `code-supervisor` agent + sub-agentes coders | Pendiente |
| `qa-supervisor` agent + sub-agentes testers | Pendiente |
| Workflow wrapper (HITL + loop) | Pendiente |

## Próximos pasos

1. Crear agentes: plan-creator, code-supervisor (con sub-agentes coders),
   qa-supervisor (con sub-agentes testers)
2. Crear parent-supervisor con `memory: taskMemory` y los 3 supervisores
   como `agents` en su config
3. El parent-supervisor genera `threadId = "task-{filename}"` al tomar
   una tarea del queue
4. Crear el workflow wrapper para HITL
5. Probar el flujo completo con Studio
