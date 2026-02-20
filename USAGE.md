# ai-core - Guía de Uso

Sistema de orquestación multi-agente con integración LLM para asistencia en desarrollo de software.

---

## Requisitos

- Node.js 18+
- API Key de un proveedor LLM (opcional)

---

## Instalación

```bash
git clone <repo-url>
cd ai-core
npm install
```

---

## Configuración

### Variables de Entorno

Crea un archivo `.env` o configura las variables:

```bash
# Proveedor: minimax, openai, anthropic
export LLM_PROVIDER=minimax

# Tu API Key
export LLM_API_KEY=tu-api-key

# Modelo a usar
export LLM_MODEL=MiniMax-Text-01

# Opcional: temperatura y tokens
export LLM_TEMPERATURE=0.7
export LLM_MAX_TOKENS=2048
```

### Proveedores Soportados

| Proveedor | Modelo por defecto |
|----------|------------------|
| MiniMax | MiniMax-Text-01 |
| OpenAI | gpt-4 |
| Anthropic | claude-3-sonnet |

---

## Uso Básico

### Análisis Simple

```bash
# Análisis sin LLM (determinista)
node index.js --project ./mi-proyecto --prompt "optimizar SEO"
```

### Análisis con Propuestas

```bash
# Análisis + propuestas de código
node index.js --project ./mi-proyecto --prompt "hero animation 3d"
```

### Preview de Propuestas

```bash
# Ver cambios sin aplicar
node index.js --project ./mi-proyecto --preview <proposal-id>
```

### Aplicar Cambios

```bash
# Aplicar propuesta con backup
node index.js --project ./mi-proyecto --apply <proposal-id>

# Aplicar sin backup
node index.js --project ./mi-proyecto --apply <proposal-id> --no-backup
```

### Estados y Configuración

```bash
# Ver estado de memoria
node index.js --project ./mi-proyecto --status

# Ver configuración
node index.js --config
```

---

## Flujo de Trabajo Completo

```bash
# 1. Analiza tu proyecto
node index.js --project ./mi-proyecto --prompt "quiero agregar un login con JWT"

# 2. El sistema:
#    - Detecta el tipo de proyecto (landing, saas, api...)
#    - Selecciona los agentes correctos
#    - Genera propuestas de código
#    - Muestra los diffs

# 3. Aplica los cambios
#    - Preview primero
#    - Apply para confirmar
#    - Backup automático
```

---

## Estructura del Proyecto Escaneado

```
mi-proyecto/
├── src/
├── package.json
└── ... (otros archivos)
```

---

## Perfiles de Proyecto

El sistema detecta automáticamente:

| Perfil | Descripción |
|--------|-------------|
| Landing | Página de aterrizaje |
| SaaS | Aplicación web completa |
| Ecommerce | Tienda online |
| API | Backend REST |
| Blog | Blog / CMS |
| Library | Paquete npm |
| CLI | Herramienta CLI |

---

## Integración con MCP

Para usar con Kilo.ai u otros clientes MCP:

```bash
# Iniciar servidor MCP
node index.js --mcp
```

---

## Ejemplos de Prompts

```bash
# Frontend
node index.js --project ./mi-proyecto --prompt "agregar animación 3D al hero"
node index.js --project ./mi-proyecto --prompt "crear componente React para login"

# Backend
node index.js --project ./mi-proyecto --prompt "agregar endpoint CRUD para usuarios"
node index.js --project ./mi-proyecto --prompt "crear schema de base de datos"

# Security
node index.js --project ./mi-proyecto --prompt "implementar autenticación JWT"
node index.js --project ./mi-proyecto --prompt "revisar vulnerabilidades"

# SEO
node index.js --project ./mi-proyecto --prompt "optimizar metadata"
node index.js --project ./mi-proyecto --prompt "mejorar SEO técnica"

# Testing
node index.js --project ./mi-proyecto --prompt "generar tests unitarios"
node index.js --project ./mi-proyecto --prompt "mejorar coverage"
```

---

## Fallback (Sin LLM)

Si no configuras API Key, el sistema funciona en modo determinista:
- Proposals basadas en patrones predefinidos
- Agentes activados por keywords

---

## Solución de Problemas

### "LLM not configured"
→ Configura `LLM_PROVIDER` y `LLM_API_KEY`

### "Proposal not found"
→ Ejecuta `--prompt` primero para generar propuestas

### Scanner no detecta el proyecto
→ Asegúrate que el path sea correcto y tenga archivos

---

## Telemetría y Métricas

El servidor incluye un endpoint de métricas compatible con Prometheus:

```bash
# Iniciar servidor con métricas
node src/metrics-server.js
# o
npm run start:metrics
```

Las métricas estarán disponibles en: `http://localhost:9091/metrics`

### Métricas Disponibles

| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `ai_core_proposals_analyzed_total` | Counter | Propuestas analizadas |
| `ai_core_proposals_generated_total` | Counter | Propuestas generadas por agente |
| `ai_core_apply_result_total` | Counter | Resultados de aplicación por estado |
| `ai_core_analyze_latency_seconds` | Histogram | Latencia de análisis |
| `ai_core_apply_latency_seconds` | Histogram | Latencia de aplicación |
| `ai_core_secrets_detected_total` | Counter | Secretos detectados |
| `ai_core_scan_errors_total` | Counter | Errores de escaneo |
| `ai_core_memory_entries` | Gauge | Entradas en memoria |

### Dashboard Grafana

Para importar el dashboard:

```bash
# Generar configuración
node scripts/dashboard-seed.cjs

# Importar en Grafana (UI)
# 1. Ve a Dashboards → Import
# 2. Copia el JSON generado
```

---

## Próximos Pasos

- [ ] Probar con diferentes tipos de proyectos
- [ ] Configurar el proveedor LLM preferido
- [ ] Integrar con Kilo.ai via MCP
- [ ] Configurar Grafana para métricas

---

## Próximos Pasos

- [ ] Probar con diferentes tipos de proyectos
- [ ] Configurar el proveedor LLM preferido
- [ ] Integrar con Kilo.ai via MCP

---

*ai-core v1.0.0 - 100% Completado*
