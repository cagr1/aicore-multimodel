// Memory Module - Controlled Memory
import * as storage from './storage.js';

export const memory = {
  /**
   * Save a run to memory (with automatic redaction)
   */
  saveRun(projectPath, agents, userIntent, success, summary) {
    return storage.appendRun(projectPath, {
      agents,
      userIntent,
      success,
      summary
    });
  },
  
  /**
   * Get memory reference
   */
  getReference(projectPath) {
    return storage.getMemoryReference(projectPath);
  },
  
  /**
   * Get all runs for a project
   */
  getProjectRuns(projectPath) {
    return storage.getRuns(projectPath);
  },
  
  /**
   * Get memory status (size, runs, limits, TTL)
   */
  getStatus(projectPath) {
    return storage.getMemoryStatus(projectPath);
  },
  
  /**
   * Get current configuration
   */
  getConfig() {
    return storage.getMemoryConfig();
  },
  
  // Admin functions
  
  /**
   * Purge expired records for a project (TTL)
   */
  purgeExpired(projectPath) {
    return storage.purgeExpired(projectPath);
  },
  
  /**
   * Purge all records for a project
   */
  purgeAll(projectPath, reason = 'manual') {
    return storage.purgeAll(projectPath, reason);
  },
  
  /**
   * Get all projects with their stats
   */
  getAllProjects() {
    return storage.getAllProjects();
  },
  
  /**
   * Bulk purge expired records from all projects
   */
  purgeAllExpired() {
    return storage.purgeAllExpired();
  },
  
  /**
   * Get purge/rotation logs
   */
  getPurgeLogs(limit = 100) {
    return storage.getPurgeLogs(limit);
  }
};

export default memory;
