# ai-core - System Overview

## What is ai-core?

ai-core is a **multi-agent orchestration system** with intelligent LLM routing, knowledge base integration, and automatic context management. It analyzes projects and generates change proposals without requiring installation in each project.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│  ai-core    │────▶│  Project    │
│   (Chat)    │     │  (Router)   │     │  Analysis   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   ▼
       │           ┌─────────────┐
       │           │  Knowledge  │
       └──────────▶│    Base     │
                   └─────────────┘
```

## Core Flow

### 1. Project Scanning
The system first scans the project to detect:
- **Language**: JavaScript, TypeScript, Python, Go, Rust, PHP, C#
- **Framework**: React, Vue, Express, Django, FastAPI, Next.js, Laravel, .NET
- **Project Type**: Landing page, SaaS, API, ERP
- **Phase**: Discovery, Build, Ship

### 2. Multi-Model Routing
Based on task complexity, the system selects the appropriate LLM:

| Provider | Use Case |
|----------|----------|
| **MiniMax (Light)** | SEO, frontend simple, tests, styles |
| **Claude/GPT (Heavy)** | Architecture, security, database schema |

Routing factors:
- Agent type (architecture → heavy, seo → light)
- Keywords in prompt
- Project phase (discovery → light, build → mixed)
- Complexity estimate

### 3. Knowledge Base Integration
- 20+ domain-specific `.md` files in `agents/`
- Auto-loaded based on detected project type
- Provides context for agents

### 4. Auto-Project Registration
New projects are automatically registered with:
- Inferred type (Landing, SaaS, API, ERP)
- Inferred stack
- Initial phase detection
- Stored in `agents/orchestrator/projects/`

### 5. Phase Tracking
Automatic phase detection based on code signals:

| Phase | Signals |
|-------|---------|
| **Discovery** | <20 files, no CI/CD, no tests |
| **Build** | 20-200 files, CI/CD optional |
| **Ship** | >50 files, CI/CD, tests, deployment |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI (index.js)                        │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│  --prompt   │ --interactive│   --init    │     --mcp      │
│  --project  │ --project    │             │     --export   │
│             │              │             │     --import   │
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
│   - classifier/      │    │                            │
└─────────────────────────┘    └─────────────────────────────┘
```

---

## Key Features

### 1. Multi-Model Routing
- **Light Provider**: MiniMax for simple tasks (SEO, frontend simple, tests, styles)
- **Heavy Provider**: Claude/GPT for complex tasks (architecture, security, database)
- Automatic selection based on:
  - Agent type
  - Keywords in prompt
  - Project phase
  - Complexity estimate

### 2. Auto-Project Registration
- New projects detected automatically
- Type and stack inferred from code
- Stored in `agents/orchestrator/projects/_index.json`
- Each project has `state.json` with phase, stack, priorities

### 3. Phase Tracking
- **Discovery**: <20 files, no CI/CD
- **Build**: 20-200 files, CI/CD optional
- **Ship**: >50 files, CI/CD, tests, deployment
- Phase auto-updates in `state.json`

### 4. Knowledge Base
- 20+ domain-specific Markdown files
- Stacks: citasbot-stack, landing-stack, cisepro-stack
- Agents: backend, frontend, seo, security, test, code
- Auto-loaded based on project type

### 5. CLI Modes
```bash
# Quick analyze
node index.js --project ./proj --prompt "task"

# Interactive chat
node index.js --interactive --project ./proj

# MCP Server
node index.js --mcp

# Init wizard
node index.js --init

# Export/Import
node index.js --export
node index.js --import ./export.json
```

---

## File Structure

```
src/
├── scanner/           # Language/framework detection + phase detection
├── router/           # Agent selection + scoring + model routing
├── orchestrator/    # Coordinates agents
├── agents/          # 6 specialized agents
├── proposals/       # Change proposals
├── file-engine/     # Atomic apply, tests, secrets
├── memory/          # JSONL storage, TTL, redaction
├── llm/             # LLM providers + model router
├── cli/             # Interactive CLI + portability
├── profiles/        # Project profiles
├── config/          # Configuration
└── mcp-server/     # MCP interface
```

---

## Configuration

### Environment Variables

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

### Config File (config/default.json)

```json
{
  "modelRouting": {
    "light": {
      "provider": "minimax",
      "model": "MiniMax-Text-01"
    },
    "heavy": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-20250514"
    },
    "rules": [
      { "agent": "seo", "provider": "light" },
      { "agent": "test", "provider": "light" },
      { "agent": "frontend", "keywords": ["simple", "css", "style"], "provider": "light" },
      { "agent": "security", "provider": "heavy" },
      { "agent": "backend", "keywords": ["schema", "database"], "provider": "heavy" }
    ]
  }
}
```

---

## Usage Examples

```bash
# Basic analysis
node index.js --project ./my-project --prompt "optimize SEO"

# Frontend task
node index.js --project ./my-project --prompt "add 3D hero section with GSAP"

# Backend task
node index.js --project ./my-project --prompt "create database schema for users"

# Security review
node index.js --project ./my-project --prompt "implement JWT authentication"

# Interactive mode
node index.js --interactive --project ./my-project

# Initialize new project
node index.js --init
```

---

## Testing

```bash
npm test
# ✓ Tests passing
```

Tests cover:
- Scoring module
- Fallback rules
- Atomic patches
- Secret scanning
- Memory retention

---

## Telemetry & Metrics

```bash
# Start metrics server
node src/metrics-server.js

# Metrics at: http://localhost:9091/metrics
```

### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `ai_core_proposals_analyzed_total` | Counter | Proposals analyzed |
| `ai_core_proposals_generated_total` | Counter | Proposals by agent type |
| `ai_core_apply_result_total` | Counter | Apply results by status |
| `ai_core_analyze_latency_seconds` | Histogram | Analysis latency |
| `ai_core_apply_latency_seconds` | Histogram | Apply latency |
| `ai_core_secrets_detected_total` | Counter | Secrets found in patches |
| `ai_core_scan_errors_total` | Counter | Scan errors |
| `ai_core_memory_entries` | Gauge | Memory entries count |

---

## A/B Testing

```bash
# Run all prompts
node scripts/ab-test.cjs

# Limited run
node scripts/ab-test.cjs --limit 10
```

---

## Project Status

| Feature | Status |
|---------|--------|
| Scanner (JS/TS/Python/Go/Rust/PHP/C#) | ✅ Complete |
| Router with scoring | ✅ Complete |
| 6 Specialized agents | ✅ Complete |
| Memory with TTL/Redaction | ✅ Complete |
| Atomic patch manager | ✅ Complete |
| Secret scanner | ✅ Complete |
| Test validation | ✅ Complete |
| Prometheus metrics | ✅ Complete |
| A/B testing | ✅ Complete |
| **Multi-Model Routing** | ✅ Complete |
| **Auto-Project Registration** | ✅ Complete |
| **Phase Tracking** | ✅ Complete |
| **Interactive CLI** | ✅ Complete |
| **Portability (Export/Import)** | ✅ Complete |

---

## FAQ

### What happens if I switch from Opus 4.6 to a free model?
The system will continue to work because:
1. **Knowledge base is independent** - `.md` files are always loaded regardless of LLM
2. **Routing is deterministic** - Keywords and agent selection work without LLM
3. **Model routing is configurable** - You can set both providers in `.env`

The main difference is the **quality of generated proposals**. A free model may:
- Generate less accurate code
- Have worse context understanding
- Produce simpler/more basic solutions

### What happens when starting a new project?
1. Scanner detects language/framework
2. Project is auto-registered in `_index.json`
3. Phase is detected (discovery/build/ship)
4. Knowledge base is loaded based on inferred type
5. You're ready to use prompts

### Does the system require an API key?
**No**. The system works in "fallback mode" without API keys:
- Proposals based on predefined patterns
- Agents activated by keywords
- No LLM-generated code

With API keys:
- Full LLM-powered proposals
- Better context understanding
- More accurate suggestions

---

*ai-core v2.0 - Complete*
