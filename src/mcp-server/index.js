// MCP Server - Main entry point for MCP protocol
import { scan } from '../scanner/index.js';
import { route } from '../router/index.js';
import { orchestrate } from '../orchestrator/index.js';
import { memory } from '../memory/index.js';

/**
 * Main analyze function - MCP interface
 * @param {Object} params 
 * @param {string} params.projectPath
 * @param {string} params.userIntent
 * @returns {Object} MCPOutput
 */
export async function analyze({ projectPath, userIntent }) {
  try {
    // Step 1: Scan project
    console.error('[MCP] Scanning project:', projectPath);
    const metadata = scan(projectPath);
    console.error('[MCP] Metadata:', JSON.stringify(metadata));
    
    // Step 2: Route to agents
    console.error('[MCP] Routing agents for intent:', userIntent);
    const { agents: plan, reason } = route({ metadata, userIntent });
    console.error('[MCP] Selected agents:', plan.map(a => a.agentId).join(', '));
    console.error('[MCP] Reason:', reason);
    
    // Step 3: Orchestrate execution
    console.error('[MCP] Executing agents...');
    const { results, summary } = await orchestrate({
      projectPath,
      metadata,
      plan,
      userIntent
    });
    
    // Step 4: Collect diagnostics and changes
    const allDiagnostics = results.flatMap(r => r.diagnostics || []);
    const allChanges = results.flatMap(r => r.changes || []);
    
    // Step 5: Save to memory (minimal - just append)
    const agentIds = plan.map(p => p.agentId);
    const success = results.some(r => r.success);
    const runSummary = results.map(r => r.summary).join('; ');
    
    memory.saveRun(
      projectPath,
      agentIds,
      userIntent,
      success,
      runSummary
    );
    
    const memoryReference = memory.getReference(projectPath);
    
    // Return structured response - ONLY required fields
    return {
      summary: summary + ' ' + runSummary,
      diagnostics: allDiagnostics,
      changes: allChanges,
      memoryReference
    };
    
  } catch (error) {
    console.error('[MCP] Error:', error.message);
    return {
      summary: `Error: ${error.message}`,
      diagnostics: [{
        severity: 'error',
        message: error.message,
        file: '',
        line: 0
      }],
      changes: [],
      memoryReference: ''
    };
  }
}

/**
 * Get memory status for a project - SEPARATE from analyze()
 */
export async function getMemoryStatus({ projectPath }) {
  try {
    return memory.getStatus(projectPath);
  } catch (error) {
    return {
      error: error.message
    };
  }
}

/**
 * Get memory configuration - SEPARATE from analyze()
 */
export function getMemoryConfig() {
  return memory.getConfig();
}

// CLI interface
export async function runCLI() {
  const args = process.argv.slice(2);
  let projectPath = '.';
  let userIntent = '';
  let command = 'analyze';
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      projectPath = args[i + 1];
      i++;
    } else if (args[i] === '--prompt' && args[i + 1]) {
      userIntent = args[i + 1];
      i++;
    } else if (args[i] === '--status') {
      command = 'status';
    } else if (args[i] === '--config') {
      command = 'config';
    }
  }
  
  if (command === 'analyze' && !userIntent) {
    console.log('Usage: node index.js --project <path> --prompt "<intent>"');
    console.log('       node index.js --project <path> --status');
    console.log('       node index.js --config');
    process.exit(1);
  }
  
  console.error('=== ai-core ===');
  
  if (command === 'analyze') {
    console.error('Project:', projectPath);
    console.error('Intent:', userIntent);
    console.error('');
    
    const result = await analyze({ projectPath, userIntent });
    console.log(JSON.stringify(result, null, 2));
  } else if (command === 'status') {
    console.error('Project:', projectPath);
    console.error('');
    
    const status = await getMemoryStatus({ projectPath });
    console.log(JSON.stringify(status, null, 2));
  } else if (command === 'config') {
    const config = getMemoryConfig();
    console.log(JSON.stringify(config, null, 2));
  }
}

export default { analyze, getMemoryStatus, getMemoryConfig, runCLI };

export { startServer } from './mcp-server.js';
