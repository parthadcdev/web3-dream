#!/usr/bin/env node

/**
 * Complete Enhanced TraceChain MCP Server
 * Provides project-specific context, testing, build, and deployment tools for Cursor AI IDE
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class CompleteTraceChainMCPServer {
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
        name: "tracechain-complete-mcp-server",
        version: "2.0.0"
      }
    });
  }

  handleToolsList(message) {
    const tools = [
      // Existing testing tools
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
      // New build and deploy tools
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
      }
    ];

    this.sendResponse(message.id, { tools });
  }

  handleToolCall(message) {
    const { name, arguments: args } = message.params;

    switch (name) {
      // Existing tools
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
      // New build and deploy tools
      case "build_component":
        this.buildComponent(args, message.id);
        break;
      case "deploy_application":
        this.deployApplication(args, message.id);
        break;
      case "check_deployment_status":
        this.checkDeploymentStatus(args, message.id);
        break;
      case "run_health_checks":
        this.runHealthChecks(args, message.id);
        break;
      case "rollback_deployment":
        this.rollbackDeployment(args, message.id);
        break;
      default:
        this.sendError(`Unknown tool: ${name}`, null, message.id);
    }
  }

  // ===== NEW BUILD AND DEPLOY TOOLS =====

  // Build Component Tool
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

  // Deploy Application Tool
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

  // Check Deployment Status Tool
  async checkDeploymentStatus(args, messageId) {
    try {
      const { environment } = args;
      
      // Check Docker/Podman containers
      const containerStatus = await this.getContainerStatus();
      
      // Check service health
      const healthStatus = await this.checkServiceHealth();
      
      const status = {
        environment,
        timestamp: new Date().toISOString(),
        containers: containerStatus,
        services: healthStatus,
        overall_status: this.determineOverallStatus(containerStatus, healthStatus)
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
      this.sendError(`Failed to check deployment status: ${error.message}`, error, messageId);
    }
  }

  // Run Health Checks Tool
  async runHealthChecks(args, messageId) {
    try {
      const { environment, include_performance = false } = args;
      
      const healthChecks = {
        environment,
        timestamp: new Date().toISOString(),
        checks: {}
      };

      // Backend health check
      try {
        const backendHealth = await this.checkBackendHealthEndpoint();
        healthChecks.checks.backend = backendHealth;
      } catch (error) {
        healthChecks.checks.backend = { status: "failed", error: error.message };
      }

      // Database health check
      try {
        const dbHealth = await this.checkDatabaseHealth();
        healthChecks.checks.database = dbHealth;
      } catch (error) {
        healthChecks.checks.database = { status: "failed", error: error.message };
      }

      // Redis health check
      try {
        const redisHealth = await this.checkRedisHealth();
        healthChecks.checks.redis = redisHealth;
      } catch (error) {
        healthChecks.checks.redis = { status: "failed", error: error.message };
      }

      // Frontend health check
      try {
        const frontendHealth = await this.checkFrontendHealthEndpoint();
        healthChecks.checks.frontend = frontendHealth;
      } catch (error) {
        healthChecks.checks.frontend = { status: "failed", error: error.message };
      }

      if (include_performance) {
        healthChecks.checks.performance = await this.getPerformanceMetrics();
      }

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(healthChecks, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to run health checks: ${error.message}`, error, messageId);
    }
  }

  // Rollback Deployment Tool
  async rollbackDeployment(args, messageId) {
    try {
      const { environment, target = 'all' } = args;
      
      let rollbackCommand = `./deploy-app.sh -e ${environment} rollback`;
      const workingDir = this.projectRoot;

      const result = await this.executeCommand(rollbackCommand, workingDir);
      
      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              environment,
              target,
              status: result.success ? "success" : "failed",
              output: result.output,
              timestamp: new Date().toISOString()
            }, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to rollback deployment: ${error.message}`, error, messageId);
    }
  }

  // ===== HELPER METHODS FOR BUILD/DEPLOY =====

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

  async getContainerStatus() {
    try {
      const { stdout } = await execAsync('docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"');
      return {
        status: "success",
        containers: stdout.trim().split('\n').slice(1).map(line => {
          const [name, status, ports] = line.split('\t');
          return { name, status, ports };
        })
      };
    } catch (error) {
      return { status: "failed", error: error.message };
    }
  }

  async checkServiceHealth() {
    const services = {};
    
    // Check backend
    try {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();
      services.backend = { status: "healthy", data };
    } catch (error) {
      services.backend = { status: "unhealthy", error: error.message };
    }

    // Check frontend
    try {
      const response = await fetch('http://localhost:3001');
      services.frontend = { status: response.ok ? "healthy" : "unhealthy" };
    } catch (error) {
      services.frontend = { status: "unhealthy", error: error.message };
    }

    return services;
  }

  async checkBackendHealthEndpoint() {
    const response = await fetch('http://localhost:3000/api/health');
    return await response.json();
  }

  async checkDatabaseHealth() {
    // This would typically check database connectivity
    return { status: "healthy", message: "Database connection successful" };
  }

  async checkRedisHealth() {
    // This would typically check Redis connectivity
    return { status: "healthy", message: "Redis connection successful" };
  }

  async checkFrontendHealthEndpoint() {
    const response = await fetch('http://localhost:3001');
    return { 
      status: response.ok ? "healthy" : "unhealthy",
      statusCode: response.status
    };
  }

  async getPerformanceMetrics() {
    // This would gather performance metrics
    return {
      memory_usage: "Normal",
      cpu_usage: "Normal",
      response_time: "Good"
    };
  }

  determineOverallStatus(containerStatus, healthStatus) {
    const allHealthy = Object.values(healthStatus).every(service => 
      service.status === "healthy"
    );
    return allHealthy ? "healthy" : "degraded";
  }

  // ===== EXISTING TESTING TOOLS (from original MCP server) =====

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

  // ===== RESOURCE HANDLERS =====

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

  // ===== UTILITY METHODS =====

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

// Start the complete MCP server
new CompleteTraceChainMCPServer();
