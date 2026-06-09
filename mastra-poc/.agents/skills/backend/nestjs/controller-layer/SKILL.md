# Skill: Controller Layer

## Propósito

Crear, modificar o refactorizar controllers que actúan como punto de entrada HTTP: parsean inputs, delegan a servicios y formatean respuestas.

## Patrones del proyecto

### Estructura base de un controller

```typescript
import type { Request, Response } from 'express';
const { miServicio } = require('../services/mi.service');

class MiController {
    /**
     * Resuelve el email del actor autenticado desde res.locals.
     */
    private resolveActorEmail(res: Response): string {
        const data = (res.locals as any)?.dataUser || {};
        return String(data.email || '')
            .trim()
            .toLowerCase();
    }

    async crear(req: Request, res: Response) {
        try {
            const body = req.body || {};

            // 1. Parsing y validación de formato
            const nombre = String(body.nombre || '').trim();
            if (!nombre) {
                return res.status(400).json({ error: 'nombre es requerido' });
            }

            const id = Number(body.id);
            if (!Number.isFinite(id) || id <= 0) {
                return res.status(400).json({ error: 'id inválido' });
            }

            // 2. Delegación al servicio
            const resultado = await miServicio({ nombre, id });

            // 3. Respuesta exitosa
            return res.status(201).json(resultado);
        } catch (err: any) {
            // 4. Mapeo de errores de negocio a HTTP
            const msg = err?.message || 'Error interno';
            if (msg.includes('ya existe')) return res.status(409).json({ error: msg });
            if (msg.includes('no encontrad')) return res.status(404).json({ error: msg });
            console.error('[controller:mi] error en crear:', msg);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
}

module.exports = new MiController();
```

### Reglas de diseño

1. **El controller NO contiene lógica de negocio**: Solo parsea, valida formato y delega.
2. **Patrón class-based con métodos de instancia**: Permite agrupar helpers privados como `resolveActorEmail()`.
3. **Try-catch en cada método**: Captura errores del servicio y los mapea a status HTTP.
4. **Validación de formato en el controller**:
    - Presencia de campos requeridos
    - Tipo correcto (Number.isFinite, Array.isArray)
    - Formato de IDs (`/^\d+$/` o `Number.isFinite`)
5. **No exponer errores internos**: El mensaje de error al cliente debe ser genérico para 500.

### Parsing defensivo de inputs

```typescript
// Coalesce pattern para compatibilidad de campo nombres
const tipoDdjjId = body.tipo_ddjj_id ?? body.tipoDdjjId ?? body.tipo_id;

// Array defensivo
const items = Array.isArray(body.items) ? body.items : body.item ? [body.item] : [];

// Route params seguros
const id = String(req.params?.id || '').trim();
if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'ID inválido en URL' });
}

// Query params con defaults
const page = Math.max(1, Number(req.query.page) || 1);
const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 20));
```

### Mapeo de errores a HTTP status

```typescript
// Patrón recomendado: mapeo explícito por keyword
function mapErrorToStatus(message: string): number {
    if (message.includes('requerido') || message.includes('inválido')) return 400;
    if (message.includes('no encontrad')) return 404;
    if (message.includes('ya existe') || message.includes('duplicad')) return 409;
    if (message.includes('no autorizado') || message.includes('permiso')) return 403;
    return 500;
}

// Uso en catch
catch (err: any) {
    const msg = err?.message || 'Error interno';
    const status = mapErrorToStatus(msg);
    const clientMsg = status === 500 ? 'Error interno del servidor' : msg;
    return res.status(status).json({ error: clientMsg });
}
```

### Mejores prácticas (mejoras sobre el proyecto actual)

1. **Evitar dynamic requires dentro de métodos**: Importar dependencias al inicio del archivo.

    ```typescript
    // ❌ Mal (causa acoplamiento en runtime y dificulta testing)
    async metodo(req, res) {
        const { helper } = require('../helpers/functions');
    }

    // ✅ Bien
    const { helper } = require('../helpers/functions');
    class MiController { ... }
    ```

2. **No duplicar lógica de parsing**: Si el mismo parsing se repite, extraer a un helper tipado.

3. **Respuestas consistentes**:

    ```typescript
    // Éxito: { data: ... } o el objeto directamente
    // Error: { error: string, detail?: any }
    // Lista: { data: [...], total: number, page: number, pageSize: number }
    ```

4. **Un controller por recurso/dominio**: `declaraciones.controller.ts`, `chat.controller.ts`, etc.

5. **No mezclar concerns**: El controller no envía emails, no escribe auditoría directamente.

### Export pattern

```typescript
// Class-based (preferido para agrupar endpoints de un recurso)
module.exports = new MiController();

// O function-based para controllers simples
module.exports = { crearRecurso, listarRecursos };
```
