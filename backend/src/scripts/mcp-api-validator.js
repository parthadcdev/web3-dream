#!/usr/bin/env node

/**
 * TraceChain API Validator MCP Server
 * Validates API endpoints and provides real-time feedback
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class APIValidatorMCPServer {
  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || process.cwd();
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
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
        }
      },
      serverInfo: {
        name: "tracechain-api-validator",
        version: "1.0.0"
      }
    });
  }

  handleToolsList(message) {
    const tools = [
      {
        name: "validate_endpoint_security",
        description: "Validate API endpoint security implementation",
        inputSchema: {
          type: "object",
          properties: {
            endpointPath: {
              type: "string",
              description: "Path to the API endpoint file"
            }
          },
          required: ["endpointPath"]
        }
      },
      {
        name: "check_api_performance",
        description: "Check API endpoint performance characteristics",
        inputSchema: {
          type: "object",
          properties: {
            endpointPath: {
              type: "string",
              description: "Path to the API endpoint file"
            }
          },
          required: ["endpointPath"]
        }
      },
      {
        name: "validate_input_sanitization",
        description: "Validate input sanitization and validation",
        inputSchema: {
          type: "object",
          properties: {
            endpointPath: {
              type: "string",
              description: "Path to the API endpoint file"
            }
          },
          required: ["endpointPath"]
        }
      },
      {
        name: "check_error_handling",
        description: "Check error handling implementation",
        inputSchema: {
          type: "object",
          properties: {
            endpointPath: {
              type: "string",
              description: "Path to the API endpoint file"
            }
          },
          required: ["endpointPath"]
        }
      },
      {
        name: "generate_api_tests",
        description: "Generate comprehensive API tests",
        inputSchema: {
          type: "object",
          properties: {
            endpointPath: {
              type: "string",
              description: "Path to the API endpoint file"
            },
            testType: {
              type: "string",
              enum: ["unit", "integration", "load"],
              description: "Type of tests to generate"
            }
          },
          required: ["endpointPath", "testType"]
        }
      }
    ];

    this.sendResponse(message.id, { tools });
  }

  async handleToolCall(message) {
    const { name, arguments: args } = message.params;

    switch (name) {
      case "validate_endpoint_security":
        await this.validateEndpointSecurity(args, message.id);
        break;
      case "check_api_performance":
        await this.checkApiPerformance(args, message.id);
        break;
      case "validate_input_sanitization":
        await this.validateInputSanitization(args, message.id);
        break;
      case "check_error_handling":
        await this.checkErrorHandling(args, message.id);
        break;
      case "generate_api_tests":
        await this.generateApiTests(args, message.id);
        break;
      default:
        this.sendError(`Unknown tool: ${name}`, null, message.id);
    }
  }

  async validateEndpointSecurity(args, messageId) {
    try {
      const endpointPath = path.join(this.projectRoot, args.endpointPath);
      const endpointContent = fs.readFileSync(endpointPath, 'utf8');
      
      const securityValidation = {
        endpoint: path.basename(endpointPath),
        timestamp: new Date().toISOString(),
        security_score: 100,
        checks: {
          authentication: this.checkAuthentication(endpointContent),
          authorization: this.checkAuthorization(endpointContent),
          input_validation: this.checkInputValidation(endpointContent),
          rate_limiting: this.checkRateLimiting(endpointContent),
          cors_configuration: this.checkCORSConfiguration(endpointContent),
          security_headers: this.checkSecurityHeaders(endpointContent),
          sql_injection_protection: this.checkSQLInjectionProtection(endpointContent),
          xss_protection: this.checkXSSProtection(endpointContent)
        },
        recommendations: [],
        vulnerabilities: []
      };

      // Calculate overall security score
      Object.values(securityValidation.checks).forEach(check => {
        if (!check.passed) {
          securityValidation.security_score -= check.penalty || 10;
          securityValidation.vulnerabilities.push(check.issue);
          securityValidation.recommendations.push(check.recommendation);
        }
      });

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(securityValidation, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to validate endpoint security: ${error.message}`, error, messageId);
    }
  }

  checkAuthentication(content) {
    const hasAuthMiddleware = /authMiddleware|authenticate|jwt/i.test(content);
    const hasTokenValidation = /jwt\.verify|token/i.test(content);
    
    return {
      passed: hasAuthMiddleware && hasTokenValidation,
      issue: hasAuthMiddleware && hasTokenValidation ? null : "Missing authentication middleware",
      recommendation: "Implement JWT-based authentication middleware",
      penalty: 15
    };
  }

  checkAuthorization(content) {
    const hasRoleCheck = /requireRole|hasPermission|rbac/i.test(content);
    const hasPermissionValidation = /permission|role/i.test(content);
    
    return {
      passed: hasRoleCheck && hasPermissionValidation,
      issue: hasRoleCheck && hasPermissionValidation ? null : "Missing authorization checks",
      recommendation: "Implement role-based access control (RBAC)",
      penalty: 10
    };
  }

  checkInputValidation(content) {
    const hasValidation = /validationResult|express-validator|joi/i.test(content);
    const hasSanitization = /trim|escape|sanitize/i.test(content);
    
    return {
      passed: hasValidation && hasSanitization,
      issue: hasValidation && hasSanitization ? null : "Insufficient input validation",
      recommendation: "Implement comprehensive input validation and sanitization",
      penalty: 12
    };
  }

  checkRateLimiting(content) {
    const hasRateLimit = /rateLimit|rate-limit/i.test(content);
    
    return {
      passed: hasRateLimit,
      issue: hasRateLimit ? null : "Missing rate limiting",
      recommendation: "Implement rate limiting to prevent abuse",
      penalty: 8
    };
  }

  checkCORSConfiguration(content) {
    const hasCORS = /cors\(/i.test(content);
    
    return {
      passed: hasCORS,
      issue: hasCORS ? null : "Missing CORS configuration",
      recommendation: "Configure CORS properly for cross-origin requests",
      penalty: 5
    };
  }

  checkSecurityHeaders(content) {
    const hasHelmet = /helmet\(/i.test(content);
    
    return {
      passed: hasHelmet,
      issue: hasHelmet ? null : "Missing security headers",
      recommendation: "Use Helmet.js for security headers",
      penalty: 7
    };
  }

  checkSQLInjectionProtection(content) {
    const hasParameterizedQueries = /prisma|sequelize|parameterized/i.test(content);
    const hasNoDirectSQL = !/query\(|exec\(.*SELECT|INSERT|UPDATE|DELETE/i.test(content);
    
    return {
      passed: hasParameterizedQueries && hasNoDirectSQL,
      issue: hasParameterizedQueries && hasNoDirectSQL ? null : "Potential SQL injection vulnerability",
      recommendation: "Use parameterized queries or ORM",
      penalty: 20
    };
  }

  checkXSSProtection(content) {
    const hasXSSProtection = /helmet|xss|escape/i.test(content);
    
    return {
      passed: hasXSSProtection,
      issue: hasXSSProtection ? null : "Missing XSS protection",
      recommendation: "Implement XSS protection middleware",
      penalty: 10
    };
  }

  async checkApiPerformance(args, messageId) {
    try {
      const endpointPath = path.join(this.projectRoot, args.endpointPath);
      const endpointContent = fs.readFileSync(endpointPath, 'utf8');
      
      const performanceCheck = {
        endpoint: path.basename(endpointPath),
        timestamp: new Date().toISOString(),
        performance_score: 100,
        checks: {
          caching: this.checkCaching(endpointContent),
          database_optimization: this.checkDatabaseOptimization(endpointContent),
          response_compression: this.checkResponseCompression(endpointContent),
          async_operations: this.checkAsyncOperations(endpointContent),
          connection_pooling: this.checkConnectionPooling(endpointContent)
        },
        recommendations: [],
        optimizations: []
      };

      // Calculate overall performance score
      Object.values(performanceCheck.checks).forEach(check => {
        if (!check.passed) {
          performanceCheck.performance_score -= check.penalty || 10;
          performanceCheck.recommendations.push(check.recommendation);
        } else {
          performanceCheck.optimizations.push(check.optimization);
        }
      });

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(performanceCheck, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to check API performance: ${error.message}`, error, messageId);
    }
  }

  checkCaching(content) {
    const hasRedis = /redis|Redis/i.test(content);
    const hasCacheHeaders = /cache|Cache/i.test(content);
    
    return {
      passed: hasRedis || hasCacheHeaders,
      issue: hasRedis || hasCacheHeaders ? null : "No caching implementation found",
      recommendation: "Implement Redis caching or HTTP cache headers",
      penalty: 15,
      optimization: hasRedis || hasCacheHeaders ? "Caching implemented" : null
    };
  }

  checkDatabaseOptimization(content) {
    const hasIndexing = /index|Index/i.test(content);
    const hasPagination = /limit|offset|pagination/i.test(content);
    
    return {
      passed: hasIndexing && hasPagination,
      issue: hasIndexing && hasPagination ? null : "Missing database optimization",
      recommendation: "Implement database indexing and pagination",
      penalty: 12,
      optimization: hasIndexing && hasPagination ? "Database optimization implemented" : null
    };
  }

  checkResponseCompression(content) {
    const hasCompression = /compression|gzip/i.test(content);
    
    return {
      passed: hasCompression,
      issue: hasCompression ? null : "No response compression",
      recommendation: "Implement response compression middleware",
      penalty: 8,
      optimization: hasCompression ? "Response compression implemented" : null
    };
  }

  checkAsyncOperations(content) {
    const hasAsync = /async|await|Promise/i.test(content);
    
    return {
      passed: hasAsync,
      issue: hasAsync ? null : "No async operations found",
      recommendation: "Use async/await for non-blocking operations",
      penalty: 10,
      optimization: hasAsync ? "Async operations implemented" : null
    };
  }

  checkConnectionPooling(content) {
    const hasPooling = /pool|Pool/i.test(content);
    
    return {
      passed: hasPooling,
      issue: hasPooling ? null : "No connection pooling",
      recommendation: "Implement database connection pooling",
      penalty: 10,
      optimization: hasPooling ? "Connection pooling implemented" : null
    };
  }

  async validateInputSanitization(args, messageId) {
    try {
      const endpointPath = path.join(this.projectRoot, args.endpointPath);
      const endpointContent = fs.readFileSync(endpointPath, 'utf8');
      
      const sanitizationCheck = {
        endpoint: path.basename(endpointPath),
        timestamp: new Date().toISOString(),
        sanitization_score: 100,
        checks: {
          input_validation: this.checkInputValidationDetailed(endpointContent),
          sanitization_methods: this.checkSanitizationMethods(endpointContent),
          sql_injection_prevention: this.checkSQLInjectionPrevention(endpointContent),
          xss_prevention: this.checkXSSPrevention(endpointContent),
          csrf_protection: this.checkCSRFProtection(endpointContent)
        },
        recommendations: []
      };

      Object.values(sanitizationCheck.checks).forEach(check => {
        if (!check.passed) {
          sanitizationCheck.sanitization_score -= check.penalty || 10;
          sanitizationCheck.recommendations.push(check.recommendation);
        }
      });

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(sanitizationCheck, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to validate input sanitization: ${error.message}`, error, messageId);
    }
  }

  checkInputValidationDetailed(content) {
    const hasValidation = /validationResult|express-validator/i.test(content);
    const hasRequired = /required|notEmpty/i.test(content);
    
    return {
      passed: hasValidation && hasRequired,
      issue: hasValidation && hasRequired ? null : "Insufficient input validation",
      recommendation: "Use express-validator for comprehensive input validation",
      penalty: 15
    };
  }

  checkSanitizationMethods(content) {
    const hasSanitization = /trim|escape|sanitize/i.test(content);
    
    return {
      passed: hasSanitization,
      issue: hasSanitization ? null : "Missing input sanitization",
      recommendation: "Implement input sanitization methods",
      penalty: 12
    };
  }

  checkSQLInjectionPrevention(content) {
    const hasORM = /prisma|sequelize|typeorm/i.test(content);
    const hasNoDirectSQL = !/query\(.*SELECT|INSERT|UPDATE|DELETE/i.test(content);
    
    return {
      passed: hasORM && hasNoDirectSQL,
      issue: hasORM && hasNoDirectSQL ? null : "Potential SQL injection risk",
      recommendation: "Use ORM or parameterized queries",
      penalty: 20
    };
  }

  checkXSSPrevention(content) {
    const hasXSSProtection = /helmet|xss|escape/i.test(content);
    
    return {
      passed: hasXSSProtection,
      issue: hasXSSProtection ? null : "Missing XSS protection",
      recommendation: "Implement XSS protection",
      penalty: 15
    };
  }

  checkCSRFProtection(content) {
    const hasCSRF = /csrf|CSRF/i.test(content);
    
    return {
      passed: hasCSRF,
      issue: hasCSRF ? null : "Missing CSRF protection",
      recommendation: "Implement CSRF protection",
      penalty: 10
    };
  }

  async checkErrorHandling(args, messageId) {
    try {
      const endpointPath = path.join(this.projectRoot, args.endpointPath);
      const endpointContent = fs.readFileSync(endpointPath, 'utf8');
      
      const errorHandlingCheck = {
        endpoint: path.basename(endpointPath),
        timestamp: new Date().toISOString(),
        error_handling_score: 100,
        checks: {
          try_catch_blocks: this.checkTryCatchBlocks(endpointContent),
          error_middleware: this.checkErrorMiddleware(endpointContent),
          async_error_handling: this.checkAsyncErrorHandling(endpointContent),
          error_logging: this.checkErrorLogging(endpointContent),
          custom_errors: this.checkCustomErrors(endpointContent)
        },
        recommendations: []
      };

      Object.values(errorHandlingCheck.checks).forEach(check => {
        if (!check.passed) {
          errorHandlingCheck.error_handling_score -= check.penalty || 10;
          errorHandlingCheck.recommendations.push(check.recommendation);
        }
      });

      this.sendResponse(messageId, {
        content: [
          {
            type: "text",
            text: JSON.stringify(errorHandlingCheck, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(`Failed to check error handling: ${error.message}`, error, messageId);
    }
  }

  checkTryCatchBlocks(content) {
    const hasTryCatch = /try\s*\{|catch\s*\(/i.test(content);
    
    return {
      passed: hasTryCatch,
      issue: hasTryCatch ? null : "Missing try-catch blocks",
      recommendation: "Implement proper try-catch error handling",
      penalty: 15
    };
  }

  checkErrorMiddleware(content) {
    const hasErrorMiddleware = /errorHandler|error.*middleware/i.test(content);
    
    return {
      passed: hasErrorMiddleware,
      issue: hasErrorMiddleware ? null : "Missing error handling middleware",
      recommendation: "Implement centralized error handling middleware",
      penalty: 12
    };
  }

  checkAsyncErrorHandling(content) {
    const hasAsyncHandler = /asyncHandler|async.*handler/i.test(content);
    
    return {
      passed: hasAsyncHandler,
      issue: hasAsyncHandler ? null : "Missing async error handling",
      recommendation: "Use asyncHandler for async route handlers",
      penalty: 10
    };
  }

  checkErrorLogging(content) {
    const hasLogging = /console\.error|logger|log/i.test(content);
    
    return {
      passed: hasLogging,
      issue: hasLogging ? null : "Missing error logging",
      recommendation: "Implement proper error logging",
      penalty: 8
    };
  }

  checkCustomErrors(content) {
    const hasCustomErrors = /Error\(|CustomError/i.test(content);
    
    return {
      passed: hasCustomErrors,
      issue: hasCustomErrors ? null : "No custom error handling",
      recommendation: "Implement custom error classes",
      penalty: 5
    };
  }

  async generateApiTests(args, messageId) {
    try {
      const endpointPath = path.join(this.projectRoot, args.endpointPath);
      const endpointContent = fs.readFileSync(endpointPath, 'utf8');
      
      const testSuite = {
        endpoint: path.basename(endpointPath),
        testType: args.testType,
        generated_tests: [],
        setup_instructions: [],
        test_cases: []
      };

      if (args.testType === 'unit') {
        testSuite.generated_tests = this.generateUnitTests(endpointContent);
      } else if (args.testType === 'integration') {
        testSuite.generated_tests = this.generateIntegrationTests(endpointContent);
      } else if (args.testType === 'load') {
        testSuite.generated_tests = this.generateLoadTests(endpointContent);
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
      this.sendError(`Failed to generate API tests: ${error.message}`, error, messageId);
    }
  }

  generateUnitTests(content) {
    return [
      "Test endpoint route registration",
      "Test middleware application",
      "Test input validation",
      "Test authentication",
      "Test authorization",
      "Test error handling",
      "Test response format"
    ];
  }

  generateIntegrationTests(content) {
    return [
      "Test complete API workflow",
      "Test database integration",
      "Test external service integration",
      "Test authentication flow",
      "Test error propagation",
      "Test response time",
      "Test concurrent requests"
    ];
  }

  generateLoadTests(content) {
    return [
      "Test high concurrent load",
      "Test memory usage under load",
      "Test response time degradation",
      "Test error rate under stress",
      "Test database connection limits",
      "Test cache performance",
      "Test rate limiting behavior"
    ];
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
new APIValidatorMCPServer();
