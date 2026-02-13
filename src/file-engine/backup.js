// Backup Manager - Automatic backup before modifications
import fs from 'fs';
import path from 'path';

/**
 * Get backup directory path
 */
function getBackupDir(projectPath) {
  return path.join(projectPath, '.ai-core-backups');
}

/**
 * Create backup of a file
 * @param {string} projectPath - Project root path
 * @param {string} filePath - Relative file path
 * @returns {Object} BackupResult
 */
export function createBackup(projectPath, filePath) {
  const fullPath = path.join(projectPath, filePath);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      backupPath: '',
      originalPath: filePath,
      error: 'File does not exist'
    };
  }
  
  // Create backup directory
  const backupDir = getBackupDir(projectPath);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Generate backup filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const backupName = `${baseName}_${timestamp}${ext}`;
  const backupPath = path.join(backupDir, backupName);
  
  try {
    // Read original file
    const content = fs.readFileSync(fullPath);
    
    // Write to backup
    fs.writeFileSync(backupPath, content);
    
    return {
      success: true,
      backupPath: path.join('.ai-core-backups', backupName),
      originalPath: filePath
    };
  } catch (error) {
    return {
      success: false,
      backupPath: '',
      originalPath: filePath,
      error: error.message
    };
  }
}

/**
 * Restore from backup
 * @param {string} backupPath - Full backup path
 * @param {string} originalPath - Original file path
 * @returns {boolean} Success
 */
export function restoreBackup(backupPath, originalPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      return false;
    }
    
    const content = fs.readFileSync(backupPath);
    fs.writeFileSync(originalPath, content);
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * List all backups for a project
 * @param {string} projectPath 
 * @returns {Array} List of backup files
 */
export function listBackups(projectPath) {
  const backupDir = getBackupDir(projectPath);
  
  if (!fs.existsSync(backupDir)) {
    return [];
  }
  
  const files = fs.readdirSync(backupDir);
  
  return files
    .filter(f => !f.startsWith('.'))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      created: fs.statSync(path.join(backupDir, f)).birthtime
    }))
    .sort((a, b) => b.created - a.created);
}

export default { createBackup, restoreBackup, listBackups };
