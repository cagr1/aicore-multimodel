// Router - Intelligent agent selection with context analysis
import { agents } from '../agents/index.js';
import { isConfigured, chatWithSystem } from '../llm/index.js';
import { getAgentsContext } from '../agents-bridge.js';

/**
 * Keywords that trigger specific agents from user intent
 */
const KEYWORD_TRIGGERS = {
  // SEO
  seo: ['seo', 'search', 'optimize', 'optimization', 'metadata', 'title', 'description', 'google', 'busqueda'],
  
  // Code quality
  code: ['code', 'refactor', 'fix', 'bug', 'implement', 'add', 'create', 'update', 'codigo', 'code quality'],
  
  // Frontend
  frontend: ['frontend', 'ui', 'interfaz', 'componente', 'efecto', 'animacion', 'estilo', 'css', 'jsx', 'tsx', 'vue', 'svelte', 'react', 'pagina', 'web', 'sitio'],
  
  // Backend
  backend: ['backend', 'api', 'endpoint', 'route', 'controller', 'handler', 'servidor', 'ruta', 'database', 'db'],
  
  // Security
  security: ['security', 'seguridad', 'jwt', 'auth', 'authentication', 'authorization', 'vulnerabilidad', 'vulnerable', 'secret', 'key', 'password', 'cripto'],
  
  // Testing
  test: ['test', 'testing', 'spec', 'coverage', 'prueba', 'testear', 'pruebas', 'unit'],
  
  // API specific
  api: ['api', 'rest', 'graphql', 'endpoint', 'crud']
};

/**
 * Project type to default agents mapping
 */
const PROJECT_TYPE_AGENTS = {
  'landing': ['frontend', 'seo'],
  'saas': ['frontend', 'backend', 'security'],
  'ecommerce': ['frontend', 'backend', 'security'],
  'blog': ['frontend', 'seo'],
  'api': ['backend', 'security'],
  'library': ['code', 'test'],
  'cli': ['code', 'test']
};

/**
 * Framework to preferred agent mapping
 */
const FRAMEWORK_AGENTS = {
  'react': ['frontend'],
  'nextjs': ['frontend', 'seo'],
  'vue': ['frontend'],
  'nuxt': ['frontend', 'seo'],
  'svelte': ['frontend'],
  'angular': ['frontend'],
  'express': ['backend'],
  'fastify': ['backend'],
  'django': ['backend'],
  'flask': ['backend'],
  'rails': ['backend'],
  'laravel': ['backend'],
  'spring': ['backend'],
  'go': ['backend'],
  'rust': ['code']
};

/**
 * Check if any keyword matches the user intent
 */
function matchesKeywords(intent, keywords) {
  const lowerIntent = intent.toLowerCase();
  return keywords.some(kw => lowerIntent.includes(kw.toLowerCase()));
}

/**
 * Detect intent using LLM (when configured)
 */
async function detectIntentWithLLM(userIntent, metadata) {
  if (!isConfigured()) {
    return null;
  }
  
  const systemPrompt = `You are an intent classifier for a code assistance system. 
Analyze the user's request and determine which agents should handle it.

Available agents:
- seo: Search engine optimization
- code: Code quality, refactoring
- frontend: UI, components, styles, animations
- backend: APIs, databases, server logic
- security: Authentication, vulnerabilities
- test: Testing, coverage

Respond with a JSON array of agent IDs that should be activated.
Example: ["frontend", "seo"]

User request: ${userIntent}
Project: ${metadata.framework || metadata.language || 'unknown'}
Project type: ${metadata.projectType || 'unknown'}`;

  try {
    const response = await chatWithSystem(systemPrompt, userIntent);
    if (response.success) {
      const agents = JSON.parse(response.content);
      return agents;
    }
  } catch (e) {
    console.error('[Router] LLM detection failed:', e.message);
  }
  
  return null;
}

/**
 * Analyze context from prompt without explicit keywords
 */
function analyzeContext(intent, metadata) {
  const lowerIntent = intent.toLowerCase();
  const context = {
    hasIntent: false,
    impliedAgents: [],
    reason: ''
  };
  
  // Check for action verbs that imply intent
  const actionVerbs = {
    'improve': ['code', 'frontend'],
    'add': ['code', 'frontend'],
    'create': ['code', 'frontend'],
    'build': ['frontend', 'backend'],
    'make': ['frontend', 'code'],
    'fix': ['code'],
    'optimize': ['code', 'seo'],
    'secure': ['security'],
    'protect': ['security'],
    'test': ['test'],
    'verify': ['test'],
    'deploy': ['backend'],
    'setup': ['code'],
    'configure': ['code']
  };
  
  for (const [verb, implied] of Object.entries(actionVerbs)) {
    if (lowerIntent.includes(verb)) {
      context.hasIntent = true;
      context.impliedAgents = implied;
      context.reason = 'Action verb implies: ' + verb;
      break;
    }
  }
  
  // Check for general improvement requests
  const improvementPatterns = [
    /better/i,
    /faster/i,
    /modern/i,
    /better/i,
    /update/i,
    /upgrade/i,
    /enhance/i,
    /boost/i
  ];
  
  if (!context.hasIntent && improvementPatterns.some(p => p.test(lowerIntent))) {
    context.hasIntent = true;
    context.impliedAgents = ['code', 'frontend'];
    context.reason = 'General improvement request';
  }
  
  return context;
}

/**
 * Get default agents based on project type and framework
 */
function getDefaultAgents(metadata) {
  const defaults = [];
  const { projectType, framework, language } = metadata;
  
  // Project type mapping
  if (projectType && PROJECT_TYPE_AGENTS[projectType]) {
    defaults.push(...PROJECT_TYPE_AGENTS[projectType]);
  }
  
  // Framework mapping
  if (framework && FRAMEWORK_AGENTS[framework]) {
    defaults.push(...FRAMEWORK_AGENTS[framework]);
  }
  
  // Language-based defaults
  if (language === 'javascript' || language === 'typescript') {
    defaults.push('frontend');
  } else if (language === 'python') {
    defaults.push('backend');
  }
  
  return [...new Set(defaults)]; // Remove duplicates
}

/**
 * Determine which agents to run based on metadata and user intent
 */
export async function route(input) {
  const { metadata, userIntent, projectPath } = input;
  const { language, framework, capabilities, projectType } = metadata;
  
  const selectedAgents = new Set();
  const reasons = [];
  
  // Step 1: Try LLM-based detection first (if configured)
  const llmAgents = await detectIntentWithLLM(userIntent, metadata);
  if (llmAgents && llmAgents.length > 0) {
    for (const agentId of llmAgents) {
      if (agents[agentId]) {
        selectedAgents.add(agentId);
        reasons.push('LLM detected: ' + agentId);
      }
    }
  }
  
  // Step 2: Fall back to keyword matching if no LLM agents
  if (selectedAgents.size === 0) {
    for (const [agentId, keywords] of Object.entries(KEYWORD_TRIGGERS)) {
      if (matchesKeywords(userIntent, keywords)) {
        if (agents[agentId]) {
          selectedAgents.add(agentId);
          reasons.push('Keyword: ' + agentId);
        }
      }
    }
  }
  
  // Step 3: Context analysis for implicit intents
  if (selectedAgents.size === 0) {
    const context = analyzeContext(userIntent, metadata);
    if (context.hasIntent && context.impliedAgents.length > 0) {
      for (const agentId of context.impliedAgents) {
        if (agents[agentId]) {
          selectedAgents.add(agentId);
          reasons.push('Context: ' + context.reason);
        }
      }
    }
  }
  
  // Step 4: Default agents based on project type/framework
  if (selectedAgents.size === 0) {
    const defaults = getDefaultAgents(metadata);
    if (defaults.length > 0) {
      for (const agentId of defaults) {
        if (agents[agentId]) {
          selectedAgents.add(agentId);
          reasons.push('Default for ' + (framework || projectType || language || 'project'));
        }
      }
    }
  }
  
  // Convert to execution plan with priorities
  const priorityMap = {
    security: 1,
    seo: 2,
    test: 3,
    code: 4,
    frontend: 5,
    backend: 6,
    api: 7,
    llm: 8
  };
  
  const agentPlan = Array.from(selectedAgents).map(agentId => ({
    agentId,
    priority: priorityMap[agentId] || 10,
    config: {
      language,
      framework,
      capabilities,
      projectType
    }
  }));
  
  // Sort by priority
  agentPlan.sort((a, b) => a.priority - b.priority);
  
  // Step 5: Load agents/ knowledge base context via bridge
  const agentIds = agentPlan.map(a => a.agentId);
  let agentsContext = null;
  
  try {
    agentsContext = getAgentsContext({
      metadata,
      selectedAgentIds: agentIds,
      projectPath: projectPath || '',
      userIntent
    });
    
    if (agentsContext.matched) {
      console.error(`[Router] Agents bridge matched project: ${agentsContext.projectName} (${agentsContext.projectId})`);
      console.error(`[Router] Loaded ${agentsContext.mdFiles.length} rule files: ${agentsContext.mdFiles.join(', ')}`);
    }
  } catch (e) {
    console.error('[Router] Agents bridge error (non-fatal):', e.message);
  }
  
  return {
    agents: agentPlan,
    reason: reasons.join('; ') || 'Default agents selected',
    detectionMethod: llmAgents ? 'llm' : (selectedAgents.size > 0 ? 'keyword' : 'default'),
    agentsContext: agentsContext || { matched: false, context: '', mdFiles: [] }
  };
}

export default { route };
