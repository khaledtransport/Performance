// اختبار الإنشاء والتحديث والحذف لرحلة يومية
// يشغل عبر: node scripts/test-persistence.js

const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

async function run() {
  try {
    console.log('== بدء الاختبار ==')

    // 1. جلب أول route لاستخدامه
    const routesRes = await fetch(`${baseUrl}/api/routes`)
    if (!routesRes.ok) throw new Error('فشل جلب الرحلات الأساسية')
    const routes = await routesRes.json()
    if (!routes.length) throw new Error('لا توجد رحلات أساسية متاحة')
    const routeId = routes[0].id
    console.log('استخدام routeId:', routeId)

    // 2. إنشاء رحلة جديدة
    const newTripBody = {
      routeId,
      tripDate: new Date().toISOString(),
      direction: 'GO',
      tripTime: '08:30',
      studentsCount: 12,
      status: 'DEPARTED',
      departureTime: new Date().toISOString(),
      notes: 'رحلة اختبار'
    }
    const createRes = await fetch(`${baseUrl}/api/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTripBody)
    })
    const created = await createRes.json()
    if (!createRes.ok) throw new Error('فشل إنشاء الرحلة: ' + JSON.stringify(created))
    console.log('تم إنشاء الرحلة:', created.id)

    // 3. تحديث عدد الطلاب وحالة الوصول
    const updateRes = await fetch(`${baseUrl}/api/trips/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentsCount: 15, status: 'ARRIVED', arrivalTime: new Date().toISOString() })
    })
    const updated = await updateRes.json()
    if (!updateRes.ok) throw new Error('فشل تحديث الرحلة: ' + JSON.stringify(updated))
    console.log('تم تحديث الرحلة، الحالة الآن:', updated.status, 'عدد الطلاب:', updated.studentsCount)

    // 4. حذف الرحلة
    const deleteRes = await fetch(`${baseUrl}/api/trips/${created.id}`, { method: 'DELETE' })
    const deleted = await deleteRes.json()
    if (!deleteRes.ok) throw new Error('فشل حذف الرحلة: ' + JSON.stringify(deleted))
    console.log('تم حذف الرحلة بنجاح')

    console.log('== اكتمل الاختبار بنجاح ==')
  } catch (err) {
    console.error('خطأ في الاختبار:', err.message)
    process.exit(1)
  }
}

run()