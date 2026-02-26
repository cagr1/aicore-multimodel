// Optimized LLM Prompts - Token efficiency focused
// Phase 7: Token Optimization

/**
 * Role IDs - compact role encoding
 */
const ROLES = {
  GENERATOR: 'GEN',    // Code generator
  ANALYZER: 'ANA',    // Code analyzer  
  FIXER: 'FIX'        // Bug fixer
};

/**
 * Language shorthand mapping
 */
const LANG_CODES = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  php: 'php',
  go: 'go',
  rust: 'rs',
  csharp: 'cs'
};

/**
 * Framework shorthand mapping
 */
const FRAMEWORK_CODES = {
  react: 'rct',
  nextjs: 'nx',
  vue: 'vue',
  nuxt: 'nux',
  svelte: 'sve',
  angular: 'ang',
  express: 'exp',
  fastify: 'fst',
  django: 'djg',
  flask: 'flk',
  spring: 'spr',
  rails: 'rls',
  laravel: 'lrv'
};

/**
 * Project type shorthand
 */
const TYPE_CODES = {
  landing: 'LND',
  saas: 'SAS',
  api: 'API',
  blog: 'BLG',
  ecommerce: 'ECM',
  library: 'LIB',
  cli: 'CLI',
  unknown: 'UNK'
};

/**
 * Encode metadata to compact form
 * @param {Object} metadata 
 * @returns {string}
 */
function encodeMetadata(metadata) {
  const lang = LANG_CODES[metadata.language] || metadata.language?.slice(0, 2) || '??';
  const fw = FRAMEWORK_CODES[metadata.framework] || metadata.framework?.slice(0, 3) || '---';
  const type = TYPE_CODES[metadata.projectType] || TYPE_CODES.unknown;
  
  return `${lang}/${fw}/${type}`;
}

/**
 * Generate optimized system prompt
 * @param {Object} metadata 
 * @param {string} [agentRules] - Optional agent rules/context from agents-bridge
 * @returns {string}
 */
export function getSystemPrompt(metadata, agentRules) {
  const tech = encodeMetadata(metadata);
  if (agentRules && agentRules.trim().length > 0) {
    return `You are ${ROLES.GENERATOR}. Tech=${tech}. Rules: ${agentRules}. Output JSON only.`;
  }
  return `You are ${ROLES.GENERATOR}. Tech=${tech}. Output JSON only.`;
}

/**
 * Generate optimized user prompt
 * @param {string} userIntent 
 * @param {Object} metadata 
 * @returns {string}
 */
export function getUserPrompt(userIntent, metadata) {
  return `Task: ${userIntent}`;
}

/**
 * Token budget configuration
 * Extended to support agent rules context injection
 */
export const TOKEN_BUDGET = {
  MAX_PROMPT_TOKENS: 2000,
  MAX_RESPONSE_TOKENS: 500,
  MAX_SYSTEM_PROMPT: 1500,
  MAX_SYSTEM_PROMPT_BASE: 30,
  MAX_AGENT_RULES: 1200,
  MAX_USER_PROMPT: 50
};

/**
 * Validate prompt is within budget
 * @param {string} systemPrompt 
 * @param {string} userPrompt 
 * @returns {Object}
 */
export function validateBudget(systemPrompt, userPrompt) {
  const systemTokens = systemPrompt.split(/\s+/).length;
  const userTokens = userPrompt.split(/\s+/).length;
  
  return {
    valid: systemTokens <= TOKEN_BUDGET.MAX_SYSTEM_PROMPT && 
           userTokens <= TOKEN_BUDGET.MAX_USER_PROMPT,
    systemTokens,
    userTokens,
    total: systemTokens + userTokens,
    limits: TOKEN_BUDGET
  };
}

/**
 * Output format template (never changes - embedded in system)
 */
export const OUTPUT_FORMAT = {
  template: '[{"f":"path","t":"c|u|d","c":"content"}]',
  description: 'JSON array: f=file, t=type(c/u/d=create/update/delete), c=content'
};

export default {
  ROLES,
  getSystemPrompt,
  getUserPrompt,
  TOKEN_BUDGET,
  validateBudget,
  OUTPUT_FORMAT,
  encodeMetadata
};
