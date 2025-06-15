import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";
import winston from "winston";
import { v4 as uuidv4 } from "uuid";
import { createChatRouter } from "./routes/chat";
import { AnthropicService } from "./services/anthropicService";
import { MCPService } from "./services/mcpService";
import { ConversationStore } from "./types";
import { Tool } from "@anthropic-ai/sdk/resources/messages/messages";

// Load environment variables
dotenv.config();

// Setup logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

// Initialize services
const conversationStore: ConversationStore = {};
const anthropicService = new AnthropicService(logger);
const mcpService = new MCPService(logger);

// Create Express app
const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  }),
);
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mcpConnected: mcpService.getConnectionStatus(),
  });
});

// Chat routes
app.use(
  "/api",
  createChatRouter(anthropicService, mcpService, conversationStore, logger),
);

// WebSocket handling
io.on("connection", (socket) => {
  logger.info("Client connected", { socketId: socket.id });

  socket.on(
    "chat:message",
    async (data: { message: string; conversationId?: string }) => {
      try {
        const { message, conversationId } = data;
        const convId = conversationId || uuidv4();

        // Initialize conversation if needed
        if (!conversationStore[convId]) {
          conversationStore[convId] = [];
        }

        // Add user message
        conversationStore[convId].push({
          role: "user",
          content: message,
        });

        console.log(">>>>>>> message", message);
        // Emit user message back for confirmation
        socket.emit("message", {
          type: "message",
          data: {
            id: uuidv4(),
            content: message,
            role: "user",
            timestamp: new Date(),
          },
        });

        // Check for tool use
        const toolCall = await mcpService.checkForToolUse(message);
        console.log(">>> toolcall", toolCall);

        let assistantResponse: string;
        let metadata: any = {};

        if (toolCall) {
          // Emit tool call notification
          socket.emit("message", {
            type: "tool_call",
            data: {
              toolName: toolCall.name,
              arguments: toolCall.arguments,
            },
          });

          // Call MCP tool
          const toolResult = await mcpService.callTool(toolCall);

          metadata.toolCall = {
            name: toolCall.name,
            arguments: toolCall.arguments,
            result: toolResult.content,
          };

          // Generate response
          if (toolCall.name === "ping_pong") {
            assistantResponse = anthropicService.generateSimpleResponse(
              toolCall,
              toolResult,
            );
          } else {
            assistantResponse = await anthropicService.generateResponse(
              conversationStore[convId],
              toolCall,
              toolResult,
            );
          }
        } else {
          const toolsResult = await mcpService.listTools();

          const tools: Tool[] = toolsResult.map((tool) => {
            return {
              name: tool.name,
              description: tool.description,
              input_schema: tool.inputSchema,
            };
          });

          // Regular conversation
          assistantResponse = await anthropicService.processQuery(
            tools,
            conversationStore[convId],
          );
        }

        // Add assistant response
        conversationStore[convId].push({
          role: "assistant",
          content: assistantResponse,
        });

        // Emit assistant response
        socket.emit("message", {
          type: "message",
          data: {
            id: uuidv4(),
            content: assistantResponse,
            role: "assistant",
            timestamp: new Date(),
            metadata,
          },
        });
      } catch (error) {
        logger.error("WebSocket message error:", error);
        socket.emit("message", {
          type: "error",
          data: {
            message:
              error instanceof Error ? error.message : "An error occurred",
          },
        });
      }
    },
  );

  socket.on("disconnect", () => {
    logger.info("Client disconnected", { socketId: socket.id });
  });
});

// Start server
async function start() {
  try {
    // Connect to MCP server
    await mcpService.connect();
    logger.info("Connected to MCP server");

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  await mcpService.disconnect();
  server.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down...");
  await mcpService.disconnect();
  server.close();
  process.exit(0);
});

// Start the server
start();

