import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ValidationChain } from 'express-validator';
export declare const securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare const corsConfig: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
export declare const createRateLimit: (windowMs: number, max: number, message?: string) => import("express-rate-limit").RateLimitRequestHandler;
export declare const generalRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const authRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const apiRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const strictRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
export declare const sqlInjectionProtection: (req: Request, res: Response, next: NextFunction) => void;
export declare const xssProtection: (req: Request, res: Response, next: NextFunction) => void;
export declare const requestSizeLimit: (maxSize: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const securityLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const csrfProtection: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRequest: (validations: ValidationChain[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const ipWhitelist: (allowedIPs: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requestTimeout: (timeoutMs: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const securityResponseHeaders: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=security.d.ts.map