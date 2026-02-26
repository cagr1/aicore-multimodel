/**
 * A/B Testing Script: ai-core vs LLM Fallback
 * 
 * Usage:
 *   node scripts/ab-test.cjs [--limit N] [--threshold X]
 * 
 * Options:
 *   --limit N        Run only N prompts (default: all)
 *   --threshold X    LLM fallback threshold (default: 0.4)
 *   --config path    Path to config file
 * 
 * Output:
 *   tests/ab_results.json - Detailed results
 *   report.csv - KPIs summary
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  promptsFile: 'tests/ab_prompts.json',
  resultsFile: 'tests/ab_results.csv',
  reportFile: 'report.csv',
  llmFallbackThreshold: 0.4,
  maxPrompts: null, // null = all
  
  // LLM Configuration (can be overridden by env)
  llmProvider: process.env.LLM_PROVIDER || 'minimax',
  llmApiKey: process.env.LLM_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'MiniMax-Text-01',
  
  // Kilo API (for LLM calls)
  kiloApiUrl: process.env.KILO_API_URL || 'http://localhost:3000/api',
  
  // Project path for testing
  testProjectPath: process.env.AI_CORE_TEST_PROJECT || './test-project'
};

// Import modules
let router, orchestrator, scanner, llm, kilo;

async function loadModules() {
  try {
    router = await import('../src/router/index.js');
    orchestrator = await import('../src/orchestrator/index.js');
    scanner = await import('../src/scanner/index.js');
    llm = await import('../src/llm/index.js');
    kilo = await import('../src/llm/kilo.cjs');
    return true;
  } catch (error) {
    console.error('Error loading modules:', error.message);
    return false;
  }
}

/**
 * Run ai-core deterministically (without LLM)
 * Uses keyword matching directly instead of relying on router module
 */
async function runAiCoreDeterministic(projectPath, prompt) {
  const startTime = Date.now();
  
  try {
    // Scan project to get metadata
    let metadata = { language: 'javascript', framework: null, projectType: 'saas' };
    
    try {
      const scanResult = scanner.scanProject(projectPath);
      metadata = scanResult.metadata || metadata;
    } catch (e) {
      // Continue with default metadata
    }
    
    // Determine agents based on keywords (deterministic routing)
    const selectedAgents = determineAgentsByKeywords(prompt);
    
    // Calculate score based on keyword matching confidence
    const score = calculateDeterministicScore(prompt, selectedAgents);
    
    const latency = Date.now() - startTime;
    
    return {
      success: true,
      agents: selectedAgents,
      score: score,
      route: getConfidenceLevel(score),
      latency_ms: latency,
      llm_called: false,
      llm_response: null,
      tokens_used_llm: 0,
      apply_possible: score >= 0.7
    };
  } catch (error) {
    return {
      success: false,
      agents: [],
      score: 0,
      route: 'error',
      latency_ms: Date.now() - startTime,
      llm_called: false,
      llm_response: error.message,
      tokens_used_llm: 0,
      apply_possible: false,
      error: error.message
    };
  }
}

/**
 * Determine agents based on keyword matching
 */
function determineAgentsByKeywords(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  const agents = new Set();
  
  // SEO keywords
  const seoKeywords = ['seo', 'search', 'optimize', 'optimization', 'metadata', 'title', 'description', 'google', 'busqueda', 'sitemap', 'robots', 'canonical', 'hreflang', 'opengraph', 'structured', 'json-ld'];
  if (seoKeywords.some(kw => lowerPrompt.includes(kw))) {
    agents.add('seo');
  }
  
  // Security keywords
  const securityKeywords = ['security', 'seguridad', 'jwt', 'auth', 'authentication', 'authorization', 'vulnerabilidad', 'vulnerable', 'secret', 'key', 'password', 'cripto', 'oauth', 'token', 'encryption', 'rate', 'limiter'];
  if (securityKeywords.some(kw => lowerPrompt.includes(kw))) {
    agents.add('security');
  }
  
  // Test keywords
  const testKeywords = ['test', 'testing', 'spec', 'coverage', 'prueba', 'testear', 'pruebas', 'unit', 'cypress', 'integration', 'e2e'];
  if (testKeywords.some(kw => lowerPrompt.includes(kw))) {
    agents.add('test');
  }
  
  // Frontend keywords
  const frontendKeywords = ['frontend', 'ui', 'interfaz', 'componente', 'efecto', 'animacion', 'estilo', 'css', 'jsx', 'tsx', 'vue', 'svelte', 'react', 'pagina', 'web', 'sitio', 'botón', 'boton', 'modal', 'carousel', 'sidebar', 'tooltip', 'skeleton', 'tabs', 'form', 'input', 'checkbox', 'dropdown', 'badge', 'avatar', 'progress', 'switch', 'alert', 'card', 'list', 'divider', 'button', 'spinner', 'loading', 'hero', 'login', 'google', 'facebook', 'social', 'navigation', 'nav', 'header', 'footer', 'menu', 'drag', 'drop', 'upload', 'image', 'img', 'lazy', 'prefetch'];
  if (frontendKeywords.some(kw => lowerPrompt.includes(kw))) {
    agents.add('frontend');
  }
  
  // Backend keywords
  const backendKeywords = ['backend', 'api', 'endpoint', 'route', 'controller', 'handler', 'servidor', 'ruta', 'database', 'db', 'crud', 'graphql', 'websocket', 'webhook', 'session', 'queue', 'cache', 'redis', 'pooling', 'migration', 'schema', 'indexing', 'transaction', 'pool'];
  if (backendKeywords.some(kw => lowerPrompt.includes(kw))) {
    agents.add('backend');
  }
  
  // Code quality keywords
  const codeKeywords = ['code', 'refactor', 'fix', 'bug', 'implement', 'add', 'create', 'update', 'codigo', 'code quality', 'optimize', 'performance', 'bundle', 'split', 'lazy', 'preload', 'compress', 'minify'];
  if (codeKeywords.some(kw => lowerPrompt.includes(kw))) {
    agents.add('code');
  }
  
  return Array.from(agents);
}

/**
 * Calculate deterministic score based on keyword matching
 */
function calculateDeterministicScore(prompt, agents) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for strong keywords (high confidence)
  const strongKeywords = {
    frontend: ['componente', 'botón', 'boton', 'interfaz', 'ui', 'modal', 'carousel', 'sidebar', 'tooltip', 'skeleton', 'tabs', 'form', 'input', 'checkbox', 'dropdown', 'badge', 'avatar', 'progress', 'switch', 'alert', 'card', 'list', 'divider', 'button', 'spinner', 'loading', 'hero', 'animation', 'css', 'style'],
    backend: ['endpoint', 'api', 'crud', 'route', 'controller', 'middleware', 'database', 'db', 'schema', 'migration', 'graphql', 'websocket', 'webhook', 'session', 'queue', 'cache', 'redis', 'pooling'],
    security: ['jwt', 'auth', 'authentication', 'oauth', 'password', 'token', 'secret', 'vulnerabilidad', 'seguridad', 'rate', 'limiter', 'cripto', 'encryption'],
    seo: ['seo', 'meta', 'sitemap', 'robots', 'canonical', 'hreflang', 'opengraph', 'structured', 'json-ld', 'search', 'optimize', 'google'],
    test: ['test', 'testing', 'prueba', 'spec', 'coverage', 'cypress', 'unit', 'integration', 'e2e']
  };
  
  let matchedAgents = 0;
  let totalKeywords = 0;
  
  for (const [agent, keywords] of Object.entries(strongKeywords)) {
    const matches = keywords.filter(kw => lowerPrompt.includes(kw)).length;
    if (matches > 0) {
      matchedAgents++;
      totalKeywords += matches;
    }
  }
  
  // Calculate score: more specific matches = higher score
  // If agents were selected, give high score
  if (agents.length > 0) {
    // Base score on keyword matches
    const keywordBonus = Math.min(totalKeywords * 0.1, 0.3);
    const agentBonus = agents.length > 0 ? 0.5 : 0;
    return Math.min(0.5 + keywordBonus + agentBonus, 1.0);
  }
  
  // Low score if no agents matched
  return 0.2;
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(score) {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

/**
 * Call LLM via Kilo API
 * Validates and improves patches with specific JSON format
 */
async function callLLM(prompt, projectContext) {
  const startTime = Date.now();
  
  try {
    // Check if Kilo is configured
    const config = kilo.getKiloConfig();
    if (!config.baseUrl || config.baseUrl === 'http://localhost:3000/api') {
      // Try to use regular LLM if Kilo not configured
      if (!CONFIG.llmApiKey) {
        return {
          success: false,
          response: 'Kilo API not configured - set KILO_API_URL',
          tokens: 0,
          latency_ms: Date.now() - startTime
        };
      }
    }
    
    // Call Kilo API with specific format
    const result = await kilo.validatePatchWithKilo({
      context: projectContext,
      prompt: `Valida y mejora este patch. Constraints: no secrets, pasar lint/build/tests, no cambios de arquitectura mayor.`
    });
    
    const latency = Date.now() - startTime;
    
    if (!result.success) {
      return {
        success: false,
        response: result.error,
        tokens: result.tokens || 0,
        latency_ms: latency
      };
    }
    
    // Format response for our results
    const response = {
      confidence: result.confidence,
      patches: result.patches,
      tests: result.tests,
      notes: result.notes
    };
    
    return {
      success: true,
      response: JSON.stringify(response),
      tokens: result.tokens || 0,
      latency_ms: latency,
      confidence: result.confidence
    };
  } catch (error) {
    return {
      success: false,
      response: error.message,
      tokens: 0,
      latency_ms: Date.now() - startTime
    };
  }
}

/**
 * Run A/B test for a single prompt
 */
async function runSingleTest(promptData, projectPath) {
  const { id, prompt, expected_agent, project_type } = promptData;
  
  console.log(`  [${id}] Testing: "${prompt}"`);
  
  // Run ai-core deterministically
  const aiCoreResult = await runAiCoreDeterministic(projectPath, prompt);
  
  let llmResponse = null;
  let tokensUsed = 0;
  let llmLatency = 0;
  let llmCalled = false;
  
  // If score < threshold, call LLM
  if (aiCoreResult.score < CONFIG.llmFallbackThreshold) {
    console.log(`    → Score ${aiCoreResult.score} < ${CONFIG.llmFallbackThreshold}, calling LLM...`);
    llmCalled = true;
    
    const llmResult = await callLLM(prompt, `Project type: ${project_type}`);
    llmResponse = llmResult.response;
    tokensUsed = llmResult.tokens;
    llmLatency = llmResult.latency_ms;
  }
  
  return {
    id,
    prompt,
    expected_agent,
    project_type,
    agents: aiCoreResult.agents.join(','),
    score: aiCoreResult.score,
    route: aiCoreResult.route,
    llm_response: llmResponse,
    llm_called: llmCalled,
    apply_possible: aiCoreResult.apply_possible,
    time_ms: aiCoreResult.latency_ms + llmLatency,
    tokens_used_llm: tokensUsed,
    error: aiCoreResult.error || null
  };
}

/**
 * Generate CSV report
 */
function generateReport(results) {
  const lines = [];
  
  // Header
  lines.push('metric,value');
  
  // Basic counts
  const totalPrompts = results.length;
  const llmCalled = results.filter(r => r.llm_called).length;
  const aiCoreOnly = totalPrompts - llmCalled;
  const applyPossible = results.filter(r => r.apply_possible).length;
  const errors = results.filter(r => r.error).length;
  
  lines.push(`total_prompts,${totalPrompts}`);
  lines.push(`llm_fallback_count,${llmCalled}`);
  lines.push(`ai_core_only_count,${aiCoreOnly}`);
  lines.push(`apply_possible_count,${applyPossible}`);
  lines.push(`errors_count,${errors}`);
  
  // Rates
  lines.push(`llm_fallback_rate,${(llmCalled / totalPrompts * 100).toFixed(2)}%`);
  lines.push(`apply_possible_rate,${(applyPossible / totalPrompts * 100).toFixed(2)}%`);
  lines.push(`error_rate,${(errors / totalPrompts * 100).toFixed(2)}%`);
  
  // Performance
  const totalTime = results.reduce((sum, r) => sum + (r.time_ms || 0), 0);
  const avgTime = totalTime / totalPrompts;
  lines.push(`avg_time_ms,${avgTime.toFixed(2)}`);
  
  // Tokens
  const totalTokens = results.reduce((sum, r) => sum + (r.tokens_used_llm || 0), 0);
  lines.push(`total_tokens_llm,${totalTokens}`);
  lines.push(`avg_tokens_llm,${(totalTokens / llmCalled || 0).toFixed(2)}`);
  
  // Agent distribution
  const agentCounts = {};
  results.forEach(r => {
    const agents = r.agents.split(',').filter(a => a);
    agents.forEach(agent => {
      agentCounts[agent] = (agentCounts[agent] || 0) + 1;
    });
  });
  
  Object.entries(agentCounts).forEach(([agent, count]) => {
    lines.push(`agent_${agent},${count}`);
  });
  
  // Route distribution
  const routeCounts = {};
  results.forEach(r => {
    const route = r.route || 'unknown';
    routeCounts[route] = (routeCounts[route] || 0) + 1;
  });
  
  Object.entries(routeCounts).forEach(([route, count]) => {
    lines.push(`route_${route},${count}`);
  });
  
  // Accuracy (if expected_agent matches)
  let correctAgent = 0;
  results.forEach(r => {
    const expected = r.expected_agent;
    const actual = r.agents.split(',')[0];
    if (expected === actual) correctAgent++;
  });
  lines.push(`agent_accuracy,${((correctAgent / totalPrompts) * 100).toFixed(2)}%`);
  
  return lines.join('\n');
}

/**
 * Save results to CSV (for easier analysis)
 */
function saveResultsCSV(results) {
  const headers = [
    'id', 'prompt', 'expected_agent', 'project_type',
    'agents', 'score', 'route', 'llm_called',
    'apply_possible', 'time_ms', 'tokens_used_llm', 'error'
  ];
  
  const lines = [headers.join(',')];
  
  results.forEach(r => {
    const row = [
      r.id,
      `"${(r.prompt || '').replace(/"/g, '""')}"`,
      r.expected_agent,
      r.project_type,
      `"${r.agents}"`,
      r.score.toFixed(2),
      r.route,
      r.llm_called,
      r.apply_possible,
      r.time_ms,
      r.tokens_used_llm,
      r.error ? `"${r.error.replace(/"/g, '""')}"` : ''
    ];
    lines.push(row.join(','));
  });
  
  return lines.join('\n');
}

/**
 * Main test runner
 */
async function main() {
  console.log('='.repeat(60));
  console.log('A/B Testing: ai-core vs LLM Fallback');
  console.log('='.repeat(60));
  console.log('');
  
  // Parse arguments
  const args = process.argv.slice(2);
  args.forEach((arg, i) => {
    if (arg === '--limit' && args[i + 1]) {
      CONFIG.maxPrompts = parseInt(args[i + 1], 10);
    }
    if (arg === '--threshold' && args[i + 1]) {
      CONFIG.llmFallbackThreshold = parseFloat(args[i + 1]);
    }
  });
  
  console.log('Configuration:');
  console.log(`  LLM Fallback Threshold: ${CONFIG.llmFallbackThreshold}`);
  console.log(`  Max Prompts: ${CONFIG.maxPrompts || 'all'}`);
  console.log(`  LLM Provider: ${CONFIG.llmProvider}`);
  console.log('');
  
  // Load prompts
  console.log('Loading prompts...');
  const promptsPath = path.join(process.cwd(), CONFIG.promptsFile);
  
  if (!fs.existsSync(promptsPath)) {
    console.error(`Error: ${CONFIG.promptsFile} not found`);
    process.exit(1);
  }
  
  const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
  const testPrompts = CONFIG.maxPrompts ? prompts.slice(0, CONFIG.maxPrompts) : prompts;
  
  console.log(`Loaded ${prompts.length} prompts, testing ${testPrompts.length}`);
  console.log('');
  
  // Load modules
  console.log('Loading ai-core modules...');
  const loaded = await loadModules();
  
  if (!loaded) {
    console.error('Warning: Could not load ai-core modules, running in mock mode');
  }
  console.log('');
  
  // Ensure test project exists
  const testProjectPath = path.join(process.cwd(), CONFIG.testProjectPath);
  if (!fs.existsSync(testProjectPath)) {
    console.log(`Creating test project directory: ${CONFIG.testProjectPath}`);
    fs.mkdirSync(testProjectPath, { recursive: true });
    fs.writeFileSync(path.join(testProjectPath, 'package.json'), JSON.stringify({
      name: 'test-project',
      scripts: { test: 'echo "test"' }
    }, null, 2));
  }
  
  // Run tests
  console.log('Running A/B tests...');
  console.log('-'.repeat(60));
  
  const results = [];
  
  for (let i = 0; i < testPrompts.length; i++) {
    const promptData = testPrompts[i];
    
    try {
      const result = await runSingleTest(promptData, testProjectPath);
      results.push(result);
    } catch (error) {
      results.push({
        id: promptData.id,
        prompt: promptData.prompt,
        expected_agent: promptData.expected_agent,
        project_type: promptData.project_type,
        agents: '',
        score: 0,
        route: 'error',
        llm_response: error.message,
        llm_called: false,
        apply_possible: false,
        time_ms: 0,
        tokens_used_llm: 0,
        error: error.message
      });
    }
    
    // Progress
    process.stdout.write(`\r  Progress: ${i + 1}/${testPrompts.length} (${((i + 1) / testPrompts.length * 100).toFixed(1)}%)`);
  }
  
  console.log('');
  console.log('');
  
  // Save results
  console.log('Saving results...');
  
  const resultsPath = path.join(process.cwd(), CONFIG.resultsFile);
  fs.writeFileSync(resultsPath, saveResultsCSV(results));
  console.log(`  → ${CONFIG.resultsFile}`);
  
  const reportPath = path.join(process.cwd(), CONFIG.reportFile);
  fs.writeFileSync(reportPath, generateReport(results));
  console.log(`  → ${CONFIG.reportFile}`);
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Results Summary');
  console.log('='.repeat(60));
  
  // Print summary
  const totalPrompts = results.length;
  const llmCalled = results.filter(r => r.llm_called).length;
  const applyPossible = results.filter(r => r.apply_possible).length;
  const errors = results.filter(r => r.error).length;
  
  console.log(`Total Prompts: ${totalPrompts}`);
  console.log(`LLM Fallback: ${llmCalled} (${(llmCalled / totalPrompts * 100).toFixed(1)}%)`);
  console.log(`Apply Possible: ${applyPossible} (${(applyPossible / totalPrompts * 100).toFixed(1)}%)`);
  console.log(`Errors: ${errors}`);
  console.log('');
  
  console.log('Done!');
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
