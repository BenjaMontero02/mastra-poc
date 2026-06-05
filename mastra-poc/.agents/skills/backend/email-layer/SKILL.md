# Skill: Email Layer

## Propósito

Crear, modificar o refactorizar la capa de envío de emails: servicio de transporte, templates HTML, notificaciones a usuarios y admins.

## Patrones del proyecto

### Estructura del EmailService

```typescript
import nodemailer from 'nodemailer';
const { environment } = require('../configuration/enviroment');
const { ADMINS_EMAIL, ADMINS_NOMBRES } = require('../configuration/consts');

// ─── Transport ──────────────────────────────────────────────────────────────

let _transport: any = null;

function getTransport() {
    if (!_transport) {
        const host = environment.SMTP_HOST;
        const port = environment.SMTP_PORT;
        if (!host || !port) throw new Error('SMTP_HOST/SMTP_PORT no configurados');
        _transport = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            tls: { rejectUnauthorized: environment.NODE_ENV === 'production' },
        });
    }
    return _transport;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class EmailService {
    /**
     * Envía notificación a todos los admins.
     */
    static async notifyAdmins(subject: string, htmlBuilder: (nombre: string) => string) {
        const emails: string[] = Array.isArray(ADMINS_EMAIL) ? ADMINS_EMAIL : [];
        const nombres: string[] = Array.isArray(ADMINS_NOMBRES) ? ADMINS_NOMBRES : [];

        if (!emails.length) {
            console.warn('[email] admins list empty, skipping');
            return;
        }

        const transport = getTransport();
        const results = await Promise.allSettled(
            emails.map((to, idx) => {
                const nombre = nombres[idx] || 'Administrador';
                return transport.sendMail({
                    from: environment.EMAIL_FROM,
                    to,
                    subject,
                    html: htmlBuilder(nombre),
                });
            }),
        );

        // Log resultados
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                console.error('[email] failed to send to', emails[i], r.reason?.message);
            }
        });
    }

    /**
     * Envía email a un usuario específico.
     */
    static async sendToUser(to: string, subject: string, html: string) {
        if (!to) {
            console.warn('[email] no recipient, skipping');
            return;
        }

        try {
            const transport = getTransport();
            await transport.sendMail({
                from: environment.EMAIL_FROM_NOREPLY || environment.EMAIL_FROM,
                to,
                subject,
                html,
            });
            console.info('[email] sent to', to, subject);
        } catch (err: any) {
            console.error('[email] error sending to', to, err?.message);
        }
    }
}
```

### Estructura de un template

```typescript
// email/templates/adminNewDocumentTemplate.ts

export function adminNewDocumentTemplate(
    adminNombre: string,
    usuarioNombre: string,
    nombreDocumento: string,
    estado: string,
    panelUrl?: string,
): string {
    const linkHtml = panelUrl ? `<a href="${escapeHtml(panelUrl)}" style="...">Ver en panel</a>` : '';

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Hola ${escapeHtml(adminNombre)},</h2>
    <p>${escapeHtml(usuarioNombre)} envió un nuevo documento: <strong>${escapeHtml(nombreDocumento)}</strong></p>
    <p>Estado actual: <strong>${escapeHtml(estado)}</strong></p>
    ${linkHtml}
    <hr>
    <p style="color: #666; font-size: 12px;">Este es un email automático, no responder.</p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
```

### Invocación desde servicios (fire-and-forget)

```typescript
// En el servicio, después de la transacción exitosa:
setImmediate(() => {
    EmailService.notifyAdmins(`Nuevo documento: ${nombreDocumento}`, (adminNombre) =>
        adminNewDocumentTemplate(adminNombre, usuario, nombreDocumento, estado, panelUrl),
    ).catch((err) => console.error('[email] notification failed:', err?.message));
});
```

### Reglas de diseño

1. **EmailService como clase estática**: No requiere instancia, métodos de clase.
2. **Transport singleton reutilizable**: No crear un transport nuevo por cada envío.
3. **Templates como funciones puras**: Reciben datos, retornan HTML string.
4. **Un archivo por template**: `email/templates/nombreTemplate.ts`.
5. **Promise.allSettled para envíos múltiples**: No fallar si un destinatario falla.
6. **Fire-and-forget desde servicios**: `setImmediate` + `.catch()` para no bloquear la respuesta.
7. **Logs informativos**: Registrar éxitos y fallos con prefijo `[email]`.

### Mejores prácticas (mejoras sobre el proyecto actual)

1. **Transport singleton** (no crear uno nuevo cada vez):

    ```typescript
    // ❌ Mal: nuevo transport por cada email
    function buildTransport() { return nodemailer.createTransport({...}); }

    // ✅ Bien: reusar conexión
    let _transport: any = null;
    function getTransport() { if (!_transport) { ... } return _transport; }
    ```

2. **Escapar HTML en templates**: Prevenir XSS en emails.

    ```typescript
    // ❌ Mal: interpolar directamente
    `<p>${userName}</p>`
    // ✅ Bien: escapar
    `<p>${escapeHtml(userName)}</p>`;
    ```

3. **Validar destinatario antes de enviar**: No intentar enviar a string vacío.

4. **TLS según entorno**: `rejectUnauthorized: true` en producción.

5. **Retry con backoff** (para producción):

    ```typescript
    async function sendWithRetry(mailOptions: any, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await getTransport().sendMail(mailOptions);
            } catch (err) {
                if (attempt === retries) throw err;
                await new Promise((r) => setTimeout(r, 1000 * attempt));
            }
        }
    }
    ```

6. **Subject sin datos sensibles**: No incluir emails ni IDs internos en el asunto.

### Organización de carpetas

```
src/email/
├── EmailService.ts          # Servicio principal
├── templates/
│   ├── adminNewDocumentTemplate.ts
│   ├── userDocumentInAnalysisTemplate.ts
│   ├── ddjjApprovedUserTemplate.ts
│   └── ...
└── assets/                  # Imágenes embebidas (logo, etc.)
```

### Export

```typescript
export { EmailService };
// Templates: export function nombreTemplate(...) { ... }
```
