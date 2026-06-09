# Skill: Backend Feature Discovery

## Propósito

Aclarar alcance, decisiones abiertas y supuestos antes de implementar endpoints, servicios, refactors o integraciones backend con ambigüedad relevante.

## Cuándo se activa

- El pedido tiene ambigüedad en contratos de datos, flujos, estados o side-effects.
- No queda claro qué capas se ven afectadas (controller, service, schema, queries).
- Hay dependencias externas no definidas (APIs, email, cron, etc.).
- El comportamiento esperado ante errores o edge cases no está explícito.

## Proceso

1. **Leer el pedido completo** y extraer: acción principal, recurso afectado, capas involucradas.
2. **Identificar gaps**:
    - ¿El contrato de entrada/salida está definido (DTO, payload, query params)?
    - ¿Qué estados o transiciones de estado se esperan?
    - ¿Hay side-effects (emails, auditoría, notificaciones)?
    - ¿Quién consume este endpoint (FE, otro servicio, cron)?
    - ¿Hay restricciones de permisos (admin, owner, público)?
    - ¿Se necesita paginación, filtros, ordenamiento?
3. **Formular preguntas** solo si la ambigüedad puede cambiar la implementación. Máximo 3-5 preguntas de alto valor.
4. **Si no hay ambigüedad relevante**, declarar supuestos y avanzar directamente.

## Formato de preguntas

Las preguntas deben ser:

- Concretas y accionables (no genéricas)
- Con opciones sugeridas cuando sea posible
- Agrupadas por tema (contrato, permisos, side-effects)

## Ejemplo

```
Antes de implementar, necesito aclarar:

1. **Contrato de salida**: ¿El endpoint devuelve el objeto creado completo o solo el ID?
2. **Permisos**: ¿Solo admins pueden ejecutar esta acción o también el owner del recurso?
3. **Side-effects**: ¿Se debe enviar email al cambiar el estado? ¿A quién?

Supuestos que asumo si no se aclara:
- La validación usa el schema existente de Zod/Joi.
- El endpoint sigue el patrón REST del proyecto (POST para crear, PATCH para editar parcial).
```

## Anti-patterns

- NO hacer preguntas obvias que se responden leyendo el código existente.
- NO preguntar sobre implementación interna (eso lo decide el architect).
- NO bloquear la implementación por detalles menores que se pueden asumir con sentido común.
