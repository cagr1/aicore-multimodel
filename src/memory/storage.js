// Memory Storage - Minimal append-only JSONL persistence with TTL and redaction
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

// Configuration
const DEFAULT_MEMORY_DIR = path.join(os.homedir(), '.ai-core', 'projects');
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_TTL_DAYS = 30;

/**
 * Redaction patterns for PII
 */
const REDACTION_PATTERNS = {
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Phone numbers (various formats)
  phone: /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g,
  
  // API Keys (generic patterns)
  apiKey: /(?:api[_-]?key|apikey|api_secret|secret_key)["']?\s*[:=]\s*["']?([^"'\s]{8,})/gi,
  
  // AWS Keys
  awsKey: /(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}/g,
  
  // JWT Tokens
  jwt: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  
  // Generic secrets
  secret: /(?:password|passwd|pwd|token|auth)["']?\s*[:=]\s*["']?([^"'\s]{8,})/gi,
  
  // IPv4 addresses (optional - comment out if not needed)
  // ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

/**
 * Redact PII from a string
 */
function redactString(str) {
  if (!str || typeof str !== 'string') return str;
  
  let result = str;
  
  // Replace emails
  result = result.replace(REDACTION_PATTERNS.email, '[EMAIL_REDACTED]');
  
  // Replace phone numbers
  result = result.replace(REDACTION_PATTERNS.phone, '[PHONE_REDACTED]');
  
  // Replace API keys
  result = result.replace(REDACTION_PATTERNS.apiKey, (match, p1) => {
    return match.replace(p1, '***REDACTED***');
  });
  
  // Replace AWS keys
  result = result.replace(REDACTION_PATTERNS.awsKey, '[AWS_KEY_REDACTED]');
  
  // Replace JWT tokens
  result = result.replace(REDACTION_PATTERNS.jwt, '[JWT_REDACTED]');
  
  // Replace generic secrets
  result = result.replace(REDACTION_PATTERNS.secret, (match, p1) => {
    return match.replace(p1, '***REDACTED***');
  });
  
  return result;
}

/**
 * Recursively redact PII from an object
 */
function redactObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return redactString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item));
  }
  
  if (typeof obj === 'object') {
    const redacted = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive keys
      const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credentials'];
      const isSensitive = sensitiveKeys.some(k => key.toLowerCase().includes(k));
      
      if (isSensitive && typeof value === 'string') {
        redacted[key] = '***REDACTED***';
      } else {
        redacted[key] = redactObject(value);
      }
    }
    return redacted;
  }
  
  return obj;
}

/**
 * Get configuration
 */
function getConfig() {
  return {
    memoryDir: process.env.AI_CORE_MEMORY_DIR || DEFAULT_MEMORY_DIR,
    maxFileSize: parseInt(process.env.AI_CORE_MAX_FILE_SIZE || DEFAULT_MAX_FILE_SIZE, 10),
    ttlDays: parseInt(process.env.AI_CORE_TTL_DAYS || DEFAULT_TTL_DAYS, 10),
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
 * Log to purge log file
 */
function logPurge(action, details) {
  const logPath = path.join(getMemoryDir(), 'purge.log');
  const timestamp = new Date().toISOString();
  const logEntry = JSON.stringify({ timestamp, action, ...details }) + '\n';
  
  try {
    fs.appendFileSync(logPath, logEntry, 'utf-8');
  } catch (e) {
    console.error('[Storage] Failed to write purge log:', e.message);
  }
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
    const timestamp = Date.now();
    const backupPath = memoryPath + `.${timestamp}.old`;
    
    // Simple rename to backup
    if (fs.existsSync(memoryPath)) {
      fs.renameSync(memoryPath, backupPath);
      logPurge('rotate', { projectPath: hashProjectPath(projectPath), backupPath });
    }
  }
}

/**
 * Calculate TTL cutoff date
 */
function getTTLCutoff() {
  const { ttlDays } = getConfig();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ttlDays);
  return cutoff;
}

/**
 * Check if a record is expired based on TTL
 */
function isExpired(record) {
  const cutoff = getTTLCutoff();
  const recordDate = new Date(record.timestamp);
  return recordDate < cutoff;
}

/**
 * Purge expired records from a project
 */
export function purgeExpired(projectPath) {
  const memoryPath = getProjectMemoryPath(projectPath);
  
  if (!fs.existsSync(memoryPath)) {
    return { purged: 0, remaining: 0 };
  }
  
  const content = fs.readFileSync(memoryPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  const cutoff = getTTLCutoff();
  const validRecords = [];
  let purgedCount = 0;
  
  for (const line of lines) {
    try {
      const record = JSON.parse(line);
      const recordDate = new Date(record.timestamp);
      
      if (recordDate >= cutoff) {
        validRecords.push(line);
      } else {
        purgedCount++;
      }
    } catch (e) {
      // Skip invalid lines
    }
  }
  
  // Write back valid records
  fs.writeFileSync(memoryPath, validRecords.join('\n') + '\n', 'utf-8');
  
  logPurge('ttl_purge', { 
    projectPath: hashProjectPath(projectPath), 
    purgedCount,
    remaining: validRecords.length 
  });
  
  return { 
    purged: purgedCount, 
    remaining: validRecords.length 
  };
}

/**
 * Purge all records for a project (admin action)
 */
export function purgeAll(projectPath, reason = 'manual') {
  const memoryPath = getProjectMemoryPath(projectPath);
  const stats = getProjectStats(projectPath);
  
  if (!fs.existsSync(memoryPath)) {
    return { purged: 0 };
  }
  
  // Move to backup before deleting
  const backupPath = memoryPath + `.${Date.now()}.backup`;
  fs.renameSync(memoryPath, backupPath);
  
  logPurge('purge_all', { 
    projectPath: hashProjectPath(projectPath), 
    reason,
    recordsPurged: stats.runs,
    backupPath
  });
  
  return { 
    purged: stats.runs,
    backupPath
  };
}

/**
 * Get all projects with their stats
 */
export function getAllProjects() {
  const memoryDir = getMemoryDir();
  const projects = [];
  
  if (!fs.existsSync(memoryDir)) {
    return projects;
  }
  
  const entries = fs.readdirSync(memoryDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const projectHash = entry.name;
      const projectDir = path.join(memoryDir, projectHash);
      const memoryPath = path.join(projectDir, 'runs.jsonl');
      
      if (fs.existsSync(memoryPath)) {
        const stats = fs.statSync(memoryPath);
        const content = fs.readFileSync(memoryPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        
        // Check for expired records
        const cutoff = getTTLCutoff();
        let expiredCount = 0;
        
        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            const recordDate = new Date(record.timestamp);
            if (recordDate < cutoff) expiredCount++;
          } catch (e) {}
        }
        
        projects.push({
          projectHash,
          sizeBytes: stats.size,
          runs: lines.length,
          expiredCount,
          lastModified: stats.mtime
        });
      }
    }
  }
  
  return projects;
}

/**
 * Admin: Purge expired records from all projects
 */
export function purgeAllExpired() {
  const projects = getAllProjects();
  let totalPurged = 0;
  let totalRemaining = 0;
  
  for (const project of projects) {
    if (project.expiredCount > 0) {
      // Reconstruct path and purge
      const projectDir = path.join(getMemoryDir(), project.projectHash);
      const memoryPath = path.join(projectDir, 'runs.jsonl');
      
      if (fs.existsSync(memoryPath)) {
        const content = fs.readFileSync(memoryPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        
        const cutoff = getTTLCutoff();
        const validRecords = [];
        let purged = 0;
        
        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            const recordDate = new Date(record.timestamp);
            
            if (recordDate >= cutoff) {
              validRecords.push(line);
            } else {
              purged++;
            }
          } catch (e) {}
        }
        
        fs.writeFileSync(memoryPath, validRecords.join('\n') + '\n', 'utf-8');
        
        totalPurged += purged;
        totalRemaining += validRecords.length;
      }
    }
  }
  
  logPurge('bulk_ttl_purge', { 
    projectsProcessed: projects.length,
    totalPurged,
    totalRemaining
  });
  
  return { 
    projectsProcessed: projects.length,
    totalPurged, 
    totalRemaining 
  };
}

/**
 * Get purge logs
 */
export function getPurgeLogs(limit = 100) {
  const logPath = path.join(getMemoryDir(), 'purge.log');
  
  if (!fs.existsSync(logPath)) {
    return [];
  }
  
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim()).reverse();
  
  return lines.slice(0, limit).map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return { raw: line };
    }
  });
}

/**
 * Append a run record to memory - with redaction and TTL check
 */
export function appendRun(projectPath, record) {
  const memoryPath = getProjectMemoryPath(projectPath);
  
  // Check size and rotate if needed
  rotateIfNeeded(projectPath);
  
  // Purge expired before adding new record
  purgeExpired(projectPath);
  
  // Redact PII from record
  const redactedRecord = redactObject(record);
  
  const runRecord = {
    timestamp: new Date().toISOString(),
    projectHash: hashProjectPath(projectPath),
    projectPath: path.resolve(projectPath),
    ...redactedRecord
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
  const { maxFileSize, ttlDays } = getConfig();
  
  // Check for expired
  const runs = getRuns(projectPath);
  const cutoff = getTTLCutoff();
  const expiredCount = runs.filter(r => new Date(r.timestamp) < cutoff).length;
  
  return {
    projectHash: hashProjectPath(projectPath),
    runs: stats.runs,
    sizeBytes: stats.size,
    sizeKB: Math.round(stats.size / 1024),
    maxSizeBytes: maxFileSize,
    percentUsed: Math.round((stats.size / maxFileSize) * 100),
    ttlDays,
    expiredCount,
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
  hashProjectPath,
  purgeExpired,
  purgeAll,
  purgeAllExpired,
  getAllProjects,
  getPurgeLogs,
  redactObject
};
