import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { config } from "../../config/google.config.js";
import { getEnabledTools } from "../../config/tool.config.js";
import chalk from "chalk";

export class AIService {
  constructor() {
    if (!config.googleApiKey) {
      throw new Error("GOOGLE_API_KEY is not set in environment variables");
    }

    this.model = new ChatGoogleGenerativeAI({
      model: config.model,
      apiKey: config.googleApiKey,
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
      // Enable Google Search grounding and Code Execution (Native)
      tools: [
        { googleSearchRetrieval: {} },
        { codeExecution: {} }
      ],
    });
  }

  /**
   * Send a message and get streaming response
   * @param {Array} messages - Array of message objects {role, content}
   * @param {Function} onChunk - Callback for each text chunk
   * @param {Object} tools - Optional tools object (not implemented yet)
   * @param {Function} onToolCall - Callback for tool calls (not implemented yet)
   * @returns {Promise<Object>} Full response with content, tool calls, and usage
   */
  async sendMessage(messages, onChunk, tools = undefined, onToolCall = null) {
    try {
      // Convert messages to LangChain format
      const langchainMessages = this.convertToLangChainMessages(messages);

      // Get enabled LangChain tools (e.g. search_codebase)
      const enabledTools = getEnabledTools();

      let modelToUse = this.model;
      if (enabledTools.length > 0) {
        modelToUse = this.model.bindTools(enabledTools);
      }

      let fullResponse = "";
      let toolCalls = [];
      let aiMessageContent = "";

      // Stream the initial response
      const stream = await modelToUse.stream(langchainMessages);

      for await (const chunk of stream) {
        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          toolCalls.push(...chunk.tool_calls);
        }

        const content = chunk.content || "";
        aiMessageContent += content;

        // Only stream content if it's not a tool call (or if it's mixed)
        // Usually tool calls come without content, or content is "thinking"
        if (content && toolCalls.length === 0) {
          fullResponse += content;
          if (onChunk) onChunk(content);
        }
      }

      // If we have tool calls, execute them
      if (toolCalls.length > 0) {
        if (onToolCall) onToolCall(toolCalls);

        // Notify user we are running a tool (if not already clear)
        // if (onChunk) onChunk("\n\n⚙️ Using tools...\n");

        const toolMessages = [];
        for (const call of toolCalls) {
          const tool = enabledTools.find(t => t.name === call.name);
          if (tool) {
            console.log(chalk.blue(`[Tool] Executing ${call.name}...`));
            try {
              const output = await tool.call(call.args);
              toolMessages.push(new ToolMessage({
                tool_call_id: call.id,
                content: output,
                name: call.name
              }));
            } catch (err) {
              toolMessages.push(new ToolMessage({
                tool_call_id: call.id,
                content: "Error: " + err.message,
                name: call.name
              }));
            }
          }
        }

        // Reconstruct the conversation with the tool call and result
        const aiMessage = new AIMessage({
          content: aiMessageContent,
          tool_calls: toolCalls
        });

        const newMessages = [...langchainMessages, aiMessage, ...toolMessages];

        // Call model again with tool results
        const stream2 = await modelToUse.stream(newMessages);

        for await (const chunk of stream2) {
          const content = chunk.content || "";
          fullResponse += content;
          if (onChunk) onChunk(content);
        }
      }

      return {
        content: fullResponse,
        finishReason: "stop",
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        toolCalls: toolCalls,
        toolResults: [],
        steps: [],
      };
    } catch (error) {
      console.error(chalk.red("AI Service Error:"), error.message);
      console.error(chalk.red("Full error:"), error);
      throw error;
    }
  }

  /**
   * Convert standard message format to LangChain messages
   * @param {Array} messages - Array of {role, content} objects
   * @returns {Array} Array of LangChain message objects
   */
  convertToLangChainMessages(messages) {
    return messages.map((msg) => {
      if (msg.role === "user") {
        return new HumanMessage({ content: msg.content });
      } else if (msg.role === "assistant") {
        return new AIMessage({ content: msg.content });
      } else {
        // Default to HumanMessage for unknown roles
        return new HumanMessage({ content: msg.content });
      }
    });
  }

  /**
   * Get a non-streaming response
   * @param {Array} messages - Array of message objects
   * @param {Object} tools - Optional tools
   * @returns {Promise<string>} Response text
   */
  async getMessage(messages, tools = undefined) {
    let fullResponse = "";
    const result = await this.sendMessage(messages, (chunk) => {
      fullResponse += chunk;
    }, tools);
    return result.content;
  }

  /**
   * Simple invoke method for single question
   * @param {string} question - User question
   * @returns {Promise<string>} Response text
   */
  async invoke(question) {
    const messages = [new HumanMessage({ content: question })];
    const response = await this.model.invoke(messages);
    return response.content;
  }
}