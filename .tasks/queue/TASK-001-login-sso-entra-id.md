# Login SSO con Entra ID (Azure)

## Descripción general

Pantalla de inicio de sesión única para la aplicación, que autentica exclusivamente contra Microsoft Entra ID en modalidad **single tenant**. No existen otras formas de autenticación (sin registro, sin usuario/contraseña local). La pantalla es de página completa, con un diseño moderno, simple, en paleta roja y blanca.

Al presionar el botón de inicio de sesión, el usuario es redirigido al flujo de autenticación de Microsoft Entra ID. Si el usuario ya tiene una sesión activa, es redirigido automáticamente a la ruta raíz `/` sin ver esta pantalla. La sesión tiene una duración máxima de 8 horas; al expirar, el usuario es redirigido nuevamente al login.

## Objetivo

Proveer un punto de entrada seguro y simple a la aplicación mediante autenticación federada con Microsoft Entra ID, restringiendo el acceso exclusivamente a usuarios del tenant corporativo configurado.

---

## Vistas / Pantallas

### Pantalla de Login

- **Ruta**: `/login`
- **Descripción**: Página completa, centrada vertical y horizontalmente.

- **Componentes visuales**:
  - Logo de la aplicación (parte superior, centrado).
  - Nombre de la aplicación debajo del logo.
  - Texto breve de bienvenida.
  - Botón principal: **"Iniciar sesión con Microsoft"**, con ícono de Microsoft a la izquierda. Fondo rojo corporativo, texto blanco, bordes redondeados.
  - Fondo general: blanco o gris muy claro. Acentos en rojo corporativo.

- **Estados**:
  - *Normal*: Logo, nombre, bienvenida, botón habilitado.
  - *Cargando*: Botón deshabilitado con "Redirigiendo..." y spinner. Pantalla atenuada.
  - *Error*: Mensaje rojo "No se pudo iniciar sesión. Intente nuevamente." Botón rehabilitado.
  - *Sin conexión*: Mensaje "Sin conexión a internet. Verifique su conexión e intente nuevamente." Botón habilitado.
  - *Sesión expirada*: Pantalla normal, sin mensaje adicional.

- **Interacciones**:
  - Clic en el botón → redirige al flujo de Microsoft Entra ID.
  - Cancelación del SSO → vuelve a `/login` en estado normal, sin mensaje.

---

## Flujos de usuario

### Login exitoso
1. Usuario sin sesión accede a ruta protegida → redirigido a `/login`.
2. Presiona "Iniciar sesión con Microsoft".
3. Botón muestra "Redirigiendo..." con spinner.
4. Usuario completa autenticación en Microsoft Entra ID.
5. Sistema recibe token, crea sesión (8h), redirige a `/`.

### Usuario ya autenticado
1. Accede a `/login` con sesión activa → redirigido automáticamente a `/`.

### Error de autenticación
1. Falla el SSO → vuelve a `/login` con mensaje de error. Botón rehabilitado.

### Cancelación
1. Usuario cancela en Microsoft → vuelve a `/login` sin mensaje.

### Sin conexión
1. Sin internet al presionar botón → mensaje de sin conexión. Botón habilitado.

### Logout
1. Usuario presiona "Cerrar sesión" → sesión local destruida → redirige a `/login`.

### Sesión expirada (8h)
1. Tras 8h de inactividad o uso → sesión expira → redirige a `/login`.

---

## Reglas de negocio

- **Single tenant**: Solo usuarios del tenant configurado.
- **Sesión**: 8 horas de duración.
- **Redirección**: No autenticado → `/login`. Autenticado en `/login` → `/`.
- **Logout local**: Solo cierra sesión en la app, no en Microsoft.
- **Roles**: Existen en AD pero fuera de alcance por ahora.
- **Sin reintentos automáticos** ante fallos.

---

## Criterios de aceptación

- [ ] `/login` muestra pantalla completa centrada sin sesión activa.
- [ ] Logo, nombre de app, bienvenida y botón "Iniciar sesión con Microsoft" visibles.
- [ ] Diseño rojo y blanco, moderno, simple.
- [ ] Botón redirige a Microsoft Entra ID.
- [ ] Estado cargando con "Redirigiendo..." y spinner.
- [ ] Usuario autenticado en `/login` → redirigido a `/`.
- [ ] Error muestra mensaje rojo y botón rehabilitado.
- [ ] Sin conexión muestra mensaje correspondiente.
- [ ] Cancelación del SSO vuelve sin mensaje.
- [ ] Sesión expira a las 8h y redirige a `/login`.
- [ ] Logout destruye sesión local y redirige a `/login`.
- [ ] Solo usuarios del tenant pueden autenticarse.
- [ ] Responsive en mobile.

---

## Fuera de alcance

- Registro, login local, otros proveedores, olvidé contraseña, selección de tenant, roles/permisos, recordar sesión, logout de Microsoft, página 404/500, modo oscuro.

---

## Suposiciones y defaults

- Ruta login: `/login`. Post-login: `/`.
- Estados: normal, cargando, error, sin conexión.
- Cancelación SSO → sin mensaje.
- Sesión: 8h.
- Colores: rojo corporativo y blanco.
- Mobile: misma experiencia responsive.
