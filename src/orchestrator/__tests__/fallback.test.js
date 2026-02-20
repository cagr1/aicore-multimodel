// Integration tests for orchestrator fallback rules
import { applyFallbackRules } from '../index.js';

describe('Orchestrator Fallback Rules', () => {
  const originalConsoleError = console.error;
  let capturedLogs = [];

  beforeEach(() => {
    capturedLogs = [];
    // Capture console.error to verify telemetry
    console.error = (...args) => {
      capturedLogs.push(args.join(' '));
    };
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('applyFallbackRules', () => {
    // Test 1: High confidence prompt (score >= 0.7) => candidate_auto_apply
    test('should return candidate_auto_apply for high confidence prompt', () => {
      const result = applyFallbackRules({
        promptId: 'prompt-high-1',
        keywordsScore: 1.0,      // Perfect keyword match
        profileMatchScore: 1.0,   // Perfect profile match
        historicalSuccessScore: 0.9,
        complexityEstimate: 0.1,   // Simple task
        userIntent: 'optimizar SEO del homepage'
      });

      expect(result.score).toBeGreaterThanOrEqual(0.7);
      expect(result.route).toBe('candidate_auto_apply');
      expect(result.level).toBe('high');
      expect(result.label).toContain('High confidence');
    });

    // Test 2: Medium confidence prompt (0.4 <= score < 0.7) => fallback_llm
    test('should return fallback_llm for medium confidence prompt', () => {
      const result = applyFallbackRules({
        promptId: 'prompt-medium-1',
        keywordsScore: 0.5,       // Partial keyword match
        profileMatchScore: 0.5,    // Partial profile match
        historicalSuccessScore: 0.5,
        complexityEstimate: 0.3,   // Moderate complexity
        userIntent: 'crear un componente con animación 3D compleja'
      });

      expect(result.score).toBeGreaterThanOrEqual(0.4);
      expect(result.score).toBeLessThan(0.7);
      expect(result.route).toBe('fallback_llm');
      expect(result.level).toBe('medium');
      expect(result.label).toContain('LLM fallback');
    });

    // Test 3: Low confidence prompt (score < 0.4) => clarify_needed
    test('should return clarify_needed for low confidence prompt', () => {
      const result = applyFallbackRules({
        promptId: 'prompt-low-1',
        keywordsScore: 0.1,       // Poor keyword match
        profileMatchScore: 0.2,    // Poor profile match
        historicalSuccessScore: 0.3,
        complexityEstimate: 0.9,   // Very complex task
        userIntent: 'hacer algo random que no entiendo'
      });

      expect(result.score).toBeLessThan(0.4);
      expect(result.route).toBe('clarify_needed');
      expect(result.level).toBe('low');
      expect(result.label).toContain('clarification');
    });
  });

  describe('Telemetry Events', () => {
    test('should emit route_decision telemetry event', () => {
      applyFallbackRules({
        promptId: 'telemetry-test-1',
        keywordsScore: 0.8,
        profileMatchScore: 0.7,
        historicalSuccessScore: 0.6,
        complexityEstimate: 0.2,
        userIntent: 'test prompt'
      });

      // Check that telemetry was logged
      const telemetryLog = capturedLogs.find(log => log.includes('[TELEMETRY]'));
      expect(telemetryLog).toBeDefined();

      // Parse and verify the telemetry event
      const eventJson = telemetryLog.replace('[TELEMETRY] ', '');
      const event = JSON.parse(eventJson);

      expect(event.event).toBe('route_decision');
      expect(event.prompt_id).toBe('telemetry-test-1');
      expect(event.score).toBeDefined();
      expect(event.route).toBeDefined();
    });

    test('should include all required fields in telemetry', () => {
      applyFallbackRules({
        promptId: 'telemetry-fields-1',
        keywordsScore: 0.9,
        profileMatchScore: 0.8,
        historicalSuccessScore: 0.7,
        complexityEstimate: 0.1,
        userIntent: 'test prompt for fields'
      });

      const telemetryLog = capturedLogs.find(log => log.includes('[TELEMETRY]'));
      const eventJson = telemetryLog.replace('[TELEMETRY] ', '');
      const event = JSON.parse(eventJson);

      // Verify required fields
      expect(event.prompt_id).toBeDefined();
      expect(event.score).toBeDefined();
      expect(event.route).toBeDefined();
      expect(event.user_intent).toBeDefined();
      expect(event.level).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });
  });

  describe('Score Boundaries', () => {
    test('should correctly handle boundary at autoApplyThreshold (0.7)', () => {
      // Score = 0.5*0.8 + 0.3*0.6 + 0.2*0.5 - 0.1*0.2 = 0.4 + 0.18 + 0.1 - 0.02 = 0.66
      const result = applyFallbackRules({
        promptId: 'boundary-07',
        keywordsScore: 0.8,
        profileMatchScore: 0.6,
        historicalSuccessScore: 0.5,
        complexityEstimate: 0.2,
        userIntent: 'boundary test'
      });

      // Score should be < 0.7, so fallback_llm
      expect(result.route).toBe('fallback_llm');
    });

    test('should correctly handle boundary at llmFallbackThreshold (0.4)', () => {
      // Score = 0.5*0.4 + 0.3*0.3 + 0.2*0.3 - 0.1*0.5 = 0.2 + 0.09 + 0.06 - 0.05 = 0.30
      const result = applyFallbackRules({
        promptId: 'boundary-04',
        keywordsScore: 0.4,
        profileMatchScore: 0.3,
        historicalSuccessScore: 0.3,
        complexityEstimate: 0.5,
        userIntent: 'boundary test'
      });

      // Score should be < 0.4, so clarify_needed
      expect(result.route).toBe('clarify_needed');
    });
  });
});
