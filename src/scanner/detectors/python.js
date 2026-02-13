// Python Detector
import fs from 'fs';
import path from 'path';

const PYTHON_EXTENSIONS = ['.py'];

/**
 * Detect Python project
 * @param {string} projectPath 
 * @returns {Object|null}
 */
export function detect(projectPath) {
  const files = fs.readdirSync(projectPath);
  const hasPy = files.some(f => {
    const ext = path.extname(f);
    return PYTHON_EXTENSIONS.includes(ext);
  });

  if (!hasPy && !files.includes('requirements.txt') && !files.includes('pyproject.toml') && !files.includes('setup.py')) {
    return null;
  }

  const signals = [];
  const capabilities = [];
  let framework = null;

  // Check for Python files
  if (hasPy) {
    signals.push('python');
  }

  // Check for common Python frameworks
  if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('setup.py')) {
    try {
      const reqFile = files.includes('requirements.txt') ? 'requirements.txt' : 
                      files.includes('pyproject.toml') ? 'pyproject.toml' : 'setup.py';
      
      const content = fs.readFileSync(path.join(projectPath, reqFile), 'utf-8');
      
      if (content.includes('django')) {
        framework = 'django';
        signals.push('django');
      } else if (content.includes('flask')) {
        framework = 'flask';
        signals.push('flask');
      } else if (content.includes('fastapi')) {
        framework = 'fastapi';
        signals.push('fastapi');
      } else if (content.includes('aiohttp')) {
        framework = 'aiohttp';
        signals.push('aiohttp');
      } else if (content.includes('pandas') || content.includes('numpy')) {
        signals.push('data-science');
        capabilities.push('ml');
      } else if (content.includes('torch') || content.includes('tensorflow') || content.includes('sklearn')) {
        signals.push('ml');
        capabilities.push('ml');
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Check for Django specific files
  if (files.includes('manage.py') || files.some(f => f.includes('settings.py'))) {
    framework = 'django';
    if (!signals.includes('django')) signals.push('django');
  }

  // API detection
  if (framework === 'fastapi' || framework === 'flask' || framework === 'django') {
    capabilities.push('api');
  }

  // ML detection
  if (signals.includes('ml') || signals.includes('data-science')) {
    capabilities.push('ml');
  }

  return {
    language: 'python',
    framework,
    signals,
    capabilities
  };
}

export default { detect };
