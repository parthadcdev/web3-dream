"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geoAccessControl = exports.timeBasedAccess = exports.ipAccessControl = exports.auditLog = exports.roleBasedRateLimit = exports.requireApiKey = exports.requireMFA = exports.requireOwnership = exports.requireRole = exports.requireResourcePermission = exports.requireResourceAccess = exports.requirePermission = exports.hasResourcePermission = exports.canAccessResource = exports.hasPermission = exports.Resource = exports.Permission = exports.UserRole = void 0;
const errorHandler_1 = require("./errorHandler");
// Role-based access control
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["MODERATOR"] = "moderator";
    UserRole["MANUFACTURER"] = "manufacturer";
    UserRole["DISTRIBUTOR"] = "distributor";
    UserRole["RETAILER"] = "retailer";
    UserRole["CONSUMER"] = "consumer";
    UserRole["AUDITOR"] = "auditor";
    UserRole["VIEWER"] = "viewer";
})(UserRole || (exports.UserRole = UserRole = {}));
// Permission levels
var Permission;
(function (Permission) {
    Permission["READ"] = "read";
    Permission["WRITE"] = "write";
    Permission["DELETE"] = "delete";
    Permission["ADMIN"] = "admin";
    Permission["AUDIT"] = "audit";
    Permission["VERIFY"] = "verify";
    Permission["MINT"] = "mint";
    Permission["TRANSFER"] = "transfer";
})(Permission || (exports.Permission = Permission = {}));
// Resource types
var Resource;
(function (Resource) {
    Resource["PRODUCT"] = "product";
    Resource["CERTIFICATE"] = "certificate";
    Resource["USER"] = "user";
    Resource["SYSTEM"] = "system";
    Resource["AUDIT"] = "audit";
    Resource["NFT"] = "nft";
    Resource["BLOCKCHAIN"] = "blockchain";
})(Resource || (exports.Resource = Resource = {}));
// Role permissions mapping
const rolePermissions = {
    [UserRole.ADMIN]: Object.values(Permission),
    [UserRole.MODERATOR]: [Permission.READ, Permission.WRITE, Permission.AUDIT, Permission.VERIFY],
    [UserRole.MANUFACTURER]: [Permission.READ, Permission.WRITE, Permission.MINT, Permission.VERIFY],
    [UserRole.DISTRIBUTOR]: [Permission.READ, Permission.WRITE, Permission.VERIFY, Permission.TRANSFER],
    [UserRole.RETAILER]: [Permission.READ, Permission.WRITE, Permission.VERIFY],
    [UserRole.CONSUMER]: [Permission.READ, Permission.VERIFY],
    [UserRole.AUDITOR]: [Permission.READ, Permission.AUDIT, Permission.VERIFY],
    [UserRole.VIEWER]: [Permission.READ]
};
// Resource access control
const resourceAccess = {
    [Resource.PRODUCT]: [UserRole.ADMIN, UserRole.MODERATOR, UserRole.MANUFACTURER, UserRole.DISTRIBUTOR, UserRole.RETAILER, UserRole.AUDITOR, UserRole.VIEWER],
    [Resource.CERTIFICATE]: [UserRole.ADMIN, UserRole.MODERATOR, UserRole.MANUFACTURER, UserRole.DISTRIBUTOR, UserRole.RETAILER, UserRole.AUDITOR, UserRole.VIEWER],
    [Resource.USER]: [UserRole.ADMIN, UserRole.MODERATOR],
    [Resource.SYSTEM]: [UserRole.ADMIN],
    [Resource.AUDIT]: [UserRole.ADMIN, UserRole.MODERATOR, UserRole.AUDITOR],
    [Resource.NFT]: [UserRole.ADMIN, UserRole.MODERATOR, UserRole.MANUFACTURER, UserRole.DISTRIBUTOR, UserRole.RETAILER, UserRole.AUDITOR, UserRole.VIEWER],
    [Resource.BLOCKCHAIN]: [UserRole.ADMIN, UserRole.MODERATOR, UserRole.MANUFACTURER, UserRole.AUDITOR]
};
// Check if user has specific permission
const hasPermission = (userRole, permission) => {
    return rolePermissions[userRole]?.includes(permission) || false;
};
exports.hasPermission = hasPermission;
// Check if user can access specific resource
const canAccessResource = (userRole, resource) => {
    return resourceAccess[resource]?.includes(userRole) || false;
};
exports.canAccessResource = canAccessResource;
// Check if user has permission for specific resource
const hasResourcePermission = (userRole, resource, permission) => {
    return (0, exports.canAccessResource)(userRole, resource) && (0, exports.hasPermission)(userRole, permission);
};
exports.hasResourcePermission = hasResourcePermission;
// Permission-based middleware
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            next((0, errorHandler_1.createError)('Authentication required', 401));
            return;
        }
        if (!(0, exports.hasPermission)(req.user.role, permission)) {
            console.warn(`Permission denied for user ${req.user.id}: ${permission}`);
            next((0, errorHandler_1.createError)('Insufficient permissions', 403));
            return;
        }
        next();
    };
};
exports.requirePermission = requirePermission;
// Resource-based middleware
const requireResourceAccess = (resource) => {
    return (req, res, next) => {
        if (!req.user) {
            next((0, errorHandler_1.createError)('Authentication required', 401));
            return;
        }
        if (!(0, exports.canAccessResource)(req.user.role, resource)) {
            console.warn(`Resource access denied for user ${req.user.id}: ${resource}`);
            next((0, errorHandler_1.createError)('Access denied to resource', 403));
            return;
        }
        next();
    };
};
exports.requireResourceAccess = requireResourceAccess;
// Combined permission and resource middleware
const requireResourcePermission = (resource, permission) => {
    return (req, res, next) => {
        if (!req.user) {
            next((0, errorHandler_1.createError)('Authentication required', 401));
            return;
        }
        if (!(0, exports.hasResourcePermission)(req.user.role, resource, permission)) {
            console.warn(`Resource permission denied for user ${req.user.id}: ${resource}.${permission}`);
            next((0, errorHandler_1.createError)('Insufficient permissions for resource', 403));
            return;
        }
        next();
    };
};
exports.requireResourcePermission = requireResourcePermission;
// Role-based middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            next((0, errorHandler_1.createError)('Authentication required', 401));
            return;
        }
        if (!roles.includes(req.user.role)) {
            console.warn(`Role access denied for user ${req.user.id}: ${req.user.role}`);
            next((0, errorHandler_1.createError)('Insufficient role permissions', 403));
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
// Ownership-based middleware
const requireOwnership = (getOwnerId) => {
    return async (req, res, next) => {
        if (!req.user) {
            next((0, errorHandler_1.createError)('Authentication required', 401));
            return;
        }
        try {
            const ownerId = await getOwnerId(req);
            // Admin can access everything
            if (req.user.role === UserRole.ADMIN) {
                next();
                return;
            }
            // Check ownership
            if (req.user.id !== ownerId) {
                console.warn(`Ownership access denied for user ${req.user.id}: resource owned by ${ownerId}`);
                next((0, errorHandler_1.createError)('Access denied: not resource owner', 403));
                return;
            }
            next();
        }
        catch (error) {
            next((0, errorHandler_1.createError)('Error checking ownership', 500));
        }
    };
};
exports.requireOwnership = requireOwnership;
// Multi-factor authentication requirement
const requireMFA = (req, res, next) => {
    if (!req.user) {
        next((0, errorHandler_1.createError)('Authentication required', 401));
        return;
    }
    // Check if MFA is enabled and verified
    if (req.user.mfaEnabled && !req.user.mfaVerified) {
        next((0, errorHandler_1.createError)('Multi-factor authentication required', 403));
        return;
    }
    next();
};
exports.requireMFA = requireMFA;
// API key validation
const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        next((0, errorHandler_1.createError)('API key required', 401));
        return;
    }
    // In a real implementation, validate against database
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    if (!validApiKeys.includes(apiKey)) {
        console.warn(`Invalid API key attempt: ${apiKey}`);
        next((0, errorHandler_1.createError)('Invalid API key', 401));
        return;
    }
    next();
};
exports.requireApiKey = requireApiKey;
// Rate limiting based on user role
const roleBasedRateLimit = (req, res, next) => {
    const authReq = req;
    if (!authReq.user) {
        next();
        return;
    }
    // Set rate limits based on role
    const rateLimits = {
        [UserRole.ADMIN]: { windowMs: 60 * 1000, max: 1000 },
        [UserRole.MODERATOR]: { windowMs: 60 * 1000, max: 500 },
        [UserRole.MANUFACTURER]: { windowMs: 60 * 1000, max: 200 },
        [UserRole.DISTRIBUTOR]: { windowMs: 60 * 1000, max: 150 },
        [UserRole.RETAILER]: { windowMs: 60 * 1000, max: 100 },
        [UserRole.CONSUMER]: { windowMs: 60 * 1000, max: 50 },
        [UserRole.AUDITOR]: { windowMs: 60 * 1000, max: 100 },
        [UserRole.VIEWER]: { windowMs: 60 * 1000, max: 30 }
    };
    const limit = rateLimits[authReq.user.role];
    if (limit) {
        // Apply role-based rate limiting
        // This would integrate with your rate limiting library
        res.set('X-RateLimit-Limit', limit.max.toString());
    }
    next();
};
exports.roleBasedRateLimit = roleBasedRateLimit;
// Audit logging for sensitive operations
const auditLog = (operation, resource) => {
    return (req, res, next) => {
        const originalSend = res.send;
        res.send = function (data) {
            // Log the operation
            console.log('AUDIT:', {
                timestamp: new Date().toISOString(),
                userId: req.user?.id,
                userRole: req.user?.role,
                operation,
                resource,
                method: req.method,
                url: req.url,
                ip: req.ip,
                statusCode: res.statusCode,
                userAgent: req.get('User-Agent')
            });
            return originalSend.call(this, data);
        };
        next();
    };
};
exports.auditLog = auditLog;
// IP-based access control
const ipAccessControl = (allowedIPs, blockedIPs = []) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        // Check blocked IPs first
        if (blockedIPs.includes(clientIP)) {
            console.warn(`Blocked IP attempted access: ${clientIP}`);
            next((0, errorHandler_1.createError)('Access denied', 403));
            return;
        }
        // Check allowed IPs if specified
        if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
            console.warn(`Non-whitelisted IP attempted access: ${clientIP}`);
            next((0, errorHandler_1.createError)('Access denied', 403));
            return;
        }
        next();
    };
};
exports.ipAccessControl = ipAccessControl;
// Time-based access control
const timeBasedAccess = (allowedHours) => {
    return (req, res, next) => {
        const now = new Date();
        const currentHour = now.getHours();
        const isAllowed = allowedHours.some(({ start, end }) => {
            if (start <= end) {
                return currentHour >= start && currentHour < end;
            }
            else {
                // Handle overnight hours (e.g., 22:00 to 06:00)
                return currentHour >= start || currentHour < end;
            }
        });
        if (!isAllowed) {
            next((0, errorHandler_1.createError)('Access denied: outside allowed hours', 403));
            return;
        }
        next();
    };
};
exports.timeBasedAccess = timeBasedAccess;
// Geographic access control (basic implementation)
const geoAccessControl = (allowedCountries) => {
    return (req, res, next) => {
        // In a real implementation, you would use a GeoIP service
        const country = req.headers['cf-ipcountry'] || 'US';
        if (allowedCountries.length > 0 && !allowedCountries.includes(country)) {
            console.warn(`Access denied from country: ${country}`);
            next((0, errorHandler_1.createError)('Access denied from your location', 403));
            return;
        }
        next();
    };
};
exports.geoAccessControl = geoAccessControl;
//# sourceMappingURL=authorization.js.map