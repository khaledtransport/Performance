const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
})

async function clearDatabase() {
  console.log('🗑️  بدء حذف جميع البيانات من قاعدة البيانات...\n')

  try {
    // حذف البيانات بالترتيب الصحيح (من الأسفل للأعلى في شجرة العلاقات)
    
    console.log('⏳ حذف الرحلات...')
    const trips = await prisma.routeTrip.deleteMany({})
    console.log(`✅ تم حذف ${trips.count} رحلة`)

    console.log('⏳ حذف المسارات...')
    const routes = await prisma.route.deleteMany({})
    console.log(`✅ تم حذف ${routes.count} مسار`)

    console.log('⏳ حذف المندوبين...')
    const reps = await prisma.representative.deleteMany({})
    console.log(`✅ تم حذف ${reps.count} مندوب`)

    console.log('⏳ حذف الحافلات...')
    const buses = await prisma.bus.deleteMany({})
    console.log(`✅ تم حذف ${buses.count} حافلة`)

    console.log('⏳ حذف السائقين...')
    const drivers = await prisma.driver.deleteMany({})
    console.log(`✅ تم حذف ${drivers.count} سائق`)

    console.log('⏳ حذف الجامعات...')
    const unis = await prisma.university.deleteMany({})
    console.log(`✅ تم حذف ${unis.count} جامعة`)

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
  } finally {
    await prisma.$disconnect()
  }
}

clearDatabase()
