import { ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
export declare const patterns: {
    email: RegExp;
    walletAddress: RegExp;
    tokenId: RegExp;
    batchNumber: RegExp;
    verificationCode: RegExp;
    ipfsHash: RegExp;
    url: RegExp;
    phone: RegExp;
    alphanumeric: RegExp;
    alphanumericWithSpaces: RegExp;
    noSpecialChars: RegExp;
};
export declare const sanitizers: {
    trim: (value: string) => string;
    escape: (value: string) => string;
    normalizeEmail: (value: string) => string;
    normalizeWallet: (value: string) => string;
    removeHtml: (value: string) => string;
    removeScripts: (value: string) => string;
    limitLength: (maxLength: number) => (value: string) => string;
};
export declare const productValidation: {
    create: ValidationChain[];
    update: ValidationChain[];
    query: ValidationChain[];
};
export declare const userValidation: {
    register: ValidationChain[];
    login: ValidationChain[];
    update: ValidationChain[];
};
export declare const nftValidation: {
    mint: ValidationChain[];
    verify: ValidationChain[];
    query: ValidationChain[];
};
export declare const checkpointValidation: {
    create: ValidationChain[];
};
export declare const validate: (validations: ValidationChain[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const sanitize: (req: Request, res: Response, next: NextFunction) => void;
export declare const customValidators: {
    isFutureDate: (value: string) => boolean;
    isPastDate: (value: string) => boolean;
    isAfterDate: (value: string, { req }: any) => boolean;
    isValidWalletAddress: (value: string) => boolean;
    isValidIPFSHash: (value: string) => boolean;
    isStrongPassword: (value: string) => boolean;
};
export declare const validationGroups: {
    product: {
        create: ValidationChain[];
        update: ValidationChain[];
        query: ValidationChain[];
    };
    user: {
        register: ValidationChain[];
        login: ValidationChain[];
        update: ValidationChain[];
    };
    nft: {
        mint: ValidationChain[];
        verify: ValidationChain[];
        query: ValidationChain[];
    };
    checkpoint: {
        create: ValidationChain[];
    };
};
//# sourceMappingURL=validation.d.ts.map