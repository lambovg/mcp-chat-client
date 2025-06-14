# MCP Chat Client

A production-ready React application that integrates with Anthropic's Claude API and communicates with MCP (Model Context Protocol) servers. This proof of concept demonstrates real-time chat functionality with MCP tool integration.

## Features

- 🤖 **Anthropic Claude Integration**: Powered by Claude for intelligent responses
- 🔧 **MCP Server Communication**: Seamlessly integrates with MCP tools
- 🚀 **Real-time Updates**: WebSocket support for instant messaging
- 💬 **Full Chat Interface**: Complete with message history and typing indicators
- 🏓 **Ping/Pong Demo**: Test MCP integration with a simple ping/pong tool
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Architecture

The application consists of three main components:

1. **React Frontend**: Modern TypeScript React app with real-time chat UI
2. **Backend Server**: Express server that bridges React ↔ Anthropic ↔ MCP
3. **MCP Server**: Separate process running the MCP protocol server
