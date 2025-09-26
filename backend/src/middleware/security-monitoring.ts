import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

// Security metrics storage
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

// In-memory storage (in production, use Redis or database)
const securityMetrics: SecurityMetrics = {
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
export enum SecurityEventType {
  AUTH_FAILURE = 'auth_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BLOCKED_REQUEST = 'blocked_request',
  UNUSUAL_PATTERN = 'unusual_pattern'
}

// Security event interface
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

// Security events storage
const securityEvents: SecurityEvent[] = [];

// Generate unique event ID
const generateEventId = (): string => {
  return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Log security event
export const logSecurityEvent = (
  type: SecurityEventType,
  req: Request,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any> = {}
): void => {
  const event: SecurityEvent = {
    id: generateEventId(),
    type,
    timestamp: new Date(),
    ip: req.ip || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    userId: (req as AuthRequest).user?.id,
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

// Security monitoring middleware
export const securityMonitoring = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Monitor response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Detect suspicious patterns
    if (statusCode >= 400) {
      if (statusCode === 401) {
        logSecurityEvent(
          SecurityEventType.AUTH_FAILURE,
          req,
          'medium',
          { statusCode, duration }
        );
      } else if (statusCode === 429) {
        logSecurityEvent(
          SecurityEventType.RATE_LIMIT_EXCEEDED,
          req,
          'medium',
          { statusCode, duration }
        );
      } else if (statusCode >= 500) {
        logSecurityEvent(
          SecurityEventType.SUSPICIOUS_ACTIVITY,
          req,
          'high',
          { statusCode, duration, error: 'server_error' }
        );
      }
    }
    
    // Detect unusual request patterns
    if (duration > 10000) { // 10 seconds
      logSecurityEvent(
        SecurityEventType.UNUSUAL_PATTERN,
        req,
        'medium',
        { duration, statusCode, pattern: 'slow_request' }
      );
    }
  });
  
  next();
};

// Get security metrics
export const getSecurityMetrics = (): SecurityMetrics => {
  return {
    ...securityMetrics,
    suspiciousIPs: new Set(securityMetrics.suspiciousIPs) // Return a copy
  };
};

// Get security events
export const getSecurityEvents = (
  limit: number = 100,
  severity?: 'low' | 'medium' | 'high' | 'critical',
  type?: SecurityEventType
): SecurityEvent[] => {
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

// Get security dashboard data
export const getSecurityDashboard = () => {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const recentEvents = securityEvents.filter(event => event.timestamp > last24Hours);
  const weeklyEvents = securityEvents.filter(event => event.timestamp > last7Days);
  
  const eventsByType = recentEvents.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const eventsBySeverity = recentEvents.reduce((acc, event) => {
    acc[event.severity] = (acc[event.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
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

// Calculate security health score
const calculateSecurityHealthScore = (): number => {
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
  if (errorRate > 10) score -= 20;
  else if (errorRate > 5) score -= 10;
  else if (errorRate > 1) score -= 5;
  
  return Math.max(0, Math.min(100, score));
};

// Clear old security events (run periodically)
export const cleanupSecurityEvents = (): void => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const initialLength = securityEvents.length;
  
  // Remove events older than 30 days
  for (let i = securityEvents.length - 1; i >= 0; i--) {
    if (securityEvents[i].timestamp < thirtyDaysAgo) {
      securityEvents.splice(i, 1);
    }
  }
  
  const removedCount = initialLength - securityEvents.length;
  if (removedCount > 0) {
    console.log(`🧹 Cleaned up ${removedCount} old security events`);
  }
};

// Export security monitoring functions
export default {
  logSecurityEvent,
  securityMonitoring,
  getSecurityMetrics,
  getSecurityEvents,
  getSecurityDashboard,
  cleanupSecurityEvents
};
