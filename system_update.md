# ai-core — System Update & Improvement Plan

> **Fecha:** 2026-02-26
> **Fase actual del proyecto:** Infraestructura completa, funcionalidad incompleta
> **Objetivo:** Que ai-core sea una herramienta funcional y útil para cualquier desarrollador que quiera escribir un prompt y empezar a trabajar en su proyecto con contexto automático, sin repetir información, con control total del usuario.

---

## Estado Actual (Snapshot)

### ✅ Lo que funciona y está sólido

| Componente | Archivo | Estado |
|-----------|---------|--------|
| Scanner de proyectos | `src/scanner/index.js` | Detecta lenguaje, framework, tipo de proyecto |
| Router multi-capa | `src/router/index.js` | 4 capas: LLM → keywords → context → defaults |
| Knowledge base | `agents/` folder | 20+ archivos .md con reglas por dominio |
| Agents bridge | `src/agents-bridge.js` | Conecta knowledge base con el sistema |
| Projects index | `agents/orchestrator/projects/_index.json` | 8 proyectos registrados con stack y fase |
| Agent registry | `agents/orchestrator/agents/registry.json` | 18 agentes registrados con roles y triggers |
| Scoring | `src/router/scoring.js` | Fórmula de confianza con breakdown |
| Orchestrator | `src/orchestrator/index.js` | Ejecuta agentes en orden con fallback |
| File engine | `src/file-engine/` | Atomic apply, backup, diff, secret scanner |
| Telemetría | `src/telemetry/index.js` | Prometheus-compatible counters/gauges/histograms |
| Memory | `src/memory/storage.js` | JSONL append-only con TTL y PII redaction |
| LLM providers | `src/llm/providers/` | Anthropic, OpenAI, MiniMax, Kilo |
| Token optimization | `src/llm/prompts.js` | Compact encoding, budget validation |
| MCP server | `src/mcp-server/index.js` | Protocolo MCP completo con analyze/preview/apply |

### ⚠️ Lo que existe pero está incompleto

| Componente | Problema |
|-----------|----------|
| Proposals determinísticas | Solo 7 patrones hardcodeados en `src/proposals/index.js` |
| Memory | Guarda runs pero no se usa para mejorar decisiones futuras |
| Telemetría | Métricas existen pero no se visualizan (no hay Grafana activo) |
| Token savings | Counter existe (`tokens_saved_estimate`) pero casi no se llama |
| Phase tracking | `state.json` tiene `current_phase` pero es estático/manual |

### ❌ Lo que NO existe y es crítico para la visión

| Feature | Por qué importa |
|---------|-----------------|
| **Multi-model routing** | La idea central: modelo caro para arquitectura, modelo barato para tareas simples |
| **Auto-registro de proyectos** | Hoy hay que editar `_index.json` manualmente para cada proyecto nuevo |
| **Phase tracking automático** | El sistema no sabe si estás en discovery, build o ship |
| **CLI interactivo** | Sin interfaz usable, la herramienta es invisible |
| **Onboarding para nuevos usuarios** | Solo funciona para quien configuró los archivos manualmente |

---

## Visión del Producto

### Qué es ai-core

Un **asistente de desarrollo con memoria y contexto** que funciona dentro del flujo de trabajo del desarrollador (chat, IDE, terminal). No es un agente autónomo — es una herramienta que **amplifica** al desarrollador dándole contexto automático, routing inteligente de modelos, y conocimiento acumulado de sus proyectos.

### Principios de diseño

1. **Control del usuario** — El desarrollador siempre decide. ai-core sugiere, no ejecuta autónomamente. El chat (como este) es el flujo principal, no un agente tipo OpenClaw/Devin.

2. **Contexto sin repetición** — Escribes "agregar pagos" y el sistema ya sabe que usas Paddle, que el proyecto es CitasBot, que estás en fase build, y que el stack es Next.js + Prisma. No repites nada.

3. **Modelo correcto para la tarea** — Tareas de arquitectura/seguridad → modelo potente. Tareas repetitivas/simples → modelo económico. El ahorro es real y medible.

4. **Funcional para cualquiera** — No solo para el creador. Cualquier desarrollador debería poder hacer `ai-core init` y empezar a usarlo con sus propios proyectos.

5. **Indistinto del modelo** — La lógica determinística (scanner, router, bridge, knowledge base) funciona sin LLM. El LLM mejora la experiencia pero no es requisito.

---

## Plan de Mejora

### Fase 1: Multi-Model Routing (PRIORIDAD MÁXIMA)

**Objetivo:** Permitir 2+ providers/modelos simultáneos y rutear automáticamente según complejidad de la tarea.

**Archivos a modificar/crear:**
- `src/llm/index.js` — Soportar múltiples providers activos
- `src/llm/model-router.js` — NUEVO: Lógica de selección de modelo
- `config/default.json` — Agregar configuración dual
- `.env` — Variables para heavy/light providers

**Configuración objetivo:**
```env
# Modelo pesado (arquitectura, seguridad, decisiones complejas)
LLM_PROVIDER_HEAVY=anthropic
LLM_MODEL_HEAVY=claude-sonnet-4
LLM_API_KEY_HEAVY=sk-xxx

# Modelo ligero (tareas simples, repetitivas)
LLM_PROVIDER_LIGHT=minimax
LLM_MODEL_LIGHT=MiniMax-Text-01
LLM_API_KEY_LIGHT=xxx

# Fallback: si solo hay 1 configurado, usa ese para todo
```

**Lógica de routing:**

```
Señales de complejidad ALTA (→ modelo heavy):
- Agente seleccionado es 'security' o 'architecture'
- risk_level del classifier es 'high'
- El prompt menciona: schema, arquitectura, migración, integración, pagos
- complexityEstimate > 0.6 (del scoring module)
- Proyecto en fase 'discovery' (decisiones de arquitectura)

Señales de complejidad BAJA (→ modelo light):
- Agente es 'seo' o 'frontend' simple
- risk_level es 'low'
- El prompt es: agregar componente, meta tags, estilos, tests unitarios
- complexityEstimate < 0.3
- Proyecto en fase 'ship' (solo fixes menores)

Default: modelo light (ahorrar por defecto)
```

**Métricas a trackear:**
- `ai_core_model_used{model="heavy|light"}` — Counter
- `ai_core_model_cost_estimate{model="heavy|light"}` — Gauge (estimado en USD)
- `ai_core_model_routing_reason{reason="..."}` — Counter

**Criterio de éxito:** 60%+ de requests van al modelo light. Ahorro estimado: 40-60% en costos de API.

---

### Fase 2: Auto-Registro de Proyectos

**Objetivo:** Cuando ai-core escanea un proyecto que no está en `_index.json`, lo registra automáticamente.

**Archivos a modificar/crear:**
- `src/agents-bridge.js` — Agregar `autoRegisterProject()`
- `agents/orchestrator/projects/_index.json` — Auto-append
- Template para `state.json` nuevo

**Flujo:**
```
1. Scanner detecta: language=javascript, framework=vue, projectType=landing
2. agents-bridge.matchProject() → null (no encontrado)
3. NUEVO: autoRegisterProject() se activa
4. Infiere: id=nombre-del-folder, type=landing, stack=[Vue 3]
5. Crea entrada en _index.json
6. Crea state.json con phase="discovery"
7. Log: "Nuevo proyecto registrado: mi-landing (Landing, Vue 3)"
```

**Modo interactivo (futuro):**
```
🆕 Proyecto nuevo detectado: ./mi-landing
   Stack detectado: Vue 3, GSAP
   Tipo inferido: Landing
   
   ¿Confirmar? [Y/n] 
   ¿Nombre? [mi-landing] > Mi Landing Awwwards
```

**Criterio de éxito:** Cero configuración manual para proyectos nuevos. El bridge siempre tiene contexto.

---

### Fase 3: Phase Tracking Automático

**Objetivo:** Detectar automáticamente la fase del proyecto (discovery/build/ship) basándose en señales del código.

**Archivos a modificar/crear:**
- `src/scanner/phase-detector.js` — NUEVO: Detecta fase
- `src/agents-bridge.js` — Actualizar state.json automáticamente
- `agents/classifier/decision-classifier.md` — Ya tiene reglas por fase, ahora se usan de verdad

**Señales de fase:**

| Señal | Discovery | Build | Ship |
|-------|-----------|-------|------|
| Archivos en `src/` | < 5 | 5-50 | 50+ |
| Tests | 0 | Algunos | Coverage > 60% |
| CI/CD (`.github/workflows/`) | No | Opcional | Sí |
| Dockerfile / vercel.json | No | Opcional | Sí |
| README completo | No | Parcial | Sí |
| Dependencias | < 5 | 5-20 | 20+ |
| Git commits | < 10 | 10-100 | 100+ |
| Dominio/URL configurado | No | No | Sí |

**Impacto en el sistema:**
- En **discovery**: el classifier permite arquitectura libre, el modelo heavy se usa más
- En **build**: agentes específicos, modelo light para tareas repetitivas
- En **ship**: prohíbe refactors grandes, solo fixes, modelo light

**Criterio de éxito:** `state.json.current_phase` se actualiza automáticamente en cada scan. Las reglas del `decision-classifier.md` se aplican correctamente.

---

### Fase 4: CLI Interactivo + Dashboard Terminal

**Objetivo:** Una interfaz usable que muestre el valor de ai-core en cada interacción.

**Archivos a crear:**
- `src/cli/index.js` — CLI interactivo con inquirer/prompts
- `src/cli/dashboard.js` — Dashboard en terminal (blessed/ink)

**Experiencia objetivo:**
```
$ ai-core

╔══════════════════════════════════════════════╗
║  ai-core v2.0                                ║
╠══════════════════════════════════════════════╣
║  Proyecto: CitasBot SaaS                     ║
║  Fase: build                                 ║
║  Stack: Next.js 16, Prisma, PostgreSQL       ║
║  Prioridad: Dashboard analytics              ║
║  Modelo activo: MiniMax (light)              ║
║  Sesión: 3 prompts, $0.002 gastado           ║
╚══════════════════════════════════════════════╝

¿Qué quieres hacer?
> agregar gráficos de analytics al dashboard

🤖 Analizando...
   Complejidad: Media → Modelo: MiniMax (light)
   Agentes: frontend, backend
   Reglas: citasbot-stack.md, react-hooks.md
   
📋 Proposals generadas:
   1. [frontend] Crear componente AnalyticsChart.tsx
   2. [backend] Agregar endpoint /api/analytics/summary
   3. [frontend] Integrar chart en DashboardPage.tsx

¿Aplicar? [preview/apply/skip]
```

**Lo que muestra:**
- Proyecto detectado automáticamente
- Fase actual
- Modelo usado y por qué
- Costo acumulado de la sesión
- Reglas de knowledge base cargadas

**Criterio de éxito:** El usuario VE el valor en cada interacción. Sabe qué modelo se usó, cuánto costó, qué reglas se aplicaron.

---

### Fase 5: Portabilidad y Onboarding

**Objetivo:** Cualquier desarrollador puede usar ai-core sin conocer la estructura interna.

**Archivos a crear:**
- `src/cli/init.js` — Wizard de inicialización
- `src/cli/import-export.js` — Import/export de configuración

**Flujo de onboarding:**
```
$ ai-core init

👋 Bienvenido a ai-core

1. ¿Tienes API key de algún proveedor LLM?
   [1] Anthropic (Claude)
   [2] OpenAI (GPT)
   [3] MiniMax (económico)
   [4] No tengo (modo determinístico)
   > 3

2. ¿Quieres configurar un segundo modelo para tareas complejas?
   [1] Sí, tengo otro API key
   [2] No, usar solo MiniMax
   > 1

3. Escaneando proyectos en tu workspace...
   Encontrados: 3 proyectos
   - ./citasbot → SaaS (Next.js, Prisma) 
   - ./mi-landing → Landing (Vue 3, GSAP)
   - ./api-service → API (Express)
   
   ¿Registrar todos? [Y/n]

✅ Configuración completa. Ejecuta: ai-core
```

**Para usuarios no-programadores (futuro):**
- Interfaz web simple (localhost)
- "Describe tu proyecto en una oración" → ai-core infiere todo
- Templates predefinidos: "Landing page", "SaaS con pagos", "API REST"

---

## Qué NO hacer (anti-patterns)

1. **NO hacer un agente autónomo** — El valor está en el control del usuario. El chat es el flujo principal. ai-core amplifica, no reemplaza.

2. **NO sobre-optimizar tokens** — El ahorro real viene del multi-model routing, no de comprimir prompts. Los centavos por request no importan; elegir el modelo correcto sí.

3. **NO agregar más agentes sin usar los actuales** — Hay 18 agentes en el registry. Primero hay que hacer que los existentes funcionen bien con el multi-model routing.

4. **NO construir UI web compleja** — El CLI interactivo es suficiente para desarrolladores. La UI web es para la fase de "usuarios no-programadores" (futuro lejano).

5. **NO competir con Cursor/Kilo/Cline** — ai-core no es un IDE ni un agente. Es la **capa de inteligencia** que cualquier herramienta puede consumir via MCP. El valor es el contexto y el routing, no la interfaz.

---

## Métricas de Éxito del Proyecto

| Métrica | Hoy | Objetivo Fase 1-2 | Objetivo Fase 3-5 |
|---------|-----|--------------------|--------------------|
| Tiempo de setup para proyecto nuevo | ~15 min (manual) | 0 min (auto-registro) | 0 min + wizard |
| % de requests al modelo light | 0% (solo 1 modelo) | 60%+ | 70%+ |
| Contexto repetido por sesión | ~200 palabras | 0 palabras | 0 palabras |
| Usuarios que pueden usarlo | 1 (creador) | 1 (creador, más fácil) | Cualquier dev |
| Costo promedio por sesión | $X (todo al mismo modelo) | $0.4X (multi-model) | $0.3X |
| Valor visible por interacción | Bajo (output JSON crudo) | Medio (CLI muestra contexto) | Alto (dashboard + costos) |

---

## Orden de Implementación Recomendado

```
Fase 1: Multi-Model Routing ← EMPEZAR AQUÍ
  └─ Es el diferenciador principal
  └─ Ahorro medible desde el día 1
  └─ Base para todo lo demás

Fase 2: Auto-Registro
  └─ Elimina fricción
  └─ Necesario antes del CLI interactivo

Fase 3: Phase Tracking
  └─ Hace que el classifier funcione de verdad
  └─ Conecta con multi-model (discovery=heavy, ship=light)

Fase 4: CLI Interactivo
  └─ Hace visible todo el valor
  └─ El usuario VE el ahorro y el contexto

Fase 5: Portabilidad
  └─ Solo cuando las fases 1-4 estén sólidas
  └─ Abre la puerta a otros usuarios
```

---

## Notas para el Modelo (Contexto para futuras sesiones)

- Este proyecto es **ai-core**, un sistema MCP de orquestación multi-agente
- El creador quiere **control** (chat-driven), NO autonomía (no OpenClaw/Devin)
- La prioridad #1 es **multi-model routing**: modelo caro para arquitectura, barato para tareas simples
- La knowledge base en `agents/` es el activo más valioso — contiene reglas específicas de 8+ proyectos reales
- El sistema tiene infraestructura sólida (scanner, router, bridge, file engine) pero le falta la capa de UX y el multi-model
- El objetivo final es que **cualquier desarrollador** pueda usarlo, no solo el creador
- Estamos en **Fase 0 → Fase 1** del plan de mejora
