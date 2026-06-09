# Skill: Types Layer

## Propósito

Crear, modificar o refactorizar tipos TypeScript, interfaces y DTOs que definen los contratos de datos del dominio.

## Patrones del proyecto

### Estructura de archivos

```
src/types/
├── dtos.ts         # DTOs de entrada/salida por dominio
├── types.ts        # Tipos de integraciones externas (API gateway, OAuth)
├── request.ts      # Extensiones del Request de Express
└── express.d.ts    # Type augmentation global para Express
```

### DTOs de dominio (dtos.ts)

```typescript
// ─── Estados como union type (no string genérico) ───────────────────────────
export type Estado =
    | 'En análisis'
    | 'Cerrada - No existen conflictos'
    | 'Aprobada'
    | 'Plan de acción'
    | 'Aprobada con observaciones';

// ─── DTOs de entrada (lo que recibe el endpoint) ────────────────────────────
export interface CrearRecursoDTO {
    nombre: string;
    tipo_id: number;
    descripcion?: string;
}

export interface ActualizarRecursoDTO {
    nombre?: string;
    estado?: Estado;
    observacion?: string;
}

export interface RespuestaPostDTO {
    pregunta_id: number;
    opcion_id?: number | null;
    valor?: string | null;
}

export interface EnviarDeclaracionDTO {
    tipo_ddjj_id: number;
    respuestas: RespuestaPostDTO[];
}

// ─── DTOs de salida (lo que devuelve el endpoint) ───────────────────────────
export interface RecursoListadoDTO {
    id: number;
    nombre: string;
    tipo: string;
    estado: Estado;
    fecha_creacion: string;
}

export interface RecursoDetalleDTO {
    id: number;
    nombre: string;
    tipo: string;
    estado: Estado;
    fecha_creacion: string;
    usuario_email: string;
    usuario_nombre?: string | null;
    observacion?: string | null;
    items: RecursoItemDTO[];
}

export interface RecursoItemDTO {
    id: number;
    texto: string;
    tipo: string;
    valor: string | null;
    orden: number;
    parent_id: number | null;
    children: RecursoItemDTO[]; // recursivo para jerarquías
}

// ─── DTOs de paginación ─────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}
```

### Tipos de integraciones externas (types.ts)

```typescript
// Respuesta del API Gateway / OAuth
export interface ApigwResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface ApigwError {
    error: string;
    error_description: string;
}

export interface TokenPayload {
    email: string;
    role: string;
    nombre: string;
    exp: number;
    iat: number;
}
```

### Type augmentation para Express (express.d.ts)

```typescript
declare global {
    namespace Express {
        interface Request {
            currentUserEmail?: string;
        }
        interface Locals {
            dataUser?: {
                email: string;
                role: string;
                nombre: string;
            };
            error?: any;
        }
    }
}

export {};
```

### Reglas de diseño

1. **Separar DTOs de entrada y salida**: Input DTOs vs Output DTOs claramente diferenciados.
2. **Union types para estados**: No usar `string` genérico, definir los valores posibles.
3. **Interfaces sobre types para objetos**: `interface` es extensible, `type` para unions/aliases.
4. **Campos opcionales explícitos**: `campo?: tipo | null` cuando puede estar ausente.
5. **Genéricos para respuestas paginadas**: `PaginatedResponse<T>` reutilizable.
6. **No anidar más de 3 niveles**: Si la complejidad crece, extraer sub-interfaces.

### Mejores prácticas (mejoras sobre el proyecto actual)

1. **Usar union types en vez de `string` para estados**:

    ```typescript
    // ❌ Mal: sin restricción
    export type Estado = string;

    // ✅ Bien: validación en compile-time
    export type Estado = 'En análisis' | 'Cerrada - No existen conflictos' | 'Aprobada';
    ```

2. **Discriminated unions para variantes**:

    ```typescript
    // Para preguntas con distintos tipos de respuesta
    type Pregunta =
        | { tipo: 'texto'; valor: string }
        | { tipo: 'booleano'; valor: boolean }
        | { tipo: 'select'; valor: string; opciones: string[] };
    ```

3. **No usar `any` en DTOs**: Cada campo debe tener un tipo específico.

    ```typescript
    // ❌ Mal
    respuestas: any[];

    // ✅ Bien
    respuestas: RespuestaPostDTO[];
    ```

4. **Readonly para outputs**: Los DTOs de salida no se modifican.

    ```typescript
    export interface RecursoListadoDTO {
        readonly id: number;
        readonly nombre: string;
        readonly estado: Estado;
    }
    ```

5. **Utility types de TypeScript**:

    ```typescript
    // Hacer todos los campos opcionales para updates parciales
    export type ActualizarRecursoDTO = Partial<CrearRecursoDTO>;

    // Excluir campos internos de la respuesta
    export type RecursoPublicoDTO = Omit<RecursoInternoDTO, 'internal_id' | 'deleted_at'>;

    // Pick para subconjuntos
    export type RecursoResumenDTO = Pick<RecursoDetalleDTO, 'id' | 'nombre' | 'estado'>;
    ```

6. **Documentar con JSDoc** cuando el nombre no es suficiente:
    ```typescript
    export interface EnviarDeclaracionDTO {
        /** ID del tipo de declaración jurada */
        tipo_ddjj_id: number;
        /** Array de respuestas con pregunta_id y valor */
        respuestas: RespuestaPostDTO[];
    }
    ```

### Convenciones de naming

```
DTO de entrada (crear): CrearRecursoDTO, CrearPreguntaInput
DTO de entrada (update): ActualizarRecursoDTO, EditarPreguntaInput
DTO de salida (lista): RecursoListadoDTO
DTO de salida (detalle): RecursoDetalleDTO
Union type de estado: Estado, TipoPregunta
Genérico paginado: PaginatedResponse<T>
Type augmentation: express.d.ts (en raíz de types/)
```

### Export

```typescript
// Siempre named exports (no default)
export type { Estado, CrearRecursoDTO, RecursoDetalleDTO };
export interface EnviarDeclaracionDTO { ... }
```
