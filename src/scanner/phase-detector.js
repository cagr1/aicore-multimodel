// Phase Detector - Automatically detect project phase based on code signals
import fs from 'fs';
import path from 'path';

/**
 * Phase definitions
 */
export const PHASES = {
  DISCOVERY: 'discovery',
  BUILD: 'build',
  SHIP: 'ship'
};

/**
 * Thresholds for phase detection
 */
const THRESHOLDS = {
  // Discovery phase
  minFilesForDiscovery: 5,
  maxFilesForDiscovery: 20,
  
  // Build phase
  minFilesForBuild: 20,
  maxFilesForBuild: 200,
  
  // Ship phase
  minFilesForShip: 50,
  
  // Tests
  minTestsForShip: 3,
  
  // CI/CD
  ciFolders: ['.github/workflows', '.gitlab-ci.yml', 'azure-pipelines', 'jenkins'],
  
  // Container
  containerFiles: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml']
};

/**
 * Count files in a directory recursively
 * @param {string} dirPath - Directory path
 * @param {string[]} excludeDirs - Directories to exclude
 * @returns {number}
 */
function countFiles(dirPath, excludeDirs = ['node_modules', '.git', 'dist', 'build', 'coverage']) {
  if (!fs.existsSync(dirPath)) return 0;
  
  let count = 0;
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    if (excludeDirs.includes(item)) continue;
    
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      count += countFiles(fullPath, excludeDirs);
    } else {
      count++;
    }
  }
  
  return count;
}

/**
 * Count test files in a project
 * @param {string} projectPath - Project path
 * @returns {number}
 */
function countTestFiles(projectPath) {
  const testPatterns = [
    '**/*.test.js', '**/*.test.ts', '**/*.test.jsx', '**/*.test.tsx',
    '**/*.spec.js', '**/*.spec.ts', '**/*.spec.jsx', '**/*.spec.tsx',
    '**/__tests__/**', '**/test/**', '**/tests/**',
    '**/*.test.py', '**/*_test.py', '**/test_*.py',
    '**/*Test.cs', '**/*Tests.cs'
  ];
  
  let count = 0;
  
  function searchDir(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      if (['node_modules', '.git', 'dist', 'build'].includes(item)) continue;
      
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        searchDir(fullPath);
      } else {
        const name = item.toLowerCase();
        if (name.includes('.test.') || name.includes('.spec.') || 
            name.endsWith('test.js') || name.endsWith('test.ts') ||
            name.includes('/test/') || name.includes('/tests/') ||
            name.endsWith('_test.py') || name.endsWith('test.py')) {
          count++;
        }
      }
    }
  }
  
  searchDir(projectPath);
  return count;
}

/**
 * Check for CI/CD configuration
 * @param {string} projectPath - Project path
 * @returns {boolean}
 */
function hasCI(projectPath) {
  for (const ciFolder of THRESHOLDS.ciFolders) {
    if (fs.existsSync(path.join(projectPath, ciFolder))) {
      return true;
    }
  }
  
  // Check for common CI files
  const ciFiles = [
    '.github/workflows/main.yml',
    '.github/workflows/ci.yml',
    'azure-pipelines.yml',
    'Jenkinsfile',
    '.gitlab-ci.yml',
    'bitbucket-pipelines.yml'
  ];
  
  for (const ciFile of ciFiles) {
    if (fs.existsSync(path.join(projectPath, ciFile))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check for container configuration
 * @param {string} projectPath - Project path
 * @returns {boolean}
 */
function hasContainer(projectPath) {
  for (const containerFile of THRESHOLDS.containerFiles) {
    if (fs.existsSync(path.join(projectPath, containerFile))) {
      return true;
    }
  }
  return false;
}

/**
 * Check for deployment configuration
 * @param {string} projectPath - Project path
 * @returns {boolean}
 */
function hasDeploymentConfig(projectPath) {
  const deployFiles = [
    'vercel.json',
    'netlify.toml',
    'next.config.js', // Next.js has implied Vercel deploy
    'firebase.json',
    'app.json', // Expo/React Native
    'now.json' // Vercel legacy
  ];
  
  for (const file of deployFiles) {
    if (fs.existsSync(path.join(projectPath, file))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if has complete README
 * @param {string} projectPath - Project path
 * @returns {boolean}
 */
function hasCompleteReadme(projectPath) {
  const readmePaths = ['README.md', 'readme.md', 'README.txt'];
  
  for (const readmePath of readmePaths) {
    const fullPath = path.join(projectPath, readmePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      // Consider complete if > 500 chars
      return content.length > 500;
    }
  }
  
  return false;
}

/**
 * Count npm/pip dependencies
 * @param {string} projectPath - Project path
 * @returns {number}
 */
function countDependencies(projectPath) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      return Object.keys(deps).length;
    } catch {
      return 0;
    }
  }
  
  // Check for Python requirements
  const requirementsPath = path.join(projectPath, 'requirements.txt');
  if (fs.existsSync(requirementsPath)) {
    const content = fs.readFileSync(requirementsPath, 'utf-8');
    return content.split('\n').filter(line => line.trim() && !line.startsWith('#')).length;
  }
  
  return 0;
}

/**
 * Check for git history (rough estimate)
 * @param {string} projectPath - Project path
 * @returns {number} Estimated commit count
 */
function estimateCommits(projectPath) {
  const gitDir = path.join(projectPath, '.git');
  if (!fs.existsSync(gitDir)) return 0;
  
  try {
    // Try to read commit count from git
    const { execSync } = require('child_process');
    const count = parseInt(execSync('git rev-list --count HEAD', { 
      cwd: projectPath, 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim());
    return isNaN(count) ? 0 : count;
  } catch {
    return 0;
  }
}

/**
 * Detect project phase based on code signals
 * @param {string} projectPath - Project path
 * @param {Object} metadata - Scanner metadata
 * @returns {Object} Phase detection result
 */
export function detectPhase(projectPath, metadata = {}) {
  const fileCount = countFiles(projectPath);
  const testCount = countTestFiles(projectPath);
  const hasCi = hasCI(projectPath);
  const hasContainers = hasContainer(projectPath);
  const hasDeployConfig = hasDeploymentConfig(projectPath);
  const hasReadme = hasCompleteReadme(projectPath);
  const dependencyCount = countDependencies(projectPath);
  const commitCount = estimateCommits(projectPath);
  
  // Calculate scores for each phase
  let discoveryScore = 0;
  let buildScore = 0;
  let shipScore = 0;
  
  // Discovery signals
  if (fileCount <= THRESHOLDS.maxFilesForDiscovery) {
    discoveryScore += 3;
  }
  if (fileCount < 10) {
    discoveryScore += 2;
  }
  if (!hasCi && !hasContainers) {
    discoveryScore += 2;
  }
  if (dependencyCount < 10) {
    discoveryScore += 1;
  }
  if (commitCount < 10) {
    discoveryScore += 2;
  }
  
  // Build signals
  if (fileCount >= THRESHOLDS.minFilesForBuild && fileCount <= THRESHOLDS.maxFilesForBuild) {
    buildScore += 3;
  }
  if (dependencyCount >= 5 && dependencyCount < 30) {
    buildScore += 2;
  }
  if (hasCi) {
    buildScore += 2;
  }
  if (testCount > 0 && testCount < 10) {
    buildScore += 2;
  }
  if (commitCount >= 10 && commitCount < 100) {
    buildScore += 1;
  }
  
  // Ship signals
  if (fileCount >= THRESHOLDS.minFilesForShip) {
    shipScore += 3;
  }
  if (testCount >= THRESHOLDS.minTestsForShip) {
    shipScore += 4;
  }
  if (hasCi) {
    shipScore += 3;
  }
  if (hasContainers || hasDeployConfig) {
    shipScore += 3;
  }
  if (hasReadme) {
    shipScore += 1;
  }
  if (dependencyCount >= 20) {
    shipScore += 1;
  }
  if (commitCount >= 100) {
    shipScore += 2;
  }
  
  // Determine phase
  let phase = PHASES.BUILD; // Default
  let confidence = 0.5;
  
  if (discoveryScore > buildScore && discoveryScore > shipScore) {
    phase = PHASES.DISCOVERY;
    confidence = Math.min(0.9, discoveryScore / 15);
  } else if (shipScore > buildScore && shipScore > discoveryScore) {
    phase = PHASES.SHIP;
    confidence = Math.min(0.9, shipScore / 20);
  } else if (buildScore > discoveryScore && buildScore > shipScore) {
    phase = PHASES.BUILD;
    confidence = Math.min(0.9, buildScore / 15);
  }
  
  // Override: if metadata explicitly says something
  if (metadata.forcePhase) {
    phase = metadata.forcePhase;
    confidence = 1.0;
  }
  
  const result = {
    phase,
    confidence,
    signals: {
      fileCount,
      testCount,
      hasCI: hasCi,
      hasContainer: hasContainers,
      hasDeploymentConfig: hasDeployConfig,
      hasCompleteReadme: hasReadme,
      dependencyCount,
      commitCount
    },
    scores: {
      discovery: discoveryScore,
      build: buildScore,
      ship: shipScore
    },
    recommendations: []
  };
  
  // Add recommendations
  if (phase === PHASES.DISCOVERY && fileCount > 10) {
    result.recommendations.push('Consider moving beyond discovery: add CI/CD configuration');
  }
  if (phase === PHASES.BUILD && !hasCi) {
    result.recommendations.push('Add CI/CD pipeline before shipping');
  }
  if (phase === PHASES.BUILD && testCount < 3) {
    result.recommendations.push('Add tests before ship phase');
  }
  if (phase === PHASES.SHIP && !hasCi) {
    result.recommendations.push('WARNING: Ship phase without CI/CD detected');
  }
  
  return result;
}

export default { detectPhase, PHASES, THRESHOLDS };
