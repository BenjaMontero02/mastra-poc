---
name: functional-discovery
description: "Guía para la exploración y recopilación de información funcional de aplicaciones web. Usar cuando: se necesite navegar una aplicación web para documentar sus funcionalidades, páginas, formularios, flujos de navegación, validaciones y comportamientos observados."
---

# Functional Discovery - Exploración Funcional de Aplicaciones Web

## Cuándo Usar

- Explorar una aplicación web para documentar su funcionalidad
- Relevar información funcional de una app antes de crear historias de usuario
- Crear un inventario de páginas, formularios, campos y flujos
- Documentar validaciones, mensajes de error y comportamientos observados

## Procedimiento: Exploración Funcional Sistemática

1. **Acceder** a la URL proporcionada y capturar el estado inicial (screenshot + snapshot)
2. **Identificar** la estructura de navegación: menús, sidebar, breadcrumbs, links principales
3. **Explorar** cada sección/página accesible, documentando:
   - Nombre y propósito de la página
   - Elementos interactivos (formularios, botones, links)
   - Campos de formulario (tipo, validaciones visibles, placeholders)
   - Tablas y listados (columnas, datos mostrados)
   - Mensajes informativos o de estado
4. **Probar** flujos básicos: llenar formularios, hacer clicks, navegar entre páginas
5. **Documentar** validaciones observadas: campos requeridos, formatos, mensajes de error
6. **Registrar** tiempos de carga y comportamientos de la UI (spinners, loading states)
7. **Capturar** screenshots de cada página/estado relevante

Consultar el checklist detallado en [discovery-checklist.md](./references/discovery-checklist.md).

## Formato de Salida: functional-discovery.md

El archivo de salida debe seguir esta estructura:

```markdown
# Descubrimiento Funcional - {Nombre de la Aplicación}

**URL**: {url}
**Fecha de exploración**: {fecha}
**Ambiente**: {producción/staging/desarrollo}

## Resumen General
Breve descripción de la aplicación y su propósito observado.

## Estructura de Navegación
- Menú principal y sus opciones
- Flujos de navegación entre páginas

## Páginas Identificadas

### Página: {Nombre}
- **URL**: {ruta}
- **Propósito**: {descripción}
- **Elementos principales**:
  - {elemento 1}: {descripción}
  - {elemento 2}: {descripción}
- **Formularios**: {descripción de campos}
- **Acciones disponibles**: {botones, links}

## Formularios y Campos

### Formulario: {Nombre}
| Campo | Tipo | Requerido | Validación | Placeholder |
|-------|------|-----------|------------|-------------|
| {campo} | {text/select/...} | {Sí/No} | {descripción} | {texto} |

## Flujos Funcionales Observados
1. {Flujo 1}: Paso a paso del flujo observado
2. {Flujo 2}: ...

## Validaciones y Mensajes
- {Validación 1}: {cuándo se dispara, mensaje mostrado}

## Observaciones
- Comportamientos notables, tiempos de carga, errores visibles
```

## Restricciones

- SOLO documentar lo que se observa directamente — NO inventar funcionalidades
- Capturar screenshot de CADA página visitada
- Usar `take_snapshot` para obtener el árbol de accesibilidad (UIDs de elementos)
- Documentar TODOS los campos de formulario encontrados, incluyendo tipo y validaciones visibles
- Si una página requiere autenticación, documentar la pantalla de login como primer paso
- NO ejecutar acciones destructivas (eliminar datos, modificar configuraciones)
