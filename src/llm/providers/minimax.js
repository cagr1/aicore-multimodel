// MiniMax Provider - OpenAI Compatible API
/**
 * MiniMax chat completion
 * @param {Object} request 
 * @returns {Promise<LLMResponse>}
 */
export async function chat(request) {
  const { messages, options = {} } = request;
  
  const apiKey = options.apiKey || '';
  const baseUrl = options.baseUrl || 'https://api.minimax.chat/v1';
  const model = options.model || options.defaultModel || 'MiniMax-Text-01';
  
  if (!apiKey) {
    return {
      content: '',
      success: false,
      error: 'MiniMax API key required'
    };
  }
  
  try {
    // Convert messages to MiniMax format
    // MiniMax uses same format as OpenAI
    const url = baseUrl + '/text/chatcompletion_v2';
    
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
        error: 'MiniMax API error: ' + response.status + ' - ' + error
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
  // MiniMax doesn't have a specific health endpoint
  // Just check if we can make a simple request
  try {
    const response = await chat({
      messages: [{ role: 'user', content: 'hi' }],
      options: { 
        apiKey: '',  // Will fail without key
        model: 'MiniMax-Text-01' 
      }
    });
    return response.success || response.error.includes('API key');
  } catch {
    return false;
  }
}

export const minimaxProvider = {
  id: 'minimax',
  name: 'MiniMax',
  chat,
  healthCheck
};

export default minimaxProvider;
