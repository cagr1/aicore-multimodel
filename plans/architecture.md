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
| Agentes especializados | ✅ | SEO, Code, Frontend, Backend, Security, Test |
| Memoria | ✅ | Historial JSONL por proyecto |
| MCP Server | ✅ | CLI + protocolo MCP |
| File Engine | ✅ | Diff, backup, apply |

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

### Fase 3 - MCP Server
- [x] Tool run_agents
- [x] Input/output schema
- [x] Protocolo stdio

### Fase 4 - File Engine
- [x] Diff engine
- [x] Backup automático
- [x] Modo dry-run

### Fase 4.1 - Aplicación de Cambios
- [x] Integrar File Engine con agentes
- [x] Propuestas de cambios estructuradas
- [x] Apply con confirmación
- [x] Validación de cambios

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

### Fase 6 - Perfilado por Proyecto
- [x] Perfil landing
- [x] Perfil saas
- [x] Perfil api
- [x] Activación automática por scanner

### Agentes Especializados
- [x] SEO - Optimización para motores de búsqueda
- [x] Code - Calidad de código
- [x] Frontend - UI/Componentes
- [x] Backend - API/Rutas
- [x] Security - JWT/Auth
- [x] Test - Coverage

---

## Próximo Objetivo

*Todas las fases completadas*

---

## Uso Actual

```bash
# Análisis básico (sin LLM - determinista)
node index.js --project ./mi-proyecto --prompt "optimizar SEO"

# Análisis con propuestas (nuevo)
node index.js --project ./mi-proyecto --prompt "hero animation 3d"

# Preview y Apply
node index.js --project ./mi-proyecto --preview <proposal-id>
node index.js --project ./mi-proyecto --apply <proposal-id>

# Con LLM (configurar variables de entorno)
export LLM_PROVIDER=minimax
export LLM_API_KEY=tu-api-key
export LLM_MODEL=MiniMax-Text-01

node index.js --project ./mi-proyecto --prompt "crea un componente React"
```

---

## Estructura

```
ai-core/
├── index.js
├── package.json
├── plans/
│   └── architecture.md
└── src/
    ├── scanner/           # Detecta lenguaje
    ├── router/            # "Cerebro"
    ├── orchestrator/     # Coordena
    ├── agents/           # 6 especializados
    ├── memory/           # Persistencia
    ├── file-engine/      # Cambios
    ├── proposals/        # Propuestas estructuradas
    ├── llm/              # Abstracción LLM
    │   └── providers/    # minimax, openai, anthropic
    ├── profiles/         # Perfiles por proyecto (NUEVO)
    └── mcp-server/       # Integración
```

---

*Actualizado: 2026-02-18*
*Estado: 100% Completado - Proyecto Finalizado*
