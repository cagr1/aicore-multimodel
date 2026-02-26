// LLM Module - Unified LLM Provider Abstraction with Multi-Model Support
import { minimaxProvider } from './providers/minimax.js';
import { openaiProvider } from './providers/openai.js';
import { anthropicProvider } from './providers/anthropic.js';
import { kiloProvider } from './providers/kilo.js';
import { selectModel, getProviderStatus, resolveProvider } from './model-router.js';

/**
 * Available providers
 */
const PROVIDERS = {
  minimax: minimaxProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  kilo: kiloProvider
};

/**
 * Current configuration
 */
let currentConfig = null;
let currentProvider = null;

/**
 * Heavy provider (for complex tasks)
 */
let heavyConfig = null;
let heavyProvider = null;

/**
 * Light provider (for simple tasks)
 */
let lightConfig = null;
let lightProvider = null;

/**
 * Initialize a specific provider
 * @param {Object} config - Provider configuration
 * @returns {Object} Provider instance
 */
function initProvider(config) {
  const provider = PROVIDERS[config.provider];
  
  if (!provider) {
    throw new Error('Unknown provider: ' + config.provider + '. Available: ' + Object.keys(PROVIDERS).join(', '));
  }
  
  return provider;
}

/**
 * Initialize LLM with dual-provider configuration
 * @param {Object} options - Configuration options
 * @param {Object} options.heavy - Heavy provider config (optional)
 * @param {Object} options.light - Light provider config (optional)
 */
export function initLLM(options = {}) {
  const { heavy, light } = options;
  
  // Initialize heavy provider if provided
  if (heavy && heavy.apiKey) {
    try {
      heavyProvider = initProvider(heavy);
      heavyConfig = heavy;
      console.error('[LLM] Heavy provider initialized:', heavy.provider, 'model:', heavy.defaultModel);
    } catch (e) {
      console.error('[LLM] Failed to initialize heavy provider:', e.message);
    }
  }
  
  // Initialize light provider if provided
  if (light && light.apiKey) {
    try {
      lightProvider = initProvider(light);
      lightConfig = light;
      console.error('[LLM] Light provider initialized:', light.provider, 'model:', light.defaultModel);
    } catch (e) {
      console.error('[LLM] Failed to initialize light provider:', e.message);
    }
  }
  
  // Legacy single-provider support
  if (!heavy && !light) {
    console.error('[LLM] No providers configured. Use initLLM({ heavy, light }) or set environment variables.');
  }
  
  return {
    heavy: heavyProvider ? { provider: heavyProvider, config: heavyConfig } : null,
    light: lightProvider ? { provider: lightProvider, config: lightConfig } : null
  };
}

/**
 * Get provider status (dual vs single mode)
 */
export function getLLMStatus() {
  return {
    heavyConfigured: heavyProvider !== null,
    lightConfigured: lightProvider !== null,
    dualMode: heavyProvider !== null && lightProvider !== null,
    providerStatus: getProviderStatus()
  };
}

/**
 * Get current provider (legacy compatibility)
 */
export function getProvider() {
  return currentProvider || lightProvider;
}

/**
 * Get current config (legacy compatibility)
 */
export function getConfig() {
  return currentConfig || lightConfig;
}

/**
 * Check if any LLM is configured
 */
export function isConfigured() {
  return lightProvider !== null || heavyProvider !== null;
}

/**
 * Select model based on task complexity and route to appropriate provider
 * @param {Object} params - Selection parameters
 * @param {string} params.userIntent - User's prompt
 * @param {string[]} params.agentIds - Selected agent IDs
 * @param {number} params.complexityEstimate - Complexity from scoring
 * @param {string} params.projectPhase - Project phase
 * @returns {Object} Selection result with provider info
 */
export function selectAndRoute(params) {
  // Use model router to select tier
  const selection = selectModel(params);
  
  // Resolve to actual provider config
  const providerConfig = resolveProvider(selection);
  
  if (!providerConfig) {
    return {
      ...selection,
      provider: null,
      config: null,
      error: 'No LLM providers configured'
    };
  }
  
  // Get the provider instance
  const provider = PROVIDERS[providerConfig.provider];
  
  return {
    ...selection,
    provider,
    config: providerConfig,
    providerName: providerConfig.provider,
    modelName: providerConfig.defaultModel
  };
}

/**
 * Send chat request to the appropriate provider based on task
 * @param {Object} request - Chat request
 * @param {Object} request.routing - Optional routing params (if not provided, uses light/default)
 * @returns {Promise<LLMResponse>}
 */
export async function chat(request) {
  const { routing, ...chatParams } = request;
  
  // If routing info provided, use it to select provider
  if (routing) {
    const selection = selectAndRoute(routing);
    
    if (!selection.provider) {
      return {
        content: '',
        success: false,
        error: selection.error || 'No LLM configured'
      };
    }
    
    const mergedRequest = {
      ...chatParams,
      options: {
        ...selection.config,
        ...chatParams.options
      }
    };
    
    console.error('[LLM] Using provider:', selection.providerName, 'model:', selection.modelName, 'tier:', selection.tier);
    
    return selection.provider.chat(mergedRequest);
  }
  
  // Legacy: use light provider or current provider
  const activeProvider = lightProvider || currentProvider;
  const activeConfig = lightConfig || currentConfig;
  
  if (!activeProvider) {
    return {
      content: '',
      success: false,
      error: 'LLM not configured. Call initLLM() first.'
    };
  }
  
  const mergedRequest = {
    ...chatParams,
    options: {
      ...activeConfig,
      ...chatParams.options
    }
  };
  
  return activeProvider.chat(mergedRequest);
}

/**
 * Send chat request with system prompt
 * @param {string} systemPrompt - System instruction
 * @param {string} userPrompt - User message
 * @param {Object} options - Additional options including routing
 * @returns {Promise<LLMResponse>}
 */
export async function chatWithSystem(systemPrompt, userPrompt, options = {}) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  const { routing, ...chatOptions } = options;
  
  return chat({ 
    prompt: userPrompt, 
    messages, 
    routing,
    ...chatOptions 
  });
}

/**
 * Health check for current providers
 * @returns {Promise<Object>}
 */
export async function healthCheck() {
  const results = {};
  
  if (lightProvider) {
    try {
      results.light = await lightProvider.healthCheck();
    } catch {
      results.light = false;
    }
  }
  
  if (heavyProvider) {
    try {
      results.heavy = await heavyProvider.healthCheck();
    } catch {
      results.heavy = false;
    }
  }
  
  return {
    light: results.light,
    heavy: results.heavy,
    anyAvailable: results.light || results.heavy
  };
}

/**
 * Get available providers
 */
export function getAvailableProviders() {
  return Object.keys(PROVIDERS);
}

/**
 * Load configuration from environment or file
 * Supports dual-provider configuration
 */
export function loadConfig() {
  // Check for dual-provider configuration
  const heavyProvider = process.env.LLM_PROVIDER_HEAVY;
  const heavyApiKey = process.env.LLM_API_KEY_HEAVY;
  const heavyModel = process.env.LLM_MODEL_HEAVY;
  const heavyBaseUrl = process.env.LLM_BASE_URL_HEAVY;
  
  const lightProvider = process.env.LLM_PROVIDER_LIGHT || process.env.LLM_PROVIDER;
  const lightApiKey = process.env.LLM_API_KEY_LIGHT || process.env.LLM_API_KEY;
  const lightModel = process.env.LLM_MODEL_LIGHT || process.env.LLM_MODEL;
  const lightBaseUrl = process.env.LLM_BASE_URL_LIGHT || process.env.LLM_BASE_URL;
  
  const heavyConfig = heavyApiKey ? {
    provider: heavyProvider || 'anthropic',
    apiKey: heavyApiKey,
    baseUrl: heavyBaseUrl || '',
    defaultModel: heavyModel || 'claude-sonnet-4-20250514',
    temperature: parseFloat(process.env.LLM_TEMPERATURE_HEAVY || process.env.LLM_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS_HEAVY || process.env.LLM_MAX_TOKENS) || 2048
  } : null;
  
  const lightConfig = lightApiKey ? {
    provider: lightProvider || 'minimax',
    apiKey: lightApiKey,
    baseUrl: lightBaseUrl || '',
    defaultModel: lightModel || 'MiniMax-Text-01',
    temperature: parseFloat(process.env.LLM_TEMPERATURE_LIGHT || process.env.LLM_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS_LIGHT || process.env.LLM_MAX_TOKENS) || 2048
  } : null;
  
  if (!heavyConfig && !lightConfig) {
    console.error('[LLM] No API keys found in environment variables');
    console.error('[LLM] Set LLM_API_KEY_LIGHT (or LLM_API_KEY) and optionally LLM_API_KEY_HEAVY');
    return null;
  }
  
  try {
    const result = initLLM({ heavy: heavyConfig, light: lightConfig });
    return {
      heavy: heavyConfig,
      light: lightConfig,
      dualMode: heavyConfig && lightConfig
    };
  } catch (e) {
    console.error('[LLM] Failed to initialize:', e.message);
    return null;
  }
}

export default {
  initLLM,
  getProvider,
  getConfig,
  getLLMStatus,
  isConfigured,
  selectAndRoute,
  chat,
  chatWithSystem,
  healthCheck,
  getAvailableProviders,
  loadConfig,
  // Re-export model router functions
  selectModel,
  getProviderStatus,
  resolveProvider
};
