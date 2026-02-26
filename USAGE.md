# ai-core - Guía de Uso

Sistema de orquestación multi-agente con integración LLM, knowledge base, y contexto automático.

---

## Inicio Rápido

```bash
# 1. Clonar e instalar
git clone https://github.com/cagr1/aicore-multimodel.git
cd ai-core
npm install

# 2. Configurar API Keys (opcional)
cp .env.example .env
# Edita .env con tus API keys

# 3. Ejecutar análisis
node index.js --project ./tu-proyecto --prompt "tu prompt"
```

---

## Modos de Uso

### 1. Análisis Rápido (Quick Analyze)
```bash
node index.js --project ./tu-proyecto --prompt "agregar meta tags SEO"
```

Muestra:
- Proyecto detectado y fase
- Stack y tipo
- Contexto de knowledge base cargado
- Reglas aplicadas
- Proposals generadas

### 2. Modo Interactivo (Chat)
```bash
node index.js --interactive --project ./tu-proyecto
```

Comandos:
- Escribe tu prompt directamente
- `/help` - Mostrar ayuda
- `/project <path>` - Cambiar proyecto
- `/status` - Estado de sesión
- `/config` - Configuración LLM
- `/clear` - Limpiar pantalla
- `/exit` - Salir

### 3. Servidor MCP
```bash
node index.js --mcp
```

---

## Configuración

### Variables de Entorno

```bash
# ===========================================
# LIGHT PROVIDER (tareas simples)
# ===========================================
LLM_PROVIDER_LIGHT=minimax
LLM_API_KEY_LIGHT=tu-minimax-api-key
LLM_MODEL_LIGHT=MiniMax-Text-01

# ===========================================
# HEAVY PROVIDER (tareas complejas)
# ===========================================
LLM_PROVIDER_HEAVY=anthropic
LLM_API_KEY_HEAVY=tu-anthropic-api-key
LLM_MODEL_HEAVY=claude-sonnet-4-20250514
```

### Wizard de Inicialización
```bash
node index.js --init
```

Te guía paso a paso para configurar API keys y registrar proyectos.

### Exportar/Importar Configuración
```bash
# Exportar
node index.js --export

# Importar
node index.js --import ./ai-core-export.json
```

---

## Proyectos

Los proyectos se registran automáticamente en `agents/orchestrator/projects/_index.json`. 
Cada proyecto tiene un `state.json` con:
- Fase actual (discovery/build/ship)
- Stack tecnológico
- Prioridades
- Métricas

### Proyectos Registrados
- **CitasBot SaaS** - Next.js, Prisma, PostgreSQL (Fase: build)
- **Cisepro ERP** - Vue 3, .NET 8, EF Core
- **Landings** - Vue 3, GSAP, Three.js

---

## Características

### Knowledge Base
- 20+ archivos `.md` con reglas por dominio
- Agentes específicos por stack (citasbot-stack, landing-stack, etc.)
- Contexto automático basado en el proyecto detectado

### Multi-Model Routing
- **Light (MiniMax)**: SEO, frontend simple, tests, styles
- **Heavy (Claude/GPT)**: Arquitectura, security, database schema, integraciones

### Phase Tracking
Detección automática de fase del proyecto:
- **Discovery**: <20 archivos, sin CI/CD
- **Build**: 20-200 archivos, CI/CD opcional
- **Ship**: >50 archivos, CI/CD, tests, deployment

---

## Proyectos

Perfiles detectados automáticamente:

| Perfil | Agentes |
|--------|---------|
| Landing | frontend, seo |
| SaaS | frontend, backend, security |
| API | backend, security |
| Ecommerce | frontend, backend, security |

---

## Telemetría

Métricas Prometheus disponibles:
```bash
node src/metrics-server.js

# Ver métricas
curl http://localhost:9091/metrics
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
```

---

## Fallback (Sin LLM)

Si no configuras API Key, el sistema funciona en modo determinista:
- Proposals basadas en patrones predefinidos
- Agentes activados por keywords
- Sin generación de código con LLM

---

## Solución de Problemas

| Error | Solución |
|-------|----------|
| "LLM not configured" | Configura `LLM_API_KEY_LIGHT` en .env |
| "Proposal not found" | Ejecuta `--prompt` primero para generar propuestas |
| Scanner no detecta | Verifica que el path tenga archivos |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI (index.js)                        │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│  --prompt   │ --interactive│   --init    │     --mcp      │
└──────┬──────┴──────┬──────┴──────┬──────┴────────┬────────┘
       │              │              │               │
       v              v              v               v
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server (mcp-server)                  │
├─────────────────────────────────────────────────────────────┤
│  scan()  │  route()  │  orchestrate()  │  generateProposals │
└──────┬──────┴────┬────┴───────┬───────┴────────┬──────────┘
       │           │            │                │
       v           v            v                v
┌─────────────────────────────────────────────────────────────┐
│                     Scanner + Router                         │
├─────────────────────────────────────────────────────────────┤
│  scan()  │  matchProject()  │  selectModel()  │ detectPhase│
└──────┬──────┴────┬─────────┴──────┬─────────┴──────┬───────┘
       │           │                 │                │
       v           v                 v                v
┌─────────────────────────────────────────────────────────────┐
│                    Agents Bridge                            │
├─────────────────────────────────────────────────────────────┤
│  getOrCreateProjectContext()  │  updateProjectPhase()      │
│  autoRegisterProject()        │  getAgentsContext()        │
└───────────────┬─────────────────────────────────┬──────────┘
               │                                 │
               v                                 v
┌─────────────────────────┐    ┌─────────────────────────────┐
│   Knowledge Base       │    │      LLM Providers          │
│   agents/             │    │  (minimax/openai/anthropic)│
│   - stacks/           │    │  - selectModel()           │
│   - backend/         │    │  - Dual routing            │
│   - frontend/        │    │                            │
└─────────────────────────┘    └─────────────────────────────┘
```

---

*ai-core v2.0 - 100% Completado*
