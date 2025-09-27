"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class UserService {
    /**
     * Create a new user
     */
    static async createUser(data) {
        try {
            const user = await prisma.user.create({
                data: {
                    email: data.email,
                    stytchUserId: data.stytchUserId,
                    walletAddress: data.walletAddress,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    role: data.role || 'USER',
                },
            });
            return { success: true, user };
        }
        catch (error) {
            console.error('User creation error:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Find user by Stytch user ID
     */
    static async findByStytchUserId(stytchUserId) {
        try {
            const user = await prisma.user.findUnique({
                where: { stytchUserId },
            });
            return { success: true, user };
        }
        catch (error) {
            console.error('Find user by Stytch ID error:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Find user by email
     */
    static async findByEmail(email) {
        try {
            const user = await prisma.user.findUnique({
                where: { email },
            });
            return { success: true, user };
        }
        catch (error) {
            console.error('Find user by email error:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Find user by wallet address
     */
    static async findByWalletAddress(walletAddress) {
        try {
            const user = await prisma.user.findUnique({
                where: { walletAddress },
            });
            return { success: true, user };
        }
        catch (error) {
            console.error('Find user by wallet address error:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Update user
     */
    static async updateUser(userId, data) {
        try {
            const user = await prisma.user.update({
                where: { id: userId },
                data: {
                    email: data.email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    role: data.role,
                },
            });
            return { success: true, user };
        }
        catch (error) {
            console.error('User update error:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Get or create user from Stytch data
     */
    static async getOrCreateStytchUser(stytchUser) {
        try {
            // First, try to find by Stytch user ID
            let result = await this.findByStytchUserId(stytchUser.user_id);
            if (result.success && result.user) {
                return { success: true, user: result.user, isNew: false };
            }
            // If not found by Stytch ID, try to find by email
            result = await this.findByEmail(stytchUser.email);
            if (result.success && result.user) {
                // Update existing user with Stytch ID
                const updateResult = await this.updateUser(result.user.id, {
                    firstName: stytchUser.name?.first_name,
                    lastName: stytchUser.name?.last_name,
                });
                if (updateResult.success) {
                    return { success: true, user: updateResult.user, isNew: false };
                }
            }
            // Create new user
            const createResult = await this.createUser({
                email: stytchUser.email,
                stytchUserId: stytchUser.user_id,
                firstName: stytchUser.name?.first_name,
                lastName: stytchUser.name?.last_name,
                role: 'USER',
            });
            if (createResult.success) {
                return { success: true, user: createResult.user, isNew: true };
            }
            return { success: false, error: createResult.error };
        }
        catch (error) {
            console.error('Get or create Stytch user error:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Get user by ID
     */
    static async getUserById(userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });
            return { success: true, user };
        }
        catch (error) {
            console.error('Get user by ID error:', error);
            return { success: false, error: error.message };
        }
    }
    /**
     * Delete user
     */
    static async deleteUser(userId) {
        try {
            await prisma.user.delete({
                where: { id: userId },
            });
            return { success: true };
        }
        catch (error) {
            console.error('User deletion error:', error);
            return { success: false, error: error.message };
        }
    }
}
exports.UserService = UserService;
exports.default = UserService;
//# sourceMappingURL=userService.js.map