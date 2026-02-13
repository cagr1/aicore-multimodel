// Scanner Types

/**
 * Result from a language-specific detector
 * @typedef {Object} DetectorResult
 * @property {string} language - Detected language (e.g., "javascript", "python")
 * @property {string|null} framework - Detected framework (e.g., "nextjs", "django", null)
 * @property {string[]} signals - Detected signals (e.g., ["react", "typescript"])
 * @property {string[]} capabilities - Project capabilities (e.g., ["ssr", "api", "static"])
 */

/**
 * Unified scanner output
 * @typedef {Object} ScannerOutput
 * @property {string} language - Primary language detected
 * @property {string|null} framework - Framework detected
 * @property {string[]} capabilities - Project capabilities
 * @property {string[]} signals - All detected signals
 * @property {string} projectType - Project type classification
 */

/**
 * @typedef {Object} Detector
 * @property {string} name
 * @property {string[]} supportedExtensions
 * @property {function(string): DetectorResult|null} detect
 */

export default {};
