# Patrones y Ejemplos de Gherkin

## Ejemplo Completo: Test Cases para Búsqueda de Cliente

### TC-01: Búsqueda exitosa con identificación válida (Happy Path)

**Historia de Usuario**: HU-01
**Criterios cubiertos**: CA-01.1, CA-01.5
**Tipo**: Happy Path
**Prioridad**: Alta

```gherkin
Feature: Búsqueda de cliente por identificación

  Scenario: Búsqueda exitosa con identificación en formato completo
    Given el usuario está en la página de búsqueda de clientes
    When ingresa "12.345.678-5" en el campo de identificación
    And hace clic en el botón "Buscar"
    Then se muestra la información del cliente con nombre "Juan Pérez"
    And el tiempo de respuesta es menor a 3 segundos
    And no se muestran mensajes de error en la página
```

#### Pasos Detallados

| # | Keyword | Descripción | Datos | Resultado Esperado |
|---|---------|-------------|-------|-------------------|
| 1 | Given | El usuario está en la página de búsqueda de clientes | URL: /busqueda | Formulario de búsqueda visible con campo de identificación |
| 2 | When | Ingresa la identificación en el campo de búsqueda | ID: 12.345.678-5 | Campo muestra la identificación ingresada |
| 3 | And | Hace clic en el botón "Buscar" | - | Se procesa la búsqueda |
| 4 | Then | Se muestra la información del cliente | - | Nombre "Juan Pérez" visible en pantalla |
| 5 | And | El tiempo de respuesta es aceptable | SLA: < 3s | Resultado en menos de 3 segundos |
| 6 | And | No hay errores visibles | - | Sin mensajes de error |

---

### TC-02: Búsqueda con formato alternativo de identificación (Variación)

**Historia de Usuario**: HU-01
**Criterios cubiertos**: CA-01.2
**Tipo**: Variación

```gherkin
Feature: Búsqueda de cliente por identificación

  Scenario: Búsqueda con identificación sin puntos separadores
    Given el usuario está en la página de búsqueda de clientes
    When ingresa "12345678-5" en el campo de identificación
    And hace clic en el botón "Buscar"
    Then se muestra la información del cliente con nombre "Juan Pérez"
    And el resultado es idéntico al formato con puntos
```

---

### TC-03: Búsqueda con identificación inexistente (Negativo)

**Historia de Usuario**: HU-01
**Criterios cubiertos**: CA-01.3
**Tipo**: Negativo

```gherkin
Feature: Búsqueda de cliente por identificación

  Scenario: Búsqueda con identificación que no existe en el sistema
    Given el usuario está en la página de búsqueda de clientes
    When ingresa "00.000.000-0" en el campo de identificación
    And hace clic en el botón "Buscar"
    Then se muestra un mensaje indicando "No se encontraron resultados"
    And la aplicación permanece estable y funcional
    And el formulario de búsqueda sigue disponible para nueva consulta
```

---

### TC-04: Validación de campo requerido (Negativo)

**Historia de Usuario**: HU-01
**Criterios cubiertos**: CA-01.4
**Tipo**: Negativo

```gherkin
Feature: Búsqueda de cliente por identificación

  Scenario: Intento de búsqueda con campo vacío
    Given el usuario está en la página de búsqueda de clientes
    When deja el campo de identificación vacío
    And hace clic en el botón "Buscar"
    Then se muestra un mensaje de validación "El campo es requerido"
    And no se realiza la búsqueda
```

---

## Anti-Patrones (Evitar)

### ❌ Datos genéricos en pasos

```gherkin
# MAL - datos no específicos
When ingresa un identificador válido
Then se muestra la información del cliente
```

```gherkin
# BIEN - datos concretos
When ingresa "12.345.678-5" en el campo de identificación
Then se muestra el nombre "Juan Pérez"
```

### ❌ Múltiples flujos en un Scenario

```gherkin
# MAL - mezcla happy path con negativo
Scenario: Probar búsqueda completa
  When ingresa "12.345.678-5"
  Then muestra resultados
  When ingresa "00.000.000-0"
  Then muestra error
  When deja vacío
  Then muestra validación
```

### ❌ Pasos demasiado técnicos

```gherkin
# MAL - lenguaje técnico de implementación
When ejecuta query SELECT * FROM clientes WHERE rut = '12345678'
Then el response code es 200
And el JSON contiene "nombre"
```

```gherkin
# BIEN - lenguaje de usuario
When ingresa "12.345.678-5" en el campo de búsqueda
Then se muestra el nombre del cliente en la tabla de resultados
```

### ❌ Resultado no verificable

```gherkin
# MAL
Then el sistema funciona correctamente
Then los datos se cargan bien
Then no hay problemas
```

```gherkin
# BIEN
Then se muestra la tabla con al menos 1 resultado
Then la columna "Nombre" muestra "Juan Pérez"
Then el mensaje "Búsqueda completada" es visible
```

---

## Convenciones de Mapeo: Criterio de Aceptación → Test Case

| Tipo de Criterio | Tipo de TC | Ejemplo |
|-----------------|------------|---------|
| Flujo exitoso principal | Happy Path | CA: "Al buscar con ID válida se muestra resultado" → TC happy path |
| Formato alternativo | Variación | CA: "Acepta ID sin puntos" → TC con formato alternativo |
| Error o dato inválido | Negativo | CA: "ID inexistente muestra mensaje" → TC negativo |
| Campo vacío/requerido | Negativo | CA: "Campo vacío muestra validación" → TC validación |
| Rendimiento/SLA | Happy Path (And) | CA: "Respuesta < 3s" → Paso And en TC happy path |
| Campos completos | Exhaustivo | CA: "Muestra todas las columnas" → TC validación exhaustiva |
