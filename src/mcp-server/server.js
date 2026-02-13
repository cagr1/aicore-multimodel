// MCP Server - Protocol implementation for Kilo integration
import { analyze } from './index.js';

/**
 * MCP Server Tool Definitions
 */
export const tools = [
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
  }
];

/**
 * Handle MCP tool calls
 */
export async function handleToolCall(toolName, args) {
  if (toolName === 'run_agents') {
    return await analyze(args);
  }
  
  throw new Error(`Unknown tool: ${toolName}`);
}

/**
 * Get tool definitions for MCP
 */
export function getToolDefinitions() {
  return tools;
}

export default { tools, handleToolCall, getToolDefinitions };
