#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { LinearClient } from '@linear/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const server = new Server(
  {
    name: 'linear-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize Linear client
let linearClient;
try {
  if (!process.env.LINEAR_API_KEY) {
    throw new Error('LINEAR_API_KEY environment variable is required');
  }
  linearClient = new LinearClient({
    apiKey: process.env.LINEAR_API_KEY,
  });
} catch (error) {
  console.error('Failed to initialize Linear client:', error.message);
  process.exit(1);
}

// Tool: Create Issue
async function createLinearIssue(args) {
  try {
    const issue = await linearClient.issueCreate({
      teamId: args.teamId || process.env.LINEAR_TEAM_ID,
      title: args.title,
      description: args.description,
      priority: args.priority || 3,
      assigneeId: args.assigneeId,
      projectId: args.projectId || process.env.LINEAR_PROJECT_ID,
      labelIds: args.labels,
      dueDate: args.dueDate,
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `✅ Created issue: ${issue.identifier} - ${issue.title}\nURL: ${issue.url}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error creating issue: ${error.message}`,
        },
      ],
    };
  }
}

// Tool: Search Issues
async function searchLinearIssues(args) {
  try {
    const issues = await linearClient.issues({
      filter: {
        team: args.teamId ? { id: { eq: args.teamId } } : undefined,
        assignee: args.assigneeId ? { id: { eq: args.assigneeId } } : undefined,
        state: args.state ? { name: { eq: args.state } } : undefined,
        priority: args.priority ? { eq: args.priority } : undefined,
        labels: args.labels ? { some: { name: { in: args.labels } } } : undefined,
        project: args.projectId ? { id: { eq: args.projectId } } : undefined,
        createdAt: {
          gte: args.createdAfter,
          lte: args.createdBefore,
        },
      },
      first: args.limit || 50,
    });

    if (issues.nodes.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No issues found matching the criteria.',
          },
        ],
      };
    }

    const issueList = issues.nodes.map(issue => {
      const priorityLabels = { 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low' };
      const priority = priorityLabels[issue.priority] || 'Unknown';
      const assignee = issue.assignee ? ` (Assigned to: ${issue.assignee.name})` : '';
      const labels = issue.labels?.nodes?.map(l => l.name).join(', ') || 'No labels';
      
      return `${issue.identifier}: ${issue.title}\n  State: ${issue.state.name} | Priority: ${priority}${assignee}\n  Labels: ${labels}\n  URL: ${issue.url}`;
    }).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${issues.nodes.length} issues:\n\n${issueList}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error searching issues: ${error.message}`,
        },
      ],
    };
  }
}

// Tool: Get Teams
async function getLinearTeams() {
  try {
    const teams = await linearClient.teams();
    
    if (teams.nodes.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No teams found in your Linear workspace.',
          },
        ],
      };
    }

    const teamList = teams.nodes.map(team => {
      const memberCount = team.members?.nodes?.length || 0;
      return `${team.name} (${team.key})\n  ID: ${team.id}\n  Members: ${memberCount}\n  Description: ${team.description || 'No description'}`;
    }).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Teams in your workspace:\n\n${teamList}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error fetching teams: ${error.message}`,
        },
      ],
    };
  }
}

// Tool: Get Projects
async function getLinearProjects() {
  try {
    const projects = await linearClient.projects();
    
    if (projects.nodes.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No projects found in your Linear workspace.',
          },
        ],
      };
    }

    const projectList = projects.nodes.map(project => {
      const progress = project.progress || 0;
      const startDate = project.startDate ? `\n  Start Date: ${project.startDate}` : '';
      const targetDate = project.targetDate ? `\n  Target Date: ${project.targetDate}` : '';
      
      return `${project.name}\n  ID: ${project.id}\n  State: ${project.state}\n  Progress: ${progress}%${startDate}${targetDate}\n  URL: ${project.url}`;
    }).join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Projects in your workspace:\n\n${projectList}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error fetching projects: ${error.message}`,
        },
      ],
    };
  }
}

// Tool: Get Current User
async function getCurrentUser() {
  try {
    const user = await linearClient.viewer;
    
    return {
      content: [
        {
          type: 'text',
          text: `Current User: ${user.name} (${user.email})\nID: ${user.id}\nIs Bot: ${user.isBot ? 'Yes' : 'No'}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error fetching current user: ${error.message}`,
        },
      ],
    };
  }
}

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'create_linear_issue':
      return await createLinearIssue(args);
    case 'search_linear_issues':
      return await searchLinearIssues(args);
    case 'get_linear_teams':
      return await getLinearTeams();
    case 'get_linear_projects':
      return await getLinearProjects();
    case 'get_current_user':
      return await getCurrentUser();
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Register tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'create_linear_issue',
        description: 'Create a new Linear issue',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID (optional, uses LINEAR_TEAM_ID env var if not provided)' },
            title: { type: 'string', description: 'Issue title' },
            description: { type: 'string', description: 'Issue description' },
            priority: { type: 'number', description: 'Priority (1=Urgent, 2=High, 3=Normal, 4=Low)', minimum: 1, maximum: 4 },
            assigneeId: { type: 'string', description: 'Assignee ID' },
            projectId: { type: 'string', description: 'Project ID (optional, uses LINEAR_PROJECT_ID env var if not provided)' },
            labels: { type: 'array', items: { type: 'string' }, description: 'Label IDs' },
            dueDate: { type: 'string', description: 'Due date (ISO 8601 format)' },
          },
          required: ['title'],
        },
      },
      {
        name: 'search_linear_issues',
        description: 'Search Linear issues with filters',
        inputSchema: {
          type: 'object',
          properties: {
            teamId: { type: 'string', description: 'Team ID' },
            assigneeId: { type: 'string', description: 'Assignee ID' },
            state: { type: 'string', description: 'Issue state (todo, in_progress, in_review, done, cancelled)' },
            priority: { type: 'number', description: 'Priority (1-4)' },
            labels: { type: 'array', items: { type: 'string' }, description: 'Label names to filter by' },
            projectId: { type: 'string', description: 'Project ID' },
            createdAfter: { type: 'string', description: 'Created after date (ISO 8601)' },
            createdBefore: { type: 'string', description: 'Created before date (ISO 8601)' },
            limit: { type: 'number', description: 'Maximum number of results (default: 50)' },
          },
        },
      },
      {
        name: 'get_linear_teams',
        description: 'Get all Linear teams in the workspace',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_linear_projects',
        description: 'Get all Linear projects in the workspace',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_current_user',
        description: 'Get current Linear user information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Linear MCP server running on stdio');
}

main().catch(console.error);
