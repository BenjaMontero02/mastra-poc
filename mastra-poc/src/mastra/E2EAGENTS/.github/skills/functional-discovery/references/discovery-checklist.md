# Checklist de Descubrimiento Funcional

## 1. Estructura y Navegación

- [ ] Identificar URL base y páginas de entrada
- [ ] Documentar menú principal (opciones, subopciones, jerarquía)
- [ ] Documentar navegación secundaria (sidebar, tabs, breadcrumbs)
- [ ] Mapear flujo de navegación entre páginas (de dónde a dónde se puede ir)
- [ ] Identificar página de inicio/dashboard
- [ ] Documentar header y footer (elementos persistentes)

## 2. Autenticación y Acceso

- [ ] ¿Existe pantalla de login? Documentar campos y flujo
- [ ] ¿Hay roles o perfiles visibles?
- [ ] ¿Existen restricciones de acceso observables?
- [ ] Documentar mensajes de sesión expirada o acceso denegado (si se observan)

## 3. Formularios y Campos

Para cada formulario encontrado:

- [ ] Nombre/propósito del formulario
- [ ] Lista completa de campos con:
  - Nombre/label del campo
  - Tipo de input (text, number, email, password, select, checkbox, radio, date, file, textarea)
  - Si es requerido (asterisco, indicador visual)
  - Placeholder o texto de ayuda
  - Validaciones visibles (formato, longitud, caracteres permitidos)
  - Valores por defecto
  - Opciones disponibles (para selects, radios, checkboxes)
- [ ] Botones de acción (submit, cancelar, limpiar)
- [ ] Comportamiento al enviar (redirección, mensaje, modal)

## 4. Tablas y Listados

- [ ] Columnas mostradas y su contenido
- [ ] ¿Hay paginación? Tipo (numérica, scroll infinito)
- [ ] ¿Hay filtros o buscadores?
- [ ] ¿Hay ordenamiento por columnas?
- [ ] Acciones por fila (editar, eliminar, ver detalle)
- [ ] ¿Se muestra conteo de registros?

## 5. Mensajes y Validaciones

- [ ] Mensajes de éxito (toast, alert, banner)
- [ ] Mensajes de error (inline, modal, toast)
- [ ] Mensajes de advertencia
- [ ] Validaciones en tiempo real (al escribir, al perder foco)
- [ ] Validaciones al enviar formulario
- [ ] Mensajes de campos requeridos

## 6. Comportamiento de UI

- [ ] Indicadores de carga (spinners, progress bars, skeletons)
- [ ] Modales y diálogos (confirmación, información)
- [ ] Tooltips y ayudas contextuales
- [ ] Estados vacíos (cuando no hay datos)
- [ ] Respuesta a acciones (feedback visual)
- [ ] Tiempos de carga observados

## 7. Datos Mostrados

- [ ] Tipo de datos presentados (textos, números, fechas, estados)
- [ ] Formato de datos (moneda, fechas, porcentajes)
- [ ] Datos sensibles visibles (RUT, emails, teléfonos)
- [ ] Gráficos o visualizaciones
- [ ] Exportación de datos (si hay botones de descarga/exportar)

## 8. Funcionalidades Especiales

- [ ] Búsqueda global
- [ ] Notificaciones
- [ ] Configuración de usuario/perfil
- [ ] Impresión o generación de reportes
- [ ] Integración con servicios externos (mapas, pagos, etc.)
- [ ] Responsive: ¿se adapta a diferentes tamaños?
