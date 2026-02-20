# ai-core

Sistema de orquestación multi-agente externo, independiente de cualquier proyecto, integrable mediante MCP en Kilo.ai.

## Características

- **Externo**: No se instala dentro de proyectos cliente
- **Stack-agnóstico**: Soporta JS, TS, Python, Go, Rust, PHP, C#
- **MCP Ready**: Integración con Kilo via Model Context Protocol
- **Agentes deterministas**: Código ejecutable, no markdown
- **LLM Integrado**: MiniMax, OpenAI, Anthropic
- **Memoria controlada**: Persistencia por proyecto con límite configurable
- **Perfilado automático**: Detecta tipo de proyecto (landing, saas, api...)
- **Router inteligente**: Detecta intención sin keywords explícitas
- **Quality Assurance**: Atomic apply, secret scanner, test validation
- **Telemetry**: Métricas Prometheus con Grafana dashboard
- **A/B Testing**: Comparación ai-core vs LLM fallback

## Inicio Rápido

```bash
# Clonar e instalar
npm install

# Configurar LLM (opcional)
export LLM_PROVIDER=minimax
export LLM_API_KEY=tu-api-key
export LLM_MODEL=MiniMax-Text-01

# Ejecutar
node index.js --project ./mi-proyecto --prompt "agregar login JWT"
```

Ver [USAGE.md](USAGE.md) para documentación completa.

## Estructura

```
ai-core/
├── index.js              # Entry point
├── USAGE.md              # Guía de uso
├── README.md             # Este archivo
├── plans/
│   ├── architecture.md   # Arquitectura del proyecto
│   └── system.md         # Overview del sistema
├── config/
│   ├── default.json      # Configuración por defecto
│   └── ab_config.json    # Thresholds A/B testing
├── scripts/
│   ├── ab-test.cjs       # Script A/B testing
│   └── dashboard-seed.cjs # Dashboard Grafana
└── src/
    ├── scanner/          # Detecta lenguaje/framework
    ├── router/           # Selecciona agente (inteligente)
    ├── orchestrator/     # Coordina ejecución
    ├── agents/           # 6 agentes especializados
    ├── memory/           # Persistencia JSONL + TTL
    ├── file-engine/      # Diff, backup, atomic apply
    ├── proposals/        # Propuestas estructuradas
    ├── llm/              # Abstracción LLM
    │   ├── providers/    # minimax, openai, anthropic
    │   └── kilo.cjs      # Kilo API client
    ├── telemetry/        # Métricas Prometheus
    ├── metrics-server.js # Servidor métricas
    ├── config/           # Configuración runtime
    ├── profiles/         # Perfiles por proyecto
    └── mcp-server/      # Servidor MCP
```

## Agentes

| Agente | Función |
|--------|---------|
| SEO | Análisis y optimización de motores de búsqueda |
| Code | Análisis y sugerencias de código |
| Frontend | Componentes UI, templates, estilos |
| Backend | APIs, bases de datos, arquitectura |
| Security | Vulnerabilidades y recomendaciones |
| Test | Generación de tests unitarios |

## Proveedores LLM

| Proveedor | Variable |
|-----------|----------|
| MiniMax | `LLM_PROVIDER=minimax` |
| OpenAI | `LLM_PROVIDER=openai` |
| Anthropic | `LLM_PROVIDER=anthropic` |

## Uso CLI

```bash
# Análisis básico
node index.js --project ./mi-proyecto --prompt "optimizar SEO"

# Análisis con propuestas
node index.js --project ./mi-proyecto --prompt "hero animation 3d"

# Forzar agente específico
node index.js --project ./mi-proyecto --prompt "crear test" --force-agent test

# Preview
node index.js --project ./mi-proyecto --preview <proposal-id>

# Aplicar
node index.js --project ./mi-proyecto --apply <proposal-id>
```

Ver [USAGE.md](USAGE.md) para más ejemplos.

## Telemetría

```bash
# Iniciar servidor de métricas
node src/metrics-server.js

# Métricas disponibles en http://localhost:9091/metrics
```

Ver [plans/system.md](plans/system.md) para dashboard Grafana.

## A/B Testing

```bash
# Ejecutar tests A/B
node scripts/ab-test.cjs

# Con límite de prompts
node scripts/ab-test.cjs --limit 10

# Threshold personalizado
node scripts/ab-test.cjs --threshold 0.5
```

## Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | Proveedor LLM | - |
| `LLM_API_KEY` | API key | - |
| `LLM_MODEL` | Modelo | - |
| `AI_CORE_TTL_DAYS` | Días TTL memoria | 30 |
| `AI_CORE_MEMORY_DIR` | Directorio memoria | ~/.ai-core |
| `KILO_API_URL` | URL Kilo API | - |

### Archivo config/ab_config.json

```json
{
  "autoApply": 0.75,
  "llmFallback": 0.4,
  "maxAutoApplyPerDay": 10,
  "forceApplyAllowed": false
}
```

## Integración con Kilo

Configura el endpoint MCP en Kilo para usar ai-core como herramienta externa.

## Tests

```bash
npm test
# ✓ 46 tests passing
```

## Licencia

MIT
