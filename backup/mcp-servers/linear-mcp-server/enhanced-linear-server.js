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
                    projectId: { type: 'string', description: 'Project ID to assign issue to' },
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
                name: 'get_linear_projects',
                description: 'Get all Linear projects',
                inputSchema: {
                  type: 'object',
                  properties: {},
                },
              },
              {
                name: 'assign_issue_to_project',
                description: 'Assign an issue to a project',
                inputSchema: {
                  type: 'object',
                  properties: {
                    issueId: { type: 'string', description: 'Issue ID to assign' },
                    projectId: { type: 'string', description: 'Project ID to assign to' },
                  },
                  required: ['issueId', 'projectId'],
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
              // Use GraphQL mutation directly
              const mutation = `
                mutation IssueCreate($input: IssueCreateInput!) {
                  issueCreate(input: $input) {
                    success
                    issue {
                      id
                      identifier
                      title
                      description
                      url
                      state {
                        name
                      }
                      priority
                      project {
                        id
                        name
                      }
                    }
                  }
                }
              `;
              
              const input = {
                teamId: process.env.LINEAR_TEAM_ID,
                title: args.title,
                description: args.description,
                priority: args.priority || 3,
              };

              // Add project ID if provided
              if (args.projectId) {
                input.projectId = args.projectId;
              }
              
              const variables = { input };
              
              const result = await linearClient.client.request(mutation, variables);
              
              if (result.issueCreate.success) {
                const issue = result.issueCreate.issue;
                const projectInfo = issue.project ? `\nProject: ${issue.project.name}` : '';
                return {
                  jsonrpc: '2.0',
                  id,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: `✅ Created issue: ${issue.identifier} - ${issue.title}${projectInfo}\nURL: ${issue.url}`,
                      },
                    ],
                  },
                };
              } else {
                throw new Error('Failed to create issue');
              }
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
              const query = `
                query Issues($first: Int) {
                  issues(first: $first) {
                    nodes {
                      id
                      identifier
                      title
                      state {
                        name
                      }
                      priority
                      url
                      project {
                        id
                        name
                      }
                    }
                  }
                }
              `;
              
              const result = await linearClient.client.request(query, {
                first: args.limit || 10
              });

              const issueList = result.issues.nodes.map(issue => {
                const projectInfo = issue.project ? ` [${issue.project.name}]` : '';
                return `${issue.identifier}: ${issue.title} (${issue.state.name})${projectInfo}`;
              }).join('\n');

              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `Found ${result.issues.nodes.length} issues:\n${issueList}`,
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

          case 'get_linear_projects':
            try {
              const query = `
                query Projects {
                  projects {
                    nodes {
                      id
                      name
                      description
                      state
                      progress
                      teams {
                        nodes {
                          id
                          name
                        }
                      }
                    }
                  }
                }
              `;
              
              const result = await linearClient.client.request(query);
              const projectList = result.projects.nodes.map(project => 
                `${project.name} - ${project.state} - Teams: ${project.teams?.nodes?.map(t => t.name).join(', ') || 'None'}`
              ).join('\n');

              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `Projects:\n${projectList}`,
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
                      text: `❌ Error fetching projects: ${error.message}`,
                    },
                  ],
                },
              };
            }

          case 'assign_issue_to_project':
            try {
              const mutation = `
                mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
                  issueUpdate(id: $id, input: $input) {
                    success
                    issue {
                      id
                      identifier
                      title
                      project {
                        id
                        name
                      }
                    }
                  }
                }
              `;
              
              const result = await linearClient.client.request(mutation, {
                id: args.issueId,
                input: {
                  projectId: args.projectId
                }
              });
              
              if (result.issueUpdate.success) {
                const issue = result.issueUpdate.issue;
                return {
                  jsonrpc: '2.0',
                  id,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: `✅ Assigned issue ${issue.identifier} to project: ${issue.project.name}`,
                      },
                    ],
                  },
                };
              } else {
                throw new Error('Failed to assign issue to project');
              }
            } catch (error) {
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `❌ Error assigning issue: ${error.message}`,
                    },
                  ],
                },
              };
            }

          case 'get_linear_teams':
            try {
              const query = `
                query Teams {
                  teams {
                    nodes {
                      id
                      name
                      key
                      members {
                        nodes {
                          id
                          name
                        }
                      }
                    }
                  }
                }
              `;
              
              const result = await linearClient.client.request(query);
              const teamList = result.teams.nodes.map(team => 
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
              const query = `
                query Viewer {
                  viewer {
                    id
                    name
                    email
                    isBot
                  }
                }
              `;
              
              const result = await linearClient.client.request(query);
              const user = result.viewer;
              
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `Current User: ${user.name} (${user.email})\nID: ${user.id}\nIs Bot: ${user.isBot ? 'Yes' : 'No'}`,
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
  console.error('🚀 Enhanced Linear MCP Server starting...');
  
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

  console.error('✅ Enhanced Linear MCP server ready for requests');
}

main().catch(console.error);
