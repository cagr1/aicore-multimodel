// Code Agent - Analyzes and proposes code improvements
import fs from 'fs';
import path from 'path';

/**
 * Check if language is supported
 * @param {string} language 
 * @returns {boolean}
 */
function isLanguageSupported(language) {
  const supported = ['javascript', 'typescript', 'python', 'php', 'go', 'rust'];
  return supported.includes(language);
}

/**
 * Analyze project for code issues
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
        message: `Code agent does not support language: ${language}`,
        file: '',
        line: 0
      }],
      changes: [],
      summary: `Skipped: language ${language} not supported by Code agent`
    };
  }
  
  // Analyze based on project type
  const fileDiagnostics = analyzeCodeFiles(projectPath, language);
  diagnostics.push(...fileDiagnostics);
  
  // Check for common issues
  const commonDiagnostics = analyzeCommonIssues(projectPath, language);
  diagnostics.push(...commonDiagnostics);
  
  // Generate summary
  const summary = `Code analysis complete. Found ${diagnostics.length} issues for ${language}/${framework || 'no-framework'} project.`;
  
  return {
    success: true,
    diagnostics,
    changes,
    summary
  };
}

/**
 * Analyze code files based on language
 * @param {string} projectPath 
 * @param {string} language 
 * @returns {Array}
 */
function analyzeCodeFiles(projectPath, language) {
  const diagnostics = [];
  
  try {
    const files = fs.readdirSync(projectPath, { recursive: true });
    
    // Get extensions for the language
    const extensions = getExtensionsForLanguage(language);
    
    const codeFiles = files.filter(f => {
      if (typeof f !== 'string') return false;
      const ext = path.extname(f);
      return extensions.includes(ext);
    });
    
    // Check file count
    if (codeFiles.length === 0) {
      diagnostics.push({
        severity: 'info',
        message: `No ${language} code files found`,
        file: '',
        line: 0
      });
      return diagnostics;
    }
    
    // Analyze up to 20 files for performance
    const filesToAnalyze = codeFiles.slice(0, 20);
    
    for (const file of filesToAnalyze) {
      try {
        const fullPath = path.join(projectPath, file);
        if (!fs.statSync(fullPath).isFile()) continue;
        
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Check for common issues
        analyzeFileContent(content, file, diagnostics);
        
      } catch (e) {
        // Skip files we can't read
      }
    }
    
    if (codeFiles.length > 20) {
      diagnostics.push({
        severity: 'info',
        message: `Analyzed 20 of ${codeFiles.length} files`,
        file: '',
        line: 0
      });
    }
    
  } catch (e) {
    diagnostics.push({
      severity: 'error',
      message: `Failed to analyze code files: ${e.message}`,
      file: '',
      line: 0
    });
  }
  
  return diagnostics;
}

/**
 * Get file extensions for a language
 * @param {string} language 
 * @returns {Array}
 */
function getExtensionsForLanguage(language) {
  const map = {
    javascript: ['.js', '.jsx', '.mjs', '.cjs'],
    typescript: ['.ts', '.tsx', '.mts', '.cts'],
    python: ['.py'],
    php: ['.php'],
    go: ['.go'],
    rust: ['.rs']
  };
  return map[language] || [];
}

/**
 * Analyze file content for issues
 * @param {string} content 
 * @param {string} file 
 * @param {Array} diagnostics 
 */
function analyzeFileContent(content, file, diagnostics) {
  const lines = content.split('\n');
  
  // Check for console.log (JavaScript)
  if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx')) {
    lines.forEach((line, index) => {
      if (line.includes('console.log') && !line.includes('//')) {
        diagnostics.push({
          severity: 'info',
          message: 'Consider removing console.log statement',
          file,
          line: index + 1
        });
      }
    });
  }
  
  // Check for TODO comments
  lines.forEach((line, index) => {
    if (line.includes('TODO') || line.includes('FIXME')) {
      diagnostics.push({
        severity: 'info',
        message: `Found ${line.includes('TODO') ? 'TODO' : 'FIXME'} comment`,
        file,
        line: index + 1
      });
    }
  });
  
  // Check for empty catch blocks
  lines.forEach((line, index) => {
    if (line.includes('catch') && lines[index + 1]?.trim() === '}') {
      diagnostics.push({
        severity: 'warning',
        message: 'Empty catch block - errors are silently ignored',
        file,
        line: index + 1
      });
    }
  });
}

/**
 * Analyze common project issues
 * @param {string} projectPath 
 * @param {string} language 
 * @returns {Array}
 */
function analyzeCommonIssues(projectPath, language) {
  const diagnostics = [];
  const files = fs.readdirSync(projectPath);
  
  // Check for gitignore
  if (!files.includes('.gitignore')) {
    diagnostics.push({
      severity: 'info',
      message: 'No .gitignore file found - consider adding one',
      file: '.gitignore',
      line: 0
    });
  }
  
  // Language-specific checks
  if (language === 'javascript' || language === 'typescript') {
    if (!files.includes('package.json')) {
      diagnostics.push({
        severity: 'warning',
        message: 'No package.json found',
        file: 'package.json',
        line: 0
      });
    }
  }
  
  if (language === 'python') {
    if (!files.includes('requirements.txt') && !files.includes('pyproject.toml')) {
      diagnostics.push({
        severity: 'warning',
        message: 'No dependency file found (requirements.txt or pyproject.toml)',
        file: '',
        line: 0
      });
    }
  }
  
  if (language === 'go') {
    if (!files.includes('go.mod')) {
      diagnostics.push({
        severity: 'warning',
        message: 'No go.mod found - run go mod init',
        file: 'go.mod',
        line: 0
      });
    }
  }
  
  return diagnostics;
}

// Agent definition
export const codeAgent = {
  id: 'code',
  description: 'Analyzes code for issues and improvements',
  supportedLanguages: ['javascript', 'typescript', 'python', 'php', 'go', 'rust'],
  requiredCapabilities: [],
  run
};

export default codeAgent;
