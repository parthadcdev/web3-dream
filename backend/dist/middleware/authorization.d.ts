import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export declare enum UserRole {
    ADMIN = "admin",
    MODERATOR = "moderator",
    MANUFACTURER = "manufacturer",
    DISTRIBUTOR = "distributor",
    RETAILER = "retailer",
    CONSUMER = "consumer",
    AUDITOR = "auditor",
    VIEWER = "viewer"
}
export declare enum Permission {
    READ = "read",
    WRITE = "write",
    DELETE = "delete",
    ADMIN = "admin",
    AUDIT = "audit",
    VERIFY = "verify",
    MINT = "mint",
    TRANSFER = "transfer"
}
export declare enum Resource {
    PRODUCT = "product",
    CERTIFICATE = "certificate",
    USER = "user",
    SYSTEM = "system",
    AUDIT = "audit",
    NFT = "nft",
    BLOCKCHAIN = "blockchain"
}
export declare const hasPermission: (userRole: UserRole, permission: Permission) => boolean;
export declare const canAccessResource: (userRole: UserRole, resource: Resource) => boolean;
export declare const hasResourcePermission: (userRole: UserRole, resource: Resource, permission: Permission) => boolean;
export declare const requirePermission: (permission: Permission) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requireResourceAccess: (resource: Resource) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requireResourcePermission: (resource: Resource, permission: Permission) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requireRole: (roles: UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requireOwnership: (getOwnerId: (req: AuthRequest) => string | Promise<string>) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireMFA: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const requireApiKey: (req: Request, res: Response, next: NextFunction) => void;
export declare const roleBasedRateLimit: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const auditLog: (operation: string, resource: Resource) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const ipAccessControl: (allowedIPs: string[], blockedIPs?: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const timeBasedAccess: (allowedHours: {
    start: number;
    end: number;
}[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const geoAccessControl: (allowedCountries: string[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=authorization.d.ts.map