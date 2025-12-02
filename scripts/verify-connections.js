const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function verifyConnections() {
    console.log('🔍 Starting Connection Verification...\n');

    // 1. Test Supabase Admin Client (Service Role)
    console.log('1️⃣  Testing Supabase Admin Client (API Layer)...');
    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        const { data, error } = await supabase.from('universities').select('count').limit(1);
        if (error) {
            console.log('❌ Supabase Admin Client Failed:', error.message);
        } else {
            console.log('✅ Supabase Admin Client Connected Successfully!');
        }
    } catch (err) {
        console.log('❌ Supabase Admin Client Exception:', err.message);
    }

    console.log('\n----------------------------------------\n');

    // 2. Test Prisma (Direct Database)
    console.log('2️⃣  Testing Prisma (Direct Database Layer)...');
    const prisma = new PrismaClient();
    try {
        const count = await prisma.university.count();
        console.log(`✅ Prisma Connected Successfully! Found ${count} universities.`);
    } catch (err) {
        console.log('❌ Prisma Connection Failed:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

verifyConnections();
