// JavaScript/TypeScript Detector - Improved version
import fs from 'fs';
import path from 'path';

const JAVASCRIPT_EXTENSIONS = ['.js', '.jsx', '.mjs', '.cjs'];
const TYPESCRIPT_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'];

/**
 * Detect JavaScript/TypeScript project
 * @param {string} projectPath 
 * @returns {Object|null}
 */
export function detect(projectPath) {
  const files = fs.readdirSync(projectPath);
  const hasJS = files.some(f => {
    const ext = path.extname(f);
    return JAVASCRIPT_EXTENSIONS.includes(ext);
  });
  
  const hasTS = files.some(f => {
    const ext = path.extname(f);
    return TYPESCRIPT_EXTENSIONS.includes(ext);
  });

  if (!hasJS && !hasTS && !files.includes('package.json')) {
    return null;
  }

  const signals = [];
  const capabilities = [];
  let framework = null;
  let language = 'javascript';

  // Check for TypeScript first
  if (hasTS || files.includes('tsconfig.json')) {
    language = 'typescript';
    signals.push('typescript');
  }

  // Check for JavaScript files
  if (hasJS) {
    signals.push('javascript');
  }

  // Check package.json for framework detection
  if (files.includes('package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      // Next.js detection (must check first - it's specific)
      if (deps.next) {
        framework = 'nextjs';
        signals.push('nextjs', 'react', 'ssr');
        capabilities.push('ssr');
        
        // Check if static export
        if (pkg.next?.output === 'export' || deps['next-plugin-s3']) {
          signals.push('static');
          capabilities.push('static');
        }
      }
      // React detection (after Next.js)
      else if (deps.react && !deps.vue && !deps.svelte && !deps.angular) {
        if (deps['react-scripts'] || deps['vite']) {
          // SPA - Single Page Application
          signals.push('react', 'spa');
        } else {
          signals.push('react');
        }
      }
      // Vue detection
      else if (deps.vue || deps['nuxt']) {
        // Will be handled by nuxt below
      }
      // Nuxt detection
      else if (deps.nuxt || deps['nuxt3']) {
        framework = 'nuxt';
        signals.push('nuxt', 'vue', 'ssr');
        capabilities.push('ssr');
      }
      // Svelte detection
      else if (deps.svelte || deps['@sveltejs/kit']) {
        if (deps['@sveltejs/kit']) {
          framework = 'sveltekit';
          signals.push('sveltekit', 'svelte', 'ssr');
          capabilities.push('ssr');
        } else {
          framework = 'svelte';
          signals.push('svelte', 'spa');
        }
      }
      // Angular detection
      else if (deps['@angular/core']) {
        framework = 'angular';
        signals.push('angular', 'spa');
      }
      // Astro detection
      else if (deps.astro) {
        framework = 'astro';
        signals.push('astro', 'static');
        capabilities.push('static');
      }
      // Express backend
      else if (deps.express) {
        framework = 'express';
        signals.push('express', 'node');
        capabilities.push('api');
      }
      // Fastify backend
      else if (deps.fastify) {
        framework = 'fastify';
        signals.push('fastify', 'node');
        capabilities.push('api');
      }
      // NestJS backend
      else if (deps['@nestjs/core']) {
        framework = 'nest';
        signals.push('nest', 'node', 'api');
        capabilities.push('api');
      }
      // Hono backend
      else if (deps.hono) {
        framework = 'hono';
        signals.push('hono', 'node', 'api');
        capabilities.push('api');
      }
      // Koa backend
      else if (deps.koa) {
        framework = 'koa';
        signals.push('koa', 'node');
      }
      // Generic Node.js backend
      else if (!deps.react && !deps.vue && !deps.svelte && !deps.angular && !deps.astro && !deps.next && !deps.nuxt) {
        signals.push('node');
      }
      
      // Check for Vite (build tool)
      if (deps.vite) {
        signals.push('vite');
      }
      
      // Check for Webpack
      if (deps.webpack || deps['webpack-cli']) {
        signals.push('webpack');
      }
      
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Check for specific file patterns
  if (!framework) {
    // Check for Next.js specific files
    if (files.includes('next.config.js') || files.includes('next.config.mjs') || files.includes('next.config.ts')) {
      framework = 'nextjs';
      signals.push('nextjs');
    }
    // Check for Nuxt files
    else if (files.includes('nuxt.config.js') || files.includes('nuxt.config.ts')) {
      framework = 'nuxt';
      signals.push('nuxt');
    }
    // Check for Svelte files
    else if (files.includes('svelte.config.js')) {
      framework = 'svelte';
      signals.push('svelte');
    }
    // Check for Astro files
    else if (files.includes('astro.config.mjs') || files.includes('astro.config.js')) {
      framework = 'astro';
      signals.push('astro', 'static');
      capabilities.push('static');
    }
  }

  // Determine project type based on signals and capabilities
  if (capabilities.includes('api')) {
    // API project
  } else if (capabilities.includes('static') || signals.includes('landing')) {
    // Static site
  } else if (signals.includes('spa')) {
    // SPA
  }

  return {
    language,
    framework,
    signals: [...new Set(signals)],
    capabilities: [...new Set(capabilities)]
  };
}

export default { detect };
