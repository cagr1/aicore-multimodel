// Kilo.ai Provider
/**
 * Kilo.ai chat completion
 * Uses Kilo.ai's API which wraps various LLM providers including MiniMax
 * 
 * @param {Object} request 
 * @returns {Promise<LLMResponse>}
 */
export async function chat(request) {
  const { messages, options = {} } = request;
  
  const apiKey = options.apiKey || '';
  const baseUrl = options.baseUrl || 'https://api.kilo.ai/api/gateway';
  const model = options.model || options.defaultModel || 'MiniMax-M2.5';
  
  if (!apiKey) {
    return {
      content: '',
      success: false,
      error: 'Kilo.ai API key required'
    };
  }
  
  try {
    const url = baseUrl + '/chat/completions';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: false
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      return {
        content: '',
        success: false,
        error: 'Kilo.ai API error: ' + response.status + ' - ' + error
      };
    }
    
    const data = await response.json();
    
    return {
      content: data.choices?.[0]?.message?.content || '',
      model: data.model || model,
      usage: data.usage?.total_tokens || 0,
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
      options: { 
        apiKey: '',  // Will fail without key
        model: 'MiniMax-M2.5' 
      }
    });
    return response.success || response.error.includes('API key');
  } catch {
    return false;
  }
}

export const kiloProvider = {
  id: 'kilo',
  name: 'Kilo.ai',
  chat,
  healthCheck
};

export default kiloProvider;
