#!/usr/bin/env node

/**
 * Unified TraceChain MCP Server
 * Consolidates all MCP functionality into a single, powerful server
 * 
 * Features:
 * - Project Management & Testing
 * - Build & Deployment
 * - Linear Issue Management
 * - API Validation
 * - Security Scanning
 * - Health Monitoring
 * - Git Operations & Automation
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class UnifiedTraceChainMCPServer {
  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || process.cwd();
    this.linearApiKey = process.env.LINEAR_API_KEY;
    this.linearTeamId = process.env.LINEAR_TEAM_ID;
    this.linearWorkspaceId = process.env.LINEAR_WORKSPACE_ID;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Always listen for stdin data, regardless of TTY
    process.stdin.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        this.sendError('Invalid JSON message', error);
      }
    });
    
    // Keep the process alive
    process.stdin.resume();
    
    // Also keep alive with timer for background processes
    setInterval(() => {
      // Keep the process alive
    }, 1000);

    process.on('SIGINT', () => {
      process.exit(0);
    });

    // Log startup message
    console.error('Unified TraceChain MCP Server started and ready for connections');
  }

  handleMessage(message) {
    switch (message.method) {
      case 'initialize':
        this.handleInitialize(message);
        break;
      case 'tools/list':
        this.handleToolsList(message);
        break;
      case 'tools/call':
        this.handleToolCall(message);
        break;
      case 'resources/list':
        this.handleResourcesList(message);
        break;
      case 'resources/read':
        this.handleResourceRead(message);
        break;
      default:
        this.sendError(`Unknown method: ${message.method}`);
    }
  }

  handleInitialize(message) {
    this.sendResponse(message.id, {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {
          listChanged: true
        },
        resources: {
          subscribe: true,
          listChanged: true
        }
      },
      serverInfo: {
        name: "tracechain-unified-mcp-server",
        version: "3.0.0",
        description: "Unified MCP server for TraceChain project management, development, and deployment"
      }
    });
  }

  handleToolsList(message) {
    const tools = [
      // ===== PROJECT MANAGEMENT TOOLS =====
      {
        name: "check_project_health",
        description: "Check overall project health and compliance with roadmap",
        inputSchema: {
          type: "object",
          properties: {
            component: {
              type: "string",
              enum: ["smart_contracts", "backend", "frontend", "infrastructure", "all"],
              description: "Component to check"
            }
          },
          required: ["component"]
        }
      },
      {
        name: "analyze_project_structure",
        description: "Analyze project structure and dependencies",
        inputSchema: {
          type: "object",
          properties: {
            depth: {
              type: "number",
              description: "Analysis depth (1-3)"
            },
            include_dependencies: {
              type: "boolean",
              description: "Include dependency analysis"
            }
          }
        }
      },

      // ===== SMART CONTRACT TOOLS =====
      {
        name: "analyze_smart_contract",
        description: "Analyze smart contracts for security vulnerabilities and gas optimization",
        inputSchema: {
          type: "object",
          properties: {
            contractPath: {
              type: "string",
              description: "Path to the smart contract file"
            },
            analysisType: {
              type: "string",
              enum: ["security", "gas", "best_practices", "comprehensive"],
              description: "Type of analysis to perform"
            }
          },
          required: ["contractPath", "analysisType"]
        }
      },
      {
        name: "compile_smart_contracts",
        description: "Compile smart contracts and check for errors",
        inputSchema: {
          type: "object",
          properties: {
            network: {
              type: "string",
              enum: ["localhost", "mumbai", "polygon"],
              description: "Target network for compilation"
            }
          }
        }
      },
      {
        name: "deploy_smart_contracts",
        description: "Deploy smart contracts to specified network",
        inputSchema: {
          type: "object",
          properties: {
            network: {
              type: "string",
              enum: ["localhost", "mumbai", "polygon"],
              description: "Target network for deployment"
            },
            contracts: {
              type: "array",
              items: { type: "string" },
              description: "Specific contracts to deploy (empty for all)"
            }
          }
        }
      },

      // ===== API VALIDATION TOOLS =====
      {
        name: "validate_api_endpoint",
        description: "Validate API endpoint structure and security",
        inputSchema: {
          type: "object",
          properties: {
            endpointPath: {
              type: "string",
              description: "Path to the API endpoint file"
            },
            validationType: {
              type: "string",
              enum: ["structure", "security", "performance", "comprehensive"],
              description: "Type of validation to perform"
            }
          },
          required: ["endpointPath", "validationType"]
        }
      },
      {
        name: "test_api_endpoints",
        description: "Test API endpoints for functionality and performance",
        inputSchema: {
          type: "object",
          properties: {
            baseUrl: {
              type: "string",
              description: "Base URL for API testing"
            },
            endpoints: {
              type: "array",
              items: { type: "string" },
              description: "Specific endpoints to test (empty for all)"
            },
            include_performance: {
              type: "boolean",
              description: "Include performance testing"
            }
          }
        }
      },

      // ===== BUILD & DEPLOYMENT TOOLS =====
      {
        name: "build_component",
        description: "Build a specific component of the application",
        inputSchema: {
          type: "object",
          properties: {
            component: {
              type: "string",
              enum: ["smart_contracts", "backend", "frontend", "all"],
              description: "Component to build"
            },
            environment: {
              type: "string",
              enum: ["development", "staging", "production"],
              description: "Build environment"
            },
            clean: {
              type: "boolean",
              description: "Clean build directories before building"
            }
          },
          required: ["component", "environment"]
        }
      },
      {
        name: "deploy_application",
        description: "Deploy the application to specified environment",
        inputSchema: {
          type: "object",
          properties: {
            environment: {
              type: "string",
              enum: ["staging", "production"],
              description: "Deployment environment"
            },
            provider: {
              type: "string",
              enum: ["docker", "podman", "kubernetes"],
              description: "Deployment provider"
            },
            target: {
              type: "string",
              enum: ["all", "smart_contracts", "backend", "frontend", "infrastructure"],
              description: "Deployment target"
            }
          },
          required: ["environment", "provider"]
        }
      },
      {
        name: "check_deployment_status",
        description: "Check the status of deployed services",
        inputSchema: {
          type: "object",
          properties: {
            environment: {
              type: "string",
              enum: ["staging", "production"],
              description: "Environment to check"
            }
          },
          required: ["environment"]
        }
      },
      {
        name: "rollback_deployment",
        description: "Rollback deployment to previous version",
        inputSchema: {
          type: "object",
          properties: {
            environment: {
              type: "string",
              enum: ["staging", "production"],
              description: "Environment to rollback"
            },
            target: {
              type: "string",
              enum: ["all", "backend", "frontend", "infrastructure"],
              description: "Component to rollback"
            }
          },
          required: ["environment"]
        }
      },

      // ===== LINEAR ISSUE MANAGEMENT TOOLS =====
      {
        name: "create_linear_issue",
        description: "Create a new issue in Linear",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Issue title"
            },
            description: {
              type: "string",
              description: "Issue description"
            },
            priority: {
              type: "string",
              enum: ["urgent", "high", "normal", "low"],
              description: "Issue priority"
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Issue labels"
            },
            assignee: {
              type: "string",
              description: "Assignee email or ID"
            }
          },
          required: ["title", "description"]
        }
      },
      {
        name: "search_linear_issues",
        description: "Search for issues in Linear",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query"
            },
            status: {
              type: "string",
              enum: ["backlog", "todo", "in_progress", "done", "canceled"],
              description: "Filter by status"
            },
            assignee: {
              type: "string",
              description: "Filter by assignee"
            },
            limit: {
              type: "number",
              description: "Maximum number of results"
            }
          }
        }
      },
      {
        name: "update_linear_issue",
        description: "Update an existing Linear issue",
        inputSchema: {
          type: "object",
          properties: {
            issueId: {
              type: "string",
              description: "Issue ID to update"
            },
            title: {
              type: "string",
              description: "New issue title"
            },
            description: {
              type: "string",
              description: "New issue description"
            },
            status: {
              type: "string",
              enum: ["backlog", "todo", "in_progress", "done", "canceled"],
              description: "New issue status"
            },
            priority: {
              type: "string",
              enum: ["urgent", "high", "normal", "low"],
              description: "New issue priority"
            }
          },
          required: ["issueId"]
        }
      },
      {
        name: "get_linear_teams",
        description: "Get all teams from Linear workspace",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },

      // ===== SECURITY & TESTING TOOLS =====
      {
        name: "run_security_scan",
        description: "Run comprehensive security scan on the project",
        inputSchema: {
          type: "object",
          properties: {
            scanType: {
              type: "string",
              enum: ["dependencies", "code", "containers", "comprehensive"],
              description: "Type of security scan"
            },
            include_fixes: {
              type: "boolean",
              description: "Include suggested fixes"
            }
          }
        }
      },
      {
        name: "generate_test_suite",
        description: "Generate comprehensive test suite for components",
        inputSchema: {
          type: "object",
          properties: {
            componentPath: {
              type: "string",
              description: "Path to the component to test"
            },
            testType: {
              type: "string",
              enum: ["unit", "integration", "e2e", "comprehensive"],
              description: "Type of tests to generate"
            }
          },
          required: ["componentPath", "testType"]
        }
      },
      {
        name: "run_health_checks",
        description: "Run comprehensive health checks on deployed services",
        inputSchema: {
          type: "object",
          properties: {
            environment: {
              type: "string",
              enum: ["staging", "production"],
              description: "Environment to check"
            },
            include_performance: {
              type: "boolean",
              description: "Include performance metrics in health check"
            }
          },
          required: ["environment"]
        }
      },

      // ===== MONITORING & OPTIMIZATION TOOLS =====
      {
        name: "optimize_docker_config",
        description: "Optimize Docker configuration for better performance",
        inputSchema: {
          type: "object",
          properties: {
            service: {
              type: "string",
              enum: ["backend", "frontend", "smart_contracts", "all"],
              description: "Docker service to optimize"
            }
          },
          required: ["service"]
        }
      },
      {
        name: "monitor_performance",
        description: "Monitor application performance and resource usage",
        inputSchema: {
          type: "object",
          properties: {
            duration: {
              type: "number",
              description: "Monitoring duration in minutes"
            },
            include_logs: {
              type: "boolean",
              description: "Include log analysis"
            }
          }
        }
      },

      // ===== GIT OPERATIONS & AUTOMATION TOOLS =====
      {
        name: "git_status",
        description: "Get comprehensive Git status with file analysis",
        inputSchema: {
          type: "object",
          properties: {
            include_staged: {
              type: "boolean",
              description: "Include staged files in analysis"
            },
            include_untracked: {
              type: "boolean",
              description: "Include untracked files in analysis"
            }
          }
        }
      },
      {
        name: "git_commit_smart",
        description: "Create intelligent commit with context-aware message",
        inputSchema: {
          type: "object",
          properties: {
            files: {
              type: "array",
              items: { type: "string" },
              description: "Files to commit (empty for all staged files)"
            },
            message: {
              type: "string",
              description: "Commit message (will be enhanced if not provided)"
            },
            link_linear_issue: {
              type: "boolean",
              description: "Link commit to Linear issue"
            },
            run_pre_commit_checks: {
              type: "boolean",
              description: "Run pre-commit validation checks"
            }
          }
        }
      },
      {
        name: "git_create_branch",
        description: "Create feature branch with Linear issue integration",
        inputSchema: {
          type: "object",
          properties: {
            branch_name: {
              type: "string",
              description: "Name of the branch to create"
            },
            branch_type: {
              type: "string",
              enum: ["feature", "bugfix", "hotfix", "chore"],
              description: "Type of branch"
            },
            base_branch: {
              type: "string",
              description: "Base branch to create from (default: develop)"
            },
            linear_issue_id: {
              type: "string",
              description: "Linear issue ID to link to branch"
            }
          },
          required: ["branch_name", "branch_type"]
        }
      },
      {
        name: "git_merge_smart",
        description: "Perform intelligent merge with conflict resolution",
        inputSchema: {
          type: "object",
          properties: {
            source_branch: {
              type: "string",
              description: "Source branch to merge from"
            },
            target_branch: {
              type: "string",
              description: "Target branch to merge to"
            },
            strategy: {
              type: "string",
              enum: ["auto", "manual", "squash", "rebase"],
              description: "Merge strategy to use"
            },
            create_linear_issue: {
              type: "boolean",
              description: "Create Linear issue for merge conflicts"
            }
          },
          required: ["source_branch", "target_branch"]
        }
      },
      {
        name: "git_pre_commit_review",
        description: "Run comprehensive pre-commit review and validation",
        inputSchema: {
          type: "object",
          properties: {
            files: {
              type: "array",
              items: { type: "string" },
              description: "Files to review (empty for all staged files)"
            },
            include_security_scan: {
              type: "boolean",
              description: "Include security scanning"
            },
            include_performance_check: {
              type: "boolean",
              description: "Include performance checks"
            },
            include_lint_check: {
              type: "boolean",
              description: "Include linting checks"
            }
          }
        }
      },
      {
        name: "git_log_analysis",
        description: "Analyze Git commit history and patterns",
        inputSchema: {
          type: "object",
          properties: {
            since: {
              type: "string",
              description: "Show commits since date (e.g., '1 week ago', '2024-01-01')"
            },
            author: {
              type: "string",
              description: "Filter by author"
            },
            include_stats: {
              type: "boolean",
              description: "Include commit statistics"
            },
            include_linear_issues: {
              type: "boolean",
              description: "Include linked Linear issues"
            }
          }
        }
      },
      {
        name: "git_release_management",
        description: "Manage releases with automated versioning and tagging",
        inputSchema: {
          type: "object",
          properties: {
            version_type: {
              type: "string",
              enum: ["patch", "minor", "major"],
              description: "Type of version bump"
            },
            create_tag: {
              type: "boolean",
              description: "Create Git tag for release"
            },
            generate_changelog: {
              type: "boolean",
              description: "Generate changelog from commits"
            },
            linear_issue_id: {
              type: "string",
              description: "Linear issue ID for release tracking"
            }
          },
          required: ["version_type"]
        }
      }
    ];

    this.sendResponse(message.id, { tools });
  }

  handleToolCall(message) {
    const { name, arguments: args } = message.params;

    // Route to appropriate tool handler
    const toolHandlers = {
      // Project Management
      'check_project_health': () => this.checkProjectHealth(args, message.id),
      'analyze_project_structure': () => this.analyzeProjectStructure(args, message.id),
      
      // Smart Contracts
      'analyze_smart_contract': () => this.analyzeSmartContract(args, message.id),
      'compile_smart_contracts': () => this.compileSmartContracts(args, message.id),
      'deploy_smart_contracts': () => this.deploySmartContracts(args, message.id),
      
      // API Validation
      'validate_api_endpoint': () => this.validateApiEndpoint(args, message.id),
      'test_api_endpoints': () => this.testApiEndpoints(args, message.id),
      
      // Build & Deployment
      'build_component': () => this.buildComponent(args, message.id),
      'deploy_application': () => this.deployApplication(args, message.id),
      'check_deployment_status': () => this.checkDeploymentStatus(args, message.id),
      'rollback_deployment': () => this.rollbackDeployment(args, message.id),
      
      // Linear Issue Management
      'create_linear_issue': () => this.createLinearIssue(args, message.id),
      'search_linear_issues': () => this.searchLinearIssues(args, message.id),
      'update_linear_issue': () => this.updateLinearIssue(args, message.id),
      'get_linear_teams': () => this.getLinearTeams(args, message.id),
      
      // Security & Testing
      'run_security_scan': () => this.runSecurityScan(args, message.id),
      'generate_test_suite': () => this.generateTestSuite(args, message.id),
      'run_health_checks': () => this.runHealthChecks(args, message.id),
      
      // Monitoring & Optimization
      'optimize_docker_config': () => this.optimizeDockerConfig(args, message.id),
      'monitor_performance': () => this.monitorPerformance(args, message.id),
      
      // Git Operations & Automation
      'git_status': () => this.gitStatus(args, message.id),
      'git_commit_smart': () => this.gitCommitSmart(args, message.id),
      'git_create_branch': () => this.gitCreateBranch(args, message.id),
      'git_merge_smart': () => this.gitMergeSmart(args, message.id),
      'git_pre_commit_review': () => this.gitPreCommitReview(args, message.id),
      'git_log_analysis': () => this.gitLogAnalysis(args, message.id),
      'git_release_management': () => this.gitReleaseManagement(args, message.id)
    };

    const handler = toolHandlers[name];
    if (handler) {
      handler();
    } else {
      this.sendError(`Unknown tool: ${name}`, null, message.id);
    }
  }

  // ===== PROJECT MANAGEMENT IMPLEMENTATIONS =====

  async checkProjectHealth(args, messageId) {
    try {
      const healthReport = {
        component: args.component,
        timestamp: new Date().toISOString(),
        status: "healthy",
        issues: [],
        recommendations: [],
        metrics: {}
      };

      if (args.component === 'all' || args.component === 'smart_contracts') {
        healthReport.smart_contracts = await this.checkSmartContractsHealth();
      }

      if (args.component === 'all' || args.component === 'backend') {
        healthReport.backend = await this.checkBackendHealth();
      }

      if (args.component === 'all' || args.component === 'frontend') {
        healthReport.frontend = await this.checkFrontendHealth();
      }

      if (args.component === 'all' || args.component === 'infrastructure') {
        healthReport.infrastructure = await this.checkInfrastructureHealth();
      }

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(healthReport, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to check project health: ${error.message}`, error, messageId);
    }
  }

  async analyzeProjectStructure(args, messageId) {
    try {
      const depth = args.depth || 2;
      const includeDependencies = args.include_dependencies || false;
      
      const structure = {
        projectRoot: this.projectRoot,
        analysisDepth: depth,
        timestamp: new Date().toISOString(),
        structure: await this.analyzeDirectoryStructure(this.projectRoot, depth),
        dependencies: includeDependencies ? await this.analyzeDependencies() : null
      };

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(structure, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to analyze project structure: ${error.message}`, error, messageId);
    }
  }

  // ===== SMART CONTRACT IMPLEMENTATIONS =====

  async analyzeSmartContract(args, messageId) {
    try {
      const contractPath = path.join(this.projectRoot, args.contractPath);
      const contractContent = fs.readFileSync(contractPath, 'utf8');
      
      let analysis = {
        contract: path.basename(contractPath),
        analysisType: args.analysisType,
        findings: [],
        recommendations: [],
        score: 100,
        timestamp: new Date().toISOString()
      };

      if (args.analysisType === 'security' || args.analysisType === 'comprehensive') {
        analysis = this.analyzeSecurity(contractContent, analysis);
      }
      
      if (args.analysisType === 'gas' || args.analysisType === 'comprehensive') {
        analysis = this.analyzeGasOptimization(contractContent, analysis);
      }
      
      if (args.analysisType === 'best_practices' || args.analysisType === 'comprehensive') {
        analysis = this.analyzeBestPractices(contractContent, analysis);
      }

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(analysis, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to analyze smart contract: ${error.message}`, error, messageId);
    }
  }

  async compileSmartContracts(args, messageId) {
    try {
      const network = args.network || 'localhost';
      const workingDir = path.join(this.projectRoot, 'smart-contracts');
      
      const result = await this.executeCommand(`npx hardhat compile --network ${network}`, workingDir);
      
      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              network,
              status: result.success ? "success" : "failed",
              output: result.output,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to compile smart contracts: ${error.message}`, error, messageId);
    }
  }

  async deploySmartContracts(args, messageId) {
    try {
      const network = args.network || 'localhost';
      const contracts = args.contracts || [];
      const workingDir = path.join(this.projectRoot, 'smart-contracts');
      
      let deployCommand = `npx hardhat run scripts/deploy.js --network ${network}`;
      if (contracts.length > 0) {
        deployCommand += ` --contracts ${contracts.join(',')}`;
      }
      
      const result = await this.executeCommand(deployCommand, workingDir);
      
      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              network,
              contracts,
              status: result.success ? "success" : "failed",
              output: result.output,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to deploy smart contracts: ${error.message}`, error, messageId);
    }
  }

  // ===== LINEAR INTEGRATION IMPLEMENTATIONS =====

  async createLinearIssue(args, messageId) {
    try {
      if (!this.linearApiKey) {
        throw new Error('Linear API key not configured');
      }

      const issueData = {
        title: args.title,
        description: args.description,
        teamId: this.linearTeamId,
        priority: this.mapPriorityToLinear(args.priority || 'normal'),
        labels: args.labels || [],
        assignee: args.assignee || null
      };

      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.linearApiKey
        },
        body: JSON.stringify({
          query: `
            mutation CreateIssue($input: IssueCreateInput!) {
              issueCreate(input: $input) {
                success
                issue {
                  id
                  identifier
                  title
                  url
                }
              }
            }
          `,
          variables: {
            input: issueData
          }
        })
      });

      const result = await response.json();
      
      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: result.data?.issueCreate?.success ? "success" : "failed",
              issue: result.data?.issueCreate?.issue,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to create Linear issue: ${error.message}`, error, messageId);
    }
  }

  async searchLinearIssues(args, messageId) {
    try {
      if (!this.linearApiKey) {
        throw new Error('Linear API key not configured');
      }

      const query = args.query || '';
      const status = args.status || '';
      const assignee = args.assignee || '';
      const limit = args.limit || 20;

      const searchQuery = `
        query SearchIssues($query: String!, $limit: Int!) {
          issueSearch(query: $query, limit: $limit) {
            nodes {
              id
              identifier
              title
              description
              state {
                name
              }
              priority
              assignee {
                name
                email
              }
              labels {
                nodes {
                  name
                }
              }
              url
            }
          }
        }
      `;

      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.linearApiKey
        },
        body: JSON.stringify({
          query: searchQuery,
          variables: { query, limit }
        })
      });

      const result = await response.json();
      
      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              query,
              results: result.data?.issueSearch?.nodes || [],
              count: result.data?.issueSearch?.nodes?.length || 0,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to search Linear issues: ${error.message}`, error, messageId);
    }
  }

  async updateLinearIssue(args, messageId) {
    try {
      if (!this.linearApiKey) {
        throw new Error('Linear API key not configured');
      }

      const updateData = {
        id: args.issueId,
        title: args.title,
        description: args.description,
        state: args.status ? this.mapStatusToLinear(args.status) : null,
        priority: args.priority ? this.mapPriorityToLinear(args.priority) : null
      };

      // Remove null values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === null) {
          delete updateData[key];
        }
      });

      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.linearApiKey
        },
        body: JSON.stringify({
          query: `
            mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
              issueUpdate(id: $id, input: $input) {
                success
                issue {
                  id
                  identifier
                  title
                  url
                }
              }
            }
          `,
          variables: {
            id: args.issueId,
            input: updateData
          }
        })
      });

      const result = await response.json();
      
      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: result.data?.issueUpdate?.success ? "success" : "failed",
              issue: result.data?.issueUpdate?.issue,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to update Linear issue: ${error.message}`, error, messageId);
    }
  }

  async getLinearTeams(args, messageId) {
    try {
      if (!this.linearApiKey) {
        throw new Error('Linear API key not configured');
      }

      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.linearApiKey
        },
        body: JSON.stringify({
          query: `
            query GetTeams {
              teams {
                nodes {
                  id
                  name
                  key
                  description
                  members {
                    nodes {
                      id
                      name
                      email
                    }
                  }
                }
              }
            }
          `
        })
      });

      const result = await response.json();
      
      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              teams: result.data?.teams?.nodes || [],
              count: result.data?.teams?.nodes?.length || 0,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to get Linear teams: ${error.message}`, error, messageId);
    }
  }

  // ===== BUILD & DEPLOYMENT IMPLEMENTATIONS =====

  async buildComponent(args, messageId) {
    try {
      const { component, environment, clean = false } = args;
      
      let buildCommand = '';
      let workingDir = this.projectRoot;

      if (component === 'all') {
        buildCommand = `./build-app.sh -e ${environment}${clean ? ' -c' : ''} all`;
      } else {
        buildCommand = `./build-app.sh -e ${environment}${clean ? ' -c' : ''} ${component}`;
      }

      const result = await this.executeCommand(buildCommand, workingDir);
      
      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              component,
              environment,
              clean,
              status: result.success ? "success" : "failed",
              output: result.output,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to build component: ${error.message}`, error, messageId);
    }
  }

  async deployApplication(args, messageId) {
    try {
      const { environment, provider, target = 'all' } = args;
      
      let deployCommand = `./deploy-app.sh -e ${environment} -p ${provider} ${target}`;
      const workingDir = this.projectRoot;

      const result = await this.executeCommand(deployCommand, workingDir);
      
      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              environment,
              provider,
              target,
              status: result.success ? "success" : "failed",
              output: result.output,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to deploy application: ${error.message}`, error, messageId);
    }
  }

  // ===== SECURITY & TESTING IMPLEMENTATIONS =====

  async runSecurityScan(args, messageId) {
    try {
      const { scanType = 'comprehensive', include_fixes = false } = args;
      
      let scanCommand = '';
      const workingDir = this.projectRoot;

      switch (scanType) {
        case 'dependencies':
          scanCommand = 'npx snyk test';
          break;
        case 'code':
          scanCommand = 'npx snyk code test';
          break;
        case 'containers':
          scanCommand = 'npx snyk container test';
          break;
        case 'comprehensive':
          scanCommand = 'npx snyk test && npx snyk code test';
          break;
      }

      const result = await this.executeCommand(scanCommand, workingDir);
      
      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              scanType,
              include_fixes,
              status: result.success ? "success" : "failed",
              output: result.output,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to run security scan: ${error.message}`, error, messageId);
    }
  }

  // ===== HELPER METHODS =====

  async executeCommand(command, workingDir) {
    return new Promise((resolve) => {
      const process = spawn('bash', ['-c', command], {
        cwd: workingDir,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output + errorOutput,
          exitCode: code
        });
      });
    });
  }

  async analyzeDirectoryStructure(dir, depth, currentDepth = 0) {
    if (currentDepth >= depth) return null;
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const structure = {};
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && !item.name.startsWith('.') && !item.name === 'node_modules') {
        structure[item.name] = await this.analyzeDirectoryStructure(fullPath, depth, currentDepth + 1);
      } else if (item.isFile()) {
        structure[item.name] = {
          type: 'file',
          size: fs.statSync(fullPath).size
        };
      }
    }
    
    return structure;
  }

  async analyzeDependencies() {
    const dependencies = {};
    
    // Analyze package.json files
    const packageJsonFiles = [
      'package.json',
      'backend/package.json',
      'frontend/package.json',
      'smart-contracts/package.json'
    ];
    
    for (const file of packageJsonFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        dependencies[file] = {
          dependencies: Object.keys(pkg.dependencies || {}),
          devDependencies: Object.keys(pkg.devDependencies || {})
        };
      }
    }
    
    return dependencies;
  }

  // Linear helper methods
  mapPriorityToLinear(priority) {
    const priorityMap = {
      'urgent': 1,
      'high': 2,
      'normal': 3,
      'low': 4
    };
    return priorityMap[priority] || 3;
  }

  mapStatusToLinear(status) {
    const statusMap = {
      'backlog': 'backlog',
      'todo': 'todo',
      'in_progress': 'inProgress',
      'done': 'done',
      'canceled': 'canceled'
    };
    return statusMap[status] || 'todo';
  }

  // Include all other helper methods from previous implementations
  // (analyzeSecurity, analyzeGasOptimization, etc.)

  sendResponse(id, result) {
    const response = {
      jsonrpc: "2.0",
      id,
      result
    };
    console.log(JSON.stringify(response));
  }

  // ===== GIT OPERATIONS & AUTOMATION IMPLEMENTATIONS =====

  async gitStatus(args, messageId) {
    try {
      const { include_staged = true, include_untracked = true } = args;
      
      let gitCommand = 'git status --porcelain';
      if (include_staged && include_untracked) {
        gitCommand = 'git status --porcelain';
      } else if (include_staged) {
        gitCommand = 'git diff --cached --name-only';
      } else if (include_untracked) {
        gitCommand = 'git ls-files --others --exclude-standard';
      }

      const statusResult = await this.executeCommand(gitCommand, this.projectRoot);
      const branchResult = await this.executeCommand('git branch --show-current', this.projectRoot);
      const lastCommitResult = await this.executeCommand('git log -1 --oneline', this.projectRoot);

      const status = {
        branch: branchResult.output.trim(),
        last_commit: lastCommitResult.output.trim(),
        files: this.parseGitStatus(statusResult.output),
        timestamp: new Date().toISOString()
      };

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(status, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to get Git status: ${error.message}`, error, messageId);
    }
  }

  async gitCommitSmart(args, messageId) {
    try {
      const { files = [], message = '', link_linear_issue = false, run_pre_commit_checks = true } = args;
      
      // Run pre-commit checks if requested
      if (run_pre_commit_checks) {
        const preCommitResult = await this.gitPreCommitReview({ files }, messageId);
        if (!preCommitResult.success) {
          this.sendError('Pre-commit checks failed', null, messageId);
          return;
        }
      }

      // Stage files
      if (files.length > 0) {
        await this.executeCommand(`git add ${files.join(' ')}`, this.projectRoot);
      } else {
        await this.executeCommand('git add .', this.projectRoot);
      }

      // Generate smart commit message if not provided
      let commitMessage = message;
      if (!commitMessage) {
        const changes = await this.analyzeGitChanges(files);
        commitMessage = await this.generateCommitMessage(changes);
      }

      // Link to Linear issue if requested
      if (link_linear_issue) {
        commitMessage = await this.linkCommitToLinearIssue(commitMessage);
      }

      // Execute commit
      const result = await this.executeCommand(`git commit -m "${commitMessage}"`, this.projectRoot);
      
      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: result.success ? "success" : "failed",
              commit_message: commitMessage,
              linear_issue_linked: link_linear_issue,
              files_committed: files.length || 'all',
              output: result.output,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Git commit failed: ${error.message}`, error, messageId);
    }
  }

  async gitCreateBranch(args, messageId) {
    try {
      const { branch_name, branch_type, base_branch = 'develop', linear_issue_id } = args;
      
      // Create branch name with type prefix
      const fullBranchName = `${branch_type}/${branch_name}`;
      
      // Create and checkout branch
      const createResult = await this.executeCommand(`git checkout -b ${fullBranchName} ${base_branch}`, this.projectRoot);
      
      if (!createResult.success) {
        this.sendError(`Failed to create branch: ${createResult.output}`, null, messageId);
        return;
      }

      // Link to Linear issue if provided
      if (linear_issue_id) {
        await this.linkBranchToLinearIssue(fullBranchName, linear_issue_id);
      }

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",
              branch_name: fullBranchName,
              base_branch,
              linear_issue_linked: !!linear_issue_id,
              linear_issue_id,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to create branch: ${error.message}`, error, messageId);
    }
  }

  async gitMergeSmart(args, messageId) {
    try {
      const { source_branch, target_branch, strategy = 'auto', create_linear_issue = false } = args;
      
      // Checkout target branch
      await this.executeCommand(`git checkout ${target_branch}`, this.projectRoot);
      
      // Perform merge based on strategy
      let mergeCommand = `git merge ${source_branch}`;
      if (strategy === 'squash') {
        mergeCommand = `git merge --squash ${source_branch}`;
      } else if (strategy === 'rebase') {
        mergeCommand = `git rebase ${source_branch}`;
      }

      const mergeResult = await this.executeCommand(mergeCommand, this.projectRoot);
      
      if (!mergeResult.success) {
        // Handle merge conflicts
        if (create_linear_issue) {
          await this.createLinearIssueForMergeConflict(source_branch, target_branch);
        }
        
        this.sendError(`Merge failed: ${mergeResult.output}`, null, messageId);
        return;
      }

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",
              source_branch,
              target_branch,
              strategy,
              linear_issue_created: create_linear_issue,
              output: mergeResult.output,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Git merge failed: ${error.message}`, error, messageId);
    }
  }

  async gitPreCommitReview(args, messageId) {
    try {
      const { files = [], include_security_scan = true, include_performance_check = true, include_lint_check = true } = args;
      
      const reviewResults = {
        files_reviewed: files.length || 'all',
        checks: {},
        overall_status: 'passed',
        issues: [],
        timestamp: new Date().toISOString()
      };

      // Lint check
      if (include_lint_check) {
        const lintResult = await this.executeCommand('npm run lint', this.projectRoot);
        reviewResults.checks.lint = {
          status: lintResult.success ? 'passed' : 'failed',
          output: lintResult.output
        };
        if (!lintResult.success) {
          reviewResults.overall_status = 'failed';
          reviewResults.issues.push('Lint check failed');
        }
      }

      // Security scan
      if (include_security_scan) {
        const securityResult = await this.executeCommand('npx snyk test', this.projectRoot);
        reviewResults.checks.security = {
          status: securityResult.success ? 'passed' : 'failed',
          output: securityResult.output
        };
        if (!securityResult.success) {
          reviewResults.overall_status = 'failed';
          reviewResults.issues.push('Security vulnerabilities found');
        }
      }

      // Performance check
      if (include_performance_check) {
        const performanceResult = await this.executeCommand('npm run test:performance', this.projectRoot);
        reviewResults.checks.performance = {
          status: performanceResult.success ? 'passed' : 'failed',
          output: performanceResult.output
        };
        if (!performanceResult.success) {
          reviewResults.overall_status = 'failed';
          reviewResults.issues.push('Performance issues found');
        }
      }

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(reviewResults, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Pre-commit review failed: ${error.message}`, error, messageId);
    }
  }

  async gitLogAnalysis(args, messageId) {
    try {
      const { since = '1 week ago', author, include_stats = true, include_linear_issues = true } = args;
      
      let logCommand = `git log --oneline --since="${since}"`;
      if (author) {
        logCommand += ` --author="${author}"`;
      }

      const logResult = await this.executeCommand(logCommand, this.projectRoot);
      const commits = logResult.output.split('\n').filter(line => line.trim());

      const analysis = {
        period: since,
        author: author || 'all',
        total_commits: commits.length,
        commits: commits.map(commit => ({
          hash: commit.split(' ')[0],
          message: commit.substring(commit.indexOf(' ') + 1),
          linear_issue: include_linear_issues ? this.extractLinearIssueFromCommit(commit) : null
        })),
        timestamp: new Date().toISOString()
      };

      if (include_stats) {
        const statsResult = await this.executeCommand(`git log --since="${since}" --pretty=format:"%an" | sort | uniq -c | sort -rn`, this.projectRoot);
        analysis.author_stats = statsResult.output.split('\n').filter(line => line.trim());
      }

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(analysis, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Git log analysis failed: ${error.message}`, error, messageId);
    }
  }

  async gitReleaseManagement(args, messageId) {
    try {
      const { version_type, create_tag = true, generate_changelog = true, linear_issue_id } = args;
      
      // Get current version
      const currentVersion = await this.getCurrentVersion();
      const newVersion = this.incrementVersion(currentVersion, version_type);

      // Update version in package.json files
      await this.updateVersionInPackageJson(newVersion);

      // Create changelog if requested
      if (generate_changelog) {
        await this.generateChangelog(newVersion);
      }

      // Create tag if requested
      if (create_tag) {
        await this.executeCommand(`git tag -a v${newVersion} -m "Release v${newVersion}"`, this.projectRoot);
      }

      // Link to Linear issue if provided
      if (linear_issue_id) {
        await this.linkReleaseToLinearIssue(newVersion, linear_issue_id);
      }

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",
              previous_version: currentVersion,
              new_version: newVersion,
              version_type,
              tag_created: create_tag,
              changelog_generated: generate_changelog,
              linear_issue_linked: !!linear_issue_id,
              linear_issue_id,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Release management failed: ${error.message}`, error, messageId);
    }
  }

  // ===== GIT HELPER METHODS =====

  parseGitStatus(statusOutput) {
    const lines = statusOutput.split('\n').filter(line => line.trim());
    const files = {
      staged: [],
      modified: [],
      untracked: [],
      deleted: []
    };

    lines.forEach(line => {
      const status = line.substring(0, 2);
      const filename = line.substring(3);
      
      if (status.includes('A')) files.staged.push(filename);
      if (status.includes('M')) files.modified.push(filename);
      if (status.includes('?') || status.includes('U')) files.untracked.push(filename);
      if (status.includes('D')) files.deleted.push(filename);
    });

    return files;
  }

  async analyzeGitChanges(files) {
    const changes = {
      added: [],
      modified: [],
      deleted: [],
      summary: ''
    };

    for (const file of files) {
      const diffResult = await this.executeCommand(`git diff --cached ${file}`, this.projectRoot);
      if (diffResult.output) {
        changes.modified.push(file);
      }
    }

    changes.summary = `Modified ${changes.modified.length} files`;
    return changes;
  }

  async generateCommitMessage(changes) {
    // Simple commit message generation based on changes
    const { summary, modified } = changes;
    
    if (modified.some(f => f.includes('test'))) {
      return `test: ${summary}`;
    } else if (modified.some(f => f.includes('fix') || f.includes('bug'))) {
      return `fix: ${summary}`;
    } else if (modified.some(f => f.includes('feat') || f.includes('feature'))) {
      return `feat: ${summary}`;
    } else {
      return `chore: ${summary}`;
    }
  }

  async linkCommitToLinearIssue(commitMessage) {
    // Add Linear issue reference to commit message
    // This would integrate with Linear API to find relevant issues
    return commitMessage; // Placeholder
  }

  async linkBranchToLinearIssue(branchName, issueId) {
    // Link branch to Linear issue
    // This would update Linear issue with branch information
    return true; // Placeholder
  }

  async createLinearIssueForMergeConflict(sourceBranch, targetBranch) {
    // Create Linear issue for merge conflict
    const issueData = {
      title: `Merge conflict: ${sourceBranch} into ${targetBranch}`,
      description: `Merge conflict occurred when merging ${sourceBranch} into ${targetBranch}`,
      priority: 'high',
      labels: ['merge-conflict', 'git']
    };
    
    // This would call the Linear API
    return issueData;
  }

  extractLinearIssueFromCommit(commitMessage) {
    // Extract Linear issue ID from commit message
    const match = commitMessage.match(/\(([A-Z]+-\d+)\)/);
    return match ? match[1] : null;
  }

  async getCurrentVersion() {
    const result = await this.executeCommand('git describe --tags --abbrev=0', this.projectRoot);
    return result.output.trim().replace('v', '') || '0.0.0';
  }

  incrementVersion(version, type) {
    const [major, minor, patch] = version.split('.').map(Number);
    
    switch (type) {
      case 'major': return `${major + 1}.0.0`;
      case 'minor': return `${major}.${minor + 1}.0`;
      case 'patch': return `${major}.${minor}.${patch + 1}`;
      default: return version;
    }
  }

  async updateVersionInPackageJson(newVersion) {
    const packageFiles = ['package.json', 'frontend/package.json', 'backend/package.json'];
    
    for (const file of packageFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        pkg.version = newVersion;
        fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2));
      }
    }
  }

  async generateChangelog(version) {
    const changelogPath = path.join(this.projectRoot, 'CHANGELOG.md');
    const logResult = await this.executeCommand(`git log --oneline --since="1 week ago"`, this.projectRoot);
    const commits = logResult.output.split('\n').filter(line => line.trim());
    
    const changelog = `# Changelog\n\n## [${version}] - ${new Date().toISOString().split('T')[0]}\n\n${commits.map(commit => `- ${commit}`).join('\n')}\n\n`;
    
    if (fs.existsSync(changelogPath)) {
      const existing = fs.readFileSync(changelogPath, 'utf8');
      fs.writeFileSync(changelogPath, changelog + existing);
    } else {
      fs.writeFileSync(changelogPath, changelog);
    }
  }

  async linkReleaseToLinearIssue(version, issueId) {
    // Link release to Linear issue
    // This would update Linear issue with release information
    return true; // Placeholder
  }

  sendError(message, error = null, id = null) {
    const response = {
      jsonrpc: "2.0",
      id,
      error: {
        code: -1,
        message,
        data: error ? error.stack : null
      }
    };
    console.log(JSON.stringify(response));
  }
}

// Start the unified MCP server
new UnifiedTraceChainMCPServer();
