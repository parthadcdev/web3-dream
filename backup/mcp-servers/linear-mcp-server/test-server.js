#!/usr/bin/env node

/**
 * Test script for Linear MCP Server
 * This script tests the MCP server functionality without requiring Cursor
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const serverPath = join(__dirname, 'linear-mcp-server.js');

// Test cases
const tests = [
  {
    name: 'List Tools',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    }
  },
  {
    name: 'Get Current User',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_current_user',
        arguments: {}
      }
    }
  },
  {
    name: 'Get Teams',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_linear_teams',
        arguments: {}
      }
    }
  }
];

// Run a single test
function runTest(test) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running test: ${test.name}`);
    
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LINEAR_API_KEY: process.env.LINEAR_API_KEY || 'test-key'
      }
    });

    let output = '';
    let errorOutput = '';

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    server.on('close', (code) => {
      if (code === 0) {
        try {
          const response = JSON.parse(output.trim());
          console.log('✅ Test passed');
          console.log('Response:', JSON.stringify(response, null, 2));
          resolve(response);
        } catch (error) {
          console.log('❌ Test failed - Invalid JSON response');
          console.log('Output:', output);
          console.log('Error:', errorOutput);
          reject(error);
        }
      } else {
        console.log('❌ Test failed - Server exited with code', code);
        console.log('Error:', errorOutput);
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Send the request
    server.stdin.write(JSON.stringify(test.request) + '\n');
    server.stdin.end();

    // Timeout after 10 seconds
    setTimeout(() => {
      server.kill();
      reject(new Error('Test timeout'));
    }, 10000);
  });
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Linear MCP Server Tests\n');
  
  // Check if API key is configured
  if (!process.env.LINEAR_API_KEY) {
    console.log('⚠️  LINEAR_API_KEY not set. Some tests may fail.');
    console.log('   Set LINEAR_API_KEY=your_key to test with real Linear API\n');
  }

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await runTest(test);
      passed++;
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! MCP server is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the configuration and try again.');
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, runTest };
