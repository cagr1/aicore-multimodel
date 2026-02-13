// File Applier - Apply changes to files
import fs from 'fs';
import path from 'path';
import { createBackup } from './backup.js';

/**
 * Apply from './backup.js a file change
 * @param {string} projectPath - Project root path
 * @param {Object} change - FileChange object
 * @param {boolean} dryRun - If true, don't actually apply
 * @param {boolean} backup - If true, create backup before modifying
 * @returns {Object} ApplyResult
 */
export function applyChange(projectPath, change, { dryRun = false, backup = true } = {}) {
  const { file, type, content } = change;
  const fullPath = path.join(projectPath, file);
  
  try {
    // Handle different change types
    if (type === 'create') {
      if (dryRun) {
        return {
          success: true,
          file,
          action: 'would_create',
          dryRun: true
        };
      }
      
      // Create directory if needed
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Create file
      fs.writeFileSync(fullPath, content, 'utf-8');
      
      return {
        success: true,
        file,
        action: 'created',
        dryRun: false
      };
    }
    
    if (type === 'update') {
      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          file,
          action: 'error',
          error: 'File does not exist'
        };
      }
      
      // Create backup if requested
      let backupPath = '';
      if (backup) {
        const backupResult = createBackup(projectPath, file);
        backupPath = backupResult.backupPath;
      }
      
      if (dryRun) {
        return {
          success: true,
          file,
          action: 'would_update',
          backupPath,
          dryRun: true
        };
      }
      
      // Read original, apply change
      const original = fs.readFileSync(fullPath, 'utf-8');
      
      // Apply simple content replacement (could be enhanced)
      // For now, just write the new content
      fs.writeFileSync(fullPath, content, 'utf-8');
      
      return {
        success: true,
        file,
        action: 'updated',
        backupPath,
        dryRun: false
      };
    }
    
    if (type === 'delete') {
      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          file,
          action: 'error',
          error: 'File does not exist'
        };
      }
      
      // Create backup if requested
      let backupPath = '';
      if (backup) {
        const backupResult = createBackup(projectPath, file);
        backupPath = backupResult.backupPath;
      }
      
      if (dryRun) {
        return {
          success: true,
          file,
          action: 'would_delete',
          backupPath,
          dryRun: true
        };
      }
      
      // Delete file
      fs.unlinkSync(fullPath);
      
      return {
        success: true,
        file,
        action: 'deleted',
        backupPath,
        dryRun: false
      };
    }
    
    return {
      success: false,
      file,
      action: 'error',
      error: 'Unknown change type'
    };
    
  } catch (error) {
    return {
      success: false,
      file,
      action: 'error',
      error: error.message
    };
  }
}

/**
 * Apply multiple changes
 * @param {string} projectPath 
 * @param {Array} changes - Array of FileChange
 * @param {Object} options - { dryRun, backup }
 * @returns {Array} Array of ApplyResult
 */
export function applyChanges(projectPath, changes, options = {}) {
  const results = [];
  
  for (const change of changes) {
    const result = applyChange(projectPath, change, options);
    results.push(result);
    
    // Stop on first error if not dryRun
    if (!result.success && !options.dryRun) {
      break;
    }
  }
  
  return results;
}

export default { applyChange, applyChanges };
