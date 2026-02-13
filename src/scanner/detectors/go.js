// Go Detector
import fs from 'fs';
import path from 'path';

/**
 * Detect Go project
 * @param {string} projectPath 
 * @returns {Object|null}
 */
export function detect(projectPath) {
  const files = fs.readdirSync(projectPath);
  
  // Check for Go module or package files
  const hasGoFiles = files.some(f => f.endsWith('.go'));
  const hasGoMod = files.includes('go.mod');
  
  if (!hasGoFiles && !hasGoMod) {
    return null;
  }

  const signals = [];
  const capabilities = [];
  let framework = null;

  signals.push('go');

  // Check for Go frameworks
  if (hasGoMod) {
    try {
      const content = fs.readFileSync(path.join(projectPath, 'go.mod'), 'utf-8');
      
      if (content.includes('gin-gonic')) {
        framework = 'gin';
        signals.push('gin');
      } else if (content.includes('fiber')) {
        framework = 'fiber';
        signals.push('fiber');
      } else if (content.includes('echo')) {
        framework = 'echo';
        signals.push('echo');
      } else if (content.includes('gorilla')) {
        framework = 'gorilla';
        signals.push('gorilla');
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // API detection
  if (framework) {
    capabilities.push('api');
  }

  // CLI detection
  if (files.some(f => f.includes('cmd'))) {
    capabilities.push('cli');
  }

  return {
    language: 'go',
    framework,
    signals,
    capabilities
  };
}

export default { detect };
