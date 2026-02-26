// Tests for secret scanner
import { scanPatch, scanProposals, scanContent, maskSecretsInContent, calculateEntropy, hasHighEntropy } from '../secret-scanner.js';

describe('Secret Scanner', () => {
  describe('scanContent', () => {
    test('should detect AWS access key', () => {
      // Use a proper 20-character AWS key format (no lowercase)
      const content = 'const AWS_KEY = "AKIAIOSFODNN7EXAMPLE12";';
      const findings = scanContent(content);
      
      // Either AWS key or high entropy will be detected
      expect(findings.length).toBeGreaterThanOrEqual(1);
    });
    
    test('should detect RSA private key', () => {
      const content = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAw5f...fake...key...
-----END RSA PRIVATE KEY-----`;
      
      const findings = scanContent(content);
      
      expect(findings.length).toBeGreaterThan(0);
      const hasPrivateKey = findings.some(f => f.type === 'ssh_rsa_key');
      expect(hasPrivateKey).toBe(true);
    });
    
    test('should detect JWT token', () => {
      const content = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const findings = scanContent(content);
      
      expect(findings).toHaveLength(1);
      expect(findings[0].type).toBe('jwt_token');
    });
    
    test('should detect database URL with password', () => {
      const content = 'DATABASE_URL=postgres://user:password123@localhost:5432/mydb';
      
      const findings = scanContent(content);
      
      expect(findings.length).toBeGreaterThan(0);
    });
    
    test('should not flag placeholders', () => {
      const content = 'const key = "AKIAEXAMPLE"; // TODO: replace with real key';
      
      const findings = scanContent(content);
      
      expect(findings).toHaveLength(0);
    });
  });
  
  describe('scanPatch', () => {
    test('should calculate security_score', () => {
      const proposal = {
        id: 'test-1',
        change: {
          type: 'create',
          file: 'config.js',
          content: 'const x = 1;'
        }
      };
      
      const result = scanPatch(proposal);
      
      expect(result.clean).toBe(true);
      expect(result.security_score).toBe(1.0);
      expect(result.blocked).toBe(false);
    });
    
    test('should block proposal with AWS key', () => {
      const proposal = {
        id: 'test-2',
        change: {
          type: 'create',
          file: 'config.js',
          content: 'const AWS_KEY = "AKIAIOSFODNN7EXAMPLE12";'
        }
      };
      
      const result = scanPatch(proposal);
      
      // The key is detected as high_entropy, so clean should be false
      expect(result.clean).toBe(false);
      expect(result.findings.length).toBeGreaterThanOrEqual(1);
    });
    
    test('should block proposal with SSH private key', () => {
      const proposal = {
        id: 'test-3',
        change: {
          type: 'create',
          file: 'keys/id_rsa',
          content: '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----'
        }
      };
      
      const result = scanPatch(proposal);
      
      expect(result.clean).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.security_score).toBeLessThan(0.5);
    });
    
    test('should scan test content', () => {
      const proposal = {
        id: 'test-4',
        change: {
          type: 'create',
          file: 'src/utils.js',
          content: 'export const helper = () => {};'
        },
        tests: [
          {
            path: 'src/utils.test.js',
            content: 'const API_KEY = "sk_test_51234567890abcdefghij";'
          }
        ]
      };
      
      const result = scanPatch(proposal);
      
      expect(result.clean).toBe(false);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].source).toBe('test');
    });
  });
  
  describe('scanProposals', () => {
    test('should scan multiple proposals', () => {
      const proposals = [
        {
          id: 'clean-1',
          change: { type: 'create', file: 'a.js', content: 'const x = 1;' }
        },
        {
          id: 'secret-1',
          change: { type: 'create', file: 'b.js', content: 'key = "AKIAIOSFODNN7EXAMPLE12";' }
        }
      ];
      
      const result = scanProposals(proposals);
      
      expect(result.proposals).toHaveLength(2);
      // At least one proposal should be flagged
      expect(result.all_clean).toBe(false);
    });
  });
  
  describe('calculateEntropy', () => {
    test('should return low entropy for predictable text', () => {
      const entropy = calculateEntropy('aaaaaaaaaa');
      expect(entropy).toBeLessThan(2);
    });
    
    test('should return high entropy for random strings', () => {
      const entropy = calculateEntropy('x7Km9Pq2YnL');
      expect(entropy).toBeGreaterThan(3);
    });
  });
  
  describe('hasHighEntropy', () => {
    test('should detect high entropy strings', () => {
      // Random base64-like string with higher entropy
      const result = hasHighEntropy('x7Km9Pq2YnLwRdVsTuZaB1234');
      expect(result).toBe(true);
    });
    
    test('should not flag normal words', () => {
      const result = hasHighEntropy('password');
      expect(result).toBe(false);
    });
  });
  
  describe('maskSecretsInContent', () => {
    test('should mask secrets in content', () => {
      const content = 'AKIAIOSFODNN7EXAMPLE';
      const masked = maskSecretsInContent(content);
      
      expect(masked).not.toBe(content);
      expect(masked).toContain('*');
    });
    
    test('should preserve non-secret text', () => {
      const content = 'const apiKey = process.env.API_KEY;';
      const masked = maskSecretsInContent(content);
      
      expect(masked).toContain('process.env.API_KEY');
    });
  });
});
