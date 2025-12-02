const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function testSupabase() {
  console.log('--- Testing Supabase REST API ---');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase.from('universities').select('*').limit(1);
    if (error) {
      console.error('Supabase Error:', error);
    } else {
      console.log('Supabase Success! Data:', data);
    }
  } catch (err) {
    console.error('Supabase Exception:', err);
  }
}

async function testPrisma() {
  console.log('\n--- Testing Prisma Direct DB Connection ---');
  const prisma = new PrismaClient();
  try {
    const count = await prisma.university.count();
    console.log('Prisma Success! University count:', count);
  } catch (err) {
    console.error('Prisma Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await testSupabase();
  await testPrisma();
}

main();
