const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function clearDatabase() {
  console.log('🗑️  بدء حذف جميع البيانات من قاعدة البيانات...\n')

  try {
    // حذف البيانات بالترتيب الصحيح
    
    console.log('⏳ حذف الرحلات...')
    const { error: tripsError, count: tripsCount } = await supabase
      .from('route_trips')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // حذف الكل
    
    if (tripsError) throw tripsError
    console.log(`✅ تم حذف ${tripsCount || 0} رحلة`)

    console.log('⏳ حذف المسارات...')
    const { error: routesError, count: routesCount } = await supabase
      .from('routes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (routesError) throw routesError
    console.log(`✅ تم حذف ${routesCount || 0} مسار`)

    console.log('⏳ حذف المندوبين...')
    const { error: repsError, count: repsCount } = await supabase
      .from('representatives')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (repsError) throw repsError
    console.log(`✅ تم حذف ${repsCount || 0} مندوب`)

    console.log('⏳ حذف الحافلات...')
    const { error: busesError, count: busesCount } = await supabase
      .from('buses')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (busesError) throw busesError
    console.log(`✅ تم حذف ${busesCount || 0} حافلة`)

    console.log('⏳ حذف السائقين...')
    const { error: driversError, count: driversCount } = await supabase
      .from('drivers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (driversError) throw driversError
    console.log(`✅ تم حذف ${driversCount || 0} سائق`)

    console.log('⏳ حذف الجامعات...')
    const { error: unisError, count: unisCount } = await supabase
      .from('universities')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    
    if (unisError) throw unisError
    console.log(`✅ تم حذف ${unisCount || 0} جامعة`)

    console.log('\n' + '='.repeat(50))
    console.log('✨ تم حذف جميع البيانات بنجاح!')
    console.log('='.repeat(50))
    console.log('\n📝 قاعدة البيانات الآن فارغة وجاهزة للبيانات الحقيقية!')
    console.log('\n🔗 يمكنك إضافة البيانات من:')
    console.log('   • صفحة الإدارة: http://localhost:3000/admin')
    console.log('   • صفحة المندوب: http://localhost:3000/delegate')
    console.log('   • استيراد Excel: http://localhost:3000/admin/import')

  } catch (error) {
    console.error('❌ خطأ:', error.message)
    console.log('\n💡 البدائل:')
    console.log('   1. احذف البيانات يدوياً من Supabase Dashboard')
    console.log('   2. أو تأكد من أن المفاتيح في .env صحيحة')
  }
}

clearDatabase()
