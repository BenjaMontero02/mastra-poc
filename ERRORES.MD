los modelos de deepsek no aceptan structure output

el stack detector con no debe fallar si no esta el package.json
⚠️ Problema detectado: El workflow no puede avanzar por dos razones encadenadas:

El repo remoto está vacío (solo tiene AGENTS.md ) → el step detect-stack  falla porque no encuentra package.json  que analizar.
El PAT no tiene write access → no puedo pushear el scaffold inicial para que el workflow lo detecte al clonar. El workflow re-clona desde cero en cada intento, perdiendo cualquier avance local.

error continuo DEBUG [2026-06-09 23:19:59.948 -0300] (Mastra): Cannot get workflow run. Mastra storage is not initialized