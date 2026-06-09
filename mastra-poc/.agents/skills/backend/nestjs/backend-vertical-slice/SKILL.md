# Skill: Backend Vertical Slice Planning

## Propósito

Dividir trabajos backend ya comprendidos en slices funcionales, pequeños y verificables que cruzan múltiples capas (route → controller → service → query → schema).

## Cuándo se activa

- Un feature o refactor involucra cambios en 3+ capas del backend.
- El trabajo es demasiado grande para implementar en un solo paso sin riesgo.
- Conviene ordenar la implementación para reducir errores y facilitar testing.

## Proceso

1. **Identificar el alcance completo**: Qué capas se ven afectadas y en qué orden dependen.
2. **Definir el slice mínimo funcional**: ¿Cuál es la unidad más pequeña que puede funcionar end-to-end?
3. **Ordenar por dependencia bottom-up**: Schema → Types → Service → Controller → Route.
4. **Cada slice debe ser verificable**: Al terminar un slice, se puede testear (manual o automatizado).

## Template de planificación

```markdown
## Feature: [Nombre del feature]

### Slice 1: [Modelo + tipos base]

- [ ] Crear schema en `src/schema/nuevo_modelo.ts`
- [ ] Agregar asociaciones en `associations.ts`
- [ ] Crear DTO de entrada/salida en `src/types/dtos.ts`
- **Verificación**: El modelo se sincroniza sin errores.

### Slice 2: [Servicio de creación]

- [ ] Crear `src/services/nuevo.service.ts` con función de crear
- [ ] Validaciones de negocio en la transacción
- **Verificación**: Se puede llamar al servicio desde un script/test.

### Slice 3: [Controller + Route]

- [ ] Crear `src/controllers/nuevo.controller.ts` con método crear
- [ ] Crear `src/routes/nuevo.routes.ts` con POST
- [ ] Montar en `routes/index.ts`
- **Verificación**: El endpoint responde correctamente desde Postman.

### Slice 4: [Listado con filtros]

- [ ] Agregar query builder en `src/queries/nuevo.queries.ts`
- [ ] Agregar método listar en el servicio
- [ ] Agregar endpoint GET en controller y route
- **Verificación**: Listado con paginación funciona.

### Slice 5: [Side-effects (email, audit)]

- [ ] Agregar email template si aplica
- [ ] Agregar audit logging en operaciones sensibles
- **Verificación**: Se recibe el email y se registra la auditoría.
```

## Reglas de slicing

1. **Bottom-up**: Empezar por la capa más baja (schema/types) y subir.
2. **Un slice = deployable**: No dejar la app en estado roto entre slices.
3. **Separar CRUD básico de lógica compleja**: Primero crear/leer, después editar/eliminar con reglas.
4. **Side-effects al final**: Email, notificaciones y auditoría van en el último slice.
5. **Máximo 5-7 slices por feature**: Si hay más, el feature es demasiado grande.

## Orden de dependencias estándar

```
1. Schema (define la estructura de datos)
   ↓
2. Types/DTOs (define los contratos)
   ↓
3. Queries (acceso a datos)
   ↓
4. Service (lógica de negocio)
   ↓
5. Controller (entrada HTTP)
   ↓
6. Routes (exposición del endpoint)
   ↓
7. Middlewares (si se necesitan nuevos)
   ↓
8. Side-effects (email, audit, webhooks)
```

## Anti-patterns

- NO crear el endpoint sin el servicio (top-down sin base).
- NO crear todas las queries sin saber si el service las va a usar.
- NO agregar emails antes de que la mutación funcione correctamente.
- NO mezclar migration + feature en el mismo slice.
