// Portability Module - Init wizard, export/import configuration
// Makes ai-core usable by anyone with minimal setup

import fs from 'fs';
import path from 'path';
import readline from 'readline';

/**
 * Lazy readline interface (created on demand to avoid conflicts with cli/index.js)
 */
let rl = null;

function getRL() {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  return rl;
}

/**
 * Close readline when done
 */
function closeRL() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

/**
 * Ask a question and get answer
 */
function ask(question) {
  return new Promise((resolve) => {
    getRL().question(question, resolve);
  });
}

/**
 * Ask yes/no question
 */
async function askYesNo(question) {
  const answer = await ask(question + ' [Y/n] ');
  return answer.toLowerCase().trim() === 'y' || answer.trim() === '';
}

/**
 * Ask with options
 */
async function askOptions(question, options) {
  console.log(question);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt}`);
  });
  
  while (true) {
    const answer = await ask('> ');
    const idx = parseInt(answer.trim()) - 1;
    if (idx >= 0 && idx < options.length) {
      return options[idx];
    }
    console.log('Opción inválida. Intenta de nuevo.');
  }
}

/**
 * Initialize ai-core for a new user
 */
export async function initAIcore() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚀 ai-core Setup Wizard                                  ║
╚══════════════════════════════════════════════════════════════╝
  `);
  
  const config = {
    lightProvider: null,
    heavyProvider: null,
    projects: []
  };
  
  // Step 1: Ask about LLM provider
  console.log('\n📡 Configuración de LLM\n');
  
  const hasApiKey = await askYesNo('¿Tienes una API key de algún proveedor LLM?');
  
  if (hasApiKey) {
    const provider = await askOptions('¿Qué proveedor vas a usar?', [
      'MiniMax (económico)',
      'OpenAI (GPT)',
      'Anthropic (Claude)',
      'Otro'
    ]);
    
    let providerName = 'minimax';
    if (provider.includes('OpenAI')) providerName = 'openai';
    else if (provider.includes('Anthropic')) providerName = 'anthropic';
    
    const apiKey = await ask('Ingresa tu API key: ');
    
    config.lightProvider = {
      provider: providerName,
      apiKey: apiKey.trim(),
      model: provider.includes('MiniMax') ? 'MiniMax-Text-01' : 
             provider.includes('OpenAI') ? 'gpt-4' : 'claude-sonnet-4-20250514'
    };
    
    // Ask about second provider
    const wantsHeavy = await askYesNo('¿Quieres configurar un segundo modelo para tareas complejas?');
    
    if (wantsHeavy) {
      const heavyProvider = await askOptions('¿Qué proveedor para tareas complejas?', [
        'Anthropic (Claude Sonnet 4)',
        'OpenAI (GPT-4)',
        'Otro'
      ]);
      
      const heavyApiKey = await ask('Ingresa la API key: ');
      
      config.heavyProvider = {
        provider: heavyProvider.includes('Anthropic') ? 'anthropic' : 'openai',
        apiKey: heavyApiKey.trim(),
        model: heavyProvider.includes('Anthropic') ? 'claude-sonnet-4-20250514' : 'gpt-4'
      };
    }
  } else {
    console.log('\n⚠️  Sin API key, ai-core funcionará en modo determinístico.');
    console.log('   Podrás usar keyword matching pero no generación de código con LLM.');
  }
  
  // Step 2: Scan for projects
  console.log('\n📁 Escaneando proyectos en el workspace...\n');
  
  const currentDir = process.cwd();
  const subdirs = fs.readdirSync(currentDir).filter(f => {
    try {
      return fs.statSync(path.join(currentDir, f)).isDirectory() && 
             !f.startsWith('.') && 
             !f.startsWith('node_modules');
    } catch {
      return false;
    }
  });
  
  if (subdirs.length > 0) {
    console.log('Proyectos encontrados:');
    subdirs.forEach((dir, i) => {
      console.log(`  ${i + 1}. ${dir}`);
    });
    
    const registerAll = await askYesNo('¿Registrar todos los proyectos automáticamente?');
    
    if (registerAll) {
      config.projects = subdirs;
    } else {
      const selected = await ask('Ingresa los números separados por coma (ej: 1,3,5): ');
      const indices = selected.split(',').map(s => parseInt(s.trim()) - 1).filter(i => !isNaN(i));
      config.projects = indices.map(i => subdirs[i]).filter(p => p);
    }
  }
  
  // Step 3: Generate .env file
  console.log('\n💾 Generando archivo .env...\n');
  
  let envContent = '# ai-core Configuration\n# Generado por el wizard de setup\n\n';
  
  if (config.lightProvider) {
    envContent += `# Light Provider (tareas simples)\n`;
    envContent += `LLM_PROVIDER_LIGHT=${config.lightProvider.provider}\n`;
    envContent += `LLM_API_KEY_LIGHT=${config.lightProvider.apiKey}\n`;
    envContent += `LLM_MODEL_LIGHT=${config.lightProvider.model}\n`;
    envContent += `\n`;
  }
  
  if (config.heavyProvider) {
    envContent += `# Heavy Provider (tareas complejas)\n`;
    envContent += `LLM_PROVIDER_HEAVY=${config.heavyProvider.provider}\n`;
    envContent += `LLM_API_KEY_HEAVY=${config.heavyProvider.apiKey}\n`;
    envContent += `LLM_MODEL_HEAVY=${config.heavyProvider.model}\n`;
    envContent += `\n`;
  }
  
  // Write .env
  const envPath = path.join(currentDir, '.env');
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Archivo .env creado!');
  
  // Summary
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ✅ Setup completado!                                     ║
╚══════════════════════════════════════════════════════════════╝

Cómo usar ai-core:

  # Análisis rápido
  node index.js --project ./mi-proyecto --prompt "tu prompt"

  # Modo interactivo
  node index.js --interactive --project ./mi-proyecto

  # Servidor MCP
  node index.js --mcp

Para más información: cat README.md
  `);
  
  closeRL();
  return config;
}

/**
 * Export ai-core configuration
 */
export function exportConfig(outputPath = './ai-core-export.json') {
  const config = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    config: {},
    projects: []
  };
  
  // Read .env
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    config.config.env = envContent;
  }
  
  // Read _index.json
  const indexPath = path.join(process.cwd(), 'agents', 'orchestrator', 'projects', '_index.json');
  if (fs.existsSync(indexPath)) {
    try {
      config.projects = JSON.parse(fs.readFileSync(indexPath, 'utf-8')).projects || [];
    } catch {
      config.projects = [];
    }
  }
  
  // Write export
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
  console.log(`✅ Configuración exportada a: ${outputPath}`);
  
  return config;
}

/**
 * Import ai-core configuration
 */
export async function importConfig(inputPath = './ai-core-export.json') {
  if (!fs.existsSync(inputPath)) {
    console.error('❌ Archivo no encontrado:', inputPath);
    return null;
  }
  
  let config;
  try {
    config = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  } catch (e) {
    console.error('❌ Error leyendo archivo JSON:', e.message);
    return null;
  }
  
  // Ask for confirmation
  console.log('\n📦 Configuración a importar:');
  console.log('   - Projects:', config.projects?.length || 0);
  console.log('   - Has env config:', !!config.config?.env);
  
  const confirm = await askYesNo('¿Continuar con la importación?');
  
  if (!confirm) {
    console.log('❌ Importación cancelada.');
    return null;
  }
  
  // Import .env
  if (config.config?.env) {
    const envPath = path.join(process.cwd(), '.env');
    const backupPath = path.join(process.cwd(), '.env.backup');
    
    if (fs.existsSync(envPath)) {
      fs.copyFileSync(envPath, backupPath);
      console.log('✅ Backup de .env creado');
    }
    
    fs.writeFileSync(envPath, config.config.env);
    console.log('✅ .env importado');
  }
  
  // Import projects
  if (config.projects?.length > 0) {
    const indexPath = path.join(process.cwd(), 'agents', 'orchestrator', 'projects', '_index.json');
    
    let existingProjects = [];
    if (fs.existsSync(indexPath)) {
      try {
        existingProjects = JSON.parse(fs.readFileSync(indexPath, 'utf-8')).projects || [];
      } catch {
        existingProjects = [];
      }
    }
    
    // Merge projects (avoid duplicates by id)
    const existingIds = new Set(existingProjects.map(p => p.id));
    const newProjects = config.projects.filter(p => !existingIds.has(p.id));
    const allProjects = [...existingProjects, ...newProjects];
    
    const indexDir = path.dirname(indexPath);
    if (!fs.existsSync(indexDir)) {
      fs.mkdirSync(indexDir, { recursive: true });
    }
    
    fs.writeFileSync(indexPath, JSON.stringify({ 
      version: '1.0.0', 
      last_active: existingProjects[0]?.id || newProjects[0]?.id || null,
      projects: allProjects 
    }, null, 2));
    
    console.log(`✅ ${newProjects.length} proyectos importados`);
  }
  
  console.log('✅ Importación completada!');
  
  closeRL();
  return config;
}

export default { initAIcore, exportConfig, importConfig };
