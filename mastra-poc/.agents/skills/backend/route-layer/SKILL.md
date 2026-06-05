# Skill: Route Layer

## Propósito

Crear, modificar o refactorizar definiciones de rutas Express con diseño RESTful, middleware chaining y agrupación lógica por recurso.

## Patrones del proyecto

### Estructura base de un archivo de rutas

```typescript
import type { Request, Response } from 'express';
const express = require('express');
const MiController = require('../controllers/mi.controller');
const { verifyToken } = require('../utils/JwtAuth');
const { requireAdmin } = require('../middlewares/requireAdmin');
const { validateBody } = require('../middlewares/validate');
const { miSchema } = require('../schemas/mi.schema'); // si usa validación Zod/Joi

const router = express.Router();

// ─── CRUD principal ───────────────────────────────────────────────────────────
router.get('/', verifyToken, (req: Request, res: Response) => MiController.listar(req, res));

router.get('/:id', verifyToken, (req: Request, res: Response) => MiController.detalle(req, res));

router.post('/', verifyToken, validateBody(miSchema), (req: Request, res: Response) => MiController.crear(req, res));

router.patch('/:id', verifyToken, (req: Request, res: Response) => MiController.editar(req, res));

router.delete('/:id', verifyToken, requireAdmin, (req: Request, res: Response) => MiController.eliminar(req, res));

module.exports = router;
```

### Reglas de diseño

1. **Un archivo de rutas por dominio/recurso**: `declaraciones.routes.ts`, `chat.routes.ts`, `admin.routes.ts`.
2. **Router factory pattern**: Cada archivo exporta un `express.Router()`.
3. **Middleware chaining ordenado**: `verifyToken` → `requireAdmin/requireOwnership` → `validateBody` → handler.
4. **Lambda wrapping para controllers**: `(req, res) => Controller.method(req, res)` — evita perder el contexto de `this`.
5. **Agrupación visual con comentarios de sección**:
    ```typescript
    // ─── Chat: mensajes directos ───────────────────────────────────────────────
    ```

### Diseño RESTful

| Acción         | Método | Path                   | Ejemplo                            |
| -------------- | ------ | ---------------------- | ---------------------------------- |
| Listar         | GET    | `/recursos`            | `GET /declaraciones`               |
| Detalle        | GET    | `/recursos/:id`        | `GET /declaraciones/42`            |
| Crear          | POST   | `/recursos`            | `POST /declaraciones`              |
| Editar parcial | PATCH  | `/recursos/:id`        | `PATCH /declaraciones/42`          |
| Reemplazar     | PUT    | `/recursos/:id`        | `PUT /declaraciones/42`            |
| Eliminar       | DELETE | `/recursos/:id`        | `DELETE /declaraciones/42`         |
| Acción custom  | POST   | `/recursos/:id/accion` | `POST /declaraciones/42/aprobar`   |
| Sub-recurso    | GET    | `/recursos/:id/sub`    | `GET /declaraciones/42/respuestas` |

### Composición en index.ts

```typescript
const express = require('express');
const router = express.Router();

const adminRoutes = require('./admin.routes');
const userRoutes = require('./user.routes');
const loginRoutes = require('./login.routes');

router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use('/auth', loginRoutes);

module.exports = router;
```

Y en `app.ts`:

```typescript
const routes = require('./routes');
app.use('/api', routes);
```

### Convenciones de nombrado de parámetros

```typescript
// ✅ Bien: snake_case consistente con la DB
router.get('/declaraciones/:id_declaracion', ...);
router.post('/declaraciones/:id_declaracion/messages', ...);

// ✅ También válido: :id genérico si no hay ambigüedad
router.get('/declaraciones/:id', ...);

// ❌ Evitar: mezclar camelCase con snake_case en URLs
router.get('/declaraciones/:idDeclaracion/:typeState', ...);
```

### Mejores prácticas (mejoras sobre el proyecto actual)

1. **Evitar GET con body para filtros**: Usar query params o POST con body explícito.

    ```typescript
    // ❌ Mal: GET con body (no todas las implementaciones lo soportan)
    router.get('/declaraciones', handler); // con req.body.filters

    // ✅ Bien: query params para filtros simples
    router.get('/declaraciones?estado=activo&page=1', handler);

    // ✅ Bien: POST /search para filtros complejos
    router.post('/declaraciones/search', handler);
    ```

2. **Validación a nivel de ruta**: Usar middleware `validateBody` antes del handler.

3. **Rate limiting por ruta sensible** (si aplica):

    ```typescript
    const rateLimit = require('express-rate-limit');
    const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
    router.post('/login', loginLimiter, handler);
    ```

4. **No duplicar paths**: Si dos endpoints hacen lo mismo con filtros distintos, unificar.

5. **Documentar contratos**: Si hay OpenAPI/Swagger, mantenerlo actualizado con cada ruta nueva.

### Export

```typescript
module.exports = router;
```
