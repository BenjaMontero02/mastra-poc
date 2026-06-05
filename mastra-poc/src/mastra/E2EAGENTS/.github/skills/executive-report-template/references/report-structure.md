# Report Structure Reference

## HTML Skeleton

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Certificación QA - {APP_NAME}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header .subtitle { font-size: 18px; opacity: 0.9; }
    .header .metadata { font-size: 13px; margin-top: 15px; opacity: 0.8; }

    /* Dashboard Cards */
    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
      text-align: center;
    }
    .card .value {
      font-size: 42px;
      font-weight: 700;
      margin: 10px 0;
    }
    .card .label {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .card.total .value { color: #667eea; }
    .card.pass .value { color: #28a745; }
    .card.fail .value { color: #dc3545; }
    .card.maturity .value { color: #007bff; }

    /* Maturity Bar */
    .maturity-section {
      background: white;
      padding: 25px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    .maturity-section h2 {
      color: #667eea;
      margin-bottom: 15px;
      font-size: 20px;
    }
    .progress-bar {
      background: #e9ecef;
      border-radius: 20px;
      height: 30px;
      overflow: hidden;
      margin: 15px 0;
    }
    .progress-fill {
      height: 100%;
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
      transition: width 0.5s ease;
    }
    .maturity-excellent { background: #28a745; }
    .maturity-good { background: #007bff; }
    .maturity-regular { background: #ffc107; color: #333 !important; }
    .maturity-critical { background: #dc3545; }

    .classification {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 16px;
    }

    /* Detail Table */
    .section {
      background: white;
      margin-bottom: 30px;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    .section h2 {
      color: #667eea;
      margin-bottom: 15px;
      font-size: 20px;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #495057;
    }
    tr:hover { background: #f8f9fa; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-pass { background: #d4edda; color: #155724; }
    .badge-fail { background: #f8d7da; color: #721c24; }
    .badge-high { background: #f8d7da; color: #721c24; }
    .badge-medium { background: #fff3cd; color: #856404; }
    .badge-low { background: #d1ecf1; color: #0c5460; }

    /* Issues List */
    .issue-card {
      background: #fff5f5;
      border-left: 4px solid #dc3545;
      padding: 15px;
      margin: 10px 0;
      border-radius: 0 8px 8px 0;
    }
    .issue-card h4 { color: #dc3545; margin-bottom: 8px; }
    .issue-card p { margin: 4px 0; font-size: 14px; }

    /* Conclusions */
    .conclusions {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 25px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .conclusions h2 {
      color: #667eea;
      margin-bottom: 15px;
    }
    .conclusions ul {
      list-style: none;
      padding: 0;
    }
    .conclusions li {
      padding: 8px 0;
      border-bottom: 1px solid #dee2e6;
    }
    .conclusions li:last-child { border-bottom: none; }

    /* Footer */
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
      margin-top: 30px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>

  <!-- 1. HEADER -->
  <div class="header">
    <h1>📋 Reporte de Certificación QA</h1>
    <div class="subtitle">{APP_NAME}</div>
    <div class="metadata">
      Fecha de certificación: {DATE} | Ambiente: {ENVIRONMENT} | Generado automáticamente por QA Certification Agents
    </div>
  </div>

  <!-- 2. DASHBOARD -->
  <div class="dashboard">
    <div class="card total">
      <div class="label">Total Casos</div>
      <div class="value">{TOTAL}</div>
    </div>
    <div class="card pass">
      <div class="label">Pasados</div>
      <div class="value">{PASS}</div>
    </div>
    <div class="card fail">
      <div class="label">Fallidos</div>
      <div class="value">{FAIL}</div>
    </div>
    <div class="card maturity">
      <div class="label">Nivel de Madurez</div>
      <div class="value">{MATURITY}%</div>
    </div>
  </div>

  <!-- 3. MATURITY BAR -->
  <div class="maturity-section">
    <h2>Nivel de Madurez</h2>
    <div class="progress-bar">
      <div class="progress-fill {MATURITY_CLASS}" style="width: {MATURITY}%">
        {MATURITY}%
      </div>
    </div>
    <p>Clasificación: <span class="classification" style="background: {MATURITY_BG}; color: {MATURITY_COLOR};">{MATURITY_LABEL}</span></p>
  </div>

  <!-- 4. DETAIL TABLE -->
  <div class="section">
    <h2>Detalle por Test Case</h2>
    <table>
      <thead>
        <tr>
          <th>Test Case</th>
          <th>Nombre</th>
          <th>Pasos Totales</th>
          <th>Pasos PASS</th>
          <th>Pasos FAIL</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        <!-- Repeat for each test case -->
        <tr>
          <td>{TC_ID}</td>
          <td>{TC_NAME}</td>
          <td>{STEPS_TOTAL}</td>
          <td>{STEPS_PASS}</td>
          <td>{STEPS_FAIL}</td>
          <td><span class="badge badge-{RESULT}">{RESULT_LABEL}</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 5. ISSUES -->
  <div class="section">
    <h2>Problemas Encontrados</h2>
    <!-- If no issues -->
    <p>No se encontraron problemas durante la certificación.</p>
    <!-- For each issue -->
    <div class="issue-card">
      <h4>{TC_ID} - {ISSUE_TITLE}</h4>
      <p><strong>Paso fallido:</strong> {STEP_DESCRIPTION}</p>
      <p><strong>Esperado:</strong> {EXPECTED}</p>
      <p><strong>Obtenido:</strong> {ACTUAL}</p>
      <p><strong>Severidad:</strong> <span class="badge badge-{SEVERITY}">{SEVERITY_LABEL}</span></p>
    </div>
  </div>

  <!-- 6. CONCLUSIONS -->
  <div class="conclusions">
    <h2>Conclusiones</h2>
    <ul>
      <li><strong>Resultado general:</strong> {OVERALL_CONCLUSION}</li>
      <li><strong>Cobertura:</strong> {TOTAL} test cases ejecutados cubriendo {STORIES_COUNT} historias de usuario</li>
      <li><strong>Calidad:</strong> Nivel de madurez {MATURITY}% ({MATURITY_LABEL})</li>
      <li><strong>Problemas:</strong> {ISSUES_COUNT} problema(s) detectado(s)</li>
    </ul>
  </div>

  <!-- 7. FOOTER -->
  <div class="footer">
    Generado el {TIMESTAMP} por QA Certification Agents
  </div>

</body>
</html>
```

## Placeholders Reference

| Placeholder | Descripción | Ejemplo |
|-------------|-------------|---------|
| `{APP_NAME}` | Nombre de la aplicación certificada | Mi Aplicación Web |
| `{DATE}` | Fecha de la certificación | 2026-05-22 |
| `{ENVIRONMENT}` | Ambiente de prueba | Staging |
| `{TOTAL}` | Total de test cases ejecutados | 12 |
| `{PASS}` | Cantidad de test cases PASS | 10 |
| `{FAIL}` | Cantidad de test cases FAIL | 2 |
| `{MATURITY}` | Porcentaje de madurez | 83 |
| `{MATURITY_CLASS}` | Clase CSS según rango | maturity-good |
| `{MATURITY_BG}` | Color de fondo del badge | #007bff |
| `{MATURITY_COLOR}` | Color del texto del badge | white |
| `{MATURITY_LABEL}` | Etiqueta de clasificación | Bueno |
| `{TC_ID}` | Identificador del test case | TC-01 |
| `{TC_NAME}` | Nombre del test case | Búsqueda exitosa |
| `{RESULT}` | Resultado (pass/fail) | pass |
| `{RESULT_LABEL}` | Etiqueta del resultado | PASS |
| `{STORIES_COUNT}` | Cantidad de historias cubiertas | 3 |
| `{ISSUES_COUNT}` | Cantidad de problemas | 2 |
| `{TIMESTAMP}` | Fecha y hora de generación | 2026-05-22 14:30:00 |
