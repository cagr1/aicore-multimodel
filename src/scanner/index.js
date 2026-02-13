// Scanner - Orchestrates all detectors
import fs from 'fs';
import path from 'path';
import { detectors } from './detectors/index.js';

/**
 * Determine project type based on metadata
 * @param {Object} metadata 
 * @returns {string}
 */
function determineProjectType(metadata) {
  const { language, framework, capabilities, signals } = metadata;
  
  // API project
  if (capabilities.includes('api')) {
    return 'api';
  }
  
  // ML project
  if (capabilities.includes('ml')) {
    return 'ml';
  }
  
  // CLI project
  if (capabilities.includes('cli')) {
    return 'cli';
  }
  
  // Frontend/landing - JavaScript without API
  if (language === 'javascript' || language === 'typescript') {
    if (!capabilities.includes('api') && !signals.includes('node')) {
      return 'landing';
    }
    return 'saas';
  }
  
  // Static or unknown
  return 'unknown';
}

/**
 * Scan a project and return unified metadata
 * @param {string} projectPath 
 * @returns {Object} ScannerOutput
 */
export function scan(projectPath) {
  // Resolve to absolute path
  const absolutePath = path.resolve(projectPath);
  
  // Verify directory exists
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Project path does not exist: ${absolutePath}`);
  }
  
  if (!fs.statSync(absolutePath).isDirectory()) {
    throw new Error(`Project path is not a directory: ${absolutePath}`);
  }
  
  // Run all detectors
  const results = [];
  
  for (const detector of detectors) {
    try {
      const result = detector.detect(absolutePath);
      if (result) {
        results.push({ detector: detector.name, ...result });
      }
    } catch (e) {
      // Skip detectors that fail
      console.error(`Detector ${detector.name} failed: ${e.message}`);
    }
  }
  
  // If no detector found, return unknown
  if (results.length === 0) {
    return {
      language: 'unknown',
      framework: null,
      capabilities: [],
      signals: [],
      projectType: 'unknown'
    };
  }
  
  // Merge results - take the first one that has a framework, or the first one
  const primary = results.find(r => r.framework) || results[0];
  
  // Collect all signals and capabilities
  const allSignals = [...new Set(results.flatMap(r => r.signals))];
  const allCapabilities = [...new Set(results.flatMap(r => r.capabilities))];
  
  return {
    language: primary.language,
    framework: primary.framework,
    capabilities: allCapabilities,
    signals: allSignals,
    projectType: determineProjectType({
      language: primary.language,
      framework: primary.framework,
      capabilities: allCapabilities,
      signals: allSignals
    })
  };
}

export default { scan };
