// Router - Deterministic agent selection based ONLY on metadata + user intent
import { agents } from '../agents/index.js';

/**
 * Keywords that trigger specific agents from user intent
 */
const KEYWORD_TRIGGERS = {
  // SEO
  seo: ['seo', 'search', 'optimize', 'optimization', 'metadata', 'title', 'description', 'google'],
  
  // Code quality
  code: ['code', 'refactor', 'fix', 'bug', 'implement', 'add', 'create', 'update', 'código'],
  
  // Frontend
  frontend: ['frontend', 'ui', 'interfaz', 'componente', 'efecto', 'animación', 'estilo', 'css', 'jsx', 'tsx', 'vue', 'svelte', 'react'],
  
  // Backend
  backend: ['backend', 'api', 'endpoint', 'route', 'controller', 'handler', 'servidor', 'ruta'],
  
  // Security
  security: ['security', 'seguridad', 'jwt', 'auth', 'authentication', 'authorization', 'vulnerabilidad', 'vulnerable', 'secret', 'key'],
  
  // Testing
  test: ['test', 'testing', 'spec', 'coverage', 'prueba', 'testear', 'coverage'],
  
  // API specific
  api: ['api', 'rest', 'graphql', 'endpoint', 'crud']
};

/**
 * Check if any keyword matches the user intent
 */
function matchesKeywords(intent, keywords) {
  const lowerIntent = intent.toLowerCase();
  return keywords.some(kw => lowerIntent.includes(kw.toLowerCase()));
}

/**
 * Determine which agents to run based on metadata and user intent
 */
export function route(input) {
  const { metadata, userIntent } = input;
  const { language, framework, capabilities } = metadata;
  
  const selectedAgents = new Set();
  const reasons = [];
  
  // Check keyword triggers from user intent ONLY
  const keywordAgents = new Set();
  for (const [agentId, keywords] of Object.entries(KEYWORD_TRIGGERS)) {
    if (matchesKeywords(userIntent, keywords)) {
      if (agents[agentId]) {
        keywordAgents.add(agentId);
        reasons.push(`Keyword: '${agentId}' from intent`);
      }
    }
  }
  
  // Use keyword-triggered agents if any
  if (keywordAgents.size > 0) {
    keywordAgents.forEach(a => selectedAgents.add(a));
  }
  
  // Convert to execution plan with priorities
  const priorityMap = {
    security: 1,
    seo: 2,
    test: 3,
    code: 4,
    frontend: 5,
    backend: 6,
    api: 7
  };
  
  const agentPlan = Array.from(selectedAgents).map(agentId => ({
    agentId,
    priority: priorityMap[agentId] || 10,
    config: {
      language,
      framework,
      capabilities
    }
  }));
  
  // Sort by priority
  agentPlan.sort((a, b) => a.priority - b.priority);
  
  return {
    agents: agentPlan,
    reason: reasons.join('; ') || 'No agents activated - explicit intent required'
  };
}

export default { route };
