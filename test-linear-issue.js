const { spawn } = require('child_process');

async function searchLinearIssue() {
  const mcpServer = spawn('node', ['mcp-server-unified.js'], {
    cwd: '/Users/partha/Work/web3-dream',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Search for Linear issue AXO-23
  const searchMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "search_linear_issues",
      arguments: {
        query: "AXO-23",
        limit: 1
      }
    }
  };

  console.log('🔍 Searching for Linear issue AXO-23...');
  console.log('Message:', JSON.stringify(searchMessage, null, 2));

  mcpServer.stdin.write(JSON.stringify(searchMessage) + '\n');

  let output = '';
  mcpServer.stdout.on('data', (data) => {
    output += data.toString();
    console.log('📤 MCP Response:');
    console.log(data.toString());
  });

  mcpServer.stderr.on('data', (data) => {
    console.log('Error output:', data.toString());
  });

  mcpServer.on('close', (code) => {
    console.log(`Process exited with code: ${code}`);
    if (output) {
      try {
        const response = JSON.parse(output);
        console.log('📊 Parsed Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('Could not parse response as JSON');
      }
    }
  });

  // Close after 5 seconds
  setTimeout(() => {
    mcpServer.kill();
  }, 5000);
}

searchLinearIssue().catch(console.error);
