#!/usr/bin/env node

/**
 * Test Git status tool directly
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Git Status Tool Directly');
console.log('===================================\n');

const mcpServer = path.join(__dirname, 'mcp-server-unified.js');

// Create a test message
const testMessage = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "git_status",
    arguments: {
      include_staged: true,
      include_untracked: true
    }
  }
};

console.log('Sending test message to MCP server...');
console.log('Message:', JSON.stringify(testMessage, null, 2));

const mcpProcess = spawn('node', [mcpServer], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

mcpProcess.stdout.on('data', (data) => {
  const response = data.toString();
  console.log('📤 MCP Response:');
  console.log(response);
  
  try {
    const parsed = JSON.parse(response);
    if (parsed.result && parsed.result.content) {
      console.log('✅ Git status tool working!');
      console.log('📊 Status data:', parsed.result.content[0].text);
    }
  } catch (e) {
    console.log('Raw response:', response);
  }
});

mcpProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.log('Error output:', data.toString());
});

mcpProcess.on('close', (code) => {
  console.log(`\nProcess exited with code: ${code}`);
  if (errorOutput) {
    console.log('Error details:', errorOutput);
  }
});

// Send the test message
mcpProcess.stdin.write(JSON.stringify(testMessage) + '\n');

// Close after 3 seconds
setTimeout(() => {
  mcpProcess.kill();
}, 3000);
