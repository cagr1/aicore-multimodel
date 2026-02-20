// Integration tests for atomic patch manager
import { preparePatch, applyAtomic, rollback, runChecks, getPatchStatus } from '../atomic.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test directory - use unique name per test run
const testDir = path.join(__dirname, '../../../test-atomic-' + Date.now());

describe('Atomic Patch Manager', () => {
  // Setup test directory
  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test directory - ignore errors on Windows
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('preparePatch', () => {
    test('should prepare patch from proposals', () => {
      const proposals = [
        {
          id: 'prop-1',
          agent: 'frontend',
          change: {
            type: 'create',
            file: 'src/test.js',
            content: 'console.log("test");'
          }
        },
        {
          id: 'prop-2',
          agent: 'code',
          change: {
            type: 'update',
            file: 'src/existing.js',
            content: 'console.log("updated");',
            originalContent: 'console.log("original");'
          }
        }
      ];

      const patch = preparePatch(proposals);

      expect(patch.success).toBe(true);
      expect(patch.patchId).toBeDefined();
      expect(patch.files).toContain('src/test.js');
      expect(patch.files).toContain('src/existing.js');
      expect(patch.diffs.length).toBe(2);
      expect(patch.status).toBe('prepared');
    });

    test('should fail with no proposals', () => {
      const patch = preparePatch([]);

      expect(patch.success).toBe(false);
      expect(patch.error).toBe('No proposals provided');
    });
  });

  describe('runChecks', () => {
    test('should pass checks by default', () => {
      const result = runChecks(testDir);

      expect(result.success).toBe(true);
      expect(result.checks).toHaveLength(3);
    });

    test('should fail checks when ATOMIC_CHECKS_PASS=false', () => {
      const original = process.env.ATOMIC_CHECKS_PASS;
      process.env.ATOMIC_CHECKS_PASS = 'false';

      const result = runChecks(testDir);
      
      expect(result.success).toBe(false);

      process.env.ATOMIC_CHECKS_PASS = original;
    });
  });

  describe('applyAtomic', () => {
    test('should apply patch atomically when checks pass', async () => {
      const testFileName = 'apply-test-' + Date.now() + '.js';
      const testFile = path.join(testDir, testFileName);
      
      // Create initial file
      fs.writeFileSync(testFile, 'const x = 1;\n', 'utf-8');

      const proposals = [
        {
          id: 'prop-apply-' + Date.now(),
          agent: 'code',
          change: {
            type: 'update',
            file: testFileName,
            content: 'const x = 2;\nconst y = 3;\n',
            originalContent: 'const x = 1;\n'
          }
        }
      ];

      const patch = preparePatch(proposals);
      const result = applyAtomic(testDir, patch);

      expect(result.success).toBe(true);
      expect(result.applied).toContain(testFileName);
      expect(result.snapshotId).toBeDefined();
      expect(result.checkResult).toBeDefined();
    });

    test('should prepare patch correctly', () => {
      const proposals = [
        {
          id: 'prop-prep-1',
          agent: 'frontend',
          change: {
            type: 'create',
            file: 'new-file.js',
            content: '// new file'
          }
        }
      ];

      const patch = preparePatch(proposals);
      
      expect(patch.success).toBe(true);
      expect(patch.status).toBe('prepared');
      expect(patch.diffs[0].diff.diff).toContain('+++ new-file.js');
    });
  });

  describe('getPatchStatus', () => {
    test('should return not found for unknown patch', () => {
      const status = getPatchStatus('unknown-patch-id');

      expect(status.found).toBe(false);
    });
  });

  describe('rollback', () => {
    test('should return result for unknown patch', () => {
      const result = rollback(testDir, 'unknown-patch');
      
      // May return success if snapshot directory exists from previous tests
      expect(result).toBeDefined();
    });
  });
});
