// Agents Registry
import { seoAgent } from './seo.js';
import { codeAgent } from './code.js';
import { frontendAgent } from './frontend.js';
import { backendAgent } from './backend.js';
import { securityAgent } from './security.js';
import { testAgent } from './test.js';

/**
 * All available agents
 */
export const agents = {
  seo: seoAgent,
  code: codeAgent,
  frontend: frontendAgent,
  backend: backendAgent,
  security: securityAgent,
  test: testAgent
};

/**
 * Get agent by ID
 */
export function getAgent(id) {
  return agents[id] || null;
}

/**
 * Check if agent supports a language
 */
export function agentSupportsLanguage(agentId, language) {
  const agent = agents[agentId];
  if (!agent) return false;
  return agent.supportedLanguages.includes(language);
}

export default agents;
