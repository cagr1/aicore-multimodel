// LLM Module - Unified LLM Provider Abstraction
import { minimaxProvider } from './providers/minimax.js';
import { openaiProvider } from './providers/openai.js';
import { anthropicProvider } from './providers/anthropic.js';
import { kiloProvider } from './providers/kilo.js';

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
 * Initialize LLM with configuration
 * @param {LLMConfig} config - Provider configuration
 */
export function initLLM(config) {
  const provider = PROVIDERS[config.provider];
  
  if (!provider) {
    throw new Error('Unknown provider: ' + config.provider + '. Available: ' + Object.keys(PROVIDERS).join(', '));
  }
  
  currentConfig = config;
  currentProvider = provider;
  
  console.error('[LLM] Initialized with provider:', config.provider, 'model:', config.defaultModel);
  
  return provider;
}

/**
 * Get current provider
 */
export function getProvider() {
  return currentProvider;
}

/**
 * Get current config
 */
export function getConfig() {
  return currentConfig;
}

/**
 * Check if LLM is configured
 */
export function isConfigured() {
  return currentProvider !== null;
}

/**
 * Send chat request
 * @param {LLMRequest} request - Chat request
 * @returns {Promise<LLMResponse>}
 */
export async function chat(request) {
  if (!currentProvider) {
    return {
      content: '',
      success: false,
      error: 'LLM not configured. Call initLLM() first.'
    };
  }
  
  // Merge request options with config
  const mergedRequest = {
    ...request,
    options: {
      ...currentConfig,
      ...request.options
    }
  };
  
  return currentProvider.chat(mergedRequest);
}

/**
 * Send chat request with system prompt
 * @param {string} systemPrompt - System instruction
 * @param {string} userPrompt - User message
 * @param {Object} options - Additional options
 * @returns {Promise<LLMResponse>}
 */
export async function chatWithSystem(systemPrompt, userPrompt, options = {}) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  return chat({ prompt: userPrompt, messages, ...options });
}

/**
 * Health check for current provider
 * @returns {Promise<boolean>}
 */
export async function healthCheck() {
  if (!currentProvider) {
    return false;
  }
  
  try {
    return await currentProvider.healthCheck();
  } catch {
    return false;
  }
}

/**
 * Get available providers
 */
export function getAvailableProviders() {
  return Object.keys(PROVIDERS);
}

/**
 * Load configuration from environment or file
 */
export function loadConfig() {
  // Check for environment variables first
  const provider = process.env.LLM_PROVIDER || 'minimax';
  const apiKey = process.env.LLM_API_KEY || '';
  const baseUrl = process.env.LLM_BASE_URL || '';
  const model = process.env.LLM_MODEL || '';
  
  if (!apiKey) {
    console.error('[LLM] No API key found in environment variables');
    return null;
  }
  
  const config = {
    provider,
    apiKey,
    baseUrl,
    defaultModel: model,
    temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS) || 2048
  };
  
  try {
    initLLM(config);
    return config;
  } catch (e) {
    console.error('[LLM] Failed to initialize:', e.message);
    return null;
  }
}

export default {
  initLLM,
  getProvider,
  getConfig,
  isConfigured,
  chat,
  chatWithSystem,
  healthCheck,
  getAvailableProviders,
  loadConfig
};
