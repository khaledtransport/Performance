const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function main() {
    console.log('--- Testing Prisma with DIRECT_URL ---');
    // Override DATABASE_URL with DIRECT_URL for this test
    process.env.DATABASE_URL = process.env.DIRECT_URL;

    const prisma = new PrismaClient();
    try {
        const count = await prisma.university.count();
        console.log('Prisma Success! University count:', count);

        // Also try to list tables or something to verify permissions
        const universities = await prisma.university.findMany({ take: 1 });
        console.log('Universities:', universities);

    } catch (err) {
        console.error('Prisma Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
