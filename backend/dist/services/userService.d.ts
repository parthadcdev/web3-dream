export interface CreateUserData {
    email: string;
    stytchUserId?: string;
    walletAddress?: string;
    firstName?: string;
    lastName?: string;
    role?: 'USER' | 'MANUFACTURER' | 'DISTRIBUTOR' | 'RETAILER' | 'ADMIN';
}
export interface UpdateUserData {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: 'USER' | 'MANUFACTURER' | 'DISTRIBUTOR' | 'RETAILER' | 'ADMIN';
}
export declare class UserService {
    /**
     * Create a new user
     */
    static createUser(data: CreateUserData): Promise<{
        success: boolean;
        user: {
            id: string;
            email: string;
            walletAddress: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            firstName: string | null;
            lastName: string | null;
            stytchUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        user?: undefined;
    }>;
    /**
     * Find user by Stytch user ID
     */
    static findByStytchUserId(stytchUserId: string): Promise<{
        success: boolean;
        user: {
            id: string;
            email: string;
            walletAddress: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            firstName: string | null;
            lastName: string | null;
            stytchUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        user?: undefined;
    }>;
    /**
     * Find user by email
     */
    static findByEmail(email: string): Promise<{
        success: boolean;
        user: {
            id: string;
            email: string;
            walletAddress: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            firstName: string | null;
            lastName: string | null;
            stytchUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        user?: undefined;
    }>;
    /**
     * Find user by wallet address
     */
    static findByWalletAddress(walletAddress: string): Promise<{
        success: boolean;
        user: {
            id: string;
            email: string;
            walletAddress: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            firstName: string | null;
            lastName: string | null;
            stytchUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        user?: undefined;
    }>;
    /**
     * Update user
     */
    static updateUser(userId: string, data: UpdateUserData): Promise<{
        success: boolean;
        user: {
            id: string;
            email: string;
            walletAddress: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            firstName: string | null;
            lastName: string | null;
            stytchUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        user?: undefined;
    }>;
    /**
     * Get or create user from Stytch data
     */
    static getOrCreateStytchUser(stytchUser: any): Promise<{
        success: boolean;
        user: {
            id: string;
            email: string;
            walletAddress: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            firstName: string | null;
            lastName: string | null;
            stytchUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | undefined;
        isNew: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        user?: undefined;
        isNew?: undefined;
    }>;
    /**
     * Get user by ID
     */
    static getUserById(userId: string): Promise<{
        success: boolean;
        user: {
            id: string;
            email: string;
            walletAddress: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            firstName: string | null;
            lastName: string | null;
            stytchUserId: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        user?: undefined;
    }>;
    /**
     * Delete user
     */
    static deleteUser(userId: string): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
}
export default UserService;
//# sourceMappingURL=userService.d.ts.map