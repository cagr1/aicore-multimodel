// Profiles Module - Project type-specific configurations and agents
import fs from 'fs';
import path from 'path';

/**
 * Project profiles with their configurations
 */
const PROFILES = {
  landing: {
    id: 'landing',
    name: 'Landing Page',
    description: 'Single page website for marketing or product showcase',
    defaultAgents: ['frontend', 'seo'],
    recommendedPrompts: [
      'improve hero section',
      'add animations',
      'optimize for SEO',
      'make responsive',
      'add contact form'
    ],
    detect: (metadata, files) => {
      // Landing page indicators
      const hasIndex = files.some(f => f === 'index.html' || f === 'index.htm');
      const hasSingleHtml = files.filter(f => f.endsWith('.html')).length <= 3;
      const hasNoApi = !metadata.capabilities.includes('api');
      const hasNoDb = !files.some(f => f.includes('database') || f.includes('db'));
      
      // Check for landing page frameworks
      const isAstro = metadata.framework === 'astro';
      const isStatic = metadata.signals.includes('static') || metadata.signals.includes('ssg');
      
      return (hasIndex && hasSingleHtml && hasNoApi && hasNoDb) || isAstro || isStatic;
    }
  },
  
  saas: {
    id: 'saas',
    name: 'SaaS Application',
    description: 'Multi-page web application with authentication',
    defaultAgents: ['frontend', 'backend', 'security', 'seo'],
    recommendedPrompts: [
      'add user authentication',
      'setup database schema',
      'create dashboard',
      'add payment integration',
      'improve SEO'
    ],
    detect: (metadata, files) => {
      // SaaS indicators
      const hasAuth = files.some(f => 
        f.includes('auth') || f.includes('login') || f.includes('user') || 
        f.includes('password')
      );
      const hasApi = metadata.capabilities.includes('api') || metadata.signals.includes('rest');
      const hasDb = files.some(f => 
        f.includes('schema') || f.includes('model') || f.includes('migration') ||
        f.includes('prisma') || f.includes('sequelize')
      );
      const hasMultipleRoutes = files.filter(f => f.includes('route') || f.includes('page') || f.includes('view')).length > 3;
      
      // Frameworks that are typically SaaS
      const isNext = metadata.framework === 'nextjs';
      const isNuxt = metadata.framework === 'nuxt';
      const isRemix = metadata.framework === 'remix';
      
      return (hasAuth && hasApi) || (isNext && hasMultipleRoutes) || (isNuxt) || (isRemix);
    }
  },
  
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Online store with products and payments',
    defaultAgents: ['frontend', 'backend', 'security', 'seo'],
    recommendedPrompts: [
      'add product catalog',
      'setup payment processing',
      'add shopping cart',
      'improve checkout flow',
      'optimize product SEO'
    ],
    detect: (metadata, files) => {
      const hasShop = files.some(f => 
        f.includes('product') || f.includes('shop') || f.includes('cart') || 
        f.includes('checkout') || f.includes('order')
      );
      const hasPayment = files.some(f => 
        f.includes('payment') || f.includes('stripe') || f.includes('paypal')
      );
      
      return hasShop || hasPayment;
    }
  },
  
  api: {
    id: 'api',
    name: 'REST API',
    description: 'Backend API service',
    defaultAgents: ['backend', 'security', 'test'],
    recommendedPrompts: [
      'add CRUD endpoints',
      'setup authentication',
      'add input validation',
      'write unit tests',
      'optimize database queries'
    ],
    detect: (metadata, files) => {
      // API indicators
      const hasApi = metadata.capabilities.includes('api') || metadata.signals.includes('rest');
      const hasRoutes = files.some(f => f.includes('route') || f.includes('endpoint') || f.includes('controller'));
      const isExpress = metadata.framework === 'express' || metadata.framework === 'fastify';
      const isDjango = metadata.framework === 'django';
      const isFlask = metadata.framework === 'flask';
      const isSpring = metadata.framework === 'spring';
      const isGo = metadata.language === 'go';
      
      return hasApi || hasRoutes || isExpress || isDjango || isFlask || isSpring || isGo;
    }
  },
  
  blog: {
    id: 'blog',
    name: 'Blog / CMS',
    description: 'Content-focused website with articles',
    defaultAgents: ['frontend', 'seo'],
    recommendedPrompts: [
      'improve SEO metadata',
      'add social sharing',
      'optimize images',
      'add reading time',
      'improve typography'
    ],
    detect: (metadata, files) => {
      const hasBlog = files.some(f => 
        f.includes('blog') || f.includes('post') || f.includes('article') || 
        f.includes('content')
      );
      const isGatsby = metadata.framework === 'gatsby';
      const isHugo = metadata.framework === 'hugo';
      const isJekyll = metadata.framework === 'jekyll';
      const isWordpress = metadata.framework === 'wordpress';
      
      return hasBlog || isGatsby || isHugo || isJekyll || isWordpress;
    }
  },
  
  library: {
    id: 'library',
    name: 'Code Library / Package',
    description: 'Reusable code package or library',
    defaultAgents: ['code', 'test'],
    recommendedPrompts: [
      'improve code quality',
      'add documentation',
      'write tests',
      'setup CI/CD',
      'optimize bundle size'
    ],
    detect: (metadata, files) => {
      const hasPackageJson = files.includes('package.json');
      const hasReadme = files.includes('README.md');
      const hasSrc = files.includes('src');
      const hasTests = files.some(f => f.includes('test') || f.includes('spec'));
      const hasExports = files.some(f => f === 'index.js' || f === 'index.ts' || f === 'main.js');
      
      // Check for library indicators
      const hasBuildConfig = files.some(f => 
        f.includes('rollup') || f.includes('webpack') || f.includes('vite') ||
        f === 'tsconfig.json' || f.includes('babel')
      );
      
      return hasPackageJson && (hasSrc || hasExports) && (hasTests || hasBuildConfig);
    }
  },
  
  cli: {
    id: 'cli',
    name: 'CLI Tool',
    description: 'Command line interface application',
    defaultAgents: ['code', 'test'],
    recommendedPrompts: [
      'add command flags',
      'improve error handling',
      'add autocomplete',
      'write tests',
      'setup release process'
    ],
    detect: (metadata, files) => {
      const hasBin = files.includes('bin') || files.some(f => f.includes('cli') || f.includes('command'));
      const hasMain = files.includes('main.js') || files.includes('main.ts') || files.includes('index.js');
      const isNode = metadata.signals.includes('node');
      
      return metadata.capabilities.includes('cli') || (hasBin && isNode);
    }
  }
};

/**
 * Detect project profile based on metadata and files
 * @param {Object} metadata - Scanner metadata
 * @param {string} projectPath - Project path
 * @returns {Object} Detected profile
 */
export function detectProfile(metadata, projectPath) {
  let files = [];
  
  try {
    files = fs.readdirSync(projectPath);
  } catch (e) {
    // Ignore read errors
  }
  
  // Try each profile
  for (const profile of Object.values(PROFILES)) {
    if (profile.detect(metadata, files)) {
      return {
        ...profile,
        detected: true,
        confidence: 'high'
      };
    }
  }
  
  // Default fallback based on language/framework
  return getDefaultProfile(metadata);
}

/**
 * Get default profile based on metadata
 */
function getDefaultProfile(metadata) {
  const { language, framework, capabilities } = metadata;
  
  // Web projects
  if (language === 'javascript' || language === 'typescript') {
    if (framework === 'react' || framework === 'vue' || framework === 'angular') {
      return { ...PROFILES.saas, detected: false, confidence: 'medium' };
    }
    return { ...PROFILES.landing, detected: false, confidence: 'low' };
  }
  
  // Backend
  if (language === 'python' || language === 'go' || language === 'rust') {
    return { ...PROFILES.api, detected: false, confidence: 'medium' };
  }
  
  // PHP
  if (language === 'php') {
    return { ...PROFILES.saas, detected: false, confidence: 'low' };
  }
  
  // Default
  return {
    id: 'generic',
    name: 'Generic Project',
    description: 'General purpose project',
    defaultAgents: ['code'],
    recommendedPrompts: [],
    detected: false,
    confidence: 'low'
  };
}

/**
 * Get all available profiles
 */
export function getProfiles() {
  return Object.values(PROFILES);
}

/**
 * Get profile by ID
 */
export function getProfile(profileId) {
  return PROFILES[profileId] || null;
}

/**
 * Get recommended agents for a profile
 */
export function getProfileAgents(profile) {
  return profile?.defaultAgents || ['code'];
}

export default {
  detectProfile,
  getProfiles,
  getProfile,
  getProfileAgents
};
