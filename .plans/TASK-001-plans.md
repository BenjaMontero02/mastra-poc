# Planes TASK-001: Login SSO con Entra ID

---

## PLAN DE CÓDIGO

### Assumptions

1. **Proyecto greenfield**: El repositorio está vacío. Se creará todo desde cero.
2. **Entra ID tenant**: Existe un tenant de Microsoft Entra ID con un App Registration configurado. Las credenciales (Client ID, Client Secret, Tenant ID) se proveerán como variables de entorno.
3. **Next.js App Router**: Se usará Next.js 14+ con App Router (no Pages Router).
4. **NextAuth v5 (Auth.js)**: Se usará `next-auth@5` (beta) para la integración con Entra ID.
5. **NestJS standalone**: El backend NestJS corre en puerto separado (3001).
6. **Mastra**: Se instalará el workspace pero la integración con agentes será mínima — solo verificar que compila.
7. **Base de datos**: SQLite con TypeORM para desarrollo local.

---

### 1. Resumen

Implementar autenticación SSO con Microsoft Entra ID usando NextAuth.js en Next.js 14. El backend NestJS validará tokens JWT emitidos por Entra ID. Se configurará Mastra como framework de agentes. El resultado es un flujo completo: clic en "Iniciar sesión con Microsoft" → redirección a Entra ID → autenticación → sesión activa en la app.

---

### 2. Arquitectura

| Capa | Tecnología | Rol |
|------|-----------|-----|
| Frontend | Next.js 14 (App Router) + React 18 + Tailwind | Login, dashboard protegido, botón SSO |
| Auth | NextAuth.js v5 | Proveedor Entra ID, sesión, callbacks JWT |
| Backend | NestJS + Fastify + TypeORM | Validación de tokens, endpoint `/api/auth/validate` |
| Agentes | Mastra | Configuración base, sin agentes aún |

**Patrones**: React Server Components por defecto, `'use client'` solo donde necesario. NestJS con módulos/controladores/servicios. TypeORM entities con decoradores.

---

### 3. Archivos a crear/modificar

#### Frontend (27 archivos)

```
[CREAR] current/frontend/package.json
[CREAR] current/frontend/next.config.js
[CREAR] current/frontend/tsconfig.json
[CREAR] current/frontend/tailwind.config.ts
[CREAR] current/frontend/postcss.config.js
[CREAR] current/frontend/.env.local
[CREAR] current/frontend/src/auth.ts
[CREAR] current/frontend/src/auth.config.ts
[CREAR] current/frontend/src/middleware.ts
[CREAR] current/frontend/src/app/layout.tsx
[CREAR] current/frontend/src/app/page.tsx
[CREAR] current/frontend/src/app/login/page.tsx
[CREAR] current/frontend/src/app/dashboard/page.tsx
[CREAR] current/frontend/src/app/api/auth/[...nextauth]/route.ts
[CREAR] current/frontend/src/components/LoginButton.tsx
[CREAR] current/frontend/src/components/UserInfo.tsx
[CREAR] current/frontend/src/components/SessionProvider.tsx
[CREAR] current/frontend/src/lib/auth-client.ts
[CREAR] current/frontend/src/types/next-auth.d.ts
```

#### Backend (15 archivos)

```
[CREAR] current/backend/package.json
[CREAR] current/backend/tsconfig.json
[CREAR] current/backend/nest-cli.json
[CREAR] current/backend/.env
[CREAR] current/backend/src/main.ts
[CREAR] current/backend/src/app.module.ts
[CREAR] current/backend/src/auth/auth.module.ts
[CREAR] current/backend/src/auth/auth.controller.ts
[CREAR] current/backend/src/auth/auth.service.ts
[CREAR] current/backend/src/auth/jwt.strategy.ts
[CREAR] current/backend/src/auth/auth.guard.ts
[CREAR] current/backend/src/user/user.entity.ts
[CREAR] current/backend/src/user/user.module.ts
[CREAR] current/backend/src/user/user.service.ts
```

#### Mastra (4 archivos)

```
[CREAR] current/mastra/package.json
[CREAR] current/mastra/tsconfig.json
[CREAR] current/mastra/src/mastra/index.ts
[CREAR] current/mastra/src/mastra/agents/hello-agent.ts
```

#### Raíz (3 archivos)

```
[CREAR] current/.gitignore
[CREAR] current/README.md
[CREAR] current/.env.example
```

---

### 4. Dependencias npm

**Frontend**: `next@^14.2`, `react@^18.3`, `react-dom@^18.3`, `next-auth@5.0.0-beta.25`, `tailwindcss@^3.4`, `postcss@^8.4`, `autoprefixer@^10.4`

**Backend**: `@nestjs/common@^10.3`, `@nestjs/core@^10.3`, `@nestjs/platform-fastify@^10.3`, `@nestjs/typeorm@^10.0`, `@nestjs/config@^3.2`, `@nestjs/jwt@^10.2`, `@nestjs/passport@^10.0`, `passport@^0.7`, `passport-jwt@^4.0.1`, `typeorm@^0.3.20`, `better-sqlite3@^11.0`, `jwks-rsa@^3.1`, `fastify@^4.26`, `reflect-metadata@^0.2.2`, `rxjs@^7.8`, `@nestjs/cli@^10.3`

**Mastra**: `@mastra/core@^0.5`, `ai@^3.3`, `zod@^3.23`

---

### 5. Pasos de implementación (17 pasos)

#### Fase 1: Estructura

- [ ] **Paso 1**: Crear estructura de directorios `current/frontend`, `current/backend`, `current/mastra`
- [ ] **Paso 2**: Crear `current/.gitignore` con `node_modules/`, `.next/`, `dist/`, `.env`, `.env.local`, `*.db`

#### Fase 2: Backend NestJS

- [ ] **Paso 3**: Inicializar backend — `package.json`, `tsconfig.json`, `nest-cli.json`, instalar dependencias
- [ ] **Paso 4**: Crear `User` entity en `backend/src/user/user.entity.ts` (columnas: `id` uuid PK, `entraId` unique, `email`, `name`, `role` default 'user')
- [ ] **Paso 5**: Crear `UserModule` y `UserService` con métodos `findByEntraId()` y `create()`
- [ ] **Paso 6**: Crear `AuthModule`: `jwt.strategy.ts` usando `jwks-rsa` con `passportJwtSecret`, `auth.guard.ts` (AuthGuard jwt), `auth.controller.ts` (endpoint `GET /api/auth/validate`), `auth.service.ts` (validación + upsert usuario)
- [ ] **Paso 7**: Crear `app.module.ts` con TypeORM SQLite (`better-sqlite3`, `synchronize: true`), importar Auth y User modules
- [ ] **Paso 8**: Crear `main.ts` con bootstrap Fastify, `enableCors({ origin: 'http://localhost:3000', credentials: true })`, listen en 3001
- [ ] **Paso 9**: Crear `backend/.env` con `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `PORT=3001`

#### Fase 3: Frontend Next.js

- [ ] **Paso 10**: Inicializar frontend — `package.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, instalar
- [ ] **Paso 11**: Configurar NextAuth en `src/auth.ts` con provider `MicrosoftEntraID`, callbacks `jwt` y `session` para propagar `entraId`
- [ ] **Paso 12**: Crear `src/auth.config.ts` con `pages: { signIn: '/login' }` y callback `authorized` que protege `/dashboard`
- [ ] **Paso 13**: Crear `src/middleware.ts` usando `NextAuth(authConfig).auth` con matcher `/((?!api|_next/static|_next/image|favicon.ico).*)`
- [ ] **Paso 14**: Crear route handler `src/app/api/auth/[...nextauth]/route.ts` exportando `{ GET, POST }` de `handlers`
- [ ] **Paso 15**: Crear componentes y páginas:
  - `LoginButton.tsx`: `'use client'`, llama a `signIn('microsoft-entra-id')`
  - `UserInfo.tsx`: muestra `session.user.name`, `.email`
  - `SessionProvider.tsx`: wrapper con `SessionProvider` de next-auth
  - `layout.tsx`: HTML root, Tailwind globals, SessionProvider
  - `page.tsx`: landing page pública con link a `/login`
  - `login/page.tsx`: botón SSO + manejo de error vía `searchParams.error`
  - `dashboard/page.tsx`: protegido, muestra UserInfo + botón signOut
- [ ] **Paso 16**: Configurar `frontend/.env.local` con `AUTH_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ID`, `_SECRET`, `_TENANT_ID`

#### Fase 4: Mastra

- [ ] **Paso 17**: Configurar Mastra — `mastra/package.json`, instalar, `src/mastra/index.ts` con runtime config, `hello-agent.ts` con un agente dummy

---

### 6. Contratos API

```
POST /api/auth/[...nextauth]  — NextAuth handler (signin, callback, signout, session)

GET /api/auth/validate
Headers: Authorization: Bearer <entra-id-jwt>
Response 200: { valid: true, user: { id, entraId, email, name, role } }
Response 401: { valid: false, error: "Invalid or expired token" }
```

---

### 7. Variables de entorno

| Variable | Archivo | Descripción |
|----------|---------|-------------|
| `AUTH_SECRET` | frontend/.env.local | `openssl rand -base64 32` |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | frontend/.env.local | Client ID del App Registration |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | frontend/.env.local | Client Secret |
| `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` | frontend/.env.local | Tenant ID |
| `ENTRA_TENANT_ID` | backend/.env | Para validación JWKS |
| `ENTRA_CLIENT_ID` | backend/.env | Para validar audiencia |
| `PORT` | backend/.env | Default: 3001 |

---

## PLAN DE QA

### Assumptions

1. Existe tenant de Entra ID de desarrollo con usuarios de prueba.
2. App Registration configurado con redirect URI `http://localhost:3000/api/auth/callback/microsoft-entra-id`.
3. Playwright headless contra `localhost:3000` (frontend) y `localhost:3001` (backend).
4. Mock de Entra ID para tests negativos/borde que no deben depender del tenant real.
5. BD SQLite limpia al inicio de cada suite.

---

### 1. Alcance

**Cubre**: Login SSO happy path, errores de auth, protección de rutas, persistencia de sesión, logout, validación JWT backend, renderizado condicional, creación automática de usuario.

**Fuera de alcance**: Otros proveedores, MFA, RBAC avanzado, logout federado, agentes Mastra, tests de carga, WCAG.

---

### 2. User Stories

#### US-01: Login exitoso con cuenta Microsoft
- Botón "Iniciar sesión con Microsoft" visible en `/` y `/login`
- Redirección a `login.microsoftonline.com`
- Post-auth redirección a `/dashboard`
- Nombre y email visibles
- Sesión persiste al refrescar

#### US-02: Protección de rutas
- `/dashboard` sin sesión → redirige a `/login`
- URL incluye `callbackUrl=/dashboard`
- Post-login vuelve automáticamente a `/dashboard`

#### US-03: Cierre de sesión
- Botón "Cerrar sesión" visible en dashboard
- Destruye cookie de sesión
- Redirige a `/`
- `/dashboard` inaccesible post-logout

#### US-04: Validación backend
- Token válido → 200 con datos de usuario
- Token expirado → 401
- Token malformado → 401
- Sin token → 401

---

### 3. Escenarios de prueba

#### Modo Positivos

**P1 — Login completo con cuenta Microsoft válida**
- Given: Sin sesión, en `/`
- When: Click "Iniciar sesión con Microsoft" → redirigido a Entra ID → credenciales válidas → consentimiento
- Then: Redirigido a `/dashboard`, ve "Bienvenido, Test User" y email, cookie `authjs.session-token` httpOnly existe, refresh mantiene sesión

**P2 — Redirección a ruta original**
- Given: Sin sesión, intenta acceder a `/dashboard`
- When: Redirigido a `/login?callbackUrl=/dashboard` → login → completa auth
- Then: Redirigido directamente a `/dashboard`

**P3 — Logout limpio**
- Given: Sesión activa en `/dashboard`
- When: Click "Cerrar sesión"
- Then: Redirigido a `/`, cookie destruida, botón login visible, `/dashboard` inaccesible

**P4 — Validación backend token válido**
- Given: Token JWT válido de Entra ID
- When: `GET /api/auth/validate` con `Authorization: Bearer <token>`
- Then: 200, body con `{ valid: true, user: { id, entraId, email, name, role } }`

**P5 — Creación automática de usuario en BD**
- Given: Primer login de un usuario, BD vacía
- When: Login SSO exitoso
- Then: Tabla `user` tiene registro con `entraId` = oid del token, email correcto

#### Modo Negativos

**N1 — Usuario cancela en Entra ID**
- Given: En `/login`, click login
- When: Redirigido a MS, hace "Cancel" o cierra pestaña
- Then: Redirigido a `/login?error=AccessDenied`, mensaje "Inicio de sesión cancelado", sin sesión

**N2 — Token expirado en backend**
- Given: Token JWT expirado hace 5 min
- When: `GET /api/auth/validate` con token expirado
- Then: 401, `{ valid: false, error: "Invalid or expired token" }`

**N3 — Token malformado en backend**
- Given: String arbitrario `"not-a-valid-jwt"`
- When: Enviado al backend
- Then: 401

**N4 — Sin token en backend**
- Given: Sin header Authorization
- When: `GET /api/auth/validate`
- Then: 401, `{ valid: false, error: "No token provided" }`

**N5 — Token con firma incorrecta**
- Given: JWT autofirmado (no Entra ID)
- When: Enviado al backend
- Then: 401, validación de firma falla

**N6 — CSRF en inicio de OAuth**
- Given: Request directo a `/api/auth/signin/microsoft-entra-id` sin cookie CSRF
- When: GET sin pasar por página de login
- Then: NextAuth rechaza con error CSRF

#### Modo Borde

**B1 — Doble clic rápido en login**
- Given: En `/login`
- When: Doble clic <500ms en botón login
- Then: Solo un flujo OAuth inicia, sin errores de estado duplicado, login procede normal

**B2 — Sesión expirada durante uso**
- Given: Sesión activa pero token JWT expiró
- When: Refresca o navega
- Then: NextAuth intenta refresh silencioso; si falla, redirige a `/login`

**B3 — Email de 255 caracteres**
- Given: Cuenta con email en límite de columna
- When: Login exitoso
- Then: Email guardado sin truncamiento

**B4 — Sin foto de perfil en Entra ID**
- Given: Usuario sin foto
- When: Login
- Then: Placeholder o iniciales, sin errores visuales

**B5 — Claims adicionales en token**
- Given: Token con claims extras (`ipaddr`, `amr`, roles custom)
- When: Validación backend
- Then: Exitosa, claims extras ignorados sin errores

**B6 — Login simultáneo en dos pestañas**
- Given: Dos pestañas en `/login`
- When: Login en pestaña 1, luego login en pestaña 2 (ya autenticada)
- Then: Ambas con sesión válida, sin conflictos

#### Modo E2E

**E2E — Recorrido completo**
- Given: App en `:3000`, backend en `:3001`, BD vacía, tenant disponible, usuario `e2e-test-user@tenant.onmicrosoft.com`
- When:
  1. Abre `localhost:3000` → ve landing + botón login
  2. Click login → redirigido a MS → completa credenciales
  3. Redirigido a `/dashboard` → "Bienvenido, E2E Test User"
  4. Refresh → sigue autenticado
  5. Obtiene token de `/api/auth/session`
  6. `curl -H "Authorization: Bearer <token>" localhost:3001/api/auth/validate`
  7. Backend responde 200 con datos
  8. BD tiene registro del usuario
  9. Click "Cerrar sesión" → redirigido a `/`
  10. Intenta `/dashboard` → redirigido a `/login`
- Then: Todos los pasos sin errores, sesión creada/destruida, validación backend ok, BD persistida

---

### 4. Criterios de aceptación

- [ ] Botón "Iniciar sesión con Microsoft" redirige correctamente a Entra ID
- [ ] Post-auth: dashboard muestra nombre y email del usuario
- [ ] Rutas `/dashboard/*` protegidas (redirigen a login sin sesión)
- [ ] `callbackUrl` respetado en redirección post-login
- [ ] Logout limpia sesión y redirige a `/`
- [ ] Sesión persiste tras refresh
- [ ] Backend: 200 para token válido, 401 para inválido/expirado/faltante
- [ ] Usuarios creados automáticamente en BD en primer login
- [ ] Errores de auth con mensajes amigables
- [ ] Sin información sensible en consola
- [ ] Cookie de sesión httpOnly y Secure (prod)
- [ ] Protección CSRF activa
- [ ] Sin redirect loops
- [ ] Estado de carga manejado durante login
- [ ] Workspace Mastra compila (`npm run build` exitoso en `current/mastra`)

---

### 5. Datos de prueba

| Usuario | Email | Contraseña | Uso |
|---------|-------|------------|-----|
| Test User | testuser@tenant.onmicrosoft.com | `P@ssw0rd2024!` | Happy path |
| E2E Test User | e2e-test-user@tenant.onmicrosoft.com | `P@ssw0rd2024!` | E2E completo |
| Locked User | lockeduser@tenant.onmicrosoft.com | — | Mock cuenta bloqueada |

**URLs de servicio**: Frontend `:3000`, Backend `:3001`, Backend validate `:3001/api/auth/validate`
