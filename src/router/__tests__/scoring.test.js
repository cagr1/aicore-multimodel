// Scoring Module Tests
import { computeScore, getThresholds, shouldFallbackToLLM, getRecommendedAction } from '../scoring.js';

describe('scoring module', () => {
  
  describe('computeScore', () => {
    
    test('should return low confidence for minimal input', () => {
      const result = computeScore({
        keywordsScore: 0,
        profileMatchScore: 0,
        historicalSuccessScore: 0,
        complexityEstimate: 0
      });
      
      expect(result.score).toBe(0);
      expect(result.level).toBe('low');
    });
    
    test('should return high confidence for perfect match', () => {
      const result = computeScore({
        keywordsScore: 1,
        profileMatchScore: 1,
        historicalSuccessScore: 1,
        complexityEstimate: 0
      });
      
      // score = 0.5*1 + 0.3*1 + 0.2*1 - 0.1*0 = 1.0
      expect(result.score).toBe(1.0);
      expect(result.level).toBe('high');
    });
    
    test('should return medium confidence for partial match', () => {
      const result = computeScore({
        keywordsScore: 0.5,
        profileMatchScore: 0.5,
        historicalSuccessScore: 0.5,
        complexityEstimate: 0.5
      });
      
      // score = 0.5*0.5 + 0.3*0.5 + 0.2*0.5 - 0.1*0.5 = 0.25 + 0.15 + 0.1 - 0.05 = 0.45
      expect(result.score).toBeCloseTo(0.45, 1);
      expect(result.level).toBe('medium');
    });
    
    test('should handle boundary at 0.7 (high threshold)', () => {
      // Score exactly at high threshold should be 'medium' (not 'high')
      const result = computeScore({
        keywordsScore: 0.8,
        profileMatchScore: 0.6,
        historicalSuccessScore: 0.5,
        complexityEstimate: 0
      });
      
      // 0.5*0.8 + 0.3*0.6 + 0.2*0.5 = 0.68 -> medium
      expect(result.level).toBe('medium');
    });
    
    test('should clamp score to 0-1 range', () => {
      // High complexity with low scores should not go below 0
      const result = computeScore({
        keywordsScore: 0,
        profileMatchScore: 0,
        historicalSuccessScore: 0,
        complexityEstimate: 1
      });
      
      // 0 - 0.1 = -0.1 -> clamped to 0
      expect(result.score).toBe(0);
      expect(result.level).toBe('low');
    });
    
    test('should include breakdown in output', () => {
      const result = computeScore({
        keywordsScore: 1,
        profileMatchScore: 0,
        historicalSuccessScore: 0,
        complexityEstimate: 0
      });
      
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.keywords).toBe(0.5); // 1 * 0.5
      expect(result.breakdown.profile).toBe(0);      // 0 * 0.3
    });
    
    test('should handle missing input with defaults', () => {
      const result = computeScore({});
      
      // Default values: keywords=0, profile=0, historical=0.5, complexity=0
      // 0 + 0 + 0.2*0.5 = 0.1
      expect(result.score).toBeCloseTo(0.1, 1);
      expect(result.level).toBe('low');
    });
    
  });
  
  describe('getThresholds', () => {
    
    test('should return correct threshold values', () => {
      const thresholds = getThresholds();
      
      expect(thresholds.high).toBe(0.7);
      expect(thresholds.medium).toBe(0.4);
      expect(thresholds.low).toBe(0.0);
    });
    
  });
  
  describe('shouldFallbackToLLM', () => {
    
    test('should return true for forceLlm flag', () => {
      expect(shouldFallbackToLLM(0.9, { forceLlm: true })).toBe(true);
    });
    
    test('should return true for low scores', () => {
      expect(shouldFallbackToLLM(0.3)).toBe(true);
    });
    
    test('should return false for high scores', () => {
      expect(shouldFallbackToLLM(0.8)).toBe(false);
    });
    
    test('should return true for medium scores (borderline)', () => {
      expect(shouldFallbackToLLM(0.3)).toBe(true); // below threshold
    });
    
  });
  
  describe('getRecommendedAction', () => {
    
    test('should recommend proceed for high confidence', () => {
      const action = getRecommendedAction(0.8);
      
      expect(action.action).toBe('proceed');
    });
    
    test('should recommend proceed_with_warning for medium', () => {
      const action = getRecommendedAction(0.5);
      
      expect(action.action).toBe('proceed_with_warning');
    });
    
    test('should recommend fallback for low', () => {
      const action = getRecommendedAction(0.2);
      
      expect(action.action).toBe('fallback');
    });
    
  });
  
});
