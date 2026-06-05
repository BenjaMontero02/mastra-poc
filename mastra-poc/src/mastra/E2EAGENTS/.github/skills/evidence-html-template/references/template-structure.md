# Template Structure Reference

## HTML Skeleton

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Evidencia de Ejecución - {TC_ID} ({TC_NAME})</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      max-width: 1400px; 
      margin: 0 auto; 
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 20px;
      color: #333;
    }
    .header { 
      background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
      color: white; 
      padding: 30px 20px; 
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 { margin: 0; font-size: 32px; }
    .header .metadata { font-size: 13px; margin-top: 15px; opacity: 0.9; }
    .section { 
      background: white; 
      margin: 20px 0; 
      padding: 25px; 
      border-left: 5px solid #1a73e8;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .section h2 { color: #1a73e8; margin-bottom: 15px; font-size: 22px; }
    .step { 
      margin: 20px 0; 
      padding: 15px; 
      background: #f9fbfd; 
      border-radius: 8px;
      border: 1px solid #e0e7ff;
    }
    .step h3 { color: #0056b3; margin-bottom: 12px; font-size: 16px; }
    .gherkin { 
      font-family: 'Courier New', monospace; 
      background: #e8f4f8; 
      padding: 12px; 
      border-radius: 5px; 
      margin: 10px 0;
      border-left: 3px solid #4285f4;
    }
    .screenshot { 
      max-width: 100%; 
      height: auto; 
      margin: 15px 0; 
      border: 1px solid #ddd; 
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .status { 
      font-weight: bold; 
      padding: 20px; 
      border-radius: 8px; 
      text-align: center; 
      margin: 15px 0;
      font-size: 18px;
    }
    .pass { background: #d4edda; color: #155724; border: 2px solid #28a745; }
    .fail { background: #f8d7da; color: #721c24; border: 2px solid #dc3545; }
    .warning { background: #fff3cd; color: #856404; border: 2px solid #ffc107; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f0f0f0; font-weight: 600; color: #1a73e8; }
    .result-label {
      display: inline-block; padding: 4px 8px; border-radius: 4px;
      font-size: 12px; font-weight: 600; margin: 5px 0;
    }
    .result-pass { background: #c3e6cb; color: #155724; }
    .result-fail { background: #f8d7da; color: #721c24; }
    .note { 
      background: #fffacd; padding: 10px; border-radius: 4px; 
      margin: 10px 0; border-left: 3px solid #ffc107; 
    }
    .timing { 
      background: #e7f3ff; padding: 12px; border-radius: 4px; 
      margin: 10px 0; border-left: 3px solid #4285f4; 
    }
    .footer { 
      text-align: center; padding: 20px; color: #666; 
      font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; 
    }
  </style>
</head>
<body>
```

## Section: Header

```html
<div class="header">
  <h1>🔍 Evidencia de Ejecución - {TC_ID}</h1>
  <p class="metadata">
    {TC_NAME} | Fecha: {DATE} | Ambiente: Chrome - Windows
  </p>
</div>
```

## Section: Test Case Info

```html
<div class="section">
  <h2>📋 Información del Test Case</h2>
  <table>
    <tr><th>Test Case</th><td>{TC_ID}</td></tr>
    <tr><th>Nombre</th><td>{TC_NAME}</td></tr>
    <tr><th>Historia de Usuario</th><td>{STORY_ID}</td></tr>
    <tr><th>Tipo</th><td>{TC_TYPE}</td></tr>
    <tr><th>Descripción</th><td>{DESCRIPTION}</td></tr>
    <tr><th>Datos de Prueba</th><td><strong>{TEST_DATA}</strong></td></tr>
    <tr><th>Resultado Esperado</th><td>{EXPECTED_RESULT}</td></tr>
    <tr><th>Ambiente de Ejecución</th><td>Chrome - Windows</td></tr>
  </table>
</div>
```

## Section: Step Execution

```html
<div class="section">
  <h2>🔄 Ejecución Paso a Paso (Gherkin)</h2>

  <!-- Repetir por cada paso -->
  <div class="step">
    <h3>STEP {N}: {GHERKIN_KEYWORD} - {STEP_TITLE}</h3>
    <div class="gherkin">{GHERKIN_KEYWORD} {GHERKIN_DESCRIPTION}</div>
    <p><strong>Acción:</strong> {ACTION_DESCRIPTION}</p>
    <p><strong>Esperado:</strong> {EXPECTED}</p>
    <p><span class="result-label result-pass">✅ PASS</span></p>
    <!-- O si falla: <span class="result-label result-fail">❌ FAIL</span> -->
    <p class="note">{OBSERVATION_NOTES}</p>
    
    <!-- Screenshot embebido en base64 -->
    <img class="screenshot" src="data:image/png;base64,{BASE64_DATA}" 
         alt="Step {N} - {STEP_TITLE}">
    <!-- O con ruta relativa -->
    <img class="screenshot" src="{SCREENSHOT_PATH}" alt="Step {N}">
  </div>
</div>
```

## Section: Timing

```html
<div class="section">
  <h2>⏱️ Métricas de Rendimiento</h2>
  <div class="timing">
    <p><strong>Tiempo de respuesta:</strong> {RESPONSE_TIME} segundos</p>
    <p><strong>SLA esperado:</strong> &lt; 2.0 segundos</p>
    <p><strong>Estado SLA:</strong> 
      <span class="result-label result-pass">✅ Dentro del SLA</span>
    </p>
  </div>
</div>
```

## Section: Final Result

```html
<div class="section">
  <h2>📊 Resultado Final</h2>
  <div class="status pass">
    ✅ TEST CASE {TC_ID} - PASS
  </div>
  <!-- O si falla: -->
  <div class="status fail">
    ❌ TEST CASE {TC_ID} - FAIL
  </div>
  <table>
    <tr><th>Total Pasos</th><td>{TOTAL_STEPS}</td></tr>
    <tr><th>Pasos Exitosos</th><td>{PASSED_STEPS}</td></tr>
    <tr><th>Pasos Fallidos</th><td>{FAILED_STEPS}</td></tr>
    <tr><th>Duración Total</th><td>{TOTAL_DURATION}</td></tr>
  </table>
</div>
```

## Section: Footer

```html
<div class="footer">
  <p>Reporte generado automáticamente por QA Certification Agents | {TIMESTAMP}</p>
</div>
</body>
</html>
```

## Variables de Reemplazo

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `{TC_ID}` | TC-01 | Identificador del test case |
| `{TC_NAME}` | Búsqueda exitosa | Nombre del test case |
| `{STORY_ID}` | HU-01 | Historia de usuario asociada |
| `{TC_TYPE}` | Happy Path | Tipo del test case |
| `{DATE}` | 2026-05-22 14:30:00 | Fecha y hora de ejecución |
| `{GHERKIN_KEYWORD}` | Given / When / Then | Keyword BDD del paso |
| `{RESPONSE_TIME}` | 1.234 | Tiempo en segundos |
| `{BASE64_DATA}` | iVBORw0KGgo... | Screenshot en base64 |
