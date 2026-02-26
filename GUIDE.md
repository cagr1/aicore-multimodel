# ai-core - Guía de Uso

## Inicio Rápido

```bash
# 1. Clonar e instalar
git clone https://github.com/cagr1/aicore-multimodel.git
cd ai-core
npm install

# 2. Configurar API Key
cp .env.example .env
# Edita .env y pon tu API key

# 3. Ejecutar análisis
node index.js --project ./tu-proyecto --prompt "agregar login JWT"
```

---

## Uso Básico

### Análisis Simple
```bash
node index.js --project ./mi-proyecto --prompt "optimizar SEO"
```

### Con Propuestas
```bash
node index.js --project ./mi-proyecto --prompt "hero animation 3d"
```

### Aplicar Cambios
```bash
# Preview
node index.js --project ./mi-proyecto --preview <proposal-id>

# Aplicar
node index.js --project ./mi-proyecto --apply <proposal-id>
```

### Forzar Agente
```bash
node index.js --project ./mi-proyecto --prompt "crear tests" --force-agent test
```

---

## Telemetría (Prometheus + Grafana)

### Iniciar Servidor de Métricas
```bash
# Terminal 1: Iniciar metrics server
node src/metrics-server.js

# Ver métricas
curl http://localhost:9091/metrics
```

### Dashboard Grafana
```bash
# Generar dashboard
node scripts/dashboard-seed.cjs

# Importar en Grafana:
# 1. Dashboards → Import
# 2. Pegar el JSON generado
```

### Configurar Prometheus
```yaml
# prometheus.yml
- job_name: "ai-core-mcp"
  static_configs:
    - targets: ["localhost:9091"]
```

---

## A/B Testing

### Ejecutar Tests
```bash
# Todos los prompts
node scripts/ab-test.cjs

# Solo 10 prompts
node scripts/ab-test.cjs --limit 10

# Threshold personalizado
node scripts/ab-test.cjs --threshold 0.5
```

### Resultados
- `tests/ab_results.csv` - Detalle por prompt
- `report.csv` - KPIs resumen

### KPIs Generados
| Métrica | Descripción |
|---------|-------------|
| total_prompts | Total de prompts |
| llm_fallback_count | Prompts que necesitaron LLM |
| ai_core_only_count | Prompts sin LLM |
| agent_accuracy | % acierto de agente |

---

## Configuración

### Variables de Entorno
```bash
LLM_PROVIDER=minimax    # minimax, openai, anthropic
LLM_API_KEY=tu-key
LLM_MODEL=MiniMax-Text-01
AI_CORE_TTL_DAYS=30
KILO_API_URL=http://localhost:3000/api
```

### Thresholds (config/ab_config.json)
```json
{
  "autoApply": 0.75,
  "llmFallback": 0.4,
  "maxAutoApplyPerDay": 10,
  "forceApplyAllowed": false
}
```

---

## Verificar Instalación

```bash
# Tests
npm test

# Verificar scanner
node -e "import('./src/scanner/index.js').then(m => console.log(m.scanProject('.')))"
```

---

## Solución de Problemas

| Error | Solución |
|-------|----------|
| "LLM not configured" | Configurar LLM_API_KEY |
| "Proposal not found" | Ejecutar --prompt primero |
| Scanner no detecta | Verificar que el path tenga archivos |

---

## Archivos Importantes

| Archivo | Uso |
|---------|-----|
| `index.js` | Punto de entrada CLI |
| `src/mcp-server/index.js` | Servidor MCP |
| `src/telemetry/index.js` | Métricas |
| `src/file-engine/atomic.js` | Atomic apply |
| `src/secret-scanner.js` | Detección de secrets |
