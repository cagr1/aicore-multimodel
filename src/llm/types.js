// LLM Module Types

/**
 * LLM Provider interface
 * @typedef {Object} LLMProvider
 * @property {string} id - Provider identifier
 * @property {string} name - Display name
 * @property {function(LLMRequest): Promise<LLMResponse>} chat - Send chat request
 * @property {function(): Promise<boolean>} healthCheck - Check if provider is available
 */

/**
 * LLM Chat Request
 * @typedef {Object} LLMRequest
 * @property {string} prompt - User prompt
 * @property {Message[]} [messages] - Conversation history
 * @property {Object} [options] - Provider-specific options
 * @property {string} [options.model] - Model to use
 * @property {number} [options.temperature] - Temperature (0-2)
 * @property {number} [options.maxTokens] - Max tokens to generate
 */

/**
 * LLM Chat Response
 * @typedef {Object} LLMResponse
 * @property {string} content - Generated text
 * @property {string} [model] - Model used
 * @property {number} [usage] - Token usage
 * @property {boolean} success - Whether request succeeded
 * @property {string} [error] - Error message if failed
 */

/**
 * Chat message
 * @typedef {Object} Message
 * @property {string} role - 'system', 'user', 'assistant'
 * @property {string} content - Message content
 */

/**
 * LLM Configuration
 * @typedef {Object} LLMConfig
 * @property {string} provider - Provider ID ('minimax', 'openai', etc.)
 * @property {string} apiKey - API key for provider
 * @property {string} [baseUrl] - Custom base URL (optional)
 * @property {string} defaultModel - Default model to use
 * @property {number} [temperature] - Default temperature
 * @property {number} [maxTokens] - Default max tokens
 */

export default {};
