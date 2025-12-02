#!/usr/bin/env node
// Quick Supabase connectivity test
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error('Missing Supabase env vars. Check .env for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(url, anon, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function run() {
  try {
    const tables = ['universities','drivers','buses','route_trips']
    for (const t of tables) {
      const { data, error } = await supabase.from(t).select('*').limit(5)
      if (error) {
        console.error(`❌ ${t} error:`, error.message)
      } else {
        console.log(`✅ ${t} rows:`, data.length)
        if (data.length) console.log(data[0])
      }
    }
    console.log('Supabase connectivity test complete.')
  } catch (e) {
    console.error('Unexpected error:', e)
    process.exit(1)
  }
}
run()