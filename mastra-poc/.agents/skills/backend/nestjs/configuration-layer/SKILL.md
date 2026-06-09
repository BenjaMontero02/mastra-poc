# Skill: Configuration Layer

## Propósito

Crear, modificar o refactorizar la configuración del proyecto: variables de entorno, conexión a base de datos, constantes de dominio y validación de startup.

## Patrones del proyecto

### Environment (enviroment.ts)

```typescript
/**
 * Configuración centralizada de variables de entorno con defaults seguros.
 * NUNCA poner credenciales reales como default — usar string vacío.
 */
const _environment = {
    // ─── Server ─────────────────────────────────────────────────────────────
    PORT: Number(process.env.PORT) || 7070,
    NODE_ENV: process.env.NODE_ENV || 'development',
    DOMAIN: process.env.DOMAIN || '*',

    // ─── Database ───────────────────────────────────────────────────────────
    DB_USER: process.env.DB_USER || '',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_HOST: process.env.DB_HOST || '',
    DB_PORT: Number(process.env.DB_PORT) || 1433,
    DB_NAME: process.env.DB_NAME || '',

    // ─── Auth / OAuth ───────────────────────────────────────────────────────
    JWT_SECRET: process.env.JWT_SECRET || '',
    CLIENT_ID: process.env.CLIENT_ID || '',
    PRIVATE_KEY: process.env.PRIVATE_KEY || '',
    URL_TOKEN: process.env.URL_TOKEN || '',

    // ─── SMTP ───────────────────────────────────────────────────────────────
    SMTP_HOST: process.env.SMTP_HOST || '',
    SMTP_PORT: Number(process.env.SMTP_PORT) || 25,
    EMAIL_FROM: process.env.EMAIL_FROM || '',
    EMAIL_FROM_NOREPLY: process.env.EMAIL_FROM_NOREPLY || '',

    // ─── URLs externas ──────────────────────────────────────────────────────
    REDIRECT_FRONT: process.env.REDIRECT_FRONT || '',
    URL_LOGIN: process.env.URL_LOGIN || '',
};

module.exports = { environment: _environment };
```

### Database (database.ts)

```typescript
const { Sequelize } = require('sequelize');
const { environment } = require('./enviroment');

const sequelize = new Sequelize(environment.DB_NAME, environment.DB_USER, environment.DB_PASSWORD, {
    host: environment.DB_HOST,
    port: environment.DB_PORT,
    dialect: 'mssql',
    logging: environment.NODE_ENV === 'development' ? console.log : false,
    timezone: '-03:00',
    dialectOptions: {
        options: {
            encrypt: true,
            trustServerCertificate: true,
        },
    },
    pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
    },
});

module.exports = sequelize;
```

### Constantes de dominio (consts.ts)

```typescript
/**
 * Constantes de dominio centralizadas.
 * IDs, listas de admins, configuración de CORS, etc.
 */

// ─── CORS ───────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const corsOptions = {
    origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-correlator'],
    credentials: true,
};

// ─── Admin config ───────────────────────────────────────────────────────────
const ADMINS_EMAIL: string[] = (process.env.ADMINS_EMAIL || '').split(',').filter(Boolean);
const ADMINS_NOMBRES: string[] = (process.env.ADMINS_NOMBRES || '').split(',').filter(Boolean);

// ─── IDs de preguntas específicas (extraídos del código) ────────────────────
const PREGUNTA_INVITADOS_IDS = [898, 899]; // TODO: mover a tabla de config
const PREGUNTA_EMPRESA_ID = 841;

// ─── Estados ────────────────────────────────────────────────────────────────
const ESTADOS = {
    EN_ANALISIS: 'En análisis',
    CERRADA_SIN_CONFLICTO: 'Cerrada - No existen conflictos',
    APROBADA: 'Aprobada',
    PLAN_ACCION: 'Plan de acción',
    APROBADA_CON_OBSERVACIONES: 'Aprobada con observaciones',
} as const;

module.exports = { corsOptions, ADMINS_EMAIL, ADMINS_NOMBRES, PREGUNTA_INVITADOS_IDS, PREGUNTA_EMPRESA_ID, ESTADOS };
```

### Validación de startup

```typescript
/**
 * Valida que todas las variables de entorno requeridas estén presentes.
 * Ejecutar al inicio de la aplicación, antes de conectar a DB.
 */
function validateEnvironment(): void {
    const required = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_NAME', 'JWT_SECRET'];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        console.error(`[config] Variables de entorno faltantes: ${missing.join(', ')}`);
        process.exit(1);
    }
}

module.exports = { validateEnvironment };
```

### Reglas de diseño

1. **Centralizar toda config en un objeto**: Importar siempre desde `configuration/`.
2. **Nunca hardcodear credenciales como default**: Usar string vacío y validar al inicio.
3. **Tipar numéricamente los puertos**: `Number(process.env.PORT) || default`.
4. **Agrupar por dominio**: DB, Auth, SMTP, URLs externas.
5. **Constantes de dominio separadas de env**: `consts.ts` para IDs, estados, listas.
6. **Validar en startup**: Fallar rápido si falta config crítica.

### Mejores prácticas (mejoras sobre el proyecto actual)

1. **No exponer defaults de credenciales**:

    ```typescript
    // ❌ Mal: credenciales en código
    dbPassword: process.env.dbPassword || 'c0mpl13nc3',

    // ✅ Bien: vacío + validación de startup
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    ```

2. **Naming consistente**: Usar UPPER_SNAKE para env vars, camelCase para objetos de config.

3. **Type-safe environment**:

    ```typescript
    interface Environment {
        PORT: number;
        NODE_ENV: 'development' | 'production' | 'test';
        DB_HOST: string;
        // ...
    }
    const environment: Environment = { ... };
    ```

4. **Pool configuration ajustable**: Max connections como env var para distintos entornos.

5. **Logging condicional en DB**: Solo en development, nunca en production (puede loggear datos sensibles).

### Export

```typescript
module.exports = { environment };
module.exports = { corsOptions, ESTADOS, ADMINS_EMAIL };
module.exports = { validateEnvironment };
```
