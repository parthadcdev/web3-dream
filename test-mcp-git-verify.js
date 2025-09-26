#!/usr/bin/env node

/**
 * Verify Git MCP Tools are working
 */

const { spawn } = require('child_process');
const path = require('path');

const mcpServer = path.join(__dirname, 'mcp-server-unified.js');

console.log('🔍 Verifying Git MCP Tools');
console.log('==========================\n');

// Test message to get tools list
const toolsListMessage = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {}
};

// Test Git status
const gitStatusMessage = {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: {
    name: "git_status",
    arguments: {
      include_staged: true,
      include_untracked: true
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

// Send tools list request
setTimeout(() => {
  console.log('1. Requesting tools list...');
  mcpProcess.stdin.write(JSON.stringify(toolsListMessage) + '\n');
}, 500);

// Send Git status request
setTimeout(() => {
  console.log('2. Testing Git status tool...');
  mcpProcess.stdin.write(JSON.stringify(gitStatusMessage) + '\n');
}, 1500);

// Close after 5 seconds
setTimeout(() => {
  mcpProcess.kill();
}, 5000);
