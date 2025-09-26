#!/usr/bin/env node

/**
 * Simple test to verify Git tools in MCP
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Testing Git MCP Tools');
console.log('========================\n');

// Test Git status directly
const testGitStatus = async () => {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    console.log('1. Testing Git status directly...');
    const result = await execAsync('git status --porcelain', { cwd: '/Users/partha/Work/web3-dream' });
    console.log('✅ Git status working:', result.stdout.split('\n').length - 1, 'files');
    
    console.log('2. Testing Git branch...');
    const branchResult = await execAsync('git branch --show-current', { cwd: '/Users/partha/Work/web3-dream' });
    console.log('✅ Current branch:', branchResult.stdout.trim());
    
    console.log('3. Testing Git log...');
    const logResult = await execAsync('git log -1 --oneline', { cwd: '/Users/partha/Work/web3-dream' });
    console.log('✅ Last commit:', logResult.stdout.trim());
    
    console.log('\n🎉 Git tools are working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing Git tools:', error.message);
  }
};

testGitStatus();
