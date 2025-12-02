require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55c2FqcXlwdWRna3d4Z3hxdmxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ5MTU1OCwiZXhwIjoyMDc5MDY3NTU4fQ.lqtmosiIKzvpu1OGWbHmcFdMlgMJ5h8QhY8goylquMA'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function clearDatabase() {
  console.log('🗑️  بدء حذف جميع البيانات من قاعدة البيانات...\n')

  const tables = [
    'route_trips',
    'routes', 
    'representatives',
    'buses',
    'drivers',
    'universities'
  ]

  let successCount = 0
  let errorCount = 0

  for (const table of tables) {
    try {
      // حذف جميع السجلات من الجدول
      const { data, error, count } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select()

      if (error) {
        console.log(`❌ خطأ في حذف ${table}: ${error.message}`)
        errorCount++
      } else {
        const deletedCount = data ? data.length : 0
        console.log(`✅ تم حذف ${deletedCount} سجل من جدول ${table}`)
        successCount++
      }
    } catch (err) {
      console.log(`❌ استثناء في حذف ${table}: ${err.message}`)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✨ اكتمل الحذف: ${successCount} جداول نجحت، ${errorCount} جداول فشلت`)
  console.log('='.repeat(50))
  console.log('\n📝 قاعدة البيانات الآن فارغة وجاهزة للبيانات الحقيقية!')
  console.log('\n🔗 يمكنك إضافة البيانات من:')
  console.log('   • صفحة الإدارة: http://localhost:3000/admin')
  console.log('   • صفحة المندوب: http://localhost:3000/delegate')
  console.log('   • استيراد Excel: http://localhost:3000/admin/import')
}

clearDatabase().catch(console.error)
