// Memory Module - Controlled Memory
import * as storage from './storage.js';

export const memory = {
  /**
   * Save a run to memory
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
   * Get memory status (size, runs, limits)
   */
  getStatus(projectPath) {
    return storage.getMemoryStatus(projectPath);
  },
  
  /**
   * Get current configuration
   */
  getConfig() {
    return {
      memoryDir: process.env.AI_CORE_MEMORY_DIR || storage.DEFAULT_MEMORY_DIR,
      maxFileSize: parseInt(process.env.AI_CORE_MAX_FILE_SIZE || '10485760', 10),
      maxRuns: parseInt(process.env.AI_CORE_MAX_RUNS || '1000', 10),
    };
  }
};

export default memory;
