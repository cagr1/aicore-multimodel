// Memory Storage - Minimal append-only JSONL persistence
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

// Configuration
const DEFAULT_MEMORY_DIR = path.join(os.homedir(), '.ai-core', 'projects');
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Get memory configuration
 */
function getConfig() {
  return {
    memoryDir: process.env.AI_CORE_MEMORY_DIR || DEFAULT_MEMORY_DIR,
    maxFileSize: parseInt(process.env.AI_CORE_MAX_FILE_SIZE || DEFAULT_MAX_FILE_SIZE, 10),
  };
}

/**
 * Get memory directory
 */
function getMemoryDir() {
  const { memoryDir } = getConfig();
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
  return memoryDir;
}

/**
 * Generate hash from project path
 */
export function hashProjectPath(projectPath) {
  return crypto.createHash('md5').update(path.resolve(projectPath)).digest('hex').substring(0, 8);
}

/**
 * Get project memory file path
 */
function getProjectMemoryPath(projectPath) {
  const hash = hashProjectPath(projectPath);
  const projectDir = path.join(getMemoryDir(), hash);
  
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  
  return path.join(projectDir, 'runs.jsonl');
}

/**
 * Get project stats
 */
function getProjectStats(projectPath) {
  const memoryPath = getProjectMemoryPath(projectPath);
  
  if (!fs.existsSync(memoryPath)) {
    return { size: 0, runs: 0 };
  }
  
  const stats = fs.statSync(memoryPath);
  const runs = getRunCount(projectPath);
  
  return {
    size: stats.size,
    runs
  };
}

/**
 * Check and rotate if file exceeds max size
 */
function rotateIfNeeded(projectPath) {
  const { maxFileSize } = getConfig();
  const stats = getProjectStats(projectPath);
  
  if (stats.size >= maxFileSize) {
    const memoryPath = getProjectMemoryPath(projectPath);
    const backupPath = memoryPath + '.old';
    
    // Simple rename to backup
    if (fs.existsSync(memoryPath)) {
      fs.renameSync(memoryPath, backupPath);
    }
  }
}

/**
 * Append a run record to memory - MINIMAL append-only
 */
export function appendRun(projectPath, record) {
  const memoryPath = getProjectMemoryPath(projectPath);
  
  // Check size and rotate if needed
  rotateIfNeeded(projectPath);
  
  const runRecord = {
    timestamp: new Date().toISOString(),
    projectHash: hashProjectPath(projectPath),
    projectPath: path.resolve(projectPath),
    ...record
  };
  
  const line = JSON.stringify(runRecord) + '\n';
  fs.appendFileSync(memoryPath, line, 'utf-8');
  
  return runRecord;
}

/**
 * Get all runs for a project
 */
export function getRuns(projectPath) {
  const memoryPath = getProjectMemoryPath(projectPath);
  
  if (!fs.existsSync(memoryPath)) {
    return [];
  }
  
  const content = fs.readFileSync(memoryPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }).filter(r => r);
}

/**
 * Get run count for a project
 */
export function getRunCount(projectPath) {
  return getRuns(projectPath).length;
}

/**
 * Get memory reference for the last run
 */
export function getMemoryReference(projectPath) {
  const hash = hashProjectPath(projectPath);
  const count = getRunCount(projectPath);
  
  return `${hash}/run-${count}`;
}

/**
 * Get memory status for a project
 */
export function getMemoryStatus(projectPath) {
  const stats = getProjectStats(projectPath);
  const { maxFileSize } = getConfig();
  
  return {
    projectHash: hashProjectPath(projectPath),
    runs: stats.runs,
    sizeBytes: stats.size,
    sizeKB: Math.round(stats.size / 1024),
    maxSizeBytes: maxFileSize,
    percentUsed: Math.round((stats.size / maxFileSize) * 100),
    withinLimits: stats.size < maxFileSize
  };
}

/**
 * Get configuration
 */
export function getMemoryConfig() {
  return getConfig();
}

export default {
  appendRun,
  getRuns,
  getRunCount,
  getMemoryReference,
  getMemoryStatus,
  getMemoryConfig,
  hashProjectPath
};
