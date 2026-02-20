# ai-core - System Overview

## What is ai-core?

ai-core is a **multi-agent orchestration system** that integrates with Kilo.ai to assist in software development. It analyzes projects and generates change proposals without requiring installation in each project.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Kilo     │────▶│  ai-core    │────▶│  Project    │
│   (Chat)   │     │  (Agents)   │     │  Analysis   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Core Flow

### 1. Project Scanning
The system first scans the project to detect:
- **Language**: JavaScript, TypeScript, Python, Go, Rust, PHP, C#
- **Framework**: React, Vue, Express, Django, FastAPI, etc.
- **Project Type**: Landing page, SaaS, API

### 2. Routing
Based on user intent, the router selects the appropriate agent:
- `frontend` - UI/Components
- `backend` - APIs/Routes
- `seo` - SEO optimization
- `code` - Code quality
- `security` - Security/JWT
- `test` - Testing

### 3. Confidence Scoring
Each route decision gets a score (0-1):

| Score | Action |
|-------|--------|
| ≥ 0.7 | Auto-apply candidate |
| 0.4-0.7 | Fallback to LLM |
| < 0.4 | Request clarification |

### 4. Agent Execution
Selected agents analyze the project and generate **proposals**.

### 5. Quality Assurance Pipeline
Before applying changes:

```
Proposal → Secret Scan → Test Validation → Apply/Rollback
              │              │                 │
              ▼              ▼                 ▼
         [Block if      [Run tests      [Success or
          secrets]       in sandbox]     automatic
                                         rollback]
```

## Key Features

### Atomic Patch Manager
Applies changes atomically with automatic rollback:
1. Create snapshot
2. Apply changes
3. Run tests in sandbox
4. Execute checks (lint → build → test)
5. If anything fails → rollback

### Secret Scanner
Scans all proposals for sensitive data:
- AWS/GCP keys
- Database URLs
- JWT tokens
- SSH keys
- API keys
- High-entropy strings

Blocked if security score < 0.3 or critical findings detected.

### Test Validation
- Agents can attach tests to proposals
- Tests run in isolated sandbox
- Auto-generate smoke tests if none provided
- Rollback on test failure

### Memory & Retention
JSONL-based storage with:
- **TTL**: Auto-delete records older than 30 days
- **Redaction**: PII is anonymized before storage
- **Logs**: All purge/rotation events logged

## File Structure

```
src/
├── scanner/          # Language/framework detection
├── router/          # Agent selection + scoring
├── orchestrator/    # Coordinates agents
├── agents/          # 6 specialized agents
├── proposals/       # Change proposals
├── file-engine/     # Atomic apply, tests, secrets
├── memory/          # JSONL storage, TTL, redaction
└── mcp-server/     # CLI interface
```

## Usage Examples

```bash
# Basic analysis
node index.js --project ./my-project --prompt "optimize SEO"

# With proposals
node index.js --project ./my-project --prompt "add 3D hero section"

# Force specific agent
node index.js --project ./my-project --prompt "add tests" --force-agent test

# Apply changes
node index.js --project ./my-project --apply <proposal-id>

# View status
node index.js --project ./my-project --status
```

## Configuration

Environment variables:
- `AI_CORE_TTL_DAYS` - Memory retention (default: 30)
- `AI_CORE_MEMORY_DIR` - Storage location
- `LLM_PROVIDER` - LLM backend (minimax/openai/anthropic)
- `LLM_API_KEY` - API key for LLM

## Testing

```bash
npm test
# ✓ 46 tests passing
```

Tests cover:
- Scoring module
- Fallback rules
- Atomic patches
- Secret scanning
- Memory retention

---

## Telemetry & Metrics

The server exposes Prometheus-compatible metrics at `/metrics` endpoint:

```bash
# Start metrics server
node src/metrics-server.js
# or
npm run start:metrics

# Metrics available at: http://localhost:9091/metrics
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

### Grafana Dashboard

Import the dashboard via Grafana UI or API:

```bash
# Generate dashboard JSON
node scripts/dashboard-seed.cjs

# Copy the JSON and import in Grafana: Dashboards → Import
```

Prometheus scraping configuration:
```yaml
- job_name: "ai-core-mcp"
  static_configs:
    - targets: ["localhost:9091"]
```

---

## A/B Testing

Compare ai-core deterministic routing vs LLM fallback to evaluate performance:

```bash
# Run all 100 prompts
node scripts/ab-test.cjs

# Run limited number
node scripts/ab-test.cjs --limit 10

# Custom threshold
node scripts/ab-test.cjs --threshold 0.5
```

### Results

The script generates:
- `tests/ab_results.csv` - Detailed results per prompt
- `report.csv` - KPIs summary

### KPIs Generated

| Metric | Description |
|--------|-------------|
| `total_prompts` | Total prompts tested |
| `llm_fallback_count` | Prompts that needed LLM |
| `ai_core_only_count` | Prompts handled by ai-core |
| `apply_possible_count` | Prompts with high confidence |
| `agent_accuracy` | % of correct agent selection |
| `avg_time_ms` | Average processing time |

---

## Kilo API Integration

Patch validation via Kilo's LLM:

```bash
# Configure Kilo API
export KILO_API_URL=http://localhost:3000/api
export KILO_API_KEY=your-key
```

The API expects:
```json
{
  "context": "repo snapshot (relevant diffs)",
  "prompt": "Valida y mejora este patch. Constraints: no secrets, pasar lint/build/tests, no cambios de arquitectura mayor."
}
```

Expected response:
```json
{
  "confidence": 0.95,
  "patches": ["git-diff"],
  "tests": [{"file": "test.js", "content": "..."}],
  "notes": "2-líneas"
}
```

---

## AB Configuration

Configurable thresholds in `config/ab_config.json`:

```json
{
  "autoApply": 0.75,
  "llmFallback": 0.4,
  "maxAutoApplyPerDay": 10,
  "forceApplyAllowed": false
}
```

### Auto-Apply Limits

- Daily auto-apply limit tracked via telemetry
- Alert emitted when limit exceeded
- Metrics: `ai_core_auto_apply_attempt_total`, `ai_core_auto_apply_alert_total`

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
| Kilo API integration | ✅ Complete |
| PR template | ✅ Complete |
