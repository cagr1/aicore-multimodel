// SEO Agent - Analyzes and optimizes for search engines
import fs from 'fs';
import path from 'path';

/**
 * Supported languages
 */
const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python', 'php', 'go', 'rust', 'html'];

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
      console.warn(`[SEO Agent] Permission denied: ${dirPath}`);
    } else if (error.code === 'ENOENT') {
      console.warn(`[SEO Agent] Directory not found: ${dirPath}`);
    } else {
      console.warn(`[SEO Agent] Error reading directory: ${error.message}`);
    }
    return [];
  }
}

/**
 * Safely read file content
 * @param {string} filePath - File path to read
 * @returns {{content: string|null, error: Error|null}}
 */
function safeReadFile(filePath) {
  try {
    return { content: fs.readFileSync(filePath, 'utf-8'), error: null };
  } catch (error) {
    return { content: null, error };
  }
}

/**
 * Safely parse JSON file
 * @param {string} filePath - JSON file path
 * @returns {Object|null}
 */
function safeParseJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`[SEO Agent] Error parsing JSON: ${filePath}`);
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
  const { language, framework, signals, projectType } = metadata || {};
  
  const diagnostics = [];
  const changes = [];
  
  // Check language support
  if (!language || !isLanguageSupported(language)) {
    return {
      success: false,
      diagnostics: [{
        severity: 'warning',
        message: `SEO agent does not support language: ${language || 'unknown'}`,
        file: '',
        line: 0
      }],
      changes: [],
      summary: `Skipped: language ${language || 'unknown'} not supported by SEO agent`
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
  const files = safeReaddir(projectPath);
  
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
    const { content } = safeReadFile(path.join(projectPath, file));
    if (!content) continue;
      
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

    // Check for viewport meta
    if (!content.includes('name="viewport"')) {
      diagnostics.push({
        severity: 'warning',
        message: 'HTML file missing viewport meta tag',
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
    const files = safeReaddir(projectPath);
    
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
      const pkg = safeParseJson(path.join(projectPath, 'package.json'));
      
      if (pkg && (!pkg.scripts || (!pkg.scripts.build && !pkg.scripts.export))) {
        diagnostics.push({
          severity: 'warning',
          message: 'No build script found - may affect SEO for static sites',
          file: 'package.json',
          line: 0
        });
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
