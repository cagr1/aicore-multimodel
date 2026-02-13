// Test Agent - Testing, coverage, specs
import fs from 'fs';
import path from 'path';

/**
 * Supported languages
 */
const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python', 'go', 'rust', 'php', 'csharp'];

/**
 * Analyze testing setup
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
        message: `Test agent does not support language: ${language}`,
        file: '',
        line: 0
      }],
      changes: [],
      summary: `Skipped: language ${language} not supported by Test agent`
    };
  }
  
  // Analyze test setup
  const testDiagnostics = analyzeTestSetup(projectPath, language);
  diagnostics.push(...testDiagnostics);
  
  // Check for test coverage
  const coverageDiagnostics = analyzeCoverage(projectPath, language);
  diagnostics.push(...coverageDiagnostics);
  
  const summary = `Test analysis complete. Found ${diagnostics.length} issues.`;
  
  return {
    success: true,
    diagnostics,
    changes,
    summary
  };
}

/**
 * Analyze test setup
 */
function analyzeTestSetup(projectPath, language) {
  const diagnostics = [];
  const files = fs.readdirSync(projectPath);
  
  // Check for test directory/files
  const hasTests = files.some(f => 
    f.includes('test') || 
    f.includes('__tests__') ||
    f.includes('.spec.') ||
    f.includes('.test.')
  );
  
  if (!hasTests) {
    diagnostics.push({
      severity: 'warning',
      message: 'No test files found - consider adding tests',
      file: '',
      line: 0
    });
  }
  
  // Check for test framework in package.json or requirements
  if (language === 'javascript' || language === 'typescript') {
    if (files.includes('package.json')) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        const hasTestFramework = deps.jest || deps.mocha || deps.vitest || 
                                  deps['@testing-library/react'] || deps.cypress;
        
        if (!hasTestFramework && !hasTests) {
          diagnostics.push({
            severity: 'warning',
            message: 'No test framework found in package.json',
            file: 'package.json',
            line: 0
          });
        }
      } catch (e) {
        // Ignore
      }
    }
  }
  
  if (language === 'python') {
    const hasRequirements = files.includes('requirements.txt') || files.includes('pyproject.toml');
    if (hasRequirements) {
      try {
        let content = '';
        if (files.includes('requirements.txt')) {
          content = fs.readFileSync(path.join(projectPath, 'requirements.txt'), 'utf-8');
        }
        
        const hasPytest = content.includes('pytest') || content.includes('unittest');
        
        if (!hasPytest && !hasTests) {
          diagnostics.push({
            severity: 'warning',
            message: 'No Python test framework found (pytest, unittest)',
            file: 'requirements.txt',
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

/**
 * Analyze test coverage
 */
function analyzeCoverage(projectPath, language) {
  const diagnostics = [];
  const files = fs.readdirSync(projectPath);
  
  // Check for coverage configuration
  if (language === 'javascript' || language === 'typescript') {
    const hasCoverageConfig = files.includes('jest.config.js') || 
                              files.includes('jest.config.ts') ||
                              files.includes('vitest.config.js') ||
                              files.includes('.nycrc');
    
    if (!hasCoverageConfig) {
      diagnostics.push({
        severity: 'info',
        message: 'No test coverage configuration found',
        file: '',
        line: 0
      });
    }
  }
  
  // Check for CI/CD (GitHub Actions, etc.)
  const hasCI = files.includes('.github') || 
                files.includes('.gitlab-ci.yml') ||
                files.includes('Jenkinsfile');
  
  if (!hasCI) {
    diagnostics.push({
      severity: 'info',
      message: 'No CI/CD configuration found - consider adding automated tests',
      file: '',
      line: 0
    });
  }
  
  return diagnostics;
}

// Agent definition
export const testAgent = {
  id: 'test',
  description: 'Analiza tests: Jest, pytest, coverage, CI/CD',
  supportedLanguages: ['javascript', 'typescript', 'python', 'go', 'rust', 'php', 'csharp'],
  requiredCapabilities: [],
  run
};

export default testAgent;
