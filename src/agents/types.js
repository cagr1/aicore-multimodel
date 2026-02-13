// Agent Types

/**
 * Agent interface - declarative definition
 * @typedef {Object} Agent
 * @property {string} id
 * @property {string} description
 * @property {string[]} supportedLanguages
 * @property {string[]} requiredCapabilities
 * @property {function(AgentContext): Promise<AgentResult>} run
 */

/**
 * Context passed to agent
 * @typedef {Object} AgentContext
 * @property {string} projectPath
 * @property {Object} metadata - Scanner output
 * @property {string} userIntent
 */

/**
 * Agent execution result
 * @typedef {Object} AgentResult
 * @property {boolean} success
 * @property {Problem[]} diagnostics
 * @property {Change[]} changes
 * @property {string} summary
 */

/**
 * Problem detected by agent
 * @typedef {Object} Problem
 * @property {string} severity - 'error', 'warning', 'info'
 * @property {string} message
 * @property {string} file
 * @property {number} line
 */

/**
 * Change proposed by agent
 * @typedef {Object} Change
 * @property {string} type - 'create', 'update', 'delete'
 * @property {string} file
 * @property {string} description
 * @property {string} diff
 */

export default {};
