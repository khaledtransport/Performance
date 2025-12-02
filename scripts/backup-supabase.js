#!/usr/bin/env node
/**
 * Backup script: يجلب كل البيانات من الجداول ويخزنها في ملف JSON وملف SQL.
 * Usage: node scripts/backup-supabase.js
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !serviceKey) {
  console.error('❌ مفقود مفاتيح Supabase في .env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY)')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const TABLES = [
  'universities',
  'drivers',
  'buses',
  'representatives',
  'routes',
  'route_trips'
]

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return val
  const str = String(val).replace(/'/g, "''")
  return `'${str}'`
}

async function fetchAll(table) {
  // نجلب كل الصفوف (بدون pagination حالياً)
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw new Error(`خطأ في قراءة الجدول ${table}: ${error.message}`)
  return data
}

(async () => {
  const started = Date.now()
  console.log('🚀 بدء أخذ نسخة احتياطية من Supabase...')
  const backup = { meta: { timestamp: new Date().toISOString() }, tables: {} }
  let sqlDump = '-- SQL backup generated at ' + new Date().toISOString() + '\n\n'

  for (const table of TABLES) {
    console.log(`📥 قراءة الجدول: ${table}`)
    const rows = await fetchAll(table)
    backup.tables[table] = rows

    if (rows.length) {
      const columns = Object.keys(rows[0])
      sqlDump += `-- ${table} (${rows.length} rows)\n`
      rows.forEach(r => {
        const values = columns.map(c => sqlEscape(r[c]))
        sqlDump += `INSERT INTO ${table} (${columns.join(',')}) VALUES (${values.join(',')});\n`
      })
      sqlDump += '\n'
    } else {
      sqlDump += `-- ${table} (0 rows)\n\n`
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T','_').replace('Z','')
  const jsonFile = path.join(__dirname, `../backups/backup-${stamp}.json`)
  const sqlFile = path.join(__dirname, `../backups/backup-${stamp}.sql`)

  fs.writeFileSync(jsonFile, JSON.stringify(backup, null, 2), 'utf8')
  fs.writeFileSync(sqlFile, sqlDump, 'utf8')

  console.log('✅ تم إنشاء ملفات النسخة الاحتياطية:')
  console.log(' - JSON:', path.relative(process.cwd(), jsonFile))
  console.log(' - SQL :', path.relative(process.cwd(), sqlFile))
  console.log('⏱ الوقت المستغرق:', ((Date.now() - started)/1000).toFixed(2), 'ثانية')
  console.log('انتهى.')
})().catch(err => {
  console.error('❌ فشل النسخ الاحتياطي:', err.message)
  process.exit(1)
})
