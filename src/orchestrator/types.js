// Orchestrator Types

/**
 * Orchestrator input
 * @typedef {Object} OrchestratorInput
 * @property {string} projectPath
 * @property {Object} metadata - Scanner output
 * @property {AgentExecutionPlan[]} plan
 * @property {string} userIntent
 */

/**
 * Orchestrator output
 * @typedef {Object} OrchestratorOutput
 * @property {AgentResult[]} results
 * @property {string} summary
 */

export default {};
