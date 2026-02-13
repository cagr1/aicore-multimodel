#!/usr/bin/env node
// ai-core CLI Entry Point
import { runCLI } from './src/mcp-server/index.js';
import { startServer } from './src/mcp-server/mcp-server.js';

// Check if MCP mode
if (process.argv.includes('--mcp')) {
  startServer();
} else {
  runCLI().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
