# Skill: Backend Project Scaffold

## Propósito

Crear un proyecto backend Node.js/Express/TypeScript/Sequelize desde cero con estructura profesional, configuración segura y patrones listos para escalar.

## Cuándo se activa

- El usuario pide crear un nuevo proyecto backend.
- Se necesita un boilerplate con las mejores prácticas del equipo.
- Se va a iniciar un microservicio o API nueva desde cero.

## Stack base

| Capa           | Tecnología                                      |
| -------------- | ----------------------------------------------- |
| Runtime        | Node.js (LTS)                                   |
| Lenguaje       | TypeScript (strict mode)                        |
| Framework HTTP | Express                                         |
| ORM            | Sequelize (MSSQL / PostgreSQL configurable)     |
| Validación     | Manual en controllers (sin librería de schemas) |
| Auth           | JWT (jsonwebtoken)                              |
| Email          | Nodemailer                                      |
| Logging        | Correlator ID + console estructurado            |
| Testing        | Jest + Supertest                                |
| Linting        | ESLint + Prettier                               |

## Estructura de carpetas resultante

```
proyecto/
├── .env.example              # Variables requeridas documentadas
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── jest.config.ts
├── tsconfig.json
├── tsconfig.jest.json
├── nodemon.json
├── package.json
├── README.md
├── src/
│   ├── app.ts                # Setup de Express (middlewares, routes, swagger)
│   ├── server.ts             # Entry point: validate env → connect DB → listen
│   ├── configuration/
│   │   ├── environment.ts    # Env vars centralizadas con tipado
│   │   ├── database.ts       # Sequelize instance singleton
│   │   ├── consts.ts         # Constantes de dominio (estados, IDs)
│   │   └── validateEnv.ts    # Validación de startup con fail-fast
│   ├── controllers/
│   │   └── health.controller.ts
│   ├── services/
│   │   └── .gitkeep
│   ├── routes/
│   │   ├── index.ts          # Composición de sub-routers
│   │   └── health.routes.ts
│   ├── middlewares/
│   │   ├── errorHandler.ts   # Error handler global con correlator
│   │   ├── validate.ts       # validateBody con Zod
│   │   ├── auth.ts           # verifyToken JWT
│   │   ├── requireAdmin.ts   # Autorización por rol
│   │   └── securityHeaders.ts
│   ├── schema/
│   │   └── associations.ts   # Punto central de asociaciones
│   ├── queries/
│   │   └── .gitkeep
│   ├── helpers/
│   │   └── parseBool.ts
│   ├── utils/
│   │   ├── inputSanitizer.ts # Path traversal, filename whitelist
│   │   └── httpClient.ts     # Cliente HTTP externo tipado
│   ├── email/
│   │   ├── EmailService.ts
│   │   └── templates/
│   │       └── .gitkeep
│   ├── types/
│   │   ├── dtos.ts
│   │   ├── express.d.ts      # Type augmentation
│   │   └── environment.d.ts
│   └── docs/
│       └── openapi.json      # Spec base vacía
└── tests/
    ├── unit/
    │   └── .gitkeep
    ├── integration/
    │   └── .gitkeep
    └── mocks/
        └── .gitkeep
```

## Proceso de scaffolding (orden de ejecución)

### Fase 1: Inicialización del proyecto

```bash
mkdir proyecto && cd proyecto
npm init -y
```

**package.json** — scripts mínimos:

```json
{
    "scripts": {
        "dev": "nodemon",
        "build": "tsc",
        "start": "node dist/server.js",
        "test": "jest --coverage",
        "test:watch": "jest --watch",
        "lint": "eslint src/ --ext .ts",
        "lint:fix": "eslint src/ --ext .ts --fix"
    }
}
```

**Dependencias de producción:**

```bash
npm install express sequelize tedious dotenv cors jsonwebtoken nodemailer express-correlation-id
```

**Dependencias de desarrollo:**

```bash
npm install -D typescript @types/node @types/express @types/cors @types/jsonwebtoken @types/nodemailer ts-node nodemon jest ts-jest @types/jest supertest @types/supertest eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier
```

### Fase 2: Configuración de TypeScript

**tsconfig.json:**

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "lib": ["ES2020"],
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "tests"]
}
```

**nodemon.json:**

```json
{
    "watch": ["src"],
    "ext": "ts",
    "exec": "ts-node src/server.ts",
    "ignore": ["tests/", "dist/"]
}
```

### Fase 3: Archivos core (de abajo hacia arriba)

#### 3.1 — Configuration

**src/configuration/environment.ts:**

```typescript
interface Environment {
    PORT: number;
    NODE_ENV: 'development' | 'production' | 'test';
    DB_USER: string;
    DB_PASSWORD: string;
    DB_HOST: string;
    DB_PORT: number;
    DB_NAME: string;
    JWT_SECRET: string;
    SMTP_HOST: string;
    SMTP_PORT: number;
    EMAIL_FROM: string;
    ALLOWED_ORIGINS: string[];
    INTERNAL_API_KEY: string;
}

const environment: Environment = {
    PORT: Number(process.env.PORT) || 3000,
    NODE_ENV: (process.env.NODE_ENV as Environment['NODE_ENV']) || 'development',
    DB_USER: process.env.DB_USER || '',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_HOST: process.env.DB_HOST || '',
    DB_PORT: Number(process.env.DB_PORT) || 1433,
    DB_NAME: process.env.DB_NAME || '',
    JWT_SECRET: process.env.JWT_SECRET || '',
    SMTP_HOST: process.env.SMTP_HOST || '',
    SMTP_PORT: Number(process.env.SMTP_PORT) || 25,
    EMAIL_FROM: process.env.EMAIL_FROM || '',
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || '',
};

export { environment };
export type { Environment };
```

**src/configuration/validateEnv.ts:**

```typescript
export function validateEnvironment(): void {
    const required = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_NAME', 'JWT_SECRET'];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`);
        console.error('[startup] Check .env.example for reference');
        process.exit(1);
    }
}
```

**src/configuration/database.ts:**

```typescript
import { Sequelize } from 'sequelize';
import { environment } from './environment';

const sequelize = new Sequelize(environment.DB_NAME, environment.DB_USER, environment.DB_PASSWORD, {
    host: environment.DB_HOST,
    port: environment.DB_PORT,
    dialect: 'mssql', // cambiar a 'postgres' si aplica
    logging: environment.NODE_ENV === 'development' ? console.log : false,
    timezone: '-03:00',
    dialectOptions: {
        options: {
            encrypt: true,
            trustServerCertificate: environment.NODE_ENV !== 'production',
        },
    },
    pool: {
        max: Number(process.env.DB_POOL_MAX) || 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
    },
});

export default sequelize;
```

#### 3.2 — Middlewares

**src/middlewares/errorHandler.ts:**

```typescript
import type { Request, Response, NextFunction } from 'express';
import correlator from 'express-correlation-id';

export class AppError extends Error {
    constructor(
        public statusCode: number,
        message: string,
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
    const correlatorId = correlator.getId();
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const isClientError = statusCode >= 400 && statusCode < 500;

    console.error(`[error-handler] ${correlatorId}`, {
        method: req.method,
        path: req.path,
        statusCode,
        message: err.message,
        ...(isClientError ? {} : { stack: err.stack }),
    });

    res.status(statusCode).json({
        error: isClientError ? err.message : 'Internal server error',
        correlatorId,
    });
}
```

**src/middlewares/validate.ts:**

```typescript
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware de validación genérico compatible con cualquier librería
 * que exponga un método .parse() (Zod, Joi, etc.).
 * La validación específica de campos ocurre en el controller.
 */
const validateBody = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
    try {
        if (schema?.parse) req.body = schema.parse(req.body);
        next();
    } catch (err: any) {
        res.status(400).json({ error: 'Validación fallida', detail: err?.errors || err?.message });
    }
};

export { validateBody };
```

> **Nota**: La validación principal se hace manualmente en cada controller (parsing defensivo, `Number.isFinite`, `Array.isArray`, etc.). El middleware `validateBody` es un punto de extensión opcional para cuando se quiera agregar un schema parser.

**src/middlewares/auth.ts:**

```typescript
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { environment } from '../configuration/environment';

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authorization header required' });
        return;
    }

    try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, environment.JWT_SECRET);
        res.locals.dataUser = decoded;
        next();
    } catch (err: any) {
        const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        res.status(401).json({ error: message });
    }
}
```

**src/middlewares/securityHeaders.ts:**

```typescript
import type { Request, Response, NextFunction } from 'express';

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Cache-Control', 'no-store');
    res.removeHeader('X-Powered-By');
    next();
}
```

#### 3.3 — App & Server

**src/app.ts:**

```typescript
import express from 'express';
import cors from 'cors';
import correlator from 'express-correlation-id';
import { environment } from './configuration/environment';
import { securityHeaders } from './middlewares/securityHeaders';
import { errorHandler } from './middlewares/errorHandler';
import routes from './routes';

const app = express();

// ─── Global middlewares ─────────────────────────────────────────────────────
app.use(correlator());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: environment.ALLOWED_ORIGINS.length ? environment.ALLOWED_ORIGINS : '*',
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-correlator'],
        credentials: true,
    }),
);
app.use(securityHeaders);

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Error handler (must be last) ───────────────────────────────────────────
app.use(errorHandler);

export default app;
```

**src/server.ts:**

```typescript
import dotenv from 'dotenv';
dotenv.config();

import { validateEnvironment } from './configuration/validateEnv';
validateEnvironment();

import app from './app';
import sequelize from './configuration/database';
import { environment } from './configuration/environment';

async function bootstrap() {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.info('[server] Database connected successfully');

        // Start listening
        app.listen(environment.PORT, () => {
            console.info(`[server] Running on port ${environment.PORT} (${environment.NODE_ENV})`);
        });
    } catch (err) {
        console.error('[server] Failed to start:', err);
        process.exit(1);
    }
}

bootstrap();
```

#### 3.4 — Routes base

**src/routes/index.ts:**

```typescript
import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

router.use('/health', healthRoutes);
// router.use('/admin', adminRoutes);
// router.use('/user', userRoutes);

export default router;
```

**src/routes/health.routes.ts:**

```typescript
import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();

router.get('/', HealthController.check);

export default router;
```

**src/controllers/health.controller.ts:**

```typescript
import type { Request, Response } from 'express';
import sequelize from '../configuration/database';

export class HealthController {
    static async check(_req: Request, res: Response) {
        try {
            await sequelize.authenticate();
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        } catch {
            res.status(503).json({ status: 'unhealthy', timestamp: new Date().toISOString() });
        }
    }
}
```

### Fase 4: Type augmentation

**src/types/express.d.ts:**

```typescript
declare global {
    namespace Express {
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

### Fase 5: Archivos de entorno

**.env.example:**

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_USER=
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=1433
DB_NAME=
DB_POOL_MAX=10

# Auth
JWT_SECRET=

# SMTP
SMTP_HOST=
SMTP_PORT=25
EMAIL_FROM=

# Security
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
INTERNAL_API_KEY=
```

**.gitignore:**

```
node_modules/
dist/
.env
*.log
coverage/
.DS_Store
```

### Fase 6: Testing setup

**jest.config.ts:**

```typescript
import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/types/**'],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    testMatch: ['**/*.test.ts', '**/*.spec.ts'],
};

export default config;
```

**tsconfig.jest.json:**

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "rootDir": ".",
        "noUnusedLocals": false,
        "noUnusedParameters": false
    },
    "include": ["src/**/*", "tests/**/*"]
}
```

## Checklist post-scaffold

- [ ] `npm install` ejecuta sin errores
- [ ] `npm run build` compila sin errores TypeScript
- [ ] `npm run dev` levanta el server con nodemon
- [ ] `GET /api/health` responde `{ status: "ok" }`
- [ ] `.env` creado a partir de `.env.example` con valores reales
- [ ] Variables requeridas validadas al inicio (falla si faltan)
- [ ] CORS configurado para los orígenes del frontend
- [ ] Error handler captura y loggea errores con correlator ID
- [ ] Security headers presentes en cada respuesta

## Guía de extensión (siguientes pasos)

Una vez scaffoldeado el proyecto, usar las skills específicas para agregar funcionalidad:

1. **Agregar un recurso nuevo** → `schema-layer` → `types-layer` → `service-layer` → `controller-layer` → `route-layer`
2. **Agregar autenticación** → `middleware-layer` (auth + requireAdmin)
3. **Agregar emails** → `email-layer`
4. **Agregar filtros y paginación** → `query-layer`
5. **Planificar un feature completo** → `backend-vertical-slice`
6. **Aclarar requerimientos** → `backend-feature-discovery`

## Anti-patterns al scaffoldear

- NO agregar dependencias "por las dudas" — instalar cuando se necesiten.
- NO crear 10 modelos vacíos — crear a medida que se implementan features.
- NO hardcodear credenciales ni siquiera en development.
- NO omitir `.env.example` — es la documentación viva de las variables requeridas.
- NO usar `any` como escape — si no sabés el tipo, es señal de que falta una interface.
- NO skipear strict mode en tsconfig — los errores que detecta temprano ahorran bugs en producción.
