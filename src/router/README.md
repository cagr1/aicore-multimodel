# Router Module

## Overview

The router module is responsible for selecting which agents should handle a given user intent. It uses multiple strategies:

1. **Keyword Matching** - Matches user intent against predefined keywords
2. **Profile-Based** - Uses project profile to suggest default agents
3. **Context Analysis** - Analyzes action verbs for implicit intents
4. **LLM Detection** (optional) - Uses LLM to detect intent when configured
5. **Confidence Scoring** - Calculates confidence score for routing decisions

## Usage

```javascript
import { route } from './index.js';

const result = await route({
  metadata: {
    language: 'typescript',
    framework: 'react',
    projectType: 'saas'
  },
  userIntent: 'agregar login JWT'
});

console.log(result);
// { agents: [...], reason: '...', detectionMethod: '...' }
```

## Confidence Scoring

The router includes a scoring module (`scoring.js`) that calculates confidence:

### Formula

```
score = clamp(0.5*keywords + 0.3*profile + 0.2*historical - 0.1*complexity, 0, 1)
```

### Weights

| Component | Weight | Description |
|-----------|--------|-------------|
| keywords | 0.5 | How well keywords match |
| profile | 0.3 | Profile-agent alignment |
| historical | 0.2 | Past success rate |
| complexity | -0.1 | Penalty for complex tasks |

### Levels

| Score | Level | Action |
|-------|-------|--------|
| ≥ 0.7 | high | Proceed with deterministic |
| ≥ 0.4 | medium | Proceed with warning |
| < 0.4 | low | Fallback to LLM |

### Example

```javascript
import { computeScore, getRecommendedAction } from './scoring.js';

const result = computeScore({
  keywordsScore: 1,
  profileMatchScore: 1,
  historicalSuccessScore: 0.8,
  complexityEstimate: 0.2
});

console.log(result);
// {
//   score: 0.88,
//   level: 'high',
//   breakdown: { keywords: 0.5, profile: 0.3, historical: 0.16, complexity: 0.02 }
// }

const action = getRecommendedAction(result.score);
// { action: 'proceed', message: 'High confidence...' }
```

## Structured Logging

The scoring module outputs JSON logs for analysis:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "prompt_id": "abc123",
  "score": 0.75,
  "level": "high",
  "breakdown": { "keywords": 0.4, "profile": 0.2, "historical": 0.15, "complexity": 0 },
  "input": { "keywordsScore": 0.8, "profileMatchScore": 0.7, "historicalSuccessScore": 0.75, "complexityEstimate": 0 }
}
```

## Agent Priority

Agents are executed in priority order:

| Priority | Agent |
|----------|-------|
| 1 | security |
| 2 | seo |
| 3 | test |
| 4 | code |
| 5 | frontend |
| 6 | backend |
| 7 | api |
| 8 | llm |

## Keywords

### Frontend
- frontend, ui, interfaz, componente, efecto, animacion, estilo, css, jsx, tsx, vue, svelte, react, pagina, web, sitio

### Backend
- backend, api, endpoint, route, controller, handler, servidor, ruta, database, db

### Security
- security, seguridad, jwt, auth, authentication, authorization, vulnerabilidad, vulnerable, secret, key, password, cripto

### SEO
- seo, search, optimize, optimization, metadata, title, description, google, busqueda

### Code
- code, refactor, fix, bug, implement, add, create, update, codigo, code quality

### Test
- test, testing, spec, coverage, prueba, testear, pruebas, unit
