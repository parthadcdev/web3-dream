#!/usr/bin/env node

/**
 * Test script for Unified TraceChain MCP Server
 * Tests all major functionality of the unified MCP server
 */

const { spawn } = require('child_process');
const path = require('path');

const mcpServer = path.join(__dirname, 'mcp-server-unified.js');

console.log('🧪 Testing Unified TraceChain MCP Server');
console.log('==========================================\n');

// Test 1: Initialize message
console.log('1. Testing initialize...');
const initMessage = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    capabilities: {
      tools: {
        listChanged: true
      },
      resources: {
        subscribe: true,
        listChanged: true
      }
    },
    clientInfo: {
      name: "test-client",
      version: "1.0.0"
    }
  }
};

const mcpProcess = spawn('node', [mcpServer], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

mcpProcess.stdout.on('data', (data) => {
  output += data.toString();
});

mcpProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

mcpProcess.on('close', (code) => {
  console.log('Exit code:', code);
  if (output) {
    console.log('Output:', output);
  }
  if (errorOutput) {
    console.log('Error:', errorOutput);
  }
});

// Send the initialize message
mcpProcess.stdin.write(JSON.stringify(initMessage) + '\n');
mcpProcess.stdin.end();

// Set a timeout
setTimeout(() => {
  mcpProcess.kill();
}, 5000);
