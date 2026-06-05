# Skill: Helpers & Utils Layer

## Propósito

Crear, modificar o refactorizar funciones utilitarias: validación, sanitización, transformación de datos, parsing y helpers de uso general.

## Patrones del proyecto

### Organización

```
src/helpers/     → Funciones específicas del dominio (normalización, parsing de campos)
src/utils/       → Funciones genéricas reutilizables (sanitización, JWT, HTTP client)
```

### Helpers de dominio (helpers/)

#### Normalización de datos para storage

```typescript
// helpers/functions.ts

interface NormalizedPregunta {
    opciones: string | null;
    tooltip_type: 'tooltip' | 'modal' | null;
    regex: string | null;
    isGroupAvailable: boolean | null;
    error_message: string | null;
    max_length: number | null;
    text_group: string | null;
    warningFlag: boolean | null;
    warning_message: string | null;
}

/**
 * Normaliza los campos de una pregunta para persistencia.
 * Aplica reglas de tipo y formato antes de guardar.
 */
export function normalizePreguntaForStorage(raw: any, tipoNombre: string): NormalizedPregunta {
    // Opciones: solo para tipos select/fechafinvigente
    let opciones: string | null = null;
    if (['select', 'fechafinvigente'].includes(tipoNombre) && Array.isArray(raw.opciones)) {
        opciones = JSON.stringify(raw.opciones);
    }

    // Tooltip type: solo valores válidos
    let tooltip_type: 'tooltip' | 'modal' | null = null;
    if (raw.tooltip_type === 'tooltip' || raw.tooltip_type === 'modal') {
        tooltip_type = raw.tooltip_type;
    }

    // Regex: validar que sea regex válido antes de guardar
    const regex = isValidRegex(raw.regex) ? raw.regex : null;

    return {
        opciones,
        tooltip_type,
        regex,
        isGroupAvailable: typeof raw.isGroupAvailable === 'boolean' ? raw.isGroupAvailable : null,
        error_message: raw.error_message || null,
        max_length: Number.isFinite(Number(raw.max_length)) ? Number(raw.max_length) : null,
        text_group:
            Array.isArray(raw.text_group) && raw.text_group.length === 2 ? JSON.stringify(raw.text_group) : null,
        warningFlag: typeof raw.warningFlag === 'boolean' ? raw.warningFlag : null,
        warning_message: raw.warning_message || null,
    };
}
```

#### Validación de formato

```typescript
// helpers/parseBool.ts

/**
 * Parsea valores booleanos de distintos formatos (string, number, boolean).
 * Retorna undefined si no puede interpretar el valor.
 */
export function parseBooleanLike(value: unknown): boolean | undefined {
    if (value === true || value === 'true' || value === '1' || value === 1) return true;
    if (value === false || value === 'false' || value === '0' || value === 0) return false;
    return undefined;
}

/**
 * Valida que un string sea un regex válido.
 * Soporta formato /pattern/flags.
 */
export function isValidRegex(input: unknown): boolean {
    if (!input || typeof input !== 'string') return false;
    try {
        // Soportar formato /pattern/flags
        const match = input.match(/^\/(.+)\/([gimsuy]*)$/);
        if (match) {
            new RegExp(match[1], match[2]);
        } else {
            new RegExp(input);
        }
        return true;
    } catch {
        return false;
    }
}
```

#### Cache de lookups frecuentes

```typescript
// helpers/tipoPreguntaCache.ts

const { ComTipoPregunta } = require('../schema/associations');

let _cache: Map<string, number> | null = null;

/**
 * Resuelve el ID de un tipo de pregunta por nombre.
 * Usa cache en memoria para evitar queries repetidas.
 */
export async function resolveTipoPreguntaId(nombre: string): Promise<number> {
    if (!_cache) {
        const tipos = await ComTipoPregunta.findAll();
        _cache = new Map(tipos.map((t: any) => [t.get('nombre'), t.get('id_tipo_pregunta')]));
    }

    const id = _cache.get(nombre);
    if (!id) throw new Error(`Tipo de pregunta desconocido: "${nombre}"`);
    return id;
}

/** Invalida la cache (para tests o actualizaciones) */
export function clearTipoPreguntaCache(): void {
    _cache = null;
}
```

### Utils genéricos (utils/)

#### Input sanitization

```typescript
// utils/inputSanitizer.ts
import path from 'path';

/**
 * Detecta intentos de path traversal (../), incluyendo encodings dobles.
 */
export function containsPathTraversal(input: string | null | undefined): boolean {
    if (!input || typeof input !== 'string') return false;
    if (input.indexOf('\0') !== -1) return true;

    // Decodificar iterativamente (máximo 5 pasadas)
    let s = String(input);
    try {
        for (let i = 0; i < 5; i++) {
            const prev = s;
            s = decodeURIComponent(s);
            if (s === prev) break;
        }
    } catch {
        return true; // decode error = sospechoso
    }

    const normalized = s.replace(/\\/g, '/');
    if (normalized.includes('../') || /\.{2,}/.test(normalized)) return true;

    const low = normalized.toLowerCase();
    if (low.includes('%2e') || low.includes('%252e')) return true;

    return false;
}

/**
 * Valida un filename con whitelist estricta.
 * Retorna null si es inseguro.
 */
export function sanitizeFilename(filename: string | undefined | null, maxLen = 255): string | null {
    if (!filename || typeof filename !== 'string') return null;
    let f = filename.replace(/\0/g, '').trim();
    if (!f || f.length > maxLen) return null;

    try {
        f = decodeURIComponent(f);
    } catch {
        /* keep original */
    }

    if (f.includes('/') || f.includes('\\')) return null;
    if (!/^[A-Za-z0-9._-]+$/.test(f)) return null;
    if (containsPathTraversal(f)) return null;

    return f;
}

/**
 * Resuelve un path seguro dentro de un directorio base.
 * Retorna null si el path resuelto escapa del base.
 */
export function resolveSafePath(basePath: string, userPath: string): string | null {
    if (containsPathTraversal(userPath)) return null;

    const resolved = path.resolve(basePath, userPath);
    const normalizedBase = path.resolve(basePath);

    if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
        return null;
    }

    return resolved;
}
```

#### JWT Auth utility

```typescript
// utils/JwtAuth.ts
import type { Request, Response, NextFunction } from 'express';
const jwt = require('jsonwebtoken');
const { environment } = require('../configuration/enviroment');

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authorization header requerido' });
        return;
    }

    try {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, environment.JWT_SECRET);
        res.locals.dataUser = decoded;
        next();
    } catch (err: any) {
        const message = err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
        res.status(401).json({ error: message });
    }
}
```

#### HTTP Client

```typescript
// utils/ConnectAPI.ts
import https from 'https';

interface ApiResponse {
    statusCode: number;
    body: any;
}

/**
 * Cliente HTTPS para llamadas a APIs externas.
 */
export async function callExternalApi(
    url: string,
    options: { method?: string; headers?: Record<string, string>; body?: any },
): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const req = https.request(
            {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || 443,
                path: parsedUrl.pathname + parsedUrl.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                // En producción: rejectUnauthorized: true
                rejectUnauthorized: process.env.NODE_ENV === 'production',
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    let body: any;
                    try {
                        body = JSON.parse(data);
                    } catch {
                        body = data;
                    }
                    resolve({ statusCode: res.statusCode || 500, body });
                });
            },
        );

        req.on('error', reject);
        if (options.body) req.write(JSON.stringify(options.body));
        req.end();
    });
}
```

### Reglas de diseño

1. **helpers/ = dominio-específico**: Funciones que solo tienen sentido en este proyecto.
2. **utils/ = genérico-reutilizable**: Funciones que podrían vivir en una librería.
3. **Funciones puras cuando sea posible**: Input → output, sin side effects.
4. **Tipado estricto de entrada y salida**: No usar `any` en parámetros públicos.
5. **Named exports, no default**: Para facilitar tree-shaking y auto-imports.
6. **Un archivo por concern**: `parseBool.ts`, `inputSanitizer.ts`, `tipoPreguntaCache.ts`.

### Mejores prácticas (mejoras sobre el proyecto actual)

1. **No fallar silenciosamente**: Si una validación falla, retornar `null`/`undefined` explícito.

    ```typescript
    // ❌ Mal: retorna undefined implícito
    function validate(x) {
        if (x > 0) return x;
    }

    // ✅ Bien: explícito
    function validate(x: number): number | null {
        return x > 0 ? x : null;
    }
    ```

2. **Cache invalidable**: Toda cache debe tener un método `clear()` para tests.

3. **Documentar con JSDoc las funciones públicas**: Especialmente las de sanitización/seguridad.

4. **Defensive coding en sanitización**: Asumir que el input puede ser cualquier cosa.

    ```typescript
    // Siempre chequear tipo antes de operar
    if (!input || typeof input !== 'string') return null;
    ```

5. **Evitar regex complejos sin explicación**: Documentar qué matchea.

6. **Centralizar parsing repetido**: Si se parsea el mismo formato en varios lugares, extraer.

### Export

```typescript
// Named exports por archivo
export { normalizePreguntaForStorage, isValidRegex };
export { parseBooleanLike };
export { containsPathTraversal, sanitizeFilename, resolveSafePath };
```
