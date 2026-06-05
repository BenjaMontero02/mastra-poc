# Patrones y Anti-Patrones de Historias de Usuario

## Ejemplo de Historia Bien Escrita

### HU-01: Búsqueda de cliente por identificación

**Como** operador del sistema
**Quiero** buscar un cliente ingresando su número de identificación
**Para** consultar su información y gestionar sus solicitudes rápidamente

#### Criterios de Aceptación

1. **CA-01.1**: Dado que el operador ingresa la identificación "12.345.678-5" y presiona Buscar, entonces el sistema muestra el nombre completo del cliente asociado
2. **CA-01.2**: Dado que el operador ingresa la identificación "12345678-5" (sin puntos), entonces el sistema acepta el formato y muestra el mismo resultado
3. **CA-01.3**: Dado que el operador ingresa una identificación inexistente "00.000.000-0", entonces el sistema muestra un mensaje indicando que no se encontraron resultados
4. **CA-01.4**: Dado que el operador deja el campo vacío y presiona Buscar, entonces el sistema muestra un mensaje de validación indicando que el campo es requerido
5. **CA-01.5**: El tiempo de respuesta de la búsqueda debe ser menor a 3 segundos

#### Datos de Prueba
- Identificación válida con resultados: 12.345.678-5
- Identificación válida sin resultados: 00.000.000-0
- Identificación en formato alternativo: 12345678-5

---

## Anti-Patrones (Evitar)

### ❌ Historia demasiado vaga

**Como** usuario
**Quiero** usar el sistema
**Para** hacer mi trabajo

> **Problema**: No describe funcionalidad específica, no es testable.

### ❌ Historia técnica (no orientada al usuario)

**Como** desarrollador
**Quiero** que el backend haga una query SQL con JOIN
**Para** mostrar datos en la tabla

> **Problema**: Describe implementación, no valor de negocio.

### ❌ Criterios de aceptación genéricos

1. El sistema funciona correctamente
2. No hay errores
3. Los datos se muestran bien

> **Problema**: No son verificables ni específicos. ¿Qué significa "correctamente"?

### ❌ Historia gigante (épica disfrazada)

**Como** administrador
**Quiero** gestionar usuarios, roles, permisos, reportes, configuraciones y auditoría
**Para** administrar el sistema completo

> **Problema**: Demasiado grande, debería dividirse en múltiples historias.

---

## Criterios de Aceptación: Buenos vs Malos

| ❌ Malo | ✅ Bueno |
|---------|----------|
| El formulario valida los campos | Al enviar el formulario con el campo email vacío, se muestra "El email es requerido" debajo del campo |
| Los datos se cargan rápido | La tabla de resultados se carga en menos de 2 segundos |
| El sistema muestra un error | Al buscar con identificación "ABCDE", se muestra el mensaje "Formato de identificación no válido" |
| La navegación funciona | Al hacer clic en "Reportes" en el menú, se muestra la página de reportes con el listado de reportes disponibles |
| Se pueden ver los datos | La tabla muestra las columnas: Nombre, Email, Rol, Estado y Fecha de creación |

---

## Estructura Recomendada por Tipo de Funcionalidad

### Consulta/Búsqueda
- CA positivo: búsqueda con dato válido → muestra resultado
- CA formato alternativo: dato en otro formato → acepta y muestra resultado
- CA sin resultados: dato inexistente → mensaje apropiado
- CA validación: campo vacío o dato inválido → mensaje de validación
- CA rendimiento: tiempo de respuesta aceptable

### Formulario/Registro
- CA happy path: todos los campos válidos → éxito con confirmación
- CA requeridos: campo obligatorio vacío → mensaje de validación
- CA formato: dato con formato incorrecto → mensaje específico
- CA duplicado: registro ya existente → mensaje de duplicado
- CA cancelar: cancelar acción → volver sin guardar

### Listado/Tabla
- CA carga: página carga → tabla visible con datos
- CA columnas: tabla muestra las columnas esperadas
- CA paginación: navegar entre páginas → datos cambian
- CA vacío: sin datos → mensaje de estado vacío
- CA acciones: click en acción de fila → acción ejecutada
