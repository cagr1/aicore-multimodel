// CLI Interactivo - User-friendly command line interface for ai-core
// Provides an interactive experience that shows the value of ai-core in every interaction

import readline from 'readline';
import { scan } from '../scanner/index.js';
import { route } from '../router/index.js';
import { orchestrate } from '../orchestrator/index.js';
import { generateProposals } from '../proposals/index.js';
import { loadConfig, isConfigured, getLLMStatus } from '../llm/index.js';
import { memory } from '../memory/index.js';

/**
 * Session state
 */
let currentProject = null;
let currentMetadata = null;
let sessionStats = {
  prompts: 0,
  tokensUsed: 0,
  startTime: Date.now()
};

/**
 * Create readline interface
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask a question and get answer
 */
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

/**
 * Print a header
 */
function printHeader(text) {
  const line = '='.repeat(50);
  console.log('\n' + line);
  console.log(text);
  console.log(line);
}

/**
 * Print project info
 */
function printProjectInfo(metadata, agentsContext) {
  console.log('\n📁 Proyecto:', currentProject);
  console.log('   Fase:', agentsContext?.projectState?.current_phase || 'desconocida');
  console.log('   Stack:', (metadata.framework || metadata.language || 'unknown'));
  console.log('   Tipo:', metadata.projectType || 'unknown');
  
  if (agentsContext?.projectState?.top_priority) {
    console.log('   Prioridad:', agentsContext.projectState.top_priority);
  }
}

/**
 * Print session stats
 */
function printSessionStats() {
  const elapsed = Math.round((Date.now() - sessionStats.startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  
  console.log('\n📊 Sesión:');
  console.log('   Prompts:', sessionStats.prompts);
  console.log('   Tiempo:', `${minutes}m ${seconds}s`);
}

/**
 * Analyze a prompt
 */
async function analyzePrompt(userIntent) {
  console.log('\n🤔 Analizando:', userIntent);
  
  try {
    // Scan project
    console.log('   📡 Escaneando proyecto...');
    const metadata = scan(currentProject);
    currentMetadata = metadata;
    
    // Route
    console.log('   🎯 Enrutando agentes...');
    const routeResult = await route({
      metadata,
      userIntent,
      projectPath: currentProject
    });
    
    const agents = routeResult.agents.map(a => a.agentId).join(', ');
    console.log('   Agentes:', agents);
    console.log('   Razón:', routeResult.reason);
    
    // Print knowledge base context
    if (routeResult.agentsContext?.matched) {
      console.log('   📚 Knowledge base:', routeResult.agentsContext.projectName);
      console.log('   📄 Rules:', routeResult.agentsContext.mdFiles?.join(', ') || 'ninguna');
    }
    
    // Generate proposals
    console.log('   💡 Generando proposals...');
    const proposalResult = await generateProposals(currentProject, userIntent, metadata);
    const proposals = proposalResult.proposals || [];
    
    console.log('\n📋 Proposals generadas:', proposals.length);
    proposals.forEach((p, i) => {
      console.log(`   ${i + 1}. [${p.agent}] ${p.description}`);
    });
    
    sessionStats.prompts++;
    
    return {
      success: true,
      metadata,
      routeResult,
      proposals
    };
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ai-core - Asistente de desarrollo con memoria              ║
╠══════════════════════════════════════════════════════════════╣
║  Comandos:                                                  ║
║  /help     - Mostrar esta ayuda                             ║
║  /project   - Cambiar proyecto                               ║
║  /status   - Estado de la sesión                           ║
║  /config   - Configuración de LLM                           ║
║  /clear    - Limpiar pantalla                               ║
║  /exit     - Salir                                           ║
║                                                              ║
║  Ejemplos de prompts:                                       ║
║  - "agregar meta tags para SEO"                             ║
║  - "crear componente de login con Vue"                      ║
║  - "implementar autenticación JWT"                           ║
║  - "diseñar schema de base de datos para SaaS"             ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

/**
 * Show config
 */
function showConfig() {
  const status = getLLMStatus();
  
  console.log('\n⚙️  Configuración LLM:');
  console.log('   Light provider:', status.lightConfigured ? 'configurado' : 'no configurado');
  console.log('   Heavy provider:', status.heavyConfigured ? 'configurado' : 'no configurado');
  console.log('   Modo dual:', status.dualMode ? 'sí' : 'no');
  
  if (!isConfigured()) {
    console.log('\n   ⚠️  No hay providers configurados.');
    console.log('   Configura en .env:');
    console.log('   LLM_API_KEY_LIGHT=tu-key');
    console.log('   LLM_API_KEY_HEAVY=tu-key (opcional)');
  }
}

/**
 * Interactive loop
 */
export async function startInteractive(projectPath) {
  // Initialize
  console.log('\n🎯 ai-core - Asistente de desarrollo interactivo\n');
  
  // Load config
  const config = loadConfig();
  if (config) {
    console.log('✅ LLM configurado');
  } else {
    console.log('⚠️  LLM no configurado (modo determinístico)');
  }
  
  // Set project
  currentProject = projectPath;
  
  try {
    const metadata = scan(projectPath);
    currentMetadata = metadata;
    console.log('✅ Proyecto escaneado:', projectPath);
    console.log('   Framework:', metadata.framework || 'unknown');
    console.log('   Lenguaje:', metadata.language);
    console.log('   Tipo:', metadata.projectType);
  } catch (error) {
    console.error('❌ Error escaneando proyecto:', error.message);
    return;
  }
  
  // Show initial info
  showHelp();
  printSessionStats();
  
  // Main loop
  while (true) {
    try {
      const input = await ask('\n> ');
      const trimmed = input.trim();
      
      if (!trimmed) continue;
      
      // Commands
      if (trimmed === '/exit' || trimmed === '/quit') {
        console.log('\n👋 Hasta luego!');
        rl.close();
        break;
      }
      
      if (trimmed === '/help') {
        showHelp();
        continue;
      }
      
      if (trimmed === '/status') {
        printSessionStats();
        continue;
      }
      
      if (trimmed === '/config') {
        showConfig();
        continue;
      }
      
      if (trimmed === '/clear') {
        console.clear();
        continue;
      }
      
      if (trimmed.startsWith('/project ')) {
        const newProject = trimmed.substring(9).trim();
        try {
          const metadata = scan(newProject);
          currentProject = newProject;
          currentMetadata = metadata;
          console.log('✅ Proyecto cambiado:', newProject);
        } catch (error) {
          console.error('❌ Error:', error.message);
        }
        continue;
      }
      
      // Regular prompt - analyze
      await analyzePrompt(trimmed);
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

/**
 * Simple banner for non-interactive mode
 */
export function printBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ai-core v2.0                                             ║
║  Asistente de desarrollo con memoria y contexto automático  ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

/**
 * Quick analyze - single prompt mode
 */
export async function quickAnalyze(projectPath, userIntent) {
  printBanner();
  
  console.log('\n📁 Proyecto:', projectPath);
  console.log('📝 Prompt:', userIntent);
  
  // Load config
  loadConfig();
  
  try {
    // Scan
    console.log('\n📡 Escaneando...');
    const metadata = scan(projectPath);
    console.log('   ✅', metadata.framework || metadata.language, '-', metadata.projectType);
    
    // Route
    console.log('\n🎯 Enrutando...');
    const routeResult = await route({ metadata, userIntent, projectPath });
    console.log('   Agentes:', routeResult.agents.map(a => a.agentId).join(', '));
    console.log('   Razón:', routeResult.reason);
    
    // Context
    if (routeResult.agentsContext?.matched) {
      console.log('\n📚 Contexto cargado:');
      console.log('   Proyecto:', routeResult.agentsContext.projectName);
      console.log('   Fase:', routeResult.agentsContext.projectState?.current_phase);
      console.log('   Rules:', routeResult.agentsContext.mdFiles?.join(', ') || 'ninguna');
    }
    
    // Proposals
    console.log('\n💡 Generando proposals...');
    const proposalResult = await generateProposals(projectPath, userIntent, metadata);
    const proposals = proposalResult.proposals || [];
    
    console.log('\n📋 Proposals:', proposals.length);
    proposals.forEach((p, i) => {
      console.log(`   ${i + 1}. [${p.agent}] ${p.description}`);
    });
    
    if (proposals.length === 0) {
      console.log('   (ninguna)');
    }
    
    console.log('\n✅ Listo!\n');
    
    return { success: true, metadata, routeResult, proposals };
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

export default { startInteractive, quickAnalyze, printBanner };
