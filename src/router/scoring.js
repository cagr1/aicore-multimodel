// Scoring Module - Confidence scoring for ai-core proposals
// Calculates confidence score for routing decisions

/**
 * Score input parameters
 * @typedef {Object} ScoreInput
 * @property {number} keywordsScore - Score from keyword matching (0-1)
 * @property {number} profileMatchScore - Score from profile matching (0-1)
 * @property {number} historicalSuccessScore - Historical success rate (0-1)
 * @property {number} complexityEstimate - Estimated task complexity (0-1, 0=simple, 1=complex)
 */

/**
 * Score output
 * @typedef {Object} ScoreOutput
 * @property {number} score - Final score (0-1)
 * @property {Object} breakdown - Score breakdown
 * @property {number} breakdown.keywords - Keywords component
 * @property {number} breakdown.profile - Profile component
 * @property {number} breakdown.historical - Historical component
 * @property {number} breakdown.complexity - Complexity penalty
 * @property {string} level - Confidence level: 'low' | 'medium' | 'high'
 */

// Weights for scoring formula
const WEIGHTS = {
  keywords: 0.5,
  profile: 0.3,
  historical: 0.2,
  complexityPenalty: 0.1
};

/**
 * Clamp value between min and max
 */
function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get confidence level from score
 */
function getLevel(score) {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

/**
 * Log scoring decision (structured JSON)
 */
function logScore(promptId, input, output) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    prompt_id: promptId,
    score: output.score,
    level: output.level,
    breakdown: output.breakdown,
    input: {
      keywordsScore: input.keywordsScore,
      profileMatchScore: input.profileMatchScore,
      historicalSuccessScore: input.historicalSuccessScore,
      complexityEstimate: input.complexityEstimate
    }
  };
  
  console.error('[SCORING]', JSON.stringify(logEntry));
}

/**
 * Compute confidence score
 * Formula: score = clamp(0.5*keywords + 0.3*profile + 0.2*historical - 0.1*complexity, 0, 1)
 * 
 * @param {ScoreInput} input - Score input parameters
 * @param {Object} options - Optional parameters
 * @param {string} options.promptId - Prompt ID for logging
 * @param {boolean} options.enableLogging - Enable structured logging
 * @returns {ScoreOutput}
 */
export function computeScore(input, options = {}) {
  const {
    keywordsScore = 0,
    profileMatchScore = 0,
    historicalSuccessScore = 0.5, // Default neutral
    complexityEstimate = 0,
    promptId = 'unknown',
    enableLogging = false
  } = input;
  
  // Calculate components
  const keywordsComponent = keywordsScore * WEIGHTS.keywords;
  const profileComponent = profileMatchScore * WEIGHTS.profile;
  const historicalComponent = historicalSuccessScore * WEIGHTS.historical;
  const complexityPenalty = complexityEstimate * WEIGHTS.complexityPenalty;
  
  // Calculate final score
  const rawScore = keywordsComponent + profileComponent + historicalComponent - complexityPenalty;
  const score = clamp(rawScore, 0, 1);
  
  const output = {
    score,
    breakdown: {
      keywords: keywordsComponent,
      profile: profileComponent,
      historical: historicalComponent,
      complexity: complexityPenalty
    },
    level: getLevel(score)
  };
  
  // Log if enabled
  if (enableLogging) {
    logScore(promptId, input, output);
  }
  
  return output;
}

/**
 * Get confidence level thresholds
 */
export function getThresholds() {
  return {
    high: 0.7,
    medium: 0.4,
    low: 0.0
  };
}

/**
 * Should fallback to LLM based on score
 */
export function shouldFallbackToLLM(score, options = {}) {
  const { forceLlm = false } = options;
  
  if (forceLlm) return true;
  
  return score < getThresholds().medium;
}

/**
 * Get recommended action based on score
 */
export function getRecommendedAction(score) {
  if (score >= 0.7) {
    return {
      action: 'proceed',
      message: 'High confidence - proceed with deterministic proposals'
    };
  }
  
  if (score >= 0.4) {
    return {
      action: 'proceed_with_warning',
      message: 'Medium confidence - consider LLM fallback for complex cases'
    };
  }
  
  return {
    action: 'fallback',
    message: 'Low confidence - recommend LLM or user clarification'
    };
}

export default {
  computeScore,
  getThresholds,
  shouldFallbackToLLM,
  getRecommendedAction,
  WEIGHTS
};
