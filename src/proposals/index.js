// Proposals Module - Generate and manage change proposals from agents
import fs from 'fs';
import path from 'path';
import { fileEngine } from '../file-engine/index.js';
import { scanProposals } from '../file-engine/secret-scanner.js';

/**
 * Intent pattern matchers → Proposal generators
 * These generate proposals based on user intent patterns
 * (Without LLM - deterministic approach)
 */
const PROPOSAL_PATTERNS = {
  // Project initialization patterns
  'new-landing': {
    agent: 'frontend',
    keywords: ['landing page', 'landing', 'catalogo', 'catálogo', 'sitio web', 'sitio sin backend', 'cta whatsapp', 'whatsapp business'],
    generate: (projectPath, metadata) => {
      return generateLandingPageProposal(projectPath, metadata);
    }
  },
  'new-saas': {
    agent: 'frontend',
    keywords: ['saas', 'multi-usuario', 'multiusuario', 'dashboard', 'subscription', 'software como servicio'],
    generate: (projectPath, metadata) => {
      return generateSaaSProposal(projectPath, metadata);
    }
  },
  'new-ecommerce': {
    agent: 'frontend',
    keywords: ['ecommerce', 'tienda', 'carrito', 'checkout', 'pagos', 'shopping cart'],
    generate: (projectPath, metadata) => {
      return generateEcommerceProposal(projectPath, metadata);
    }
  },
  'new-api': {
    agent: 'backend',
    keywords: ['api rest', 'rest api', 'backend only', 'solo backend', 'microservicio', 'graphql'],
    generate: (projectPath, metadata) => {
      return generateAPIProposal(projectPath, metadata);
    }
  },
  'new-erp': {
    agent: 'backend',
    keywords: ['erp', 'sistema empresarial', 'inventario', 'facturación'],
    generate: (projectPath, metadata) => {
      return generateERPProposal(projectPath, metadata);
    }
  },
  
  // Frontend patterns
  'hero-3d': {
    agent: 'frontend',
    keywords: ['hero', '3d', 'three.js', 'animación 3d', 'threejs'],
    generate: (projectPath, metadata) => {
      const framework = metadata.framework || 'react';
      return generate3DHeroProposal(projectPath, framework);
    }
  },
  'hero-animation': {
    agent: 'frontend',
    keywords: ['hero', 'animación', 'animation', 'animado', 'efecto'],
    generate: (projectPath, metadata) => {
      return generateHeroAnimationProposal(projectPath, metadata);
    }
  },
  'component': {
    agent: 'frontend',
    keywords: ['componente', 'component', 'crear', 'create'],
    generate: (projectPath, metadata) => {
      return generateComponentProposal(projectPath, metadata);
    }
  },
  
  // SEO patterns
  'seo-meta': {
    agent: 'seo',
    keywords: ['seo', 'metadata', 'meta', 'title', 'description'],
    generate: (projectPath, metadata) => {
      return generateSEOMetadataProposal(projectPath, metadata);
    }
  },
  
  // Security patterns
  'security-jwt': {
    agent: 'security',
    keywords: ['jwt', 'auth', 'authentication', 'token'],
    generate: (projectPath, metadata) => {
      return generateSecurityProposal(projectPath, metadata);
    }
  },
  
  // Test patterns
  'test-generate': {
    agent: 'test',
    keywords: ['test', 'testing', 'prueba', 'coverage'],
    generate: (projectPath, metadata) => {
      return generateTestProposal(projectPath, metadata);
    }
  },
  
  // Code patterns
  'code-refactor': {
    agent: 'code',
    keywords: ['refactor', 'refactorizar', 'limpiar'],
    generate: (projectPath, metadata) => {
      return generateRefactorProposal(projectPath, metadata);
    }
  }
};

/**
 * Match user intent to proposal patterns
 */
function matchIntentPatterns(userIntent, metadata) {
  const matched = [];
  const lowerIntent = userIntent.toLowerCase();
  
  for (const [patternId, pattern] of Object.entries(PROPOSAL_PATTERNS)) {
    const hasKeyword = pattern.keywords.some(kw => lowerIntent.includes(kw.toLowerCase()));
    if (hasKeyword) {
      matched.push({ patternId, ...pattern });
    }
  }
  
  return matched;
}

/**
 * Generate proposal based on matched patterns
 */
export async function generateProposals(projectPath, userIntent, metadata) {
  const patterns = matchIntentPatterns(userIntent, metadata);
  
  if (patterns.length === 0) {
    return {
      success: false,
      proposals: [],
      message: 'No matching proposal patterns found for intent'
    };
  }
  
  const proposals = [];
  
  for (const pattern of patterns) {
    try {
      const proposal = await pattern.generate(projectPath, metadata);
      if (proposal) {
        proposals.push(proposal);
      }
    } catch (e) {
      console.error('[Proposals] Error generating proposal: ' + e.message);
    }
  }
  
  // Generate diffs for all proposals
  const diffs = fileEngine.generateDiffs(proposals.map(p => p.change));
  
  // Scan proposals for secrets
  const proposalsWithDiffs = proposals.map((p, i) => ({
    ...p,
    diff: diffs[i],
    tests: p.tests || []
  }));
  
  const securityScan = scanProposals(proposalsWithDiffs);
  
  // Add security scores to proposals
  const proposalsWithSecurity = proposalsWithDiffs.map((p, i) => ({
    ...p,
    security_score: securityScan.proposals[i]?.security_score ?? 1.0,
    security_findings: securityScan.proposals[i]?.findings || [],
    blocked: securityScan.proposals[i]?.blocked || false
  }));
  
  // Filter out blocked proposals if needed
  const validProposals = proposalsWithSecurity.filter(p => !p.blocked);
  
  return {
    success: true,
    proposals: validProposals,
    security_scan: {
      total_scanned: securityScan.proposals.length,
      blocked_count: securityScan.blocked_count,
      all_clean: securityScan.all_clean
    },
    message: 'Generated ' + proposals.length + ' proposal(s)'
  };
}

/**
 * Apply proposal by ID
 */
export async function applyProposal(projectPath, proposalId, options = {}) {
  const { dryRun = false, backup = true } = options;
  
  // This would need to be stored in memory/session
  // For now, we'll apply directly
  return { success: false, error: 'Proposal storage not implemented yet' };
}

/**
 * Validate a proposal before applying
 */
export function validateProposal(proposal) {
  const errors = [];
  const warnings = [];
  
  // Check required fields
  if (!proposal.change?.file) {
    errors.push('Missing file path in proposal');
  }
  
  if (!proposal.change?.type) {
    errors.push('Missing change type in proposal');
  }
  
  // Check for potentially dangerous operations
  if (proposal.change?.type === 'delete') {
    warnings.push('This proposal will delete a file');
  }
  
  // Check file path for directory traversal
  if (proposal.change?.file?.includes('..')) {
    errors.push('Invalid file path: directory traversal detected');
  }
  
  // Check for sensitive files
  const sensitivePatterns = [
    /\.env$/,
    /\.git\/config$/,
    /\/node_modules\//,
    /\.json$/
  ];
  
  for (const pattern of sensitivePatterns) {
    if (pattern.test(proposal.change?.file || '')) {
      warnings.push('Modifying potentially sensitive file: ' + proposal.change.file);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================
// Proposal Generators (Template-based)
// ============================================

function generate3DHeroProposal(projectPath, framework) {
  const code = get3DHeroCode(framework);
  
  return {
    id: 'hero-3d-' + Date.now(),
    agent: 'frontend',
    description: 'Add 3D hero section with Three.js animation',
    change: {
      type: 'create',
      file: 'src/components/Hero3D.jsx',
      content: code
    },
    originalContent: '',
    risks: ['New dependency: three', 'May impact performance on mobile']
  };
}

function get3DHeroCode(framework) {
  if (framework === 'vue') {
    return `<template>
  <div class="hero-3d">
    <canvas ref="canvas"></canvas>
    <div class="hero-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';

const canvas = ref(null);
let scene, camera, renderer, particles;

onMounted(() => {
  initThree();
  animate();
});

onUnmounted(() => {
  if (renderer) renderer.dispose();
});

function initThree() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Particles
  const geometry = new THREE.BufferGeometry();
  const count = 2000;
  const positions = new Float32Array(count * 3);
  
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 10;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0x6366f1, size: 0.02 });
  particles = new THREE.Points(geometry, material);
  scene.add(particles);
  
  camera.position.z = 5;
}

function animate() {
  requestAnimationFrame(animate);
  if (particles) {
    particles.rotation.y += 0.001;
  }
  renderer.render(scene, camera);
}
</script>

<style scoped>
.hero-3d {
  position: relative;
  width: 100%;
  height: 100vh;
}
canvas {
  position: absolute;
  top: 0;
  left: 0;
}
.hero-content {
  position: relative;
  z-index: 10;
}
</style>`;
  }
  
  // Default React
  return `import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function Hero3D({ children }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Particles background
    const geometry = new THREE.BufferGeometry();
    const count = 2000;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 10;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0x6366f1, size: 0.02 });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    camera.position.z = 5;
    
    const animate = () => {
      requestAnimationFrame(animate);
      particles.rotation.y += 0.001;
      renderer.render(scene, camera);
    };
    
    animate();
    
    return () => renderer.dispose();
  }, []);
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
      <div style={{ position: 'relative', zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
}`;
}

function generateHeroAnimationProposal(projectPath, metadata) {
  return {
    id: 'hero-animation-' + Date.now(),
    agent: 'frontend',
    description: 'Add animated hero section with entrance effects',
    change: {
      type: 'create',
      file: 'src/components/HeroAnimated.jsx',
      content: `import React from 'react';
import './HeroAnimated.css';

export default function HeroAnimated({ title, subtitle, cta }) {
  return (
    <section className="hero-animated">
      <div className="hero-animated-content">
        <h1 className="hero-title">{title}</h1>
        <p className="hero-subtitle">{subtitle}</p>
        {cta && <button className="hero-cta">{cta}</button>}
      </div>
    </section>
  );
}`
    },
    originalContent: '',
    risks: ['New CSS animations']
  };
}

function generateComponentProposal(projectPath, metadata) {
  return {
    id: 'component-' + Date.now(),
    agent: 'frontend',
    description: 'Create new React component with best practices',
    change: {
      type: 'create',
      file: 'src/components/NewComponent.jsx',
      content: `import React from 'react';
import PropTypes from 'prop-types';

export default function NewComponent({ children, className }) {
  return (
    <div className={'new-component ' + (className || '')}>
      {children}
    </div>
  );
}

NewComponent.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};`
    },
    originalContent: '',
    risks: []
  };
}

function generateSEOMetadataProposal(projectPath, metadata) {
  return {
    id: 'seo-meta-' + Date.now(),
    agent: 'seo',
    description: 'Add SEO metadata configuration',
    change: {
      type: 'create',
      file: 'src/components/SEOHead.jsx',
      content: `import React from 'react';

export default function SEOHead({ title, description, image, url }) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  );
}`
    },
    originalContent: '',
    risks: []
  };
}

function generateSecurityProposal(projectPath, metadata) {
  return {
    id: 'security-jwt-' + Date.now(),
    agent: 'security',
    description: 'Add JWT authentication utilities',
    change: {
      type: 'create',
      file: 'src/utils/auth.js',
      content: `// JWT Authentication Utilities
const TOKEN_KEY = 'auth_token';

export const auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  
  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
  
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },
  
  getPayload() {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
};

export default auth;`
    },
    originalContent: '',
    risks: ['Storing tokens in localStorage - consider httpOnly cookies']
  };
}

function generateTestProposal(projectPath, metadata) {
  return {
    id: 'test-' + Date.now(),
    agent: 'test',
    description: 'Add test setup and example test',
    change: {
      type: 'create',
      file: 'src/components/__tests__/Example.test.jsx',
      content: "import { render, screen } from '@testing-library/react';\nimport Example from '../Example';\n\ndescribe('Example', () => {\n  test('renders correctly', () => {\n    render(<Example />);\n    expect(screen.getByText('Example')).toBeInTheDocument();\n  });\n});"
    },
    originalContent: '',
    risks: []
  };
}

function generateRefactorProposal(projectPath, metadata) {
  return {
    id: 'refactor-' + Date.now(),
    agent: 'code',
    description: 'Code quality improvements',
    change: {
      type: 'create',
      file: '.eslintrc.json',
      content: JSON.stringify({
        "extends": ["react-app"],
        "rules": {
          "no-console": "warn",
          "no-unused-vars": "warn"
        }
      }, null, 2)
    },
    originalContent: '',
    risks: []
  };
}

export default {
  generateProposals,
  applyProposal,
  validateProposal
};

// ============================================
// New Project Proposal Generators
// ============================================

function generateLandingPageProposal(projectPath, metadata) {
  return {
    id: 'landing-page-' + Date.now(),
    agent: 'frontend',
    description: 'Crear landing page completa con catálogo, filtros y CTA WhatsApp',
    change: {
      type: 'create',
      file: 'SPEC.md',
      content: `# SPEC.md - Landing Page + Catálogo

## Proyecto: Landing Page para Empresa de Empaques

### Stack
- Next.js 14 + TailwindCSS + Framer Motion
- Sin backend - datos estáticos en TypeScript

### Páginas
- / (Home) - Hero + categorías + CTA
- /catalogo - Grid de productos con filtros
- /catalogo/[category] - Filtrado por categoría
- /contacto - WhatsApp directo

### Requerimientos
1. Filtros por categoría (Cajas, Bases, Toppers, Guaguas)
2. Buscador por nombre/dimensión
3. CTA WhatsApp sticky en mobile
4. Design System: Negro + Dorado (#D4A843)
5. Tipografía: Geist

### Fase 1
1. Setup Next.js
2. Data types + products.ts
3. Layout + Design tokens
4. Hero section
5. ProductCard + Grid
6. Filtros
`
    },
    originalContent: '',
    risks: ['Requiere contenido real del cliente']
  };
}

function generateSaaSProposal(projectPath, metadata) {
  return {
    id: 'saas-project-' + Date.now(),
    agent: 'frontend',
    description: 'Crear proyecto SaaS con autenticación y dashboard',
    change: {
      type: 'create',
      file: 'SPEC.md',
      content: `# SPEC.md - SaaS Project

## Proyecto: SaaS Application

### Stack
- Next.js 14 + Auth (NextAuth/Clerk)
- Base de datos (Prisma/PostgreSQL)
- Dashboard con gráficos

### Features
- Autenticación de usuarios
- Dashboard personalizado
- CRUD de recursos
- Subscripciones (Stripe)

### Fases
1. Setup + Auth
2. Dashboard base
3. Features core
4. Pagos
`
    },
    originalContent: '',
    risks: ['Requiere configuración de pagos']
  };
}

function generateEcommerceProposal(projectPath, metadata) {
  return {
    id: 'ecommerce-project-' + Date.now(),
    agent: 'frontend',
    description: 'Crear tienda online con carrito y pagos',
    change: {
      type: 'create',
      file: 'SPEC.md',
      content: `# SPEC.md - Ecommerce Project

## Proyecto: Tienda Online

### Stack
- Next.js 14 + Carrito + Pagos
- Stripe/MercadoPago
- Inventory management

### Features
- Catálogo de productos
- Carrito de compras
- Checkout
- Panel admin
`
    },
    originalContent: '',
    risks: ['Requiere integración de pagos']
  };
}

function generateAPIProposal(projectPath, metadata) {
  return {
    id: 'api-project-' + Date.now(),
    agent: 'backend',
    description: 'Crear API REST con Node.js/Express',
    change: {
      type: 'create',
      file: 'SPEC.md',
      content: `# SPEC.md - API REST Project

## Proyecto: REST API

### Stack
- Node.js + Express/Fastify
- PostgreSQL + Prisma
- JWT Auth

### Endpoints
- /auth - Registro/Login
- /resources - CRUD completo
- /admin - Panel admin

### Documentación
- Swagger/OpenAPI
`
    },
    originalContent: '',
    risks: []
  };
}

function generateERPProposal(projectPath, metadata) {
  return {
    id: 'erp-project-' + Date.now(),
    agent: 'backend',
    description: 'Crear sistema ERP empresarial',
    change: {
      type: 'create',
      file: 'SPEC.md',
      content: `# SPEC.md - ERP Project

## Proyecto: Sistema ERP

### Módulos
- Inventario
- Ventas
- Facturación
- RRHH (opcional)

### Stack
- Frontend: React/Next.js
- Backend: Node.js/NestJS
- Base de datos: PostgreSQL

### Fases
1. Inventario
2. Ventas
3. Facturación
4. Reportes
`
    },
    originalContent: '',
    risks: ['Proyecto complejo - varias fases']
  };
}
