#!/usr/bin/env node

/**
 * Verify MCP tools are loaded correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying MCP Tools in Code');
console.log('==============================\n');

// Read the MCP server file
const mcpServerPath = path.join(__dirname, 'mcp-server-unified.js');
const mcpServerContent = fs.readFileSync(mcpServerPath, 'utf8');

// Check for Git tools
const gitTools = [
  'git_status',
  'git_commit_smart', 
  'git_create_branch',
  'git_merge_smart',
  'git_pre_commit_review',
  'git_log_analysis',
  'git_release_management'
];

console.log('Checking for Git tools in MCP server:');
gitTools.forEach(tool => {
  if (mcpServerContent.includes(`name: "${tool}"`)) {
    console.log(`✅ ${tool} - Found`);
  } else {
    console.log(`❌ ${tool} - Missing`);
  }
});

// Check for Git tool handlers
console.log('\nChecking for Git tool handlers:');
gitTools.forEach(tool => {
  if (mcpServerContent.includes(`'${tool}':`)) {
    console.log(`✅ ${tool} handler - Found`);
  } else {
    console.log(`❌ ${tool} handler - Missing`);
  }
});

// Check for Git method implementations
const gitMethods = [
  'gitStatus(',
  'gitCommitSmart(',
  'gitCreateBranch(',
  'gitMergeSmart(',
  'gitPreCommitReview(',
  'gitLogAnalysis(',
  'gitReleaseManagement('
];

console.log('\nChecking for Git method implementations:');
gitMethods.forEach(method => {
  if (mcpServerContent.includes(method)) {
    console.log(`✅ ${method} - Found`);
  } else {
    console.log(`❌ ${method} - Missing`);
  }
});

console.log('\n🎯 MCP Git Tools Verification Complete!');
