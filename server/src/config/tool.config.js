import chalk from 'chalk';
import { DynamicTool } from '@langchain/core/tools';
import { CodebaseIndexer } from '../ai/rag.js';

// Singleton indexer
let indexer = null;

function getIndexer() {
  if (!indexer) {
    indexer = new CodebaseIndexer(process.cwd());
  }
  return indexer;
}

/**
 * Available Google Generative AI tools configuration
 */
export const availableTools = [
  {
    id: 'google_search',
    name: 'Google Search',
    description: 'Access the latest information using Google search. (Native Gemini Tool)',
    getTool: () => null, // Native
    enabled: true,
  },
  {
    id: 'code_execution',
    name: 'Code Execution',
    description: 'Generate and execute Python code. (Native Gemini Tool)',
    getTool: () => null, // Native
    enabled: true,
  },
  {
    id: 'search_codebase',
    name: 'Search Codebase',
    description: 'Search the local project codebase for code snippets, functions, or logic.',
    getTool: () => new DynamicTool({
      name: "search_codebase",
      description: "Search the local project codebase for code snippets, functions, or logic. Input should be a search query string.",
      func: async (query) => {
        try {
          const idx = getIndexer();
          const results = await idx.search(query);
          return JSON.stringify(results, null, 2);
        } catch (error) {
          return "Error searching codebase: " + error.message;
        }
      }
    }),
    enabled: true,
  }
];

/**
 * Get enabled tools as a tools object for LangChain
 */
export function getEnabledTools() {
  const tools = [];
  availableTools.forEach(t => {
    if (t.enabled && t.getTool) {
      const toolInstance = t.getTool();
      if (toolInstance) tools.push(toolInstance);
    }
  });

  return tools.length > 0 ? tools : [];
}

/**
 * Toggle a tool's enabled state
 */
export function toggleTool(toolId) {
  const tool = availableTools.find(t => t.id === toolId);
  if (tool) {
    tool.enabled = !tool.enabled;
    console.log(chalk.gray(`[DEBUG] Tool ${toolId} toggled to ${tool.enabled} `));
    return tool.enabled;
  }
  console.log(chalk.red(`[DEBUG] Tool ${toolId} not found`));
  return false;
}

/**
 * Enable specific tools
 */
export function enableTools(toolIds) {
  console.log(chalk.gray('[DEBUG] enableTools called with:'), toolIds);

  availableTools.forEach(tool => {
    const wasEnabled = tool.enabled;
    tool.enabled = toolIds.includes(tool.id);

    if (tool.enabled !== wasEnabled) {
      console.log(chalk.gray(`[DEBUG] ${tool.id}: ${wasEnabled} → ${tool.enabled} `));
    }
  });

  const enabledCount = availableTools.filter(t => t.enabled).length;
  console.log(chalk.gray(`[DEBUG] Total tools enabled: ${enabledCount}/${availableTools.length}`));
}

/**
 * Get all enabled tool names
 */
export function getEnabledToolNames() {
  const names = availableTools.filter(t => t.enabled).map(t => t.name);
  console.log(chalk.gray('[DEBUG] getEnabledToolNames returning:'), names);
  return names;
}

/**
 * Reset all tools (disable all)
 */
export function resetTools() {
  availableTools.forEach(tool => {
    tool.enabled = false;
  });
  console.log(chalk.gray('[DEBUG] All tools have been reset (disabled)'));
}