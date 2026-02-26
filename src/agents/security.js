// Security Agent - Security issues, JWT, auth
import fs from 'fs';
import path from 'path';

/**
 * Supported languages
 */
const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python', 'go', 'rust', 'php', 'csharp'];

// Limit recursive scans to prevent performance issues
const MAX_FILES_TO_SCAN = 100;

/**
 * Safely read directory contents with limit
 * @param {string} dirPath - Directory path to read
 * @param {number} maxFiles - Maximum files to return
 * @returns {string[]} Array of filenames
 */
function safeReaddir(dirPath, maxFiles = MAX_FILES_TO_SCAN) {
  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    const files = fs.readdirSync(dirPath, { recursive: true });
    if (Array.isArray(files)) {
      return files.slice(0, maxFiles);
    }
    return [];
  } catch (error) {
    if (error.code === 'EACCES') {
      console.warn(`[Security Agent] Permission denied: ${dirPath}`);
    } else if (error.code === 'ENOENT') {
      console.warn(`[Security Agent] Directory not found: ${dirPath}`);
    } else {
      console.warn(`[Security Agent] Error reading directory: ${error.message}`);
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
 * Safely check if path is file
 * @param {string} filePath - File path to check
 * @returns {boolean}
 */
function safeIsFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
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
    console.warn(`[Security Agent] Error parsing JSON: ${filePath}`);
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
 * Analyze security issues
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
  const { language, framework } = metadata || {};
  
  const diagnostics = [];
  const changes = [];
  
  // Check language support
  if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
    return {
      success: false,
      diagnostics: [{
        severity: 'warning',
        message: `Security agent does not support language: ${language || 'unknown'}`,
        file: '',
        line: 0
      }],
      changes: [],
      summary: `Skipped: language ${language || 'unknown'} not supported by Security agent`
    };
  }
  
  // Scan for security issues
  const securityIssues = scanSecurityIssues(projectPath, language);
  diagnostics.push(...securityIssues);
  
  // Check for auth/JWT issues
  const authIssues = scanAuthIssues(projectPath, language);
  diagnostics.push(...authIssues);
  
  const summary = `Security analysis complete. Found ${diagnostics.length} security issues.`;
  
  return {
    success: true,
    diagnostics,
    changes,
    summary
  };
}

/**
 * Scan for general security issues
 */
function scanSecurityIssues(projectPath, language) {
  const diagnostics = [];
  const files = safeReaddir(projectPath, MAX_FILES_TO_SCAN);
  
  for (const file of files) {
    if (typeof file !== 'string') continue;
    
    // Skip node_modules, .git, etc.
    if (file.includes('node_modules') || file.includes('.git') || file.includes('dist')) continue;
    
    const fullPath = path.join(projectPath, file);
    if (!safeIsFile(fullPath)) continue;
    
    const { content } = safeReadFile(fullPath);
    if (!content) continue;
    
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for hardcoded secrets
      if (line.match(/password\s*=\s*['"][^'"]+['"]/i) && !line.includes('process.env')) {
        diagnostics.push({
          severity: 'error',
          message: 'Potential hardcoded password found',
          file,
          line: index + 1
        });
      }
      
      // Check for API keys
      if (line.match(/api[_-]?key\s*=\s*['"][^'"]+['"]/i) && !line.includes('process.env')) {
        diagnostics.push({
          severity: 'error',
          message: 'Potential hardcoded API key found',
          file,
          line: index + 1
        });
      }
      
      // Check for private keys
      if (line.match(/private[_-]?key\s*=\s*['"]/i) && !line.includes('process.env')) {
        diagnostics.push({
          severity: 'error',
          message: 'Potential hardcoded private key found',
          file,
          line: index + 1
        });
      }
      
      // Check for SQL injection risk
      if (line.match(/query\s*\(\s*['"`].* \+ /i) || line.match(/execute\s*\(\s*['"`].*\+/i)) {
        diagnostics.push({
          severity: 'error',
          message: 'Potential SQL injection risk - use parameterized queries',
          file,
          line: index + 1
        });
      }
      
      // Check for eval usage
      if (line.includes('eval(')) {
        diagnostics.push({
          severity: 'error',
          message: 'eval() is dangerous - consider alternatives',
          file,
          line: index + 1
        });
      }
    });
  }
  
  return diagnostics;
}

/**
 * Scan for auth/JWT issues
 */
function scanAuthIssues(projectPath, language) {
  const diagnostics = [];
  const files = safeReaddir(projectPath);
  
  // Check for JWT without expiration
  if (files.includes('package.json')) {
    const pkg = safeParseJson(path.join(projectPath, 'package.json'));
    if (pkg) {
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (deps.jsonwebtoken || deps.jwt) {
        diagnostics.push({
          severity: 'info',
          message: 'JWT library detected - ensure tokens have expiration',
          file: 'package.json',
          line: 0
        });
      }
    }
  }
  
  // Check for .env (should not be committed)
  const hasEnv = files.includes('.env');
  const hasGitignore = files.includes('.gitignore');
  
  if (hasEnv && !hasGitignore) {
    diagnostics.push({
      severity: 'warning',
      message: '.env found but no .gitignore - sensitive data may be committed',
      file: '.env',
      line: 0
    });
  }
  
  // Check for auth middleware
  const hasAuthMiddleware = files.some(f => 
    f.includes('auth') || 
    f.includes('middleware') ||
    f.includes('guard')
  );
  
  if (!hasAuthMiddleware && files.includes('package.json')) {
    diagnostics.push({
      severity: 'info',
      message: 'No auth middleware found - ensure routes are protected',
      file: '',
      line: 0
    });
  }
  
  return diagnostics;
}

// Agent definition
export const securityAgent = {
  id: 'security',
  description: 'Analiza seguridad: JWT, auth, secrets, vulnerabilidades',
  supportedLanguages: ['javascript', 'typescript', 'python', 'go', 'rust', 'php', 'csharp'],
  requiredCapabilities: [],
  run
};

export default securityAgent;
