#!/usr/bin/env node

import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

// Initialize Linear client
let linearClient;
try {
  if (!process.env.LINEAR_API_KEY) {
    throw new Error('LINEAR_API_KEY environment variable is required');
  }
  linearClient = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY,
  });
  console.error('✅ Linear client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Linear client:', error.message);
  process.exit(1);
}

// Simple JSON-RPC handler
async function handleRequest(request) {
  try {
    const { method, params, id } = request;

    switch (method) {
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'create_linear_issue',
                description: 'Create a new Linear issue',
                inputSchema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Issue title' },
                    description: { type: 'string', description: 'Issue description' },
                    priority: { type: 'number', description: 'Priority (1=Urgent, 2=High, 3=Normal, 4=Low)' },
                  },
                  required: ['title'],
                },
              },
              {
                name: 'search_linear_issues',
                description: 'Search Linear issues',
                inputSchema: {
                  type: 'object',
                  properties: {
                    limit: { type: 'number', description: 'Maximum number of results' },
                  },
                },
              },
              {
                name: 'get_linear_teams',
                description: 'Get all Linear teams',
                inputSchema: {
                  type: 'object',
                  properties: {},
                },
              },
              {
                name: 'get_current_user',
                description: 'Get current Linear user',
                inputSchema: {
                  type: 'object',
                  properties: {},
                },
              },
            ],
          },
        };

      case 'tools/call':
        const { name, arguments: args } = params;
        
        switch (name) {
          case 'create_linear_issue':
            try {
              const issue = await linearClient.issue.create({
                teamId: process.env.LINEAR_TEAM_ID,
                title: args.title,
                description: args.description,
                priority: args.priority || 3,
              });
              
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `✅ Created issue: ${issue.identifier} - ${issue.title}\nURL: ${issue.url}`,
                    },
                  ],
                },
              };
            } catch (error) {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `❌ Error creating issue: ${error.message}`,
                    },
                  ],
                },
              };
            }

          case 'search_linear_issues':
            try {
              const issues = await linearClient.issue.list({
                first: args.limit || 10,
              });

              const issueList = issues.nodes.map(issue => 
                `${issue.identifier}: ${issue.title} (${issue.state.name})`
              ).join('\n');

              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `Found ${issues.nodes.length} issues:\n${issueList}`,
                    },
                  ],
                },
              };
            } catch (error) {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `❌ Error searching issues: ${error.message}`,
                    },
                  ],
                },
              };
            }

          case 'get_linear_teams':
            try {
              const teams = await linearClient.team.list();
              const teamList = teams.nodes.map(team => 
                `${team.name} (${team.key}) - ${team.members?.nodes?.length || 0} members`
              ).join('\n');

              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `Teams:\n${teamList}`,
                    },
                  ],
                },
              };
            } catch (error) {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `❌ Error fetching teams: ${error.message}`,
                    },
                  ],
                },
              };
            }

          case 'get_current_user':
            try {
              const user = await linearClient.viewer;
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `Current User: ${user.name} (${user.email})\nID: ${user.id}`,
                    },
                  ],
                },
              };
            } catch (error) {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `❌ Error fetching user: ${error.message}`,
                    },
                  ],
                },
              };
            }

          default:
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32601,
                message: `Unknown tool: ${name}`,
              },
            };
        }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Unknown method: ${method}`,
          },
        };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message,
      },
    };
  }
}

// Main server loop
async function main() {
  console.error('🚀 Linear MCP Server starting...');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('line', async (line) => {
    try {
      const request = JSON.parse(line);
      const response = await handleRequest(request);
      console.log(JSON.stringify(response));
    } catch (error) {
      console.error('Error processing request:', error.message);
      console.log(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
        },
      }));
    }
  });

  console.error('✅ Linear MCP server ready for requests');
}

main().catch(console.error);
