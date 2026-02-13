// Rust Detector
import fs from 'fs';
import path from 'path';

/**
 * Detect Rust project
 * @param {string} projectPath 
 * @returns {Object|null}
 */
export function detect(projectPath) {
  const files = fs.readdirSync(projectPath);
  
  // Check for Rust files
  const hasRustFiles = files.some(f => f.endsWith('.rs'));
  const hasCargoToml = files.includes('Cargo.toml');
  
  if (!hasRustFiles && !hasCargoToml) {
    return null;
  }

  const signals = [];
  const capabilities = [];
  let framework = null;

  signals.push('rust');

  // Check for Cargo.toml
  if (hasCargoToml) {
    try {
      const content = fs.readFileSync(path.join(projectPath, 'Cargo.toml'), 'utf-8');
      
      if (content.includes('actix')) {
        framework = 'actix';
        signals.push('actix');
      } else if (content.includes('warp')) {
        framework = 'warp';
        signals.push('warp');
      } else if (content.includes('axum')) {
        framework = 'axum';
        signals.push('axum');
      } else if (content.includes('rocket')) {
        framework = 'rocket';
        signals.push('rocket');
      } else if (content.includes('tide')) {
        framework = 'tide';
        signals.push('tide');
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Web/WASM detection
  if (files.includes('webpack.config.js') || files.some(f => f.endsWith('.wasm'))) {
    signals.push('wasm');
    capabilities.push('wasm');
  }

  // CLI detection
  if (files.some(f => f.includes('main.rs')) && files.includes('Cargo.toml')) {
    capabilities.push('cli');
  }

  // API detection
  if (framework) {
    capabilities.push('api');
  }

  return {
    language: 'rust',
    framework,
    signals,
    capabilities
  };
}

export default { detect };
