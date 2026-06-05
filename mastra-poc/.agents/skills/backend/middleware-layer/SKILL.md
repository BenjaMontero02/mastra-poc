# Skill: Middleware Layer

## Propósito

Crear, modificar o refactorizar middlewares de Express: autenticación, autorización, validación, auditoría, manejo de errores y headers de seguridad.

## Patrones del proyecto

### Estructura base de un middleware

```typescript
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware de validación genérico.
 * Si se pasa un schema con .parse() (cualquier librería), lo usa.
 * La validación de campos específicos ocurre en el controller.
 */
const validateBody = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
    try {
        if (schema?.parse) req.body = schema.parse(req.body);
        next();
    } catch (err: any) {
        res.status(400).json({
            error: 'Validación fallida',
            detail: err?.errors || err?.message,
        });
    }
};

module.exports = { validateBody };
```

### Tipos de middleware

#### 1. Autenticación (verifyToken)

```typescript
import type { Request, Response, NextFunction } from 'express';
const jwt = require('jsonwebtoken');

const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token requerido' });
        return;
    }

    const token = authHeader.slice(7);
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.locals.dataUser = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

module.exports = { verifyToken };
```

#### 2. Autorización (requireAdmin, requireOwnership)

```typescript
import type { Request, Response, NextFunction } from 'express';

/**
 * Verifica que el usuario tenga rol admin o API key válida.
 */
const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    // Opción 1: API key para servicios internos
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === process.env.INTERNAL_API_KEY) {
        return next();
    }

    // Opción 2: JWT con rol admin
    const user = res.locals.dataUser;
    if (!user || !isAdminRole(user.role)) {
        res.status(403).json({ error: 'Acceso denegado: se requiere rol admin' });
        return;
    }

    next();
};

function isAdminRole(role: string | undefined): boolean {
    return ['admin', 'superadmin'].includes(String(role).toLowerCase());
}

module.exports = { requireAdmin };
```

#### 3. Ownership check

```typescript
const requireOwnership = async (req: Request, res: Response, next: NextFunction) => {
    const resourceId = Number(req.params.id);
    const userEmail = res.locals.dataUser?.email;

    if (!resourceId || !userEmail) {
        return res.status(400).json({ error: 'Datos insuficientes para verificar ownership' });
    }

    const resource = await Model.findByPk(resourceId);
    if (!resource) {
        return res.status(404).json({ error: 'Recurso no encontrado' });
    }

    if (resource.get('usuario_email') !== userEmail) {
        return res.status(403).json({ error: 'No tenés acceso a este recurso' });
    }

    next();
};
```

#### 4. Error Handler global

```typescript
import type { Request, Response, NextFunction } from 'express';
const correlator = require('express-correlation-id');

const errorHandler = (error: any, req: Request, res: Response, _next: NextFunction): void => {
    const correlatorId = correlator.getId();
    const statusCode = error.statusCode || 500;
    const isClientError = statusCode >= 400 && statusCode < 500;

    // Log completo internamente
    console.error(`[error-handler] ${correlatorId}`, {
        method: req.method,
        path: req.path,
        statusCode,
        message: error.message,
        stack: isClientError ? undefined : error.stack,
    });

    // Respuesta al cliente sin exponer internos
    res.status(statusCode).json({
        error: isClientError ? error.message : 'Error interno del servidor',
        correlatorId,
    });
};

module.exports = { errorHandler };
```

#### 5. Audit Logger

```typescript
const auditLogger = (action: string) => async (req: Request, res: Response, next: NextFunction) => {
    const userEmail = res.locals.dataUser?.email || 'unknown';
    const resourceId = req.params.id || null;

    // Fire-and-forget audit entry
    setImmediate(async () => {
        try {
            await AuditModel.create({
                action,
                actor_email: userEmail,
                resource_id: resourceId,
                ip: req.ip,
                user_agent: req.headers['user-agent'],
                route: `${req.method} ${req.originalUrl}`,
                timestamp: new Date(),
            });
        } catch (err) {
            console.warn('[audit] failed to write audit log:', err);
        }
    });

    next();
};
```

#### 6. Security Headers

```typescript
const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0'); // CSP es preferido
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.removeHeader('X-Powered-By');
    next();
};
```

### Reglas de diseño

1. **Un middleware, una responsabilidad**: No mezclar auth + validación + audit en uno solo.
2. **Orden en el stack importa**: security headers → CORS → correlation-id → auth → routes → error handler.
3. **Siempre llamar `next()`** o enviar respuesta. Nunca dejar el request colgado.
4. **Error handler al final del stack**: `app.use(errorHandler)` después de todas las rutas.
5. **Middlewares async deben capturar errores**: Wrappear con try-catch o usar `express-async-errors`.
6. **No exponer datos sensibles**: Validation errors pueden mostrar field names pero no valores de la DB.
7. **Audit logging no bloquea**: Usar fire-and-forget con console.warn en caso de fallo.

### Mejores prácticas (mejoras sobre el proyecto actual)

1. **Correlator ID consistente**: Siempre incluirlo en error responses para trazabilidad.
2. **Schema validation con tipos inferidos**: Si usás Zod, podés inferir el tipo del body parseado.
3. **Rate limiting en rutas sensibles**: Login, reset password, upload.
4. **Helmet o headers manuales**: Usar helmet.js o declarar headers explícitos.
5. **No silenciar errores de auth**: Si falta el token, responder 401 inmediatamente.

### Export

```typescript
module.exports = { middlewareName };
// O para middleware factories:
module.exports = { validateBody, auditLogger };
```
