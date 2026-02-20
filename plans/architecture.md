# ai-core - Arquitectura & Estado Actual

## Visión del Proyecto

Sistema de orquestación multi-agente externo que se integra con Kilo.ai para asistir en desarrollo sin instalar en cada proyecto.

```
Kilo (chat) → ai-core (agentes reales) → análisis del proyecto
```

---

## Estado Actual

### ✅ Completado

| Componente | Estado | Descripción |
|------------|--------|-------------|
| Scanner | ✅ | Detecta lenguaje/framework (JS, TS, Python, Go, Rust, PHP, C#) |
| Router | ✅ | "Cerebro" - decide agente según keywords |
| Scoring | ✅ | Confidence scoring con umbrales configurables |
| Fallback Rules | ✅ | candidate_auto_apply, fallback_llm, clarify_needed |
| Agentes especializados | ✅ | SEO, Code, Frontend, Backend, Security, Test |
| Memoria | ✅ | Historial JSONL con TTL y anonimización |
| MCP Server | ✅ | CLI + protocolo MCP |
| File Engine | ✅ | Diff, backup, atomic apply |
| Proposals | ✅ | Propuestas estructuradas con tests |

---

## Nuevas Implementaciones (2026-02-20)

### 1. Confidence Scoring & Fallback Rules

**Archivos:**
- `src/router/scoring.js` - Módulo de scoring
- `src/orchestrator/index.js` - Fallback rules
- `config/default.json` - Configuración de umbrales

**Umbrales:**
| Score | Acción |
|-------|--------|
| >= 0.7 | `candidate_auto_apply` |
| 0.4 - 0.7 | `fallback_llm` |
| < 0.4 | `clarify_needed` |

### 2. --force-agent CLI Flag

**Archivo:** `src/mcp-server/index.js`

Permite forzar el uso de un agente específico:
```bash
node index.js --project ./mi-proyecto --prompt "optimizar SEO" --force-agent seo
```

Agentes disponibles: `frontend`, `backend`, `security`, `seo`, `test`, `code`

### 3. Atomic Patch Manager

**Archivo:** `src/file-engine/atomic.js`

- Snapshot antes de aplicar
- Rollback automático si fallan checks
- Validación de tests en sandbox
- Integración con check-runner

```javascript
// Flujo de applyAtomic
1. Scan de secrets
2. Crear snapshot
3. Aplicar cambios
4. Validar tests (sandbox)
5. Ejecutar checks (install → lint → build → test)
6. Si falla → rollback
```

### 4. Check Runner

**Archivo:** `src/file-engine/check-runner.js`

Ejecuta validaciones en orden:
1. `install` - Instalar dependencias
2. `lint` - Linting
3. `build` - Build
4. `test` - Tests

Output: `{ok, failedStep, logs}`

### 5. Test Attachment & Validation

**Archivos:**
- `src/file-engine/test-validator.js` - Validación de tests
- `src/agents/types.js` - Tipos con `tests[]`

**Flujo:**
1. Agentes pueden adjuntar `tests: [{path, content}]`
2. Tests se ejecutan en sandbox temporal
3. Si no hay tests → se generan smoke tests automáticamente
4. Si fallan → rollback automático

### 6. Secret Scanner

**Archivo:** `src/file-engine/secret-scanner.js`

Detecta y bloquea secrets en proposals:
- AWS Keys (`AKIA...`)
- GCP Private Keys
- Database URLs (postgres://, mysql://, etc.)
- JWT Tokens
- SSH Private Keys
- API Keys
- High Entropy strings

**Bloqueo:**
- security_score < 0.3 → bloqueado
- Findings críticos → bloqueado

### 7. Memory con TTL y Anonimización

**Archivos:**
- `src/memory/storage.js`
- `src/memory/index.js`

**TTL (Time-To-Live):**
- Default: 30 días (configurable via `AI_CORE_TTL_DAYS`)
- Auto-purge al hacer append

**Anonimización (PII Redaction):**
- Emails → `[EMAIL_REDACTED]`
- Teléfonos → `[PHONE_REDACTED]`
- AWS Keys → `[AWS_KEY_REDACTED]`
- JWT Tokens → `[JWT_REDACTED]`
- Passwords/Tokens → `***REDACTED***`

**Funciones Admin:**
- `purgeExpired(projectPath)` - Purge TTL
- `purgeAll(projectPath, reason)` - Purge manual
- `purgeAllExpired()` - Bulk purge
- `getAllProjects()` - Listar proyectos
- `getPurgeLogs(100)` - Ver logs

### 8. Telemetría y Métricas (Prometheus)

**Archivos:**
- `src/telemetry/index.js` - Módulo de telemetría
- `src/metrics-server.js` - Servidor de métricas

**Endpoints:**
- `GET /metrics` - Métricas en formato Prometheus
- `GET /health` - Health check

**Métricas:**
| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `ai_core_proposals_analyzed_total` | Counter | Propuestas analizadas |
| `ai_core_proposals_generated_total` | Counter | Propuestas por agente |
| `ai_core_apply_result_total` | Counter | Resultados de aplicación |
| `ai_core_analyze_latency_seconds` | Histogram | Latencia de análisis |
| `ai_core_apply_latency_seconds` | Histogram | Latencia de aplicación |
| `ai_core_secrets_detected_total` | Counter | Secretos detectados |
| `ai_core_scan_errors_total` | Counter | Errores de escaneo |
| `ai_core_memory_entries` | Gauge | Entradas en memoria |

**Eventos emitidos:**
- `analyze_attempt` / `analyze_result` - Análisis de proyecto
- `proposal_generated` - Propuestas generadas
- `apply_attempt` / `apply_result` - Aplicación de cambios
- `secrets_detected` - Secretos encontrados
- `scan_error` - Errores de escaneo

**Dashboard:**
- `scripts/dashboard-seed.cjs` - Generador de dashboard Grafana

---

## Checklist Completo

### Fase 0 - Arquitectura
- [x] Diagrama de módulos
- [x] Flujo completo definido
- [x] Estructura de carpetas
- [x] ESM/CommonJS decidido

### Fase 1 - Core Runtime
- [x] Scanner con detectores
- [x] Router determinista
- [x] 2 agentes (SEO, Code)
- [x] Orchestrator
- [x] CLI

### Fase 2 - Memoria Controlada
- [x] JSONL append-only
- [x] Límite configurable
- [x] Rotación automática
- [x] TTL configurable (NUEVO)
- [x] Redacción de PII (NUEVO)
- [x] Logs de purge (NUEVO)

### Fase 3 - MCP Server
- [x] Tool run_agents
- [x] Input/output schema
- [x] Protocolo stdio

### Fase 4 - File Engine
- [x] Diff engine
- [x] Backup automático
- [x] Modo dry-run
- [x] Atomic apply (NUEVO)
- [x] Check runner (NUEVO)
- [x] Test validator (NUEVO)
- [x] Secret scanner (NUEVO)

### Fase 5 - Modelo Opcional
- [x] Abstracción de LLM provider
- [x] Configurable (OpenAI compatible)
- [x] Solo para tareas no deterministas
- [x] Sistema funciona sin modelo

### Fase 5.1 - Router Inteligente
- [x] Análisis de contexto del prompt
- [x] Detectar intención sin keywords
- [x] Agente por defecto según proyecto
- [x] Fallback determinista
- [x] Confidence scoring (NUEVO)

### Fase 6 - Perfilado por Proyecto
- [x] Perfil landing
- [x] Perfil saas
- [x] Perfil api
- [x] Activación automática por scanner

### Fase 7 - Quality Assurance
- [x] Atomic patch con rollback
- [x] Test validation en sandbox
- [x] Smoke test generation
- [x] Secret scanning
- [x] Block secrets en proposals
- [x] --force-agent flag

---

## Configuración

**Archivo:** `config/default.json`

```json
{
  "router": {
    "scoring": {
      "auto_apply_threshold": 0.7,
      "fallback_threshold": 0.4
    }
  },
  "memory": {
    "ttl_days": 30,
    "max_file_size_mb": 10
  },
  "atomic": {
    "real_checks": false
  }
}
```

**Variables de Entorno:**
```bash
AI_CORE_TTL_DAYS=14
AI_CORE_MEMORY_DIR=~/.ai-core/projects
AI_CORE_MAX_FILE_SIZE=10485760
AI_CORE_FORCE_AGENT=seo
```

---

## Uso Actual

```bash
# Análisis básico (sin LLM - determinista)
node index.js --project ./mi-proyecto --prompt "optimizar SEO"

# Análisis con propuestas (nuevo)
node index.js --project ./mi-proyecto --prompt "hero animation 3d"

# Forzar agente específico
node index.js --project ./mi-proyecto --prompt "crear test" --force-agent test

# Preview y Apply
node index.js --project ./mi-proyecto --preview <proposal-id>
node index.js --project ./mi-proyecto --apply <proposal-id>

# Con LLM (configurar variables de entorno)
export LLM_PROVIDER=minimax
export LLM_API_KEY=tu-api-key
export LLM_MODEL=MiniMax-Text-01

node index.js --project ./mi-proyecto --prompt "crea un componente React"

# Servidor de métricas (Prometheus)
node src/metrics-server.js
# o
npm run start:metrics

# Ver métricas
curl http://localhost:9091/metrics
```

---

## Estructura

```
ai-core/
├── index.js
├── package.json
├── config/
│   └── default.json
├── plans/
│   ├── architecture.md
│   └── system.md
├── scripts/
│   └── dashboard-seed.cjs  # Dashboard Grafana
└── src/
    ├── scanner/           # Detecta lenguaje
    ├── router/            # "Cerebro" + scoring
    ├── orchestrator/      # Coordina + fallback
    ├── agents/            # 6 especializados + types
    ├── memory/            # Persistencia + TTL + redaction
    ├── file-engine/      # Diff, backup, atomic, tests, secrets
    ├── proposals/         # Propuestas estructuradas
    ├── llm/              # Abstracción LLM
    │   └── providers/    # minimax, openai, anthropic
    ├── profiles/         # Perfiles por proyecto
    ├── telemetry/        # Métricas Prometheus (NUEVO)
    ├── metrics-server.js # Servidor métricas (NUEVO)
    └── mcp-server/       # Integración
```

---

## Tests

```bash
npm test
# ✓ 46 tests passing
```

---

*Actualizado: 2026-02-20*
*Estado: 100% Completado con QA Features*
