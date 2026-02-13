// Orchestrator - Coordinates agent execution
import { getAgent } from '../agents/index.js';

/**
 * Execute agents according to the plan
 * @param {OrchestratorInput} input 
 * @returns {OrchestratorOutput}
 */
export async function orchestrate(input) {
  const { projectPath, metadata, plan, userIntent } = input;
  
  const results = [];
  
  // Execute each agent in order
  for (const agentPlan of plan) {
    const { agentId, config } = agentPlan;
    
    // Get agent
    const agent = getAgent(agentId);
    if (!agent) {
      results.push({
        success: false,
        diagnostics: [{
          severity: 'error',
          message: `Agent not found: ${agentId}`,
          file: '',
          line: 0
        }],
        changes: [],
        summary: `Skipped: agent ${agentId} not found`
      });
      continue;
    }
    
    // Check language support
    if (!agent.supportedLanguages.includes(metadata.language)) {
      results.push({
        success: false,
        diagnostics: [{
          severity: 'info',
          message: `Agent ${agentId} does not support language: ${metadata.language}`,
          file: '',
          line: 0
        }],
        changes: [],
        summary: `Skipped: ${agentId} does not support ${metadata.language}`
      });
      continue;
    }
    
    // Build context for agent
    const context = {
      projectPath,
      metadata: {
        ...metadata,
        ...config
      },
      userIntent
    };
    
    // Execute agent
    try {
      console.error(`[Orchestrator] Running agent: ${agentId}`);
      const result = await agent.run(context);
      results.push(result);
    } catch (e) {
      results.push({
        success: false,
        diagnostics: [{
          severity: 'error',
          message: `Agent execution failed: ${e.message}`,
          file: '',
          line: 0
        }],
        changes: [],
        summary: `Error: ${e.message}`
      });
    }
  }
  
  // Generate summary
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  const summary = `Orchestration complete. ${successful}/${total} agents succeeded.`;
  
  return {
    results,
    summary
  };
}

export default { orchestrate };
