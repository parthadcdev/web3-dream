import { createError } from './errorHandler.js';
// Role-based access control
export var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "admin";
    UserRole["MODERATOR"] = "moderator";
    UserRole["MANUFACTURER"] = "manufacturer";
    UserRole["DISTRIBUTOR"] = "distributor";
    UserRole["RETAILER"] = "retailer";
    UserRole["CONSUMER"] = "consumer";
    UserRole["AUDITOR"] = "auditor";
    UserRole["VIEWER"] = "viewer";
})(UserRole || (UserRole = {}));
// Permission levels
export var Permission;
(function (Permission) {
    Permission["READ"] = "read";
    Permission["WRITE"] = "write";
    Permission["DELETE"] = "delete";
    Permission["ADMIN"] = "admin";
    Permission["AUDIT"] = "audit";
    Permission["VERIFY"] = "verify";
    Permission["MINT"] = "mint";
    Permission["TRANSFER"] = "transfer";
})(Permission || (Permission = {}));
// Resource types
export var Resource;
(function (Resource) {
    Resource["PRODUCT"] = "product";
    Resource["CERTIFICATE"] = "certificate";
    Resource["USER"] = "user";
    Resource["SYSTEM"] = "system";
    Resource["AUDIT"] = "audit";
    Resource["NFT"] = "nft";
    Resource["BLOCKCHAIN"] = "blockchain";
})(Resource || (Resource = {}));
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
export const hasPermission = (userRole, permission) => {
    return rolePermissions[userRole]?.includes(permission) || false;
};
// Check if user can access specific resource
export const canAccessResource = (userRole, resource) => {
    return resourceAccess[resource]?.includes(userRole) || false;
};
// Check if user has permission for specific resource
export const hasResourcePermission = (userRole, resource, permission) => {
    return canAccessResource(userRole, resource) && hasPermission(userRole, permission);
};
// Permission-based middleware
export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            next(createError('Authentication required', 401));
            return;
        }
        if (!hasPermission(req.user.role, permission)) {
            console.warn(`Permission denied for user ${req.user.id}: ${permission}`);
            next(createError('Insufficient permissions', 403));
            return;
        }
        next();
    };
};
// Resource-based middleware
export const requireResourceAccess = (resource) => {
    return (req, res, next) => {
        if (!req.user) {
            next(createError('Authentication required', 401));
            return;
        }
        if (!canAccessResource(req.user.role, resource)) {
            console.warn(`Resource access denied for user ${req.user.id}: ${resource}`);
            next(createError('Access denied to resource', 403));
            return;
        }
        next();
    };
};
// Combined permission and resource middleware
export const requireResourcePermission = (resource, permission) => {
    return (req, res, next) => {
        if (!req.user) {
            next(createError('Authentication required', 401));
            return;
        }
        if (!hasResourcePermission(req.user.role, resource, permission)) {
            console.warn(`Resource permission denied for user ${req.user.id}: ${resource}.${permission}`);
            next(createError('Insufficient permissions for resource', 403));
            return;
        }
        next();
    };
};
// Role-based middleware
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            next(createError('Authentication required', 401));
            return;
        }
        if (!roles.includes(req.user.role)) {
            console.warn(`Role access denied for user ${req.user.id}: ${req.user.role}`);
            next(createError('Insufficient role permissions', 403));
            return;
        }
        next();
    };
};
// Ownership-based middleware
export const requireOwnership = (getOwnerId) => {
    return async (req, res, next) => {
        if (!req.user) {
            next(createError('Authentication required', 401));
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
                next(createError('Access denied: not resource owner', 403));
                return;
            }
            next();
        }
        catch (error) {
            next(createError('Error checking ownership', 500));
        }
    };
};
// Multi-factor authentication requirement
export const requireMFA = (req, res, next) => {
    if (!req.user) {
        next(createError('Authentication required', 401));
        return;
    }
    // Check if MFA is enabled and verified
    if (req.user.mfaEnabled && !req.user.mfaVerified) {
        next(createError('Multi-factor authentication required', 403));
        return;
    }
    next();
};
// API key validation
export const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        next(createError('API key required', 401));
        return;
    }
    // In a real implementation, validate against database
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    if (!validApiKeys.includes(apiKey)) {
        console.warn(`Invalid API key attempt: ${apiKey}`);
        next(createError('Invalid API key', 401));
        return;
    }
    next();
};
// Rate limiting based on user role
export const roleBasedRateLimit = (req, res, next) => {
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
// Audit logging for sensitive operations
export const auditLog = (operation, resource) => {
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
// IP-based access control
export const ipAccessControl = (allowedIPs, blockedIPs = []) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        // Check blocked IPs first
        if (blockedIPs.includes(clientIP)) {
            console.warn(`Blocked IP attempted access: ${clientIP}`);
            next(createError('Access denied', 403));
            return;
        }
        // Check allowed IPs if specified
        if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
            console.warn(`Non-whitelisted IP attempted access: ${clientIP}`);
            next(createError('Access denied', 403));
            return;
        }
        next();
    };
};
// Time-based access control
export const timeBasedAccess = (allowedHours) => {
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
            next(createError('Access denied: outside allowed hours', 403));
            return;
        }
        next();
    };
};
// Geographic access control (basic implementation)
export const geoAccessControl = (allowedCountries) => {
    return (req, res, next) => {
        // In a real implementation, you would use a GeoIP service
        const country = req.headers['cf-ipcountry'] || 'US';
        if (allowedCountries.length > 0 && !allowedCountries.includes(country)) {
            console.warn(`Access denied from country: ${country}`);
            next(createError('Access denied from your location', 403));
            return;
        }
        next();
    };
};
//# sourceMappingURL=authorization.js.map