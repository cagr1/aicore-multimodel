// Orchestrator - Coordinates agent execution
import { getAgent } from '../agents/index.js';
import { computeScore } from '../router/scoring.js';
import { updateProjectTask } from '../agents-bridge.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get config path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '../../config/default.json');

// Load config
let config = {
  routing: {
    autoApplyThreshold: 0.7,
    llmFallbackThreshold: 0.4
  },
  telemetry: {
    enabled: true
  }
};

// Try to load config file
try {
  if (fs.existsSync(configPath)) {
    const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    config = { ...config, ...fileConfig };
  }
} catch (e) {
  console.error('[Orchestrator] Warning: Could not load config, using defaults');
}

/**
 * Emit telemetry event
 * @param {string} eventName 
 * @param {Object} data 
 */
function emitTelemetry(eventName, data) {
  if (!config.telemetry.enabled) return;
  
  const event = {
    timestamp: new Date().toISOString(),
    event: eventName,
    ...data
  };
  
  console.error('[TELEMETRY]', JSON.stringify(event));
}

/**
 * Determine route based on score
 * @param {number} score - Confidence score from scoring module
 * @returns {Object} Route decision with label
 */
function determineRoute(score) {
  const { autoApplyThreshold, llmFallbackThreshold } = config.routing;
  
  if (score >= autoApplyThreshold) {
    return {
      route: 'candidate_auto_apply',
      label: 'High confidence - auto-apply candidate'
    };
  }
  
  if (score >= llmFallbackThreshold) {
    return {
      route: 'fallback_llm',
      label: 'Medium confidence - LLM fallback recommended'
    };
  }
  
  return {
    route: 'clarify_needed',
    label: 'Low confidence - user clarification needed'
  };
}

/**
 * Apply fallback rules and emit telemetry
 * @param {Object} options 
 * @returns {Object} Route decision with telemetry
 */
export function applyFallbackRules(options) {
  const {
    promptId = 'unknown',
    keywordsScore = 0,
    profileMatchScore = 0,
    historicalSuccessScore = 0.5,
    complexityEstimate = 0,
    userIntent = ''
  } = options;
  
  // Compute score using scoring module
  const scoreResult = computeScore({
    keywordsScore,
    profileMatchScore,
    historicalSuccessScore,
    complexityEstimate
  }, {
    promptId,
    enableLogging: false
  });
  
  // Determine route based on score
  const routeDecision = determineRoute(scoreResult.score);
  
  // Emit telemetry event
  emitTelemetry('route_decision', {
    prompt_id: promptId,
    score: scoreResult.score,
    route: routeDecision.route,
    user_intent: userIntent,
    level: scoreResult.level
  });
  
  return {
    score: scoreResult.score,
    level: scoreResult.level,
    route: routeDecision.route,
    label: routeDecision.label,
    breakdown: scoreResult.breakdown
  };
}

/**
 * Execute agents according to the plan
 * @param {OrchestratorInput} input 
 * @returns {OrchestratorOutput}
 */
export async function orchestrate(input) {
  const { projectPath, metadata, plan, userIntent, agentsContext } = input;
  
  const results = [];
  
  // Extract agent rules context from bridge (if available)
  const agentRules = agentsContext?.context || '';
  const matchedProjectId = agentsContext?.projectId || null;
  
  if (agentRules) {
    console.error(`[Orchestrator] Agents knowledge base active for project: ${agentsContext.projectName || matchedProjectId}`);
    console.error(`[Orchestrator] Loaded rules from: ${(agentsContext.mdFiles || []).join(', ')}`);
  }
  
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
    
    // Build context for agent — inject agents/ rules as additional context
    const context = {
      projectPath,
      metadata: {
        ...metadata,
        ...config
      },
      userIntent,
      agentRules  // Injected from agents-bridge knowledge base
    };
    
    // Execute agent
    try {
      console.error(`[Orchestrator] Running agent: ${agentId}`);
      const result = await agent.run(context);
      results.push(result);
      
      // After successful execution, update tasks.json in agents/ project
      if (result.success && matchedProjectId) {
        try {
          updateProjectTask(matchedProjectId, {
            title: `${agentId}: ${userIntent}`.slice(0, 100),
            description: result.summary || userIntent,
            agentUsed: agentId,
            status: 'done',
            notes: `Auto-executed by ai-core. Changes: ${(result.changes || []).length} files`
          });
        } catch (taskErr) {
          console.error(`[Orchestrator] Task update failed (non-fatal): ${taskErr.message}`);
        }
      }
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
  const bridgeInfo = matchedProjectId ? ` [agents-bridge: ${matchedProjectId}]` : '';
  const summary = `Orchestration complete. ${successful}/${total} agents succeeded.${bridgeInfo}`;
  
  return {
    results,
    summary,
    agentsContext: agentsContext || null
  };
}

export default { orchestrate, applyFallbackRules };
