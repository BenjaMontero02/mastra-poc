---
name: executive-report-template
description: "Template HTML para reportes ejecutivos de certificación QA. Usar cuando: se necesite generar un reporte HTML con métricas de certificación (casos pasados, fallidos, nivel de madurez), documentar problemas encontrados, o crear un resumen ejecutivo del proceso de testing."
---

# Executive Report Template - Reporte de Certificación QA

## Cuándo Usar

- Generar el reporte final HTML de una certificación QA
- Consolidar resultados de ejecución de test cases (PASS/FAIL)
- Calcular nivel de madurez de la aplicación
- Documentar problemas encontrados durante la certificación
- Crear un resumen ejecutivo del proceso de testing

## Procedimiento: Generar Reporte de Certificación

1. **Leer** todos los archivos HTML de evidencia en la carpeta `evidence/`
2. **Contabilizar** resultados: total de test cases, PASS, FAIL
3. **Calcular** nivel de madurez: `(casos_pass / casos_total) × 100`
4. **Clasificar** el nivel de madurez según escala
5. **Listar** problemas encontrados (de los casos FAIL: paso fallido + descripción)
6. **Generar** el HTML usando la estructura de template en [report-structure.md](./references/report-structure.md)
7. **Guardar** como `Reporte-Certificacion.html`

## Métricas del Reporte

### Métricas Principales (Dashboard)

| Métrica | Descripción | Fuente |
|---------|-------------|--------|
| **Total de casos** | Cantidad total de test cases ejecutados | Contar archivos en `evidence/` |
| **Casos PASS** | Test cases con todos los pasos exitosos | Evidencias con resultado PASS |
| **Casos FAIL** | Test cases con al menos un paso fallido | Evidencias con resultado FAIL |
| **Nivel de madurez** | Porcentaje de éxito: `(PASS / Total) × 100` | Cálculo |
| **Problemas encontrados** | Lista de defectos o fallos detectados | Pasos FAIL de las evidencias |

### Escala de Madurez

| Rango | Clasificación | Color | Indicador |
|-------|--------------|-------|-----------|
| ≥ 90% | Excelente | Verde (#28a745) | ✅ Aplicación lista para producción |
| ≥ 70% | Bueno | Azul (#007bff) | 🔵 Aplicación estable con mejoras menores |
| ≥ 50% | Regular | Amarillo (#ffc107) | ⚠️ Requiere correcciones antes de avanzar |
| < 50% | Crítico | Rojo (#dc3545) | 🔴 Requiere intervención urgente |

### Detalle de Problemas

Para cada test case FAIL, documentar:

| Campo | Descripción |
|-------|-------------|
| **Test Case** | Identificador (TC-XX) y nombre |
| **Paso fallido** | Número y descripción del paso que falló |
| **Resultado esperado** | Qué se esperaba |
| **Resultado obtenido** | Qué se observó |
| **Severidad** | Alta / Media / Baja |

## Estructura del Reporte HTML

1. **Header**: Gradiente, título "Reporte de Certificación QA", nombre de la app, fecha
2. **Dashboard de Métricas**: Cards con Total, PASS, FAIL, Nivel de Madurez (con indicador de color)
3. **Barra de Progreso**: Visual del nivel de madurez con porcentaje
4. **Detalle por Test Case**: Tabla con cada TC, resultado, pasos totales, pasos pass, pasos fail
5. **Problemas Encontrados**: Lista detallada de fallos con severidad
6. **Conclusiones**: Resumen objetivo basado en datos
7. **Footer**: Timestamp, generador

## Estilo Visual

- **Header**: Gradiente `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **Cards**: Fondo blanco, sombra sutil, border-radius 8px
- **PASS badge**: Fondo #d4edda, color #155724
- **FAIL badge**: Fondo #f8d7da, color #721c24
- **Barra de madurez**: Fondo #e9ecef, barra de progreso con color según escala
- **Tabla**: Headers con fondo #f0f0f0, bordes sutiles
- HTML self-contained (CSS inline, sin dependencias externas)
- Responsive (max-width: 1200px)

## Restricciones

- NO inventar métricas — usar SOLO datos reales de las evidencias
- Las conclusiones deben ser OBJETIVAS y basadas en los números
- El HTML debe ser SELF-CONTAINED (CSS inline)
- INCLUIR todos los test cases en el detalle, tanto PASS como FAIL
- Los problemas deben describir claramente qué falló y qué se esperaba
- El nivel de madurez debe calcularse con la fórmula exacta: `(PASS / Total) × 100`
