// agents-bridge.js — Bridge between agents/ knowledge base and ai-core
// Reads project state, stack rules, and domain .md files to inject context into LLM prompts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectPhase } from './scanner/phase-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Default base path for agents knowledge base (relative to project root)
 */
let agentsBasePath = path.join(__dirname, '..', 'agents');

/**
 * Configure the agents base path from config
 * @param {string} configPath - Path from config/default.json agents_knowledge_base
 */
export function configure(configPath) {
  if (configPath) {
    agentsBasePath = path.resolve(path.join(__dirname, '..'), configPath);
  }
}

/**
 * Safely read and parse a JSON file
 * @param {string} filePath 
 * @returns {Object|null}
 */
function readJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`[AgentsBridge] Failed to read ${filePath}:`, e.message);
  }
  return null;
}

/**
 * Safely read a text/markdown file
 * @param {string} filePath 
 * @returns {string|null}
 */
function readText(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (e) {
    console.error(`[AgentsBridge] Failed to read ${filePath}:`, e.message);
  }
  return null;
}

// ─── Project Index & State ───────────────────────────────────────────

/**
 * Read the projects index to find the active project
 * @returns {Object|null} The _index.json content
 */
export function getProjectsIndex() {
  const indexPath = path.join(agentsBasePath, 'orchestrator', 'projects', '_index.json');
  return readJSON(indexPath);
}

/**
 * Get the currently active project from _index.json
 * @returns {Object|null} The active project entry
 */
export function getActiveProject() {
  const index = getProjectsIndex();
  if (!index) return null;

  const activeId = index.last_active;
  if (!activeId) return null;

  return index.projects.find(p => p.id === activeId) || null;
}

/**
 * Read the state.json for a specific project
 * @param {string} projectId 
 * @returns {Object|null}
 */
export function getProjectState(projectId) {
  const statePath = path.join(agentsBasePath, 'orchestrator', 'projects', projectId, 'state.json');
  return readJSON(statePath);
}

/**
 * Read the tasks.json for a specific project
 * @param {string} projectId 
 * @returns {Object|null}
 */
export function getProjectTasks(projectId) {
  const tasksPath = path.join(agentsBasePath, 'orchestrator', 'projects', projectId, 'tasks.json');
  return readJSON(tasksPath);
}

// ─── Agent Registry ──────────────────────────────────────────────────

/**
 * Read the agents registry
 * @returns {Object|null}
 */
export function getAgentRegistry() {
  const registryPath = path.join(agentsBasePath, 'orchestrator', 'agents', 'registry.json');
  return readJSON(registryPath);
}

// ─── Project Matching ────────────────────────────────────────────────

/**
 * Stack keyword normalization for matching
 */
const STACK_NORMALIZE = {
  'next.js': 'nextjs', 'next': 'nextjs', 'nextjs': 'nextjs',
  'react': 'react', 'react.js': 'react',
  'vue': 'vue', 'vue.js': 'vue', 'vue 3': 'vue',
  'nuxt': 'nuxt', 'nuxt.js': 'nuxt',
  'express': 'express', 'express.js': 'express',
  'prisma': 'prisma',
  'postgresql': 'postgresql', 'postgres': 'postgresql',
  'sql server': 'sqlserver', 'sqlserver': 'sqlserver',
  '.net': 'dotnet', 'dotnet': 'dotnet', '.net 8': 'dotnet',
  'ef core': 'efcore', 'entity framework': 'efcore',
  'laravel': 'laravel',
  'tailwindcss': 'tailwind', 'tailwind': 'tailwind',
  'gsap': 'gsap',
  'three.js': 'threejs', 'threejs': 'threejs',
  'twilio': 'twilio',
  'paddle': 'paddle',
  'node.js': 'nodejs', 'node': 'nodejs', 'nodejs': 'nodejs'
};

/**
 * Normalize a stack item for comparison
 * @param {string} item 
 * @returns {string}
 */
function normalizeStack(item) {
  const lower = item.toLowerCase().trim();
  // Try exact match first, then prefix match
  if (STACK_NORMALIZE[lower]) return STACK_NORMALIZE[lower];
  // Try removing version numbers
  const noVersion = lower.replace(/\s*\d+(\.\d+)*\s*$/, '').trim();
  if (STACK_NORMALIZE[noVersion]) return STACK_NORMALIZE[noVersion];
  return lower;
}

/**
 * Match a scanned project against known projects in the orchestrator
 * Uses stack overlap + project type + framework detection
 * 
 * @param {Object} metadata - Scanner metadata { language, framework, projectType, capabilities }
 * @param {string} [projectPath] - Optional project path for name matching
 * @returns {Object|null} Matched project from _index.json or null
 */
export function matchProject(metadata, projectPath) {
  const index = getProjectsIndex();
  if (!index || !index.projects) return null;

  const scannedFramework = (metadata.framework || '').toLowerCase();
  const scannedType = (metadata.projectType || '').toLowerCase();
  const scannedLang = (metadata.language || '').toLowerCase();

  // Normalize scanned capabilities into a set
  const scannedStack = new Set();
  if (scannedFramework) scannedStack.add(normalizeStack(scannedFramework));
  if (scannedLang) scannedStack.add(normalizeStack(scannedLang));
  if (metadata.capabilities && Array.isArray(metadata.capabilities)) {
    for (const cap of metadata.capabilities) {
      scannedStack.add(normalizeStack(cap));
    }
  }

  // Try path-based matching first (most reliable)
  if (projectPath) {
    const pathLower = projectPath.toLowerCase().replace(/\\/g, '/');
    for (const project of index.projects) {
      const projectId = project.id.toLowerCase();
      const projectFolder = (project.folder || project.id).toLowerCase();
      if (pathLower.includes(projectId) || pathLower.includes(projectFolder)) {
        return project;
      }
    }
  }

  // Score-based matching on stack overlap
  let bestMatch = null;
  let bestScore = 0;

  for (const project of index.projects) {
    let score = 0;
    const projectStack = (project.stack || []).map(s => normalizeStack(s));

    // Stack overlap
    for (const item of projectStack) {
      if (scannedStack.has(item)) score += 2;
    }

    // Type match bonus
    const projectType = (project.type || '').toLowerCase();
    if (projectType === scannedType) score += 3;
    if (projectType === 'saas' && scannedType === 'saas') score += 2;
    if (projectType === 'landing' && scannedType === 'landing') score += 2;

    // Framework match bonus
    for (const stackItem of projectStack) {
      if (stackItem === normalizeStack(scannedFramework)) score += 3;
    }

    if (score > bestScore && score >= 4) {
      bestScore = score;
      bestMatch = project;
    }
  }

  return bestMatch;
}

// ─── Auto-Registration ──────────────────────────────────────────────────

/**
 * Infer project type from metadata
 * @param {Object} metadata - Scanner metadata
 * @returns {string}
 */
function inferProjectType(metadata) {
  const { projectType, framework, language, capabilities } = metadata;
  
  // If already detected, use it
  if (projectType && projectType !== 'unknown') {
    return projectType;
  }
  
  // Infer from capabilities
  if (capabilities?.includes('api')) return 'API';
  if (capabilities?.includes('ml')) return 'ML';
  if (capabilities?.includes('cli')) return 'CLI';
  
  // Infer from language/framework
  if (language === 'javascript' || language === 'typescript') {
    if (!capabilities?.includes('api')) return 'Landing';
    return 'SaaS';
  }
  
  return 'Unknown';
}

/**
 * Infer stack from metadata
 * @param {Object} metadata - Scanner metadata
 * @returns {string[]}
 */
function inferStack(metadata) {
  const { framework, language, capabilities } = metadata;
  const stack = [];
  
  if (framework) {
    stack.push(framework);
  }
  
  if (language) {
    stack.push(language);
  }
  
  // Add detected capabilities as technologies
  if (capabilities && Array.isArray(capabilities)) {
    stack.push(...capabilities);
  }
  
  return stack.length > 0 ? stack : ['Unknown'];
}

/**
 * Get project ID from path
 * @param {string} projectPath - Project path
 * @returns {string}
 */
function getProjectIdFromPath(projectPath) {
  // Extract folder name from path
  const normalized = projectPath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const folderName = parts[parts.length - 1] || 'new-project';
  
  // Sanitize: lowercase, replace spaces with dashes
  return folderName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Auto-register a new project in _index.json
 * @param {Object} metadata - Scanner metadata
 * @param {string} projectPath - Project path
 * @returns {Object|null} The newly created project entry
 */
export function autoRegisterProject(metadata, projectPath) {
  const index = getProjectsIndex();
  if (!index) {
    console.error('[AgentsBridge] Cannot auto-register: _index.json not found');
    return null;
  }
  
  const projectId = getProjectIdFromPath(projectPath);
  
  // Check if already exists (avoid duplicates)
  const existing = index.projects?.find(p => p.id === projectId || p.folder === projectId);
  if (existing) {
    console.error('[AgentsBridge] Project already exists:', projectId);
    return existing;
  }
  
  const projectType = inferProjectType(metadata);
  const stack = inferStack(metadata);
  
  const newProject = {
    id: projectId,
    name: projectId.charAt(0).toUpperCase() + projectId.slice(1).replace(/-/g, ' '),
    description: `${projectType} project`,
    stack: stack,
    phase: 'discovery',
    health: 'active',
    priority: (index.projects?.length || 0) + 1,
    type: projectType,
    folder: projectId,
    autoRegistered: true,
    createdAt: new Date().toISOString()
  };
  
  // Add to index
  if (!index.projects) {
    index.projects = [];
  }
  index.projects.push(newProject);
  
  // Save updated index
  const indexPath = path.join(agentsBasePath, 'orchestrator', 'projects', '_index.json');
  try {
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    console.error('[AgentsBridge] Auto-registered project:', projectId, '- Type:', projectType, '- Stack:', stack.join(', '));
    
    // Also create state.json for the new project
    createProjectState(newProject);
    
    return newProject;
  } catch (e) {
    console.error('[AgentsBridge] Failed to auto-register project:', e.message);
    return null;
  }
}

/**
 * Create state.json for a new project
 * @param {Object} project - Project entry from _index.json
 */
function createProjectState(project) {
  const state = {
    project_id: project.id,
    project_name: project.name,
    description: project.description || '',
    current_phase: project.phase || 'discovery',
    health: project.health || 'active',
    priority: project.priority || 99,
    last_updated: new Date().toISOString(),
    stack: project.stack || [],
    url: project.url || '',
    metrics: {
      tasks_completed: 0,
      tasks_pending: 0,
      agents_used: []
    },
    current_blockers: [],
    top_priority: 'Initial setup',
    autoCreated: true
  };
  
  const statePath = path.join(agentsBasePath, 'orchestrator', 'projects', project.id, 'state.json');
  
  try {
    // Ensure directory exists
    const dir = path.dirname(statePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
    console.error('[AgentsBridge] Created state.json for:', project.id);
  } catch (e) {
    console.error('[AgentsBridge] Failed to create state.json:', e.message);
  }
}

/**
 * Ensure project is registered before getting context
 * This is the main entry point that handles auto-registration
 * @param {Object} options - Same as getAgentsContext
 * @returns {Object} Context with project info
 */
export function getOrCreateProjectContext(options) {
  const { metadata, selectedAgentIds, projectPath, userIntent } = options;
  
  // Try to match existing project
  const matchedProject = matchProject(metadata, projectPath);
  
  if (matchedProject) {
    // Auto-update phase if project exists
    if (projectPath) {
      try {
        updateProjectPhase(projectPath, matchedProject.id);
      } catch (e) {
        // Non-fatal
      }
    }
    
    return {
      ...getAgentsContext(options),
      autoRegistered: false
    };
  }
  
  // Auto-register if not found
  if (projectPath) {
    console.error('[AgentsBridge] Project not found, auto-registering...');
    const newProject = autoRegisterProject(metadata, projectPath);
    
    if (newProject) {
      // Now get context for the newly registered project
      return {
        ...getAgentsContext({
          ...options,
          projectPath: newProject.id // Use new ID for matching
        }),
        autoRegistered: true,
        newProject
      };
    }
  }
  
  // Fallback: return no context
  return {
    matched: false,
    projectId: null,
    context: '',
    mdFiles: [],
    projectState: null,
    autoRegistered: false
  };
}

/**
 * Update project phase automatically based on code analysis
 * @param {string} projectPath - Path to the project
 * @param {string} projectId - Project ID
 * @returns {Object|null} Updated state or null
 */
export function updateProjectPhase(projectPath, projectId) {
  if (!projectPath || !projectId) return null;
  
  // Detect phase from code
  const phaseResult = detectPhase(projectPath);
  
  // Get current state
  const currentState = getProjectState(projectId);
  
  if (!currentState) {
    console.error('[AgentsBridge] Cannot update phase: state.json not found for', projectId);
    return null;
  }
  
  const currentPhase = currentState.current_phase;
  const detectedPhase = phaseResult.phase;
  
  // Only update if phase has changed AND the project has enough files to be meaningful
  // Very low file counts (< 3) suggest the projectPath is not the real project directory
  const hasEnoughFiles = phaseResult.signals?.fileCount >= 3;
  if (currentPhase !== detectedPhase && hasEnoughFiles) {
    console.error(`[AgentsBridge] Phase change detected for ${projectId}: ${currentPhase} → ${detectedPhase} (confidence: ${phaseResult.confidence})`);
    
    // Update state
    const updatedState = {
      ...currentState,
      current_phase: detectedPhase,
      last_updated: new Date().toISOString(),
      phaseDetection: {
        confidence: phaseResult.confidence,
        signals: phaseResult.signals,
        scores: phaseResult.scores,
        recommendations: phaseResult.recommendations
      }
    };
    
    // Save updated state
    const statePath = path.join(agentsBasePath, 'orchestrator', 'projects', projectId, 'state.json');
    try {
      fs.writeFileSync(statePath, JSON.stringify(updatedState, null, 2), 'utf-8');
      console.error('[AgentsBridge] Updated phase for', projectId, 'to', detectedPhase);
      return updatedState;
    } catch (e) {
      console.error('[AgentsBridge] Failed to update phase:', e.message);
      return null;
    }
  } else {
    console.error('[AgentsBridge] Phase unchanged for', projectId, ':', currentPhase);
    return currentState;
  }
}

// ─── Domain Rules Loading ────────────────────────────────────────────

/**
 * Map of agent domain categories to their folder paths
 */
const DOMAIN_FOLDERS = {
  backend: 'backend',
  frontend: 'frontend',
  database: 'database',
  devops: 'devops',
  security: 'security',
  testing: 'testing',
  architecture: 'architecture',
  classifier: 'classifier',
  stacks: 'stacks'
};

/**
 * Map ai-core agent IDs to agents/ registry agent IDs and their .md files
 */
const AICORE_TO_AGENTS_MAP = {
  // ai-core agent → relevant agents/ .md files by domain
  backend: ['backend/node-api.md', 'backend/laravel-api.md', 'backend/dotnet-data-sqlserver.md', 'database/postgresql-expert.md', 'database/sqlserver-expert.md'],
  frontend: ['frontend/react-hooks.md', 'frontend/vue-composition.md', 'frontend/animations.md', 'frontend/animations-expert.md', 'frontend/design-awwwards.md', 'frontend/ux-accessibility.md', 'frontend/performance-expert.md'],
  security: ['security/api-security.md', 'security/security-expert.md'],
  test: ['testing/backend-test.md'],
  seo: ['frontend/performance-expert.md'],  // SEO and performance are related
  code: ['architecture/global-architect.md', 'devops/cloud-expert.md'],
  api: ['backend/node-api.md', 'backend/laravel-api.md', 'security/security-expert.md']
};

/**
 * Determine which .md files are relevant based on the project stack
 * @param {Object} project - Project from _index.json
 * @param {string[]} agentIds - Selected ai-core agent IDs
 * @returns {string[]} List of .md file paths relative to agents/
 */
function resolveRelevantMdFiles(project, agentIds) {
  const files = new Set();
  const registry = getAgentRegistry();
  const projectStack = (project.stack || []).map(s => normalizeStack(s));

  // 1. Add stack-specific .md if project matches a known stack
  if (registry && registry.agents) {
    for (const [agentKey, agentDef] of Object.entries(registry.agents)) {
      // Check if this registry agent is project-specific
      if (agentDef.projects) {
        const matchesProject = agentDef.projects.some(p => {
          if (p.includes('*')) {
            const prefix = p.replace('*', '');
            return project.id.startsWith(prefix);
          }
          return p === project.id;
        });
        if (matchesProject && agentDef.path) {
          files.add(agentDef.path);
        }
      }
    }
  }

  // 2. Add domain .md files based on selected ai-core agents
  for (const agentId of agentIds) {
    const mdFiles = AICORE_TO_AGENTS_MAP[agentId] || [];
    for (const mdFile of mdFiles) {
      // Filter by stack relevance
      if (shouldIncludeMd(mdFile, projectStack)) {
        files.add(mdFile);
      }
    }
  }

  // 3. Always include global architect for architecture decisions
  if (agentIds.some(id => ['backend', 'frontend', 'code'].includes(id))) {
    files.add('architecture/global-architect.md');
  }

  return Array.from(files);
}

/**
 * Determine if a .md file is relevant for the given project stack
 * @param {string} mdFile - Relative path like 'backend/node-api.md'
 * @param {string[]} projectStack - Normalized stack items
 * @returns {boolean}
 */
function shouldIncludeMd(mdFile, projectStack) {
  const mdLower = mdFile.toLowerCase();

  // Stack-specific filtering
  const stackFilters = {
    'node-api.md': ['nodejs', 'express', 'nextjs'],
    'laravel-api.md': ['laravel'],
    'dotnet-data-sqlserver.md': ['dotnet', 'efcore', 'sqlserver'],
    'react-hooks.md': ['react', 'nextjs'],
    'vue-composition.md': ['vue', 'nuxt'],
    'prisma-queries.md': ['prisma'],
    'postgres-schema.md': ['postgresql'],
    'postgresql-expert.md': ['postgresql', 'prisma'],
    'sqlserver-expert.md': ['sqlserver', 'dotnet', 'efcore'],
    'migrations-dotnet-prisma.md': ['dotnet', 'prisma'],
    'animations.md': ['gsap', 'threejs'],
    'animations-expert.md': ['gsap', 'threejs']
  };

  const fileName = path.basename(mdLower);
  const requiredStack = stackFilters[fileName];

  // If no filter defined, include by default
  if (!requiredStack) return true;

  // Include if any required stack item is in the project stack
  return requiredStack.some(req => projectStack.includes(req));
}

// ─── Context Builder ─────────────────────────────────────────────────

/**
 * Build a compact context string from .md files for LLM injection
 * @param {string[]} mdFiles - Relative paths to .md files within agents/
 * @param {Object} projectState - Project state.json content
 * @returns {string} Compact context string
 */
function buildContext(mdFiles, projectState) {
  const sections = [];

  // Project context header
  if (projectState) {
    sections.push(
      `[Project: ${projectState.project_name || projectState.project_id}]`,
      `Phase: ${projectState.current_phase || 'unknown'}`,
      `Stack: ${(projectState.stack || []).join(', ')}`,
      `Priority: ${projectState.top_priority || 'none'}`,
      ''
    );
  }

  // Load and append each .md file content (trimmed for token efficiency)
  for (const mdFile of mdFiles) {
    const fullPath = path.join(agentsBasePath, mdFile);
    const content = readText(fullPath);
    if (content) {
      // Extract the essential rules (skip markdown headers, code blocks with architecture diagrams)
      const compacted = compactMdContent(content, mdFile);
      if (compacted) {
        sections.push(`[${mdFile}]`);
        sections.push(compacted);
        sections.push('');
      }
    }
  }

  return sections.join('\n').trim();
}

/**
 * Compact .md content for token efficiency
 * Keeps: rules, restrictions, patterns, red flags
 * Removes: architecture diagrams, long code blocks, README sections
 * @param {string} content 
 * @param {string} fileName 
 * @returns {string}
 */
function compactMdContent(content, fileName) {
  const lines = content.split('\n');
  const kept = [];
  let inCodeBlock = false;
  let codeBlockLines = 0;
  let inReadmeSection = false;

  for (const line of lines) {
    // Track code blocks
    if (line.trim().startsWith('```') || line.trim().startsWith('````')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        // Only keep short code blocks (< 10 lines, likely examples)
        if (codeBlockLines <= 10) {
          // Already added lines
        }
        codeBlockLines = 0;
      } else {
        inCodeBlock = true;
        codeBlockLines = 0;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines++;
      if (codeBlockLines > 10) continue; // Skip long code blocks
      continue; // Skip code block content for compactness
    }

    // Skip README sections in stack files
    if (line.startsWith('## README')) {
      inReadmeSection = true;
      continue;
    }
    if (inReadmeSection && line.startsWith('---')) {
      inReadmeSection = false;
      continue;
    }
    if (inReadmeSection) continue;

    // Keep meaningful lines
    const trimmed = line.trim();
    if (trimmed === '' && kept.length > 0 && kept[kept.length - 1] === '') continue; // Collapse empty lines
    if (trimmed.startsWith('Arquitectura actual:')) continue; // Skip architecture diagrams header

    kept.push(trimmed);
  }

  // Remove trailing empty lines
  while (kept.length > 0 && kept[kept.length - 1] === '') kept.pop();

  return kept.join('\n');
}

// ─── Main API ────────────────────────────────────────────────────────

/**
 * Get the full agents context for a given project scan result
 * This is the main entry point used by the router/orchestrator
 * 
 * @param {Object} options
 * @param {Object} options.metadata - Scanner metadata { language, framework, projectType, capabilities }
 * @param {string[]} options.selectedAgentIds - Agent IDs selected by the router (e.g., ['backend', 'frontend'])
 * @param {string} [options.projectPath] - Path to the scanned project
 * @param {string} [options.userIntent] - User's prompt/intent
 * @returns {Object} { matched: boolean, projectId, context: string, mdFiles: string[] }
 */
export function getAgentsContext({ metadata, selectedAgentIds, projectPath, userIntent }) {
  // Try to match the scanned project to a known project
  const matchedProject = matchProject(metadata, projectPath);

  if (!matchedProject) {
    return {
      matched: false,
      projectId: null,
      context: '',
      mdFiles: [],
      projectState: null
    };
  }

  // Load project state
  const projectState = getProjectState(matchedProject.id);

  // Resolve which .md files to load
  const mdFiles = resolveRelevantMdFiles(matchedProject, selectedAgentIds);

  // Build compact context
  const context = buildContext(mdFiles, projectState);

  return {
    matched: true,
    projectId: matchedProject.id,
    projectName: matchedProject.name,
    phase: matchedProject.phase,
    context,
    mdFiles,
    projectState
  };
}

// ─── Task Update ─────────────────────────────────────────────────────

/**
 * Update tasks.json after successful agent execution
 * Adds a new completed task entry or updates an existing one
 * 
 * @param {string} projectId - Project ID
 * @param {Object} taskUpdate - Task update data
 * @param {string} taskUpdate.title - Task title
 * @param {string} taskUpdate.description - What was done
 * @param {string} taskUpdate.agentUsed - Which agent executed it
 * @param {string} [taskUpdate.status] - Task status (default: 'done')
 * @returns {boolean} Success
 */
export function updateProjectTask(projectId, taskUpdate) {
  const tasksPath = path.join(agentsBasePath, 'orchestrator', 'projects', projectId, 'tasks.json');
  const tasks = readJSON(tasksPath);

  if (!tasks) {
    console.error(`[AgentsBridge] Cannot update tasks: file not found for project ${projectId}`);
    return false;
  }

  try {
    // Generate next task ID
    const existingIds = tasks.tasks.map(t => {
      const match = t.id.match(/task_(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const nextId = Math.max(...existingIds, 0) + 1;
    const taskId = `task_${String(nextId).padStart(3, '0')}`;

    const newTask = {
      id: taskId,
      title: taskUpdate.title,
      description: taskUpdate.description,
      status: taskUpdate.status || 'done',
      completed_at: new Date().toISOString(),
      agent_used: taskUpdate.agentUsed,
      phase: tasks.tasks.length > 0 
        ? Math.max(...tasks.tasks.map(t => t.phase || 1))
        : 1,
      notes: taskUpdate.notes || 'Auto-generated by ai-core agents-bridge'
    };

    tasks.tasks.push(newTask);

    // Update counts
    tasks.completed_count = tasks.tasks.filter(t => t.status === 'done').length;
    tasks.in_progress_count = tasks.tasks.filter(t => t.status === 'in_progress').length;
    tasks.pending_count = tasks.tasks.filter(t => t.status === 'pending').length;

    fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2), 'utf-8');
    console.error(`[AgentsBridge] Task ${taskId} added to project ${projectId}`);
    return true;
  } catch (e) {
    console.error(`[AgentsBridge] Failed to update tasks for ${projectId}:`, e.message);
    return false;
  }
}

// ─── Exports ─────────────────────────────────────────────────────────

export default {
  configure,
  getProjectsIndex,
  getActiveProject,
  getProjectState,
  getProjectTasks,
  getAgentRegistry,
  matchProject,
  getAgentsContext,
  getOrCreateProjectContext,
  updateProjectPhase,
  autoRegisterProject,
  updateProjectTask
};
