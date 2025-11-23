import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { config } from "../../config/google.config.js";
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
      // Enable Google Search grounding and Code Execution
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

      let fullResponse = "";

      // Stream the response
      const stream = await this.model.stream(langchainMessages);

      for await (const chunk of stream) {
        const content = chunk.content || "";
        fullResponse += content;
        if (onChunk && content) {
          onChunk(content);
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
        toolCalls: [],
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