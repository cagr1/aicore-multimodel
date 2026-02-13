// PHP Detector
import fs from 'fs';
import path from 'path';

const PHP_EXTENSIONS = ['.php'];

/**
 * Detect PHP project
 * @param {string} projectPath 
 * @returns {Object|null}
 */
export function detect(projectPath) {
  const files = fs.readdirSync(projectPath);
  const hasPhp = files.some(f => {
    const ext = path.extname(f);
    return PHP_EXTENSIONS.includes(ext);
  });

  if (!hasPhp && !files.includes('composer.json')) {
    return null;
  }

  const signals = [];
  const capabilities = [];
  let framework = null;

  signals.push('php');

  // Check composer.json
  if (files.includes('composer.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'composer.json'), 'utf-8'));
      const deps = { ...pkg.require, ...pkg.requireDev };
      
      if (deps.laravel || deps['laravel/framework']) {
        framework = 'laravel';
        signals.push('laravel');
      } else if (deps.symfony || deps['symfony/skeleton']) {
        framework = 'symfony';
        signals.push('symfony');
      } else if (deps.codeigniter) {
        framework = 'codeigniter';
        signals.push('codeigniter');
      } else if (deps.yii2 || deps.yii3) {
        framework = 'yii';
        signals.push('yii');
      } else if (deps.slim) {
        framework = 'slim';
        signals.push('slim');
      } else if (deps.lumen) {
        framework = 'lumen';
        signals.push('lumen');
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Check for Laravel specific files
  if (files.includes('artisan') || files.includes('bootstrap/app.php')) {
    framework = 'laravel';
    if (!signals.includes('laravel')) signals.push('laravel');
  }

  // API detection
  if (framework === 'laravel' || framework === 'symfony' || framework === 'slim' || framework === 'lumen') {
    capabilities.push('api');
  }

  return {
    language: 'php',
    framework,
    signals,
    capabilities
  };
}

export default { detect };
