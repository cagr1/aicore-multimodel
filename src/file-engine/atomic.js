// Atomic Patch Manager - Apply patches atomically with rollback support
import fs from 'fs';
import path from 'path';
import { createBackup, restoreBackup } from './backup.js';
import { diffFile } from './diff.js';

/**
 * In-memory store for active patches
 * In production, this should be persisted
 */
const activePatches = new Map();

/**
 * Get snapshot directory path
 */
function getSnapshotDir(projectPath) {
  return path.join(projectPath, '.ai-core-snapshots');
}

/**
 * Create a snapshot of all files that will be modified
 * @param {string} projectPath - Project root path
 * @param {Array} proposals - Array of proposals with change objects
 * @returns {Object} Snapshot result
 */
export function createSnapshot(projectPath, files) {
  const snapshotDir = getSnapshotDir(projectPath);
  const timestamp = Date.now();
  const snapshotId = `snapshot-${timestamp}`;
  const snapshotPath = path.join(snapshotDir, snapshotId);
  
  const snapshot = {
    id: snapshotId,
    timestamp: new Date().toISOString(),
    projectPath,
    files: {},
    success: true,
    error: null
  };
  
  try {
    // Create snapshot directory
    if (!fs.existsSync(snapshotPath)) {
      fs.mkdirSync(snapshotPath, { recursive: true });
    }
    
    // Snapshot each file
    for (const file of files) {
      const fullPath = path.join(projectPath, file);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const snapshotFilePath = path.join(snapshotPath, file);
        const snapshotFileDir = path.dirname(snapshotFilePath);
        
        // Create directory structure in snapshot
        if (!fs.existsSync(snapshotFileDir)) {
          fs.mkdirSync(snapshotFileDir, { recursive: true });
        }
        
        fs.writeFileSync(snapshotFilePath, content, 'utf-8');
        snapshot.files[file] = {
          backedUp: true,
          snapshotPath: path.join(snapshotId, file)
        };
      } else {
        snapshot.files[file] = {
          backedUp: false,
          note: 'File does not exist - will be created'
        };
      }
    }
    
    return snapshot;
  } catch (error) {
    return {
      ...snapshot,
      success: false,
      error: error.message
    };
  }
}

/**
 * Prepare a patch from proposals
 * @param {Array} proposals - Array of proposals
 * @returns {Object} Prepared patch
 */
export function preparePatch(proposals) {
  if (!proposals || proposals.length === 0) {
    return {
      success: false,
      error: 'No proposals provided'
    };
  }
  
  const patchId = 'patch-' + Date.now();
  const timestamp = new Date().toISOString();
  
  // Collect all unique files from proposals
  const files = [...new Set(proposals.map(p => p.change?.file).filter(Boolean))];
  
  // Generate diffs for each proposal
  const diffs = proposals.map(proposal => {
    const change = proposal.change;
    if (!change) return null;
    
    const diffResult = diffFile(change);
    return {
      proposalId: proposal.id,
      agent: proposal.agent,
      change,
      diff: diffResult
    };
  }).filter(Boolean);
  
  return {
    success: true,
    patchId,
    timestamp,
    files,
    proposals: proposals.map(p => p.id),
    diffs,
    status: 'prepared',
    snapshots: {}
  };
}

/**
 * Simulate run checks (lint, tests, etc.)
 * This is a placeholder - in production, actual checks would run
 * @param {string} projectPath 
 * @returns {Object} Check result
 */
export function runChecks(projectPath) {
  // Simulate checks - in production this would run actual tests/lint
  // For now, randomly succeed (or always succeed for deterministic behavior)
  const shouldPass = process.env.ATOMIC_CHECKS_PASS !== 'false';
  
  return {
    success: shouldPass,
    checks: [
      { name: 'syntax', status: 'passed' },
      { name: 'imports', status: 'passed' },
      { name: 'format', status: shouldPass ? 'passed' : 'failed' }
    ],
    timestamp: new Date().toISOString()
  };
}

/**
 * Apply atomic patch - all or nothing
 * @param {string} projectPath 
 * @param {Object} patch - Prepared patch
 * @returns {Object} Apply result
 */
export function applyAtomic(projectPath, patch) {
  if (!patch || !patch.success) {
    return {
      success: false,
      error: 'Invalid patch'
    };
  }
  
  if (patch.status !== 'prepared') {
    return {
      success: false,
      error: 'Patch not prepared'
    };
  }
  
  const { patchId, files } = patch;
  
  // Step 1: Create snapshot before applying
  console.error('[Atomic] Creating snapshot for:', files.join(', '));
  const snapshot = createSnapshot(projectPath, files);
  
  if (!snapshot.success) {
    return {
      success: false,
      error: 'Failed to create snapshot: ' + snapshot.error
    };
  }
  
  // Store snapshot reference in patch
  patch.snapshotId = snapshot.id;
  patch.status = 'applying';
  
  // Step 2: Apply all changes
  const appliedFiles = [];
  const errors = [];
  
  for (const diff of patch.diffs) {
    const { change } = diff;
    const fullPath = path.join(projectPath, change.file);
    
    try {
      // Create backup for each file
      if (change.type !== 'create') {
        const backupResult = createBackup(projectPath, change.file);
        if (!backupResult.success) {
          console.error('[Atomic] Backup warning:', backupResult.error);
        }
      }
      
      // Apply change
      if (change.type === 'create') {
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, change.content, 'utf-8');
      } else if (change.type === 'update') {
        fs.writeFileSync(fullPath, change.content, 'utf-8');
      } else if (change.type === 'delete') {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
      
      appliedFiles.push(change.file);
      console.error('[Atomic] Applied:', change.file);
    } catch (error) {
      errors.push({ file: change.file, error: error.message });
      console.error('[Atomic] Error applying:', change.file, error.message);
    }
  }
  
  // Step 3: Run checks
  console.error('[Atomic] Running checks...');
  const checkResult = runChecks(projectPath);
  
  // Step 4: If checks fail, rollback
  if (!checkResult.success) {
    console.error('[Atomic] Checks failed, rolling back...');
    
    const rollbackResult = rollback(projectPath, patchId);
    
    return {
      success: false,
      applied: appliedFiles,
      rolledBack: rollbackResult.success,
      rollbackError: rollbackResult.error,
      checkResult,
      error: 'Checks failed - rolled back'
    };
  }
  
  // Success
  patch.status = 'applied';
  
  // Store patch for potential rollback
  activePatches.set(patchId, {
    ...patch,
    projectPath,
    appliedFiles,
    appliedAt: new Date().toISOString()
  });
  
  return {
    success: true,
    patchId,
    snapshotId: snapshot.id,
    applied: appliedFiles,
    checkResult,
    diffs: patch.diffs.map(d => ({
      proposalId: d.proposalId,
      file: d.change.file,
      diff: d.diff.diff
    }))
  };
}

/**
 * Rollback a patch by patchId
 * @param {string} projectPath 
 * @param {string} patchId 
 * @returns {Object} Rollback result
 */
export function rollback(projectPath, patchId) {
  // Try to find patch in active patches
  const patch = activePatches.get(patchId);
  
  if (!patch) {
    // Try to find by snapshot
    const snapshotDir = getSnapshotDir(projectPath);
    
    if (!fs.existsSync(snapshotDir)) {
      return {
        success: false,
        error: 'No snapshots found'
      };
    }
    
    // Look for snapshot directory
    const snapshotPath = path.join(snapshotDir, patchId);
    
    if (!fs.existsSync(snapshotPath)) {
      // Try finding by prefix
      const snapshots = fs.readdirSync(snapshotDir);
      const matching = snapshots.find(s => s.includes(patchId) || s.includes('snapshot'));
      
      if (matching) {
        return rollback(projectPath, matching);
      }
      
      return {
        success: false,
        error: 'Patch not found: ' + patchId
      };
    }
    
    // Restore from snapshot - handle both files and directories
    try {
      const items = fs.readdirSync(snapshotPath, { withFileTypes: true });
      const restoredFiles = [];
      
      for (const item of items) {
        const itemPath = path.join(snapshotPath, item.name);
        const destPath = path.join(projectPath, item.name);
        
        if (item.isDirectory()) {
          // Recursively restore directory
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          const subFiles = fs.readdirSync(itemPath);
          for (const subFile of subFiles) {
            const subSrc = path.join(itemPath, subFile);
            const subDest = path.join(destPath, subFile);
            try {
              if (fs.statSync(subSrc).isFile()) {
                fs.copyFileSync(subSrc, subDest);
                restoredFiles.push(item.name + '/' + subFile);
              }
            } catch (e) {
              console.error('[Atomic] Error restoring:', subFile, e.message);
            }
          }
        } else if (item.isFile()) {
          const dir = path.dirname(destPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.copyFileSync(itemPath, destPath);
          restoredFiles.push(item.name);
        }
      }
      
      return {
        success: true,
        patchId,
        restoredFiles
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Restore from stored patch data
  const { appliedFiles, snapshotId } = patch;
  const snapshotPath = path.join(getSnapshotDir(projectPath), snapshotId);
  
  for (const file of appliedFiles) {
    const fullPath = path.join(projectPath, file);
    const snapshotFilePath = path.join(snapshotPath, file);
    
    try {
      if (fs.existsSync(snapshotFilePath)) {
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.copyFileSync(snapshotFilePath, fullPath);
        console.error('[Atomic] Restored:', file);
      }
    } catch (error) {
      console.error('[Atomic] Error restoring:', file, error.message);
    }
  }
  
  // Clean up
  activePatches.delete(patchId);
  
  return {
    success: true,
    patchId,
    restoredFiles: appliedFiles
  };
}

/**
 * Get patch status
 * @param {string} patchId 
 * @returns {Object} Patch status
 */
export function getPatchStatus(patchId) {
  const patch = activePatches.get(patchId);
  
  if (!patch) {
    return {
      found: false,
      error: 'Patch not found'
    };
  }
  
  return {
    found: true,
    patchId: patch.patchId,
    status: patch.status,
    appliedFiles: patch.appliedFiles,
    appliedAt: patch.appliedAt
  };
}

export default {
  preparePatch,
  applyAtomic,
  rollback,
  getPatchStatus,
  runChecks,
  createSnapshot
};
