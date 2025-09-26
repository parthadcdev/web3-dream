#!/usr/bin/env node

/**
 * Test script for Git MCP Tools
 * Tests the new Git operations in the unified MCP server
 */

const { spawn } = require('child_process');
const path = require('path');

const mcpServer = path.join(__dirname, 'mcp-server-unified.js');

console.log('🧪 Testing Git MCP Tools');
console.log('========================\n');

// Test Git Status
console.log('1. Testing Git Status...');
const gitStatusMessage = {
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

// Test Smart Commit
console.log('2. Testing Smart Commit...');
const smartCommitMessage = {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: {
    name: "git_commit_smart",
    arguments: {
      files: ["mcp-server-unified.js"],
      message: "feat: Add comprehensive Git operations to unified MCP server",
      link_linear_issue: false,
      run_pre_commit_checks: false
    }
  }
};

// Test Branch Creation
console.log('3. Testing Branch Creation...');
const createBranchMessage = {
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: {
    name: "git_create_branch",
    arguments: {
      branch_name: "git-mcp-integration",
      branch_type: "feature",
      base_branch: "develop",
      linear_issue_id: null
    }
  }
};

// Test Log Analysis
console.log('4. Testing Log Analysis...');
const logAnalysisMessage = {
  jsonrpc: "2.0",
  id: 4,
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

// Send test messages
setTimeout(() => {
  mcpProcess.stdin.write(JSON.stringify(gitStatusMessage) + '\n');
}, 1000);

setTimeout(() => {
  mcpProcess.stdin.write(JSON.stringify(smartCommitMessage) + '\n');
}, 2000);

setTimeout(() => {
  mcpProcess.stdin.write(JSON.stringify(createBranchMessage) + '\n');
}, 3000);

setTimeout(() => {
  mcpProcess.stdin.write(JSON.stringify(logAnalysisMessage) + '\n');
}, 4000);

// Set a timeout
setTimeout(() => {
  mcpProcess.kill();
}, 10000);
