// Anthropic Provider (Claude)
/**
 * Anthropic chat completion
 * @param {Object} request 
 * @returns {Promise<LLMResponse>}
 */
export async function chat(request) {
  const { messages, options = {} } = request;
  
  const apiKey = options.apiKey || '';
  const baseUrl = options.baseUrl || 'https://api.anthropic.com/v1';
  const model = options.model || options.defaultModel || 'claude-3-sonnet-20240229';
  
  if (!apiKey) {
    return {
      content: '',
      success: false,
      error: 'Anthropic API key required'
    };
  }
  
  try {
    // Anthropic uses different message format
    // Convert to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const url = baseUrl + '/messages';
    
    const body = {
      model,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      messages: userMessages
    };
    
    if (systemMessage) {
      body.system = systemMessage.content;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const error = await response.text();
      return {
        content: '',
        success: false,
        error: 'Anthropic API error: ' + response.status + ' - ' + error
      };
    }
    
    const data = await response.json();
    
    return {
      content: data.content?.[0]?.text || '',
      model: data.model || model,
      usage: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      success: true
    };
  } catch (error) {
    return {
      content: '',
      success: false,
      error: error.message
    };
  }
}

/**
 * Health check
 */
export async function healthCheck() {
  try {
    const response = await chat({
      messages: [{ role: 'user', content: 'hi' }],
      options: { apiKey: '' }
    });
    return response.success || response.error.includes('API key');
  } catch {
    return false;
  }
}

export const anthropicProvider = {
  id: 'anthropic',
  name: 'Anthropic (Claude)',
  chat,
  healthCheck
};

export default anthropicProvider;
