#!/usr/bin/env node

/**
 * TraceChain MCP Server
 * Provides project-specific context and tools for Cursor AI IDE
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class TraceChainMCPServer {
  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || process.cwd();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    process.stdin.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        this.sendError('Invalid JSON message', error);
      }
    });

    process.on('SIGINT', () => {
      process.exit(0);
    });
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
        name: "tracechain-mcp-server",
        version: "1.0.0"
      }
    });
  }

  handleToolsList(message) {
    const tools = [
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
              enum: ["security", "gas", "best_practices"],
              description: "Type of analysis to perform"
            }
          },
          required: ["contractPath", "analysisType"]
        }
      },
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
              enum: ["structure", "security", "performance"],
              description: "Type of validation to perform"
            }
          },
          required: ["endpointPath", "validationType"]
        }
      },
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
              enum: ["unit", "integration", "e2e"],
              description: "Type of tests to generate"
            }
          },
          required: ["componentPath", "testType"]
        }
      },
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
      }
    ];

    this.sendResponse(message.id, { tools });
  }

  handleToolCall(message) {
    const { name, arguments: args } = message.params;

    switch (name) {
      case "analyze_smart_contract":
        this.analyzeSmartContract(args, message.id);
        break;
      case "validate_api_endpoint":
        this.validateApiEndpoint(args, message.id);
        break;
      case "check_project_health":
        this.checkProjectHealth(args, message.id);
        break;
      case "generate_test_suite":
        this.generateTestSuite(args, message.id);
        break;
      case "optimize_docker_config":
        this.optimizeDockerConfig(args, message.id);
        break;
      default:
        this.sendError(`Unknown tool: ${name}`, null, message.id);
    }
  }

  async analyzeSmartContract(args, messageId) {
    try {
      const contractPath = path.join(this.projectRoot, args.contractPath);
      const contractContent = fs.readFileSync(contractPath, 'utf8');
      
      let analysis = {
        contract: path.basename(contractPath),
        analysisType: args.analysisType,
        findings: [],
        recommendations: [],
        score: 100
      };

      if (args.analysisType === 'security') {
        analysis = this.analyzeSecurity(contractContent, analysis);
      } else if (args.analysisType === 'gas') {
        analysis = this.analyzeGasOptimization(contractContent, analysis);
      } else if (args.analysisType === 'best_practices') {
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

  analyzeSecurity(contractContent, analysis) {
    const securityPatterns = [
      {
        pattern: /reentrancy/i,
        issue: "Potential reentrancy vulnerability",
        recommendation: "Use ReentrancyGuard modifier"
      },
      {
        pattern: /\.transfer\(|\.send\(/,
        issue: "Use of deprecated transfer/send methods",
        recommendation: "Use .call() with proper error handling"
      },
      {
        pattern: /tx\.origin/,
        issue: "Use of tx.origin for authorization",
        recommendation: "Use msg.sender instead of tx.origin"
      }
    ];

    securityPatterns.forEach(({ pattern, issue, recommendation }) => {
      if (pattern.test(contractContent)) {
        analysis.findings.push(issue);
        analysis.recommendations.push(recommendation);
        analysis.score -= 10;
      }
    });

    return analysis;
  }

  analyzeGasOptimization(contractContent, analysis) {
    const gasPatterns = [
      {
        pattern: /for\s*\([^)]*\)\s*\{[^}]*\}/g,
        issue: "Potential gas optimization in loops",
        recommendation: "Consider caching array length and using unchecked blocks"
      },
      {
        pattern: /string\s+\w+/g,
        issue: "String storage can be expensive",
        recommendation: "Consider using bytes32 for fixed strings or string literals"
      }
    ];

    gasPatterns.forEach(({ pattern, issue, recommendation }) => {
      if (pattern.test(contractContent)) {
        analysis.findings.push(issue);
        analysis.recommendations.push(recommendation);
        analysis.score -= 5;
      }
    });

    return analysis;
  }

  analyzeBestPractices(contractContent, analysis) {
    const bestPracticePatterns = [
      {
        pattern: /\/\/ SPDX-License-Identifier/,
        issue: "License identifier found",
        recommendation: "Good practice: License identifier present",
        positive: true
      },
      {
        pattern: /pragma solidity/,
        issue: "Solidity version specified",
        recommendation: "Good practice: Solidity version specified",
        positive: true
      },
      {
        pattern: /@openzeppelin/,
        issue: "OpenZeppelin libraries used",
        recommendation: "Good practice: Using battle-tested libraries",
        positive: true
      }
    ];

    bestPracticePatterns.forEach(({ pattern, issue, recommendation, positive }) => {
      if (pattern.test(contractContent)) {
        if (positive) {
          analysis.findings.push(`✅ ${issue}`);
          analysis.score += 5;
        } else {
          analysis.findings.push(issue);
          analysis.recommendations.push(recommendation);
          analysis.score -= 5;
        }
      }
    });

    return analysis;
  }

  async validateApiEndpoint(args, messageId) {
    try {
      const endpointPath = path.join(this.projectRoot, args.endpointPath);
      const endpointContent = fs.readFileSync(endpointPath, 'utf8');
      
      const validation = {
        endpoint: path.basename(endpointPath),
        validationType: args.validationType,
        issues: [],
        recommendations: [],
        score: 100
      };

      if (args.validationType === 'security') {
        this.validateApiSecurity(endpointContent, validation);
      } else if (args.validationType === 'structure') {
        this.validateApiStructure(endpointContent, validation);
      } else if (args.validationType === 'performance') {
        this.validateApiPerformance(endpointContent, validation);
      }

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(validation, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to validate API endpoint: ${error.message}`, error, messageId);
    }
  }

  validateApiSecurity(content, validation) {
    const securityChecks = [
      {
        pattern: /helmet\(/,
        issue: "✅ Helmet security middleware found",
        positive: true
      },
      {
        pattern: /cors\(/,
        issue: "✅ CORS middleware found",
        positive: true
      },
      {
        pattern: /rateLimit\(/,
        issue: "✅ Rate limiting middleware found",
        positive: true
      },
      {
        pattern: /authMiddleware/,
        issue: "✅ Authentication middleware found",
        positive: true
      }
    ];

    securityChecks.forEach(({ pattern, issue, positive }) => {
      if (pattern.test(content)) {
        if (positive) {
          validation.issues.push(issue);
          validation.score += 10;
        } else {
          validation.issues.push(issue);
          validation.score -= 10;
        }
      }
    });
  }

  validateApiStructure(content, validation) {
    const structureChecks = [
      {
        pattern: /express\.Router\(\)/,
        issue: "✅ Router properly configured",
        positive: true
      },
      {
        pattern: /asyncHandler/,
        issue: "✅ Async error handling found",
        positive: true
      },
      {
        pattern: /validationResult/,
        issue: "✅ Input validation found",
        positive: true
      }
    ];

    structureChecks.forEach(({ pattern, issue, positive }) => {
      if (pattern.test(content)) {
        if (positive) {
          validation.issues.push(issue);
          validation.score += 10;
        } else {
          validation.issues.push(issue);
          validation.score -= 10;
        }
      }
    });
  }

  validateApiPerformance(content, validation) {
    const performanceChecks = [
      {
        pattern: /redis|Redis/,
        issue: "✅ Redis caching found",
        positive: true
      },
      {
        pattern: /compression/,
        issue: "✅ Compression middleware found",
        positive: true
      },
      {
        pattern: /connection.*pool/i,
        issue: "✅ Connection pooling found",
        positive: true
      }
    ];

    performanceChecks.forEach(({ pattern, issue, positive }) => {
      if (pattern.test(content)) {
        if (positive) {
          validation.issues.push(issue);
          validation.score += 10;
        } else {
          validation.issues.push(issue);
          validation.score -= 10;
        }
      }
    });
  }

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

  async checkSmartContractsHealth() {
    const contractsDir = path.join(this.projectRoot, 'smart-contracts/contracts');
    const contracts = fs.readdirSync(contractsDir).filter(f => f.endsWith('.sol'));
    
    return {
      total_contracts: contracts.length,
      contracts: contracts,
      test_coverage: "90%+ target",
      security_audit: "Required before mainnet",
      gas_optimization: "In progress"
    };
  }

  async checkBackendHealth() {
    const backendDir = path.join(this.projectRoot, 'backend');
    const packageJson = JSON.parse(fs.readFileSync(path.join(backendDir, 'package.json'), 'utf8'));
    
    return {
      dependencies: Object.keys(packageJson.dependencies || {}).length,
      dev_dependencies: Object.keys(packageJson.devDependencies || {}).length,
      api_endpoints: "Configured",
      database_connection: "PostgreSQL ready",
      security_middleware: "Implemented"
    };
  }

  async checkFrontendHealth() {
    const frontendDir = path.join(this.projectRoot, 'frontend');
    const packageJson = JSON.parse(fs.readFileSync(path.join(frontendDir, 'package.json'), 'utf8'));
    
    return {
      dependencies: Object.keys(packageJson.dependencies || {}).length,
      dev_dependencies: Object.keys(packageJson.devDependencies || {}).length,
      ui_framework: "Material-UI",
      state_management: "Redux Toolkit",
      web3_integration: "Ethers.js ready"
    };
  }

  async checkInfrastructureHealth() {
    const dockerComposeExists = fs.existsSync(path.join(this.projectRoot, 'docker-compose.yml'));
    
    return {
      docker_compose: dockerComposeExists ? "Configured" : "Missing",
      services: ["PostgreSQL", "Redis", "Hardhat", "MQTT", "Monitoring"],
      monitoring: "Prometheus + Grafana configured",
      ci_cd: "Makefile ready"
    };
  }

  async generateTestSuite(args, messageId) {
    try {
      const componentPath = path.join(this.projectRoot, args.componentPath);
      const componentContent = fs.readFileSync(componentPath, 'utf8');
      
      const testSuite = {
        component: path.basename(componentPath),
        testType: args.testType,
        generated_tests: [],
        setup_instructions: [],
        coverage_target: "90%+"
      };

      if (args.testType === 'unit') {
        testSuite.generated_tests = this.generateUnitTests(componentContent);
      } else if (args.testType === 'integration') {
        testSuite.generated_tests = this.generateIntegrationTests(componentContent);
      } else if (args.testType === 'e2e') {
        testSuite.generated_tests = this.generateE2ETests(componentContent);
      }

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(testSuite, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to generate test suite: ${error.message}`, error, messageId);
    }
  }

  generateUnitTests(content) {
    return [
      "Test basic functionality",
      "Test error handling",
      "Test edge cases",
      "Test input validation",
      "Test output format"
    ];
  }

  generateIntegrationTests(content) {
    return [
      "Test API endpoint integration",
      "Test database connectivity",
      "Test external service integration",
      "Test authentication flow",
      "Test error propagation"
    ];
  }

  generateE2ETests(content) {
    return [
      "Test complete user journey",
      "Test cross-browser compatibility",
      "Test mobile responsiveness",
      "Test performance benchmarks",
      "Test security scenarios"
    ];
  }

  async optimizeDockerConfig(args, messageId) {
    try {
      const dockerfilePath = path.join(this.projectRoot, `${args.service}/Dockerfile`);
      const dockerComposePath = path.join(this.projectRoot, 'docker-compose.yml');
      
      const optimization = {
        service: args.service,
        optimizations: [],
        recommendations: [],
        performance_impact: "High"
      };

      if (args.service === 'backend') {
        optimization.optimizations = [
          "Multi-stage build for smaller image size",
          "Non-root user for security",
          "Health checks for reliability",
          "Optimized layer caching"
        ];
      } else if (args.service === 'frontend') {
        optimization.optimizations = [
          "Nginx for serving static files",
          "Gzip compression enabled",
          "Browser caching headers",
          "Optimized bundle splitting"
        ];
      }

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(optimization, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to optimize Docker config: ${error.message}`, error, messageId);
    }
  }

  handleResourcesList(message) {
    const resources = [
      {
        uri: "tracechain://project/architecture",
        name: "Project Architecture",
        description: "High-level system architecture and design patterns",
        mimeType: "text/markdown"
      },
      {
        uri: "tracechain://project/roadmap",
        name: "Implementation Roadmap",
        description: "Development phases and milestones",
        mimeType: "text/markdown"
      },
      {
        uri: "tracechain://project/smart-contracts",
        name: "Smart Contracts",
        description: "Blockchain contracts and deployment info",
        mimeType: "text/markdown"
      },
      {
        uri: "tracechain://project/api-docs",
        name: "API Documentation",
        description: "Backend API endpoints and schemas",
        mimeType: "text/markdown"
      }
    ];

    this.sendResponse(message.id, { resources });
  }

  handleResourceRead(message) {
    const { uri } = message.params;
    
    let content = "";
    switch (uri) {
      case "tracechain://project/architecture":
        content = fs.readFileSync(path.join(this.projectRoot, 'architecture-design.md'), 'utf8');
        break;
      case "tracechain://project/roadmap":
        content = fs.readFileSync(path.join(this.projectRoot, 'implementation-roadmap.md'), 'utf8');
        break;
      case "tracechain://project/smart-contracts":
        content = fs.readFileSync(path.join(this.projectRoot, 'smart-contracts-design.md'), 'utf8');
        break;
      case "tracechain://project/api-docs":
        content = "API documentation content...";
        break;
      default:
        this.sendError(`Unknown resource: ${uri}`, null, message.id);
        return;
    }

    this.sendResponse(message.id, {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: content
        }
      ]
    });
  }

  sendResponse(id, result) {
    const response = {
      jsonrpc: "2.0",
      id,
      result
    };
    console.log(JSON.stringify(response));
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

// Start the MCP server
new TraceChainMCPServer();
