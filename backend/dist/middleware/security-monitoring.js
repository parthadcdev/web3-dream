"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupSecurityEvents = exports.getSecurityDashboard = exports.getSecurityEvents = exports.getSecurityMetrics = exports.securityMonitoring = exports.logSecurityEvent = exports.SecurityEventType = void 0;
// In-memory storage (in production, use Redis or database)
const securityMetrics = {
    totalRequests: 0,
    blockedRequests: 0,
    suspiciousActivity: 0,
    failedAuthAttempts: 0,
    rateLimitHits: 0,
    sqlInjectionAttempts: 0,
    xssAttempts: 0,
    suspiciousIPs: new Set(),
    lastUpdated: new Date()
};
// Security event types
var SecurityEventType;
(function (SecurityEventType) {
    SecurityEventType["AUTH_FAILURE"] = "auth_failure";
    SecurityEventType["RATE_LIMIT_EXCEEDED"] = "rate_limit_exceeded";
    SecurityEventType["SQL_INJECTION_ATTEMPT"] = "sql_injection_attempt";
    SecurityEventType["XSS_ATTEMPT"] = "xss_attempt";
    SecurityEventType["SUSPICIOUS_ACTIVITY"] = "suspicious_activity";
    SecurityEventType["BLOCKED_REQUEST"] = "blocked_request";
    SecurityEventType["UNUSUAL_PATTERN"] = "unusual_pattern";
})(SecurityEventType || (exports.SecurityEventType = SecurityEventType = {}));
// Security events storage
const securityEvents = [];
// Generate unique event ID
const generateEventId = () => {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
// Log security event
const logSecurityEvent = (type, req, severity, details = {}) => {
    const event = {
        id: generateEventId(),
        type,
        timestamp: new Date(),
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        userId: req.user?.id,
        endpoint: req.path,
        method: req.method,
        severity,
        details,
        resolved: false
    };
    securityEvents.push(event);
    // Update metrics
    securityMetrics.totalRequests++;
    securityMetrics.lastUpdated = new Date();
    switch (type) {
        case SecurityEventType.AUTH_FAILURE:
            securityMetrics.failedAuthAttempts++;
            break;
        case SecurityEventType.RATE_LIMIT_EXCEEDED:
            securityMetrics.rateLimitHits++;
            break;
        case SecurityEventType.SQL_INJECTION_ATTEMPT:
            securityMetrics.sqlInjectionAttempts++;
            break;
        case SecurityEventType.XSS_ATTEMPT:
            securityMetrics.xssAttempts++;
            break;
        case SecurityEventType.SUSPICIOUS_ACTIVITY:
            securityMetrics.suspiciousActivity++;
            break;
        case SecurityEventType.BLOCKED_REQUEST:
            securityMetrics.blockedRequests++;
            break;
    }
    // Add to suspicious IPs if high severity
    if (severity === 'high' || severity === 'critical') {
        securityMetrics.suspiciousIPs.add(req.ip || 'unknown');
    }
    // Log to console (in production, use proper logging service)
    console.warn(`🚨 Security Event [${severity.toUpperCase()}]:`, {
        type,
        ip: event.ip,
        endpoint: event.endpoint,
        userId: event.userId,
        details
    });
    // In production, send to monitoring service (e.g., DataDog, New Relic)
    if (process.env.NODE_ENV === 'production') {
        // sendToMonitoringService(event);
    }
};
exports.logSecurityEvent = logSecurityEvent;
// Security monitoring middleware
const securityMonitoring = (req, res, next) => {
    const startTime = Date.now();
    // Monitor response
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        // Detect suspicious patterns
        if (statusCode >= 400) {
            if (statusCode === 401) {
                (0, exports.logSecurityEvent)(SecurityEventType.AUTH_FAILURE, req, 'medium', { statusCode, duration });
            }
            else if (statusCode === 429) {
                (0, exports.logSecurityEvent)(SecurityEventType.RATE_LIMIT_EXCEEDED, req, 'medium', { statusCode, duration });
            }
            else if (statusCode >= 500) {
                (0, exports.logSecurityEvent)(SecurityEventType.SUSPICIOUS_ACTIVITY, req, 'high', { statusCode, duration, error: 'server_error' });
            }
        }
        // Detect unusual request patterns
        if (duration > 10000) { // 10 seconds
            (0, exports.logSecurityEvent)(SecurityEventType.UNUSUAL_PATTERN, req, 'medium', { duration, statusCode, pattern: 'slow_request' });
        }
    });
    next();
};
exports.securityMonitoring = securityMonitoring;
// Get security metrics
const getSecurityMetrics = () => {
    return {
        ...securityMetrics,
        suspiciousIPs: new Set(securityMetrics.suspiciousIPs) // Return a copy
    };
};
exports.getSecurityMetrics = getSecurityMetrics;
// Get security events
const getSecurityEvents = (limit = 100, severity, type) => {
    let filteredEvents = securityEvents;
    if (severity) {
        filteredEvents = filteredEvents.filter(event => event.severity === severity);
    }
    if (type) {
        filteredEvents = filteredEvents.filter(event => event.type === type);
    }
    return filteredEvents
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
};
exports.getSecurityEvents = getSecurityEvents;
// Get security dashboard data
const getSecurityDashboard = () => {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentEvents = securityEvents.filter(event => event.timestamp > last24Hours);
    const weeklyEvents = securityEvents.filter(event => event.timestamp > last7Days);
    const eventsByType = recentEvents.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
    }, {});
    const eventsBySeverity = recentEvents.reduce((acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
    }, {});
    const topSuspiciousIPs = Array.from(securityMetrics.suspiciousIPs).slice(0, 10);
    return {
        metrics: securityMetrics,
        recentActivity: {
            last24Hours: recentEvents.length,
            last7Days: weeklyEvents.length,
            eventsByType,
            eventsBySeverity
        },
        topSuspiciousIPs,
        recentEvents: recentEvents.slice(0, 20),
        healthScore: calculateSecurityHealthScore()
    };
};
exports.getSecurityDashboard = getSecurityDashboard;
// Calculate security health score
const calculateSecurityHealthScore = () => {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentEvents = securityEvents.filter(event => event.timestamp > last24Hours);
    let score = 100;
    // Deduct points for security events
    recentEvents.forEach(event => {
        switch (event.severity) {
            case 'low':
                score -= 1;
                break;
            case 'medium':
                score -= 5;
                break;
            case 'high':
                score -= 15;
                break;
            case 'critical':
                score -= 30;
                break;
        }
    });
    // Deduct points for high error rates
    const errorRate = (securityMetrics.blockedRequests / Math.max(securityMetrics.totalRequests, 1)) * 100;
    if (errorRate > 10)
        score -= 20;
    else if (errorRate > 5)
        score -= 10;
    else if (errorRate > 1)
        score -= 5;
    return Math.max(0, Math.min(100, score));
};
// Clear old security events (run periodically)
const cleanupSecurityEvents = () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const initialLength = securityEvents.length;
    // Remove events older than 30 days
    for (let i = securityEvents.length - 1; i >= 0; i--) {
        const event = securityEvents[i];
        if (event && event.timestamp < thirtyDaysAgo) {
            securityEvents.splice(i, 1);
        }
    }
    const removedCount = initialLength - securityEvents.length;
    if (removedCount > 0) {
        console.log(`🧹 Cleaned up ${removedCount} old security events`);
    }
};
exports.cleanupSecurityEvents = cleanupSecurityEvents;
// Export security monitoring functions
exports.default = {
    logSecurityEvent: exports.logSecurityEvent,
    securityMonitoring: exports.securityMonitoring,
    getSecurityMetrics: exports.getSecurityMetrics,
    getSecurityEvents: exports.getSecurityEvents,
    getSecurityDashboard: exports.getSecurityDashboard,
    cleanupSecurityEvents: exports.cleanupSecurityEvents
};
//# sourceMappingURL=security-monitoring.js.map