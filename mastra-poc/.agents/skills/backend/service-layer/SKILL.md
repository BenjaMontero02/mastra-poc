# Skill: Service Layer

## Propósito

Crear, modificar o refactorizar servicios de negocio que encapsulan lógica de dominio, orquestación de datos y transacciones.

## Patrones del proyecto

### Estructura base de un servicio

```typescript
import type { Transaction } from 'sequelize';
import type { MiDTO } from '../types/dtos';
const Seque = require('../configuration/database');
const { ModelA, ModelB } = require('../schema/associations');

// Interfaces de input específicas del servicio
export interface CrearRecursoInput {
    campo_requerido: string;
    campo_opcional?: number;
}

// Función de servicio con transacción
async function crearRecursoService(data: CrearRecursoInput): Promise<MiDTO> {
    if (!data.campo_requerido?.trim()) {
        throw new Error('campo_requerido es obligatorio');
    }

    return Seque.transaction(async (t: Transaction) => {
        // Validaciones de negocio dentro de la transacción
        const existente = await ModelA.findOne({
            where: { nombre: data.campo_requerido },
            transaction: t,
        });
        if (existente) throw new Error('Recurso ya existe');

        // Creación/mutación
        const recurso = await ModelA.create({ nombre: data.campo_requerido }, { transaction: t });

        return recurso.get({ plain: true });
    });
}

module.exports = { crearRecursoService };
```

### Reglas de diseño

1. **Toda mutación en transacción**: Usar `Seque.transaction(async (t: Transaction) => {...})`.
2. **Validaciones de negocio en el servicio**: El controller valida formato/presencia, el servicio valida reglas de dominio.
3. **Un servicio por dominio/recurso**: No mezclar lógica de declaraciones con lógica de chat en el mismo archivo.
4. **Interfaces de input tipadas**: Definir `interfaces` para los inputs del servicio, exportarlas si el controller las necesita.
5. **No acceder a `req`/`res`**: El servicio recibe datos ya parseados, nunca objetos de Express.
6. **Side-effects asíncronos con `setImmediate`**: Emails y notificaciones no bloquean la respuesta.

```typescript
// Side-effect no bloqueante
setImmediate(() => {
    EmailService.sendNotification(email, nombre).catch((err) => console.error('[email] error:', err?.message));
});
```

7. **Errores con mensajes claros**: `throw new Error('Mensaje descriptivo')` — el controller mapea a HTTP status.

### Patrones avanzados

#### Normalización de datos

```typescript
function normalizeEstado(raw: string): string {
    const mapa: Record<string, string> = {
        en_analisis: 'En análisis',
        cerrada: 'Cerrada - No existen conflictos',
    };
    return mapa[raw.toLowerCase()] || raw;
}
```

#### Construcción recursiva de jerarquías

```typescript
function buildHierarchy(items: any[], parentId: number | null = null): any[] {
    return items
        .filter((i) => i.parent_id === parentId)
        .map((item) => ({
            ...item,
            children: buildHierarchy(items, item.id),
        }));
}
```

#### Diff tracking para auditoría

```typescript
async function guardarConDiff(recursoId: number, nuevoValor: any, t: Transaction) {
    const anterior = await ModelA.findByPk(recursoId, { transaction: t });
    const previousValue = anterior?.get('valor');

    await ModelA.update(
        { valor: nuevoValor, previous_value: previousValue },
        { where: { id: recursoId }, transaction: t },
    );
}
```

### Mejores prácticas (mejoras sobre el proyecto actual)

1. **Evitar magic numbers**: Extraer IDs hardcodeados a constantes configurables.

    ```typescript
    // ❌ Mal
    where: {
        pregunta_id: 898;
    }

    // ✅ Bien
    import { PREGUNTA_INVITADOS_ID } from '../configuration/consts';
    where: {
        pregunta_id: PREGUNTA_INVITADOS_ID;
    }
    ```

2. **Tipado estricto**: Evitar `any` en parámetros y retornos. Usar interfaces o genéricos.

    ```typescript
    // ❌ Mal
    async function getDetalle(id: any): Promise<any> { ... }

    // ✅ Bien
    async function getDetalle(id: number): Promise<DeclaracionDetalleFlatDTO> { ... }
    ```

3. **Separar orquestación de transformación**: Funciones puras para transformar datos, async para I/O.

4. **Logs estructurados**: Usar prefijos consistentes `[service:nombre]`.

    ```typescript
    console.info('[service:declaraciones] estado cambiado', { id, nuevoEstado });
    ```

5. **No duplicar lógica de flatten/normalize**: Centralizar en un único helper exportado.

### Exports

- Exportar funciones nombradas (no default exports).
- Exportar interfaces de input si el controller las importa.

```typescript
module.exports = { crearRecursoService, actualizarRecursoService };
export type { CrearRecursoInput }; // si se usa TS import
```
