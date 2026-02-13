// File Engine Types

/**
 * File change to apply
 * @typedef {Object} FileChange
 * @property {string} type - 'create', 'update', 'delete'
 * @property {string} file - Relative path
 * @property {string} content - New content (for create/update)
 * @property {string} originalContent - Original content (for update)
 */

/**
 * Diff result
 * @typedef {Object} DiffResult
 * @property {boolean} success
 * @property {string} file
 * @property {string} diff - Unified diff format
 * @property {number} additions
 * @property {number} deletions
 */

/**
 * Backup result
 * @typedef {Object} BackupResult
 * @property {boolean} success
 * @property {string} backupPath
 * @property {string} originalPath
 */

/**
 * Apply result
 * @typedef {Object} ApplyResult
 * @property {boolean} success
 * @property {string} file
 * @property {string} action - 'created', 'updated', 'deleted'
 * @property {string} backupPath - If backup was created
 */

export default {};
