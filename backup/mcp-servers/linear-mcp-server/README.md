# Linear MCP Server for AI Agents

This MCP (Model Context Protocol) server provides Linear integration capabilities for AI agents, allowing them to interact with Linear workspaces for project management and issue tracking.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd linear-mcp-server
npm install
```

### 2. Configure Environment
```bash
cp env.example .env
# Edit .env with your Linear API credentials
```

### 3. Get Linear API Key
1. Go to your Linear workspace settings
2. Navigate to API section
3. Create a new API key with appropriate permissions
4. Copy the API key to your `.env` file

### 4. Configure Cursor MCP
Add the MCP server configuration to your Cursor settings:

**For Cursor Desktop:**
1. Open Cursor Settings
2. Go to Features > Model Context Protocol
3. Add the server configuration from `cursor-mcp-config.json`

**For Cursor Web:**
1. Add the configuration to your workspace settings
2. Update the file paths to match your system

## 🔧 Configuration

### Environment Variables
```bash
# Required
LINEAR_API_KEY=your_linear_api_key_here

# Optional (used as defaults)
LINEAR_TEAM_ID=your_team_id_here
LINEAR_WORKSPACE_ID=your_workspace_id_here
LINEAR_PROJECT_ID=your_project_id_here
```

### Cursor MCP Configuration
```json
{
  "mcpServers": {
    "linear": {
      "command": "node",
      "args": ["/path/to/linear-mcp-server/linear-mcp-server.js"],
      "env": {
        "LINEAR_API_KEY": "your_linear_api_key_here",
        "LINEAR_TEAM_ID": "your_team_id_here",
        "LINEAR_WORKSPACE_ID": "your_workspace_id_here",
        "LINEAR_PROJECT_ID": "your_project_id_here"
      }
    }
  }
}
```

## 🛠️ Available Tools

### 1. Create Issue
- **Tool**: `create_linear_issue`
- **Description**: Create a new Linear issue
- **Required**: `title`
- **Optional**: `description`, `priority`, `assigneeId`, `projectId`, `labels`, `dueDate`

### 2. Search Issues
- **Tool**: `search_linear_issues`
- **Description**: Search Linear issues with filters
- **Optional**: `teamId`, `assigneeId`, `state`, `priority`, `labels`, `projectId`, `createdAfter`, `createdBefore`, `limit`

### 3. Get Teams
- **Tool**: `get_linear_teams`
- **Description**: Get all Linear teams in the workspace

### 4. Get Projects
- **Tool**: `get_linear_projects`
- **Description**: Get all Linear projects in the workspace

### 5. Get Issue Details
- **Tool**: `get_linear_issue`
- **Description**: Get details of a specific Linear issue
- **Required**: `issueId`

### 6. Add Comment
- **Tool**: `add_linear_comment`
- **Description**: Add a comment to a Linear issue
- **Required**: `issueId`, `body`

### 7. Update Issue
- **Tool**: `update_linear_issue`
- **Description**: Update a Linear issue
- **Required**: `issueId`
- **Optional**: `title`, `description`, `priority`, `assigneeId`, `projectId`, `dueDate`, `stateId`, `labels`

### 8. Get Current User
- **Tool**: `get_current_user`
- **Description**: Get current Linear user information

## 📋 Usage Examples

### Create a Bug Report
```javascript
// Agent can use this tool to create issues
create_linear_issue({
  title: "Authentication fails on mobile devices",
  description: "Users report login issues on iOS Safari",
  priority: 1, // Urgent
  labels: ["bug", "mobile", "authentication"]
})
```

### Search for High Priority Issues
```javascript
search_linear_issues({
  priority: 1,
  state: "in_progress"
})
```

### Add a Comment
```javascript
add_linear_comment({
  issueId: "issue-id-here",
  body: "Fixed in commit abc123. Ready for testing."
})
```

## 🎯 Priority Levels
- `1` - Urgent (Red)
- `2` - High (Orange)
- `3` - Normal (Blue)
- `4` - Low (Gray)

## 📊 Issue States
- `todo` - Backlog
- `in_progress` - In Progress
- `in_review` - In Review
- `done` - Done
- `cancelled` - Cancelled

## 🔍 Testing the Server

### Manual Test
```bash
# Start the server
npm start

# Test with a simple request
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node linear-mcp-server.js
```

### Development Mode
```bash
# Auto-restart on changes
npm run dev
```

## 🐛 Troubleshooting

### Common Issues

1. **"LINEAR_API_KEY environment variable is required"**
   - Make sure you've set the `LINEAR_API_KEY` in your environment
   - Check that your `.env` file is in the correct location

2. **"Failed to initialize Linear client"**
   - Verify your API key is correct
   - Check that your API key has proper permissions

3. **"Unknown tool" errors**
   - Make sure you're using the correct tool names
   - Check the tool list with `get_linear_teams` first

4. **MCP server not connecting**
   - Verify the file path in your Cursor configuration
   - Check that Node.js is available in your PATH
   - Ensure the server file has execute permissions

### Debug Mode
```bash
# Enable debug logging
DEBUG=* node linear-mcp-server.js
```

## 📚 API Reference

### Linear SDK
- [Linear API Documentation](https://developers.linear.app/)
- [Linear SDK Reference](https://github.com/linear/linear-sdk)

### MCP Protocol
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues related to the Linear MCP server:
1. Check the troubleshooting section above
2. Verify your Linear API configuration
3. Test the server manually
4. Contact the development team with specific error details

## 🎉 Success!

Once configured, AI agents will be able to:
- ✅ Create and manage Linear issues
- ✅ Search and filter issues
- ✅ Add comments and updates
- ✅ Track project progress
- ✅ Collaborate with team members

Your AI agents now have full Linear integration capabilities! 🚀
