# ai-core

Multi-agent orchestration system with intelligent LLM routing, knowledge base integration, and automatic context management. Works as external middleware - no installation required in client projects.

## Key Features

- **External**: No installation in client projects
- **Stack-agnostic**: Supports JS, TS, Python, Go, Rust, PHP, C#
- **MCP Ready**: Integrates with Kilo.ai via Model Context Protocol
- **Deterministic Agents**: Executable code, not just markdown
- **Dual LLM Routing**: Light (MiniMax) for simple tasks, Heavy (Claude/GPT) for complex ones
- **Knowledge Base**: 20+ expert files loaded automatically based on project type
- **Controlled Memory**: Per-project persistence with TTL and PII redaction
- **Auto-Registration**: New projects detected and registered automatically
- **Phase Tracking**: Detects project phase (discovery/build/ship)
- **Smart Router**: Detects intent without explicit keywords
- **Quality Assurance**: Atomic apply, secret scanner, test validation
- **Telemetry**: Prometheus metrics with Grafana dashboard support
- **A/B Testing**: Compare ai-core vs LLM fallback

## Quick Start

```bash
# Clone and install
npm install

# Configure LLM (optional - works without it)
cp .env.example .env
# Edit .env with your API keys

# Run analysis
node index.js --project ./your-project --prompt "add JWT authentication"
```

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│  ai-core    │────▶│  Project    │
│   (Prompt)  │     │  (Router)   │     │  Analysis   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   ▼
       │           ┌─────────────┐
       │           │  Knowledge  │
       └──────────▶│    Base     │
                   │ (experts)   │
                   └─────────────┘
```

### 1. Project Scanning
Detects language, framework, project type, and phase automatically.

### 2. Knowledge Base Integration
Loads expert `.md` files based on detected stack:
- **Frontend**: Design, Animations (GSAP/Three.js), UX/Accessibility, Performance
- **Backend**: PostgreSQL, SQL Server, APIs
- **Security**: Auth, JWT, OWASP Top 10
- **DevOps**: Docker, CI/CD, Deployment

### 3. Intelligent Routing
- **Light Provider** (MiniMax): SEO, simple frontend, tests, styles
- **Heavy Provider** (Claude/GPT): Architecture, security, database schema
- Selection based on: agent type, keywords, project phase, complexity

### 4. Auto-Project Registration
New projects automatically registered with:
- Inferred type (Landing, SaaS, API, ERP)
- Inferred stack
- Phase detection
- Stored in `agents/orchestrator/projects/`

---

## CLI Usage

### Quick Analyze
```bash
node index.js --project ./my-project --prompt "optimize SEO"
```

### Interactive Mode
```bash
node index.js --interactive --project ./my-project
```

### Force Specific Agent
```bash
node index.js --project ./my-project --prompt "create tests" --force-agent test
```

### Preview & Apply
```bash
# Preview proposal
node index.js --project ./my-project --preview <proposal-id>

# Apply changes
node index.js --project ./my-project --apply <proposal-id>
```

### Initialize Project
```bash
node index.js --init
```

### Export/Import Configuration
```bash
node index.js --export
node index.js --import ./ai-core-export.json
```

### MCP Server
```bash
node index.js --mcp
```

---

## Project Phases

| Phase | Signals |
|-------|---------|
| **Discovery** | <20 files, no CI/CD, no tests |
| **Build** | 20-200 files, CI/CD optional |
| **Ship** | >50 files, CI/CD, tests, deployment |

Phase auto-updates in project `state.json`.

---

## Configuration

### Environment Variables

```bash
# ===========================================
# LIGHT PROVIDER (simple tasks)
# ===========================================
LLM_PROVIDER_LIGHT=minimax
LLM_API_KEY_LIGHT=your-minimax-api-key
LLM_MODEL_LIGHT=MiniMax-Text-01

# ===========================================
# HEAVY PROVIDER (complex tasks)
# ===========================================
LLM_PROVIDER_HEAVY=anthropic
LLM_API_KEY_HEAVY=your-anthropic-api-key
LLM_MODEL_HEAVY=claude-sonnet-4-20250514

# Memory
AI_CORE_TTL_DAYS=30
AI_CORE_MEMORY_DIR=~/.ai-core
```

### Config File (config/default.json)

```json
{
  "modelRouting": {
    "light": { "provider": "minimax", "model": "MiniMax-Text-01" },
    "heavy": { "provider": "anthropic", "model": "claude-sonnet-4-20250514" },
    "rules": [
      { "agent": "seo", "provider": "light" },
      { "agent": "test", "provider": "light" },
      { "agent": "security", "provider": "heavy" },
      { "agent": "backend", "keywords": ["schema", "database"], "provider": "heavy" }
    ]
  }
}
```

---

## Agents

| Agent | Function |
|-------|----------|
| SEO | Search engine analysis and optimization |
| Code | Code analysis and suggestions |
| Frontend | UI components, templates, styles |
| Backend | APIs, databases, architecture |
| Security | Vulnerabilities and recommendations |
| Test | Unit test generation |

---

## Quality Assurance

### Atomic Apply
- Snapshot before applying
- Automatic rollback on failure
- Sandbox test validation
- Check runner (lint → build → test)

### Secret Scanner
Blocks proposals containing:
- AWS Keys, GCP Keys
- Database URLs
- JWT Tokens
- API Keys
- SSH Private Keys

---

## Telemetry

```bash
# Start metrics server
node src/metrics-server.js

# Metrics at http://localhost:9091/metrics
```

### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `ai_core_proposals_analyzed_total` | Counter | Proposals analyzed |
| `ai_core_proposals_generated_total` | Counter | Proposals by agent type |
| `ai_core_apply_result_total` | Counter | Apply results |
| `ai_core_analyze_latency_seconds` | Histogram | Analysis latency |
| `ai_core_apply_latency_seconds` | Histogram | Apply latency |
| `ai_core_secrets_detected_total` | Counter | Secrets found |
| `ai_core_scan_errors_total` | Counter | Scan errors |
| `ai_core_memory_entries` | Gauge | Memory entries |

---

## A/B Testing

```bash
# Run all prompts
node scripts/ab-test.cjs

# Limited run
node scripts/ab-test.cjs --limit 10

# Custom threshold
node scripts/ab-test.cjs --threshold 0.5
```

---

## File Structure

```
ai-core/
├── index.js              # Entry point
├── README.md            # This file
├── USAGE.md             # Complete usage guide
├── GUIDE.md             # Quick reference
├── config/
│   ├── default.json     # Default configuration
│   └── ab_config.json   # A/B testing thresholds
├── plans/
│   ├── architecture.md # Architecture details
│   └── system.md       # System overview
├── scripts/
│   ├── ab-test.cjs      # A/B testing script
│   └── dashboard-seed.cjs # Grafana dashboard
├── agents/              # Knowledge base (experts)
│   ├── frontend/        # Design, Animations, UX, Performance
│   ├── backend/         # APIs, Databases
│   ├── security/        # Security expert
│   ├── devops/          # Cloud & Deployment
│   ├── database/        # PostgreSQL, SQL Server
│   └── orchestrator/    # Registered projects
└── src/
    ├── scanner/         # Language/framework detection
    ├── router/          # Intelligent agent selection + scoring
    ├── orchestrator/    # Coordinates execution + fallback
    ├── agents/          # 6 specialized agents
    ├── memory/          # JSONL persistence + TTL + redaction
    ├── file-engine/     # Diff, backup, atomic apply
    ├── proposals/       # Structured proposals
    ├── llm/             # LLM abstraction
    │   ├── providers/  # minimax, openai, anthropic
    │   └── kilo.cjs    # Kilo API client
    ├── telemetry/       # Prometheus metrics
    ├── metrics-server.js # Metrics server
    ├── config/          # Runtime configuration
    ├── profiles/        # Project profiles
    └── mcp-server/     # MCP server
```

---

## Documentation

| File | Description |
|------|-------------|
| [USAGE.md](USAGE.md) | Complete usage guide |
| [GUIDE.md](GUIDE.md) | Quick reference |
| [plans/system.md](plans/system.md) | System overview (EN) |
| [plans/architecture.md](plans/architecture.md) | Architecture details |

---

## Knowledge Base

The `agents/` directory contains expert knowledge files that are automatically loaded based on project type:

- **Frontend Experts**: Design, Animations, UX/Accessibility, Performance
- **Backend Experts**: Node.js, Laravel, .NET, PostgreSQL, SQL Server
- **Security Experts**: Auth, API Security, OWASP Top 10
- **DevOps Experts**: Docker, CI/CD, Deployment, Cloud
- **Stack Profiles**: CitasBot, Landing, Cisepro ERP

---

## Testing

```bash
npm test
# ✓ 46 tests passing
```

---

## FAQ

### Does it work without API keys?
Yes. The system works in "fallback mode" without API keys:
- Proposals based on predefined patterns
- Agents activated by keywords
- No LLM-generated code

### What happens if I switch to a free model?
The system continues to work because:
1. **Knowledge base is independent** - `.md` files always loaded
2. **Routing is deterministic** - Keywords work without LLM
3. **Model routing is configurable** - Set both providers in `.env`

The main difference is **proposal quality** - free models may generate less accurate code.

### What happens with new projects?
1. Scanner detects language/framework
2. Project auto-registered in `_index.json`
3. Phase detected (discovery/build/ship)
4. Knowledge base loaded based on inferred type
5. Ready to use prompts

---

## License

MIT
