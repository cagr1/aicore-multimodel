// Router Types

/**
 * Router input from Scanner
 * @typedef {Object} RouterInput
 * @property {Object} metadata - Scanner output
 * @property {string} metadata.language
 * @property {string|null} metadata.framework
 * @property {string[]} metadata.capabilities
 * @property {string[]} metadata.signals
 * @property {string} metadata.projectType
 * @property {string} userIntent - User's intent/prompt
 */

/**
 * Router output with agents to execute
 * @typedef {Object} RouterOutput
 * @property {AgentExecutionPlan[]} agents
 * @property {string} reason
 */

/**
 * Agent execution plan
 * @typedef {Object} AgentExecutionPlan
 * @property {string} agentId
 * @property {number} priority
 * @property {Object} config
 */

export default {};
