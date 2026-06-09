# Skill: Query Layer

## Propósito

Crear, modificar o refactorizar queries complejas: raw SQL parametrizado, query builders dinámicos, paginación, filtros y búsqueda.

## Patrones del proyecto

### Estructura base de un archivo de queries

```typescript
import { QueryTypes } from 'sequelize';
const Seque = require('../configuration/database');

/**
 * Construye el WHERE clause dinámico para listar recursos.
 */
export function buildRecursoWhereClause(filters: {
    estado?: string;
    searchTerm?: string;
    fechaDesde?: string;
    fechaHasta?: string;
}): { whereRaw: string; replacements: Record<string, any> } {
    let whereRaw = 'WHERE 1=1';
    const replacements: Record<string, any> = {};

    if (filters.estado) {
        whereRaw += ' AND r.estado = :estado';
        replacements.estado = filters.estado;
    }

    if (filters.searchTerm) {
        whereRaw += ' AND LOWER(r.nombre) LIKE :searchTerm';
        replacements.searchTerm = `%${filters.searchTerm.toLowerCase().trim()}%`;
    }

    if (filters.fechaDesde) {
        whereRaw += ' AND CONVERT(date, r.createdAt) >= :fechaDesde';
        replacements.fechaDesde = filters.fechaDesde;
    }

    if (filters.fechaHasta) {
        whereRaw += ' AND CONVERT(date, r.createdAt) <= :fechaHasta';
        replacements.fechaHasta = filters.fechaHasta;
    }

    return { whereRaw, replacements };
}

/**
 * Ejecuta la query paginada de recursos.
 */
export async function fetchRecursos(params: {
    whereRaw: string;
    replacements: Record<string, any>;
    page: number;
    pageSize: number;
    orderBy?: string;
}): Promise<{ rows: any[]; total: number }> {
    const { whereRaw, replacements, page, pageSize, orderBy } = params;
    const offset = (page - 1) * pageSize;
    const order = orderBy || 'r.createdAt DESC';

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM MI_TABLA r ${whereRaw}`;
    const [countResult] = await Seque.query(countQuery, {
        replacements,
        type: QueryTypes.SELECT,
    });
    const total = (countResult as any)?.total || 0;

    // Fetch page
    const dataQuery = `
        SELECT r.*, t.nombre as tipo_nombre
        FROM MI_TABLA r
        LEFT JOIN TIPOS t ON t.id = r.tipo_id
        ${whereRaw}
        ORDER BY ${order}
        OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY
    `;

    const rows = await Seque.query(dataQuery, {
        replacements: { ...replacements, offset, pageSize },
        type: QueryTypes.SELECT,
    });

    return { rows, total };
}
```

### Reglas de diseño

1. **Siempre usar parameterized queries**: Nunca interpolar valores directamente en SQL.

    ```typescript
    // ❌ NUNCA: SQL Injection vulnerable
    (`WHERE email = '${userInput}'`
    // ✅ SIEMPRE: Parametrizado
    `WHERE email = :email`,
        { replacements: { email: userInput } });
    ```

2. **Builder pattern para WHERE dinámico**: Acumular condiciones con `AND` sobre `WHERE 1=1`.
3. **Separar count de fetch**: Para paginación, hacer dos queries o usar `findAndCountAll`.
4. **Un archivo de queries por dominio**: `declaraciones.queries.ts`, `nomina.queries.ts`.
5. **Exportar funciones nombradas**: Builder + executor como par.

### Paginación estándar

```typescript
// Input: page (1-based), pageSize (con límite)
const page = Math.max(1, Number(rawPage) || 1);
const pageSize = Math.min(100, Math.max(1, Number(rawPageSize) || 20));
const offset = (page - 1) * pageSize;

// SQL Server syntax
`OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`;

// Respuesta
return {
    data: rows,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
};
```

### Búsqueda multi-word

```typescript
export function buildSearchCondition(
    searchTerm: string,
    fields: string[],
): {
    condition: string;
    replacements: Record<string, string>;
} {
    const words = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const replacements: Record<string, string> = {};

    if (words.length === 1) {
        replacements.search = `%${words[0]}%`;
        const fieldConditions = fields.map((f) => `LOWER(${f}) LIKE :search`).join(' OR ');
        return { condition: `(${fieldConditions})`, replacements };
    }

    // Multi-word: ALL words must match in at least one field
    const wordConditions = words.map((word, i) => {
        const key = `word${i}`;
        replacements[key] = `%${word}%`;
        const fieldOr = fields.map((f) => `LOWER(${f}) LIKE :${key}`).join(' OR ');
        return `(${fieldOr})`;
    });

    return {
        condition: `(${wordConditions.join(' AND ')})`,
        replacements,
    };
}
```

### Queries con JOINs

```typescript
export async function fetchConRelaciones(id: number) {
    const query = `
        SELECT
            d.id_declaracion,
            d.usuario_email,
            d.estado_actual,
            t.nombre AS tipo_nombre,
            CASE
                WHEN n.email_colaborador IS NULL THEN 'Sin cargo'
                ELSE n.cargo
            END AS cargo
        FROM COM_DECLARACIONES d
        INNER JOIN COM_TIPO_DDJJ t ON t.id_tipo_ddjj = d.tipo_ddjj_id
        LEFT JOIN COM_NOMINA n ON n.email_colaborador = d.usuario_email
        WHERE d.id_declaracion = :id
    `;

    const [result] = await Seque.query(query, {
        replacements: { id },
        type: QueryTypes.SELECT,
    });

    return result || null;
}
```

### Cascade delete con transacción

```typescript
export async function deleteRecursoCascade(id: number, transaction: any) {
    // Orden: hijos primero, padre último
    await Seque.query('DELETE FROM COM_RESPUESTAS WHERE declaracion_id = :id', { replacements: { id }, transaction });
    await Seque.query('DELETE FROM COM_HISTORIAL_ESTADO WHERE declaracion_id = :id', {
        replacements: { id },
        transaction,
    });
    await Seque.query('DELETE FROM COM_DECLARACIONES WHERE id_declaracion = :id', {
        replacements: { id },
        transaction,
    });
}
```

### Mejores prácticas (mejoras sobre el proyecto actual)

1. **Extraer IDs mágicos a constantes**:

    ```typescript
    // ❌ Mal
    'AND r.pregunta_id IN (898, 899)';

    // ✅ Bien
    import { PREGUNTA_INVITADOS_IDS } from '../configuration/consts';
    (`AND r.pregunta_id IN (:preguntaIds)`, { replacements: { preguntaIds: PREGUNTA_INVITADOS_IDS } });
    ```

2. **Tipado de resultados**: Definir interfaces para los resultados de raw queries.

    ```typescript
    interface DeclaracionRow {
        id_declaracion: number;
        usuario_email: string;
        estado_actual: string;
    }
    const rows = await Seque.query<DeclaracionRow[]>(query, options);
    ```

3. **Evitar N+1**: Usar JOINs o subqueries en vez de loops con queries individuales.

4. **Índices**: Documentar qué índices necesita la query (como comentario).

    ```typescript
    // Requiere INDEX en (declaracion_id, pregunta_id) para performance
    ```

5. **Testing de queries**: Los filtros dinámicos son propensos a errores — testear cada combinación.

### Export

```typescript
export { buildWhereClause, fetchRecursos, deleteRecursoCascade };
```
