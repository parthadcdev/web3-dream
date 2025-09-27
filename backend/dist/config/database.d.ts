import { PrismaClient } from '@prisma/client';
declare global {
    var __prisma: PrismaClient | undefined;
}
declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare const checkDatabaseConnection: () => Promise<boolean>;
export declare const disconnectDatabase: () => Promise<void>;
export declare const db: {
    user: import(".prisma/client").Prisma.UserDelegate<import("@prisma/client/runtime/library").DefaultArgs>;
    product: import(".prisma/client").Prisma.ProductDelegate<import("@prisma/client/runtime/library").DefaultArgs>;
    checkpoint: import(".prisma/client").Prisma.CheckpointDelegate<import("@prisma/client/runtime/library").DefaultArgs>;
    nftCertificate: import(".prisma/client").Prisma.NFTCertificateDelegate<import("@prisma/client/runtime/library").DefaultArgs>;
    auditLog: import(".prisma/client").Prisma.AuditLogDelegate<import("@prisma/client/runtime/library").DefaultArgs>;
    securityEvent: import(".prisma/client").Prisma.SecurityEventDelegate<import("@prisma/client/runtime/library").DefaultArgs>;
    tokenTransaction: import(".prisma/client").Prisma.TokenTransactionDelegate<import("@prisma/client/runtime/library").DefaultArgs>;
    complianceStandard: import(".prisma/client").Prisma.ComplianceStandardDelegate<import("@prisma/client/runtime/library").DefaultArgs>;
    $queryRaw: <T = unknown>(query: TemplateStringsArray | import("@prisma/client/runtime/library").Sql, ...values: any[]) => import(".prisma/client").Prisma.PrismaPromise<T>;
    $executeRaw: <T = unknown>(query: TemplateStringsArray | import("@prisma/client/runtime/library").Sql, ...values: any[]) => import(".prisma/client").Prisma.PrismaPromise<number>;
    $transaction: {
        <P extends import(".prisma/client").Prisma.PrismaPromise<any>[]>(arg: [...P], options?: {
            isolationLevel?: import(".prisma/client").Prisma.TransactionIsolationLevel;
        }): import("@prisma/client/runtime/library").JsPromise<import("@prisma/client/runtime/library").UnwrapTuple<P>>;
        <R>(fn: (prisma: Omit<PrismaClient, import("@prisma/client/runtime/library").ITXClientDenyList>) => import("@prisma/client/runtime/library").JsPromise<R>, options?: {
            maxWait?: number;
            timeout?: number;
            isolationLevel?: import(".prisma/client").Prisma.TransactionIsolationLevel;
        }): import("@prisma/client/runtime/library").JsPromise<R>;
    };
    $connect: () => import("@prisma/client/runtime/library").JsPromise<void>;
    $disconnect: () => import("@prisma/client/runtime/library").JsPromise<void>;
};
export default prisma;
//# sourceMappingURL=database.d.ts.map