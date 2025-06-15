import Anthropic from "@anthropic-ai/sdk";
import { ChatMessage, MCPToolCall, MCPToolResult } from "../types";
import winston from "winston";
import {
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/messages";

export class AnthropicService {
  private client: Anthropic;
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }

    this.client = new Anthropic({
      apiKey: apiKey,
    });
  }

  async generateResponse(
    messages: ChatMessage[],
    toolCall?: MCPToolCall,
    toolResult?: MCPToolResult,
  ): Promise<string> {
    try {
      // Build the messages array for Anthropic
      const anthropicMessages = this.buildAnthropicMessages(
        messages,
        toolCall,
        toolResult,
      );

      const response = await this.client.messages.create({
        model: "claude-4-sonnet-20250514",
        max_tokens: 1000,
        messages: anthropicMessages,
        system: this.buildSystemPrompt(toolCall, toolResult),
      });

      // Extract text content from the response
      const textContent = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      return textContent;
    } catch (error) {
      this.logger.error("Failed to generate Anthropic response:", error);
      throw error;
    }
  }

  private buildAnthropicMessages(
    messages: ChatMessage[],
    toolCall?: MCPToolCall,
    toolResult?: MCPToolResult,
  ): Array<{ role: "user" | "assistant"; content: string }> {
    const anthropicMessages = messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // If we have a tool result, add it to the context
    if (toolCall && toolResult) {
      const toolContext = `\nTool Call: ${toolCall.name}
Arguments: ${JSON.stringify(toolCall.arguments)}
Result: ${JSON.stringify(toolResult.content)}`;

      // Add tool context to the last user message
      if (anthropicMessages.length > 0) {
        const lastMessage = anthropicMessages[anthropicMessages.length - 1];
        if (lastMessage.role === "user") {
          lastMessage.content += toolContext;
        }
      }
    }

    return anthropicMessages;
  }

  private buildSystemPrompt(
    toolCall?: MCPToolCall,
    toolResult?: MCPToolResult,
  ): string {
    let systemPrompt = `You are a helpful AI assistant integrated with an MCP (Model Context Protocol) server.
You can help users interact with MCP tools and provide informative responses.`;

    if (toolCall && toolResult) {
      systemPrompt += `\n\nYou just used the MCP tool "${toolCall.name}" and received a result.
Please provide a natural, conversational response based on this tool result.
Don't just repeat the raw result - interpret it and respond naturally.`;

      // Special handling for ping/pong
      if (toolCall.name === "ping_pong" && !toolResult.isError) {
        systemPrompt += `\n\nFor the ping/pong tool, when the user says "ping" and gets "pong" back,
respond in a friendly, conversational way that acknowledges the successful ping-pong exchange.`;
      }
    }

    return systemPrompt;
  }

  // Simple response for when we don't need Claude
  generateSimpleResponse(
    toolCall: MCPToolCall,
    toolResult: MCPToolResult,
  ): string {
    // For ping/pong, we can generate a simple response without calling Claude
    if (toolCall.name === "ping_pong" && !toolResult.isError) {
      const result = toolResult.content;

      if (result.response === "pong") {
        return "🏓 Pong! The MCP server responded successfully to your ping.";
      }

      return result.response || "Received response from MCP server.";
    }

    // For other tools or errors, return formatted result
    if (toolResult.isError) {
      return `Error calling tool ${toolCall.name}: ${JSON.stringify(toolResult.content)}`;
    }

    return `Tool ${toolCall.name} returned: ${JSON.stringify(toolResult.content)}`;
  }

  async processQuery(tools: Tool[], messages: ChatMessage[]): Promise<string> {
    // Build the messages array for Anthropic
    const anthropicMessages = this.buildAnthropicMessages(messages);

    const response = await this.client.messages.create({
      model: "claude-4-sonnet-20250514",
      max_tokens: 1000,
      messages: anthropicMessages,
      tools,
    });

    // Extract text content from the response
    const textContent = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return textContent;
  }
}
