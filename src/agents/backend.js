// Backend Agent - API, routes, controllers
import fs from 'fs';
import path from 'path';

/**
 * Supported languages for backend
 */
const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python', 'go', 'rust', 'php', 'csharp'];

/**
 * Safely read directory contents
 * @param {string} dirPath - Directory path to read
 * @returns {string[]} Array of filenames, empty on error
 */
function safeReaddir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    return fs.readdirSync(dirPath);
  } catch (error) {
    if (error.code === 'EACCES') {
      console.warn(`[Backend Agent] Permission denied: ${dirPath}`);
    } else if (error.code === 'ENOENT') {
      console.warn(`[Backend Agent] Directory not found: ${dirPath}`);
    } else {
      console.warn(`[Backend Agent] Error reading directory: ${error.message}`);
    }
    return [];
  }
}

/**
 * Validate agent context
 * @param {Object} context - Agent context
 * @returns {Object} Validation result { valid: boolean, error?: string }
 */
function validateContext(context) {
  if (!context) {
    return { valid: false, error: 'Context is required' };
  }
  
  if (!context.projectPath) {
    return { valid: false, error: 'projectPath is required' };
  }
  
  if (typeof context.projectPath !== 'string') {
    return { valid: false, error: 'projectPath must be a string' };
  }
  
  if (!fs.existsSync(context.projectPath)) {
    return { valid: false, error: `Project path does not exist: ${context.projectPath}` };
  }
  
  return { valid: true };
}

/**
 * Analyze backend project
 */
export async function run(context) {
  // Validate context
  const validation = validateContext(context);
  if (!validation.valid) {
    return {
      success: false,
      diagnostics: [{
        severity: 'error',
        message: `Invalid context: ${validation.error}`,
        file: '',
        line: 0
      }],
      changes: [],
      summary: `Error: ${validation.error}`
    };
  }

  const { projectPath, metadata, userIntent } = context;
  const { language, framework, capabilities } = metadata || {};
  
  const diagnostics = [];
  const changes = [];
  
  // Check language support
  if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
    return {
      success: false,
      diagnostics: [{
        severity: 'warning',
        message: `Backend agent does not support language: ${language || 'unknown'}`,
        file: '',
        line: 0
      }],
      changes: [],
      summary: `Skipped: language ${language || 'unknown'} not supported by Backend agent`
    };
  }
  
  // Analyze API structure
  const apiDiagnostics = analyzeAPI(projectPath, language, framework);
  diagnostics.push(...apiDiagnostics);
  
  // Check for common backend issues
  const commonIssues = analyzeCommonBackend(projectPath, language);
  diagnostics.push(...commonIssues);
  
  const summary = `Backend analysis complete. Found ${diagnostics.length} issues for ${language}/${framework || 'no-framework'} project.`;
  
  return {
    success: true,
    diagnostics,
    changes,
    summary
  };
}

/**
 * Analyze API structure
 */
function analyzeAPI(projectPath, language, framework) {
  const diagnostics = [];
  const files = safeReaddir(projectPath);
  
  // Check for API routes structure
  const hasRoutes = files.some(f => f.includes('routes') || f.includes('routers'));
  const hasControllers = files.some(f => f.includes('controller') || f.includes('handlers'));
  const hasServices = files.some(f => f.includes('service') || f.includes('services'));
  const hasModels = files.some(f => f.includes('model') || f.includes('models'));
  
  // Check appropriate structure based on language/framework
  if (['javascript', 'typescript'].includes(language)) {
    if (framework === 'express' || framework === 'fastify' || framework === 'nest') {
      if (!hasRoutes) {
        diagnostics.push({
          severity: 'info',
          message: 'No routes directory found - consider organizing routes',
          file: '',
          line: 0
        });
      }
      
      if (!hasControllers && !hasServices) {
        diagnostics.push({
          severity: 'info',
          message: 'No controllers or services found',
          file: '',
          line: 0
        });
      }
    }
  }
  
  if (language === 'python') {
    if (framework === 'fastapi' || framework === 'flask' || framework === 'django') {
      if (!hasRoutes) {
        diagnostics.push({
          severity: 'info',
          message: 'No routes found (check for @app.routes or urls.py)',
          file: '',
          line: 0
        });
      }
    }
  }
  
  if (language === 'go') {
    const hasHandlers = files.some(f => f.includes('handler'));
    if (!hasHandlers) {
      diagnostics.push({
        severity: 'info',
        message: 'No handlers found - consider organizing HTTP handlers',
        file: '',
        line: 0
      });
    }
  }
  
  return diagnostics;
}

/**
 * Analyze common backend issues
 */
function analyzeCommonBackend(projectPath, language) {
  const diagnostics = [];
  const files = safeReaddir(projectPath);
  
  // Check for environment variables
  const hasEnvFile = files.includes('.env') || files.includes('.env.example');
  if (!hasEnvFile) {
    diagnostics.push({
      severity: 'warning',
      message: 'No .env or .env.example found - consider adding for configuration',
      file: '.env',
      line: 0
    });
  }
  
  // Check for .gitignore
  if (!files.includes('.gitignore')) {
    diagnostics.push({
      severity: 'warning',
      message: 'No .gitignore found',
      file: '.gitignore',
      line: 0
    });
  }
  
  // Check for README
  const hasReadme = files.some(f => f.toLowerCase().includes('readme'));
  if (!hasReadme) {
    diagnostics.push({
      severity: 'info',
      message: 'No README found - consider adding API documentation',
      file: 'README.md',
      line: 0
    });
  }
  
  return diagnostics;
}

// Agent definition
export const backendAgent = {
  id: 'backend',
  description: 'Analiza proyectos backend: APIs, rutas, controladores',
  supportedLanguages: ['javascript', 'typescript', 'python', 'go', 'rust', 'php', 'csharp'],
  requiredCapabilities: [],
  run
};

export default backendAgent;
