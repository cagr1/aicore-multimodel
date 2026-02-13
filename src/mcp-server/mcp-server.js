// MCP Server - Simple stdio-based MCP protocol
import { analyze, getMemoryStatus, getMemoryConfig } from './index.js';

/**
 * MCP Protocol Message Types
 */
const MSG_TYPE = {
  initialize: 'initialize',
  tools: 'tools',
  tool_call: 'tool_call',
  response: 'response',
  error: 'error'
};

/**
 * Tool definitions for MCP
 */
const tools = [
  {
    name: 'run_agents',
    description: 'Ejecuta agentes de análisis en un proyecto. Detecta automáticamente el lenguaje y selecciona los agentes apropiados según la intención del usuario.',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Ruta al proyecto a analizar (absoluta o relativa)'
        },
        userIntent: {
          type: 'string',
          description: 'Intención del usuario en lenguaje natural (e.g., "optimizar SEO", "revisar código", "buscar bugs")'
        }
      },
      required: ['projectPath', 'userIntent']
    }
  },
  {
    name: 'get_memory_status',
    description: 'Obtiene el estado de memoria de un proyecto',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Ruta al proyecto'
        }
      },
      required: ['projectPath']
    }
  },
  {
    name: 'get_memory_config',
    description: 'Obtiene la configuración de memoria',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

/**
 * Handle incoming MCP messages
 */
async function handleMessage(message) {
  try {
    const msg = JSON.parse(message);
    
    switch (msg.type) {
      case MSG_TYPE.initialize:
        return JSON.stringify({
          type: MSG_TYPE.response,
          data: {
            protocolVersion: '1.0',
            name: 'ai-core',
            version: '1.0.0'
          }
        });
        
      case MSG_TYPE.tools:
        return JSON.stringify({
          type: MSG_TYPE.response,
          data: tools
        });
        
      case MSG_TYPE.tool_call:
        const { tool, args } = msg.data;
        
        let result;
        switch (tool) {
          case 'run_agents':
            result = await analyze(args);
            break;
          case 'get_memory_status':
            result = await getMemoryStatus(args);
            break;
          case 'get_memory_config':
            result = getMemoryConfig();
            break;
          default:
            throw new Error(`Unknown tool: ${tool}`);
        }
        
        return JSON.stringify({
          type: MSG_TYPE.response,
          data: result
        });
        
      default:
        throw new Error(`Unknown message type: ${msg.type}`);
    }
  } catch (error) {
    return JSON.stringify({
      type: MSG_TYPE.error,
      error: error.message
    });
  }
}

/**
 * Start MCP server - reads from stdin, writes to stdout
 */
export function startServer() {
  console.error('[MCP] ai-core server starting...');
  
  process.stdin.setEncoding('utf-8');
  
  let buffer = '';
  
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    
    // Try to parse complete JSON messages
    // MCP uses newline-delimited JSON
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        handleMessage(line).then(response => {
          console.log(response);
        });
      }
    }
  });
  
  process.stdin.on('end', () => {
    console.error('[MCP] Server stdin ended');
  });
  
  // Send ready message
  console.error('[MCP] Server ready');
}

// Run if executed directly
if (process.argv.includes('--mcp')) {
  startServer();
}

export default { startServer, tools };
