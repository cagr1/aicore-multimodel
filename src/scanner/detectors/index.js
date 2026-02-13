// Detectors Registry
import { detect as detectJS } from './javascript.js';
import { detect as detectPython } from './python.js';
import { detect as detectGo } from './go.js';
import { detect as detectRust } from './rust.js';
import { detect as detectPHP } from './php.js';
import { detect as detectDotNet } from './dotnet.js';

/**
 * All available detectors
 * Order matters - more specific detectors first
 */
export const detectors = [
  { name: 'javascript', detect: detectJS },
  { name: 'python', detect: detectPython },
  { name: 'dotnet', detect: detectDotNet },
  { name: 'go', detect: detectGo },
  { name: 'rust', detect: detectRust },
  { name: 'php', detect: detectPHP },
];

export default detectors;
