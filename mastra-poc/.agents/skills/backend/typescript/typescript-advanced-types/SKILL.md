---
name: typescript-advanced-types
description: Aplica tipos TypeScript avanzados en este proyecto (strict, ES2023, nodenext). Usa cuando implementes genéricos, conditional types, mapped types, template literals o type guards. Triggers: tipado, genérico, infer, keyof, mapped type, type guard, utility type, discriminated union.
---

# TypeScript Advanced Types en este Proyecto

## Contexto
- TypeScript 5.7+ con `strict: true`, `nodenext` modules, target ES2023
- No se acepta `any` sin justificación documentada en comentario
- `as` (type assertion) se reemplaza por type guards

## Cuándo usar cada patrón

| Situación | Patrón |
|-----------|--------|
| Función que opera sobre múltiples tipos | Genéricos con constraints |
| Transformar shape de tipo existente | Mapped types |
| Tipo que depende de otro tipo | Conditional types + `infer` |
| Strings con patrones fijos | Template literal types |
| Validar en runtime (boundaries externos) | Type guards |
| Múltiples estados excluyentes | Discriminated unions |

## Workflow de tipado

1. Dejar que TypeScript infiera antes de tipar explícitamente
2. Usar utility types built-in: `Partial`, `Pick`, `Omit`, `Record`, `ReturnType`, `Parameters`
3. Si no alcanza: aplicar patrón de la tabla según situación
4. En boundaries externos (request body, JWT payload, API responses): usar `unknown` + type guard
5. Tipos complejos: agregar JSDoc explicando la intención

## Patrones del proyecto

### DTOs — derivar de entidades, no duplicar

```typescript
type CreateAgentDto = Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'version'>;
type UpdateAgentDto = Partial<CreateAgentDto>;
```

### Resultados de operaciones de negocio

```typescript
type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };
```

### Type guards en guards/interceptors

```typescript
function isJwtPayload(obj: unknown): obj is JwtPayload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'userId' in obj &&
    'role' in obj
  );
}
```

### Tipos string literal (preferir sobre enums TypeScript)

```typescript
type AgentStatus = 'draft' | 'pending' | 'approved' | 'rejected';
type UserRole = 'admin' | 'developer' | 'viewer';
```

## Anti-patrones prohibidos
- `any` — usar `unknown` + type guard
- `as Type` sin type guard previo — es unsafe
- `@ts-ignore` — siempre hay alternativa
- Tipos sin constraints cuando el constraint es conocido: `<T>` → `<T extends object>`
- Objetos genéricos vacíos: `{}` → `Record<string, unknown>`

## Reglas strict relevantes

| Regla | Implicación |
|-------|-------------|
| `strictNullChecks` | Manejar `null` / `undefined` explícitamente |
| `noImplicitAny` | Cada parámetro debe tener tipo |
| `strictFunctionTypes` | Cuidado con callbacks contravariantes |

Ver [reference.md](references/reference.md) para ejemplos avanzados de cada patrón.