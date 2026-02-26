// Secret Scanner - Detect secrets in patches before surfacing
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Regex patterns for detecting secrets
 */
const SECRET_PATTERNS = {
  // AWS Keys - Match various formats (case insensitive)
  aws_access_key: /AKIA[A-Z0-9]{12,}/gi,
  
  // JWT Tokens - specific pattern first to avoid overlap
  jwt_token: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  
  // Generic secrets - must be 40 chars for AWS secret key
  aws_secret_key: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g,
  
  // GCP Service Account
  gcp_key: /"type": "service_account"/g,
  gcp_private_key: /-----BEGIN PRIVATE KEY-----[^-]*-----END PRIVATE KEY-----/g,
  
  // Database URLs
  postgres_url: /postgres:\/\/[^:]+:[^@]+@/g,
  mysql_url: /mysql:\/\/[^:]+:[^@]+@/g,
  mongodb_url: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/g,
  redis_url: /redis:\/\/[^:]+:[^@]+@/g,
  
  // JWT Tokens
  jwt_token: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  
  // SSH Private Keys
  ssh_rsa_key: /-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/g,
  ssh_ed25519: /-----BEGIN OPENSSH PRIVATE KEY-----/g,
  
  // Generic API Keys
  api_key: /api[_-]?key["']?\s*[:=]\s*["']?[A-Za-z0-9_-]{20,}/gi,
  apikey: /apikey["']?\s*[:=]\s*["']?[A-Za-z0-9_-]{20,}/gi,
  
  // Generic Secrets
  secret_token: /secret[_-]?token["']?\s*[:=]\s*["']?[A-Za-z0-9_-]{20,}/gi,
  private_token: /private[_-]?token["']?\s*[:=]\s*["']?[A-Za-z0-9_-]{20,}/gi,
  
  // Slack Tokens
  slack_token: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g,
  
  // GitHub Tokens
  github_token: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
  
  // Generic Passwords in config
  password_field: /password["']?\s*[:=]\s*["']?[^"'\s]{8,}/gi,
  
  // Stripe Keys
  stripe_key: /sk_live_[0-9a-zA-Z]{24,}/g,
  stripe_test_key: /sk_test_[0-9a-zA-Z]{24,}/g,
};

/**
 * Calculate Shannon entropy of a string
 * High entropy suggests random/compressed data (like encrypted keys)
 */
export function calculateEntropy(str) {
  const len = str.length;
  const frequencies = {};
  
  for (let i = 0; i < len; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  
  let entropy = 0;
  for (const char in frequencies) {
    const freq = frequencies[char] / len;
    entropy -= freq * Math.log2(freq);
  }
  
  return entropy;
}

/**
 * Check if a string has high entropy (suspicious)
 */
export function hasHighEntropy(str, threshold = 3.5) {
  return calculateEntropy(str) > threshold;
}

/**
 * Mask a secret for safe display
 */
function maskSecret(secret, maxLength = 8) {
  if (!secret) return '***';
  if (secret.length <= maxLength) return '*'.repeat(secret.length);
  return secret.substring(0, maxLength) + '*'.repeat(secret.length - maxLength);
}

/**
 * Scan content for secrets
 */
export function scanContent(content) {
  const findings = [];
  
  if (!content || typeof content !== 'string') {
    return findings;
  }
  
  // Check regex patterns
  for (const [patternName, pattern] of Object.entries(SECRET_PATTERNS)) {
    let match;
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(content)) !== null) {
      const matchedText = match[0];
      
      // Skip if it's a placeholder or example
      if (matchedText.includes('EXAMPLE') || 
          matchedText.includes('YOUR_') || 
          matchedText.includes('<') ||
          matchedText.includes('placeholder')) {
        continue;
      }
      
      findings.push({
        type: patternName,
        matched: maskSecret(matchedText),
        original: matchedText,
        index: match.index,
        line: content.substring(0, match.index).split('\n').length
      });
    }
  }
  
  // Check for high entropy strings (potential encrypted keys)
  const words = content.split(/[\s\n\r\t,;'"()[\]{}]+/);
  for (const word of words) {
    if (word.length > 20 && hasHighEntropy(word)) {
      // Check if it's not already detected
      const alreadyDetected = findings.some(f => f.original && content.includes(f.original));
      if (!alreadyDetected) {
        findings.push({
          type: 'high_entropy',
          matched: maskSecret(word),
          original: word,
          entropy: calculateEntropy(word).toFixed(2),
          line: content.substring(0, content.indexOf(word)).split('\n').length
        });
      }
    }
  }
  
  return findings;
}

/**
 * Scan a patch/proposal for secrets
 */
export function scanPatch(proposal) {
  const result = {
    clean: true,
    findings: [],
    security_score: 1.0,
    blocked: false,
    block_reason: null
  };
  
  // Scan change content
  if (proposal.change) {
    const contentToScan = [
      proposal.change.content,
      proposal.change.diff,
      proposal.change.description
    ].filter(Boolean).join('\n');
    
    const findings = scanContent(contentToScan);
    result.findings.push(...findings);
  }
  
  // Scan test content if present
  if (proposal.tests) {
    for (const test of proposal.tests) {
      const testFindings = scanContent(test.content);
      result.findings.push(...testFindings.map(f => ({
        ...f,
        source: 'test',
        test_file: test.path
      })));
    }
  }
  
  // Calculate security score
  if (result.findings.length > 0) {
    result.clean = false;
    
    // Deduct score based on findings
    const criticalFindings = result.findings.filter(f => 
      ['aws_access_key', 'aws_secret_key', 'gcp_private_key', 'ssh_rsa_key', 'ssh_edid25519', 'high_entropy'].includes(f.type)
    ).length;
    
    const highFindings = result.findings.filter(f => 
      ['jwt_token', 'stripe_key', 'github_token', 'slack_token'].includes(f.type)
    ).length;
    
    const mediumFindings = result.findings.filter(f => 
      ['postgres_url', 'mysql_url', 'mongodb_url', 'redis_url', 'api_key', 'password_field'].includes(f.type)
    ).length;
    
    // Calculate score
    result.security_score = Math.max(0, 1.0 - (
      (criticalFindings * 0.5) +
      (highFindings * 0.3) +
      (mediumFindings * 0.2) +
      (result.findings.length * 0.1)
    ));
    
    // Block if critical findings or low score
    if (criticalFindings > 0 || result.security_score < 0.3) {
      result.blocked = true;
      result.block_reason = `Security violation: ${criticalFindings > 0 ? 'critical secrets detected' : 'low security score (' + result.security_score.toFixed(2) + ')'}`;
    }
  }
  
  // Round score
  result.security_score = Math.round(result.security_score * 100) / 100;
  
  return result;
}

/**
 * Scan multiple proposals
 */
export function scanProposals(proposals) {
  const results = [];
  let allClean = true;
  
  for (const proposal of proposals) {
    const scanResult = scanPatch(proposal);
    results.push({
      proposal_id: proposal.id,
      ...scanResult
    });
    
    if (!scanResult.clean) {
      allClean = false;
    }
  }
  
  return {
    proposals: results,
    all_clean: allClean,
    blocked_count: results.filter(r => r.blocked).length
  };
}

/**
 * Mask all secrets in content
 */
export function maskSecretsInContent(content) {
  if (!content || typeof content !== 'string') {
    return content;
  }
  
  let masked = content;
  
  for (const [patternName, pattern] of Object.entries(SECRET_PATTERNS)) {
    let match;
    // Reset lastIndex
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(content)) !== null) {
      const maskedSecret = maskSecret(match[0]);
      masked = masked.replace(match[0], maskedSecret);
    }
  }
  
  return masked;
}

export default {
  scanPatch,
  scanProposals,
  scanContent,
  maskSecretsInContent,
  calculateEntropy,
  hasHighEntropy
};
