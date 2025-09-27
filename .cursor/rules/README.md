# Cursor Rules for TraceChain

This directory contains Cursor rules that help with development, code navigation, and project understanding.

## Rule Files

### Core Rules (Always Applied)
- **[project-structure.mdc](project-structure.mdc)** - Project architecture and file organization
- **[mcp-integration.mdc](mcp-integration.mdc)** - MCP server tools and Git automation
- **[git-workflow.mdc](git-workflow.mdc)** - Git workflow and branching strategy
- **[security-patterns.mdc](security-patterns.mdc)** - Security best practices and multi-provider authentication
- **[linear-integration.mdc](linear-integration.mdc)** - Linear issue tracking integration
- **[development-workflow.mdc](development-workflow.mdc)** - Daily development practices
- **[database-neon.mdc](database-neon.mdc)** - Neon PostgreSQL database configuration

### File-Specific Rules
- **[typescript-patterns.mdc](typescript-patterns.mdc)** - TypeScript coding patterns (*.ts, *.tsx)
- **[smart-contracts.mdc](smart-contracts.mdc)** - Solidity contract patterns (*.sol)
- **[docker-deployment.mdc](docker-deployment.mdc)** - Docker and deployment patterns
- **[testing-patterns.mdc](testing-patterns.mdc)** - Testing conventions and patterns
- **[backend-api.mdc](backend-api.mdc)** - Backend API development patterns (*.ts, *.js)
- **[frontend-react.mdc](frontend-react.mdc)** - Frontend React patterns (*.tsx, *.jsx)
- **[stytch-authentication.mdc](stytch-authentication.mdc)** - Stytch identity provider integration

## How to Use

These rules are automatically applied by Cursor based on:
- **File type** (globs patterns)
- **Always applied** (alwaysApply: true)
- **Manual reference** (description-based)

## Key Features

### MCP Integration
- Git automation tools
- Project management tools
- Linear issue integration
- Security scanning tools
- Build and deployment tools

### Authentication & Database
- Multi-provider authentication (Email/Password, Stytch, Web3)
- Neon PostgreSQL database configuration
- User registration and management
- Security patterns and best practices

### Development Patterns
- TypeScript error handling
- React component structure
- Smart contract security
- API response patterns
- Testing conventions

### Workflow Guidance
- Git branching strategy
- Commit message conventions
- Code review process
- Deployment procedures
- Security checklists

## Customization

To modify or add rules:
1. Edit existing `.mdc` files
2. Create new `.mdc` files with proper frontmatter
3. Use `mdc:filename.ext` to reference files
4. Follow Markdown format with Cursor extensions

## Benefits

- **Context Awareness**: Rules understand the TraceChain project structure
- **Consistency**: Enforces coding patterns and conventions
- **Efficiency**: Provides quick access to project-specific information
- **Quality**: Helps maintain code quality and security standards
- **Integration**: Leverages MCP tools for enhanced development experience
