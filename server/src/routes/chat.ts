import { Router, Request, Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { ChatResponse, ConversationStore } from "../types";
import { AnthropicService } from "../services/anthropicService";
import { MCPService } from "../services/mcpService";
import winston from "winston";

const chatRequestSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
});

export function createChatRouter(
  anthropicService: AnthropicService,
  mcpService: MCPService,
  conversationStore: ConversationStore,
  logger: winston.Logger,
): Router {
  const router = Router();

  router.post("/chat", async (req: Request, res: Response) => {
    try {
      // Validate request
      const validatedData = chatRequestSchema.parse(req.body);
      const { message, conversationId } = validatedData;

      // Get or create conversation
      const convId = conversationId || uuidv4();
      if (!conversationStore[convId]) {
        conversationStore[convId] = [];
      }

      // Add user message to conversation
      conversationStore[convId].push({
        role: "user",
        content: message,
      });

      // Check if we need to use MCP tools
      const toolCall = await mcpService.checkForToolUse(message);

      let assistantResponse: string;
      let metadata: any = {};

      if (toolCall) {
        // Call MCP tool
        const toolResult = await mcpService.callTool(toolCall);

        metadata.toolCall = {
          name: toolCall.name,
          arguments: toolCall.arguments,
          result: toolResult.content,
        };

        // For simple tools like ping/pong, we can use a simple response
        if (toolCall.name === "ping_pong") {
          assistantResponse = anthropicService.generateSimpleResponse(
            toolCall,
            toolResult,
          );
        } else {
          // For complex tools, use Claude to generate a natural response
          assistantResponse = await anthropicService.generateResponse(
            conversationStore[convId],
            toolCall,
            toolResult,
          );
        }
      } else {
        // Regular conversation without tools
        assistantResponse = await anthropicService.generateResponse(
          conversationStore[convId],
        );
      }

      // Add assistant response to conversation
      conversationStore[convId].push({
        role: "assistant",
        content: assistantResponse,
      });

      // Create response
      const response: ChatResponse = {
        message: {
          id: uuidv4(),
          content: assistantResponse,
          role: "assistant",
          timestamp: new Date(),
          metadata,
        },
        conversationId: convId,
      };

      res.json(response);
    } catch (error) {
      logger.error("Chat endpoint error:", error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Invalid request",
          details: error.errors,
        });
      } else {
        res.status(500).json({
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  });

  router.get("/chat/history/:conversationId", (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const messages = conversationStore[conversationId] || [];

    res.json({
      messages: messages.map((msg, index) => ({
        id: `${conversationId}-${index}`,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(), // In production, you'd store actual timestamps
      })),
    });
  });

  router.post("/chat/welcome-message", async (req: Request, res: Response) => {
    const toolsResult = await mcpService.listTools();

    const response: ChatResponse = {
      message: {
        id: uuidv4(),
        content: `Hello! I'm your AI assistant. You can the following tools: [${toolsResult.map(({ name }) => name)}]`,
        role: "assistant",
        timestamp: new Date(),
      },
      conversationId: uuidv4(),
    };

    res.json(response);
  });

  return router;
}
