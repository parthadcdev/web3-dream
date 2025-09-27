"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const authorization_1 = require("../middleware/authorization");
const security_monitoring_1 = require("../middleware/security-monitoring");
const router = (0, express_1.Router)();
// Security dashboard endpoint
router.get('/dashboard', (0, authorization_1.requireRole)([authorization_1.UserRole.ADMIN, authorization_1.UserRole.MODERATOR]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const dashboard = (0, security_monitoring_1.getSecurityDashboard)();
    res.json({
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString()
    });
}));
// Security metrics endpoint
router.get('/metrics', (0, authorization_1.requireRole)([authorization_1.UserRole.ADMIN, authorization_1.UserRole.MODERATOR]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const metrics = (0, security_monitoring_1.getSecurityMetrics)();
    res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
    });
}));
// Security events endpoint
router.get('/events', (0, authorization_1.requireRole)([authorization_1.UserRole.ADMIN, authorization_1.UserRole.MODERATOR]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 100, severity, type, page = 1 } = req.query;
    const events = (0, security_monitoring_1.getSecurityEvents)(Number(limit), severity, type);
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedEvents = events.slice(startIndex, endIndex);
    res.json({
        success: true,
        data: {
            events: paginatedEvents,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: events.length,
                pages: Math.ceil(events.length / Number(limit))
            }
        },
        timestamp: new Date().toISOString()
    });
}));
// Security health check endpoint
router.get('/health', (0, authorization_1.requireRole)([authorization_1.UserRole.ADMIN, authorization_1.UserRole.MODERATOR]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const dashboard = (0, security_monitoring_1.getSecurityDashboard)();
    const healthScore = dashboard.healthScore;
    let status = 'healthy';
    if (healthScore < 50)
        status = 'critical';
    else if (healthScore < 70)
        status = 'warning';
    else if (healthScore < 85)
        status = 'degraded';
    res.json({
        success: true,
        data: {
            status,
            healthScore,
            lastChecked: new Date().toISOString(),
            recommendations: generateSecurityRecommendations(dashboard)
        }
    });
}));
// Security cleanup endpoint
router.post('/cleanup', (0, authorization_1.requireRole)([authorization_1.UserRole.ADMIN]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    (0, security_monitoring_1.cleanupSecurityEvents)();
    res.json({
        success: true,
        message: 'Security events cleanup completed',
        timestamp: new Date().toISOString()
    });
}));
// Security test endpoint (for testing security monitoring)
router.post('/test', (0, authorization_1.requireRole)([authorization_1.UserRole.ADMIN]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { eventType = security_monitoring_1.SecurityEventType.SUSPICIOUS_ACTIVITY, severity = 'medium' } = req.body;
    (0, security_monitoring_1.logSecurityEvent)(eventType, req, severity, { test: true, triggeredBy: req.user?.id });
    res.json({
        success: true,
        message: 'Security test event logged',
        timestamp: new Date().toISOString()
    });
}));
// Security alerts endpoint
router.get('/alerts', (0, authorization_1.requireRole)([authorization_1.UserRole.ADMIN, authorization_1.UserRole.MODERATOR]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const recentEvents = (0, security_monitoring_1.getSecurityEvents)(50);
    const criticalEvents = recentEvents.filter(event => event.severity === 'critical');
    const highEvents = recentEvents.filter(event => event.severity === 'high');
    const alerts = [
        ...criticalEvents.map(event => ({
            id: event.id,
            type: 'critical',
            title: 'Critical Security Event',
            message: `${event.type} detected from ${event.ip}`,
            timestamp: event.timestamp,
            details: event.details
        })),
        ...highEvents.map(event => ({
            id: event.id,
            type: 'warning',
            title: 'High Priority Security Event',
            message: `${event.type} detected from ${event.ip}`,
            timestamp: event.timestamp,
            details: event.details
        }))
    ];
    res.json({
        success: true,
        data: {
            alerts: alerts.slice(0, 20),
            total: alerts.length,
            critical: criticalEvents.length,
            high: highEvents.length
        },
        timestamp: new Date().toISOString()
    });
}));
// Security recommendations endpoint
router.get('/recommendations', (0, authorization_1.requireRole)([authorization_1.UserRole.ADMIN, authorization_1.UserRole.MODERATOR]), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const dashboard = (0, security_monitoring_1.getSecurityDashboard)();
    const recommendations = generateSecurityRecommendations(dashboard);
    res.json({
        success: true,
        data: {
            recommendations,
            priority: recommendations.filter(r => r.priority === 'high').length,
            total: recommendations.length
        },
        timestamp: new Date().toISOString()
    });
}));
// Generate security recommendations based on current state
const generateSecurityRecommendations = (dashboard) => {
    const recommendations = [];
    // Check for high error rates
    const errorRate = (dashboard.metrics.blockedRequests / Math.max(dashboard.metrics.totalRequests, 1)) * 100;
    if (errorRate > 10) {
        recommendations.push({
            id: 'high_error_rate',
            priority: 'high',
            category: 'performance',
            title: 'High Error Rate Detected',
            description: `Error rate is ${errorRate.toFixed(2)}%. Consider investigating blocked requests.`,
            action: 'Review blocked requests and adjust security policies if needed.'
        });
    }
    // Check for suspicious IPs
    if (dashboard.topSuspiciousIPs.length > 5) {
        recommendations.push({
            id: 'many_suspicious_ips',
            priority: 'medium',
            category: 'security',
            title: 'Multiple Suspicious IPs Detected',
            description: `${dashboard.topSuspiciousIPs.length} suspicious IPs identified.`,
            action: 'Consider implementing IP blocking or additional monitoring.'
        });
    }
    // Check for failed auth attempts
    if (dashboard.metrics.failedAuthAttempts > 100) {
        recommendations.push({
            id: 'high_auth_failures',
            priority: 'high',
            category: 'authentication',
            title: 'High Number of Failed Authentication Attempts',
            description: `${dashboard.metrics.failedAuthAttempts} failed auth attempts detected.`,
            action: 'Review authentication logs and consider implementing account lockout policies.'
        });
    }
    // Check for SQL injection attempts
    if (dashboard.metrics.sqlInjectionAttempts > 0) {
        recommendations.push({
            id: 'sql_injection_attempts',
            priority: 'critical',
            category: 'security',
            title: 'SQL Injection Attempts Detected',
            description: `${dashboard.metrics.sqlInjectionAttempts} SQL injection attempts blocked.`,
            action: 'Review and strengthen input validation. Consider implementing additional security measures.'
        });
    }
    // Check for XSS attempts
    if (dashboard.metrics.xssAttempts > 0) {
        recommendations.push({
            id: 'xss_attempts',
            priority: 'critical',
            category: 'security',
            title: 'XSS Attempts Detected',
            description: `${dashboard.metrics.xssAttempts} XSS attempts blocked.`,
            action: 'Review and strengthen input sanitization. Consider implementing additional XSS protection.'
        });
    }
    // Check for rate limiting hits
    if (dashboard.metrics.rateLimitHits > 50) {
        recommendations.push({
            id: 'high_rate_limit_hits',
            priority: 'medium',
            category: 'performance',
            title: 'High Rate Limiting Activity',
            description: `${dashboard.metrics.rateLimitHits} requests blocked by rate limiting.`,
            action: 'Review rate limiting policies and consider adjusting limits if appropriate.'
        });
    }
    // Check health score
    if (dashboard.healthScore < 70) {
        recommendations.push({
            id: 'low_health_score',
            priority: 'high',
            category: 'overall',
            title: 'Low Security Health Score',
            description: `Security health score is ${dashboard.healthScore}/100.`,
            action: 'Address high-priority security issues to improve overall security posture.'
        });
    }
    return recommendations;
};
exports.default = router;
//# sourceMappingURL=security.js.map