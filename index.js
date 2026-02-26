#!/usr/bin/env node
// ai-core CLI Entry Point
import { runCLI } from './src/mcp-server/index.js';
import { startServer } from './src/mcp-server/mcp-server.js';
import { startInteractive, quickAnalyze } from './src/cli/index.js';

// Parse arguments
const args = process.argv.slice(2);
const isMcpMode = args.includes('--mcp');
const isInteractive = args.includes('--interactive') || args.includes('-i');

// Find project path and prompt
let projectPath = null;
let userPrompt = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project' && args[i + 1]) {
    projectPath = args[i + 1];
  }
  if (args[i] === '--prompt' && args[i + 1]) {
    userPrompt = args[i + 1];
  }
}

// Route to appropriate mode
if (isMcpMode) {
  // MCP Server mode
  startServer();
} else if (isInteractive) {
  // Interactive CLI mode
  if (!projectPath) {
    console.error('Error: --project required for interactive mode');
    console.error('Usage: node index.js --interactive --project ./tu-proyecto');
    process.exit(1);
  }
  startInteractive(projectPath);
} else if (projectPath && userPrompt) {
  // Quick analyze mode (single prompt)
  quickAnalyze(projectPath, userPrompt).then(() => {
    process.exit(0);
  });
} else {
  // Default CLI mode
  runCLI().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
