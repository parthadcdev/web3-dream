import { Request, Response, NextFunction } from 'express';
interface SecurityMetrics {
    totalRequests: number;
    blockedRequests: number;
    suspiciousActivity: number;
    failedAuthAttempts: number;
    rateLimitHits: number;
    sqlInjectionAttempts: number;
    xssAttempts: number;
    suspiciousIPs: Set<string>;
    lastUpdated: Date;
}
export declare enum SecurityEventType {
    AUTH_FAILURE = "auth_failure",
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
    SQL_INJECTION_ATTEMPT = "sql_injection_attempt",
    XSS_ATTEMPT = "xss_attempt",
    SUSPICIOUS_ACTIVITY = "suspicious_activity",
    BLOCKED_REQUEST = "blocked_request",
    UNUSUAL_PATTERN = "unusual_pattern"
}
interface SecurityEvent {
    id: string;
    type: SecurityEventType;
    timestamp: Date;
    ip: string;
    userAgent: string;
    userId?: string;
    endpoint: string;
    method: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: Record<string, any>;
    resolved: boolean;
}
export declare const logSecurityEvent: (type: SecurityEventType, req: Request, severity: "low" | "medium" | "high" | "critical", details?: Record<string, any>) => void;
export declare const securityMonitoring: (req: Request, res: Response, next: NextFunction) => void;
export declare const getSecurityMetrics: () => SecurityMetrics;
export declare const getSecurityEvents: (limit?: number, severity?: "low" | "medium" | "high" | "critical", type?: SecurityEventType) => SecurityEvent[];
export declare const getSecurityDashboard: () => {
    metrics: SecurityMetrics;
    recentActivity: {
        last24Hours: number;
        last7Days: number;
        eventsByType: Record<string, number>;
        eventsBySeverity: Record<string, number>;
    };
    topSuspiciousIPs: string[];
    recentEvents: SecurityEvent[];
    healthScore: number;
};
export declare const cleanupSecurityEvents: () => void;
declare const _default: {
    logSecurityEvent: (type: SecurityEventType, req: Request, severity: "low" | "medium" | "high" | "critical", details?: Record<string, any>) => void;
    securityMonitoring: (req: Request, res: Response, next: NextFunction) => void;
    getSecurityMetrics: () => SecurityMetrics;
    getSecurityEvents: (limit?: number, severity?: "low" | "medium" | "high" | "critical", type?: SecurityEventType) => SecurityEvent[];
    getSecurityDashboard: () => {
        metrics: SecurityMetrics;
        recentActivity: {
            last24Hours: number;
            last7Days: number;
            eventsByType: Record<string, number>;
            eventsBySeverity: Record<string, number>;
        };
        topSuspiciousIPs: string[];
        recentEvents: SecurityEvent[];
        healthScore: number;
    };
    cleanupSecurityEvents: () => void;
};
export default _default;
//# sourceMappingURL=security-monitoring.d.ts.map