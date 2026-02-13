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
- [ ] Integrar File Engine con agentes
- [ ] Propuestas de cambios estructuradas
- [ ] Apply con confirmación
- [ ] Validación de cambios

### Fase 5 - Modelo Opcional
- [ ] Abstracción de LLM provider
- [ ] Configurable (OpenAI compatible)
- [ ] Solo para tareas no deterministas
- [ ] Sistema funciona sin modelo

### Fase 5.1 - Router Inteligente
- [ ] Análisis de contexto del prompt
- [ ] Detectar intención sin keywords
- [ ] Agente por defecto según proyecto
- [ ] Fallback determinista

### Fase 6 - Perfilado por Proyecto
- [ ] Perfil landing
- [ ] Perfil saas
- [ ] Perfil api
- [ ] Activación automática por scanner

### Agentes Especializados
- [x] SEO - Optimización para motores de búsqueda
- [x] Code - Calidad de código
- [x] Frontend - UI/Componentes
- [x] Backend - API/Rutas
- [x] Security - JWT/Auth
- [x] Test - Coverage

---

## Próximo Objetivo

**Fase 4.1** - Aplicación de cambios desde agentes

---

## Uso Actual

```bash
# Análisis básico
node index.js --project ./mi-proyecto --prompt "optimizar SEO"
node index.js --project ./mi-proyecto --prompt "seguridad jwt"
node index.js --project ./mi-proyecto --prompt "test coverage"
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
    ├── orchestrator/      # Coordena
    ├── agents/            # 6 especializados
    ├── memory/            # Persistencia
    ├── file-engine/       # Cambios
    └── mcp-server/        # Integración
```

---

*Actualizado: 2026-02-13*
*Estado: En desarrollo Fase 4.1*
