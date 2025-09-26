#!/usr/bin/env node

/**
 * Test Git log analysis tool
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Git Log Analysis Tool');
console.log('=================================\n');

const mcpServer = path.join(__dirname, 'mcp-server-unified.js');

// Test Git log analysis
const logAnalysisMessage = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "git_log_analysis",
    arguments: {
      since: "1 week ago",
      include_stats: true,
      include_linear_issues: true
    }
  }
};

console.log('Testing Git log analysis...');
console.log('Message:', JSON.stringify(logAnalysisMessage, null, 2));

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
      console.log('✅ Git log analysis tool working!');
      const logData = JSON.parse(parsed.result.content[0].text);
      console.log('📊 Analysis results:');
      console.log(`- Period: ${logData.period}`);
      console.log(`- Total commits: ${logData.total_commits}`);
      console.log(`- Author: ${logData.author}`);
      console.log(`- Commits: ${logData.commits.length}`);
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
mcpProcess.stdin.write(JSON.stringify(logAnalysisMessage) + '\n');

// Close after 3 seconds
setTimeout(() => {
  mcpProcess.kill();
}, 3000);
