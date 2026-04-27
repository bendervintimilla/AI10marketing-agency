import 'dotenv/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { PrismaClient } from './generated/prisma/index';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    // Prisma v7 requires adapter passed via constructor; cast as `any` because
    // adapter type is defined in @prisma/adapter-pg not re-exported by generated client.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter } as any);
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
