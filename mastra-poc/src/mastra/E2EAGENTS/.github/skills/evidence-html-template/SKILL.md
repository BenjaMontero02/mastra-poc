---
name: evidence-html-template
description: "Template HTML para reportes de evidencia de ejecución de pruebas. Usar cuando: se necesite generar un HTML de evidencia de ejecución manual paso a paso, documentar screenshots de pruebas, crear reportes de ejecución con Chrome DevTools, o generar evidencia visual de test cases."
---

# Evidence HTML Template - Reporte de Ejecución Paso a Paso

## Cuándo Usar

- Generar reportes HTML de evidencia de ejecución manual de tests
- Documentar paso a paso de una ejecución con screenshots
- Crear evidencia de ejecución con Chrome DevTools MCP
- Generar reportes de evidencia visual de test cases

## Procedimiento: Generar Reporte de Evidencia

1. Recopilar la información del test case (ID, nombre, descripción, pasos Gherkin)
2. Ejecutar los pasos y capturar screenshots en cada paso
3. Convertir screenshots a base64 para embeber en el HTML
4. Generar el HTML usando la estructura de template en [template-structure.md](./references/template-structure.md)
5. Guardar el archivo como `Evidencia-TC-{nn}.html` en la carpeta `evidence/` de la certificación

## Estructura del Reporte

El HTML de evidencia debe contener las siguientes secciones:

1. **Header**: Con gradiente azul (#1a73e8), título del test case, metadata (fecha, ambiente)
2. **Información del Test Case**: Tabla con ID, nombre, descripción, datos de prueba, resultado esperado
3. **Ejecución Paso a Paso**: Cada paso con:
   - Número de paso y título (GIVEN/WHEN/THEN)
   - Bloque Gherkin con la descripción del paso
   - Acción realizada y resultado esperado
   - Badge de estado (PASS/FAIL)
   - Screenshot embebido (base64 o ruta relativa)
   - Notas de observación
4. **Timing**: Tiempo de respuesta medido
5. **Resultado Final**: Badge PASS/FAIL con resumen
6. **Footer**: Timestamp y generador

## Convenciones de Estilo

- Font family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- Fondo: Gradiente `linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)`
- Header: Gradiente `linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)`
- Secciones: Fondo blanco, borde izquierdo 5px solid #1a73e8
- Steps: Fondo #f9fbfd, borde 1px solid #e0e7ff
- PASS: Fondo #d4edda, color #155724
- FAIL: Fondo #f8d7da, color #721c24
- WARNING: Fondo #fff3cd, color #856404

## Restricciones

- El HTML debe ser self-contained (CSS inline, no archivos externos)
- Los screenshots deben estar embebidos en base64 cuando sea posible
- El reporte debe ser responsive (max-width: 1400px)
- Incluir siempre metadata de ejecución (fecha, hora, ambiente)
