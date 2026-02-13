// Backend Agent - API, routes, controllers
import fs from 'fs';
import path from 'path';

/**
 * Supported languages for backend
 */
const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python', 'go', 'rust', 'php', 'csharp'];

/**
 * Analyze backend project
 */
export async function run(context) {
  const { projectPath, metadata, userIntent } = context;
  const { language, framework, capabilities } = metadata;
  
  const diagnostics = [];
  const changes = [];
  
  // Check language support
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return {
      success: false,
      diagnostics: [{
        severity: 'warning',
        message: `Backend agent does not support language: ${language}`,
        file: '',
        line: 0
      }],
      changes: [],
      summary: `Skipped: language ${language} not supported by Backend agent`
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
  const files = fs.readdirSync(projectPath);
  
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
  const files = fs.readdirSync(projectPath);
  
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
