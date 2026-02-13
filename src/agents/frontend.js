// Frontend Agent - UI/UX, components, styles
import fs from 'fs';
import path from 'path';

/**
 * Supported languages for frontend
 */
const SUPPORTED_LANGUAGES = ['javascript', 'typescript'];

/**
 * Analyze frontend project
 */
export async function run(context) {
  const { projectPath, metadata, userIntent } = context;
  const { language, framework, signals } = metadata;
  
  const diagnostics = [];
  const changes = [];
  
  // Check language support
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return {
      success: false,
      diagnostics: [{
        severity: 'warning',
        message: `Frontend agent does not support language: ${language}`,
        file: '',
        line: 0
      }],
      changes: [],
      summary: `Skipped: language ${language} not supported by Frontend agent`
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
  const files = fs.readdirSync(projectPath);
  
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
  const files = fs.readdirSync(projectPath);
  
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
