# QA Certification Agents - Workspace Instructions

## Proyecto

Framework de certificación QA basado en agentes inteligentes que navegan aplicaciones web, documentan funcionalidad, crean historias de usuario, diseñan casos de prueba Gherkin, los ejecutan con Playwright y generan reportes de certificación. Todo el flujo es local, basado en archivos MD y HTML.

## MCP Servers Disponibles

| Server | Uso | Herramientas principales |
|--------|-----|--------------------------|
| `playwright` | Navegación e interacción con el navegador para exploración y ejecución de pruebas | `mcp_playwright_browser_navigate`, `mcp_playwright_browser_click`, `mcp_playwright_browser_type`, `mcp_playwright_browser_take_screenshot`, `mcp_playwright_browser_snapshot`, `mcp_playwright_browser_evaluate`, `mcp_playwright_browser_wait_for`, `mcp_playwright_browser_close` |

## Flujo de Certificación (5 Agentes)

```
[Input: URL de la aplicación + nombre + testMode]
         │
         ▼
┌──────────────────────────┐
│ 1. App Explorer          │ → Navega la app, recopila info funcional
│    Output: MD            │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 2. User Story Creator    │ → Crea historias adaptadas al testMode
│    Output: MD            │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 3. Gherkin Test Designer │ → Diseña test cases del tipo definido por testMode
│    Output: MDs           │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 4. Playwright Test       │ → Ejecuta cada test case con Playwright
│    Executor              │
│    Output: HTMLs         │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 5. Executive Reporter    │ → Genera reporte de certificación
│    Output: HTML          │
└──────────────────────────┘
```

### Modos de Prueba (`testMode`)

| Modo | Tipo de casos generados |
|------|--------------------------|
| `positivos` | Solo Happy Path — flujos exitosos con datos válidos |
| `negativos` | Solo Negativos — errores, datos inválidos, validaciones |
| `borde` | Solo Borde — valores límite, extremos, caracteres especiales |
| `e2e` | Un único escenario que recorre el flujo completo de negocio |

## Estructura de Artefactos

Cada certificación genera una carpeta con la siguiente estructura:

```
certifications/{app-name}-{YYYY-MM-DD}-{HH-mm-ss}/
├── functional-discovery.md          ← Agent 1: Info funcional recopilada
├── user-stories.md                  ← Agent 2: Historias de usuario
├── test-cases/                      ← Agent 3: Casos de prueba Gherkin
│   ├── TC-01-descripcion.md
│   ├── TC-02-descripcion.md
│   └── ...
├── evidence/                        ← Agent 4: Evidencia de ejecución
│   ├── Evidencia-TC-01.html
│   ├── Evidencia-TC-02.html
│   └── screenshots/
└── Reporte-Certificacion.html       ← Agent 5: Reporte ejecutivo
```

## Convenciones de Nomenclatura

- **Carpeta de certificación**: `{nombre-app}-{YYYY-MM-DD}-{HH-mm-ss}` (minúsculas, guiones) — El timestamp garantiza una carpeta única por ejecución. **Cada ejecución crea siempre una carpeta nueva, incluso para la misma app.**
- **Test Cases**: Prefijo `TC-{nn}`, nombre descriptivo en kebab-case
- **Evidencia HTML**: `Evidencia-TC-{nn}.html`
- **Reporte final**: `Reporte-Certificacion.html`
- **Screenshots**: `screenshots/step-{nn}-{descripcion}.png`

## Skills Disponibles

| Skill | Agente que lo usa | Propósito |
|-------|-------------------|-----------|
| `functional-discovery` | App Explorer | Checklist de información funcional a relevar |
| `user-story-standards` | User Story Creator | Buenas prácticas de historias de usuario |
| `gherkin-standards` | Gherkin Test Designer | Buenas prácticas de escritura Gherkin |
| `evidence-html-template` | Playwright Test Executor | Template HTML para evidencia de pruebas |
| `executive-report-template` | Executive Reporter | Template HTML para reporte de certificación |
