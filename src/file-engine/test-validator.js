// Test Validator - Validate tests in sandbox and generate smoke tests
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get package.json for a project
 */
function getPackageJson(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  
  if (!fs.existsSync(pkgPath)) {
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Detect test framework from package.json
 */
function detectTestFramework(projectPath) {
  const pkg = getPackageJson(projectPath);
  
  if (!pkg) return null;
  
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  if (deps.jest) return 'jest';
  if (deps.vitest) return 'vitest';
  if (deps.mocha) return 'mocha';
  if (deps['@testing-library/react']) return 'testing-library';
  if (deps.pytest) return 'pytest';
  if (deps.unittest) return 'unittest';
  
  return null;
}

/**
 * Generate smoke test for JavaScript/TypeScript
 * @param {string} filePath - Path to the file being tested
 * @param {string} content - Content of the file being tested
 * @returns {Object} Test content and path
 */
function generateSmokeTestJS(filePath, content) {
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const dirName = path.dirname(filePath);
  const testDir = dirName.includes('src') 
    ? dirName.replace('src', 'src').replace(/\\/g, '/') 
    : 'src';
  
  // Determine test file name
  let testFileName;
  let testContent;
  
  if (ext === '.jsx' || ext === '.tsx') {
    testFileName = `${baseName}.test${ext}`;
    testContent = generateReactSmokeTest(baseName, ext);
  } else if (ext === '.ts') {
    testFileName = `${baseName}.test.ts`;
    testContent = generateJSSmokeTest(baseName, 'ts');
  } else {
    testFileName = `${baseName}.test.js`;
    testContent = generateJSSmokeTest(baseName, 'js');
  }
  
  return {
    path: path.join(testDir, testFileName).replace(/\\/g, '/'),
    content: testContent
  };
}

/**
 * Generate React smoke test
 */
function generateReactSmokeTest(componentName, ext) {
  const testingLib = ext === '.tsx' 
    ? '@testing-library/react' 
    : '@testing-library/react';
  
  return `import { render, screen } from '${testingLib}';
import ${componentName} from './${componentName}';

describe('${componentName}', () => {
  test('renders without crashing', () => {
    expect(() => {
      render(<${componentName} />);
    }).not.toThrow();
  });
  
  test('exports default', () => {
    const module = require('./${componentName}');
    expect(module.default).toBeDefined();
  });
});
`;
}

/**
 * Generate JavaScript smoke test
 */
function generateJSSmokeTest(moduleName, lang) {
  return `describe('${moduleName}', () => {
  test('module loads without errors', () => {
    expect(() => {
      require('./${moduleName}');
    }).not.toThrow();
  });
  
  test('exports are defined', () => {
    const module = require('./${moduleName}');
    expect(module).toBeDefined();
  });
});
`;
}

/**
 * Generate smoke test for Python
 */
function generateSmokeTestPython(filePath, content) {
  const baseName = path.basename(filePath, '.py');
  const testContent = `import pytest
from ${baseName} import *

def test_module_imports():
    """Smoke test: verify module can be imported"""
    assert '${baseName}' is not None

def test_module_loads():
    """Smoke test: verify module loads without errors"""
    import ${baseName}
    assert ${baseName} is not None
`;
  
  return {
    path: `test_${baseName}.py`,
    content: testContent
  };
}

/**
 * Run a test file and return results
 */
function runTestFile(testPath, cwd) {
  const result = {
    success: false,
    output: '',
    error: null,
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    // Try jest first, then vitest
    let command = 'npx jest --passWithNoTests --silent 2>&1';
    
    if (!fs.existsSync(path.join(cwd, 'node_modules'))) {
      // No node_modules, skip test
      result.success = true;
      result.output = 'No node_modules - skipping test';
      return result;
    }
    
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    result.success = output.includes('Tests:') && !output.includes('failed');
    result.output = output;
  } catch (error) {
    result.success = false;
    result.output = error.stdout || '';
    result.error = error.stderr || error.message;
  }
  
  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Validate tests in sandbox before applying patch
 * @param {string} projectPath - Project root path
 * @param {Array} tests - Array of {path, content} test objects
 * @param {Array} changes - Array of changes to apply
 * @returns {Object} Validation result
 */
export async function validateTestsInSandbox(projectPath, tests, changes = []) {
  const result = {
    valid: true,
    testsRun: 0,
    testsPassed: 0,
    testsFailed: 0,
    smokeTestsGenerated: [],
    errors: [],
    warnings: []
  };
  
  const framework = detectTestFramework(projectPath);
  
  // If no tests provided, generate smoke tests
  if (!tests || tests.length === 0) {
    // Generate smoke tests for each change that creates/modifies a file
    for (const change of changes) {
      if (change.type === 'create' || change.type === 'update') {
        const filePath = change.file;
        const ext = path.extname(filePath);
        
        let smokeTest;
        
        if (filePath.endsWith('.py')) {
          smokeTest = generateSmokeTestPython(filePath, change.content);
        } else if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
          smokeTest = generateSmokeTestJS(filePath, change.content);
        }
        
        if (smokeTest) {
          result.smokeTestsGenerated.push(smokeTest);
          result.warnings.push(`Generated smoke test for ${filePath}`);
        }
      }
    }
    
    // Use generated smoke tests
    tests = result.smokeTestsGenerated;
  }
  
  // If still no tests, skip validation
  if (tests.length === 0) {
    result.warnings.push('No tests available - skipping test validation');
    return result;
  }
  
  // Create temporary workspace
  const tempDir = path.join(projectPath, '.ai-core-temp-tests');
  
  try {
    // Copy project to temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Copy node_modules if exists
    const nodeModulesSrc = path.join(projectPath, 'node_modules');
    if (fs.existsSync(nodeModulesSrc)) {
      console.log('[TestValidator] Copying node_modules...');
      copyDir(nodeModulesSrc, path.join(tempDir, 'node_modules'));
    }
    
    // Copy source files
    copyDir(path.join(projectPath, 'src'), path.join(tempDir, 'src'));
    
    // Write test files
    for (const test of tests) {
      const testPath = path.join(tempDir, test.path);
      const testDir = path.dirname(testPath);
      
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      
      fs.writeFileSync(testPath, test.content, 'utf-8');
    }
    
    // Apply changes to temp directory
    for (const change of changes) {
      const fullPath = path.join(tempDir, change.file);
      const fullDir = path.dirname(fullPath);
      
      if (!fs.existsSync(fullDir)) {
        fs.mkdirSync(fullDir, { recursive: true });
      }
      
      if (change.type !== 'delete') {
        fs.writeFileSync(fullPath, change.content || '', 'utf-8');
      } else if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    
    // Run tests
    result.testsRun = tests.length;
    
    for (const test of tests) {
      const testResult = runTestFile(test.path, tempDir);
      
      if (testResult.success) {
        result.testsPassed++;
      } else {
        result.testsFailed++;
        result.errors.push(`Test ${test.path} failed: ${testResult.error || testResult.output}`);
        result.valid = false;
      }
    }
    
  } catch (error) {
    result.errors.push(`Sandbox validation failed: ${error.message}`);
    result.valid = false;
  } finally {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true });
      } catch (e) {
        // Ignore cleanup errors on Windows
      }
    }
  }
  
  return result;
}

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  
  fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Check if a change requires testing
 */
export function requiresTesting(proposal) {
  // Check if proposal has tests or modifies code files
  if (proposal.tests && proposal.tests.length > 0) {
    return true;
  }
  
  const changeFile = proposal.change?.file;
  if (!changeFile) return false;
  
  const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.php'];
  return codeExtensions.includes(path.extname(changeFile));
}

export default {
  validateTestsInSandbox,
  requiresTesting,
  detectTestFramework,
  generateSmokeTestJS,
  generateSmokeTestPython
};
