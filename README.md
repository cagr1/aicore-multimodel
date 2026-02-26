# ai-core

> **Your expertise, codified. Any model, any project.**

AI models don't know your coding standards, your preferred patterns, or your architecture decisions. Every time you start a new project, you re-explain the same rules. ai-core fixes that.

**ai-core** is a middleware that sits between you and any LLM. It scans your project, detects what you're building, and automatically injects domain-specific expert rules into every prompt — so the AI generates code that follows *your* standards, not generic ones.

---

## Why ai-core?

### The Problem
You write: *"Create a login page"*

**Without ai-core:** The LLM generates generic code with Inter font, centered layout, purple gradients, `h-screen` (broken on iOS), and no loading states.

**With ai-core:** The system detects you're building a landing page, loads your premium design rules (typography, color calibration, motion physics, anti-AI-slop patterns), and the LLM generates code that looks like an Awwwards submission.

### How?

```
You write a prompt
        │
        ▼
┌─────────────────┐
│   ai-core       │
│                 │
│  1. Scan project│ → Detects: Next.js, Landing, Build phase
│  2. Load rules  │ → Loads: design-taste.md, animations-expert.md, security-expert.md
│  3. Route model │ → Selects: Heavy (Claude) for architecture, Light (MiniMax) for SEO
│  4. Inject KB   │ → Adds 10+ expert rule files to the prompt context
│                 │
└────────┬────────┘
         │
         ▼
   LLM generates code
   following YOUR rules
```

### The Key Insight
Your expertise lives in **Markdown files** — not in the model. Switch from Claude to GPT to a free model? Your rules still apply. Start a new project? Your standards carry over automatically.

---

## Example Output

```bash
$ node index.js --project ./my-landing --prompt "create hero section"
```

```
📁 Project: my-landing
🔍 Detected: javascript | nextjs | landing | build phase
📚 Knowledge Base: 8 rule files loaded
   ├── frontend/design-taste.md (premium design rules)
   ├── frontend/animations-expert.md (GSAP, Framer Motion)
   ├── frontend/performance-expert.md (Core Web Vitals)
   └── ... 5 more

🤖 Model: heavy (claude-sonnet) — complex UI task
🎯 Agent: frontend (confidence: 0.85)

📋 Proposal generated:
   - Asymmetric hero layout (anti-center bias)
   - Geist font, Zinc palette, single accent
   - min-h-[100dvh] (not h-screen)
   - Framer Motion spring physics
   - Loading + empty + error states included
```

---

## Quick Start

```bash
# Install
npm install

# Configure (optional — works without API keys)
cp .env.example .env

# Analyze any project
node index.js --project ./your-project --prompt "add JWT authentication"
```

---

## Key Features

### Automatic Project Understanding
Point ai-core at any project. It detects:
- **Language**: JavaScript, TypeScript, Python, Go, Rust, PHP, C#
- **Framework**: React, Vue, Next.js, Express, Django, Laravel, .NET
- **Project Type**: Landing page, SaaS, API, ERP, E-commerce
- **Phase**: Discovery (<20 files) → Build (20-200) → Ship (>50 + CI/CD)

### Knowledge Base (Your Expertise, Codified)
Expert rules in `agents/` are loaded automatically based on what you're building:

| Domain | Expert Files | Activated When |
|--------|-------------|----------------|
| **Premium Design** | `design-taste.md` | Landing, SaaS, E-commerce |
| **Basic Design** | `design-awwwards.md` | API, other projects |
| **Animations** | `animations-expert.md` | GSAP, Three.js, Framer Motion |
| **PostgreSQL** | `postgresql-expert.md` | Prisma, PostgreSQL detected |
| **SQL Server** | `sqlserver-expert.md` | .NET, EF Core detected |
| **Security** | `security-expert.md` | Auth, JWT, API endpoints |
| **Cloud/DevOps** | `cloud-expert.md` | Docker, CI/CD, deployment |
| **UX/A11y** | `ux-accessibility.md` | Frontend projects |
| **Performance** | `performance-expert.md` | Core Web Vitals, optimization |

### Dual-Model Routing
Automatically selects the right model for each task:

| Task Type | Model | Why |
|-----------|-------|-----|
| SEO, simple CSS, tests | **Light** (MiniMax) | Fast, cheap |
| Architecture, security, DB schema | **Heavy** (Claude/GPT) | Accurate, deep |

### Quality Assurance
- **Atomic Apply**: Snapshot → apply → test → rollback if fails
- **Secret Scanner**: Blocks proposals with hardcoded keys, passwords, tokens
- **Test Validation**: Runs tests in sandbox before applying

---

## CLI Usage

```bash
# Quick analyze
node index.js --project ./my-project --prompt "optimize SEO"

# Interactive chat
node index.js --interactive --project ./my-project

# Force specific agent
node index.js --project ./my-project --prompt "create tests" --force-agent test

# Preview & apply proposals
node index.js --project ./my-project --preview <proposal-id>
node index.js --project ./my-project --apply <proposal-id>

# Initialize new project
node index.js --init

# Export/import configuration
node index.js --export
node index.js --import ./ai-core-export.json

# MCP Server mode
node index.js --mcp
```

---

## Configuration

### Environment Variables

```bash
# Light Provider (simple tasks)
LLM_PROVIDER_LIGHT=minimax
LLM_API_KEY_LIGHT=your-key
LLM_MODEL_LIGHT=MiniMax-Text-01

# Heavy Provider (complex tasks)
LLM_PROVIDER_HEAVY=anthropic
LLM_API_KEY_HEAVY=your-key
LLM_MODEL_HEAVY=claude-sonnet-4-20250514

# Memory
AI_CORE_TTL_DAYS=30
```

### Works Without API Keys
No keys? No problem. The system runs in **deterministic mode**:
- Proposals based on predefined patterns
- Agents activated by keywords
- Knowledge base still loaded
- No LLM-generated code (but still useful analysis)

---

## Architecture

```
ai-core/
├── agents/                # Knowledge base (your expertise)
│   ├── frontend/          # Design, Animations, UX, Performance
│   ├── backend/           # Node.js, Laravel, .NET APIs
│   ├── database/          # PostgreSQL, SQL Server
│   ├── security/          # Auth, OWASP, API Security
│   ├── devops/            # Docker, CI/CD, Cloud
│   └── orchestrator/      # Registered projects + state
├── src/
│   ├── scanner/           # Language/framework detection
│   ├── router/            # Intelligent agent selection + scoring
│   ├── orchestrator/      # Coordinates agents + fallback
│   ├── agents/            # 6 specialized agents (code)
│   ├── agents-bridge.js   # Connects knowledge base to agents
│   ├── llm/               # LLM providers + dual-model router
│   ├── memory/            # JSONL persistence + TTL + PII redaction
│   ├── file-engine/       # Atomic apply, secret scanner, tests
│   ├── proposals/         # Structured change proposals
│   ├── profiles/          # Project type profiles
│   ├── telemetry/         # Prometheus metrics
│   └── mcp-server/        # MCP protocol server
├── config/                # Routing rules, thresholds
├── scripts/               # A/B testing, Grafana dashboard
└── plans/                 # Architecture docs
```

---

## Agents

| Agent | What It Does |
|-------|-------------|
| **Frontend** | UI components, design rules, animations, accessibility |
| **Backend** | APIs, routes, controllers, database queries |
| **Security** | Hardcoded secrets, SQL injection, auth patterns |
| **SEO** | Meta tags, viewport, build scripts, static optimization |
| **Code** | Console.log cleanup, TODO tracking, empty catch blocks |
| **Test** | Test framework detection, coverage config, CI/CD |

---

## Telemetry

```bash
node src/metrics-server.js
# Prometheus metrics at http://localhost:9091/metrics
```

| Metric | Description |
|--------|-------------|
| `ai_core_proposals_analyzed_total` | Proposals analyzed |
| `ai_core_proposals_generated_total` | Proposals by agent |
| `ai_core_apply_result_total` | Apply success/failure |
| `ai_core_secrets_detected_total` | Secrets blocked |
| `ai_core_analyze_latency_seconds` | Analysis time |

---

## Documentation

| File | Description |
|------|-------------|
| [USAGE.md](USAGE.md) | Complete usage guide |
| [GUIDE.md](GUIDE.md) | Quick reference |
| [TEST.md](TEST.md) | Test plan |
| [plans/system.md](plans/system.md) | System overview |
| [plans/architecture.md](plans/architecture.md) | Architecture details |

---

## Testing

```bash
npm test
# ✓ 46 tests passing
```

---

## FAQ

### What happens if I switch to a free model?
Your knowledge base still loads. The routing still works. The only difference is proposal quality — free models generate simpler code, but they still follow your rules.

### What happens with a new project?
1. Scanner detects language/framework
2. Project auto-registered with inferred type
3. Phase detected (discovery/build/ship)
4. Knowledge base loaded based on type
5. Ready to prompt

### Can I add my own expert rules?
Yes. Create a `.md` file in `agents/` and add it to the mapping in [`src/agents-bridge.js`](src/agents-bridge.js). Your rules will be injected into every relevant prompt.

---

## License

MIT
