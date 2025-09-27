const { spawn } = require('child_process');

async function searchLinearIssues() {
  const mcpServer = spawn('node', ['mcp-server-unified.js'], {
    cwd: '/Users/partha/Work/web3-dream',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      LINEAR_API_KEY: "your_linear_api_key_here",
      LINEAR_TEAM_ID: "9b0fb88f-c6f6-4a15-b952-af836c4a25c4",
      LINEAR_WORKSPACE_ID: "9b04d949-3b86-4be2-bda3-2ec7af31b701"
    }
  });

  // Search for all issues to see what's available
  const searchMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "search_linear_issues",
      arguments: {
        query: "",
        limit: 10
      }
    }
  };

  console.log('🔍 Searching for Linear issues...');
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

searchLinearIssues().catch(console.error);
