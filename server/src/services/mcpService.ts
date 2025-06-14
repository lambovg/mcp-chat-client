import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCPToolCall, MCPToolResult } from "../types/index.js";
import winston from "winston";
import path from "path";

export class MCPService {
  private client: Client | null = null;
  private logger: winston.Logger;
  private serverPath: string;
  private isConnected: boolean = false;

  constructor(logger: winston.Logger) {
    this.logger = logger;
    this.serverPath =
      process.env.MCP_SERVER_PATH ||
      path.join(__dirname, "../../../mcp-ping-pong-server/dist/server.js");
  }

  async connect(): Promise<void> {
    try {
      const transport = new StdioClientTransport({
        command: "node",
        args: [this.serverPath],
      });

      this.client = new Client(
        {
          name: "mcp-chat-backend",
          version: "1.0.0",
        },
        {
          capabilities: {
            tools: {},
          },
        },
      );

      await this.client.connect(transport);
      this.isConnected = true;
      this.logger.info("Connected to MCP server");
    } catch (error) {
      this.logger.error("Failed to connect to MCP server:", error);
      throw new Error("Failed to connect to MCP server");
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.isConnected = false;
      this.logger.info("Disconnected from MCP server");
    }
  }

  async listTools(): Promise<any[]> {
    if (!this.client || !this.isConnected) {
      throw new Error("MCP client not connected");
    }

    try {
      const response = await this.client.listTools();

      return (response as any).tools || [];
    } catch (error) {
      this.logger.error("Failed to list MCP tools:", error);
      throw error;
    }
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    if (!this.client || !this.isConnected) {
      throw new Error("MCP client not connected");
    }

    try {
      this.logger.info("Calling MCP tool:", toolCall);

      // Use the request method with proper params
      const response = await this.client.callTool({
        name: toolCall.name,
        arguments: toolCall.arguments,
      });

      this.logger.info("MCP tool response:", response);

      // Extract content from response
      const result = response as any;
      let content: any;

      if (result.content && Array.isArray(result.content)) {
        // Find text content
        const textContent = result.content.find((c: any) => c.type === "text");
        if (textContent) {
          try {
            // Try to parse as JSON
            content = JSON.parse(textContent.text);
          } catch {
            // If not JSON, use as string
            content = textContent.text;
          }
        } else {
          content = result.content;
        }
      } else {
        content = result;
      }

      return {
        content,
        isError: result.isError || false,
      };
    } catch (error) {
      this.logger.error("Failed to call MCP tool:", error);

      // Return error as result
      return {
        content: {
          error: error instanceof Error ? error.message : "Unknown error",
          details: error,
        },
        isError: true,
      };
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Check if the message requires MCP tool usage
  async checkForToolUse(message: string): Promise<MCPToolCall | null> {
    const lowerMessage = message.toLowerCase().trim();

    // Check if the message is "ping"
    if (lowerMessage === "ping") {
     return {
        name: "ping_pong",
        arguments: { message: "ping" },
      };
    }

    // You can add more tool detection logic here
    return null;
  }
}

