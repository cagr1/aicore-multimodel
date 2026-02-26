// Frontend Agent - UI/UX, components, styles
import fs from 'fs';
import path from 'path';

/**
 * Supported languages for frontend
 */
const SUPPORTED_LANGUAGES = ['javascript', 'typescript'];

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
      console.warn(`[Frontend Agent] Permission denied: ${dirPath}`);
    } else if (error.code === 'ENOENT') {
      console.warn(`[Frontend Agent] Directory not found: ${dirPath}`);
    } else {
      console.warn(`[Frontend Agent] Error reading directory: ${error.message}`);
    }
    return [];
  }
}

/**
 * Safely read file content
 * @param {string} filePath - File path to read
 * @returns {string|null} File content or null on error
 */
function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[Frontend Agent] Error reading file: ${filePath}`);
    }
    return null;
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
 * Analyze frontend project
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
  const { language, framework, signals } = metadata || {};
  
  const diagnostics = [];
  const changes = [];
  
  // Check language support
  if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
    return {
      success: false,
      diagnostics: [{
        severity: 'warning',
        message: `Frontend agent does not support language: ${language || 'unknown'}`,
        file: '',
        line: 0
      }],
      changes: [],
      summary: `Skipped: language ${language || 'unknown'} not supported by Frontend agent`
    };
  }
  
  // Analyze based on framework
  const frameworkDiagnostics = analyzeFramework(projectPath, framework, signals);
  diagnostics.push(...frameworkDiagnostics);
  
  // Check for common frontend issues
  const commonIssues = analyzeCommonFrontend(projectPath);
  diagnostics.push(...commonIssues);
  
  const summary = `Frontend analysis complete. Found ${diagnostics.length} issues for ${framework || 'vanilla'} project.`;
  
  return {
    success: true,
    diagnostics,
    changes,
    summary
  };
}

/**
 * Analyze by framework
 */
function analyzeFramework(projectPath, framework, signals) {
  const diagnostics = [];
  const files = safeReaddir(projectPath);
  
  if (framework === 'react' || signals.includes('react')) {
    // Check React best practices
    if (!files.includes('package.json')) {
      diagnostics.push({
        severity: 'warning',
        message: 'No package.json found',
        file: 'package.json',
        line: 0
      });
    }
    
    // Check for index.js or App.js
    const hasEntryPoint = files.some(f => 
      f === 'index.js' || 
      f === 'App.js' || 
      f === 'main.tsx' || 
      f === 'main.js'
    );
    
    if (!hasEntryPoint) {
      diagnostics.push({
        severity: 'info',
        message: 'No clear entry point found (index.js, App.js, main.tsx)',
        file: '',
        line: 0
      });
    }
  }
  
  if (framework === 'nextjs') {
    // Check Next.js specific
    const hasPages = files.includes('pages') || files.includes('app');
    if (!hasPages) {
      diagnostics.push({
        severity: 'info',
        message: 'No pages or app directory found in Next.js project',
        file: '',
        line: 0
      });
    }
  }
  
  if (framework === 'vue') {
    const hasVueFiles = files.some(f => f.endsWith('.vue'));
    if (!hasVueFiles) {
      diagnostics.push({
        severity: 'info',
        message: 'No .vue files found',
        file: '',
        line: 0
      });
    }
  }
  
  return diagnostics;
}

/**
 * Analyze common frontend issues
 */
function analyzeCommonFrontend(projectPath) {
  const diagnostics = [];
  const files = safeReaddir(projectPath);
  
  // Check for public folder (assets)
  const hasPublic = files.includes('public') || files.includes('static');
  if (!hasPublic) {
    diagnostics.push({
      severity: 'info',
      message: 'No public or static folder found for assets',
      file: '',
      line: 0
    });
  }
  
  // Check for images folder
  const hasImages = files.some(f => f.includes('images') || f.includes('img'));
  if (!hasImages) {
    diagnostics.push({
      severity: 'info',
      message: 'No images folder found - consider adding one',
      file: '',
      line: 0
    });
  }
  
  // Check for CSS/asset handling
  const hasStyles = files.some(f => 
    f.endsWith('.css') || 
    f.endsWith('.scss') || 
    f.endsWith('.sass') ||
    f.endsWith('.less')
  );
  
  if (!hasStyles && files.includes('package.json')) {
    diagnostics.push({
      severity: 'info',
      message: 'No CSS/SCSS/SASS files found - using CSS-in-JS or Tailwind?',
      file: '',
      line: 0
    });
  }
  
  return diagnostics;
}

// Agent definition
export const frontendAgent = {
  id: 'frontend',
  description: 'Analiza proyectos frontend: React, Vue, Next.js, etc.',
  supportedLanguages: ['javascript', 'typescript'],
  requiredCapabilities: [],
  run
};

export default frontendAgent;
