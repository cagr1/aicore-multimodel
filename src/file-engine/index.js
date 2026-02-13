// File Engine - Main interface for file modifications
import { diffFile } from './diff.js';
import { createBackup, restoreBackup, listBackups } from './backup.js';
import { applyChange, applyChanges } from './applier.js';

/**
 * Generate diff for changes
 * @param {Array} changes - Array of FileChange
 * @returns {Array} Array of diff results
 */
export function generateDiffs(changes) {
  return changes.map(change => diffFile(change));
}

/**
 * Preview changes (dry-run)
 * @param {string} projectPath 
 * @param {Array} changes 
 * @returns {Array} Array of apply results (dry-run)
 */
export function previewChanges(projectPath, changes) {
  return applyChanges(projectPath, changes, { dryRun: true, backup: false });
}

/**
 * Apply changes with backup
 * @param {string} projectPath 
 * @param {Array} changes 
 * @returns {Array} Array of apply results
 */
export function applyWithBackup(projectPath, changes) {
  return applyChanges(projectPath, changes, { dryRun: false, backup: true });
}

/**
 * Apply changes without backup
 * @param {string} projectPath 
 * @param {Array} changes 
 * @returns {Array} Array of apply results
 */
export function applyWithoutBackup(projectPath, changes) {
  return applyChanges(projectPath, changes, { dryRun: false, backup: false });
}

export const fileEngine = {
  diff: diffFile,
  generateDiffs,
  previewChanges,
  applyWithBackup,
  applyWithoutBackup,
  createBackup,
  restoreBackup,
  listBackups
};

export default fileEngine;
