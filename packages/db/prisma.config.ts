import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
    schema: 'prisma/schema.prisma',
    datasource: {
        url: process.env.DATABASE_URL!,
    },
    migrate: {
        async adapter() {
            const { PrismaPg } = await import('@prisma/adapter-pg');
            const { Pool } = await import('pg');
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return new PrismaPg(pool) as any;
        },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

