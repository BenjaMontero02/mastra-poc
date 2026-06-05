---
name: user-story-standards
description: "Buenas prácticas para la redacción de historias de usuario con criterios de aceptación. Usar cuando: se necesite crear historias de usuario a partir de información funcional, definir criterios de aceptación verificables, o documentar funcionalidades como historias de usuario."
---

# User Story Standards - Buenas Prácticas de Historias de Usuario

## Cuándo Usar

- Crear historias de usuario a partir de información funcional recopilada
- Definir criterios de aceptación claros y verificables
- Documentar funcionalidades en formato estándar de historias de usuario
- Priorizar y organizar funcionalidades para testing

## Procedimiento: Crear Historias de Usuario

1. **Leer** el archivo de descubrimiento funcional (`functional-discovery.md`)
2. **Identificar** las funcionalidades principales agrupadas por módulo o flujo
3. **Redactar** cada historia usando el formato estándar Como/Quiero/Para
4. **Definir** criterios de aceptación verificables para cada historia (mínimo 3)
5. **Incluir** datos de prueba específicos cuando aplique
6. **Guardar** todas las historias en un único archivo `user-stories.md`

Consultar ejemplos y anti-patrones en [story-patterns.md](./references/story-patterns.md).

## Formato de Historia de Usuario

```markdown
## HU-{nn}: {Título descriptivo de la funcionalidad}

**Como** {rol del usuario}
**Quiero** {acción o funcionalidad deseada}
**Para** {beneficio o valor de negocio}

### Criterios de Aceptación

1. **CA-{nn}.1**: {Criterio verificable - describe condición y resultado esperado}
2. **CA-{nn}.2**: {Criterio verificable}
3. **CA-{nn}.3**: {Criterio verificable}

### Datos de Prueba
- {Dato 1}: {valor específico}
- {Dato 2}: {valor específico}

### Notas
- {Observaciones relevantes del descubrimiento funcional}
```

## Principios INVEST

Cada historia debe cumplir con los principios INVEST:

| Principio | Significado | Aplicación |
|-----------|-------------|------------|
| **I**ndependent | La historia no depende de otras para tener valor | Cada historia debe poder probarse por separado |
| **N**egotiable | Los detalles pueden ajustarse | Los criterios son guía, no contrato rígido |
| **V**aluable | Aporta valor al usuario | El "Para" debe expresar un beneficio real |
| **E**stimable | Se puede estimar el esfuerzo | Funcionalidad acotada y comprensible |
| **S**mall | Lo suficientemente pequeña | Un flujo funcional completo pero acotado |
| **T**estable | Se puede verificar su cumplimiento | Criterios de aceptación claros y medibles |

## Criterios de Aceptación - Buenas Prácticas

- **Verificables**: Cada criterio debe poder responderse con Sí/No (¿se cumple?)
- **Específicos**: Incluir datos concretos, no genéricos ("RUT 12.345.678-5" en vez de "un RUT válido")
- **Independientes**: Cada criterio se valida por separado
- **Orientados al comportamiento**: Describir qué pasa, no cómo se implementa
- **Con resultado esperado**: Siempre indicar qué se espera ver/obtener
- **Mínimo 3 por historia**: Happy path + al menos un alternativo + al menos un negativo

## Formato de Salida: user-stories.md

```markdown
# Historias de Usuario - {Nombre de la Aplicación}

**Fuente**: functional-discovery.md
**Fecha de creación**: {fecha}
**Total de historias**: {n}

---

## HU-01: {Título}
...

---

## HU-02: {Título}
...
```

## Restricciones

- SOLO crear historias basadas en funcionalidades observadas en `functional-discovery.md` — NO inventar funcionalidades
- MÍNIMO 3 criterios de aceptación por historia
- Los criterios deben ser VERIFICABLES y ESPECÍFICOS
- Incluir datos de prueba concretos (no genéricos)
- NO incluir detalles de implementación técnica en las historias
- Agrupar funcionalidades relacionadas en una misma historia cuando tenga sentido
- Usar numeración consecutiva: HU-01, HU-02, etc.
