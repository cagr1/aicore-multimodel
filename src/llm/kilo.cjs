/**
 * Kilo API Client
 * 
 * Provides integration with Kilo's LLM API for patch validation and improvement.
 * 
 * Environment Variables:
 *   KILO_API_URL - Base URL for Kilo API (default: http://localhost:3000/api)
 *   KILO_API_KEY - API key for authentication
 */

// Kilo API configuration
const DEFAULT_KILO_URL = 'http://localhost:3000/api';
const DEFAULT_TIMEOUT = 60000; // 60 seconds

/**
 * Get Kilo API configuration from environment
 */
function getKiloConfig() {
  return {
    baseUrl: process.env.KILO_API_URL || DEFAULT_KILO_URL,
    apiKey: process.env.KILO_API_KEY || '',
    timeout: DEFAULT_TIMEOUT
  };
}

/**
 * Parse JSON from LLM response with fallback handling
 */
function parseJSONResponse(content) {
  // Try direct parse first
  try {
    return JSON.parse(content);
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e2) {
        // Continue to fallback
      }
    }
    
    // Try to find JSON object in content
    const objMatch = content.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch (e3) {
        // Continue to error
      }
    }
    
    throw new Error('Could not parse JSON from response: ' + content.substring(0, 200));
  }
}

/**
 * Call Kilo API to validate and improve a patch
 * 
 * @param {Object} params - Parameters
 * @param {string} params.context - Repository snapshot (relevant diffs)
 * @param {string} params.prompt - Validation/improvement prompt
 * @returns {Promise<Object>} - { confidence, patches, tests, notes }
 */
export async function validatePatchWithKilo({ context, prompt }) {
  const config = getKiloConfig();
  
  if (!config.baseUrl) {
    return {
      success: false,
      error: 'KILO_API_URL not configured',
      response: null
    };
  }
  
  // Build the request body as specified
  const requestBody = {
    context: context,
    prompt: prompt || 'Valida y mejora este patch. Constraints: no secrets, pasar lint/build/tests, no cambios de arquitectura mayor.'
  };
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${config.baseUrl}/llm/validate-patch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(config.timeout)
    });
    
    if (!response.ok) {
      throw new Error(`Kilo API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const latency = Date.now() - startTime;
    
    // Parse the JSON response
    let parsed;
    try {
      parsed = parseJSONResponse(data.content || data.response || JSON.stringify(data));
    } catch (parseError) {
      return {
        success: false,
        error: 'Failed to parse Kilo response as JSON',
        response: data,
        latency_ms: latency
      };
    }
    
    // Validate required fields
    if (typeof parsed.confidence !== 'number') {
      return {
        success: false,
        error: 'Response missing confidence field',
        response: parsed,
        latency_ms: latency
      };
    }
    
    return {
      success: true,
      confidence: parsed.confidence,
      patches: parsed.patches || [],
      tests: parsed.tests || [],
      notes: parsed.notes || '',
      response: parsed,
      latency_ms: latency,
      tokens: data.tokens || 0
    };
    
  } catch (error) {
    const latency = Date.now() - startTime;
    
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      return {
        success: false,
        error: 'Kilo API timeout',
        response: null,
        latency_ms: latency
      };
    }
    
    return {
      success: false,
      error: error.message,
      response: null,
      latency_ms: latency
    };
  }
}

/**
 * Check if Kilo API is available
 */
export async function checkKiloHealth() {
  const config = getKiloConfig();
  
  if (!config.baseUrl) {
    return { available: false, reason: 'KILO_API_URL not configured' };
  }
  
  try {
    const response = await fetch(`${config.baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    return {
      available: response.ok,
      status: response.status
    };
  } catch (error) {
    return {
      available: false,
      reason: error.message
    };
  }
}

// Export for CommonJS
module.exports = {
  validatePatchWithKilo,
  checkKiloHealth,
  getKiloConfig
};
