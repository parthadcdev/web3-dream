"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireWallet = exports.requireRole = exports.authMiddleware = void 0;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("./errorHandler");
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw (0, errorHandler_1.createError)('No token provided', 401);
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        if (!process.env.JWT_SECRET) {
            throw (0, errorHandler_1.createError)('JWT secret not configured', 500);
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            walletAddress: decoded.walletAddress,
            role: decoded.role
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next((0, errorHandler_1.createError)('Invalid token', 401));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next((0, errorHandler_1.createError)('Token expired', 401));
        }
        else {
            next(error);
        }
    }
};
exports.authMiddleware = authMiddleware;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            next((0, errorHandler_1.createError)('Authentication required', 401));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next((0, errorHandler_1.createError)('Insufficient permissions', 403));
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
const requireWallet = (req, res, next) => {
    if (!req.user?.walletAddress) {
        next((0, errorHandler_1.createError)('Wallet address required', 400));
        return;
    }
    next();
};
exports.requireWallet = requireWallet;
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            if (process.env.JWT_SECRET) {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                req.user = {
                    id: decoded.id,
                    email: decoded.email,
                    walletAddress: decoded.walletAddress,
                    role: decoded.role
                };
            }
        }
    }
    catch (error) {
        // Ignore auth errors for optional auth
    }
    next();
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map