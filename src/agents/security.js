// Security Agent - Security issues, JWT, auth
import fs from 'fs';
import path from 'path';

/**
 * Supported languages
 */
const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python', 'go', 'rust', 'php', 'csharp'];

/**
 * Analyze security issues
 */
export async function run(context) {
  const { projectPath, metadata, userIntent } = context;
  const { language, framework } = metadata;
  
  const diagnostics = [];
  const changes = [];
  
  // Check language support
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return {
      success: false,
      diagnostics: [{
        severity: 'warning',
        message: `Security agent does not support language: ${language}`,
        file: '',
        line: 0
      }],
      changes: [],
      summary: `Skipped: language ${language} not supported by Security agent`
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
  const files = fs.readdirSync(projectPath, { recursive: true }).slice(0, 50);
  
  for (const file of files) {
    if (typeof file !== 'string') continue;
    
    // Skip node_modules, .git, etc.
    if (file.includes('node_modules') || file.includes('.git') || file.includes('dist')) continue;
    
    const fullPath = path.join(projectPath, file);
    if (!fs.statSync(fullPath).isFile()) continue;
    
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
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
    } catch (e) {
      // Skip files we can't read
    }
  }
  
  return diagnostics;
}

/**
 * Scan for auth/JWT issues
 */
function scanAuthIssues(projectPath, language) {
  const diagnostics = [];
  const files = fs.readdirSync(projectPath);
  
  // Check for JWT without expiration
  if (files.includes('package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (deps.jsonwebtoken || deps.jwt) {
        diagnostics.push({
          severity: 'info',
          message: 'JWT library detected - ensure tokens have expiration',
          file: 'package.json',
          line: 0
        });
      }
    } catch (e) {
      // Ignore
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
