---
name: gherkin-standards
description: "Buenas prácticas para diseño de casos de prueba en formato Gherkin (BDD). Usar cuando: se necesite crear test cases Gherkin a partir de historias de usuario, escribir escenarios Given/When/Then, garantizar cobertura de criterios de aceptación, o diseñar pruebas funcionales en formato BDD."
---

# Gherkin Standards - Buenas Prácticas de Diseño de Pruebas BDD

## Cuándo Usar

- Diseñar casos de prueba Gherkin a partir de historias de usuario
- Escribir escenarios Given/When/Then para cobertura de criterios de aceptación
- Crear archivos MD de test cases para ejecución manual en navegador
- Garantizar cobertura mínima por historia (happy path, variación, negativo, exhaustivo)

## Procedimiento: Diseñar Test Cases Gherkin

1. **Leer** el archivo de historias de usuario (`user-stories.md`)
2. **Analizar** cada historia y sus criterios de aceptación
3. **Diseñar** test cases que cubran cada criterio de aceptación:
   - Al menos 1 test case de happy path por historia
   - Al menos 1 test case de variación/alternativo
   - Al menos 1 test case negativo (datos inválidos, errores)
   - Test cases adicionales para cobertura exhaustiva según criterios
4. **Escribir** cada test case en formato Gherkin (Feature/Scenario)
5. **Incluir** datos de prueba explícitos en los pasos
6. **Guardar** cada test case como archivo MD individual

Consultar ejemplos en [gherkin-patterns.md](./references/gherkin-patterns.md).

## Formato de Test Case (archivo MD)

Cada archivo de test case debe seguir esta estructura:

```markdown
# TC-{nn}: {Título descriptivo}

**Historia de Usuario**: HU-{nn}
**Criterios cubiertos**: CA-{nn}.{x}, CA-{nn}.{y}
**Tipo**: {Happy Path | Variación | Negativo | Exhaustivo}
**Prioridad**: {Alta | Media | Baja}
**Precondiciones**: {Estado inicial requerido}
**URL**: {URL de la aplicación}
**Datos de prueba**: {datos específicos a utilizar}

## Escenario Gherkin

\```gherkin
Feature: {Nombre de la funcionalidad}

  Scenario: {Descripción del escenario}
    Given {precondición o estado inicial}
    When {acción del usuario}
    And {acción complementaria}
    Then {resultado esperado verificable}
    And {validación adicional}
\```

## Pasos Detallados

| # | Keyword | Descripción | Datos | Resultado Esperado |
|---|---------|-------------|-------|-------------------|
| 1 | Given | {descripción} | {datos} | {resultado} |
| 2 | When | {descripción} | {datos} | {resultado} |
| 3 | And | {descripción} | {datos} | {resultado} |
| 4 | Then | {descripción} | {datos} | {resultado} |
```

## Estructura de Keywords Gherkin

| Keyword | Propósito | Ejemplo |
|---------|-----------|---------|
| **Feature** | Agrupa escenarios de una funcionalidad | `Feature: Búsqueda de cliente` |
| **Scenario** | Un caso de prueba específico | `Scenario: Búsqueda exitosa con ID válida` |
| **Given** | Precondición o contexto inicial | `Given el usuario está en la página de búsqueda` |
| **When** | Acción principal del usuario | `When ingresa "12.345.678-5" en el campo de búsqueda` |
| **And** | Acción o validación complementaria | `And hace clic en el botón "Buscar"` |
| **Then** | Resultado esperado verificable | `Then se muestra el nombre "Juan Pérez"` |

## Cobertura Mínima por Historia

| # | Tipo | Descripción | Prioridad |
|---|------|-------------|-----------|
| TC-{nn} | Happy Path | Flujo principal exitoso con datos válidos | Alta |
| TC-{nn} | Variación | Datos válidos en formato alternativo o flujo alternativo | Media |
| TC-{nn} | Negativo | Datos inválidos, campos vacíos, manejo de errores | Alta |
| TC-{nn} | Exhaustivo | Validación completa de todos los campos y estados del resultado | Media |

## Convenciones de Escritura

- **Datos explícitos**: Usar datos concretos en los pasos, nunca genéricos
  - ✅ `When ingresa "12.345.678-5" en el campo RUT`
  - ❌ `When ingresa un RUT válido`
- **Resultados verificables**: El Then debe ser comprobable visualmente
  - ✅ `Then se muestra el texto "Cliente: Juan Pérez"`
  - ❌ `Then el sistema funciona correctamente`
- **Un Scenario por caso de prueba**: No mezclar múltiples validaciones en un solo Scenario
- **Pasos atómicos**: Cada paso debe realizar una sola acción
- **Lenguaje del usuario**: Usar términos de negocio, no técnicos

## Nomenclatura de Archivos

- Formato: `TC-{nn}-{descripcion-en-kebab-case}.md`
- Ejemplo: `TC-01-busqueda-exitosa-id-valida.md`
- Numeración consecutiva global: TC-01, TC-02, TC-03, ...

## Restricciones

- SOLO crear test cases basados en historias y criterios de `user-stories.md` — NO inventar escenarios
- Cada criterio de aceptación debe estar cubierto por al menos un test case
- Datos de prueba ESPECÍFICOS y concretos (no genéricos)
- Resultados esperados VERIFICABLES visualmente en el navegador
- Mínimo 3 test cases por historia de usuario
- Los pasos deben ser ejecutables manualmente en Chrome siguiendo las instrucciones
- Incluir la URL y datos necesarios para la ejecución
