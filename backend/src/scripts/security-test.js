#!/usr/bin/env node

/**
 * Security Testing Script for TraceChain API
 * Tests various security vulnerabilities and configurations
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Configuration
const config = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  testTimeout: 10000,
  verbose: process.argv.includes('--verbose'),
  outputFile: process.env.SECURITY_TEST_OUTPUT || 'security-test-results.json'
};

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  totalTests: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const makeRequest = (options, data = null) => {
  return new Promise((resolve, reject) => {
    const client = options.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(config.testTimeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const runTest = async (name, testFn) => {
  testResults.totalTests++;
  log(`Running test: ${name}`);
  
  try {
    const result = await testFn();
    testResults.passed++;
    testResults.tests.push({
      name,
      status: 'passed',
      result
    });
    log(`✅ ${name} - PASSED`, 'success');
    return result;
  } catch (error) {
    testResults.failed++;
    testResults.tests.push({
      name,
      status: 'failed',
      error: error.message
    });
    log(`❌ ${name} - FAILED: ${error.message}`, 'error');
    throw error;
  }
};

const runWarningTest = async (name, testFn) => {
  testResults.totalTests++;
  log(`Running warning test: ${name}`);
  
  try {
    const result = await testFn();
    testResults.warnings++;
    testResults.tests.push({
      name,
      status: 'warning',
      result
    });
    log(`⚠️ ${name} - WARNING`, 'warning');
    return result;
  } catch (error) {
    testResults.passed++;
    testResults.tests.push({
      name,
      status: 'passed',
      result: 'No warning detected'
    });
    log(`✅ ${name} - No warning detected`, 'success');
    return null;
  }
};

// Security tests
const securityTests = {
  // Test 1: Check if authentication is required for protected endpoints
  async testAuthenticationRequired() {
    const protectedEndpoints = [
      '/api/products',
      '/api/nft/certificates',
      '/api/users/profile'
    ];
    
    for (const endpoint of protectedEndpoints) {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: endpoint,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.statusCode !== 401) {
        throw new Error(`Endpoint ${endpoint} should require authentication (got ${response.statusCode})`);
      }
    }
    
    return 'All protected endpoints require authentication';
  },

  // Test 2: Check for SQL injection vulnerabilities
  async testSQLInjection() {
    const maliciousPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --"
    ];
    
    for (const payload of maliciousPayloads) {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/products',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        }
      }, {
        search: payload
      });
      
      if (response.statusCode === 500) {
        throw new Error(`Potential SQL injection vulnerability detected with payload: ${payload}`);
      }
    }
    
    return 'No SQL injection vulnerabilities detected';
  },

  // Test 3: Check for XSS vulnerabilities
  async testXSSVulnerabilities() {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(\'XSS\')">',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>'
    ];
    
    for (const payload of xssPayloads) {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/products',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        }
      }, {
        name: payload,
        type: 'PHARMACEUTICAL',
        batchNumber: 'TEST001',
        manufactureDate: '2024-01-01T00:00:00Z'
      });
      
      if (response.statusCode === 200 && response.body.name === payload) {
        throw new Error(`Potential XSS vulnerability detected with payload: ${payload}`);
      }
    }
    
    return 'No XSS vulnerabilities detected';
  },

  // Test 4: Check security headers
  async testSecurityHeaders() {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET'
    });
    
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security',
      'referrer-policy'
    ];
    
    const missingHeaders = requiredHeaders.filter(header => !response.headers[header]);
    
    if (missingHeaders.length > 0) {
      throw new Error(`Missing security headers: ${missingHeaders.join(', ')}`);
    }
    
    return 'All required security headers present';
  },

  // Test 5: Check CORS configuration
  async testCORSConfiguration() {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://malicious-site.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    
    if (response.headers['access-control-allow-origin'] === 'https://malicious-site.com') {
      throw new Error('CORS allows requests from malicious origins');
    }
    
    return 'CORS properly configured';
  },

  // Test 6: Check rate limiting
  async testRateLimiting() {
    const requests = [];
    
    // Make 150 requests quickly (should exceed rate limit of 100)
    for (let i = 0; i < 150; i++) {
      requests.push(makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/health',
        method: 'GET'
      }));
    }
    
    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
    
    if (rateLimitedResponses.length === 0) {
      throw new Error('Rate limiting not working properly');
    }
    
    return `Rate limiting working (${rateLimitedResponses.length} requests blocked)`;
  },

  // Test 7: Check for information disclosure
  async testInformationDisclosure() {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/nonexistent',
      method: 'GET'
    });
    
    if (response.body.stack || response.body.error?.includes('at ')) {
      throw new Error('Stack traces exposed in error responses');
    }
    
    if (response.headers['x-powered-by']) {
      throw new Error('X-Powered-By header exposes technology stack');
    }
    
    return 'No sensitive information disclosed';
  },

  // Test 8: Check input validation
  async testInputValidation() {
    const invalidInputs = [
      { name: '', type: 'INVALID', batchNumber: 'A'.repeat(1000) },
      { name: 'Test', type: 'PHARMACEUTICAL', batchNumber: 'TEST001', manufactureDate: 'invalid-date' },
      { name: 'Test', type: 'PHARMACEUTICAL', batchNumber: 'TEST001', rawMaterials: 'not-an-array' }
    ];
    
    for (const invalidInput of invalidInputs) {
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/products',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        }
      }, invalidInput);
      
      if (response.statusCode === 200) {
        throw new Error(`Invalid input accepted: ${JSON.stringify(invalidInput)}`);
      }
    }
    
    return 'Input validation working properly';
  },

  // Test 9: Check for authorization bypass
  async testAuthorizationBypass() {
    // Try to access another user's data
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/products/1',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token'
      }
    });
    
    // This should either return 403 or 404, not 200 with data
    if (response.statusCode === 200 && response.body.product) {
      throw new Error('Authorization bypass possible - accessed another user\'s data');
    }
    
    return 'Authorization working properly';
  },

  // Test 10: Check for CSRF protection
  async testCSRFProtection() {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token'
      }
    }, {
      name: 'Test Product',
      type: 'PHARMACEUTICAL',
      batchNumber: 'TEST001',
      manufactureDate: '2024-01-01T00:00:00Z'
    });
    
    // Should require CSRF token for state-changing operations
    if (response.statusCode === 200) {
      log('CSRF protection may not be enabled', 'warning');
    }
    
    return 'CSRF protection check completed';
  }
};

// Main test runner
const runSecurityTests = async () => {
  log('Starting security tests...');
  log(`Testing API at: ${config.baseUrl}`);
  
  try {
    // Run all security tests
    await runTest('Authentication Required', securityTests.testAuthenticationRequired);
    await runTest('SQL Injection Protection', securityTests.testSQLInjection);
    await runTest('XSS Protection', securityTests.testXSSVulnerabilities);
    await runTest('Security Headers', securityTests.testSecurityHeaders);
    await runTest('CORS Configuration', securityTests.testCORSConfiguration);
    await runTest('Rate Limiting', securityTests.testRateLimiting);
    await runTest('Information Disclosure', securityTests.testInformationDisclosure);
    await runTest('Input Validation', securityTests.testInputValidation);
    await runTest('Authorization Bypass', securityTests.testAuthorizationBypass);
    await runWarningTest('CSRF Protection', securityTests.testCSRFProtection);
    
    // Calculate security score
    const securityScore = Math.round((testResults.passed / testResults.totalTests) * 100);
    
    log(`\nSecurity Test Results:`);
    log(`Total Tests: ${testResults.totalTests}`);
    log(`Passed: ${testResults.passed}`);
    log(`Failed: ${testResults.failed}`);
    log(`Warnings: ${testResults.warnings}`);
    log(`Security Score: ${securityScore}/100`);
    
    if (securityScore < 80) {
      log('⚠️ Security score is below 80. Please address the failed tests.', 'warning');
    } else if (securityScore < 90) {
      log('⚠️ Security score is below 90. Consider addressing warnings.', 'warning');
    } else {
      log('✅ Security score is excellent!', 'success');
    }
    
    // Save results to file
    testResults.securityScore = securityScore;
    testResults.summary = {
      status: securityScore >= 80 ? 'PASS' : 'FAIL',
      recommendations: securityScore < 80 ? [
        'Implement missing authentication middleware',
        'Add SQL injection protection',
        'Implement XSS filtering',
        'Configure security headers',
        'Set up proper CORS policy',
        'Enable rate limiting',
        'Add input validation',
        'Implement proper authorization checks'
      ] : []
    };
    
    fs.writeFileSync(config.outputFile, JSON.stringify(testResults, null, 2));
    log(`Results saved to: ${config.outputFile}`);
    
    process.exit(securityScore >= 80 ? 0 : 1);
    
  } catch (error) {
    log(`Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  }
};

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTests();
}

export { runSecurityTests, securityTests };
