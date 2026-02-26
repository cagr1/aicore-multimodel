/**
 * AB Test Configuration Module
 * 
 * Manages thresholds for auto-apply and LLM fallback decisions.
 * Tracks daily auto-apply counts and triggers alerts.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration
const DEFAULT_CONFIG = {
  autoApply: 0.75,
  llmFallback: 0.4,
  maxAutoApplyPerDay: 10,
  forceApplyAllowed: false
};

// In-memory state
let config = { ...DEFAULT_CONFIG };
let dailyApplyCounts = {};
let lastResetDate = null;

/**
 * Get config directory path
 */
function getConfigDir() {
  return path.join(process.cwd(), 'config');
}

/**
 * Load configuration from file
 */
export function loadABConfig() {
  const configPath = path.join(getConfigDir(), 'ab_config.json');
  
  try {
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      const loadedConfig = JSON.parse(fileContent);
      
      // Merge with defaults
      config = { ...DEFAULT_CONFIG, ...loadedConfig };
      
      console.error('[AB Config] Loaded:', JSON.stringify(config, null, 2));
    } else {
      console.error('[AB Config] File not found, using defaults:', DEFAULT_CONFIG);
    }
  } catch (error) {
    console.error('[AB Config] Error loading config:', error.message);
  }
  
  return config;
}

/**
 * Get current configuration
 */
export function getABConfig() {
  return { ...config };
}

/**
 * Get threshold for auto-apply
 */
export function getAutoApplyThreshold() {
  return config.autoApply;
}

/**
 * Get threshold for LLM fallback
 */
export function getLLMFallbackThreshold() {
  return config.llmFallback;
}

/**
 * Check if force apply is allowed
 */
export function isForceApplyAllowed() {
  return config.forceApplyAllowed;
}

/**
 * Get max auto-apply per day
 */
export function getMaxAutoApplyPerDay() {
  return config.maxAutoApplyPerDay;
}

/**
 * Reset daily counts if it's a new day
 */
function checkDailyReset() {
  const today = new Date().toISOString().split('T')[0];
  
  if (lastResetDate !== today) {
    dailyApplyCounts = {};
    lastResetDate = today;
    console.error('[AB Config] Daily apply counts reset for:', today);
  }
}

/**
 * Record an auto-apply event
 * Returns: { allowed: boolean, currentCount: number, maxAllowed: number, alert: boolean }
 */
export function recordAutoApply() {
  checkDailyReset();
  
  const today = new Date().toISOString().split('T')[0];
  dailyApplyCounts[today] = (dailyApplyCounts[today] || 0) + 1;
  
  const currentCount = dailyApplyCounts[today];
  const maxAllowed = config.maxAutoApplyPerDay;
  const alert = currentCount > maxAllowed;
  
  if (alert) {
    console.error(`[ALERT] Auto-apply limit exceeded! Today: ${currentCount}, Max: ${maxAllowed}`);
  }
  
  return {
    allowed: currentCount <= maxAllowed,
    currentCount,
    maxAllowed,
    alert,
    date: today
  };
}

/**
 * Get current daily apply count
 */
export function getDailyApplyCount() {
  checkDailyReset();
  
  const today = new Date().toISOString().split('T')[0];
  return dailyApplyCounts[today] || 0;
}

/**
 * Check if threshold is met for auto-apply
 */
export function shouldAutoApply(score) {
  return score >= config.autoApply;
}

/**
 * Check if LLM fallback is needed
 */
export function needsLLMFallback(score) {
  return score < config.llmFallback;
}

/**
 * Get all daily counts (for debugging)
 */
export function getDailyApplyCounts() {
  return { ...dailyApplyCounts };
}

/**
 * Initialize - load config on module load
 */
loadABConfig();

// Export for CommonJS
module.exports = {
  loadABConfig,
  getABConfig,
  getAutoApplyThreshold,
  getLLMFallbackThreshold,
  isForceApplyAllowed,
  getMaxAutoApplyPerDay,
  recordAutoApply,
  getDailyApplyCount,
  shouldAutoApply,
  needsLLMFallback,
  getDailyApplyCounts
};
