#!/bin/bash

# Linear MCP Server Setup Script

echo "🚀 Setting up Linear MCP Server for AI Agents..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are available"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please edit it with your Linear API credentials."
else
    echo "✅ .env file already exists"
fi

# Make scripts executable
chmod +x linear-mcp-server.js
chmod +x test-server.js

echo "✅ Scripts made executable"

# Test the server
echo "🧪 Testing MCP server..."
npm test

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Edit .env file with your Linear API credentials"
    echo "2. Configure Cursor MCP with the settings in cursor-mcp-config.json"
    echo "3. Restart Cursor to load the MCP server"
    echo ""
    echo "🔧 Available commands:"
    echo "  npm start     - Start the MCP server"
    echo "  npm run dev   - Start in development mode (auto-restart)"
    echo "  npm test      - Test the server functionality"
    echo ""
    echo "📚 For more information, see README.md"
else
    echo "⚠️  Setup completed with warnings. Check the test output above."
fi
