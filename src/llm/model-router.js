// Model Router - Select between heavy (expensive) and light (cheap) LLM providers
// Based on task complexity, agent type, and prompt content

/**
 * Complexity signals that indicate HEAVY model needed
 */
const HEAVY_SIGNALS = {
  // Agents that typically need complex reasoning
  agents: ['security', 'architecture', 'backend'],
  
  // Keywords indicating architecture/decisions
  keywords: [
    'arquitectura', 'architecture', 'schema', 'migración', 'migration',
    'diseño', 'design', 'sistema', 'system', 'integración', 'integration',
    'pagos', 'payments', 'stripe', 'paddle', 'webhook', 'suscripción',
    'autenticación', 'authentication', 'seguridad', 'security',
    'base de datos', 'database', 'modelo', 'model', 'entidad', 'entity',
    'refactorizar', 'refactor', 'restructurar', 'reestructurar',
    'multi-tenant', 'tenant', 'microservicio', 'microservice',
    'api rest', 'restful', 'graphql', 'websocket'
  ],
  
  // Complexity threshold
  complexityThreshold: 0.6
};

/**
 * Complexity signals that indicate LIGHT model is sufficient
 */
const LIGHT_SIGNALS = {
  // Agents that are typically simple
  agents: ['seo', 'frontend', 'test', 'code'],
  
  // Keywords indicating simple tasks
  keywords: [
    'agregar', 'add', 'crear', 'create', 'estilos', 'styles', 'css',
    'meta tags', 'metadata', 'seo', 'title', 'description',
    'componente', 'component', 'página', 'page', 'vista', 'view',
    'test', 'testing', 'prueba', 'coverage', 'test unitario',
    'fix', 'bug', 'arreglar', 'corregir',
    'animación', 'animation', 'efecto', 'effect',
    'responsive', 'mobile', 'adaptar',
    'botón', 'button', 'form', 'formulario',
    'actualizar', 'update', 'texto', 'content'
  ],
  
  // Complexity threshold
  complexityThreshold: 0.3
};

/**
 * Default to light model unless strong heavy signals
 */
const DEFAULT_MODEL = 'light';

/**
 * Analyze prompt content for complexity signals
 * @param {string} userIntent - User's prompt
 * @returns {Object} Analysis result
 */
function analyzePrompt(userIntent) {
  const lowerIntent = userIntent.toLowerCase();
  
  const heavyMatches = HEAVY_SIGNALS.keywords.filter(kw => 
    lowerIntent.includes(kw.toLowerCase())
  );
  
  const lightMatches = LIGHT_SIGNALS.keywords.filter(kw => 
    lowerIntent.includes(kw.toLowerCase())
  );
  
  return {
    heavyKeywords: heavyMatches,
    lightKeywords: lightMatches,
    hasHeavyKeywords: heavyMatches.length > 0,
    hasLightKeywords: lightMatches.length > 0
  };
}

/**
 * Analyze agent type for complexity
 * @param {string[]} agentIds - Selected agent IDs
 * @returns {Object} Agent analysis
 */
function analyzeAgents(agentIds) {
  const heavyAgents = agentIds.filter(id => 
    HEAVY_SIGNALS.agents.includes(id)
  );
  
  const lightAgents = agentIds.filter(id => 
    LIGHT_SIGNALS.agents.includes(id)
  );
  
  return {
    hasHeavyAgent: heavyAgents.length > 0,
    hasLightAgent: lightAgents.length > 0,
    heavyAgents,
    lightAgents
  };
}

/**
 * Determine which model tier to use based on all signals
 * @param {Object} params - Routing parameters
 * @param {string} params.userIntent - User's prompt
 * @param {string[]} params.agentIds - Selected agent IDs
 * @param {number} params.complexityEstimate - Complexity from scoring (0-1)
 * @param {string} params.projectPhase - Project phase: discovery|build|ship
 * @returns {Object} Model selection result
 */
export function selectModel({ userIntent, agentIds = [], complexityEstimate = 0.3, projectPhase = 'build' }) {
  const promptAnalysis = analyzePrompt(userIntent);
  const agentAnalysis = analyzeAgents(agentIds);
  
  let heavyScore = 0;
  let lightScore = 0;
  const reasons = [];
  
  // Agent-based scoring
  if (agentAnalysis.hasHeavyAgent) {
    heavyScore += 3;
    reasons.push(`Heavy agent: ${agentAnalysis.heavyAgents.join(', ')}`);
  }
  if (agentAnalysis.hasLightAgent && !agentAnalysis.hasHeavyAgent) {
    lightScore += 2;
    reasons.push(`Light agent: ${agentAnalysis.lightAgents.join(', ')}`);
  }
  
  // Complexity-based scoring
  if (complexityEstimate >= HEAVY_SIGNALS.complexityThreshold) {
    heavyScore += 3;
    reasons.push(`High complexity: ${complexityEstimate.toFixed(2)}`);
  } else if (complexityEstimate <= LIGHT_SIGNALS.complexityThreshold) {
    lightScore += 2;
    reasons.push(`Low complexity: ${complexityEstimate.toFixed(2)}`);
  }
  
  // Prompt keyword scoring
  if (promptAnalysis.hasHeavyKeywords) {
    heavyScore += promptAnalysis.heavyKeywords.length;
    reasons.push(`Heavy keywords: ${promptAnalysis.heavyKeywords.slice(0, 3).join(', ')}`);
  }
  if (promptAnalysis.hasLightKeywords) {
    lightScore += promptAnalysis.lightKeywords.length;
    reasons.push(`Light keywords: ${promptAnalysis.lightKeywords.slice(0, 3).join(', ')}`);
  }
  
  // Phase-based scoring
  if (projectPhase === 'discovery') {
    // In discovery, most decisions are architectural
    heavyScore += 2;
    reasons.push('Discovery phase: architectural decisions');
  } else if (projectPhase === 'ship') {
    // In ship phase, prefer light model (mostly fixes)
    lightScore += 2;
    reasons.push('Ship phase: maintenance mode');
  }
  
  // Security is always heavy
  if (agentIds.includes('security')) {
    heavyScore += 4;
    reasons.push('Security agent: always heavy');
  }
  
  // Determine final selection
  const useHeavy = heavyScore > lightScore;
  const selectedTier = useHeavy ? 'heavy' : DEFAULT_MODEL;
  
  const result = {
    tier: selectedTier,
    heavyScore,
    lightScore,
    reasons,
    complexityEstimate,
    promptAnalysis,
    agentAnalysis,
    // For telemetry
    routingReason: reasons.join('; ') || 'default'
  };
  
  console.error('[ModelRouter] Selected:', selectedTier, '- Score:', heavyScore, '/', lightScore, '- Reasons:', result.routingReason);
  
  return result;
}

/**
 * Get provider config for the selected tier
 * @param {string} tier - 'heavy' or 'light'
 * @returns {Object|null} Provider configuration
 */
export function getProviderConfig(tier) {
  const envPrefix = tier.toUpperCase();
  
  const provider = process.env[`LLM_PROVIDER_${envPrefix}`] || 
                  process.env.LLM_PROVIDER;
  const apiKey = process.env[`LLM_API_KEY_${envPrefix}`] || 
                 process.env.LLM_API_KEY;
  const baseUrl = process.env[`LLM_BASE_URL_${envPrefix}`] || 
                  process.env.LLM_BASE_URL;
  const model = process.env[`LLM_MODEL_${envPrefix}`] || 
                process.env.LLM_MODEL;
  
  if (!apiKey) {
    return null;
  }
  
  return {
    provider,
    apiKey,
    baseUrl,
    defaultModel: model,
    temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS) || 2048,
    tier
  };
}

/**
 * Check if dual providers are configured
 * @returns {Object} Status of heavy and light providers
 */
export function getProviderStatus() {
  const heavyConfig = getProviderConfig('heavy');
  const lightConfig = getProviderConfig('light');
  
  const heavyAvailable = heavyConfig !== null;
  const lightAvailable = lightConfig !== null;
  
  // If only one is available, that's the fallback
  const singleProviderMode = heavyAvailable !== lightAvailable;
  
  return {
    heavy: heavyAvailable ? 'configured' : 'not_configured',
    light: lightAvailable ? 'configured' : 'not_configured',
    singleProviderMode,
    canRoute: heavyAvailable && lightAvailable,
    activeProvider: heavyAvailable ? 'heavy' : (lightAvailable ? 'light' : 'none')
  };
}

/**
 * Get the appropriate provider config based on tier selection
 * Falls back to available provider if requested tier is not configured
 * @param {Object} selection - Result from selectModel()
 * @returns {Object} Provider configuration to use
 */
export function resolveProvider(selection) {
  const status = getProviderStatus();
  
  // If single provider mode, use whatever is available
  if (status.singleProviderMode) {
    return getProviderConfig('light') || getProviderConfig('heavy');
  }
  
  // If no providers configured at all
  if (!status.canRoute) {
    return null;
  }
  
  // Return the requested tier config
  return getProviderConfig(selection.tier);
}

export default {
  selectModel,
  getProviderConfig,
  getProviderStatus,
  resolveProvider,
  HEAVY_SIGNALS,
  LIGHT_SIGNALS
};
