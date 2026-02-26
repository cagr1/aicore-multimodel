# ai-core Test Plan

## Current Test Coverage

### ✅ Existing Tests (46 tests)

| Module | Test File | Tests |
|--------|-----------|-------|
| Router | `src/router/__tests__/scoring.test.js` | 12 |
| Orchestrator | `src/orchestrator/__tests__/fallback.test.js` | 10 |
| File Engine | `src/file-engine/__tests__/atomic.test.js` | 12 |
| Secret Scanner | `src/file-engine/__tests__/secret-scanner.test.js` | 12 |

### ❌ Modules Without Tests

| Module | Priority | Reason |
|--------|----------|--------|
| `src/agents/` | HIGH | Core functionality |
| `src/scanner/` | HIGH | Project detection |
| `src/mcp-server/` | HIGH | Main entry point |
| `src/memory/` | MEDIUM | Data persistence |
| `src/proposals/` | MEDIUM | Proposal generation |
| `src/llm/` | MEDIUM | LLM integration |
| `src/profiles/` | MEDIUM | Project profiles |
| `src/cli/` | LOW | CLI utilities |
| `src/telemetry/` | LOW | Metrics |
| `src/file-engine/check-runner.js` | MEDIUM | Validation |
| `src/file-engine/test-validator.js` | MEDIUM | Test validation |

---

## Test Plan by Module

### 1. Agents Module (`src/agents/`)

**Why testing is critical:**
- Agents are the core of the system
- They parse project files and generate diagnostics
- No tests = no confidence in analysis

#### Test Structure
```
src/agents/__tests__/
├── index.test.js       # Registry, getAgent, agentSupportsLanguage
├── backend.test.js     # Backend agent
├── frontend.test.js   # Frontend agent
├── security.test.js   # Security agent
├── seo.test.js        # SEO agent
├── code.test.js       # Code agent
└── test-agent.test.js # Test agent
```

#### Test Cases for `agents/index.js`
```javascript
// getAgent(id)
- Should return agent for valid id
- Should return null for invalid id

// agentSupportsLanguage(agentId, language)
- Should return true for supported language
- Should return false for unsupported language
- Should return false for invalid agentId
```

#### Test Cases for Each Agent

**Common tests (all agents):**
```javascript
// run(context) with valid context
- Should return success: true
- Should return diagnostics array
- Should return changes array
- Should return summary string

// run(context) with unsupported language
- Should return success: false
- Should return warning diagnostic
- Should include language in message

// run(context) with missing projectPath
- Should return error gracefully
- Should not crash

// run(context) with invalid projectPath (non-existent)
- Should handle filesystem error
- Should return error diagnostic
```

**Agent-specific tests:**

| Agent | Specific Tests |
|-------|---------------|
| Backend | Detects routes, controllers, services; Language support |
| Frontend | Framework detection (React, Vue, Next.js); Entry point detection |
| Security | Hardcoded secrets, SQL injection, eval() usage |
| SEO | Title tags, meta description, viewport |
| Code | TODO comments, console.log, empty catch blocks |
| Test | Test framework detection, coverage config |

---

### 2. Scanner Module (`src/scanner/`)

**Test Structure:**
```
src/scanner/__tests__/
├── index.test.js        # scanProject
├── phase-detector.test.js # Phase detection
└── detectors/
    ├── javascript.test.js
    ├── python.test.js
    └── ...
```

**Test Cases:**
```javascript
// scanProject(projectPath)
- Should detect JavaScript project
- Should detect TypeScript project
- Should detect Python project
- Should detect framework (React, Vue, Next.js, etc.)
- Should return metadata with language, framework, signals

// scanProject with invalid path
- Should return error

// detectPhase(projectPath)
- Should detect "discovery" for <20 files
- Should detect "build" for 20-200 files
- Should detect "ship" for >50 files with CI/CD
```

---

### 3. Memory Module (`src/memory/`)

**Test Structure:**
```
src/memory/__tests__/
├── storage.test.js
└── index.test.js
```

**Test Cases:**
```javascript
// append(project, data)
- Should append JSONL entry
- Should include timestamp
- Should redact PII

// query(project, filter)
- Should filter by date range
- Should return empty for no matches

// purgeExpired(projectPath)
- Should delete entries older than TTL

// redactPII(text)
- Should redact email addresses
- Should redact phone numbers
- Should redact API keys
```

---

### 4. MCP Server (`src/mcp-server/`)

**Test Structure:**
```
src/mcp-server/__tests__/
├── index.test.js
└── server.test.js
```

**Test Cases:**
```javascript
// scan(projectPath)
- Should call scanner and return results

// route(agent, context)
- Should route to correct agent

// orchestrate(prompt, context)
- Should coordinate multiple agents
- Should handle agent failures gracefully

// getLLMStatus()
- Should return configured/unconfigured status
```

---

### 5. Proposals Module (`src/proposals/`)

**Test Cases:**
```javascript
// generateProposals(agentResults)
- Should create proposal from agent results
- Should include file changes

// validateProposal(proposal)
- Should validate required fields
- Should reject invalid proposals
```

---

### 6. LLM Module (`src/llm/`)

**Test Cases:**
```javascript
// chatWithSystem(prompt, context)
- Should call provider
- Should handle provider errors

// selectModel(task, context)
- Should select light model for simple tasks
- Should select heavy model for complex tasks

// isConfigured()
- Should return true when API key present
- Should return false when no API key
```

---

## Error Handling Improvements

### Current Issues in Agents

| File | Issue | Severity |
|------|-------|----------|
| `backend.js` | No try/catch on `fs.readdirSync` | HIGH |
| `frontend.js` | No validation of `projectPath` | HIGH |
| `security.js` | Recursive read without limit | MEDIUM |
| `seo.js` | Missing catch for some file reads | MEDIUM |
| `code.js` | No limit on recursive scan | MEDIUM |
| `test.js` | No error handling for JSON.parse | MEDIUM |

### Required Error Handling

**1. Validate inputs at entry point:**
```javascript
export async function run(context) {
  // Validate context
  if (!context || !context.projectPath) {
    return {
      success: false,
      diagnostics: [{
        severity: 'error',
        message: 'Invalid context: projectPath is required',
        file: '',
        line: 0
      }],
      changes: [],
      summary: 'Error: Invalid context'
    };
  }
  
  // Validate projectPath exists
  if (!fs.existsSync(projectPath)) {
    return {
      success: false,
      diagnostics: [{
        severity: 'error',
        message: `Project path does not exist: ${projectPath}`,
        file: '',
        line: 0
      }],
      changes: [],
      summary: 'Error: Project path not found'
    };
  }
  
  // ... rest of function
}
```

**2. Wrap filesystem operations:**
```javascript
function safeReaddir(path) {
  try {
    return fs.readdirSync(path);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    if (error.code === 'EACCES') {
      console.warn(`Permission denied: ${path}`);
      return [];
    }
    throw error;
  }
}
```

**3. Limit recursive scans:**
```javascript
function scanFiles(projectPath, maxFiles = 100) {
  const files = [];
  const walker = (dir, depth = 0) => {
    if (depth > 3 || files.length >= maxFiles) return;
    
    const entries = safeReaddir(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      if (isDirectory(fullPath)) {
        if (!shouldSkip(entry)) {
          walker(fullPath, depth + 1);
        }
      } else {
        files.push(fullPath);
      }
    }
  };
  
  walker(projectPath);
  return files;
}
```

**4. Add timeout for long operations:**
```javascript
async function runWithTimeout(context, timeoutMs = 30000) {
  return Promise.race([
    run(context),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Agent timeout')), timeoutMs)
    )
  ]);
}
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific module
npm test -- --grep "agents"

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

---

## Test Fixtures

Create test projects in `tests/fixtures/`:
```
tests/fixtures/
├── javascript-react/     # React project
├── javascript-vue/       # Vue project
├── python-django/       # Django project
├── empty/               # Empty project
└── invalid/             # Invalid project (no package.json, etc.)
```

---

## Acceptance Criteria

- [ ] All agents have unit tests (>80% coverage)
- [ ] Scanner module has comprehensive tests
- [ ] Memory module has tests for CRUD and PII redaction
- [ ] MCP server has integration tests
- [ ] Error handling tested for all edge cases
- [ ] Test fixtures created for common project types

---

*Updated: 2026-02-26*
