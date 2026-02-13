// SEO Agent - Analyzes and optimizes for search engines
import fs from 'fs';
import path from 'path';

/**
 * Check if language is supported
 * @param {string} language 
 * @returns {boolean}
 */
function isLanguageSupported(language) {
  const supported = ['javascript', 'typescript', 'python', 'php', 'go', 'rust', 'html'];
  return supported.includes(language);
}

/**
 * Analyze project for SEO issues
 * @param {Object} context 
 * @returns {Object} AgentResult
 */
export async function run(context) {
  const { projectPath, metadata, userIntent } = context;
  const { language, framework, signals, projectType } = metadata;
  
  const diagnostics = [];
  const changes = [];
  
  // Check language support
  if (!isLanguageSupported(language)) {
    return {
      success: false,
      diagnostics: [{
        severity: 'warning',
        message: `SEO agent does not support language: ${language}`,
        file: '',
        line: 0
      }],
      changes: [],
      summary: `Skipped: language ${language} not supported by SEO agent`
    };
  }
  
  // Analyze based on project type
  if (projectType === 'landing' || language === 'javascript' || language === 'typescript') {
    const htmlDiagnostics = analyzeHTMLFiles(projectPath);
    diagnostics.push(...htmlDiagnostics);
  }
  
  // Check for metadata files
  const metaDiagnostics = analyzeMetadata(projectPath, language);
  diagnostics.push(...metaDiagnostics);
  
  // Generate summary
  const summary = `SEO analysis complete. Found ${diagnostics.length} issues for ${language}/${framework || 'no-framework'} project.`;
  
  return {
    success: true,
    diagnostics,
    changes,
    summary
  };
}

/**
 * Analyze HTML files in the project
 * @param {string} projectPath 
 * @returns {Array}
 */
function analyzeHTMLFiles(projectPath) {
  const diagnostics = [];
  const files = fs.readdirSync(projectPath);
  
  // Find HTML files
  const htmlFiles = files.filter(f => f.endsWith('.html'));
  
  if (htmlFiles.length === 0) {
    diagnostics.push({
      severity: 'warning',
      message: 'No HTML files found in project root',
      file: '',
      line: 0
    });
    return diagnostics;
  }
  
  // Check each HTML file
  for (const file of htmlFiles) {
    try {
      const content = fs.readFileSync(path.join(projectPath, file), 'utf-8');
      
      // Check for title
      if (!content.includes('<title>') && !content.includes('<Title>')) {
        diagnostics.push({
          severity: 'warning',
          message: 'HTML file missing <title> tag',
          file,
          line: 0
        });
      }
      
      // Check for meta description
      if (!content.includes('name="description"') && !content.includes("name='description'")) {
        diagnostics.push({
          severity: 'info',
          message: 'HTML file missing meta description',
          file,
          line: 0
        });
      }
      
      // Check for viewport meta
      if (!content.includes('name="viewport"')) {
        diagnostics.push({
          severity: 'warning',
          message: 'HTML file missing viewport meta tag',
          file,
          line: 0
        });
      }
      
    } catch (e) {
      diagnostics.push({
        severity: 'error',
        message: `Failed to read file: ${e.message}`,
        file,
        line: 0
      });
    }
  }
  
  return diagnostics;
}

/**
 * Analyze metadata configuration
 * @param {string} projectPath 
 * @param {string} language 
 * @returns {Array}
 */
function analyzeMetadata(projectPath, language) {
  const diagnostics = [];
  
  // Check for next.config.js (Next.js)
  if (language === 'typescript' || language === 'javascript') {
    const files = fs.readdirSync(projectPath);
    
    // Check Next.js config
    if (files.includes('next.config.js') || files.includes('next.config.mjs') || files.includes('next.config.ts')) {
      const configFile = files.find(f => f.startsWith('next.config'));
      try {
        const config = fs.readFileSync(path.join(projectPath, configFile), 'utf-8');
        
        if (!config.includes('reactStrictMode')) {
          diagnostics.push({
            severity: 'info',
            message: 'Next.js: Consider enabling reactStrictMode',
            file: configFile,
            line: 0
          });
        }
      } catch (e) {
        // Ignore
      }
    }
    
    // Check package.json for SEO-related scripts
    if (files.includes('package.json')) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
        
        if (!pkg.scripts || (!pkg.scripts.build && !pkg.scripts.export)) {
          diagnostics.push({
            severity: 'warning',
            message: 'No build script found - may affect SEO for static sites',
            file: 'package.json',
            line: 0
          });
        }
      } catch (e) {
        // Ignore
      }
    }
  }
  
  return diagnostics;
}

// Agent definition
export const seoAgent = {
  id: 'seo',
  description: 'Analyzes and optimizes project for search engines',
  supportedLanguages: ['javascript', 'typescript', 'python', 'php', 'go', 'rust', 'html'],
  requiredCapabilities: [],
  run
};

export default seoAgent;
