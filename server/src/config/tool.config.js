import chalk from 'chalk';

/**
 * Available Google Generative AI tools configuration
 * Note: Tools are now enabled natively in the Gemini model configuration (google-service.js)
 * This config file is kept for metadata and future extensibility.
 */
export const availableTools = [
  {
    id: 'google_search',
    name: 'Google Search',
    description: 'Access the latest information using Google search. (Native Gemini Tool)',
    getTool: () => null,
    enabled: true,
  },
  {
    id: 'code_execution',
    name: 'Code Execution',
    description: 'Generate and execute Python code. (Native Gemini Tool)',
    getTool: () => null,
    enabled: true,
  },
];

/**
 * Get enabled tools as a tools object for LangChain
 */
export function getEnabledTools() {
  // Tools are handled natively by the model config in google-service.js
  // We return undefined here because we don't need to pass separate LangChain tool objects
  // for Gemini's native tools.

  const enabledTools = availableTools.filter(t => t.enabled).map(t => t.name);

  if (enabledTools.length > 0) {
    console.log(chalk.gray(`[DEBUG] Native Gemini Tools Enabled: ${enabledTools.join(', ')} `));
  }

  return undefined;
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